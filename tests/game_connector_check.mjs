import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {configureGameConnector,readGameConnectorConfig,CONNECTOR_FOOTER} from '../lib/game-connector-file.ts';
import {prepareGameConnector,needsPortableBridge} from '../lib/live-bridge-client.ts';
import {defaultLiveBoardSettings} from '../lib/live-board.ts';

const executable=await readFile(new URL('../public/game-connector.exe',import.meta.url));
assert.equal(readGameConnectorConfig(executable),null,'public executable has no private pairing');
const token='standalone-test-key-'.repeat(4);
const config={serverUrl:'http://192.168.100.29:5183',token,intervalMs:750};
const configured=configureGameConnector(executable,config);
assert.deepEqual(readGameConnectorConfig(configured),config);
const damaged=configured.slice();new DataView(damaged.buffer).setUint32(damaged.length-CONNECTOR_FOOTER.length-4,0xffffffff,true);
assert.throws(()=>readGameConnectorConfig(damaged),/bị hỏng/);
assert.throws(()=>configureGameConnector(executable,{...config,token:'bad'}),/Khóa/);
assert.throws(()=>configureGameConnector(executable,{...config,serverUrl:'file:///etc/'}),/Địa chỉ/);
let requests=[];
const downloaded=await prepareGameConnector(config.serverUrl,async(url,options)=>{
 requests.push([url,options?.method||'GET']);
 return url.startsWith('/game-connector.exe')?new Response(executable):Response.json({token});
});
assert.deepEqual(readGameConnectorConfig(new Uint8Array(await downloaded.arrayBuffer())),config);
assert.equal(requests.length,2);assert.ok(requests.every(([url])=>url.startsWith('/')));
assert.equal(needsPortableBridge('192.168.100.29'),true);
requests=[];
await assert.rejects(()=>prepareGameConnector(config.serverUrl,async(url)=>{requests.push(url);return new Response('',{status:404});}),/Chưa tải/);
assert.equal(requests.length,1,'failed executable download leaves existing pairing alone');
await assert.rejects(()=>prepareGameConnector(config.serverUrl,async(url)=>url.startsWith('/game-connector.exe')?new Response(executable):Response.json({error:'Cần đăng nhập.'},{status:401})),/Cần đăng nhập/);

const folder=await mkdtemp(join(tmpdir(),'ovl-exe-only-'));
const sourcePath=join(folder,'scores.json');
const settings={...defaultLiveBoardSettings(),adapter:'normalized-file',mode:'replay',followGame:false,matchId:'99',expectedTeams:1,rosterConfirmed:true,sourcePath};
await writeFile(sourcePath,JSON.stringify({matchId:'99',detectedMatchId:null,isReplay:true,capturedAt:Date.now(),expectedTeams:1,complete:true,teams:[{teamId:'1',teamName:'EXE TEST',elims:3,aliveCount:4,aliveStates:['alive','alive','alive','alive']}]}));
const messages=[];
const server=createServer(async(req,res)=>{
 assert.equal(req.url,'/api/live-scoreboard/bridge');assert.equal(req.headers.authorization,'Bearer '+token);
 res.writeHead(200,{'Content-Type':'application/json'});
 if(req.method==='GET'){res.end(JSON.stringify({settings,teams:[],serverNow:Date.now()}));return;}
 let body='';for await(const chunk of req)body+=chunk;messages.push(JSON.parse(body));res.end('{"ok":true}');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const exePath=join(folder,'Overlay-Studio-Connect.exe');
await writeFile(exePath,configureGameConnector(executable,{...config,serverUrl:'http://127.0.0.1:'+server.address().port}));
const environment={...process.env,PATH:join(process.env.SystemRoot||'C:/Windows','System32'),NODE_OPTIONS:'',LOCALAPPDATA:join(folder,'appdata'),USERPROFILE:join(folder,'user')};
const check=spawnSync(exePath,['--self-test'],{cwd:folder,env:environment,encoding:'utf8',windowsHide:true});
assert.equal(check.status,0,check.stderr);assert.equal(JSON.parse(check.stdout).standalone,true);
let output='';
const child=spawn(exePath,[],{cwd:folder,env:environment,windowsHide:true,stdio:['ignore','pipe','pipe']});
child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);
try{
 const deadline=Date.now()+10000;
 while(Date.now()<deadline&&!messages.some(message=>message.action==='snapshot')){
  if(child.exitCode!==null)throw Error('Standalone EXE failed: '+output);
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.ok(messages.some(message=>message.action==='start'),'EXE authenticates without Node installed on PATH');
 const snapshot=messages.find(message=>message.action==='snapshot')?.packet;
 assert.ok(snapshot,output);assert.equal(snapshot.teams[0].elims,3);assert.equal(snapshot.teams[0].aliveCount,4);
 assert.ok(!output.includes(token),'application never prints the pairing token');
 const sessions=messages.filter(message=>message.action==='start').length;
 // The parent test serves HTTP on this event loop, so do not block while the original reader is alive.
 const second=spawn(exePath,[],{cwd:folder,env:environment,windowsHide:true,stdio:['ignore','pipe','pipe']});
 let secondOutput='';second.stdout.on('data',chunk=>secondOutput+=chunk);second.stderr.on('data',chunk=>secondOutput+=chunk);
 const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{second.kill();reject(Error('Duplicate launch did not exit'));},5000);second.once('exit',code=>{clearTimeout(timer);resolve(code);});});
 assert.equal(result,0,secondOutput);assert.match(secondOutput,/đang chạy/);assert.equal(messages.filter(message=>message.action==='start').length,sessions,'reopening EXE must not replace its active session');
 console.log('PASS: single EXE runs with no Node on PATH, authenticates, publishes scores, reopens without a competing session, protects configuration, and needs no ZIP or project files.');
}finally{
 child.kill();await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);});
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
