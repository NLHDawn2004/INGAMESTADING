import assert from 'node:assert/strict';
import {initialState,changeMatchLimit,prepareMatch,stateSchema} from '../lib/state.ts';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
// Resolve the bundler's extensionless import for this standalone Node check.
const source=readFileSync(new URL('../lib/reveal.ts',import.meta.url),'utf8').replace("from './state'",`from '${new URL('../lib/state.ts',import.meta.url).href}'`);
const {revealFrame,revealDuration}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));

const s=changeMatchLimit(initialState(),10);
const m={...s.matches[5],map:'Solara',revealAt:100000,status:'locked'};
for(let n=1;n<=5;n++)assert.deepEqual(revealFrame(m,n,100000),{hidden:false,spinning:false,map:'Solara'});
for(let n=6;n<=10;n++)assert.deepEqual(revealFrame(m,n,100000),{hidden:true,spinning:false,map:null});
m.status='ready';
const candidates=new Set();
for(let delta=0;delta<revealDuration;delta+=20){const f=revealFrame(m,6,m.revealAt+delta);assert(f.spinning);candidates.add(f.map);}
assert.equal(candidates.size,5);
assert.deepEqual(revealFrame(m,6,m.revealAt+revealDuration),{hidden:false,spinning:false,map:'Solara'});
assert.deepEqual(revealFrame({...m,status:'live'},6,m.revealAt+200),revealFrame(m,6,m.revealAt+200));
assert.equal(revealFrame({...m,status:'finished'},6,m.revealAt+200).map,'Solara');
assert.equal(revealFrame({...m,status:'finished'},6,m.revealAt+200).spinning,false);
assert.equal(revealFrame({...m,revealAt:0},6,100000).spinning,false);
const legacy=JSON.parse(JSON.stringify(s));for(const match of legacy.matches)delete match.revealAt;
assert(stateSchema.parse(legacy).matches.every(m=>m.revealAt===0));
s.matches[0].status='locked';
const prepared=prepareMatch(s,s.matches[5].id);
assert(prepared.matches[5].revealAt>0);
assert.equal(prepared.matches[5].map,s.matches[5].map);
console.log('PASS: first-five visibility, secret maps from six, all five roulette candidates, exact chosen result, shared timeline, live/finish handling, legacy defaults');
