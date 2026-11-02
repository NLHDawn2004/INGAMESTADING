import {updateLife,aggregateLife} from './live-status.ts';
import {livePacketSchema,type LiveBoardSettings,type LivePacket} from './live-board.ts';
import {sourceSettings,sourceRoster,followsGame} from './live-board-auto.ts';
import {teamNameKey} from './team-identity.ts';

type PlayerStatus='alive'|'knocked'|'dead';
type TeamPlayer={group:number;alive:boolean;uid?:string};
type ScoreGroup={key:string;at:string;frame:string|null;values:Map<number,number>};
type KillEvent={victim:string;killer:string;scoreTeam?:number|null};
export type GameLogState={lifeTracker:import('./live-status.ts').LifeTracker|undefined;authoritativeGroups:Map<number,number>;rosterMatchId:string|null;teams:Map<number,string>;scores:Map<number,number>;previousScores:Map<number,number>;players:Map<string,TeamPlayer>;playerStates:Map<string,PlayerStatus>;groupToTeam:Map<number,number>;mappingVotes:Map<number,Map<number,number>>;currentGroup:ScoreGroup|null;pendingScoringTeam:number|null;pendingScoringAt:number;pendingScoringFrame:string|null;killEvents:KillEvent[];killCoverageComplete:boolean;initialScoreTotal:number|null;deadPlayers:Set<string>;playersPerTeam:number|null;matchStartedAt:number|null;sourceReplay:boolean;openingFlightSeen:boolean;matchId:string|null;sampleAt:number;teamInitAt:number;dirty:boolean;diagnostic:string};
export function createGameLogState():GameLogState{return {lifeTracker:undefined,authoritativeGroups:new Map(),rosterMatchId:null,teams:new Map(),scores:new Map(),previousScores:new Map(),players:new Map(),playerStates:new Map(),groupToTeam:new Map(),mappingVotes:new Map(),currentGroup:null,pendingScoringTeam:null,pendingScoringAt:0,pendingScoringFrame:null,killEvents:[],killCoverageComplete:false,initialScoreTotal:null,deadPlayers:new Set(),playersPerTeam:null,matchStartedAt:null,sourceReplay:false,openingFlightSeen:false,matchId:null,sampleAt:0,teamInitAt:0,dirty:false,diagnostic:'Ch\u1edd log tr\u1eadn c\u1ee7a Free Fire.'};}
function eventTime(line:string){const m=line.match(/^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d(?:\.\d+)?)\]/);return m?Date.parse(m[1].replace(' ','T')):0;}
function frameKey(line:string){const m=line.match(/^\[([^\]]+)\]\[(\d+)\]\[(\d+)\]/);return m?m[1].slice(0,10)+':'+m[2]+':'+m[3]:null;}
function resetMatch(s:GameLogState){Object.assign(s,createGameLogState());}
function refreshMappings(s:GameLogState){
 s.groupToTeam.clear();
 const candidates=[...s.mappingVotes].flatMap(([group,votes])=>{const sorted=[...votes].sort((a,b)=>b[1]-a[1]);return sorted[0]&&sorted[0][1]>=2&&sorted[0][1]>(sorted[1]?.[1]??0)?[{group,team:sorted[0][0],votes:sorted[0][1]}]:[];});
 for(const candidate of candidates){const rivals=candidates.filter(c=>c.team===candidate.team&&c.group!==candidate.group);if(rivals.every(c=>c.votes<candidate.votes))s.groupToTeam.set(candidate.group,candidate.team);}
}
function verifyCoverage(s:GameLogState){
 if(s.killCoverageComplete||s.initialScoreTotal===null||!s.teams.size)return;
 const groupSizes=new Map<number,number>();for(const player of s.players.values())groupSizes.set(player.group,(groupSizes.get(player.group)||0)+1);
 if(groupSizes.size!==s.teams.size||![...groupSizes.values()].every(size=>size>=1&&size<=(s.playersPerTeam??4)))return;
 if(s.openingFlightSeen){s.killCoverageComplete=true;return;}
 if([...s.scores.values()].reduce((sum,value)=>sum+value,0)!==s.initialScoreTotal)return;
 let kills=0;for(const event of s.killEvents){const victim=s.players.get(event.victim),killer=s.players.get(event.killer);if(event.killer==='0')continue;if(!victim||!killer)return;if(victim.group!==killer.group)kills++;}
 if(kills===s.initialScoreTotal)s.killCoverageComplete=true;
}
function flushScores(s:GameLogState){const g=s.currentGroup;if(!g)return;s.currentGroup=null;if(!s.teams.size||g.values.size!==s.teams.size||![...s.teams.keys()].every(id=>g.values.has(id)))return;
 if(!s.previousScores.size)s.initialScoreTotal=[...g.values.values()].reduce((sum,value)=>sum+value,0);
 const changed=[...g.values].filter(([id,value])=>value-(s.previousScores.get(id)??value)===1);
 const allChanged=[...g.values].filter(([id,value])=>value!==(s.previousScores.get(id)??value));
 s.pendingScoringTeam=changed.length===1&&allChanged.length===1?changed[0][0]:null;s.pendingScoringAt=eventTime('['+g.at+']');s.pendingScoringFrame=g.frame;
 s.previousScores=new Map(g.values);s.scores=new Map(g.values);verifyCoverage(s);s.sampleAt=eventTime('['+g.at+']');s.dirty=true;
}
export function consumeGameLogLine(s:GameLogState,line:string){
 if(!line)return false;const at=eventTime(line),frame=frameKey(line);let flushed=false;
 const score=line.match(/^\[([^\]]+)\].*OnTeamScoreChanged -> TeamID: (\d+) TeamScore: (\d+)/);
 if(score){const key=frame||score[1];if(s.currentGroup&&(s.currentGroup.key!==key||s.currentGroup.values.has(+score[2])))flushScores(s);if(!s.currentGroup)s.currentGroup={key,at:score[1],frame,values:new Map()};s.currentGroup.values.set(+score[2],+score[3]);if(s.teams.size&&s.currentGroup.values.size===s.teams.size){flushScores(s);return true;}return false;}
 if(s.currentGroup&&(!frame||frame!==s.currentGroup.frame)){const before=s.scores;flushScores(s);flushed=s.scores!==before;}
 if(/\bOnReplayStarted\b/.test(line)){resetMatch(s);s.sourceReplay=true;s.diagnostic='Replay b\u1eaft \u0111\u1ea7u; \u0111ang \u0111\u1ecdc team t\u1eeb log.';return true;}
 const enter=line.match(/EventTypeEnterGame\s+(\{.*\})/);if(enter){const id=enter[1].match(/"match_id"\s*:\s*"?(\d{1,24})/);if(id&&s.matchId!==id[1]){const replay=s.sourceReplay&&!s.matchId;resetMatch(s);s.sourceReplay=replay;s.matchId=id[1];s.matchStartedAt=at||null;const mode=enter[1].match(/"group_mode"\s*:\s*(\d+)/)?.[1];s.playersPerTeam=mode==='3'?4:mode==='2'?2:mode==='1'?1:null;s.diagnostic='\u0110\u00e3 nh\u1eadn Match ID t\u1eeb Player.log.';return true;}}
 const flight=line.match(/TeamFlightMoveAnimSync MarkState state:StartSkyDrivingFromLevel, startTime:([\d.]+)/);
 if(flight&&!s.sourceReplay&&!s.killEvents.length&&s.matchStartedAt&&at>=s.matchStartedAt&&at-s.matchStartedAt<=60000&&Number(flight[1])>=0&&Number(flight[1])<=45){s.openingFlightSeen=true;verifyCoverage(s);return true;}
 const init=line.match(/OnTeamScoreInited -> TeamName: (.*?) TeamID: (\d+)\s*$/);if(init){if(!s.teams.size)s.teamInitAt=at;const id=+init[2],old=s.teams.get(id);if(old&&old!==init[1].trim()){s.diagnostic='T\u00ean team thay \u0111\u1ed5i trong c\u00f9ng phi\u00ean; c\u1ea7n x\u00e1c minh tr\u1eadn.';return true;}s.teams.set(id,init[1].trim());return true;}
 const join=line.match(/\bPlayer Join,\s*(\d+),\s*(\d+),\s*(.*),(?:False|True)(\d+)\s*$/);
 const player=line.match(/\[UIModelSpectator\] AddPlayer id(\d+),name(.*),gsTeam(\d+)\s*$/)||(join?['',join[2],join[3],join[4]]:null);if(player){s.players.set(player[1],{group:+player[3],alive:!s.deadPlayers.has(player[1]),uid:join?join[1]:s.players.get(player[1])?.uid});verifyCoverage(s);return true;}
 const knock=line.match(/\bPlayer '(\d+)' Knock Down\b/)||line.match(/\bTeammate (\d+) Knock Down\b/);
 if(knock){const id=knock[1];if(!s.deadPlayers.has(id)){updateLife(s,'knock',id,at,(line.includes('Teammate ')?'secondary:':'primary:')+(frame||String(at)));s.playerStates.set(id,'knocked');const p=s.players.get(id);if(p)p.alive=true;s.sampleAt=at||s.sampleAt;s.dirty=true;}return true;}
 const getUp=line.match(/\bPlayer '(\d+)' (?:Get Up|Stand Up|Recovered)\b/)||line.match(/\bTeammate (\d+) (?:Get Up|Stand Up|Recovered)\b/);
 if(getUp){const id=getUp[1];if(!s.deadPlayers.has(id)){updateLife(s,'recover',id,at,frame||String(at));s.playerStates.set(id,'alive');const p=s.players.get(id);if(p)p.alive=true;s.sampleAt=at||s.sampleAt;s.dirty=true;}return true;}
 // Rescue completion is reported on the helper. Track possible recipients
 // inside the team so two downed members and one rescue display one orange bar.
 const rescue=line.match(/LogPlayerReplayEvent Player:(\d+) Event:4\s*$/);
 if(rescue){const changed=updateLife(s,'rescue',rescue[1],at,(frame||String(at))+':'+rescue[1]);if(changed){s.sampleAt=at||s.sampleAt;s.dirty=true;}return changed;}
 const dead=line.match(/Player (\d+) Dead, killed by (\d+)/);if(dead){const id=dead[1],killer=dead[2],victim=s.players.get(id),attacker=s.players.get(killer);const duplicate=s.deadPlayers.has(id);updateLife(s,'death',id,at,frame||String(at));s.deadPlayers.add(id);s.playerStates.set(id,'dead');if(victim)victim.alive=false;
  if(!duplicate){const elapsed=at-s.pendingScoringAt;const sameEvent=frame&&s.pendingScoringFrame?frame===s.pendingScoringFrame:elapsed>=0&&elapsed<=500;
   // A unique complete scoreboard change and enemy death identify this kill's
   // scoring team immediately; roster identity still requires two mapping votes.
   s.killEvents.push({victim:id,killer,scoreTeam:sameEvent?s.pendingScoringTeam:null});
   if(attacker&&victim&&attacker.group!==victim.group&&s.pendingScoringTeam!==null&&sameEvent){const votes=s.mappingVotes.get(attacker.group)||new Map<number,number>();votes.set(s.pendingScoringTeam,(votes.get(s.pendingScoringTeam)||0)+1);s.mappingVotes.set(attacker.group,votes);refreshMappings(s);}
  }
  s.pendingScoringTeam=null;verifyCoverage(s);s.sampleAt=at||s.sampleAt;s.dirty=true;return true;}
 const revive=line.match(/Revive Player (\d+)/);if(revive){updateLife(s,'recover',revive[1],at,frame||String(at));s.deadPlayers.delete(revive[1]);s.playerStates.set(revive[1],'alive');const old=s.players.get(revive[1]);if(old)old.alive=true;s.sampleAt=at||s.sampleAt;s.dirty=true;return true;}
 // Stream-out / spectator UI removal is not proof that a player was eliminated.
 return flushed;
}
export function gameLogSnapshot(s:GameLogState,settings:LiveBoardSettings,registered:Array<{id:string;name:string;abbreviation?:string}>,sessionId:string,sequence:number,now=Date.now(),requireUidIdentity=false):{packet:LivePacket|null;diagnostic:object;message:string}{
 const automatic=followsGame(settings),selection=sourceSettings(s,settings);if(selection)settings=selection;
 const errors:string[]=[];if(automatic&&!selection)errors.push('Chờ client ghi đủ roster và scoreboard của trận.');if(!s.teams.size||s.scores.size!==s.teams.size)errors.push('Ch\u01b0a c\u00f3 snapshot TeamScore \u0111\u1ea7y \u0111\u1ee7.');if(s.teams.size!==settings.expectedTeams)errors.push('Log c\u00f3 '+s.teams.size+'/'+settings.expectedTeams+' team; ki\u1ec3m tra l\u1ea1i s\u1ed1 \u0111\u1ed9i.');if(!settings.rosterConfirmed)errors.push('Ch\u01b0a x\u00e1c nh\u1eadn t\u1ed5ng s\u1ed1 team.');if(!settings.matchId)errors.push('Ch\u01b0a ch\u1ecdn Match ID.');if(settings.mode==='live'&&s.matchId!==settings.matchId)errors.push('Match ID trong Player.log kh\u00e1c tr\u1eadn \u0111ang ch\u1ecdn.');
 const identity=requireUidIdentity?s.authoritativeGroups:s.groupToTeam;
 const identityReady=!requireUidIdentity||(s.rosterMatchId===s.matchId&&identity.size===s.teams.size);if(!identityReady)errors.push('Chờ xác minh UID/tên đội của đúng trận; không dùng ghép suy luận để phát số liệu.');
 const kills=new Map<number,number>(),incomplete=new Set<number>();let unknownKiller=false;
 for(const event of s.killEvents){const victim=s.players.get(event.victim),killer=s.players.get(event.killer);if(!killer){if(event.killer!=='0')unknownKiller=true;continue;}if(!victim){incomplete.add(killer.group);continue;}if(killer.group!==victim.group)kills.set(killer.group,(kills.get(killer.group)||0)+1);}
 const eventTeamKills=new Map<number,number>();let unresolvedEventTeam=false;
 for(const event of s.killEvents){const victim=s.players.get(event.victim),killer=s.players.get(event.killer);if(event.killer==='0'||event.killer===event.victim)continue;if(!victim||!killer){unresolvedEventTeam=true;continue;}if(victim.group===killer.group)continue;
  const team=identity.get(killer.group)??(requireUidIdentity?null:event.scoreTeam);if(team===undefined||team===null||!s.teams.has(team)){unresolvedEventTeam=true;continue;}eventTeamKills.set(team,(eventTeamKills.get(team)||0)+1);
 }
 const noKills=s.killCoverageComplete&&s.killEvents.length===0&&s.players.size>0&&[...s.scores.values()].every(value=>value===0);
 const allGroups=[...new Set([...s.players.values()].map(p=>p.group))];const unmapped=sourceRoster(s)?allGroups.filter(group=>!identity.has(group)):[];
 const common=(values:number[]):number|null=>values.length&&values.every(v=>v===values[0])?values[0]:null;
 const commonElims=!unknownKiller&&!unmapped.some(group=>incomplete.has(group))?common(unmapped.map(group=>kills.get(group)||0)):null;
 const commonAlive=common(unmapped.map(group=>[...s.players.values()].filter(p=>p.group===group&&p.alive).length));
 const rows=[...s.teams].map(([teamId,teamName])=>{
  const matches=registered.filter(t=>[t.name,t.abbreviation||''].some(n=>n&&teamNameKey(n)===teamNameKey(teamName)));if(matches.length>1)errors.push('T\u00ean team tr\u00f9ng danh s\u00e1ch: '+teamName);
  const groups=[...identity].filter(([,id])=>id===teamId).map(([group])=>group),group=groups.length===1?groups[0]:undefined;
  const members=group===undefined?[]:[...s.players].filter(([,p])=>p.group===group).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));
  const roster=members.map(([,p])=>p);
  const capacity=s.playersPerTeam??4;
  const tracked=group===undefined?null:aggregateLife(s,group,members,capacity);
  const aliveStates=tracked??(group===undefined?null:Array.from({length:capacity},(_,i)=>{const member=members[i];if(!member)return 'unknown' as const;return s.playerStates.get(member[0])??(s.killCoverageComplete?(member[1].alive?'alive':'dead'):'unknown');}));
  const rosterComplete=roster.length>0&&(s.playersPerTeam===null||roster.length<=s.playersPerTeam);
  const aliveCount=rosterComplete?roster.filter(p=>p.alive).length:group===undefined?commonAlive:null;
  const elims=s.killCoverageComplete&&!unknownKiller?(group!==undefined&&!incomplete.has(group)?kills.get(group)||0:group===undefined?(!unresolvedEventTeam?eventTeamKills.get(teamId)||0:commonElims):null):noKills?0:null;
  return {teamId:String(teamId),teamName,slot:null,elims,aliveCount,aliveStates,damage:null,placement:null};
 });
 const allAliveKnown=rows.every(r=>r.aliveCount!==null);const remainingPlayers=allAliveKnown?rows.reduce((n,r)=>n+(r.aliveCount||0),0):null;const remainingTeams=allAliveKnown?rows.filter(r=>(r.aliveCount||0)>0).length:null;
 const diagnostic={teamCount:s.teams.size,scoreCount:s.scores.size,playerCount:s.players.size,groupMappingCount:identity.size,rosterIdentity:requireUidIdentity?(identityReady?'uid-verified':'pending'):'legacy-inferred',teamNames:rows.map(r=>r.teamName),rows,rawTeamScores:[...s.scores].map(([teamId,score])=>({teamId,score})),elimsMethod:'enemy-death-events',elimsCoverage:s.killCoverageComplete?(s.openingFlightSeen?'observed-opening-flight':'first-scoreboard-matches-observed-kills'):'missing-start',killEventCount:s.killEvents.length,detectedMatchId:s.matchId,sourceReplay:s.sourceReplay,source:'player-log',sourceEventAt:s.sampleAt,sourceEventAgeMs:s.sampleAt?Math.max(0,now-s.sampleAt):null,errors:errors.slice(0,10)};
 if(errors.length)return {packet:null,diagnostic,message:errors.slice(0,3).join(' ')};
 const packet=livePacketSchema.safeParse({sessionId,configId:settings.configId,sequence,matchId:settings.matchId,detectedMatchId:s.matchId,source:'game-log',isReplay:settings.mode==='replay',capturedAt:now,sourceEventAt:s.sampleAt||null,matchStartedAt:s.matchStartedAt,rosterProof:sourceRoster(s),captureSpanMs:0,expectedTeams:settings.expectedTeams,complete:true,teams:rows,remainingTeams,remainingPlayers});
 return packet.success?{packet:packet.data,diagnostic,message:''}:{packet:null,diagnostic,message:packet.error.issues.map(x=>x.message).join(' ').slice(0,500)};
}
