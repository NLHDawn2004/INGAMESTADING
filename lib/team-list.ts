import {z} from 'zod';
import {teamLogoSchema} from './team-assets.ts';
import sourceLayout from './team-list-layout.ts';

const media=z.string().max(300).refine(v=>!v||/^\/api\/media\/[a-f0-9-]+$/.test(v),'Chọn ảnh đã tải lên.');
export const listGroupSchema=z.object({id:z.string().min(1).max(80),name:z.string().trim().min(1).max(80),teamIds:z.array(z.string().min(1).max(80)).max(100).refine(ids=>new Set(ids).size===ids.length,'Đội bị trùng trong bảng.')});
export const listDesignSchema=z.object({title:z.string().max(100),subtitle:z.string().max(100),kv:media,background:media,squareBackground:media.default(''),showKv:z.boolean(),showCards:z.boolean(),nameMode:z.enum(['full','short']),nameColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),titleColor:z.string().regex(/^#[a-fA-F0-9]{6}$/),accent:z.string().regex(/^#[a-fA-F0-9]{6}$/),logoScale:z.number().min(.5).max(1.25)});
const team=z.object({id:z.string().max(80),name:z.string().max(80),abbreviation:z.string().max(20).optional(),logo:teamLogoSchema});
export const publishedListSchema=z.object({design:listDesignSchema,groupName:z.string().max(80),teams:z.array(team).min(1).max(12),page:z.number().int().min(0).max(8),pages:z.number().int().min(1).max(9),publishedAt:z.number().int().nonnegative()});
export const teamListSchema=z.object({driveFolderUrl:z.string().max(1000).default(''),groups:z.array(listGroupSchema).max(30),selectedId:z.string().max(80),page:z.number().int().min(0).max(8),design:listDesignSchema,published:publishedListSchema.nullable()}).superRefine((v,c)=>{if(new Set(v.groups.map(g=>g.id)).size!==v.groups.length)c.addIssue({code:'custom',message:'Mã bảng bị trùng.'});if(v.selectedId&&!v.groups.some(g=>g.id===v.selectedId))c.addIssue({code:'custom',message:'Bảng đã chọn không tồn tại.'});});
export type TeamList=z.infer<typeof teamListSchema>;
export type ListDesign=z.infer<typeof listDesignSchema>;
export type PublishedList=z.infer<typeof publishedListSchema>;
export type ListTeam=z.infer<typeof team>;
export type ListSize='wide'|'square';
export const templateRoot='/teamlist-templates/gdhs11';
export function emptyTeamList():TeamList{return {driveFolderUrl:'',groups:[],selectedId:'',page:0,published:null,design:{title:'DANH SÁCH THI ĐẤU',subtitle:'NGÀY CHUNG KẾT',kv:'',background:'',squareBackground:'',showKv:true,showCards:true,nameMode:'full',nameColor:'#ffef29',titleColor:'#ffffff',accent:'#ffef29',logoScale:1}};}
export function listSnapshot(list:TeamList,teams:ListTeam[]):PublishedList{
 const group=list.groups.find(g=>g.id===list.selectedId);if(!group)throw Error('Chọn bảng thi đấu.');
 const resolved=group.teamIds.map(id=>{const t=teams.find(t=>t.id===id);if(!t)throw Error('Đội đã bị xóa khỏi danh sách. Cập nhật lại bảng trước khi chiếu.');return t;});
 if(!resolved.length)throw Error('Thêm đội vào bảng trước khi chiếu.');const pages=Math.ceil(resolved.length/12);if(list.page>=pages)throw Error('Trang không còn tồn tại. Chọn lại trang.');
 return publishedListSchema.parse({design:structuredClone(list.design),groupName:group.name,teams:structuredClone(resolved.slice(list.page*12,list.page*12+12)),page:list.page,pages,publishedAt:Date.now()});
}
export type Rect={x:number;y:number;width:number;height:number};
export function listLayout(size:ListSize){
 if(size==='wide')return {width:1920,height:1080,kv:{x:0,y:0,width:1000,height:1080},title:{x:443,y:148,width:1413,height:244},slots:sourceLayout.slots};
 return {width:1200,height:1200,kv:{x:0,y:140,width:300,height:324},title:{x:330,y:140,width:830,height:225},slots:Array.from({length:12},(_,i)=>{const x=82+(i%4)*263,y=485+Math.floor(i/4)*222;return {x,y,width:245,height:210,logo:{x:x+42,y:y+15,width:160,height:143},name:{x:x+7,y:y+170,width:225,height:31}};})};
}
export function teamListSubtitle(snapshot:PublishedList){return [snapshot.design.subtitle,snapshot.groupName,snapshot.pages>1?`${snapshot.page+1}/${snapshot.pages}`:''].filter(Boolean).join(' • ');}
export function displayTeamName(team:ListTeam,design:ListDesign){return design.nameMode==='short'?(team.abbreviation||team.name):team.name;}

export function listBackground(design:ListDesign,size:ListSize){return size==='square'?(design.squareBackground||templateRoot+'/background-square.png'):(design.background||templateRoot+'/background.png');}

export async function drawTeamList(snapshot:PublishedList,size:ListSize):Promise<HTMLCanvasElement>{
 const layout=listLayout(size),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Trình duyệt không hỗ trợ xuất ảnh.');
 await document.fonts.ready;await document.fonts.load('900 20px GFF');
 const load=async(src:string)=>{const image=new Image();image.src=src;await image.decode();return image;};
 const sources=[listBackground(snapshot.design,size),snapshot.design.kv||templateRoot+'/kv.png',templateRoot+'/title-plate.png',...snapshot.teams.map((_,i)=>templateRoot+'/card-'+i+'.png'),...snapshot.teams.filter(t=>t.logo).map(t=>t.logo)];
 const images=new Map(await Promise.all([...new Set(sources)].map(async src=>[src,await load(src)] as const)));
 const image=(src:string,rect:Rect,fit:'fill'|'contain'='fill')=>{const img=images.get(src)!;if(fit==='fill'){ctx.drawImage(img,rect.x,rect.y,rect.width,rect.height);return;}const scale=Math.min(rect.width/img.width,rect.height/img.height);ctx.drawImage(img,rect.x+(rect.width-img.width*scale)/2,rect.y+(rect.height-img.height*scale)/2,img.width*scale,img.height*scale);};
 image(sources[0],{x:0,y:0,width:layout.width,height:layout.height});image(templateRoot+'/title-plate.png',layout.title);
 const text=(value:string,rect:Rect,fontSize:number,color:string)=>{ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';let n=fontSize;do{ctx.font=`900 ${n}px GFF, Arial, sans-serif`;if(ctx.measureText(value).width<=rect.width)break;n--;}while(n>7);ctx.fillText(value,rect.x+rect.width/2,rect.y+rect.height/2,rect.width);};
 const tr=layout.title;text(snapshot.design.title,{x:tr.x+60,y:tr.y+30,width:tr.width-120,height:tr.height*.46},size==='wide'?66:43,snapshot.design.titleColor);text(teamListSubtitle(snapshot),{x:tr.x+70,y:tr.y+tr.height*.56,width:tr.width-140,height:tr.height*.28},size==='wide'?34:24,snapshot.design.accent);
 if(snapshot.design.showKv)image(sources[1],layout.kv,'contain');
 snapshot.teams.forEach((team,i)=>{const slot=layout.slots[i];if(snapshot.design.showCards)image(templateRoot+'/card-'+i+'.png',slot);const r=slot.logo,f=snapshot.design.logoScale;const rect={x:r.x+r.width*(1-f)/2,y:r.y+r.height*(1-f)/2,width:r.width*f,height:r.height*f};if(team.logo)image(team.logo,rect,'contain');text(displayTeamName(team,snapshot.design),slot.name,size==='wide'?15:19,snapshot.design.nameColor);});return canvas;
}
