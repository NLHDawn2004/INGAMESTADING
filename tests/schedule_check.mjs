import assert from 'node:assert/strict';
import {initialState,stateSchema,windowSize,changeMatchLimit,addMatch,advance,prepareMatch,startMatch,finishMatch,mapNames} from '../lib/state.ts';

const base=initialState();base.teams=[{id:'qa',name:'QA',logo:''}];
const legacy=structuredClone(base);delete legacy.matchLimit;
assert.equal(stateSchema.parse(legacy).matchLimit,'unlimited');
assert.equal(windowSize(base),5);
assert.equal(addMatch(base).matches[5].map,'Bermuda');
const originalRandom=Math.random;
try{
 // Changing the count must preserve already selected maps, independent of RNG.
 Math.random=()=>0.99;
 for(const limit of [4,5,6,8,10]){
  let s=changeMatchLimit(base,limit);
  assert.equal(s.matches.length,limit);
  assert.equal(windowSize(s),6);
  assert.deepEqual(s.matches.slice(0,Math.min(5,limit)).map(m=>m.map),base.matches.slice(0,Math.min(5,limit)).map(m=>m.map));
  assert.throws(()=>addMatch(s));
  assert.deepEqual(stateSchema.parse(JSON.parse(JSON.stringify(s))),s);
  for(let i=0;i<limit;i++){
   assert.equal(s.matches[i].status,'ready');
   assert.equal(s.windowStart,Math.floor(i/6)*6);
   s=finishMatch(startMatch(s,s.matches[i].id),s.matches[i].id,'qa');
   if(i<limit-1)s=advance(s);
  }
  assert.throws(()=>advance(s),new RegExp(''+limit));
  assert.equal(s.matches.filter(m=>m.status==='finished').length,limit);
  assert(stateSchema.safeParse(s).success);
 }
}finally{Math.random=originalRandom;}
let fixed=changeMatchLimit(base,10);
fixed=finishMatch(fixed,fixed.matches[0].id,'qa');
fixed=prepareMatch(fixed,fixed.matches[6].id);
assert.equal(fixed.windowStart,6);
assert.throws(()=>changeMatchLimit(fixed,6));
const running=startMatch(fixed,fixed.matches[6].id);
assert.equal(changeMatchLimit(running,8).matches[6].map,running.matches[6].map);
assert.equal(changeMatchLimit(fixed,'unlimited').windowStart,0);
assert.equal(addMatch(changeMatchLimit(fixed,'unlimited')).matches.length,11);
assert(!stateSchema.safeParse({...fixed,matches:fixed.matches.slice(0,8)}).success);
assert(!stateSchema.safeParse({...fixed,windowStart:5}).success);
assert.throws(()=>prepareMatch(fixed,fixed.matches[7].id));
console.log('PASS: legacy state, preserved map choices and fixed schedules, all limits, 6→7 pagination, completion, mode changes, active-match preservation, schema validation, unlimited append');
