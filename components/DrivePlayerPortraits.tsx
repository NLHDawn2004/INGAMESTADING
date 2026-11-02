'use client';
import {useEffect,useRef,useState} from 'react';
import {parseDriveFolder,type DriveImage} from '../lib/drive-team-logos';
import {matchDrivePortraits,type PortraitPlayer} from '../lib/drive-player-portraits';

type Props={folderUrl:string;players:Array<PortraitPlayer&{portrait?:string}>;portraits:Record<string,string>;disabled:boolean;onBusy:(busy:boolean)=>void;onApply:(folder:string,photos:Record<string,string>)=>Promise<boolean>;notify:(message:string)=>void};
type DriveResponse={files?:DriveImage[];logos?:Record<string,string>;errors?:Array<{name:string;error:string}>;error?:string};
async function request(body:object):Promise<DriveResponse>{
 const response=await fetch('/api/drive-team-logos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 let data:DriveResponse;try{data=await response.json() as DriveResponse;}catch{throw Error('Không đọc được phản hồi Drive. Thử lại sau.');}
 if(!response.ok)throw Error(data.error||'Không đọc được thư mục Drive.');return data;
}
export default function DrivePlayerPortraits({folderUrl,players,portraits,disabled,onBusy,onApply,notify}:Props){
 const [folder,setFolder]=useState(folderUrl);const [working,setWorking]=useState(false);const [status,setStatus]=useState('');const [missing,setMissing]=useState<string[]>([]);const [ambiguous,setAmbiguous]=useState<string[]>([]);const [errors,setErrors]=useState<string[]>([]);
 const lock=useRef(false),dirty=useRef(false),attempted=useRef('');
 const valid=players.filter(p=>/^\d{1,24}$/.test(p.playerId));const rosterKey=valid.map(p=>p.playerId).sort().join(',');
 useEffect(()=>{if(!dirty.current)setFolder(folderUrl);},[folderUrl]);
 async function importPhotos(url=folder,roster=valid){
  if(lock.current||disabled)return;
  url=url.trim();
  try{parseDriveFolder(url);}catch(error){notify((error as Error).message);return;}
  if(!roster.length){notify('Kết nối trận có player ID thật trước khi lấy ảnh từ Drive.');return;}
  lock.current=true;setWorking(true);onBusy(true);attempted.current=url+'|'+rosterKey;setMissing([]);setAmbiguous([]);setErrors([]);setStatus('Đang tìm ảnh theo player ID…');
  try{
   const listed=await request({folderUrl:url});if(!Array.isArray(listed.files))throw Error('Drive không trả danh sách ảnh hợp lệ.');
   const result=matchDrivePortraits(listed.files,roster);
   setMissing(result.missing.map(p=>p.name+' · ID '+p.playerId));setAmbiguous(result.ambiguous.map(p=>p.name+' · ID '+p.playerId));
   const photos:Record<string,string>={};let failures:Array<{name:string;error:string}>=[];
   if(result.matches.length){
    setStatus('Đang tải '+result.matches.length+' ảnh khớp đúng ID…');
    const imported=await request({folderUrl:url,fileIds:result.matches.map(m=>m.file.id)});
    for(const match of result.matches){const path=imported.logos?.[match.file.id];if(typeof path==='string'&&/^\/api\/media\/[a-f0-9-]+$/.test(path))photos[match.player.playerId]=path;else if(!imported.errors?.some(error=>error.name===match.file.name))failures.push({name:match.file.name,error:'Máy chủ chưa trả ảnh hợp lệ.'});}
    failures=[...failures,...(imported.errors||[])];setErrors(failures.map(error=>error.name+': '+error.error));
   }
   if(!await onApply(url,Object.fromEntries(Object.entries(photos))))throw Error('Chưa lưu được ảnh và link Drive. Bấm lấy ảnh lại sau khi đồng bộ.');
   dirty.current=false;setFolder(url);setStatus('Đã lưu '+Object.keys(photos).length+'/'+roster.length+' ảnh theo ID. Ảnh thiếu hoặc trùng được giữ nguyên.');
   if(Object.keys(photos).length)notify('Ảnh Drive đã hiện ở xem trước. Bật lại từng overlay để cập nhật ảnh trên OBS.');
  }catch(error){const message=(error as Error).message;setStatus(message);notify(message);}finally{lock.current=false;setWorking(false);onBusy(false);}
 }
 useEffect(()=>{
  if(!folderUrl||!rosterKey||disabled||lock.current)return;
  const key=folderUrl+'|'+rosterKey;if(attempted.current===key)return;attempted.current=key;
  const needed=valid.filter(p=>!(portraits[p.playerId]??p.portrait));if(needed.length)void importPhotos(folderUrl,needed);
 // Scan once per saved folder and roster. Live polling must not repeatedly download missing files.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[folderUrl,rosterKey,disabled]);
 return <details className="compact-section "><summary>Google Drive</summary><div className="compact-section-content"><div className="drive-player-portraits"><h3>Ảnh tuyển thủ từ Google Drive</h3>
  <label>Link thư mục ảnh tuyển thủ<input aria-label="Link thư mục ảnh tuyển thủ" type="url" maxLength={1000} value={folder} disabled={disabled||working} placeholder="https://drive.google.com/drive/folders/…" onChange={e=>{dirty.current=true;setFolder(e.target.value);setStatus('');}}/></label>
  <button type="button" className="button primary" disabled={disabled||working||!folder.trim()||!valid.length} onClick={()=>void importPhotos()}>{working?'Đang ghép ảnh theo ID…':'Lấy / cập nhật ảnh theo ID'}</button>


  {!valid.length&&null}
  {status&&<p role="status">{status}</p>}
  {missing.length>0&&<p className="drive-logo-warning">Chưa tìm thấy ảnh: {missing.join('; ')}.</p>}
  {ambiguous.length>0&&<p className="drive-logo-warning">Có nhiều ảnh cùng ID, chưa gán: {ambiguous.join('; ')}.</p>}
  {errors.length>0&&<ul className="drive-logo-warning">{errors.map((error,i)=><li key={i}>{error}</li>)}</ul>}
 </div></div></details>;
}
