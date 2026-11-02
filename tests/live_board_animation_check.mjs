import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(root+'/package.json');
const source=String.raw`import React from 'react';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';import Overlay from './components/LiveBoardOverlay';import {defaultLiveBoardSettings,compactLiveBoardDesign,livePacketSchema} from './lib/live-board';import {rankLiveTeams} from './lib/live-board-ranking';
module.exports=()=>{
const settings={...defaultLiveBoardSettings(),enabled:true};
const teams=['ALPHA','BETA','GAMMA','UNKNOWN'].map(name=>({id:name,name,logo:''}));
const totalRows=[{teamId:'ALPHA',name:'ALPHA',total:100},{teamId:'BETA',name:'BETA',total:10},{teamId:'GAMMA',name:'GAMMA',total:104}];
const packet=livePacketSchema.parse({sessionId:crypto.randomUUID(),configId:settings.configId,matchId:'42',detectedMatchId:'42',sequence:1,source:'game-log',isReplay:false,capturedAt:Date.now(),expectedTeams:4,complete:true,teams:[{teamId:'BETA',teamName:'BETA',elims:20,aliveCount:4},{teamId:'ALPHA',teamName:'ALPHA',elims:4,aliveCount:0},{teamId:'GAMMA',teamName:'GAMMA',elims:0,aliveCount:4},{teamId:'UNKNOWN',teamName:'UNKNOWN',elims:999,aliveCount:null}]});
const before=JSON.stringify({packet,totalRows,teams});
assert.deepEqual(rankLiveTeams(packet.teams,totalRows,teams).map(t=>t.teamName),['ALPHA','GAMMA','BETA','UNKNOWN']);
assert.deepEqual(rankLiveTeams(packet.teams,null,teams).map(t=>t.teamName),['UNKNOWN','BETA','ALPHA','GAMMA']);
for(const design of [settings.design,compactLiveBoardDesign(settings.design),{...compactLiveBoardDesign(settings.design),kv:'',autoAlign:false,alignment:{...compactLiveBoardDesign(settings.design).alignment,groups:[{x:100,y:100,width:600,rowHeight:60,rowStep:70,rows:2},{x:800,y:100,width:600,rowHeight:60,rowStep:70,rows:2}]}}]){
 const html=renderToStaticMarkup(<Overlay settings={{...settings,design}} packet={packet} teams={teams} totalRows={totalRows}/>);
 const articles=[...html.matchAll(/<article[^>]*>[\s\S]*?<\/article>/g)].map(m=>m[0]).filter(a=>!a.includes('data-placeholder="true"'));
 if(design.kv&&design.alignment?.groups.every(g=>g.rowStep>g.rowHeight)){assert.ok(html.includes('data-row-style="separated"'));assert.ok(html.includes('clip-path:url(#live-board-art-'));assert.ok(articles.every(a=>a.includes('background-image:url(')&&a.includes('background-size:1920px 1080px')),'all artwork belongs to the animated rows');}
 assert.equal(articles.length,4);assert.deepEqual(articles.map(a=>teams.find(t=>a.includes('>'+t.name+'</b>'))?.name),['ALPHA','GAMMA','BETA','UNKNOWN']);
 assert.deepEqual(articles.map(a=>Number(a.match(/data-rank="(\d+)"/)[1])),[1,2,3,4]);
 assert.deepEqual(articles.map(a=>Number(a.match(/--row-delay:(\d+)ms/)[1])),[250,500,750,1000]);
 assert.equal(articles.filter(a=>a.includes('data-leader="true"')).length,1);assert.ok(articles[0].includes('live-board-leader'));assert.ok(articles[0].includes('>104</span>'));
 const missing=renderToStaticMarkup(<Overlay settings={{...settings,design}} packet={packet} teams={teams}/>);assert.ok(!missing.includes('data-leader="true"'));
}
const updated={...packet,teams:packet.teams.map(t=>t.teamName==='BETA'?{...t,elims:150}:t)};assert.equal(rankLiveTeams(updated.teams,totalRows,teams)[0].teamName,'BETA');
assert.equal(before,JSON.stringify({packet,totalRows,teams}));
console.log('PASS: grid, compact and two-column KV; total descending, stable ties, missing totals, live overtaking, one leader, row delays, immutable packet and scores.');
};`;
const compiled=require('esbuild').buildSync({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});
const m={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,m,m.exports);m.exports();
