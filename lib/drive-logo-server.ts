import {parseDriveFolder,parsePublicDriveImages,readBounded,type DriveImage} from './drive-team-logos.ts';
export async function driveFetch(url:URL,fetcher:typeof fetch=fetch){
 for(let i=0;i<6;i++){
  // Fetch only Google-owned download hosts, including every redirect hop.
  if(url.protocol!=='https:'||url.username||url.password||url.port||!['drive.google.com','drive.usercontent.google.com'].includes(url.hostname)&&!url.hostname.endsWith('.googleusercontent.com'))throw Error('Drive chuyển tới địa chỉ tải không được hỗ trợ.');
  const r=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  if([301,302,303,307,308].includes(r.status)){const target=r.headers.get('location');await r.body?.cancel();if(!target)throw Error('Drive không trả địa chỉ tải.');url=new URL(target,url);continue;}
  if(!r.ok){await r.body?.cancel();throw Error('Không đọc được Drive (HTTP '+r.status+'). Kiểm tra quyền xem thư mục và ảnh.');}return r;
 }
 throw Error('Drive chuyển hướng quá nhiều lần.');
}
export async function listPublicDriveImages(folderUrl:string,fetcher:typeof fetch=fetch){
 const folder=parseDriveFolder(folderUrl),url=new URL('https://drive.google.com/embeddedfolderview');url.searchParams.set('id',folder.id);if(folder.resourceKey)url.searchParams.set('resourcekey',folder.resourceKey);
 const response=await driveFetch(url,fetcher),html=new TextDecoder().decode(await readBounded(response,4*1024*1024)),files=parsePublicDriveImages(html);
 if(!files.length)throw Error('Không tìm thấy ảnh trong thư mục. Đặt quyền “Bất kỳ ai có đường liên kết” cho thư mục và ảnh; đặt ảnh trực tiếp trong thư mục, không để trong thư mục con.');
 if(files.length>300)throw Error('Thư mục quá nhiều ảnh. Dùng thư mục riêng tối đa 300 ảnh cho giải.');return files;
}
export async function downloadDriveImage(file:DriveImage,fetcher:typeof fetch=fetch){const url=new URL('https://drive.usercontent.google.com/download');url.searchParams.set('id',file.id);url.searchParams.set('export','download');if(file.resourceKey)url.searchParams.set('resourcekey',file.resourceKey);return readBounded(await driveFetch(url,fetcher),10*1024*1024);}
