'use client';
import type {OverlayRegion} from '../lib/overlay-layout';
export default function OverlayRegionControls({label,value,onChange,disabled=false}:{label:string;value:OverlayRegion;onChange:(value:OverlayRegion)=>void;disabled?:boolean}){
 function change(key:keyof OverlayRegion,n:number){if(!Number.isFinite(n))return;const next={...value,[key]:Math.max(key==='width'||key==='height'?40:0,n)};next.x=Math.min(1880,next.x);next.y=Math.min(1040,next.y);next.width=Math.min(next.width,1920-next.x);next.height=Math.min(next.height,1080-next.y);onChange(next);}
 return <fieldset className="overlay-region-controls" disabled={disabled}><legend>{label}</legend><div className="template-number-fields">{([['x','Vị trí ngang'],['y','Vị trí dọc'],['width','Chiều rộng'],['height','Chiều cao']] as const).map(([key,name])=><label key={key}>{name}<input aria-label={label+' · '+name} type="number" min={key==='width'||key==='height'?40:0} max={key==='x'||key==='width'?1920:1080} value={Math.round(value[key])} onChange={e=>change(key,e.target.valueAsNumber)}/></label>)}</div></fieldset>;
}
