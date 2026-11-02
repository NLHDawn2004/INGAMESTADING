import {scheduleDesignSchema} from './overlay-layout.ts';
import {createId} from './client-id.ts';
import {z} from 'zod';
import {teamLogoSchema} from './team-assets.ts';
import {teamForName} from './team-identity.ts';
import {typographySchema} from './typography.ts';
import {scoreTemplateSchema} from './score-template.ts';
import type {MatchPlayer} from './player-leaders.ts';
export type RegisteredTeam={id:string;name:string;logo:string;abbreviation?:string};

const id=z.string().min(1).max(80);
const name=z.string().trim().min(1).max(80);
const count=z.number().int().min(0).max(10000);
const points=z.number().min(-100000).max(100000);
const rushThreshold=z.number().int().min(0).max(100000).optional();
export const scoreResultSchema=z.object({teamId:id,rank:z.number().int().min(1).max(100),kills:count,booyah:z.number().int().min(0).max(1),sourcePoints:points.nullable(),placementPoints:z.number().nonnegative().optional(),matchPoints:z.number().nonnegative().optional(),rankVerified:z.boolean().optional(),rankUncertain:z.boolean().optional()});
export const scoreMatchSchema=z.object({id,stageId:id,name:z.string().max(120),source:z.enum(['matchstats','manual']),sourceRecordId:z.number().int().positive().optional(),enabled:z.boolean(),importedAt:z.number().int().nonnegative(),rows:z.array(scoreResultSchema).min(1).max(100)}).superRefine((m,c)=>{if(m.rows.filter(r=>r.booyah===1).length!==1)c.addIssue({code:'custom',message:'Một trận cần đúng một đội BOOYAH.'});if(new Set(m.rows.map(r=>r.teamId)).size!==m.rows.length)c.addIssue({code:'custom',message:'Một đội chỉ được xuất hiện một lần trong một trận.'});});
export const scoreRuleSchema=z.object({mode:z.enum(['source','custom']),killPoints:z.number().min(0).max(100),placements:z.array(z.number().min(0).max(1000)).min(1).max(100),tieBreak:z.enum(['booyah-kills-last','kills-booyah-last','last-booyah-kills']),confirmed:z.boolean()});
export const scoreBoardSchema=z.object({scheduleDesign:scheduleDesignSchema.optional(),id,name,totalLayout:z.enum(['classic','schedule']).optional(),championRushPoints:rushThreshold,matchTemplate:scoreTemplateSchema.nullable().optional(),totalTemplate:scoreTemplateSchema.nullable().optional(),matchTypography:typographySchema.optional(),totalTypography:typographySchema.optional(),title:z.string().max(120),subtitle:z.string().max(120),panelColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),textColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),titleColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),highlight:z.string().regex(/^#[a-fA-F0-9]{6}$/),stages:z.array(z.object({id,name})).min(1).max(50),scope:z.array(id).max(50),teams:z.array(z.object({id,name:name.toUpperCase(),logo:teamLogoSchema,externalKeys:z.array(id).max(100),adjustment:points})).max(100),matches:z.array(scoreMatchSchema).max(200),rule:scoreRuleSchema}).superRefine((b,c)=>{
 const issue=(message:string)=>c.addIssue({code:'custom',message});
 if(new Set(b.matches.map(m=>m.id)).size!==b.matches.length)issue('Match ID đã có trong giải này.');
 if(new Set(b.teams.map(t=>t.id)).size!==b.teams.length||new Set(b.stages.map(s=>s.id)).size!==b.stages.length)issue('Mã đội hoặc vòng đấu bị trùng.');
 const keys=b.teams.flatMap(t=>t.externalKeys);if(new Set(keys).size!==keys.length)issue('Một đội Match Stats không thể ghép vào hai đội.');
 if(b.scope.some(s=>!b.stages.some(x=>x.id===s)))issue('Vòng đấu hiển thị không tồn tại.');
 for(const m of b.matches){if(!b.stages.some(s=>s.id===m.stageId))issue('Trận thuộc vòng đấu không tồn tại.');if(m.rows.some(r=>!b.teams.some(t=>t.id===r.teamId)))issue('Đội trong kết quả không tồn tại.');}
});
export const standingSchema=z.object({teamId:id,name:name.toUpperCase(),logo:teamLogoSchema,crown:z.enum(['silver','gold']).optional(),booyah:count,kills:count,total:points,matches:count,lastRank:z.number().min(1).max(101),adjustment:points,placementPoints:z.number().nonnegative().default(0),position:z.number().int().min(1).max(100)});
export const publishedScoreSchema=z.object({scheduleDesign:scheduleDesignSchema.optional(),layout:z.enum(['classic','schedule']).optional(),championRushPoints:rushThreshold,template:scoreTemplateSchema.nullable().optional(),typography:typographySchema.optional(),boardId:id,view:z.enum(['total','match']).default('total'),matchId:z.string().max(80).default(''),title:z.string().max(120),subtitle:z.string().max(120),panelColor:z.string(),textColor:z.string(),titleColor:z.string(),highlight:z.string(),rows:z.array(standingSchema).max(100).transform(rankRows),publishedAt:z.number().int().nonnegative(),matchCount:z.number().int().nonnegative()});
export const scoreboardsSchema=z.object({boards:z.array(scoreBoardSchema).max(20),selectedId:z.string().max(80),published:publishedScoreSchema.nullable(),publishedMatch:publishedScoreSchema.nullable().default(null)}).superRefine((s,c)=>{if(new Set(s.boards.map(b=>b.id)).size!==s.boards.length)c.addIssue({code:'custom',message:'Giải bảng điểm bị trùng.'});if(s.selectedId&&!s.boards.some(b=>b.id===s.selectedId))c.addIssue({code:'custom',message:'Giải đang chọn không tồn tại.'});});
export type ScoreBoard=z.infer<typeof scoreBoardSchema>;
export type ScoreResult=z.infer<typeof scoreResultSchema>;
export type ScoreMatch=z.infer<typeof scoreMatchSchema>;
export type PublishedScore=z.infer<typeof publishedScoreSchema>;
export type Scoreboards=z.infer<typeof scoreboardsSchema>;
export type Standing=z.infer<typeof standingSchema>;
export type ImportedRow={externalKey:string;name:string;rank:number;kills:number;booyah:number;sourcePoints:number|null;rankVerified?:boolean;rankUncertain?:boolean};
export type ImportedMatch={id:string;name:string;rows:ImportedRow[];players:MatchPlayer[];startTime:number;endTime:number;source:'matchstats';sourceRecordId?:number};
export type MatchCandidate={recordId:number;seasonId:number;eventId:number;startTime:number;endTime:number;name:string};
export function emptyScoreboards():Scoreboards{return {boards:[],selectedId:'',published:null,publishedMatch:null};}
export function newScoreBoard(label:string):ScoreBoard {const stageId=createId();return {id:createId(),name:label,championRushPoints:0,title:'BẢNG XẾP HẠNG',subtitle:label,panelColor:'#00bd87',textColor:'#071b13',titleColor:'#ec2636',highlight:'#fff043',stages:[{id:stageId,name:'Vòng 1 / Ngày 1'}],scope:[],teams:[],matches:[],rule:{mode:'custom',killPoints:1,placements:[12,9,8,7,6,5,4,3,2,1,0,0],tieBreak:'booyah-kills-last',confirmed:true}};}
export const placementScores=[12,9,8,7,6,5,4,3,2,1,0,0] as const;
export function scoreForRank(rank:number){if(!Number.isInteger(rank)||rank<1)throw new Error('Hạng trận không hợp lệ.');return placementScores[rank-1]??0;}
export function matchPoints(row:Pick<ScoreResult,'rank'|'kills'>){return scoreForRank(row.rank)+row.kills;}
export function activeScoreMatches(board:ScoreBoard){return board.matches.filter(m=>m.enabled);}
function rankRows(rows:Standing[]):Standing[]{
 for(const row of rows)row.name=row.name.toUpperCase();
 // Only teams without any played matches receive alphabetical, separate ranks.
 rows.sort((a,b)=>Number(a.matches===0)-Number(b.matches===0)||(a.matches===0&&b.matches===0?a.name.localeCompare(b.name,'vi',{sensitivity:'base'})||a.teamId.localeCompare(b.teamId):b.total-a.total||b.booyah-a.booyah||b.kills-a.kills||a.teamId.localeCompare(b.teamId)));
 let position=0;for(let i=0;i<rows.length;i++){const r=rows[i],prev=rows[i-1];if(r.matches===0||!prev||prev.total!==r.total||prev.kills!==r.kills||prev.booyah!==r.booyah)position=i+1;r.position=position;}return rows;
}
function verifiedResult(row:ScoreResult,source:ScoreMatch['source']):ScoreResult {
 if(source==='matchstats'&&!row.rankVerified){const placement=row.sourcePoints===null?-1:row.sourcePoints-row.kills;const index=placementScores.findIndex(p=>p===placement);if(index<0)throw new Error('Trận cũ thiếu hạng về đích đã xác minh. Xóa và lấy lại Match ID để tính đúng.');return {...row,rank:index+1,rankVerified:true,rankUncertain:placement===0};}return row;
}
export function matchStandings(board:ScoreBoard,match:ScoreMatch):Standing[]{const present=new Set(match.rows.map(r=>r.teamId));const missing:Standing[]=board.teams.filter(t=>!present.has(t.id)).map(t=>({teamId:t.id,name:t.name,logo:t.logo,booyah:0,kills:0,total:0,placementPoints:0,matches:0,lastRank:101,adjustment:0,position:0}));return rankRows([...match.rows.map(raw=>{const r=verifiedResult(raw,match.source);const team=board.teams.find(t=>t.id===r.teamId);if(!team)throw new Error('Đội trong trận chưa được ghép.');return {teamId:team.id,name:team.name,logo:team.logo,booyah:r.booyah,kills:r.kills,total:matchPoints(r),placementPoints:scoreForRank(r.rank),matches:1,lastRank:r.rankUncertain?101:r.rank,adjustment:0,position:0};}),...missing]);}

export function standings(board:ScoreBoard):Standing[]{
 const rows=new Map<string,Standing>();
 const threshold=board.championRushPoints||0;let championId='';
 // Stored match order is competition order; only enabled matches count.
 for(const match of activeScoreMatches(board)){
  for(const existing of rows.values())existing.lastRank=101;
  for(const result of matchStandings(board,match)){
   const total=rows.get(result.teamId);
   // A team must already be match-point eligible before its winning match.
   if(threshold>0&&!championId&&total&&total.total>=threshold&&result.booyah===1)championId=result.teamId;
   if(!total)rows.set(result.teamId,{...result});
   else {total.total+=result.total;total.kills+=result.kills;total.booyah+=result.booyah;total.placementPoints+=result.placementPoints;total.matches+=result.matches;total.lastRank=result.lastRank;}
  }
 }
 for(const row of rows.values())if(threshold>0&&row.total>=threshold)row.crown=row.teamId===championId?'gold':'silver';
 return rankRows([...rows.values()]);
}
export function scoreSnapshot(board:ScoreBoard,view:'match'|'total',matchId=''):PublishedScore{
 const match=view==='match'?board.matches.find(m=>m.id===matchId):undefined;if(view==='match'&&!match)throw new Error('Chọn trận cần chiếu.');
 const rows=match?matchStandings(board,match):standings(board);if(!rows.length)throw new Error('Chưa có bảng điểm trận để chiếu.');
 const number=match?board.matches.findIndex(m=>m.id===match.id)+1:0;
 const typography=view==='match'?board.matchTypography:board.totalTypography;
 const template=view==='match'?board.matchTemplate:board.totalTemplate;
 return {scheduleDesign:view==='total'&&board.scheduleDesign?structuredClone(board.scheduleDesign):undefined,layout:view==='total'?board.totalLayout:undefined,championRushPoints:view==='total'?board.championRushPoints:undefined,template:template?structuredClone(template):template,typography:typography?structuredClone(typography):undefined,boardId:board.id,view,matchId:match?.id||'',title:board.title,subtitle:match?(match.name||'TRẬN '+number):board.subtitle,panelColor:board.panelColor,textColor:board.textColor,titleColor:board.titleColor,highlight:board.highlight,rows,publishedAt:Date.now(),matchCount:match?1:activeScoreMatches(board).length};
}
export function publishScore(board:ScoreBoard):PublishedScore{return scoreSnapshot(board,'total');}
export function commitImport(board:ScoreBoard,match:ImportedMatch,stageId:string,mapping:Record<string,string>,sharedTeams:RegisteredTeam[]):ScoreBoard {
 if(board.matches.some(m=>m.id===match.id))throw new Error('Match ID này đã nhập. Không cộng trùng.');
 const next=reconcileScoreTeams(board,sharedTeams);const used=new Set<string>();const rows:ScoreResult[]=[];
 for(const row of match.rows){let target=mapping[row.externalKey];if(target==='new'&&sharedTeams.length){target=resolveImportedTeam(next,row,sharedTeams);if(!target)throw new Error('Chọn đội trong danh sách đã nhập cho '+row.name+'. Không tự tạo đội ngoài danh sách.');}if(sharedTeams.length&&target&&!sharedTeams.some(t=>t.id===target))throw new Error('Đội đã chọn không thuộc danh sách đội hiện tại.');if(!target)throw new Error('Ghép đủ các đội trước khi nhập.');let team=next.teams.find(t=>t.id===target);
  if(target==='new'){team={id:createId(),name:row.name,logo:'',externalKeys:[],adjustment:0};next.teams.push(team);}else if(!team){const shared=sharedTeams.find(t=>t.id===target);if(!shared)throw new Error('Đội đã chọn không tồn tại.');team={...shared,externalKeys:[],adjustment:0};next.teams.push(team);}
  if(used.has(team.id))throw new Error('Hai đội nguồn không thể ghép vào cùng một đội.');used.add(team.id);
  for(const old of next.teams)old.externalKeys=old.externalKeys.filter(k=>k!==row.externalKey);
  if(!team.externalKeys.includes(row.externalKey))team.externalKeys.push(row.externalKey);
  rows.push({teamId:team.id,rank:row.rank,kills:row.kills,booyah:row.booyah,rankVerified:row.rankVerified,rankUncertain:row.rankUncertain,sourcePoints:row.sourcePoints,placementPoints:scoreForRank(row.rank),matchPoints:matchPoints(row)});
 }
 for(const shared of sharedTeams){if(!next.teams.some(t=>t.id===shared.id||teamForName(t.name,[shared])?.id===shared.id))next.teams.push({...shared,externalKeys:[],adjustment:0});}
 next.matches.push({id:match.id,name:match.name,stageId,source:'matchstats',sourceRecordId:match.sourceRecordId,enabled:true,importedAt:Date.now(),rows});
 return scoreBoardSchema.parse(next);
}

export function resetScoreData(scores:Scoreboards,sharedTeams:Array<{id:string;name:string;logo:string}>):Scoreboards {
 return scoreboardsSchema.parse({...scores,published:null,publishedMatch:null,boards:scores.boards.map(board=>({...board,matches:[],scope:[],teams:sharedTeams.map(team=>({id:team.id,name:team.name,logo:team.logo,externalKeys:[],adjustment:0}))}))});
}

export function formatScoreValue(value:number):string{return String(value);}

export function resolveImportedTeam(board:ScoreBoard,row:Pick<ImportedRow,'name'|'externalKey'>,sharedTeams:RegisteredTeam[]):string {
 const registered=teamForName(row.name,sharedTeams);if(registered)return registered.id;
 const known=board.teams.find(t=>t.externalKeys.includes(row.externalKey));
 if(known){if(!sharedTeams.length)return known.id;const current=sharedTeams.find(t=>t.id===known.id)||teamForName(known.name,sharedTeams);if(current)return current.id;}
 return sharedTeams.length?'':teamForName(row.name,board.teams)?.id||'new';
}
// Merge old source aliases into registered teams without changing any match statistics.
export function reconcileScoreTeams(board:ScoreBoard,sharedTeams:RegisteredTeam[]):ScoreBoard {
 if(!sharedTeams.length)return structuredClone(board);
 const next=structuredClone(board);const aliases=new Map<string,string>();
 const teams:ScoreBoard['teams']=sharedTeams.map(t=>({id:t.id,name:t.name,logo:t.logo,externalKeys:[],adjustment:board.teams.find(old=>old.id===t.id)?.adjustment||0}));
 for(const old of board.teams){const registered=sharedTeams.find(t=>t.id===old.id)||teamForName(old.name,sharedTeams);if(!registered){teams.push(structuredClone(old));continue;}aliases.set(old.id,registered.id);const target=teams.find(t=>t.id===registered.id)!;target.externalKeys=[...new Set([...target.externalKeys,...old.externalKeys])];}
 next.teams=teams;next.matches=next.matches.map(match=>({...match,rows:match.rows.map(row=>({...row,teamId:aliases.get(row.teamId)||row.teamId}))}));
 return scoreBoardSchema.parse(next);
}
