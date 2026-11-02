import {z} from 'zod';
import {teamLogoSchema} from './team-assets.ts';
import {fontFamilies} from './typography.ts';
import {parseDriveFolder} from './drive-team-logos.ts';

export const leaderFields=['rank','logo','portrait','team','name','elims','damage'] as const;
export type LeaderField=typeof leaderFields[number];
const fieldSchema=z.object({x:z.number().min(-1920).max(1920),y:z.number().min(-1080).max(1080),width:z.number().min(8).max(1920),height:z.number().min(8).max(1080),size:z.number().min(8).max(200),align:z.enum(['left','center','right']),color:z.string().regex(/^#[a-fA-F0-9]{6}$/).optional(),visible:z.boolean()});
const portraitField={x:122,y:4,width:96,height:82,size:20,align:'center' as const,visible:true};
export const playerPortraitSchema=z.string().max(300).refine(v=>!v||/^\/api\/media\/[a-f0-9-]+$/.test(v)||/^\/player-templates\/video-demo-portrait-[1-6]\.png$/.test(v),'Ảnh tuyển thủ không hợp lệ.');
export const leaderDesignSchema=z.object({background:z.string().max(300).refine(v=>!v||/^\/api\/media\/[a-f0-9-]+$/.test(v)||/^\/player-templates\/(red-gold-(elims|damage)|video-(elims|damage)-v2)\.png$/.test(v),'KV không hợp lệ.'),x:z.number().min(0).max(1920),y:z.number().min(0).max(1080),stepX:z.number().min(0).max(1920),stepY:z.number().min(0).max(1080),color:z.string().regex(/^#[a-fA-F0-9]{6}$/),font:z.enum(fontFamilies),weight:z.number().int().min(100).max(950),fields:z.object({rank:fieldSchema,logo:fieldSchema,portrait:fieldSchema.default(portraitField),team:fieldSchema,name:fieldSchema,elims:fieldSchema,damage:fieldSchema})});
export type LeaderDesign=z.infer<typeof leaderDesignSchema>;
export function defaultLeaderDesign():LeaderDesign{
 const field=(x:number,width:number,size=30,align:'left'|'center'|'right'='left')=>({x,y:0,width,height:80,size,align,visible:true});
 return {background:'',x:160,y:340,stepX:0,stepY:100,color:'#ffffff',font:'GFF Latin',weight:700,fields:{rank:field(0,80,34,'center'),logo:{...field(100,70),height:70,y:5},portrait:{...portraitField},team:field(190,280),name:field(490,450),elims:field(970,160,34,'center'),damage:field(1160,240,34,'center')}};
}
export function videoLeaderDesign(kind:'elims'|'damage'):LeaderDesign{
 const field=(x:number,y:number,width:number,height:number,size:number,color:string,align:'left'|'center'|'right'='left')=>({x,y,width,height,size,color,align,visible:true});
 return {...defaultLeaderDesign(),background:'/player-templates/video-'+kind+'-v2.png',x:1478,y:368,stepX:0,stepY:103,weight:800,fields:{rank:field(4,16,43,29,24,'#fff3ce','center'),logo:field(54,12,49,49,20,'#ffffff'),portrait:{...portraitField},team:{...field(238,1,195,18,12,'#ffffff'),visible:false},name:field(238,3,195,35,21,'#fff0d0'),elims:{...field(242,45,97,39,33,'#5e180a','center'),visible:kind==='elims'},damage:{...field(242,45,97,39,32,'#5e180a','center'),visible:kind==='damage'}}};
}
export const redGoldLeaderDesign=videoLeaderDesign;
export function demoLeaderSnapshot():PlayerLeaderSnapshot{
 const names=['GOW.MTAI','RGE.SEJAN','PE.CTUAN','BTR.KOJAA','BTR.CI83NK','WPS.JUN'];const kills=[88,84,84,84,84,12];const damage=[2260,2220,2179,2123,2178,2561];
 return {matchId:'12345',matchName:'MẪU TỪ VIDEO',publishedAt:1,onAir:true,players:names.map((name,i)=>({playerId:'demo-'+i,name,teamName:name.split('.')[0],kills:kills[i],damage:damage[i],logo:'/player-templates/video-demo-logo-'+(i+1)+'.png',portrait:'/player-templates/video-demo-portrait-'+(i+1)+'.png'}))};
}
export const leaderDesignsSchema=z.object({elims:leaderDesignSchema,damage:leaderDesignSchema});
export const matchPlayerSchema=z.object({playerId:z.string().min(1).max(80),name:z.string().min(1).max(80),teamName:z.string().min(1).max(80),kills:z.number().int().min(0).max(10000),damage:z.number().int().min(0).max(1000000)});
export type MatchPlayer=z.infer<typeof matchPlayerSchema>;
export const playerLeaderRowSchema=matchPlayerSchema.extend({logo:teamLogoSchema,portrait:playerPortraitSchema.optional()});
export type PlayerLeaderRow=z.infer<typeof playerLeaderRowSchema>;
export const playerLeaderSnapshotSchema=z.object({matchId:z.string().regex(/^\d{1,24}$/),matchName:z.string().max(120),sourceRecordId:z.number().int().min(-1).max(Number.MAX_SAFE_INTEGER).optional(),publishedAt:z.number().int().nonnegative(),design:leaderDesignSchema.optional(),onAir:z.boolean().default(true),players:z.array(playerLeaderRowSchema).min(1).max(64)});
export type PlayerLeaderSnapshot=z.infer<typeof playerLeaderSnapshotSchema>;
const portraitDriveFolderSchema=z.string().trim().max(1000).refine(value=>{if(!value)return true;try{parseDriveFolder(value);return true;}catch{return false;}},'Link thư mục Drive không hợp lệ.');
export const playerOverlaysSchema=z.object({portraitDriveFolderUrl:portraitDriveFolderSchema.optional(),portraits:z.record(z.string().min(1).max(80),playerPortraitSchema).refine(v=>Object.keys(v).length<=500,'Tối đa 500 ảnh tuyển thủ.').optional(),designs:leaderDesignsSchema.optional(),elims:playerLeaderSnapshotSchema.nullable().default(null),damage:playerLeaderSnapshotSchema.nullable().default(null)}).default({elims:null,damage:null});
export type PlayerOverlays=z.infer<typeof playerOverlaysSchema>;
export function rankElims(players:PlayerLeaderRow[]){return [...players].sort((a,b)=>b.kills-a.kills||b.damage-a.damage||a.name.localeCompare(b.name,'vi',{sensitivity:'base'})||a.playerId.localeCompare(b.playerId));}
export function rankDamage(players:PlayerLeaderRow[]){return [...players].sort((a,b)=>b.damage-a.damage||b.kills-a.kills||a.name.localeCompare(b.name,'vi',{sensitivity:'base'})||a.playerId.localeCompare(b.playerId));}
export function damageLeader(players:PlayerLeaderRow[]){return rankDamage(players)[0]||null;}
