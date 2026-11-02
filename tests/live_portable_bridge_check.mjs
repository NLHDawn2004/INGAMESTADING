import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {unzipSync,strFromU8} from 'fflate';
import {needsPortableBridge,preparePortableBridge} from '../lib/live-bridge-client.ts';
import {defaultLiveBoardSettings} from '../lib/live-board.ts';

assert.equal(needsPortableBridge('192.168.100.29'),true);
assert.equal(needsPortableBridge('10.0.0.8'),true);
assert.equal(needsPortableBridge('localhost'),false);
assert.equal(needsPortableBridge('127.0.0.1'),false);
const archive=await readFile(new URL('../public/live-bridge.zip',import.meta.url));
const publicFiles=unzipSync(archive);
assert.ok(!publicFiles['.live-scoreboard.local.json'],'public archive must not contain a private pairing');
assert.ok(strFromU8(publicFiles['START.cmd']).includes('where node'),'launcher checks its runtime');
assert.ok(strFromU8(publicFiles['START.cmd']).includes('node bridge.mjs --config'),'launcher runs the bundled reader');
const token='portable-test-only-'.repeat(4),calls=[];
const request=async(url,options)=>{
 calls.push([url,options]);
 if(url.startsWith('/live-bridge.zip'))return new Response(archive);
 assert.equal(url,'/api/live-scoreboard');assert.equal(options.method,'POST');
 return Response.json({token});
};
const privateZip=await preparePortableBridge('http://192.168.100.29:5183/live-scoreboard',request);
const files=unzipSync(privateZip),config=JSON.parse(strFromU8(files['.live-scoreboard.local.json']));
assert.deepEqual(config,{serverUrl:'http://192.168.100.29:5183',token,intervalMs:750});
assert.equal(config.playerLogPath,undefined,'use the game PC Windows account');
assert.equal(config.gameRoot,undefined,'no machine-specific D: drive');
assert.equal(calls.length,2);assert.ok(calls.every(([url])=>url.startsWith('/')),'LAN pairing uses only same-origin HTTP, never loopback browser requests');
let failedCalls=0;
await assert.rejects(()=>preparePortableBridge('http://192.168.100.29:5183',async()=>{failedCalls++;return new Response('',{status:404});}),/Chưa tải/);
assert.equal(failedCalls,1,'failed download must not replace an active token');
await assert.rejects(()=>preparePortableBridge('http://192.168.100.29:5183',async(url)=>url.startsWith('/live-bridge.zip')?new Response(archive):Response.json({error:'Cần đăng nhập.'},{status:401})),/Cần đăng nhập/);
await assert.rejects(()=>preparePortableBridge('http://192.168.100.29:5183',async(url)=>url.startsWith('/live-bridge.zip')?new Response(archive):Response.json({token:'bad'})),/Khóa bridge/);

// Extract the actual downloadable bundle into a folder with no project or node_modules.
// Its native Node process must authenticate to the web server and send a heartbeat.
const folder=await mkdtemp(join(tmpdir(),'ovl-portable-'));
for(const name of ['bridge.mjs','START.cmd','README.txt','live-scoreboard-capture.ps1'])await writeFile(join(folder,name),files[name]);
const messages=[],settings={...defaultLiveBoardSettings(),adapter:'normalized-file',sourcePath:join(folder,'not-created.json')};
const server=createServer(async(req,res)=>{
 assert.equal(req.url,'/api/live-scoreboard/bridge');assert.equal(req.headers.authorization,'Bearer '+token);
 res.writeHead(200,{'Content-Type':'application/json'});
 if(req.method==='GET'){res.end(JSON.stringify({settings,teams:[],serverNow:Date.now()}));return;}
 let body='';for await(const chunk of req)body+=chunk;
 messages.push(JSON.parse(body));res.end('{"ok":true}');
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const localConfig={...config,serverUrl:'http://127.0.0.1:'+server.address().port};
await writeFile(join(folder,'.live-scoreboard.local.json'),JSON.stringify(localConfig));
let stderr='';
const child=spawn(process.execPath,['bridge.mjs','--config','.live-scoreboard.local.json'],{cwd:folder,windowsHide:true,stdio:['ignore','ignore','pipe']});
child.stderr.on('data',chunk=>stderr+=chunk);
try{
 const deadline=Date.now()+8000;
 while(Date.now()<deadline&&!messages.some(m=>m.action==='heartbeat')){
  if(child.exitCode!==null)throw Error('Portable bridge failed: '+stderr);
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.ok(messages.some(m=>m.action==='start'),'portable game PC starts a session');
 assert.ok(messages.some(m=>m.action==='heartbeat'&&m.status==='source-error'),'portable game PC sends source diagnostics without a project checkout');
 console.log('PASS: LAN configured ZIP, same-origin pairing, no private public config, safe download failures, and extracted native bridge authentication/heartbeat without project files.');
}finally{
 child.kill();await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);});
 server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
