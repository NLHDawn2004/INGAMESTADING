'use client';
import {useRef,useState} from 'react';
import {leaderFields,type LeaderDesign,type LeaderField} from '../lib/player-leaders';
import {detectLeaderTemplate,applyLeaderTemplate} from '../lib/leader-template';
import {fontFamilies} from '../lib/typography';
import {MAX_UPLOAD_BYTES,readUploadResponse} from '../lib/upload-response';
const labels:Record<LeaderField,string>={rank:'Thứ hạng',logo:'Logo đội',portrait:'Ảnh người chơi',team:'Tên đội',name:'Tên thành viên',elims:'ELIMS',damage:'DAMAGE'};
export default function LeaderDesignControls({value,onChange,onSave,disabled,notify,onSample,sampleURL}:{value:LeaderDesign;onChange:(value:LeaderDesign)=>void;onSave:()=>void;disabled:boolean;notify:(message:string)=>void;onSample:()=>void;sampleURL:string}){
 const [field,setField]=useState<LeaderField>('name');const [uploading,setUploading]=useState(false);const lock=useRef(false);const selected=value.fields[field];const isImage=field==='logo'||field==='portrait';const visibleFields=leaderFields.filter(key=>key!==(sampleURL.includes('damage')?'elims':'damage'));
 function number(label:string,current:number,min:number,max:number,update:(n:number)=>void){return <label>{label}<input type="number" min={min} max={max} value={current} disabled={disabled||uploading} onChange={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n))update(Math.max(min,Math.min(max,n)));}}/></label>;}
 function patchField(patch:Partial<typeof selected>){onChange({...value,fields:{...value.fields,[field]:{...selected,...patch}}});}
 async function upload(file:File|undefined){if(!file||lock.current)return;lock.current=true;setUploading(true);try{
  if(!/\.(png|jpe?g|webp)$/i.test(file.name))throw Error('Chọn PNG, JPG hoặc WebP.');if(file.size>MAX_UPLOAD_BYTES)throw Error('Ảnh tối đa 10 MB.');
  const template=await detectLeaderTemplate(new Uint8Array(await file.arrayBuffer()));
  if(template){onChange(applyLeaderTemplate(value,template));notify('Đã nhận mẫu video và căn logo, ảnh người chơi, tên, chỉ số.');return;}
  const form=new FormData();form.append('file',file);const url=await readUploadResponse(await fetch('/api/upload',{method:'POST',body:form}));
  onChange({...value,background:url});notify(template?'Đã nhận KV mẫu và căn đúng toàn bộ dữ liệu. Lưu rồi bật overlay để cập nhật OBS.':'Đã thêm KV. Căn dữ liệu trên ảnh rồi lưu và bật overlay.');
 }catch(error){notify((error as Error).message);}finally{lock.current=false;setUploading(false);}}
 return <details className="leader-design-controls compact-section" ><summary>KV & vị trí dữ liệu</summary><div className="compact-section-content"><div className="player-leader-actions"><button className="button secondary" disabled={disabled||uploading} onClick={onSample}>Dùng mẫu như video</button><a className="button secondary" href={sampleURL} download>Tải PNG mẫu</a></div><label>Ảnh KV · PNG / JPG / WebP · tối đa 10 MB<input type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled||uploading} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>{uploading&&<p role="status">Đang tải KV…</p>}{value.background&&<button className="button secondary" disabled={disabled||uploading} onClick={()=>{onChange(applyLeaderTemplate(value,sampleURL.includes('damage')?'damage':'elims'));notify('Đã căn dữ liệu vào KV video đang dùng. Lưu rồi bật overlay để cập nhật OBS.');}}>Căn theo mẫu video</button>}{value.background&&<button className="button secondary" disabled={disabled||uploading} onClick={()=>onChange({...value,background:''})}>Bỏ KV</button>}<div className="leader-design-grid">
   {number('X người đầu',value.x,0,1920,n=>onChange({...value,x:n}))}{number('Y người đầu',value.y,0,1080,n=>onChange({...value,y:n}))}
   {number('Khoảng cách ngang',value.stepX,0,1920,n=>onChange({...value,stepX:n}))}{number('Khoảng cách dọc',value.stepY,0,1080,n=>onChange({...value,stepY:n}))}
   <label>Font chữ<select value={value.font} disabled={disabled||uploading} onChange={e=>onChange({...value,font:e.target.value as LeaderDesign['font']})}>{fontFamilies.map(font=><option key={font}>{font}</option>)}</select></label>
   <label>Màu chữ<input type="color" value={value.color} disabled={disabled||uploading} onChange={e=>onChange({...value,color:e.target.value})}/></label>
   <label>Độ đậm<select value={value.weight} disabled={disabled||uploading} onChange={e=>onChange({...value,weight:Number(e.target.value)})}>{[400,500,600,700,800,900].map(weight=><option key={weight}>{weight}</option>)}</select></label>
  </div><details className="compact-section"><summary>Căn từng vùng dữ liệu</summary><div className="compact-section-content"><label>Vùng dữ liệu<select value={field} onChange={e=>setField(e.target.value as LeaderField)}>{visibleFields.map(key=><option value={key} key={key}>{labels[key]}</option>)}</select></label><label className="leader-visible"><input type="checkbox" checked={selected.visible} disabled={disabled||uploading} onChange={e=>patchField({visible:e.target.checked})}/> Hiện {labels[field]}</label><div className="leader-design-grid">
    {number('X',selected.x,-1920,1920,n=>patchField({x:n}))}{number('Y',selected.y,-1080,1080,n=>patchField({y:n}))}
    {number('Rộng',selected.width,8,1920,n=>patchField({width:n}))}{number('Cao',selected.height,8,1080,n=>patchField({height:n}))}
    {!isImage&&number('Cỡ chữ',selected.size,8,200,n=>patchField({size:n}))}{!isImage&&<label>Màu vùng này<input type="color" value={selected.color||value.color} disabled={disabled||uploading} onChange={e=>patchField({color:e.target.value})}/></label>}
    {!isImage&&<label>Căn chữ<select value={selected.align} disabled={disabled||uploading} onChange={e=>patchField({align:e.target.value as typeof selected.align})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>}
   </div></div></details><button className="button secondary" disabled={disabled||uploading} onClick={onSave}>Lưu KV & bố cục</button></div></details>;
}
