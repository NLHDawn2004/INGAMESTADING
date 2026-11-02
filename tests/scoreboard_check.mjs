import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialState,stateSchema} from '../lib/state.ts';
import {resetScoreData,newScoreBoard,commitImport,matchStandings,standings,publishScore,scoreSnapshot,placementScores,scoreForRank,matchPoints} from '../lib/scoreboard.ts';
import {normalizeMatch,fetchMatchStats,AmbiguousMatchError} from '../lib/matchstats.ts';
const id='1989692635121453056';const payload=JSON.parse(readFileSync('tests/fixtures/matchstats-br.json','utf8'));
assert.deepEqual(placementScores,[12,9,8,7,6,5,4,3,2,1,0,0]);assert.equal(matchPoints({rank:1,kills:9}),21);assert.equal(scoreForRank(12),0);
const imported=normalizeMatch(id,payload);assert.equal(imported.rows.length,12);
// Garena's match_rank is score rank, not finish rank: R7 is score #3, finish #4.
assert.equal(imported.rows.find(r=>r.name==='R7').rank,4);assert.equal(imported.rows.find(r=>r.name==='RRQ').rank,3);
assert.equal(imported.rows.find(r=>r.name==='PE').rankUncertain,true);
let board=newScoreBoard('Finals');board=commitImport(board,imported,board.stages[0].id,Object.fromEntries(imported.rows.map(r=>[r.externalKey,'new'])),[]);
const first=board.matches[0];const firstRows=matchStandings(board,first);assert.equal(firstRows.find(r=>r.name==='R7').total,16);assert.equal(firstRows.find(r=>r.name==='RRQ').total,14);
assert.equal(firstRows.find(r=>r.name==='BRU').placementPoints,12);assert.equal(firstRows.find(r=>r.name==='BRU').total,21);
first.rows.find(r=>board.teams.find(t=>t.id===r.teamId)?.name==='BRU').sourcePoints=9999;
assert.equal(matchStandings(board,first).find(r=>r.name==='BRU').total,21,'Must calculate placement + elims, not trust total_score');
board.rule.mode='source';board.rule.killPoints=20;board.rule.placements=[99];board.rule.confirmed=false;board.teams[0].adjustment=100;
assert.equal(standings(board).find(r=>r.name===board.teams[0].name).total,firstRows.find(r=>r.teamId===board.teams[0].id).total,'Legacy advanced settings cannot affect simple total');
const matchSnapshot=scoreSnapshot(board,'match',id);assert.equal(matchSnapshot.view,'match');assert.equal(matchSnapshot.matchId,id);
assert.throws(()=>commitImport(board,imported,board.stages[0].id,{},[]),/trùng/);
const map=Object.fromEntries(board.teams.flatMap(t=>t.externalKeys.map(k=>[k,t.id])));
board=commitImport(board,{...imported,id:'1989692635121453057'},board.stages[0].id,map,[]);
assert.equal(board.teams.length,12);assert.equal(matchStandings(board,board.matches[1]).find(r=>r.name==='BRU').total,21);assert.equal(standings(board).find(r=>r.name==='BRU').total,42);
for(const total of standings(board)){const sum=board.matches.flatMap(m=>matchStandings(board,m)).filter(r=>r.teamId===total.teamId).reduce((n,r)=>n+r.total,0);assert.equal(total.total,sum);}
board.scope=['obsolete'];assert.equal(standings(board).find(r=>r.name==='BRU').total,42,'Total sums stored matches without stage scopes');
const totalSnapshot=publishScore(board);assert.equal(totalSnapshot.view,'total');assert.equal(totalSnapshot.matchCount,2);assert.equal(matchSnapshot.rows.find(r=>r.name==='BRU').total,21);
board.matches[0].enabled=false;assert.equal(standings(board).find(r=>r.name==='BRU').total,21);assert.equal(totalSnapshot.rows.find(r=>r.name==='BRU').total,42);
board.matches=board.matches.slice(1);assert.equal(standings(board).find(r=>r.name==='BRU').total,21);
const legacy=initialState();delete legacy.scoreboards;assert.deepEqual(stateSchema.parse(legacy).scoreboards,{boards:[],selectedId:'',published:null,publishedMatch:null});
const oldRow=structuredClone(first);oldRow.rows.forEach(r=>{delete r.rankVerified;delete r.placementPoints;delete r.matchPoints;const original=payload.data.team_stats[0].team_stats.find(x=>board.teams.find(t=>t.id===r.teamId)?.name===x.team_name);r.rank=original.match_rank;r.sourcePoints=original.total_score;});
assert.equal(matchStandings(board,oldRow).find(r=>r.name==='R7').total,16,'Legacy imported score ranks must be migrated safely');
const noPlacement=structuredClone(payload);delete noPlacement.data.team_stats[0].team_stats[0].ranking_score;delete noPlacement.data.team_stats[0].team_stats[0].survival_score;assert.throws(()=>normalizeMatch(id,noPlacement),/điểm thứ hạng/);
assert.throws(()=>normalizeMatch('999',payload),/đúng Match ID/);
const incomplete=structuredClone(payload);incomplete.data.team_stats[0].team_stats.pop();assert.throws(()=>normalizeMatch(id,incomplete),/đủ số đội/);
const originalFetch=globalThis.fetch;try{let requests=[];globalThis.fetch=async(url,options)=>{const body=JSON.parse(options.body);requests.push(body);if(String(url).endsWith('/search'))return Response.json({status:'success',data:{match_stats:[{match_id:id,single_match_id:153041,season_id:150187,event_id:120796,mode:1,end_time:1763215996,start_time:1763214666}]}});return Response.json(payload);};const live=await fetchMatchStats(id);assert.equal(live.id,id);assert.equal(requests[0].param[0],id);assert.equal(requests[1].match_ids[0],id);
 globalThis.fetch=async()=>Response.json({status:'success',data:{match_stats:[{match_id:id,single_match_id:1,season_id:1,event_id:1,mode:1,end_time:100},{match_id:id,single_match_id:2,season_id:2,event_id:2,mode:1,end_time:100}]}});await assert.rejects(()=>fetchMatchStats(id),e=>e instanceof AmbiguousMatchError&&e.candidates.length===2);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: exact placement + 1/elim rule, verified finish points vs source score rank, match totals ignore source total, total equals sum of match tables, repeat ID prevention, independent snapshots, legacy data, excluded/deleted matches, invalid data, full string IDs and event selection.');

const absentBoard=structuredClone(board);absentBoard.teams.push({id:'absent',name:'ABSENT TEAM',logo:'',externalKeys:[],adjustment:0});
const absent=matchStandings(absentBoard,absentBoard.matches[0]).find(r=>r.teamId==='absent');
assert.deepEqual([absent.kills,absent.placementPoints,absent.total,absent.booyah,absent.matches],[0,0,0,0,0]);
assert.equal(standings(absentBoard).find(r=>r.teamId==='absent').matches,0);
assert.equal(scoreSnapshot(absentBoard,'match',absentBoard.matches[0].id).rows.length,13);
const rosterBoard=newScoreBoard('Roster');const registered=commitImport(rosterBoard,imported,rosterBoard.stages[0].id,Object.fromEntries(imported.rows.map((r,i)=>[r.externalKey,'registered-'+i])),[...imported.rows.map((r,i)=>({id:'registered-'+i,name:r.name,logo:''})),{id:'skipped',name:'REGISTERED TEAM',logo:''}]);
assert.equal(matchStandings(registered,registered.matches[0]).find(r=>r.teamId==='skipped').total,0);
console.log('PASS: absent teams have zero points and zero played matches.');

const reset=resetScoreData({boards:[absentBoard,registered],selectedId:absentBoard.id,published:totalSnapshot,publishedMatch:matchSnapshot},[{id:'current',name:'CURRENT TEAM',logo:'/logos/current.png'}]);
assert.equal(reset.published,null);assert.equal(reset.publishedMatch,null);
for(const b of reset.boards){assert.equal(b.matches.length,0);assert.deepEqual(b.scope,[]);assert.deepEqual(b.teams,[{id:'current',name:'CURRENT TEAM',logo:'/logos/current.png',externalKeys:[],adjustment:0}]);}
assert.equal(reset.boards[0].title,absentBoard.title);assert.equal(absentBoard.matches.length,1);
const reimport=commitImport(reset.boards[0],imported,reset.boards[0].stages[0].id,Object.fromEntries(imported.rows.map(r=>[r.externalKey,'new'])),[]);
assert.equal(reimport.matches.length,1);
console.log('PASS: reset clears all boards and OBS snapshots, preserves roster and style, and permits fresh imports.');

const ranking=newScoreBoard('Absent ranking');
ranking.teams=['winner','zero-b','zero-a','zulu','alpha','bravo'].map((id,i)=>({id,name:['Winner','Zero B','Zero A','Zulu','alpha','Bravo'][i],logo:'',externalKeys:[],adjustment:0}));
ranking.matches=[{id:'ranking',stageId:ranking.stages[0].id,name:'Test',source:'manual',enabled:true,importedAt:0,rows:[{teamId:'winner',rank:1,kills:0,booyah:1,sourcePoints:null},{teamId:'zero-b',rank:11,kills:0,booyah:0,sourcePoints:null},{teamId:'zero-a',rank:12,kills:0,booyah:0,sourcePoints:null}]}];
for(const rows of [matchStandings(ranking,ranking.matches[0]),standings(ranking),scoreSnapshot(ranking,'match','ranking').rows,scoreSnapshot(ranking,'total').rows]){
 assert.deepEqual(rows.map(r=>[r.teamId,r.position]),[['winner',1],['zero-a',2],['zero-b',2],['alpha',4],['bravo',5],['zulu',6]]);
 assert.ok(rows.every(r=>r.name===r.name.toUpperCase()));
}
const later=structuredClone(ranking.matches[0]);later.id='later';later.rows.push({teamId:'alpha',rank:12,kills:0,booyah:0,sourcePoints:null});ranking.matches.push(later);
assert.equal(standings(ranking).find(r=>r.teamId==='alpha').matches,1);
assert.equal(standings(ranking).find(r=>r.teamId==='alpha').position,2);
console.log('PASS: alphabetical unique ranks only for absentees; zero-point participants retain ties.');
