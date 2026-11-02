import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(root+'/package.json');
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import Scoreboard from './components/ScoreboardOverlay';import Leader from './components/LeaderOverlay';import Live from './components/LiveBoardOverlay';import Map from './components/Overlay';
import {demoLeaderSnapshot,videoLeaderDesign} from './lib/player-leaders';import {defaultLiveBoardSettings,compactLiveBoardDesign} from './lib/live-board';import {compactAlignment} from './lib/live-kv-detect';import {initialState} from './lib/state';
const initialScore={view:'total',publishedAt:1,title:'OLD SCORE',subtitle:'QA',rows:Array.from({length:12},(_,i)=>({teamId:String(i),name:'TEAM '+i,position:i+1,logo:'',booyah:i===0?1:0,kills:i,total:i,placementPoints:i}))};
const initialLeader={...demoLeaderSnapshot(),publishedAt:1,onAir:true,design:videoLeaderDesign('elims')};
const initialLive={...defaultLiveBoardSettings(),enabled:true,design:{...defaultLiveBoardSettings().design,autoAlign:false,kv:''}};
const initialPacket={sessionId:'qa',matchId:'42',source:'game-log',capturedAt:Date.now(),teams:Array.from({length:4},(_,i)=>({teamId:String(i),teamName:'TEAM '+i,elims:i,aliveCount:4}))};
const waitingLive={...initialLive,design:compactLiveBoardDesign(initialLive.design)};
const uploadedLive={...waitingLive,design:{...waitingLive.design,alignment:null,kv:'/api/media/qa-neon-14'}};
const initialMap=initialState();initialMap.teams=[{id:'win',name:'WINNER',logo:''}];initialMap.matches=[...initialMap.matches,...initialMap.matches.map(m=>({...m,id:m.id+'second',status:'locked'}))];
function App(){const [packet,P]=useState(initialPacket);const [score,S]=useState(initialScore),[leader,L]=useState(initialLeader),[live,B]=useState(initialLive),[map,M]=useState(initialMap),[waiting,W]=useState(waitingLive),[uploaded,U]=useState(uploadedLive);
window.qa=(kind,action)=>{if(kind==='score'){if(action==='hide')S(null);if(action==='show')S(initialScore);if(action==='replace')S({...initialScore,publishedAt:2,title:'NEW SCORE'});if(action==='match')S({...initialScore,publishedAt:3,view:'match'});}
if(kind==='leader')L(s=>action==='hide'?{...s,onAir:false}:action==='update'?{...s,players:s.players.map(p=>({...p,kills:88}))}:{...initialLeader,publishedAt:2});
if(kind==='live')B(s=>({...s,enabled:action!=='hide'}));
if(kind==='compact'){
 const [capacity,count]=action.split('-').map(Number);
 B(s=>({...s,design:capacity===14?compactLiveBoardDesign(s.design):{...compactLiveBoardDesign(s.design),kv:'/live-board-templates/standing-compact-v1.png',alignment:compactAlignment}}));
 P({...initialPacket,teams:Array.from({length:count},(_,i)=>({teamId:String(i),teamName:'TEAM '+i,elims:i,aliveCount:i===count-1?0:4}))});
}

if(kind==='waiting')W(s=>({...s,enabled:action!=='hide'}));
if(kind==='uploaded')U(s=>({...s,enabled:action!=='hide'}));
if(kind==='map')M(s=>action==='recap'?{...s,rushEnded:true,recapView:'summary',matches:s.matches.map(m=>({...m,status:'finished',winner:'win'}))}:action==='status'?{...s,matches:s.matches.map((m,i)=>i===0?{...m,status:'finished',winner:'win'}:m)}:{...s,windowStart:5});};
return <><div id="score"><Scoreboard score={score}/></div><div id="leader"><Leader kind="elims" data={leader}/></div><div id="live"><Live settings={live} packet={packet} teams={[]}/></div><div id="waiting"><Live settings={waiting} packet={null} teams={[]}/></div><div id="uploaded"><Live settings={uploaded} packet={null} teams={[]}/></div><div id="map"><Map state={map}/></div></>}
createRoot(document.getElementById('root')).render(<App/>);`;
const built=require('esbuild').buildSync({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const css=['globals.css','player-leaders.css','live-board.css'].map(p=>readFileSync(root+'/app/'+p,'utf8').replaceAll(/@import[^;]+;/g,'')).join('\n');
const html='<!doctype html><meta charset="utf-8"><style>'+css+'</style><div id="root"></div><script>'+built.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>';
const stage=root+'/outputs/scoreboard-layout';mkdirSync(stage,{recursive:true});writeFileSync(stage+'/qa.html',html);
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const p=req.url.split('?')[0]==='/api/media/qa-neon-14'?root+'/public/live-board-templates/standing-compact-neon-14-v1.png':root+'/public'+decodeURIComponent(req.url.split('?')[0]);if(existsSync(p)){res.end(readFileSync(p));return;}res.statusCode=404;res.end();});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const profile=mkdtempSync(tmpdir()+'/overlay-exit-');
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let ws;
try{
 for(let i=0;i<100&&!existsSync(profile+'/DevToolsActivePort');i++)await sleep(100);
 const port=readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];
 const pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();
 ws=new WebSocket(pages.find(page=>page.type==='page'&&page.url==='about:blank').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 await call('Runtime.enable');await call('Page.enable');await call('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port});
 for(let i=0;i<100&&!await evaluate('typeof window.qa==="function"');i++)await sleep(50);
 assert.ok(await evaluate('typeof window.qa==="function"'),'QA page loaded');
 const completeEntries=()=>evaluate(`document.getAnimations().forEach(a=>{if(a instanceof CSSAnimation&&a.effect.getTiming().iterations!==Infinity)a.finish()});true`);
 const action=async(kind,value)=>{await evaluate(`window.qa(${JSON.stringify(kind)},${JSON.stringify(value)})`);await sleep(60);};
 const exiting=kind=>evaluate(`!!document.querySelector('#${kind} [data-overlay-exiting]')`);
 const settle=async()=>{await sleep(1400);await evaluate(`document.getAnimations().forEach(a=>{if(!(a instanceof CSSAnimation)&&a.effect.getTiming().iterations!==Infinity)a.finish()});true`);await sleep(60);await completeEntries();};

 for(const kind of ['waiting','uploaded'])assert.equal(await evaluate(`document.querySelectorAll('#${kind} .live-board-animated-row').length`),0,'no data stays hidden');
 await completeEntries();
 for(const [kind,selector] of [['score','.score-table-row:not(.empty)'],['leader','.leader-data-row'],['live','.live-board-animated-row']]){
  const count=await evaluate(`document.querySelectorAll('#${kind} ${selector}').length`);assert.ok(count>0);
  await action(kind,'hide');assert.ok(await exiting(kind),kind+' retains outgoing tree');
  assert.equal(await evaluate(`document.querySelectorAll('#${kind} ${selector}').length`),count);
  assert.ok(await evaluate(`document.querySelector('#${kind} ${selector}').getAnimations().some(a=>!(a instanceof CSSAnimation))`));
  if(kind==='leader'){
   assert.equal(await evaluate(`document.querySelectorAll('#leader .leader-data-row')[4].getAnimations().filter(a=>!(a instanceof CSSAnimation))[0].effect.getTiming().delay`),0);
   assert.equal(await evaluate(`document.querySelector('#leader .leader-data-row').getAnimations().filter(a=>!(a instanceof CSSAnimation))[0].effect.getTiming().delay`),240);
   const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(stage+'/exit.png',Buffer.from(shot.data,'base64'));
  }
  await settle();assert.equal(await evaluate(`document.querySelectorAll('#${kind} ${selector}').length`),0);
  await action(kind,'show');assert.ok(await evaluate(`document.querySelectorAll('#${kind} ${selector}').length`)>0);
  if(kind==='waiting'||kind==='uploaded'){assert.equal(await evaluate(`document.querySelectorAll('#${kind} .live-board-animated-row').length`),14);assert.ok(await evaluate(`document.querySelector('#${kind} .live-board-animated-row').getAnimations().some(a=>a instanceof CSSAnimation&&a.animationName==='score-row-slide')`),'IN replays on show for '+kind);}
  await action(kind,'hide');await action(kind,'show');await settle();assert.ok(await evaluate(`document.querySelectorAll('#${kind} ${selector}').length`)>0,kind+' rapid toggle');
 }
 await evaluate(`window.savedRow=document.querySelector('#leader .leader-data-row');true`);await action('leader','update');assert.equal(await exiting('leader'),false);assert.ok(await evaluate(`window.savedRow===document.querySelector('#leader .leader-data-row')`));
 await action('score','replace');assert.equal(await exiting('score'),false);assert.equal(await evaluate(`document.querySelector('#score').textContent.includes('OLD SCORE')`),false);assert.ok(await evaluate(`document.querySelector('#score').textContent.includes('NEW SCORE')`));assert.ok(await evaluate(`document.querySelector('#score .score-table-row').getAnimations().some(a=>a instanceof CSSAnimation)`),'new content replays entrance');

 for(const [capacity,count] of [[14,13],[12,8],[12,9],[14,14]]){
  await action('compact',capacity+'-'+count);await settle();
  assert.equal(await evaluate("document.querySelectorAll('#live .live-board-animated-row').length"),count);
  assert.equal(await evaluate("document.querySelectorAll('#live [data-placeholder]').length"),0);
  assert.equal(await evaluate("document.querySelectorAll('#live .eliminated').length"),1,'eliminated teams stay on board');
  assert.equal(await evaluate("document.querySelector('#live .live-board-footer-art').offsetTop"),124+count*(capacity===14?58:68));
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#live .live-board-header-art')).animationName"),'score-row-slide');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#live .live-board-footer-art')).animationDelay"),(count+1)*.25+'s');
  await evaluate("document.querySelectorAll('#root>div').forEach(n=>n.style.display=n.id==='live'?'block':'none');true");
  const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(stage+'/compact-'+capacity+'-'+count+'.png',Buffer.from(shot.data,'base64'));
  await evaluate("document.querySelectorAll('#root>div').forEach(n=>n.style.display='');true");
  await action('live','hide');assert.ok(await exiting('live'));
  const delays=await evaluate(`(()=>{
   const delay=node=>node.getAnimations().find(a=>!(a instanceof CSSAnimation)).effect.getTiming().delay;
   return {footer:delay(document.querySelector('#live .live-board-footer-art')),header:delay(document.querySelector('#live .live-board-header-art')),rows:Array.from(document.querySelectorAll('#live .live-board-animated-row'),delay)};
  })()`);
  assert.equal(delays.footer,0,'legend exits first');
  assert.deepEqual(delays.rows,Array.from({length:count},(_,i)=>(count-i)*60),'teams exit bottom to top after legend');
  assert.equal(delays.header,(count+1)*60,'header exits last');
  await settle();await action('live','show');await settle();

 }
 // Replace during an outgoing animation: no stale scoreboard can remain.
 await action('score','hide');assert.ok(await exiting('score'));
 await action('score','show');assert.equal(await exiting('score'),false);
 assert.ok(await evaluate("document.querySelector('#score').textContent.includes('OLD SCORE')"));
 await action('score','match');await settle();assert.equal(await evaluate(`document.querySelectorAll('#score .match-rank-row').length`),12);await action('score','hide');assert.ok(await exiting('score'));await settle();
 await action('map','status');assert.equal(await exiting('map'),false);await settle();await action('map','next');assert.equal(await exiting('map'),false);await settle();assert.equal(await evaluate(`document.querySelectorAll('#map .schedule-map-card').length`),10);
 await action('map','recap');assert.ok(await exiting('map'));await settle();assert.ok(await evaluate(`!!document.querySelector('#map .recap-grid')`));
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await action('leader','hide');assert.equal(await evaluate(`document.querySelectorAll('#leader .leader-data-row').length`),0);
 assert.deepEqual(errors,[]);console.log('PASS: compact 14/13, 12/8, 12/9, 14/14, animated header/legend, eliminated rows, immediate total replacement and interrupted exit; exit retains DOM, reverse stagger, matching row direction, hide/show, interrupted entry, rapid toggles, live updates, replacement, match scoreboard, schedule/status/recap, reduced motion; no browser errors.');
}finally{ws?.close();browser.kill();server.close();}
