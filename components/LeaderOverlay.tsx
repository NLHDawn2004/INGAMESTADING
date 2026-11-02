'use client';
import type {CSSProperties} from 'react';
import OverlayTransition from './OverlayTransition';
import {fontStack} from '../lib/typography';
import {defaultLeaderDesign,leaderFields,rankDamage,rankElims,type LeaderDesign,type PlayerLeaderSnapshot} from '../lib/player-leaders';
type Props={kind:'elims'|'damage';data:PlayerLeaderSnapshot|null|undefined;design?:LeaderDesign};
export default function LeaderOverlay(props:Props){
 const visible=!!props.design||!!props.data&&props.data.onAir!==false;
 const identity=visible?`${props.kind}:${props.design?'preview':props.data?.publishedAt??'preview'}:${(props.design||props.data?.design)?.background??''}`:null;
 return <OverlayTransition replaceImmediately identity={identity}>{visible?<LeaderContent {...props}/>:null}</OverlayTransition>;
}
function LeaderContent({kind,data,design:previewDesign}:Props){
 const source=data;
 const design=previewDesign||source?.design||defaultLeaderDesign();
 if((!previewDesign&&(!source||source.onAir===false))||!design.background)return <main className="player-leader-overlay"/>;
 const players=source?(kind==='damage'?rankDamage(source.players):rankElims(source.players)).slice(0,5):[];
 // Only split the bundled video KV: uploaded artwork may have a different layout.
 const videoKV=/^\/player-templates\/video-(elims|damage)-v2\.png$/.test(design.background);
 const fields=leaderFields.filter(key=>design.fields[key]?.visible&&key!==(kind==='elims'?'damage':'elims')).map(key=>design.fields[key]);
 const rowWidth=Math.max(videoKV?440:8,...fields.map(field=>field.x+field.width));
 const rowHeight=Math.max(videoKV?86:8,...fields.map(field=>field.y+field.height));
 return <main className="player-leader-overlay" data-row-style={videoKV?'separated':'connected'} style={{fontFamily:fontStack(design.font),color:design.color}}>
  <div className="leader-presentation" key={`${kind}:${previewDesign?'preview':source?.publishedAt??'preview'}`}>
   {videoKV?<div className="leader-header-motion"><img className="leader-kv leader-kv-header" src={design.background} alt=""/></div>:<img className="leader-kv" src={design.background} alt=""/>}
   <section aria-label={kind==='damage'?'Top 5 Damage':'Top 5 Elim'}>
    {players.map((p,i)=><article className="leader-data-row" key={i} style={{left:design.x+i*design.stepX,top:design.y+i*design.stepY,width:rowWidth,height:rowHeight,'--row-delay':`${1000+i*500}ms`} as CSSProperties}>
     {videoKV&&<div className="leader-row-art" aria-hidden="true" style={{backgroundImage:`url("${design.background}")`,backgroundPosition:`-1478px -${368+i*103}px`}}/>}
     {leaderFields.map(key=>{if((key==='damage'&&kind==='elims')||(key==='elims'&&kind==='damage'))return null;const field=design.fields[key];if(!field?.visible)return null;
      const value=key==='rank'?'#'+(i+1):key==='team'?p.teamName:key==='name'?p.name:key==='elims'?String(p.kills).padStart(2,'0'):key==='damage'?String(p.damage):'';
      const size=(key==='damage'||key==='elims')?Math.min(field.size,field.width/(Math.max(value.length,1)*.65)):field.size;
      const style:CSSProperties={left:field.x,top:field.y,width:field.width,height:field.height,fontSize:size,fontWeight:design.weight,color:field.color||design.color,textAlign:field.align,justifyContent:field.align==='left'?'flex-start':field.align==='right'?'flex-end':'center'};
      const image=key==='logo'?p.logo:key==='portrait'?p.portrait:undefined;
      return <div className={'leader-data-field leader-field-'+key} style={style} key={key}>{key==='logo'||key==='portrait'?(image?<img src={image} alt={key==='logo'?p.teamName:p.name}/>:null):<span>{value}</span>}</div>;
     })}
    </article>)}
   </section>
  </div>
 </main>;
}
