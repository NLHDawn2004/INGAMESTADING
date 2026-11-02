import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const require=createRequire(root+'/package.json');
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import Studio from './components/Studio';import ScoreboardStudio from './components/ScoreboardStudio';import Overlay from './components/Overlay';import ScoreboardOverlay from './components/ScoreboardOverlay';import OverlayPage from './components/OverlayPage';import {initialState,stateSchema,changeMatchLimit,addMatch,prepareMatch} from './lib/state';import {newScoreBoard,scoreSnapshot} from './lib/scoreboard';import {defaultScheduleDesign} from './lib/overlay-layout';
const board=newScoreBoard('GIẢI ĐẤU CỦA BẠN');board.title='GIẢI ĐẤU CỦA BẠN';board.titleColor='#f4faff';board.panelColor='#00b9de';board.highlight='#69d5ee';board.totalLayout='schedule';board.teams=Array.from({length:12},(_,i)=>({id:'t'+i,name:'ĐỘI '+String(i+1).padStart(2,'0'),logo:'',externalKeys:[],adjustment:0}));board.matches=[{id:'r1',stageId:board.stages[0].id,name:'TRẬN 1',source:'manual',enabled:true,importedAt:1,rows:board.teams.map((t,i)=>({teamId:t.id,rank:i+1,kills:30-i,booyah:i===0?1:0,sourcePoints:null}))}];
let remote=initialState();remote.revision=1;remote.teams=board.teams.map(({id,name,logo})=>({id,name,logo}));remote.scoreboards={boards:[board],selectedId:board.id,published:scoreSnapshot(board,'total'),publishedMatch:null};let uploads=0;
function commit(next){remote=stateSchema.parse({...next,revision:remote.revision+1});window.syncRemote?.(remote);return remote;}
window.fetch=async(url,options)=>{if(url==='/api/upload'){const f=options?.body?.get('file');if(!(f instanceof File))throw Error('Missing uploaded file');uploads++;return Response.json({url:'/api/media/aaaaaaaa-0000-0000-0000-'+String(uploads).padStart(12,'0')});}if(options?.method==='PUT'){const body=JSON.parse(options.body);return Response.json({state:commit(body.state),token:'qa'});}return Response.json({state:remote,token:'qa'});};
function App(){const [state,S]=useState(remote);window.syncRemote=S;window.qaReady=true;window.qaState=state;const save=async next=>{commit(next);return true;};
window.qa=(action,arg)=>{if(action==='many'){let next=changeMatchLimit(remote,'unlimited');while(next.matches.length<arg)next=addMatch(next);commit(next);}if(action==='prepareSix'){let next=changeMatchLimit(remote,8);next.matches[0]={...next.matches[0],status:'finished',winner:'t0'};next.matches[5].map='Solara';next=prepareMatch(next,next.matches[5].id);commit(next);}if(action==='fixture'){let next=changeMatchLimit(remote,8);next.theme={...next.theme,background:'/api/media/aaaaaaaa-0000-0000-0000-000000000001',useBackground:true,showBackgroundInOverlay:true,mapRegion:{x:120,y:200,width:1600,height:600}};next.scoreboards.published={...next.scoreboards.published,scheduleDesign:{...defaultScheduleDesign(),background:'/api/media/aaaaaaaa-0000-0000-0000-000000000002',maps:{x:1110,y:130,width:700,height:850}}};commit(next);}};
return location.search?<OverlayPage/>:<><div id="map-output"><Overlay state={state}/></div><div id="score-output"><ScoreboardOverlay score={state.scoreboards.published} schedule={state}/></div><div id="map-controls"><Studio initialTab="matches"/></div><div id="score-controls"><ScoreboardStudio initialView="total" state={state} save={save} loaded busy={false} notify={()=>{}} overlayURL="/overlay?token=qa"/></div></>;}
createRoot(document.getElementById('root')).render(<App/>);`;
const built=await require('esbuild').build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'qa-link',setup(build){build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'qa'}));build.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:"import React from 'react';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}",loader:'tsx',resolveDir:root}));}}]});
const css=['globals.css','player-leaders.css','live-board.css','score-schedule.css'].map(p=>readFileSync(root+'/app/'+p,'utf8').replaceAll(/@import[^;]+;/g,'')).join('\n');
const preflight=readFileSync(root+'/node_modules/tailwindcss/preflight.css','utf8');
const html='<!doctype html><meta charset="utf-8"><style>@layer base{'+preflight+'}'+css+'</style><div id="root"></div><script>'+built.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>';
const stage=root+'/outputs/custom-overlays';mkdirSync(stage,{recursive:true});writeFileSync(stage+'/qa.html',html);
const {deflateSync}=await import('node:zlib');
function chunk(type,data){const bytes=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);bytes.copy(out,4);out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
const pixels=Buffer.alloc((1920*3+1)*1080);for(let y=0;y<1080;y++)for(let x=0;x<1920;x++){const p=y*(1920*3+1)+1+x*3;pixels[p]=8+Math.floor(x/192);pixels[p+1]=17+Math.floor(y/100);pixels[p+2]=33+Math.floor(x/96);}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1920);ihdr.writeUInt32BE(1080,4);ihdr[8]=8;ihdr[9]=2;const kvPng=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
writeFileSync(stage+'/uploaded-kv.png',kvPng);
const server=createServer((req,res)=>{if(req.url.split('?')[0]==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}if(req.url.startsWith('/api/media/')){res.setHeader('Content-Type','image/png');res.end(kvPng);return;}const p=root+'/public'+decodeURIComponent(req.url.split('?')[0]);if(existsSync(p)){res.end(readFileSync(p));return;}res.statusCode=404;res.end();});
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


 const waitFor=async expression=>{for(let i=0;i<240;i++){if(await evaluate(expression))return;await sleep(40);}throw Error('Timed out: '+expression+' '+JSON.stringify(await evaluate("({state:window.qaState?.matches.length,map:document.querySelectorAll('#map-output .schedule-map-card').length,score:document.querySelectorAll('#score-output .schedule-map-card').length})"))+' errors='+JSON.stringify(errors));};
 await waitFor('window.qaReady===true');await waitFor("document.querySelector('#map-controls [aria-label=\"Số trận dùng chung\"]')?.disabled===false");
 const selectCount=async(root,value)=>{await evaluate(`(()=>{const n=document.querySelector('#${root} [aria-label="Số trận dùng chung"]');n.value='${value}';n.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(80);};
 const count=kind=>evaluate(`document.querySelectorAll('#${kind}-output .schedule-map-card').length`);
 const region=async(root,label,values)=>{for(const [key,value]of Object.entries(values))await evaluate(`(()=>{const n=document.querySelector('#${root} [aria-label=${JSON.stringify(label+' · '+key)}]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'${value}');n.dispatchEvent(new Event('input',{bubbles:true}));})()`);};
 const clickText=async(root,text)=>{await evaluate(`Array.from(document.querySelectorAll('#${root} button')).find(n=>n.textContent.trim()===${JSON.stringify(text)}).click()`);await sleep(80);};
 const upload=async selector=>{const {root:doc}=await call('DOM.getDocument');const {nodeId}=await call('DOM.querySelector',{nodeId:doc.nodeId,selector});assert.ok(nodeId);await call('DOM.setFileInputFiles',{nodeId,files:[stage+'/uploaded-kv.png']});await sleep(100);};
 await call('DOM.enable');
 assert.equal(await evaluate("document.querySelectorAll('img[src*=\"tournament-finals\"]').length"),0,'no required TST8 KV');
 for(const n of [4,5,6,8]){await selectCount('map-controls',n);await waitFor(`window.qaState.matches.length===${n}&&document.querySelectorAll('#map-output .schedule-map-card').length===${n}&&document.querySelectorAll('#score-output .schedule-map-card').length===${n}`);assert.equal(await count('map'),n);assert.equal(await count('score'),n);assert.equal(await evaluate("document.querySelectorAll('#map-output .schedule-map-photo').length"),Math.min(5,n));assert.equal(await evaluate("document.querySelectorAll('#score-output .schedule-map-photo').length"),Math.min(5,n));}
 assert.deepEqual(await evaluate('window.qaState.matches.slice(0,5).map(m=>m.map)'),['Bermuda','Purgatory','Kalahari','NexTerra','Solara']);
 await selectCount('map-controls','unlimited');await waitFor("window.qaState.matchLimit==='unlimited'");await evaluate("document.querySelector('#map-controls .schedule-count-controls button').click()");await waitFor('window.qaState.matches.length===9');await evaluate("document.querySelector('#map-controls .schedule-count-controls button').click()");await waitFor('window.qaState.matches.length===10');assert.equal(await count('map'),10);assert.equal(await count('score'),10);
 await clickText('map-controls','Thay KV & màu sắc');await waitFor("document.querySelector('#map-controls .asset-field input[type=file]')!==null");
 await upload('#map-controls .asset-field input[type=file]');await waitFor("document.querySelector('#map-controls .asset-field img')?.src.includes('/api/media/')");
 await region('map-controls','Vùng map trên KV',{'Vị trí ngang':120,'Vị trí dọc':200,'Chiều rộng':1600,'Chiều cao':600});
 await clickText('map-controls','Áp dụng lên overlay');await waitFor("window.qaState.theme.background.includes('/api/media/')");
 assert.equal(await evaluate("document.querySelector('#map-output .kv-layer').getAttribute('src')"),'/api/media/aaaaaaaa-0000-0000-0000-000000000001');
 assert.deepEqual(await evaluate("(()=>{const n=document.querySelector('#map-output .score-schedule-maps');return [n.offsetLeft,n.offsetTop,n.offsetWidth,n.offsetHeight]})()"),[120,200,1600,600]);
 await upload('#score-controls [aria-label="Tải KV bảng tổng và map"]');await waitFor("document.querySelector('#score-controls .schedule-design-controls .template-thumbnail')?.src.includes('/api/media/')");
 await region('score-controls','Vùng map trên bảng tổng',{'Vị trí ngang':1110,'Vị trí dọc':130,'Chiều rộng':700,'Chiều cao':850});
 assert.equal(await evaluate('window.qaState.scoreboards.published.scheduleDesign===undefined'),true,'uploaded draft KV does not change the published snapshot');
 await clickText('score-controls','Chiếu bảng tổng');await waitFor('window.qaState.scoreboards.published.scheduleDesign!==undefined');
 assert.equal(await evaluate("document.querySelector('#score-output .schedule-total-kv').getAttribute('src')"),'/api/media/aaaaaaaa-0000-0000-0000-000000000002');
 assert.deepEqual(await evaluate('window.qaState.scoreboards.published.scheduleDesign.maps'),{x:1110,y:130,width:700,height:850});
 await selectCount('score-controls',4);await waitFor('window.qaState.matches.length===4');assert.equal(await count('map'),4);assert.equal(await count('score'),4);
 await clickText('map-controls','Lịch thi đấu');await waitFor("document.querySelector('#map-controls [aria-label=\"Số trận dùng chung\"]')?.value==='4'");
 await evaluate("window.savedScoreRow=document.querySelector('#score-output .schedule-total-row');window.qa('prepareSix');true");await waitFor('window.qaState.matches.length===8');
 assert.ok(await evaluate("Array.from(document.querySelectorAll('#map-output .schedule-map-card'))[5].textContent.includes('RANDOM')"));
 assert.equal(await evaluate("document.querySelectorAll('#map-output .schedule-map-card')[5].querySelector('img')===null"),true);
 await waitFor("document.querySelectorAll('#map-output .schedule-map-card')[5].querySelector('.schedule-map-photo')?.src.endsWith('/maps/Solara.webp')");
 assert.ok(await evaluate("document.querySelectorAll('#score-output .schedule-map-card')[5].querySelector('.schedule-map-photo').src.endsWith('/maps/Solara.webp')"));
 assert.ok(await evaluate("window.savedScoreRow===document.querySelector('#score-output .schedule-total-row')"),'live map reveals do not replay score entrance');
 for(const n of [8,50,200]){await evaluate(`window.qa('many',${n})`);await waitFor(`window.qaState.matches.length===${n}&&document.querySelectorAll('#map-output .schedule-map-card').length===${n}&&document.querySelectorAll('#score-output .schedule-map-card').length===${n}`);assert.equal(await count('map'),n);assert.equal(await count('score'),n);await evaluate("document.getAnimations().forEach(a=>{if(a.effect.getTiming().iterations!==Infinity)a.finish()});true");await sleep(80);for(const kind of ['map','score'])assert.ok(await evaluate(`(()=>{const box=document.querySelector('#${kind}-output .score-schedule-maps').getBoundingClientRect();return Array.from(document.querySelectorAll('#${kind}-output .schedule-map-card')).every(n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=box.left-1&&r.top>=box.top-1&&r.right<=box.right+1&&r.bottom<=box.bottom+1});})()`));}
 // Return to eight for readable screenshots without deleting any real application data.
 await selectCount('score-controls',8);await waitFor('window.qaState.matches.length===8');
 await evaluate("document.fonts.ready");await evaluate("Promise.all(Array.from(document.images).map(n=>n.decode().catch(()=>{})))");
 for(const kind of ['map','score']){await evaluate(`document.querySelectorAll('#root>div').forEach(n=>n.style.display=n.id==='${kind}-output'?'block':'none');document.getAnimations().forEach(a=>{if(a.effect.getTiming().iterations!==Infinity)a.finish()});true`);await sleep(200);const shot=await call('Page.captureScreenshot',{format:'png'});writeFileSync(stage+'/'+kind+'-custom-kv.png',Buffer.from(shot.data,'base64'));await evaluate("document.querySelectorAll('#root>div').forEach(n=>n.style.display='');true");}
 for(const view of ['scores','map']){await call('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/?view='+view+'&token=qa'});await waitFor('window.qaReady===true');await evaluate("window.qa('fixture')");await waitFor("document.querySelectorAll('.schedule-map-card').length===8");await waitFor(view==='scores'?"document.querySelector('.schedule-total-kv')?.src.includes('/api/media/')":"document.querySelector('.kv-layer')?.src.includes('/api/media/')");}
 assert.deepEqual(errors,[]);
 console.log('PASS: actual shared 4/5/6/8/unlimited controls, upload both custom KVs, editable regions and apply/publish, first five maps preserved, sixth RANDOM/reveal in both overlays, all 200 maps without pagination, stable score rows, both actual OBS routes; screenshots and no browser errors.');
}finally{ws?.close();browser.kill();server.close();}
