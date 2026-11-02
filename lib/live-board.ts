import {neonCompactAlignment} from './live-kv-detect.ts';
import {liveAlignmentSchema} from './live-presentation.ts';
import {z} from 'zod';
import {teamNameKey} from './team-identity.ts';
export const LIVE_COMPACT_KV='/live-board-templates/standing-compact-neon-14-v1.png';
export const LIVE_VERTICAL_KV='/live-board-templates/standing-vertical-red-white-v1.png';
export const LIVE_TEST_KV='/live-board-templates/test-red-gold-v1.png';
const id=z.string().regex(/^\d{1,24}$/);
const nullableInt=(max:number)=>z.number().int().min(0).max(max).nullable();
const ratio=z.number().min(0).max(1);
const rgb=z.tuple([z.number().int().min(0).max(255),z.number().int().min(0).max(255),z.number().int().min(0).max(255)]);
export const liveTeamSchema=z.object({teamId:z.string().max(80).nullable().default(null),teamName:z.string().trim().min(1).max(80),slot:z.number().int().min(1).max(100).nullable().default(null),elims:nullableInt(10000),aliveCount:nullableInt(100),aliveStates:z.array(z.enum(['alive','knocked','dead','unknown'])).min(1).max(8).nullable().default(null),damage:nullableInt(1000000).default(null),placement:z.number().int().min(1).max(100).nullable().default(null)});
export type LiveTeam=z.infer<typeof liveTeamSchema>;
export const livePacketSchema=z.object({sessionId:z.string().uuid(),configId:z.string().uuid(),sequence:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),matchId:id,detectedMatchId:id.nullable(),source:z.enum(['windows-ocr','normalized-file','game-log']),isReplay:z.boolean(),capturedAt:z.number().int().positive(),matchStartedAt:z.number().int().positive().nullable().default(null),rosterProof:z.object({capacity:z.number().int().min(1).max(8),groups:z.array(z.object({groupId:z.number().int().min(0).max(1000),count:z.number().int().min(1).max(8)})).min(1).max(100)}).nullable().default(null),sourceEventAt:z.number().int().positive().nullable().default(null),captureSpanMs:z.number().min(0).max(4000).default(0),expectedTeams:z.number().int().min(1).max(100),complete:z.literal(true),teams:z.array(liveTeamSchema).min(1).max(100),remainingTeams:nullableInt(100).default(null),remainingPlayers:nullableInt(1000).default(null)}).superRefine((p,ctx)=>{
 if(p.teams.length!==p.expectedTeams)ctx.addIssue({code:'custom',message:'Chưa đọc đủ số đội đã xác nhận.'});
 if(p.remainingTeams!==null&&p.remainingTeams>p.teams.length)ctx.addIssue({code:'custom',message:'Game báo còn nhiều đội hơn số hàng đã đọc. Thiếu phần bảng.'});
 const keys=p.teams.map(t=>t.teamId||teamNameKey(t.teamName));if(new Set(keys).size!==keys.length)ctx.addIssue({code:'custom',message:'Đội bị trùng trong snapshot.'});
 const slots=p.teams.map(t=>t.slot).filter(s=>s!==null);if(new Set(slots).size!==slots.length)ctx.addIssue({code:'custom',message:'Slot bị trùng.'});
 for(const team of p.teams){if(team.aliveStates&&!team.aliveStates.includes('unknown')&&team.aliveCount!==null&&team.aliveStates.filter(s=>s==='alive'||s==='knocked').length!==team.aliveCount)ctx.addIssue({code:'custom',message:'ALIVE không khớp trạng thái tuyển thủ.'});}
 if(p.teams.every(t=>t.aliveCount!==null)){
  if(p.remainingPlayers!==null&&p.teams.reduce((n,t)=>n+t.aliveCount!,0)!==p.remainingPlayers)ctx.addIssue({code:'custom',message:'Tổng ALIVE không khớp bộ đếm trong game. Có thể thiếu trang hoặc đọc sai vạch.'});
  if(p.remainingTeams!==null&&p.teams.filter(t=>t.aliveCount!>0).length!==p.remainingTeams)ctx.addIssue({code:'custom',message:'Số đội còn người không khớp bộ đếm game.'});
 }
});
export type LivePacket=z.infer<typeof livePacketSchema>;
export const liveLayoutSchema=z.object({rowTop:ratio.default(275/1009),rowStep:ratio.default(56.7/1009),rowHeight:ratio.default(38/1009),visibleRows:z.number().int().min(1).max(24).default(12),teamX:ratio.default(1680/1920),teamWidth:ratio.default(90/1920),elimsX:ratio.default(1788/1920),elimsWidth:ratio.default(50/1920),barXs:z.array(ratio).min(1).max(8).default([1865/1920,1878/1920,1892/1920,1905/1920]),barY:ratio.default(19/1009),aliveColors:z.array(rgb).min(1).max(8).default([[255,174,0]]),deadColors:z.array(rgb).min(1).max(8).default([[128,98,28]]),colorTolerance:z.number().min(1).max(100).default(75),readAlive:z.boolean().default(true)});
export const liveBoardSettingsSchema=z.object({configId:z.string().uuid(),scoreBoardId:z.string().max(80).default(''),enabled:z.boolean().default(false),matchId:z.union([id,z.literal('')]).default(''),mode:z.enum(['live','replay']).default('live'),followGame:z.boolean().default(true),adapter:z.enum(['windows-ocr','normalized-file','game-log']).default('game-log'),expectedTeams:z.number().int().min(1).max(100).default(12),rosterConfirmed:z.boolean().default(false),sourcePath:z.string().max(500).default(''),layout:liveLayoutSchema.default({}),design:z.object({autoAlign:z.boolean().default(true),alignment:liveAlignmentSchema.nullable().default(null),title:z.string().max(100).default('BẢNG ĐIỂM TRONG TRẬN'),kv:z.string().max(300).refine(s=>!s||s===LIVE_TEST_KV||s===LIVE_VERTICAL_KV||s===LIVE_COMPACT_KV||s==='/live-board-templates/standing-compact-v1.png'||/^\/api\/media\/[a-f0-9-]+$/.test(s)).default(''),x:z.number().min(0).max(1920).default(300),y:z.number().min(0).max(1080).default(180),width:z.number().min(300).max(1920).default(1320),rowHeight:z.number().min(20).max(120).default(54),gap:z.number().min(0).max(40).default(6),color:z.string().regex(/^#[a-f0-9]{6}$/i).default('#ffffff'),fontSize:z.number().min(10).max(70).default(28),showHeader:z.boolean().default(true),showSlot:z.boolean().default(false),showAlive:z.boolean().default(true),showElims:z.boolean().default(true),showTotal:z.boolean().default(true),showDamage:z.boolean().default(false),showPlacement:z.boolean().default(false)}).default({})});
export type LiveBoardSettings=z.infer<typeof liveBoardSettingsSchema>;
export function defaultLiveBoardSettings(){return liveBoardSettingsSchema.parse({configId:'00000000-0000-4000-8000-000000000001'});}
export function testLiveBoardDesign(current:LiveBoardSettings['design']):LiveBoardSettings['design']{return {...current,kv:LIVE_TEST_KV,x:436,y:172,width:1048,rowHeight:45,gap:4,fontSize:26,color:'#fff0d0',showHeader:true,showSlot:false,showAlive:true,showElims:true,showDamage:false,showPlacement:false};}
export function compactLiveBoardDesign(current:LiveBoardSettings['design']):LiveBoardSettings['design']{return {...current,autoAlign:true,kv:LIVE_COMPACT_KV,title:'',x:1320,y:124,width:580,rowHeight:52,gap:6,fontSize:28,color:'#ffffff',showHeader:false,showSlot:false,showAlive:true,showElims:true,showTotal:true,showDamage:false,showPlacement:false,alignment:structuredClone(neonCompactAlignment)};}

export type LiveHealth={paired:boolean;sourceStatus:string;message:string;lastSeenAt:number;receivedAt:number;sampleAt:number;diagnostic:unknown};
export function checkLivePacket(packet:LivePacket,settings:LiveBoardSettings,now=Date.now()){
 const auto=settings.followGame&&settings.adapter==='game-log'&&settings.mode==='live';
 if(!auto){if(!settings.rosterConfirmed)throw Error('Xác nhận số đội.');if(!settings.matchId||packet.matchId!==settings.matchId)throw Error('Match ID khác trận đang chọn.');if(packet.expectedTeams!==settings.expectedTeams)throw Error('Số đội khác cấu hình.');}
 else{const proof=packet.rosterProof;if(!packet.matchStartedAt||packet.matchStartedAt>packet.capturedAt+2000||!proof||proof.groups.length!==packet.expectedTeams||new Set(proof.groups.map(g=>g.groupId)).size!==proof.groups.length||proof.groups.some(g=>g.count>proof.capacity))throw Error('Chưa xác minh đủ roster trận từ game.');}
 if(packet.configId!==settings.configId)throw Error('Cấu hình nguồn đã thay đổi.');
 if(packet.isReplay!==(settings.mode==='replay'))throw Error('Chế độ live/replay không khớp.');
 if(packet.source!==settings.adapter)throw Error('Loại nguồn không khớp.');
 if(!packet.isReplay&&packet.source==='windows-ocr'&&packet.detectedMatchId!==packet.matchId)throw Error('Chưa xác minh Match ID của phiên client này. Chỉ nhận chẩn đoán.');
 if(!packet.isReplay&&packet.source==='game-log'&&packet.detectedMatchId!==packet.matchId)throw Error('Match ID của log game chưa khớp trận đang chạy.');
 if(packet.capturedAt>now+2000||now-packet.capturedAt>5000)throw Error('Khung dữ liệu quá cũ hoặc đồng hồ hai máy lệch.');
}

export function verticalLiveBoardDesign(current:LiveBoardSettings['design']):LiveBoardSettings['design']{return {...compactLiveBoardDesign(current),autoAlign:false,kv:LIVE_VERTICAL_KV,fontSize:24,color:'#ffffff'};}
