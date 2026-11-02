import assert from 'node:assert/strict';
import {createGameLogState,consumeGameLogLine,gameLogSnapshot} from '../lib/live-board-gamelog.ts';
import {defaultLiveBoardSettings,livePacketSchema} from '../lib/live-board.ts';
const s=createGameLogState(),session=crypto.randomUUID();const settings={...defaultLiveBoardSettings(),followGame:false,matchId:'2115083590209026048',expectedTeams:2,rosterConfirmed:true};
const put=(f,text)=>consumeGameLogLine(s,'[2026-10-28 20:00:00.'+String(f).padStart(3,'0')+'][1]['+f+'] '+text);
put(0,'EventTypeEnterGame {"match_id":2115083590209026048,"group_mode":3}');put(1,'OnTeamScoreInited -> TeamName: A TeamID: 1');put(1,'OnTeamScoreInited -> TeamName: B TeamID: 2');
for(let i=1;i<=4;i++){put(1,'Player Join, 900'+i+', '+(100+i)+', A,False7');put(1,'Player Join, 800'+i+', '+(200+i)+', B,False8');}
const score=(f,a,b)=>{put(f,'OnTeamScoreChanged -> TeamID: 1 TeamScore: '+a);put(f,'OnTeamScoreChanged -> TeamID: 2 TeamScore: '+b);};
score(2,0,0);score(3,1,0);put(3,'Player 201 Dead, killed by 101');put(4,'Revive Player 201');score(5,2,0);put(5,'Player 201 Dead, killed by 101');put(6,'Revive Player 201');
assert.equal(s.groupToTeam.get(7),1);s.groupToTeam.set(8,2);
const packet=()=>{const r=gameLogSnapshot(s,settings,[],session,1);assert.ok(r.packet,r.message);return r.packet;};
put(7,"Player '202' Knock Down");assert.deepEqual(packet().teams[1].aliveStates,['alive','knocked','alive','alive']);assert.equal(packet().teams[1].aliveCount,4);assert.equal(packet().teams[0].elims,2);
put(8,'OnSyncAssistRescure: assistPlayer 101 isSuccess True');assert.equal(s.playerStates.get('202'),'knocked');put(9,'[UIModelSpectator] AddPlayer id202,nameAlias,gsTeam8');assert.equal(s.playerStates.get('202'),'knocked');
put(10,"Player '202' Get Up");assert.equal(packet().teams[1].aliveStates[1],'alive');put(11,'Player 202 Dead, killed by 101');put(12,"Teammate 202 Knock Down");assert.equal(packet().teams[1].aliveStates[1],'dead');assert.equal(packet().teams[1].aliveCount,3);put(13,'Revive Player 202');assert.equal(packet().teams[1].aliveStates[1],'alive');
put(14,"Player '999' Knock Down");put(15,'Player Join, 1000, 999, Late,False9');assert.equal(s.playerStates.get('999'),'knocked');
put(16,'Join Match Result, ERR_NONE');assert.equal(s.matchId,'2115083590209026048');put(17,'EventTypeEnterGame {"match_id":2115083590209026049,"group_mode":2}');assert.equal(s.players.size,0);assert.equal(s.playerStates.size,0);assert.equal(s.killEvents.length,0);assert.equal(s.playersPerTeam,2);
put(18,'OnReplayStarted');put(19,'EventTypeEnterGame {"match_id":123,"group_mode":3}');assert.equal(s.sourceReplay,true);
const bad=packetFromKnown();function packetFromKnown(){const base={sessionId:session,configId:settings.configId,sequence:2,matchId:settings.matchId,detectedMatchId:settings.matchId,source:'game-log',isReplay:false,capturedAt:Date.now(),expectedTeams:1,complete:true,teams:[{teamId:'1',teamName:'A',elims:0,aliveCount:4,aliveStates:['dead','dead','dead','dead']}]};return livePacketSchema.safeParse(base);}assert.equal(bad.success,false);
console.log('PASS: integrated Player Join roster, two-vote mapping, stable ALIVE bars, knock/get-up/death/revive, late roster, no friendly rescue inference, match reset, replay guard and contradictory ALIVE rejection.');
