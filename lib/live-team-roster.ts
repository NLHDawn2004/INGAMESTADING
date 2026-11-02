import {teamNameKey} from './team-identity.ts';
import type {GameLogState} from './live-board-gamelog.ts';
type Player={playerId:string;teamName:string};
// Identity only: no score, ALIVE or rescue values are imported from historical results.
export function applyUidRoster(state:GameLogState,matchId:string,players:Player[]){
 if(state.matchId!==matchId)return {verified:false,message:'Roster khác trận đang chạy.'};
 state.authoritativeGroups.clear();state.rosterMatchId=null;
 const names=new Map<string,number[]>();for(const [id,name]of state.teams){const key=teamNameKey(name);names.set(key,[...(names.get(key)||[]),id]);}
 const uidToName=new Map<string,string>();for(const p of players){if(!/^\d{1,24}$/.test(p.playerId)||uidToName.has(p.playerId))return {verified:false,message:'Roster UID không duy nhất.'};uidToName.set(p.playerId,teamNameKey(p.teamName));}
 const byGroup=new Map<number,Set<number>>();
 for(const player of state.players.values()){
  const name=player.uid?uidToName.get(player.uid):undefined,ids=name?names.get(name):undefined;
  if(!ids||ids.length!==1)return {verified:false,message:'Chờ UID/tên đội khớp đủ roster của trận.'};
  const idsInGroup=byGroup.get(player.group)||new Set<number>();idsInGroup.add(ids[0]);byGroup.set(player.group,idsInGroup);
 }
 if(byGroup.size!==state.teams.size||[...byGroup.values()].some(ids=>ids.size!==1))return {verified:false,message:'Roster đội chưa đủ hoặc mâu thuẫn UID.'};
 const pairs=[...byGroup].map(([group,ids])=>[group,[...ids][0]] as const);
 if(new Set(pairs.map(([,id])=>id)).size!==state.teams.size)return {verified:false,message:'UID đang trỏ trùng đội.'};
 state.authoritativeGroups=new Map(pairs);state.rosterMatchId=matchId;
 return {verified:true,message:'Đã xác minh '+pairs.length+' đội bằng UID và tên đội của đúng trận.'};
}
