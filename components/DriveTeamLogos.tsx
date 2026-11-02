'use client';
import {useState} from 'react';
import {CloudDownload} from 'lucide-react';
import {matchDriveLogos,parseDriveFolder,type DriveImage,type LogoTeam} from '../lib/drive-team-logos';
type Props={folderUrl:string;onFolderChange:(url:string)=>void;teams:LogoTeam[];teamIds:string[];disabled:boolean;onBusy:(busy:boolean)=>void;onApply:(logos:Record<string,string>)=>void;notify:(message:string)=>void};
async function responseJson(response:Response){const text=await response.text();let data:{files?:DriveImage[];logos?:Record<string,string>;errors?:Array<{name:string;error:string}>;error?:string};try{data=JSON.parse(text);}catch{throw Error('Không đọc được phản hồi máy chủ (HTTP '+response.status+'). Thử lại sau.');}if(!response.ok)throw Error(data.error||'Không đọc được Drive (HTTP '+response.status+').');return data;}
export default function DriveTeamLogos({folderUrl,onFolderChange,teams,teamIds,disabled,onBusy,onApply,notify}:Props){
 const [working,setWorking]=useState(false),[status,setStatus]=useState(''),[missing,setMissing]=useState<string[]>([]),[ambiguous,setAmbiguous]=useState<string[]>([]),[errors,setErrors]=useState<string[]>([]);
 async function importLogos(){if(disabled||working)return;try{parseDriveFolder(folderUrl);}catch(e){notify((e as Error).message);return;}if(!teamIds.length){notify('Chọn bảng có danh sách đội trước khi lấy logo.');return;}
  setWorking(true);onBusy(true);setMissing([]);setAmbiguous([]);setErrors([]);setStatus('Đang đọc ảnh trong thư mục Drive…');
  try{
   const scan=await responseJson(await fetch('/api/drive-team-logos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({folderUrl})}));if(!Array.isArray(scan.files))throw Error('Drive không trả danh sách ảnh hợp lệ.');
   const roster=new Set(teamIds),result=matchDriveLogos(scan.files,teams),matches=result.matches.filter(m=>roster.has(m.teamId));
   setMissing(result.missing.filter(t=>roster.has(t.id)).map(t=>t.name));setAmbiguous(result.ambiguous.filter(t=>roster.has(t.id)).map(t=>t.name));
   if(!matches.length){setStatus('Chưa có tên file nào khớp duy nhất với đội trong bảng.');notify('Kiểm tra tên file ảnh: ví dụ HVT.png hoặc tên đầy đủ của đội.');return;}
   setStatus('Đang lấy '+matches.length+' logo đã ghép theo tên đội…');
   const imported=await responseJson(await fetch('/api/drive-team-logos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({folderUrl,fileIds:matches.map(m=>m.file.id)})}));
   const logos:Record<string,string>={};for(const match of matches){const url=imported.logos?.[match.file.id];if(typeof url==='string'&&/^\/api\/media\/[a-f0-9-]+$/.test(url))logos[match.teamId]=url;}
   setErrors((imported.errors||[]).map(e=>e.name+': '+e.error));const count=Object.keys(logos).length;
   if(count){onApply(logos);setStatus('Đã gắn '+count+'/'+teamIds.length+' logo vào bảng đang chọn.');notify('Logo Drive đã hiện trong xem trước. Bấm Lưu để giữ lại hoặc Chiếu danh sách để cập nhật OBS.');}else setStatus('Không tải được logo. Xem lỗi bên dưới.');
  }catch(e){const message=(e as Error).message;setStatus(message);notify(message);}finally{setWorking(false);onBusy(false);}
 }
 return <details className="compact-section"><summary>Logo từ Google Drive</summary><div className="compact-section-content"><div className="drive-logo-import"><h3>Logo từ Google Drive</h3><label>Link thư mục ảnh<input type="url" maxLength={1000} placeholder="https://drive.google.com/drive/folders/…" value={folderUrl} disabled={disabled||working} onChange={e=>{onFolderChange(e.target.value);setStatus('');setMissing([]);setAmbiguous([]);setErrors([]);}}/></label><button type="button" className="button primary" disabled={disabled||working||!folderUrl.trim()||!teamIds.length} onClick={()=>void importLogos()}><CloudDownload size={16}/>{working?'Đang lấy logo…':'Lấy logo theo danh sách bảng'}</button>{!teamIds.length&&null}{status&&<p className="drive-logo-status" role="status">{status}</p>}{missing.length>0&&<p className="drive-logo-warning">Chưa tìm thấy ảnh: {missing.join(', ')}.</p>}{ambiguous.length>0&&<p className="drive-logo-warning">Trùng tên ảnh hoặc tên đội, chưa tự ghép: {ambiguous.join(', ')}.</p>}{errors.length>0&&<ul className="drive-logo-warning">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}</div></div></details>;
}
