import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGameLogState,consumeGameLogLine,gameLogSnapshot} from '../lib/live-board-gamelog.ts';
import {defaultLiveBoardSettings} from '../lib/live-board.ts';
const settings={...defaultLiveBoardSettings(),followGame:false,mode:'live',matchId:'2115083590209026048',expectedTeams:11,rosterConfirmed:true};
const actual=createGameLogState();
for(const line of readFileSync(new URL('./fixtures/live-match4-reference.log',import.meta.url),'utf8').split(/\r?\n/))consumeGameLogLine(actual,line);
const result=gameLogSnapshot(actual,settings,[],crypto.randomUUID(),1);assert.ok(result.packet,result.message);
// Ground truth: game window captured at 21:17:11 on 27 October, with 9 teams / 31 players alive.
const expected=[['Ti\u1ebfn',7,0],['FEAR',5,4],['nct',4,0],['PH\u01af\u01a0NG S\u1ec6T',5,4],['FD ESP',5,1],['f168',3,4],['PQ ACADEMY',5,4],['WAGA ESP',5,4],['AA',10,4],['AWK',4,4],['TD ESP',7,2]];
assert.deepEqual(result.packet.teams.map(t=>[t.teamName,t.elims,t.aliveCount]),expected);
assert.equal(actual.scores.get(2),8,'raw TeamScore is known to disagree with actual ELIMS');
assert.equal(result.packet.remainingPlayers,31);assert.equal(result.packet.remainingTeams,9);
assert.equal(actual.groupToTeam.size,11);assert.equal(new Set(actual.groupToTeam.values()).size,11);
const s=createGameLogState();const line=(frame,ms,text)=>`[2026-10-27 12:00:${String(frame).padStart(2,'0')}.${String(ms).padStart(3,'0')}][1][${frame}] ${text}`;
const put=(frame,ms,text)=>consumeGameLogLine(s,line(frame,ms,text));
put(0,0,'EventTypeEnterGame {"match_id":42,"group_mode":3}');
put(0,1,'OnTeamScoreInited -> TeamName: A TeamID: 1');put(0,2,'OnTeamScoreInited -> TeamName: B TeamID: 2');
for(let i=1;i<=4;i++){put(0,3,`[UIModelSpectator] AddPlayer id${100+i},nameP,gsTeam7`);put(0,3,`[UIModelSpectator] AddPlayer id${200+i},nameP,gsTeam8`);}
const score=(frame,a,b)=>{put(frame,0,`OnTeamScoreChanged -> TeamID: 1 TeamScore: ${a}`);put(frame,1,'unrelated UI message in same frame');put(frame,2,`OnTeamScoreChanged -> TeamID: 2 TeamScore: ${b}`);};
score(1,0,0);assert.equal(s.scores.size,2,'one frame may span multiple milliseconds and UI lines');
score(2,1,0);put(2,3,'Player 201 Dead, killed by 101');assert.equal(s.groupToTeam.size,0,'one vote is not enough');put(3,0,'Revive Player 201');
score(4,2,0);put(4,3,'Player 201 Dead, killed by 101');put(4,4,'Player 201 Dead, killed by 101');assert.equal(s.killEvents.length,2,'duplicate death is not another kill');
score(5,2,1);put(5,3,'Player 101 Dead, killed by 202');put(6,0,'Revive Player 101');score(7,2,2);put(7,3,'Player 101 Dead, killed by 202');
assert.deepEqual([...s.groupToTeam],[[7,1],[8,2]]);
put(8,0,'RemovePlayer 102');assert.equal(s.players.get('102').alive,true,'spectator removal is not death');
score(9,2,99);put(10,0,'Player 202 Dead, killed by 102');assert.ok(!s.mappingVotes.get(7).has(2),'a later death cannot inherit another frame scoring team');
put(11,0,'Player 103 Dead, killed by 104');
const synthetic=gameLogSnapshot(s,{...settings,matchId:'42',expectedTeams:2},[],crypto.randomUUID(),1);assert.ok(synthetic.packet,synthetic.message);
assert.deepEqual(synthetic.packet.teams.map(t=>t.elims),[3,2],'ignore friendly kills, duplicates and phantom TeamScore');
put(12,0,'EventTypeEnterGame {"match_id":43,"group_mode":3}');assert.equal(s.teams.size,0);assert.equal(s.killEvents.length,0);assert.equal(s.mappingVotes.size,0);assert.equal(s.deadPlayers.size,0);
put(13,0,'Player 901 Dead, killed by 902');put(13,1,'[UIModelSpectator] AddPlayer id901,nameP,gsTeam9');assert.equal(s.players.get('901').alive,false,'late roster cannot resurrect a dead player');
s.killCoverageComplete=false;const incomplete=gameLogSnapshot(s,{...settings,matchId:'43',expectedTeams:1},[],crypto.randomUUID(),1);assert.equal(incomplete.packet,null);
assert.ok(result.packet.capturedAt>Date.now()-2000);assert.ok(result.packet.sourceEventAt);
const partial=createGameLogState();const send=(frame,ms,text)=>consumeGameLogLine(partial,line(frame,ms,text));send(0,0,'EventTypeEnterGame {"match_id":44,"group_mode":3}');send(0,1,'OnTeamScoreInited -> TeamName: A TeamID: 1');send(0,2,'OnTeamScoreInited -> TeamName: B TeamID: 2');for(let i=1;i<=4;i++){send(0,3,'[UIModelSpectator] AddPlayer id'+(100+i)+',nameP,gsTeam7');send(0,3,'[UIModelSpectator] AddPlayer id'+(200+i)+',nameP,gsTeam8');}const scores=(frame,a,b)=>{send(frame,0,'OnTeamScoreChanged -> TeamID: 1 TeamScore: '+a);send(frame,1,'OnTeamScoreChanged -> TeamID: 2 TeamScore: '+b);};scores(1,5,5);scores(2,6,5);send(2,2,'Player 201 Dead, killed by 101');send(3,0,'Revive Player 201');scores(4,7,5);send(4,2,'Player 201 Dead, killed by 101');assert.equal(partial.groupToTeam.get(7),1);const midGame=gameLogSnapshot(partial,{...settings,matchId:'44',expectedTeams:2},[],crypto.randomUUID(),1);assert.ok(midGame.packet);assert.equal(midGame.packet.teams[0].elims,null,'joining midway must not publish only the observed two kills');
function seededRoom(opening){const room=createGameLogState();const send=(frame,ms,text)=>consumeGameLogLine(room,line(frame,ms,text));send(0,0,'EventTypeEnterGame {"match_id":55,"group_mode":3}');send(0,1,'OnTeamScoreInited -> TeamName: A TeamID: 1');send(0,2,'OnTeamScoreInited -> TeamName: B TeamID: 2');for(let i=1;i<=4;i++){send(0,3,'[UIModelSpectator] AddPlayer id'+(100+i)+',nameP,gsTeam7');send(0,3,'[UIModelSpectator] AddPlayer id'+(200+i)+',nameP,gsTeam8');}if(opening)send(1,0,'@zwj TeamFlightMoveAnimSync MarkState state:StartSkyDrivingFromLevel, startTime:8.3, startFrame:10, trigger:StateB, playerCount:1');send(2,0,'OnTeamScoreChanged -> TeamID: 1 TeamScore: 8');send(2,1,'OnTeamScoreChanged -> TeamID: 2 TeamScore: 12');return room;}
const seeded=seededRoom(true);assert.ok(seeded.killCoverageComplete);const seededPacket=gameLogSnapshot(seeded,{...settings,matchId:'55',expectedTeams:2},[],crypto.randomUUID(),1).packet;assert.deepEqual(seededPacket.teams.map(t=>t.elims),[0,0]);assert.deepEqual(seededPacket.teams.map(t=>t.aliveCount),[4,4]);const joinedLate=seededRoom(false);consumeGameLogLine(joinedLate,'[2026-10-27 12:02:00.000][1][99] @zwj TeamFlightMoveAnimSync MarkState state:StartSkyDrivingFromLevel, startTime:8.3');assert.equal(joinedLate.killCoverageComplete,false);assert.equal(joinedLate.openingFlightSeen,false);consumeGameLogLine(seeded,line(3,0,'Player 201 Dead, killed by 999'));assert.ok(gameLogSnapshot(seeded,{...settings,matchId:'55',expectedTeams:2},[],crypto.randomUUID(),2).packet.teams.every(t=>t.elims===null),'unknown killer must not create a false zero');
console.log('PASS: all 11 actual match-4 ELIMS and ALIVE values match game screenshot; frame batching, two-vote bijection, enemy kill ledger, duplicate/friendly death, spectator removal, unknown roster, match reset and source timestamps.');
