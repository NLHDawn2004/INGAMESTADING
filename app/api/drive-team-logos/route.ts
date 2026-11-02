import {env} from 'cloudflare:workers';
import {authenticated,sameOrigin} from '../../../lib/auth';
import {listPublicDriveImages,downloadDriveImage} from '../../../lib/drive-logo-server';
import {driveImageType} from '../../../lib/drive-team-logos';
export async function POST(request:Request){
 if(!await authenticated())return Response.json({error:'Cần đăng nhập.'},{status:401});if(!sameOrigin(request))return Response.json({error:'Yêu cầu không hợp lệ.'},{status:403});
 try{
  const text=await request.text();if(text.length>20000)throw Error('Yêu cầu quá lớn.');const body=JSON.parse(text) as {folderUrl?:unknown;fileIds?:unknown};if(typeof body.folderUrl!=='string'||body.folderUrl.length>1000)throw Error('Dán link thư mục Google Drive.');
  const files=await listPublicDriveImages(body.folderUrl);
  if(body.fileIds===undefined)return Response.json({files},{headers:{'Cache-Control':'no-store'}});
  if(!Array.isArray(body.fileIds)||body.fileIds.length<1||body.fileIds.length>100||body.fileIds.some(id=>typeof id!=='string')||new Set(body.fileIds).size!==body.fileIds.length)throw Error('Chọn từ 1 đến 100 ảnh khác nhau.');
  const selected=body.fileIds.map(id=>{const file=files.find(f=>f.id===id);if(!file)throw Error('Ảnh không còn trong thư mục. Đọc lại thư mục.');return file;});
  const logos:Record<string,string>={},errors:Array<{id:string;name:string;error:string}>=[];
  // Limit parallel downloads so a large roster does not exhaust Worker memory.
  let index=0;await Promise.all(Array.from({length:Math.min(3,selected.length)},async()=>{while(index<selected.length){const file=selected[index++];try{const data=await downloadDriveImage(file),contentType=driveImageType(data),key=crypto.randomUUID();await env.BUCKET!.put(key,data,{httpMetadata:{contentType}});logos[file.id]='/api/media/'+key;}catch(e){errors.push({id:file.id,name:file.name,error:e instanceof Error?e.message:'Không tải được ảnh.'});}}}));
  return Response.json({logos,errors},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Không đọc được thư mục Drive.'},{status:400});}
}
