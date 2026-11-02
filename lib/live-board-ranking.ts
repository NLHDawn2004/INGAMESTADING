import type {LiveTeam} from './live-board';
import {liveTotal,type LiveTotalRow} from './live-total';

type Team={id:string;name:string;abbreviation?:string;logo:string};
// Presentation only: reuse the existing total calculation without changing packets.
export function rankLiveTeams(rows:LiveTeam[],totals:LiveTotalRow[]|null,teams:Team[]){
 return rows.map((row,index)=>({row,index,total:liveTotal(row,totals,teams)})).sort((a,b)=>{
  if(a.total!==null&&b.total!==null)return b.total-a.total||a.index-b.index;
  if(a.total!==null)return -1;
  if(b.total!==null)return 1;
  return (b.row.elims??0)-(a.row.elims??0)||a.index-b.index;
 }).map(item=>item.row);
}
