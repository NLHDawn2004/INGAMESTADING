import {z} from 'zod';
import {LIVE_SOURCE_BUDGET_MS} from './live-timing.ts';
import {placementScores,type ImportedMatch,type MatchCandidate} from './scoreboard.ts';
import {matchPlayerSchema,type MatchPlayer} from './player-leaders.ts';

const origin='https://matchstats.sea.ffesports.com';
export const matchIdSchema=z.string().trim().regex(/^\d{1,24}$/,'Match ID chỉ gồm chữ số, tối đa 24 ký tự.');
type JsonRecord=Record<string,unknown>;
function record(v:unknown):JsonRecord {if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Match Stats trả dữ liệu không đúng định dạng.');return v as JsonRecord;}
function integer(v:unknown,label:string,min=0,max=10000){if(typeof v!=='number'||!Number.isInteger(v)||v<min||v>max)throw new Error(`Dữ liệu ${label} không hợp lệ; chưa nhập điểm.`);return v;}
function sourcePlayerId(value:unknown):string|null{if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0?String(value):null;return typeof value==='string'&&/^\d{1,24}$/.test(value)?value:null;}
function normalizePlayers(teamRows:unknown[],expected:unknown):MatchPlayer[]{
 const players:MatchPlayer[]=[];
 for(const value of teamRows){const team=record(value);if(!Array.isArray(team.player_data))return [];for(const playerValue of team.player_data){const p=record(playerValue);if(typeof p.player_id==='number'&&(!Number.isSafeInteger(p.player_id)||p.player_id<0))return [];const parsed=matchPlayerSchema.safeParse({playerId:sourcePlayerId(p.player_id)||'',name:p.player_name,teamName:p.team_name||team.team_name,kills:p.kills,damage:p.damage});if(!parsed.success)return [];players.push(parsed.data);}}
 if(!players.length||new Set(players.map(p=>p.playerId)).size!==players.length||(typeof expected==='number'&&players.length!==expected))return [];
 return players;
}
export function normalizeMatch(id:string,payload:unknown):ImportedMatch {
 const root=record(payload);if(root.status!=='success')throw new Error('Match Stats chưa trả kết quả thành công.');const data=record(root.data);
 const infos=Array.isArray(data.match_info)?data.match_info.map(record):[];const info=infos.find(i=>i.match_id===id);if(!info)throw new Error('Không có kết quả đúng Match ID đã yêu cầu.');
 if(info.mode!==1)throw new Error('Trận này không phải Battle Royale. Module hiện tính bảng điểm BR.');
 const groups=Array.isArray(data.team_stats)?data.team_stats.map(record):[];const group=groups.find(g=>g.match_id===id);
 if(!group||!Array.isArray(group.team_stats)||!group.team_stats.length)throw new Error('Trận chưa có kết quả đội. Không nhập điểm chưa hoàn tất.');
 const rows=group.team_stats.map((value,index)=>{const r=record(value);integer(r.match_rank,'thứ hạng bảng',1,100);const kills=integer(r.kills,'kills');const booyah=integer(r.booyah,'BOOYAH',0,1);const sourcePlacement=typeof r.ranking_score==='number'?r.ranking_score:r.survival_score;const pointIndex=placementScores.findIndex(p=>p===sourcePlacement);if(pointIndex<0)throw new Error('Nguồn không có điểm thứ hạng phù hợp với luật của giải. Chưa nhập điểm để tránh nhầm hạng bảng với hạng về đích.');const rank=pointIndex+1;const rankUncertain=sourcePlacement===0;if((booyah===1)!==(rank===1))throw new Error('Kết quả BOOYAH và điểm hạng nguồn không khớp.');const teamId=typeof r.team_id==='number'&&Number.isSafeInteger(r.team_id)&&r.team_id>0?String(r.team_id):null;
  const players=Array.isArray(r.teammate_list)?r.teammate_list.map(v=>{if(typeof v==='string'&&/^\d{1,24}$/.test(v))return v;if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)return String(v);throw new Error('Định danh người chơi không hợp lệ.');}).sort():[];
  const externalKey=teamId?'garena:'+teamId:players.length?'roster:'+players.join('-'):`room:${id}:${index}`;
  const name=typeof r.team_name==='string'&&r.team_name.trim()?r.team_name.trim().slice(0,80):'Đội hạng '+rank;
  const sourcePoints=typeof r.total_score==='number'&&Number.isFinite(r.total_score)&&Math.abs(r.total_score)<=100000?r.total_score:null;
  return {externalKey,name,rank,kills,booyah,sourcePoints,rankVerified:true,rankUncertain};
 });
 if(new Set(rows.map(r=>r.externalKey)).size!==rows.length)throw new Error('Định danh đội nguồn bị trùng. Chưa nhập dữ liệu.');
 if(typeof info.number_of_team==='number'&&rows.length!==info.number_of_team)throw new Error('Kết quả chưa đủ số đội. Thử lại sau.');
 if(rows.filter(r=>r.booyah===1).length!==1)throw new Error('Chưa xác định được một đội BOOYAH. Chỉ nhập trận đã kết thúc.');
 return {id,name:typeof info.match_name==='string'?info.match_name.slice(0,120):'',rows:rows.sort((a,b)=>a.rank-b.rank),players:normalizePlayers(group.team_stats,info.number_of_player),source:'matchstats',startTime:0,endTime:0};
}
async function post(path:string,body:JsonRecord,timeoutMs=20000){
 try{
 const response=await fetch(origin+'/api/match_stats/'+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json','Origin':origin,'Referer':origin+'/'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs),redirect:'manual',cache:'no-store'});
 if(response.status>=300&&response.status<400)throw new Error('Match Stats chuyển hướng yêu cầu. Thử lại sau.');
 if(response.status===401||response.status===403)throw new Error('Match Stats yêu cầu quyền truy cập. Có thể nhập kết quả thủ công; không có điểm nào được tự cộng.');
 if(!response.ok)throw new Error('Match Stats chưa phản hồi ('+response.status+'). Thử lại sau.');
 const raw=await response.text();if(raw.length>10000000)throw new Error('Dữ liệu Match Stats quá lớn.');let json:unknown;try{json=JSON.parse(raw);}catch{throw new Error('Match Stats không trả JSON.');}const root=record(json);if(root.status!=='success')throw new Error(typeof root.msg==='string'?'Match Stats: '+root.msg:'Không lấy được dữ liệu Match Stats.');return root;
 }catch(error){if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))throw Error('Match Stats phản hồi chậm. Giữ số liệu hợp lệ gần nhất và thử lại.');throw error;}
}
export class AmbiguousMatchError extends Error {candidates:MatchCandidate[];constructor(candidates:MatchCandidate[]){super('Match ID có nhiều bản kết quả. Chọn đúng event trước khi lấy điểm.');this.candidates=candidates;}}
export async function fetchMatchStats(input:string,resultId?:number):Promise<ImportedMatch>{
 const id=matchIdSchema.parse(input);
 // Search type 1 accepts the full displayed Match ID. Type 2 resolves internal result IDs.
 const search=await post('search',{search_type:1,param:[id],field:'match',size:100,page:1,order_by:'-match_id',season_id:-1,event_id:-1});
 const data=record(search.data);const matches=Array.isArray(data.match_stats)?data.match_stats.map(record).filter(m=>m.match_id===id):[];
 const candidates:MatchCandidate[]=matches.map(m=>({recordId:integer(m.single_match_id,'mã kết quả',-1,Number.MAX_SAFE_INTEGER),seasonId:integer(m.season_id,'season',-1,Number.MAX_SAFE_INTEGER),eventId:integer(m.event_id,'event',-1,Number.MAX_SAFE_INTEGER),startTime:typeof m.start_time==='number'?m.start_time:0,endTime:typeof m.end_time==='number'?m.end_time:0,name:typeof m.match_name==='string'?m.match_name.slice(0,120):''}));
 const unique=[...new Map(candidates.map(c=>[c.recordId,c])).values()];
 if(!unique.length)throw new Error('Không tìm thấy Match ID này trên Match Stats. Kiểm tra ID hoặc chờ trận được cập nhật.');
 if(unique.length>1&&resultId===undefined)throw new AmbiguousMatchError(unique);
 const chosen=resultId===undefined?unique[0]:unique.find(c=>c.recordId===resultId);if(!chosen)throw new Error('Bản kết quả đã chọn không thuộc Match ID này.');
 const found=matches.find(m=>m.single_match_id===chosen.recordId)!;
 if(found.mode!==1)throw new Error('Chỉ nhập trận Battle Royale vào bảng điểm BR.');
 if(chosen.endTime<=0)throw new Error('Trận chưa kết thúc. Chưa thể nhập kết quả.');
 const result=normalizeMatch(id,await post('match_data',{match_ids:[id],single_match_id:[chosen.recordId]}));
 result.name=chosen.name;result.startTime=chosen.startTime;result.endTime=chosen.endTime;if(chosen.recordId>0)result.sourceRecordId=chosen.recordId;return result;
}

export type LivePlayerStats={id:string;name:string;endTime:number;expectedPlayers:number;players:MatchPlayer[];sourceRecordId:number;eventId:number;seasonId:number};
export function normalizeLivePlayers(id:string,payload:unknown){
 const root=record(payload);if(root.status!=='success')throw Error('Match Stats chưa trả thống kê tuyển thủ thành công.');
 const md=record(root.data);const info=Array.isArray(md.match_info)?md.match_info.map(record).find(x=>x.match_id===id):undefined;
 const group=Array.isArray(md.team_stats)?md.team_stats.map(record).find(x=>x.match_id===id):undefined;
 if(!info||!group||!Array.isArray(group.team_stats)||!group.team_stats.length)throw Error('Chưa có thống kê tuyển thủ đúng Match ID.');
 if(info.mode!==undefined&&info.mode!==1)throw Error('Thống kê không thuộc trận Battle Royale.');
 const expectedTeams=typeof info.number_of_team==='number'?integer(info.number_of_team,'số đội nguồn',0,1000):0;
 if(expectedTeams>0&&group.team_stats.length!==expectedTeams)throw Error('Dữ liệu nguồn chưa đủ đội. Giữ lần cập nhật hợp lệ gần nhất.');
 const players:MatchPlayer[]=[];const seen=new Set<string>();
 for(const rawTeam of group.team_stats){const team=record(rawTeam);if(!Array.isArray(team.player_data)||!team.player_data.length)throw Error('Nguồn còn thiếu thống kê tuyển thủ của một đội. Chưa cập nhật Top 5.');
  for(const rawPlayer of team.player_data){const p=record(rawPlayer);const parsed=matchPlayerSchema.safeParse({playerId:sourcePlayerId(p.player_id)||'',name:p.player_name,teamName:p.team_name||team.team_name,kills:p.kills,damage:p.damage});
   if(!parsed.success)throw Error('Nguồn có UID, ELIMS hoặc DAMAGE chưa hợp lệ. Chưa cập nhật Top 5.');
   if(seen.has(parsed.data.playerId))throw Error('Nguồn có player ID trùng. Chưa cập nhật Top 5.');seen.add(parsed.data.playerId);players.push(parsed.data);
  }
 }
 const expectedPlayers=typeof info.number_of_player==='number'?integer(info.number_of_player,'số tuyển thủ nguồn',0,1000):0;
 if(expectedPlayers>0&&players.length!==expectedPlayers)throw Error('Nguồn mới trả '+players.length+'/'+expectedPlayers+' tuyển thủ. Giữ lần cập nhật hợp lệ gần nhất.');
 return {players,expectedPlayers,name:typeof info.match_name==='string'?info.match_name.slice(0,120):''};
}
export async function fetchLivePlayerStats(input:string,resultId?:number):Promise<LivePlayerStats>{
 const id=matchIdSchema.parse(input);const deadline=performance.now()+LIVE_SOURCE_BUDGET_MS;
 const remaining=()=>{const time=Math.ceil(deadline-performance.now());if(time<=0)throw Error('Match Stats phản hồi chậm. Giữ số liệu hợp lệ gần nhất và thử lại.');return time;};
 const search=await post('search',{search_type:1,param:[id],field:'match',size:100,page:1,order_by:'-match_id',season_id:-1,event_id:-1},remaining());
 const data=record(search.data);const matches=Array.isArray(data.match_stats)?data.match_stats.map(record).filter(m=>m.match_id===id):[];
 const candidates:MatchCandidate[]=matches.map(m=>({recordId:integer(m.single_match_id,'mã kết quả',-1,Number.MAX_SAFE_INTEGER),seasonId:integer(m.season_id,'season',-1,Number.MAX_SAFE_INTEGER),eventId:integer(m.event_id,'event',-1,Number.MAX_SAFE_INTEGER),startTime:typeof m.start_time==='number'?m.start_time:0,endTime:typeof m.end_time==='number'?m.end_time:0,name:typeof m.match_name==='string'?m.match_name.slice(0,120):''}));
 const unique=[...new Map(candidates.map(c=>[c.recordId,c])).values()];
 if(!unique.length)throw new Error('Chưa tìm thấy trận trên Match Stats. Hãy kiểm tra Match ID hoặc kết nối lại sau.');
 if(unique.length>1&&resultId===undefined)throw new AmbiguousMatchError(unique);
 const chosen=resultId===undefined?unique[0]:unique.find(c=>c.recordId===resultId);if(!chosen)throw new Error('Bản kết quả đã chọn không thuộc Match ID này.');
 const found=matches.find(m=>m.single_match_id===chosen.recordId)!;if(found.mode!==1)throw new Error('Chỉ hỗ trợ trận Battle Royale.');
 const payload=await post('match_data',{match_ids:[id],single_match_id:[chosen.recordId]},remaining());remaining();
 const normalized=normalizeLivePlayers(id,payload);remaining();
 return {id,...normalized,name:normalized.name||chosen.name,endTime:chosen.endTime,sourceRecordId:chosen.recordId,eventId:chosen.eventId,seasonId:chosen.seasonId};
}
