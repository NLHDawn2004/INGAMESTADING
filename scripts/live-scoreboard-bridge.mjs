import {fetchLivePlayerStats} from '../lib/matchstats.ts';
import {applyUidRoster} from '../lib/live-team-roster.ts';
import {readFile,writeFile,readdir,stat,mkdir,open} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {randomUUID} from 'node:crypto';
import {StringDecoder} from 'node:string_decoder';
import {liveBoardSettingsSchema,livePacketSchema} from '../lib/live-board.ts';
import {packetFromOcr,parseLosslessJson} from '../lib/live-board-ocr.ts';
import {followsGame,sourceSettings} from '../lib/live-board-auto.ts';
import {createGameLogState,consumeGameLogLine,gameLogSnapshot} from '../lib/live-board-gamelog.ts';
const arg=process.argv.indexOf('--config'),path=resolve(arg>=0?process.argv[arg+1]:'.live-scoreboard.local.json');
const config=JSON.parse((await readFile(path,'utf8')).replace(/^\uFEFF/,''));
const server=new URL(config.serverUrl);if(!['http:','https:'].includes(server.protocol)||server.username||server.password)throw Error('Cấu hình serverUrl không hợp lệ.');
if(typeof config.token!=='string'||config.token.length<50)throw Error('Thiếu khóa bridge. Tải lại cấu hình từ web.');
const endpoint=new URL('/api/live-scoreboard/bridge',server),sessionId=randomUUID(),folder=join(dirname(path),'live-bridge-work');await mkdir(folder,{recursive:true});const runtime=join(folder,'runtime.json');
let stopped=false,child=null,control=null,offset=0,sequence=0,processing=false,pending=null,lastPrint='',lastCandidate='',candidateCount=0,lastNativeConfig='',gameLog=createGameLogState(),logOffset=0,logPartial='',logDecoder=new StringDecoder('utf8'),lastLogGrowthAt=0,lastLogSnapshotAt=0,lastLogIdentity='';
let rosterId='',rosterPlayers=[],rosterRequest=null,rosterRetryAt=0;
function refreshRoster(){const id=gameLog.matchId;if(!id)return;if(rosterId!==id){rosterId=id;rosterPlayers=[];rosterRetryAt=0;}
 if(rosterPlayers.length)applyUidRoster(gameLog,id,rosterPlayers);
 if(rosterRequest||Date.now()<rosterRetryAt||rosterPlayers.length)return;
 rosterRetryAt=Date.now()+3000;rosterRequest=fetchLivePlayerStats(id).then(result=>{if(gameLog.matchId===id){rosterPlayers=result.players;applyUidRoster(gameLog,id,rosterPlayers);}}).catch(()=>{}).finally(()=>{rosterRequest=null;});
}
function log(message){if(message!==lastPrint){console.log(new Date().toISOString()+' '+message);lastPrint=message;}}
async function request(body){const started=Date.now();const response=await fetch(endpoint,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(4000),cache:'no-store'});let data;try{data=await response.json();}catch{throw Error('Máy chủ chưa trả phản hồi hợp lệ.');}if(response.status===401){stopped=true;child?.kill();throw Error('Khóa bridge đã đổi hoặc không hợp lệ. Tải cấu hình mới.');}if(!response.ok)throw Error(data.error||'Không gửi được dữ liệu bridge.');if(!body&&data.serverNow)offset=data.serverNow-(started+Date.now())/2;return data;}
async function refreshControl(){const next=await request();next.settings=liveBoardSettingsSchema.parse(next.settings);control=next;const content=JSON.stringify({configId:next.settings.configId,layout:next.settings.layout});if(content!==lastNativeConfig){await writeFile(runtime,content);lastNativeConfig=content;lastCandidate='';candidateCount=0;}return next;}
async function heartbeat(status,message,diagnostic=null){log(message||status);await request({action:'heartbeat',sessionId,status,message:String(message).slice(0,500),diagnostic});}
async function detectedMatch(frame){try{const root=join(config.gameRoot||'D:/PC CLIENT/PC CLIENT 01','Free Fire_64_Data');const names=(await readdir(root)).filter(name=>/^MatchId_\d{1,24}_.*\.log$/i.test(name));const files=await Promise.all(names.map(async name=>({name,mtime:(await stat(join(root,name))).mtimeMs})));const latest=files.filter(f=>f.mtime>=frame.processStartedAt-5000).sort((a,b)=>b.mtime-a.mtime)[0];const id=latest?.name.match(/^MatchId_(\d{1,24})_/)?.[1];return id&&id!=='0'?id:null;}catch{return null;}}
async function handleFrame(frame){await refreshControl();const settings=control.settings;if(settings.adapter!=='windows-ocr')return;if(frame.type!=='frame'){await heartbeat('waiting',frame.message||'Chờ cửa sổ game.');return;}if(frame.configId!==settings.configId){await heartbeat('calibrating','Chờ khung theo cấu hình mới.');return;}
 const result=packetFromOcr(frame,settings,control.teams,sessionId,++sequence,await detectedMatch(frame),offset);const key=JSON.stringify(result.diagnostic.rows);candidateCount=key===lastCandidate?candidateCount+1:1;lastCandidate=key;
 if(!result.packet){await heartbeat('partial',result.message,result.diagnostic);return;}if(candidateCount<2){await heartbeat('validating','Đang kiểm tra độ ổn định qua hai khung.',result.diagnostic);return;}await request({action:'snapshot',packet:result.packet});log('Đã gửi '+result.packet.teams.length+' đội · '+(result.packet.isReplay?'REPLAY':'LIVE')+' · Match '+result.packet.matchId);
}
async function consume(){if(processing)return;processing=true;try{while(pending&&!stopped){const frame=pending;pending=null;try{await handleFrame(frame);}catch(error){log(error.message);}}}finally{processing=false;}}
async function fileCycle(){await refreshControl();const s=control.settings;if(!s.sourcePath){await heartbeat('waiting','Chọn đường dẫn file JSON chuẩn hóa.');return;}let value;try{value=parseLosslessJson(await readFile(s.sourcePath,'utf8'));}catch{await heartbeat('source-error','Chưa đọc được snapshot JSON chuẩn hóa. Không dùng trực tiếp ReplayInfo.');return;}const packet=livePacketSchema.parse({...value,source:'normalized-file',sessionId,configId:s.configId,sequence:++sequence,capturedAt:Math.round(Number(value.capturedAt)+offset)});await request({action:'snapshot',packet});log('Đã gửi snapshot file · Match '+packet.matchId);}
async function gameLogCycle(){
 const s=control.settings;const logPath=config.playerLogPath||join(process.env.USERPROFILE||'C:/Users/Public','AppData','LocalLow','Garena','Free Fire','Player.log');let file,changed=false;
 try{file=await open(logPath,'r');const info=await file.stat();const identity=[info.dev,info.ino,info.birthtimeMs].join(':');if((lastLogIdentity&&lastLogIdentity!==identity)||info.size<logOffset){logOffset=0;logPartial='';logDecoder=new StringDecoder('utf8');gameLog=createGameLogState();}
  lastLogIdentity=identity;
  const length=Math.min(4*1024*1024,Math.max(0,info.size-logOffset));if(length){const buffer=Buffer.allocUnsafe(length);const {bytesRead}=await file.read(buffer,0,length,logOffset);logOffset+=bytesRead;lastLogGrowthAt=Math.min(Date.now(),info.mtimeMs);const text=logPartial+logDecoder.write(buffer.subarray(0,bytesRead));const lines=text.split(/\r?\n/);logPartial=lines.pop()||'';
   for(const line of lines)changed=consumeGameLogLine(gameLog,line)||changed;
  }
  if(logOffset<info.size){await heartbeat('catching-up','Reading earlier log events before publishing current scores.');return;}
 }catch(error){await heartbeat('source-error','Không đọc được Player.log của client. '+String(error.message).slice(0,250));return;}finally{await file?.close().catch(()=>{});}
 if(!followsGame(s)&&s.mode==='live'&&gameLog.matchId&&gameLog.matchId!==s.matchId){await heartbeat('wrong-match','Game đã sang trận '+gameLog.matchId+'. Đổi Match ID và xác nhận số đội trước khi chiếu.',{source:'player-log',detectedMatchId:gameLog.matchId,teamCount:gameLog.teams.size,playerCount:gameLog.players.size});return;}
 if(followsGame(s)&&!sourceSettings(gameLog,s)){await heartbeat('detecting-match','Đang tự nhận trận và danh sách đội từ game.',{source:'player-log',detectedMatchId:gameLog.matchId,sourceReplay:gameLog.sourceReplay,teamCount:gameLog.teams.size,playerCount:gameLog.players.size});return;}
 refreshRoster();
 const now=Date.now();if(gameLog.teams.size&&gameLog.scores.size===gameLog.teams.size&&(changed||now-lastLogSnapshotAt>=2000)&&now-lastLogGrowthAt<5000){const result=gameLogSnapshot(gameLog,s,control.teams,sessionId,++sequence,now,s.mode==='live');if(result.packet){await request({action:'snapshot',packet:result.packet});await heartbeat('connected','Đang đọc Player.log · '+result.packet.teams.length+' team.',result.diagnostic);gameLog.dirty=false;lastLogSnapshotAt=now;if(changed)log('Đã đọc Player.log · '+result.packet.teams.length+' team · '+(result.packet.isReplay?'REPLAY':'LIVE')+' · Match '+result.packet.matchId);}else await heartbeat(result.diagnostic.rosterIdentity==='pending'?'identity-pending':'partial',result.message||gameLog.diagnostic,result.diagnostic);}
 else if(!gameLog.teams.size)await heartbeat('waiting','Chờ controller scoreboard ghi tên team vào Player.log.');
 else if(now-lastLogGrowthAt>=5000)await heartbeat('source-stale','Player.log không cập nhật trong 5 giây; đang giữ snapshot hợp lệ gần nhất.',{source:'player-log',teamCount:gameLog.teams.size,scoreCount:gameLog.scores.size,lastLogGrowthAt});
}
const cleanup=()=>{stopped=true;child?.kill();};process.on('SIGINT',cleanup);process.on('SIGTERM',cleanup);
await refreshControl();await request({action:'start',sessionId});console.log('Bridge bảng điểm đã kết nối. Không in khóa. Ctrl+C để dừng.');
while(!stopped){try{if(control.settings.adapter==='game-log'){if(child){child.kill();child=null;}await refreshControl();await gameLogCycle();}else if(control.settings.adapter==='windows-ocr'){
 if(!child){const native=join(dirname(fileURLToPath(import.meta.url)),'live-scoreboard-capture.ps1');child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',native,'-RuntimeConfig',runtime],{windowsHide:true,stdio:['ignore','pipe','pipe']});const processChild=child;const lines=createInterface({input:child.stdout});lines.on('line',line=>{try{pending=JSON.parse(line);void consume();}catch{}});child.stderr.on('data',()=>log('Bộ đọc Windows gặp lỗi. Kiểm tra English OCR và quyền chụp cửa sổ.'));child.on('exit',()=>{if(child===processChild)child=null;});}
 if(!processing)await refreshControl();
 }else{if(child){child.kill();child=null;}await fileCycle();}}catch(error){log(error.message);if(!stopped)try{await heartbeat('source-error',error.message);}catch{}}
 await new Promise(resolve=>setTimeout(resolve,Math.max(500,Math.min(1500,config.intervalMs||750))));}
cleanup();
