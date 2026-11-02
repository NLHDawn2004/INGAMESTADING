import assert from 'node:assert/strict';
import {initialState,changeMatchLimit,advance,startMatch,finishMatch,recapAvailable,showRecap,endRush,resumeRush,addMatch,prepareMatch,stateSchema} from '../lib/state.ts';

for(const limit of [6,8,10]){
 let s=changeMatchLimit(initialState(),limit);s.teams=[{id:'qa',name:'QA',logo:''}];
 assert(!showRecap(s));
 for(let i=0;i<limit;i++){
  s=finishMatch(startMatch(s,s.matches[i].id),s.matches[i].id,'qa');
  assert.equal(showRecap(s),i===limit-1);
  if(i<limit-1)s=advance(s);
 }
 assert(recapAvailable(s));assert(s.recapAt>0);assert(stateSchema.safeParse(s).success);
 assert(!showRecap({...s,recapView:'schedule'}));
 assert(showRecap({...s,recapView:'summary'}));
 assert.throws(()=>endRush(s));
}
let rush=initialState();rush.teams=[{id:'qa',name:'QA',logo:''}];
assert.throws(()=>endRush(rush));
rush=finishMatch(rush,rush.matches[0].id,'qa');
assert(!recapAvailable(rush));
const ended=endRush(rush);
assert(showRecap(ended));assert.equal(ended.matches.filter(m=>m.status==='finished').length,1);
assert.throws(()=>addMatch(ended));assert.throws(()=>prepareMatch(ended,ended.matches[1].id));
const resumed=resumeRush(ended);
assert(!showRecap(resumed));assert.equal(addMatch(resumed).matches.length,6);
assert(!stateSchema.safeParse({...rush,recapView:'summary'}).success);
assert(!stateSchema.safeParse({...initialState(),rushEnded:true}).success);
const legacy=JSON.parse(JSON.stringify(rush));delete legacy.recapView;delete legacy.recapAt;delete legacy.rushEnded;
assert.equal(stateSchema.parse(legacy).recapView,'auto');assert.equal(stateSchema.parse(legacy).rushEnded,false);
console.log('PASS: automatic 6/8/10 final recap, no premature recap, manual schedule/summary, Champion Rush end/resume, exclude unplayed matches, validation and legacy defaults');
