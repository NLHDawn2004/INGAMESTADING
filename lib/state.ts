import {overlayRegionSchema} from './overlay-layout.ts';
import {createId} from './client-id.ts';
import { z } from 'zod';
import {teamListSchema,emptyTeamList} from './team-list.ts';
import {teamLogoSchema} from './team-assets.ts';
import {typographySchema} from './typography.ts';
import {scoreboardsSchema,emptyScoreboards} from './scoreboard.ts';
import {liveBoardSettingsSchema,defaultLiveBoardSettings} from './live-board.ts';
import {playerOverlaysSchema} from './player-leaders.ts';
export const mapNames = ['Bermuda', 'Purgatory', 'Kalahari', 'NexTerra', 'Solara'] as const;
export const mapLabels: Record<string,string> = { Bermuda:'ĐẢO QUÂN SỰ', Purgatory:'ĐẢO THIÊN ĐƯỜNG', Kalahari:'ĐẢO SA MẠC', NexTerra:'ĐẢO THẾ KỶ', Solara:'ĐẢO BÌNH MINH' };
const asset = z.string().max(300).refine(v => !v || /^\/(maps\/[A-Za-z]+\.webp|api\/media\/[a-f0-9-]+)$/.test(v), 'Ảnh không hợp lệ');
export const themeSchema = z.object({mapRegion:overlayRegionSchema.optional(),showBackgroundInOverlay:z.boolean().optional(), typography:typographySchema.optional(), name:z.string().max(80), title:z.string().max(120), subtitle:z.string().max(180), footer:z.string().max(120), accent:z.string().regex(/^#[a-fA-F0-9]{6}$/), text:z.string().regex(/^#[a-fA-F0-9]{6}$/), logo:asset, background:asset, useBackground:z.boolean(), showTitle:z.boolean(), showFooter:z.boolean(), showUnlimited:z.boolean(), shade:z.number().min(0).max(.85), offsetY:z.number().min(-100).max(100), scale:z.number().min(.7).max(1.1) });
export const matchLimitSchema = z.union([z.literal('unlimited'),z.literal(4),z.literal(5),z.literal(6),z.literal(8),z.literal(10)]);
export type MatchLimit = z.infer<typeof matchLimitSchema>;
export const stateSchema = z.object({ revision:z.number().int().nonnegative(),liveBoard:liveBoardSettingsSchema.default(defaultLiveBoardSettings()), teamList:teamListSchema.default(emptyTeamList()), scoreboards:scoreboardsSchema.default(emptyScoreboards()), playerOverlays:playerOverlaysSchema, matchLimit:matchLimitSchema.default('unlimited'), recapView:z.enum(['auto','schedule','summary']).default('auto'),rushEnded:z.boolean().default(false),recapAt:z.number().int().nonnegative().default(0), windowStart:z.number().int().min(0).max(195), theme:themeSchema, teams:z.array(z.object({id:z.string().max(60), name:z.string().min(1).max(80).toUpperCase(), abbreviation:z.string().max(20).toUpperCase().optional(), logo:teamLogoSchema})).max(100), matches:z.array(z.object({id:z.string().max(60),map:z.enum(mapNames), revealAt:z.number().int().nonnegative().default(0), status:z.enum(['locked','ready','live','finished']), winner:z.string().max(60),position:z.number().min(0).max(100)})).min(4).max(200), presets:z.array(themeSchema).max(20) }).superRefine((s,ctx)=> {
 if(s.matches.filter(m=>m.status==='live'||m.status==='ready').length>1)ctx.addIssue({code:'custom',message:'Chỉ một trận được chuẩn bị hoặc thi đấu tại một thời điểm'});
 if(s.matchLimit!=='unlimited'&&s.matches.length!==s.matchLimit)ctx.addIssue({code:'custom',message:'Số trận phải đúng với giới hạn đã chọn'});
 if(s.rushEnded&&(s.matchLimit!=='unlimited'||s.matches.some(m=>m.status==='ready'||m.status==='live')||!s.matches.some(m=>m.status==='finished')))ctx.addIssue({code:'custom',message:'Kết thúc Champion Rush cần có kết quả và không còn trận đang chuẩn bị hoặc thi đấu'});
 if(s.recapView==='summary'&&!recapAvailable(s))ctx.addIssue({code:'custom',message:'Chưa đủ kết quả để chiếu tổng kết'});
 const size=windowSize(s);
 if(s.windowStart%size!==0||s.windowStart>=s.matches.length)ctx.addIssue({code:'custom',message:'Nhóm hiển thị không hợp lệ'});
 for(const m of s.matches)if(m.status==='finished' && !s.teams.some(t=>t.id===m.winner))ctx.addIssue({code:'custom',message:'Trận kết thúc cần có đội thắng'});
});
export type StudioState = z.infer<typeof stateSchema>;
export type Theme = z.infer<typeof themeSchema>;
export const defaultTheme: Theme = {name:'BTEC Championship', title:'', subtitle:'', footer:'', accent:'#ffd339', text:'#ffffff', logo:'',background:'',useBackground:false,showTitle:false,showFooter:false,showUnlimited:true,shade:.42,offsetY:0,scale:1};
export function windowSize(s:{matchLimit?:MatchLimit}){return !s.matchLimit||s.matchLimit==='unlimited'?5:6;}
export function initialState():StudioState { return { revision:0,liveBoard:defaultLiveBoardSettings(),teamList:emptyTeamList(),scoreboards:emptyScoreboards(),playerOverlays:{elims:null,damage:null},matchLimit:'unlimited',recapView:'auto',rushEnded:false,recapAt:0,windowStart:0, theme:{...defaultTheme},teams:[],matches:mapNames.map((map,i)=>({id:'match-'+(i+1),map,revealAt:0,status:i===0?'ready':'locked',winner:'',position:50})),presets:[] }; }
function randomMap(){return mapNames[Math.floor(Math.random()*mapNames.length)];}
export function changeMatchLimit(s:StudioState,limit:MatchLimit):StudioState {
 const next=structuredClone(s);
 if(limit===next.matchLimit)return next;
 if(limit!=='unlimited'&&next.matches.slice(limit).some(m=>m.status!=='locked'))throw new Error('Không thể giảm số trận vì các trận ngoài giới hạn đã được chuẩn bị hoặc có kết quả.');
 next.matchLimit=limit;next.rushEnded=false;next.recapView='auto';next.recapAt=0;
 if(limit!=='unlimited'){
  next.matches=Array.from({length:limit},(_,i)=>{
   const old=s.matches[i];
   if(old)return {...old};
   return {id:createId(),map:mapNames[i%mapNames.length],revealAt:0,status:'locked',winner:'',position:50};
  });
 }
 const active=next.matches.findIndex(m=>m.status==='ready'||m.status==='live');
 const anchor=active>=0?active:Math.min(s.windowStart,next.matches.length-1);
 next.windowStart=0;
 return next;
}
export function addMatch(s:StudioState):StudioState {
 if(s.rushEnded)throw new Error('Tiếp tục Champion Rush trước khi thêm trận.');
 if(s.matchLimit!=='unlimited')throw new Error('Lịch đã có đủ '+s.matchLimit+' trận.');
 if(s.matches.length>=200)throw new Error('Lịch đã đạt giới hạn lưu trữ 200 trận.');
 const next=structuredClone(s);next.matches.push({id:createId(),map:mapNames[next.matches.length%5],revealAt:0,status:'locked',winner:'',position:50});return next;
}
export function prepareMatch(s:StudioState,id:string):StudioState {
 if(s.rushEnded)throw new Error('Tiếp tục Champion Rush trước khi chuẩn bị trận.');
 const next=structuredClone(s);
 if(next.matches.some(m=>m.status==='ready'||m.status==='live'))throw new Error('Hãy kết thúc trận hiện tại trước.');
 const index=next.matches.findIndex(m=>m.id===id);
 if(index<0||next.matches[index].status!=='locked')throw new Error('Chọn trận chưa diễn ra.');
 next.matches[index].status='ready';next.matches[index].revealAt=Date.now();next.windowStart=Math.floor(index/windowSize(next))*windowSize(next);return next;
}
export function advance(s:StudioState):StudioState {const m=s.matches.find(m=>m.status==='locked');if(!m)throw new Error(s.matchLimit==='unlimited'?'Đã hết trận. Thêm trận mới để tiếp tục.':'Đã hoàn thành '+s.matchLimit+' trận.');return prepareMatch(s,m.id);}
export function startMatch(s:StudioState,id:string):StudioState { const next=structuredClone(s);if(next.matches.some(m=>m.status==='live'))throw new Error('Một trận đang diễn ra.');const index=next.matches.findIndex(m=>m.id===id);const m=next.matches[index];if(!m || m.status!=='ready')throw new Error('Chọn trận đang chuẩn bị.');m.status='live';next.windowStart=Math.floor(index/windowSize(next))*windowSize(next);return next; }
export function finishMatch(s:StudioState,id:string,winner:string):StudioState {const next=structuredClone(s);if(!next.teams.some(t=>t.id===winner))throw new Error('Hãy chọn đội thắng.');const m=next.matches.find(m=>m.id===id);if(!m || !['live','ready'].includes(m.status))throw new Error('Trận chưa bắt đầu.');m.status='finished';m.winner=winner;if(next.matchLimit!=='unlimited'&&next.matches.every(m=>m.status==='finished')){next.recapView='auto';next.recapAt=Date.now();}return next;}

export function recapAvailable(s:Pick<StudioState,'matchLimit'|'matches'|'rushEnded'>){return s.matchLimit==='unlimited'?s.rushEnded&&s.matches.some(m=>m.status==='finished'):s.matches.every(m=>m.status==='finished');}
export function showRecap(s:StudioState){return recapAvailable(s)&&s.recapView!=='schedule';}
export function endRush(s:StudioState):StudioState {
 if(s.matchLimit!=='unlimited')throw new Error('Chỉ dùng nút này cho Champion Rush.');
 if(s.matches.some(m=>m.status==='ready'||m.status==='live'))throw new Error('Kết thúc trận hiện tại trước khi tổng kết.');
 if(!s.matches.some(m=>m.status==='finished'))throw new Error('Chưa có kết quả để tổng kết.');
 return {...s,rushEnded:true,recapView:'auto',recapAt:Date.now()};
}
export function resumeRush(s:StudioState):StudioState {return {...s,rushEnded:false,recapView:'auto',recapAt:0};}
