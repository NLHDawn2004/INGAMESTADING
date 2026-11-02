import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readFile,mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createLiveBridgeHost,isAllowedBridgeOrigin} from '../scripts/live-bridge-runtime.mjs';

const folder=await mkdtemp(join(tmpdir(),'ovl-resume-')),origin='http://127.0.0.1:5183',token='host-test-private-'.repeat(5);
let starts=0,authStatus=200,networkError=false,probes=[];
const host=createLiveBridgeHost({projectRoot:folder,bridgePath:join(folder,'unchanged-reader.mjs'),dataRoot:folder,
 spawnProcess(command,args,options){starts++;assert.ok(options.windowsHide);assert.equal(args.at(-2),'--config');const child=new EventEmitter();child.exitCode=null;child.killed=false;child.kill=()=>{child.killed=true;child.exitCode=0;queueMicrotask(()=>child.emit('exit',0));};queueMicrotask(()=>child.emit('spawn'));return child;},
 async request(url,options){probes.push({url:String(url),options});if(networkError)throw Error('offline');assert.equal(options.headers.Authorization,'Bearer '+token);return new Response('{}',{status:authStatus});}
});
await new Promise(resolve=>host.server.listen(0,'127.0.0.1',resolve));
const address='http://127.0.0.1:'+host.server.address().port;
const send=(path,body,requestOrigin=origin)=>fetch(address+path,{method:body?'POST':'GET',headers:{Origin:requestOrigin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
try{
 assert.equal(isAllowedBridgeOrigin('https://evil.example:5183'),false);
 assert.equal((await send('/status',null,'http://evil.example:5183')).status,403);
 assert.equal((await send('/resume',{serverUrl:origin})).status,409);assert.equal(starts,0);
 const config={serverUrl:origin,token,gameRoot:'D:/PC CLIENT/PC CLIENT 01',intervalMs:750};
 assert.equal((await send('/start',config)).status,200);assert.equal(starts,1);
 assert.equal((await send('/start',config)).status,200);assert.equal(starts,1,'same connection is idempotent and keeps the reader running');
 assert.equal((await send('/resume',{serverUrl:origin})).status,200);assert.equal(starts,1);
 const status=await (await send('/status')).text();assert.ok(!status.includes(token));assert.equal(JSON.parse(status).serverUrl,origin);
 assert.equal((await send('/stop',{})).status,200);
 const saved=await readFile(join(folder,'live-scoreboard.local.json'),'utf8');assert.equal(JSON.parse(saved).token,token);
 assert.equal((await send('/resume',{serverUrl:origin})).status,200);assert.equal(starts,2);assert.equal(probes.length,1);assert.ok(probes[0].url.endsWith('/api/live-scoreboard/bridge'));assert.equal(await readFile(join(folder,'live-scoreboard.local.json'),'utf8'),saved);
 await send('/stop',{});authStatus=401;
 assert.equal((await send('/resume',{serverUrl:origin})).status,409);assert.equal(starts,2);assert.equal(await readFile(join(folder,'live-scoreboard.local.json'),'utf8'),saved);
 authStatus=200;networkError=true;assert.equal((await send('/resume',{serverUrl:origin})).status,503);assert.equal(starts,2);
 networkError=false;
 const other='http://192.168.100.29:5183';assert.equal((await send('/resume',{serverUrl:other},other)).status,409);assert.equal(starts,2);
 assert.equal((await send('/start',{...config,serverUrl:other})).status,400);assert.equal(starts,2);
 assert.equal((await send('/start',{...config,token:'bad'})).status,400);assert.equal(starts,2);
 assert.equal((await send('/resume',{serverUrl:origin})).status,200);assert.equal(starts,3);
 const last=await readFile(join(folder,'live-scoreboard.local.json'),'utf8');assert.equal(last,saved);
 console.log('PASS: saved connection resumes without replacing token, existing reader remains running, wrong server/revoked token/network failure are safe, and local status never leaks credentials.');
}finally{await host.close();}
