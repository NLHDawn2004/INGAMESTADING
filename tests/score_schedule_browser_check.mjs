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
import ScoreboardOverlay from './components/ScoreboardOverlay';import OverlayPage from './components/OverlayPage';import {initialState,mapNames} from './lib/state';
const score={scheduleDesign:{background:'/score-templates/tournament-finals.png',maps:{x:1100,y:140,width:652,height:824},table:{x:170,y:347,width:786,height:598},showTitle:false,showHeader:false},layout:'schedule',view:'total',publishedAt:1,title:'CHUNG KẾT',subtitle:'TST8',rows:Array.from({length:12},(_,i)=>({teamId:String(i),name:'ĐỘI THI ĐẤU '+(i+1),position:i+1,logo:'/player-templates/video-demo-logo-'+(i%6+1)+'.png',booyah:i%3,kills:90-i*3,total:150-i*9,placementPoints:60-i*6}))};
const make=n=>Array.from({length:n},(_,i)=>({id:'match-'+i,map:mapNames[i%5],status:i===0?'finished':i===1?'live':'locked',winner:i===0?'winner':'',position:50,revealAt:0}));
let remote={...initialState(),matches:make(6),teams:[{id:'winner',name:'ĐỘI VÔ ĐỊCH',logo:'/player-templates/video-demo-logo-1.png'}],scoreboards:{...initialState().scoreboards,published:score}};
window.fetch=async()=>Response.json({state:remote});
function App(){const [state,S]=useState(remote);const [value,V]=useState(score);window.qaReady=true;window.qaState=state;
const update=next=>{remote={...next,revision:remote.revision+1};S(remote);};
window.qa=(action,arg)=>{if(action==='count')update({...state,matches:make(arg)});if(action==='append')update({...state,matches:[...state.matches,make(state.matches.length+1).at(-1)]});if(action==='edit')update({...state,matches:state.matches.map((m,i)=>i===0?{...m,map:'Solara'}:m)});if(action==='prepare')update({...state,matches:state.matches.map((m,i)=>i===5?{...m,status:'ready',revealAt:Date.now()}:m)});if(action==='finish')update({...state,matches:state.matches.map((m,i)=>i===5?{...m,status:'finished',winner:'winner'}:m)});if(action==='hide')V(null);if(action==='show')V({...score,publishedAt:Date.now()});if(action==='remote')update({...state,matches:make(10)});};
return location.search.includes('view=scores')?<OverlayPage/>:<ScoreboardOverlay score={value} schedule={state}/>;}
createRoot(document.getElementById('root')).render(<App/>);`;
const built=require('esbuild').buildSync({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const css=['globals.css','player-leaders.css','live-board.css','score-schedule.css'].map(p=>readFileSync(root+'/app/'+p,'utf8').replaceAll(/@import[^;]+;/g,'')).join('\n');
const preflight=readFileSync(root+'/node_modules/tailwindcss/preflight.css','utf8');
const html='<!doctype html><meta charset="utf-8"><style>@layer base{'+preflight+'}'+css+'</style><div id="root"></div><script>'+built.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>';
const stage=root+'/outputs/score-schedule';mkdirSync(stage,{recursive:true});writeFileSync(stage+'/qa.html',html);
const server=createServer((req,res)=>{if(req.url.split('?')[0]==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}const p=req.url.split('?')[0]==='/api/media/qa-neon-14'?root+'/public/live-board-templates/standing-compact-neon-14-v1.png':root+'/public'+decodeURIComponent(req.url.split('?')[0]);if(existsSync(p)){res.end(readFileSync(p));return;}res.statusCode=404;res.end();});
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


 const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await sleep(30);}throw Error('Timed out: '+expression);};
 await waitFor('window.qaReady===true');
 const action=async(name,arg)=>{await evaluate(`window.qa(${JSON.stringify(name)},${JSON.stringify(arg??null)})`);await sleep(80);};
 const count=()=>evaluate("document.querySelectorAll('.schedule-map-card').length");
 const finishEntries=()=>evaluate("document.getAnimations().forEach(a=>{if(a.effect.getTiming().iterations!==Infinity&&a.playState!=='finished')a.finish()});true");
 await waitFor("document.querySelector('.schedule-total-kv')?.complete");
 await evaluate("document.fonts.ready");
 await finishEntries();
 await evaluate("window.savedRow=document.querySelector('.schedule-total-row');window.savedAnim=window.savedRow.getAnimations()[0];window.savedCard=document.querySelector('.schedule-map-card');true");
 for(const n of [6,8,10,12,20,30,31,200]){
  await action('count',n);await finishEntries();
  assert.equal(await count(),n,'every existing match must appear');
  assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.schedule-map-card'),n=>Number(n.dataset.matchNumber))"),Array.from({length:n},(_,i)=>i+1));
  assert.ok(await evaluate("window.savedRow===document.querySelector('.schedule-total-row')&&window.savedAnim===window.savedRow.getAnimations()[0]"),'map updates do not remount or replay score rows');
  assert.ok(await evaluate("window.savedCard===document.querySelector('.schedule-map-card')"),'previous map cards remain');
  assert.equal(await evaluate("document.querySelectorAll('.schedule-total-row').length"),12);
  assert.ok(await evaluate(`(()=>{const box=document.querySelector('.score-schedule-maps').getBoundingClientRect();return Array.from(document.querySelectorAll('.schedule-map-card')).every(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=box.left-.1&&r.top>=box.top-.1&&r.right<=box.right+.1&&r.bottom<=box.bottom+.1});})()`),'all maps fit their region, no pagination or clipping outside region');
  assert.equal(await evaluate("document.querySelectorAll('.schedule-map-photo').length"),5,'unpublished maps do not load their images');
  assert.equal(await evaluate("document.querySelector('.score-schedule-maps').dataset.crowded==='true'"),n>30);
  if([6,8,10,12,30].includes(n)){
   await evaluate("Promise.all(Array.from(document.images).map(n=>n.decode().catch(()=>{})))");
   await sleep(180);const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(stage+'/schedule-'+n+'.png',Buffer.from(shot.data,'base64'));
  }
 }
 await action('count',8);await action('append');assert.equal(await count(),9);await action('append');assert.equal(await count(),10);
 assert.deepEqual(await evaluate("Array.from(document.querySelectorAll('.schedule-map-card'),n=>n.dataset.matchId)"),Array.from({length:10},(_,i)=>'match-'+i));
 await action('edit');assert.ok(await evaluate("document.querySelector('.schedule-map-photo').src.endsWith('/maps/Solara.webp')"));
 await action('prepare');assert.equal(await evaluate("document.querySelectorAll('.schedule-map-card')[5].querySelector('.schedule-map-photo')===null"),true);
 assert.ok(await evaluate("document.querySelectorAll('.schedule-map-card')[5].textContent.includes('RANDOM')"));
 await action('finish');assert.ok(await evaluate("document.querySelectorAll('.schedule-map-card')[5].textContent.includes('BOOYAH!')"));
 assert.equal(await evaluate("document.querySelectorAll('.schedule-map-card')[5].querySelector('.schedule-map-winner').alt"),'ĐỘI VÔ ĐỊCH');
 assert.ok(await evaluate("window.savedRow===document.querySelector('.schedule-total-row')&&window.savedAnim===window.savedRow.getAnimations()[0]"));
 await finishEntries();await action('hide');assert.ok(await evaluate("!!document.querySelector('[data-overlay-exiting]')"));await action('show');assert.equal(await evaluate("!!document.querySelector('[data-overlay-exiting]')"),false);
 // Exercise the actual OBS page and its polling integration, using a synthetic API.
 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?view=scores&token=qa'});
 await waitFor("document.querySelectorAll('.schedule-map-card').length===6");
 await evaluate("window.savedRemoteRow=document.querySelector('.schedule-total-row');true");
 await action('remote');await waitFor("document.querySelectorAll('.schedule-map-card').length===10");
 assert.ok(await evaluate("window.savedRemoteRow===document.querySelector('.schedule-total-row')"),'OBS polling updates maps without replacing score rows');

 await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/'});
 await waitFor('window.qaReady===true');await action('count',12);
 await evaluate("document.fonts.ready");await evaluate("Promise.all(Array.from(document.images).map(n=>n.decode().catch(()=>{})))");await sleep(4000);
 const finalShot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(stage+'/schedule-12-final.png',Buffer.from(finalShot.data,'base64'));
 assert.deepEqual(errors,[]);
 console.log('PASS: 6/8/10/12/20/30/31/200 maps, adaptive columns, no missing or placeholder matches, 8→9→10, map secrecy and reveal, winner logo, stable score animations, hide/re-show, actual OBS polling; screenshots captured and no browser errors.');
}finally{ws?.close();browser.kill();server.close();}
