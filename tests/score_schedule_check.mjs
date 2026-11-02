import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(root+'/package.json');
const source=`import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Studio from './components/ScoreboardStudio';import {initialState,addMatch,stateSchema} from './lib/state';import {newScoreBoard,scoreSnapshot,resetScoreData,publishedScoreSchema} from './lib/scoreboard';import {scoreScheduleLayout} from './lib/score-schedule';
module.exports=()=>{
const board=newScoreBoard('TST8');board.totalLayout='schedule';board.teams=[{id:'t1',name:'ĐỘI THẬT',logo:'',externalKeys:[],adjustment:0}];board.matches=[{id:'result1',stageId:board.stages[0].id,name:'TRẬN 1',source:'manual',enabled:true,importedAt:1,rows:[{teamId:'t1',rank:1,kills:8,booyah:1,sourcePoints:null}]}];
const snapshot=scoreSnapshot(board,'total');assert.equal(snapshot.layout,'schedule');assert.equal(snapshot.rows[0].total,20);assert.equal(snapshot.rows[0].booyah,1);
let state=initialState();state.scoreboards={boards:[board],selectedId:board.id,published:snapshot,publishedMatch:null};state=stateSchema.parse(state);assert.equal(state.scoreboards.boards[0].totalLayout,'schedule');assert.equal(state.scoreboards.published.layout,'schedule');
assert.equal(publishedScoreSchema.parse({...snapshot,layout:undefined}).layout,undefined,'old snapshots remain valid');assert.equal(resetScoreData(state.scoreboards,state.teams).boards[0].totalLayout,'schedule','reset preserves chosen layout');
while(state.matches.length<31)state=addMatch(state);const before=JSON.stringify(snapshot);state.matches[0]={...state.matches[0],status:'finished',winner:'t1'};assert.equal(JSON.stringify(snapshot),before);
const html=renderToStaticMarkup(<Studio initialView="total" state={state} save={async()=>true} loaded busy={false} notify={()=>{}} overlayURL="/overlay?token=qa"/>);assert.ok(html.includes('role="alert"'));assert.ok(html.includes('31'));assert.ok(html.includes('không ẩn trận hay phân trang'));assert.equal((html.match(/class="schedule-map-card /g)||[]).length,31);
for(const n of [6,8,10,12,20,30,31,200]){const layout=scoreScheduleLayout(n);assert.ok(layout.columns*layout.rows>=n);assert.ok(layout.width>0&&layout.height>0);assert.equal(layout.crowded,n>30);}
console.log('PASS: layout selection survives state/snapshot/reset, legacy snapshots, unchanged published points, admin crowding warning and all 31 matches, layout up to 200.');};`;
const out=require('esbuild').buildSync({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});
const m={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,m,m.exports);m.exports();
