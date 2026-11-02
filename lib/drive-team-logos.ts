import type {StudioState} from './state';
export type DriveImage={id:string;name:string;resourceKey?:string};
export type LogoTeam={id:string;name:string;abbreviation?:string};
const idPattern=/^[A-Za-z0-9_-]{10,200}$/;
export function parseDriveFolder(value:string){
 let url:URL;try{url=new URL(value.trim());}catch{throw Error('Dán link thư mục Google Drive.');}
 if(url.protocol!=='https:'||url.hostname!=='drive.google.com'||url.username||url.password||url.port)throw Error('Dùng link https://drive.google.com/drive/folders/...');
 const id=url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/)?.[1]||(url.pathname==='/open'?url.searchParams.get('id'):null);
 if(!id||!idPattern.test(id))throw Error('Link cần trỏ tới thư mục Drive, không phải một ảnh.');
 const resourceKey=url.searchParams.get('resourcekey')||'';if(resourceKey&&!idPattern.test(resourceKey))throw Error('Resource key của Drive không hợp lệ.');
 return {id,resourceKey};
}
function decodeHtml(value:string){return value.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n:string)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&(amp|quot|apos|lt|gt|nbsp);/g,(_,key:string)=>({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[key]!));}
export function parsePublicDriveImages(html:string):DriveImage[]{
 const images=new Map<string,DriveImage>();
 for(const anchor of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi)){
  let url:URL;try{url=new URL(decodeHtml(anchor[1]),'https://drive.google.com');}catch{continue;}
  if(url.hostname!=='drive.google.com')continue;
  const id=url.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)(?:\/|$)/)?.[1]||(url.pathname==='/open'?url.searchParams.get('id'):null);
  const name=decodeHtml(anchor[2].replace(/<[^>]+>/g,'')).trim();
  if(!id||!idPattern.test(id)||!name||name.length>300||! /\.(png|jpe?g|webp|gif)$/i.test(name))continue;
  const resourceKey=url.searchParams.get('resourcekey')||undefined;if(resourceKey&&!idPattern.test(resourceKey))continue;
  images.set(id,{id,name,resourceKey});
 }
 return [...images.values()];
}
export function logoNameKey(value:string){return value.replace(/\.(png|jpe?g|webp|gif)$/i,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[\s_-]+/g,'');}
export function matchDriveLogos(files:DriveImage[],teams:LogoTeam[]){
 const matches:Array<{teamId:string;file:DriveImage}>=[],missing:LogoTeam[]=[],ambiguous:LogoTeam[]=[];
 for(const team of teams){const keys=[logoNameKey(team.name),team.abbreviation?logoNameKey(team.abbreviation):''].filter(Boolean);const found=files.filter(f=>keys.includes(logoNameKey(f.name)));
  if(!found.length)missing.push(team);else if(found.length!==1||teams.filter(t=>[t.name,t.abbreviation||''].some(n=>logoNameKey(n)===logoNameKey(found[0].name))).length!==1)ambiguous.push(team);else matches.push({teamId:team.id,file:found[0]});
 }
 return {matches,missing,ambiguous};
}
export function applyDriveTeamLogos(state:StudioState,logos:Record<string,string>):StudioState{return {...state,teams:state.teams.map(t=>logos[t.id]?{...t,logo:logos[t.id]}:t),scoreboards:{...state.scoreboards,boards:state.scoreboards.boards.map(b=>({...b,teams:b.teams.map(t=>logos[t.id]?{...t,logo:logos[t.id]}:t)}))}};}
export async function readBounded(response:Response,maxBytes:number){
 if(Number(response.headers.get('content-length'))>maxBytes)throw Error('File Drive vượt giới hạn cho phép.');
 if(!response.body)throw Error('Drive trả dữ liệu rỗng.');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw Error('File Drive vượt giới hạn cho phép.');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}return data;
}
export function driveImageType(data:Uint8Array){if(data.length>=8&&data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71)return 'image/png';if(data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255)return 'image/jpeg';if(data.length>=12&&new TextDecoder().decode(data.slice(0,4))==='RIFF'&&new TextDecoder().decode(data.slice(8,12))==='WEBP')return 'image/webp';if(data.length>=6&&/^GIF8[79]a$/.test(new TextDecoder().decode(data.slice(0,6))))return 'image/gif';throw Error('File không phải ảnh PNG, JPG, WebP hoặc GIF.');}
