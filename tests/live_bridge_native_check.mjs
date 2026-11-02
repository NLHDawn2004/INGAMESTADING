import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,utimes} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const {defaultLiveBoardSettings}=await import(new URL('../lib/live-board.ts',import.meta.url));
const folder=await mkdtemp(join(tmpdir(),'ovl-native-bridge-'));
const settings={...defaultLiveBoardSettings(),followGame:false,adapter:'game-log',mode:'live',matchId:'2115073178658846720',expectedTeams:2,rosterConfirmed:true};
const time=new Date().toLocaleString('sv-SE'),line=text=>'['+time+'.000] '+text;
const log=[line('EventTypeEnterGame {"match_id":'+settings.matchId+'}'),line('OnTeamScoreInited -> TeamName: A TeamID: 1'),line('OnTeamScoreInited -> TeamName: B TeamID: 2'),line('OnTeamScoreChanged -> TeamID: 1 TeamScore: 3'),line('OnTeamScoreChanged -> TeamID: 2 TeamScore: 2'),line('Scoreboard refresh complete'),''].join('\n');
for(const stale of [false,true]){
 const logPath=join(folder,stale?'stale.log':'live.log');await writeFile(logPath,log);
 if(stale){const old=new Date(Date.now()-60000);await utimes(logPath,old,old);}
 const messages=[];
 const server=createServer(async(req,res)=>{if(req.method==='GET'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({settings,teams:[],serverNow:Date.now()}));return;}let body='';for await(const chunk of req)body+=chunk;messages.push(JSON.parse(body));res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const config=join(folder,stale?'stale.json':'live.json');await writeFile(config,JSON.stringify({serverUrl:'http://127.0.0.1:'+server.address().port,token:'test-only-'.repeat(8),playerLogPath:logPath,intervalMs:500}));
 let stderr='';const child=spawn(process.execPath,[join(root,'scripts/live-scoreboard-bridge.mjs'),'--config',config],{cwd:root,windowsHide:true,stdio:['ignore','ignore','pipe']});child.stderr.on('data',chunk=>stderr+=chunk);
 try{
  const deadline=Date.now()+6000;
  while(Date.now()<deadline&&!messages.some(m=>stale?m.action==='heartbeat'&&m.status==='source-stale':m.action==='snapshot')){if(child.exitCode!==null)throw Error('Native bridge exited: '+stderr);await new Promise(r=>setTimeout(r,50));}
  assert.ok(messages.some(m=>m.action==='start'),'bridge starts a session');
  if(stale){assert.ok(messages.some(m=>m.status==='source-stale'),'old log must be diagnosed stale');assert.ok(!messages.some(m=>m.action==='snapshot'),'old log must not be relabelled fresh');}
  else{const packet=messages.find(m=>m.action==='snapshot')?.packet;assert.ok(packet,stderr);assert.equal(packet.matchId,settings.matchId);assert.equal(packet.detectedMatchId,settings.matchId);assert.equal(packet.isReplay,false);assert.equal(packet.source,'game-log');assert.deepEqual(packet.teams.map(t=>t.elims),[null,null],'raw TeamScore without verified player mapping is not ELIMS');}
 }finally{child.kill();await new Promise(r=>{if(child.exitCode!==null)return r();child.once('exit',r);});server.closeAllConnections();await new Promise(r=>server.close(r));}
}
console.log('PASS: actual Node bridge starts, reads LIVE log, posts full matching snapshot; old log is never published as fresh.');
