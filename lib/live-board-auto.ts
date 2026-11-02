import {type LiveBoardSettings,type LivePacket} from './live-board.ts';
import type {GameLogState} from './live-board-gamelog.ts';

export function followsGame(settings:LiveBoardSettings){return settings.followGame&&settings.adapter==='game-log'&&settings.mode==='live';}
export function sourceRoster(state:GameLogState){
 if(!state.matchId||!state.matchStartedAt||state.sourceReplay||!state.teams.size||state.scores.size!==state.teams.size||![...state.teams.keys()].every(id=>state.scores.has(id))||!state.playersPerTeam)return null;
 const groups=new Map<number,number>();for(const player of state.players.values())groups.set(player.group,(groups.get(player.group)||0)+1);
 if(groups.size!==state.teams.size||[...groups.values()].some(size=>size<1||size>state.playersPerTeam!))return null;
 return {capacity:state.playersPerTeam,groups:[...groups].map(([groupId,count])=>({groupId,count}))};
}
export function sourceSettings(state:GameLogState,settings:LiveBoardSettings):LiveBoardSettings|null{
 if(!followsGame(settings))return settings;
 if(!sourceRoster(state))return null;
 return {...settings,matchId:state.matchId!,expectedTeams:state.teams.size,rosterConfirmed:true};
}
export function displaySettings(settings:LiveBoardSettings,packet:LivePacket|null):LiveBoardSettings{
 return followsGame(settings)?{...settings,matchId:packet?.matchId||'',expectedTeams:packet?.expectedTeams||settings.expectedTeams,rosterConfirmed:!!packet}:settings;
}
