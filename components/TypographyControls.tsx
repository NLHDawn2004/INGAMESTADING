'use client';
import {useEffect,useId,useState} from 'react';
import {fontFamilies,fontStack,typographyRegions,textSettings,weightsForFont,type TypographyKind,type TypographySettings,type TextRole} from '../lib/typography';

const sizes=[8,9,10,11,12,14,16,18,20,22,24,26,28,30,32,36,40,44,48,54,60,66,72,80,84,96,108,120,132,144,156,168,180,192,204,216,228,240,252,264,276,288];
export default function TypographyControls({kind,value,onChange,disabled=false}:{kind:TypographyKind;value?:TypographySettings;onChange:(value:TypographySettings)=>void;disabled?:boolean}){
 const [selected,setSelected]=useState<TextRole>(typographyRegions[kind][0].key);const id=useId();
 const role=typographyRegions[kind].some(r=>r.key===selected)?selected:typographyRegions[kind][0].key;
 const current=textSettings(kind,role,value);const weights=weightsForFont(current.family);
 const [sizeDraft,setSizeDraft]=useState(String(current.size));
 useEffect(()=>setSizeDraft(String(current.size)),[role,current.size]);
 function patch(change:Partial<typeof current>){onChange({...value,[role]:{...value?.[role],family:current.family,weight:current.weight,...change}});}
 return <details className="compact-section compact-fieldset"><summary>Chữ trên overlay</summary><div className="compact-section-content"><fieldset className="typography-controls" disabled={disabled}><legend>Chữ trên overlay</legend>
  <label>Vùng chữ<select aria-label="Vùng chữ" value={role} onChange={e=>setSelected(e.target.value as TextRole)}>{typographyRegions[kind].map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select></label>
  <div className="typography-toolbar"><label className="typography-family">Font chữ<select aria-label="Font chữ" value={current.family} onChange={e=>{const family=e.target.value as typeof current.family;const options=weightsForFont(family);patch({family,weight:options.some(w=>w.value===current.weight)?current.weight:options.at(-1)!.value});}}>{fontFamilies.map(family=><option key={family} value={family} style={{fontFamily:fontStack(family)}}>{family}</option>)}</select></label>
   <label>Độ dày<select aria-label="Độ dày chữ" value={current.weight} onChange={e=>patch({weight:Number(e.target.value)})}>{weights.map(weight=><option key={weight.value} value={weight.value}>{weight.label}</option>)}</select></label>
   <label>Cỡ chữ (px)<input aria-label="Cỡ chữ" type="number" min={8} max={288} step={1} list={id} value={sizeDraft} onBlur={()=>setSizeDraft(String(current.size))} onChange={e=>{setSizeDraft(e.target.value);const size=Number(e.target.value);if(size>=8&&size<=288)patch({size});}}/><datalist id={id}>{sizes.map(size=><option key={size} value={size}/>)}</datalist></label>
  </div>
  <div className="typography-sample" style={{fontFamily:fontStack(current.family),fontWeight:current.weight,fontSize:Math.min(current.size,40)}}>Aa · TÊN ĐỘI · 0123456789</div>

  <div className="typography-actions"><button type="button" className="button secondary" onClick={()=>{const next={...value};for(const region of typographyRegions[kind])next[region.key]={...value?.[region.key],family:current.family,weight:current.weight};onChange(next);}}>Dùng font & độ dày cho mọi chữ</button><button type="button" className="plain-button" onClick={()=>onChange({})}>Khôi phục chữ mặc định</button></div>
 </fieldset></div></details>;
}
