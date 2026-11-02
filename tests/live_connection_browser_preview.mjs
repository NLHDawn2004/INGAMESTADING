import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(root+'/package.json'),stage=root+'/outputs/live-connection-ui';mkdirSync(stage,{recursive:true});
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import LiveBoardStudio from './components/LiveBoardStudio';import {defaultLiveBoardSettings} from './lib/live-board';
let settings=defaultLiveBoardSettings();settings.design={...settings.design,kv:'',autoAlign:false};
const scenario=new URL(location.href).searchParams.get('scenario')||'resume';
window.__connectionRequests=[];window.__apiOffline=false;
let paired=scenario!=='fresh'||localStorage.getItem('test-paired')==='yes';
const started=()=>scenario==='existing'||localStorage.getItem('test-started')==='yes';
window.fetch=async(url,options)=>{
 const path=String(url);window.__connectionRequests.push({url:path,method:options?.method||'GET'});
 if(path.startsWith('/game-connector.exe')||path.startsWith('/live-bridge.zip'))throw Error('Automatic connection must never download an application');
 if(path.endsWith(':5184/status')){if(scenario==='missing')throw Error('Host unavailable');return Response.json({service:'overlay-studio-live-bridge',ready:true,running:started(),serverUrl:started()?location.origin:null});}
 if(path.endsWith(':5184/resume')){
  if(scenario==='network')return Response.json({code:'server-unavailable',error:'Đang chờ máy chủ web. Sẽ tự kết nối lại.'},{status:503});
  if(scenario==='fresh'||scenario==='revoked')return Response.json({code:'pairing-required'},{status:409});
  localStorage.setItem('test-started','yes');return Response.json({ok:true});
 }
 if(path.endsWith(':5184/start')){localStorage.setItem('test-started','yes');return Response.json({ok:true});}
 if(path==='/api/live-scoreboard'){
  if(window.__apiOffline)throw Error('Mock web offline');
  if(options?.method==='POST'){paired=true;localStorage.setItem('test-paired','yes');return Response.json({token:'mock-auto-connection-only-'.repeat(3)});}
  if(options?.method==='PUT')throw Error('Connection must not save or alter game settings');
  return Response.json({settings,packet:null,health:{paired,sourceStatus:window.__sourceStatus||'waiting',message:'',lastSeenAt:started()?Date.now():0,receivedAt:0,sampleAt:0,diagnostic:null},teams:[],serverNow:Date.now(),overlayToken:'qa'});
 }
 throw Error('Unexpected request '+path);
};
createRoot(document.getElementById('root')).render(<LiveBoardStudio/>);`;
const out=await require('esbuild').build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-link',setup(build){build.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'qa'}));build.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:"import React from 'react';export default function Link({href,children,...rest}){return React.createElement('a',{href,...rest},children)}",loader:'js',resolveDir:root}));}}]});
const css=readFileSync(root+'/app/globals.css','utf8').replace('@import "tailwindcss";','')+readFileSync(root+'/app/live-board.css','utf8')+readFileSync(root+'/app/player-leaders.css','utf8');
writeFileSync(stage+'/index.html','<!doctype html><meta charset="utf-8"><style>'+css+'</style><div id="root"></div><script>'+out.outputFiles[0].text.replaceAll('</script','<\\/script')+'</script>');
console.log('Prepared isolated automatic-connection browser fixture. No production API or database.');
