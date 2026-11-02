'use client';
import {useEffect,useRef,useState} from 'react';
import type {PlayerLeaderRow} from '../lib/player-leaders';
import DrivePlayerPortraits from './DrivePlayerPortraits';
import {MAX_UPLOAD_BYTES,readUploadResponse} from '../lib/upload-response';

export default function PlayerPortraitControls({players,portraits,onChange,disabled,notify,folderUrl,onDriveApply,onBusy}:{players:PlayerLeaderRow[];portraits:Record<string,string>;onChange:(id:string,url:string)=>Promise<boolean>;disabled:boolean;notify:(message:string)=>void;folderUrl:string;onDriveApply:(url:string,photos:Record<string,string>)=>Promise<boolean>;onBusy:(busy:boolean)=>void}){
 const [selected,setSelected]=useState('');const [uploading,setUploading]=useState(false);const lock=useRef(false);
 useEffect(()=>{if(!players.some(p=>p.playerId===selected))setSelected(players[0]?.playerId||'');},[players,selected]);
 const player=players.find(p=>p.playerId===selected);const portrait=player?(portraits[player.playerId]??player.portrait??''):'';
 async function upload(file:File|undefined){if(!file||!player||lock.current)return;lock.current=true;setUploading(true);try{
  if(!/\.(png|jpe?g|webp)$/i.test(file.name)||file.size>MAX_UPLOAD_BYTES)throw Error('Chọn PNG/JPG/WebP tối đa 10 MB.');
  const id=player.playerId;const form=new FormData();form.append('file',file);const url=await readUploadResponse(await fetch('/api/upload',{method:'POST',body:form}));
  if(await onChange(id,url))notify('Đã lưu ảnh tuyển thủ. Bật lại overlay để cập nhật ảnh trên OBS.');
 }catch(error){notify((error as Error).message);}finally{lock.current=false;setUploading(false);}}
 return <details className="leader-portraits compact-section" ><summary>Ảnh người chơi & logo đội</summary><div className="compact-section-content"><DrivePlayerPortraits folderUrl={folderUrl} players={players} portraits={portraits} disabled={disabled} onApply={onDriveApply} onBusy={onBusy} notify={notify}/>{!players.length?null:<>
   <label>Tuyển thủ<select aria-label="Tuyển thủ" value={selected} disabled={disabled||uploading} onChange={e=>setSelected(e.target.value)}>{players.map(p=><option key={p.playerId} value={p.playerId}>{p.teamName} · {p.name} · ID {p.playerId}</option>)}</select></label>
   <label>Player ID<input aria-label="Player ID" readOnly value={player?.playerId||''} onFocus={e=>e.target.select()}/></label><div className="leader-portrait-assets"><div><span>Logo đội</span>{player?.logo?<img src={player.logo} alt="Logo đội"/>:null}</div><div><span>Ảnh người chơi</span>{portrait?<img src={portrait} alt="Ảnh người chơi"/>:<p>Chưa có ảnh</p>}</div></div>
   <label>Tải ảnh người chơi<input aria-label="Tải ảnh người chơi" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||uploading||!selected} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
   {uploading&&<p role="status">Đang tải ảnh tuyển thủ…</p>}
   {portrait&&<button className="button secondary" disabled={disabled||uploading} onClick={()=>void onChange(selected,'')}>Bỏ ảnh người chơi</button>}
  </>}</div></details>;
}
