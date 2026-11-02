import {standings,type Scoreboards,type RegisteredTeam} from './scoreboard.ts';
import {teamForName} from './team-identity.ts';
import type {LiveTeam} from './live-board.ts';
export type LiveTotalRow={teamId:string;name:string;abbreviation?:string;total:number;crown?:'silver'|'gold'};
export type LiveTotalSource={id:string;name:string;rows:LiveTotalRow[]};
export function liveTotalSources(scores:Scoreboards,teams:RegisteredTeam[]):LiveTotalSource[]{
 return scores.boards.map(board=>{const totals=new Map(standings(board).map(row=>[row.teamId,row]));return {id:board.id,name:board.name,rows:board.teams.map(team=>{const registered=teams.find(t=>t.id===team.id)??teamForName(team.name,teams);return {teamId:team.id,name:team.name,abbreviation:registered?.abbreviation,total:totals.get(team.id)?.total??0,...(totals.get(team.id)?.crown?{crown:totals.get(team.id)!.crown}:{})};})};});
}
export function liveTotalRow(row:Pick<LiveTeam,'teamName'>,rows:LiveTotalRow[]|null|undefined,teams:RegisteredTeam[]):LiveTotalRow|null{
 if(!rows)return null;
 const registered=teamForName(row.teamName,teams);
 const base=(registered?rows.find(r=>r.teamId===registered.id):undefined)??teamForName(row.teamName,rows.map(r=>({...r,id:r.teamId})));
 return base??null;
}
export function liveTotal(row:Pick<LiveTeam,'teamName'|'elims'>,rows:LiveTotalRow[]|null|undefined,teams:RegisteredTeam[]):number|null{
 const base=liveTotalRow(row,rows,teams);
 return base?base.total+(row.elims??0):null;
}
