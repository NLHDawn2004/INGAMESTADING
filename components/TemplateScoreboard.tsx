'use client';
import {useId,type CSSProperties} from 'react';
import ChampionRushCrown from './ChampionRushCrown';
import {formatScoreValue,type PublishedScore} from '../lib/scoreboard';
import {templateCapacity} from '../lib/score-template';
import {fontStack,overlayTextStyle,type TextRole} from '../lib/typography';

export default function TemplateScoreboard({score,page=0}:{score:PublishedScore;page?:number}){
 const clipId='score-art-'+useId().replaceAll(':','');
 const template=score.template!;const capacity=templateCapacity(template);const visible=score.view==='total'?score.rows.slice(0,12):score.rows;const rows=visible.slice(score.view==='total'?0:page*capacity,score.view==='total'?capacity:(page+1)*capacity);
 const nameSize=Math.min(28,...template.groups.map(g=>Math.max(12,(g.statsX-template.nameX-12)/(Math.max(1,...rows.map(r=>r.name.length))*.72))));
 const kind=score.view==='match'?'match':'total';const text=(role:TextRole,size:number)=>({fontSize:size,...overlayTextStyle(kind,role,score.typography)});
 const separated=template.rowStyle==='separated',rowArtwork=template.rowArtwork===true&&!template.inferredRows;
 const holes=template.groups.flatMap(group=>Array.from({length:group.rows},(_,i)=>{const y=group.y+i*group.rowGap;return 'M'+group.x+' '+y+'h'+group.width+'v'+group.rowHeight+'h-'+group.width+'Z';})).join('');

 return <div className="score-broadcast template-broadcast" data-row-style={separated?'separated':'connected'} data-row-artwork={rowArtwork?'rows':'data'} style={{fontFamily:fontStack()}}>{rowArtwork&&<svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}><defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path clipRule="evenodd" d={'M0 0H1920V1080H0Z'+holes}/></clipPath></defs></svg>}<img className="score-template-image" src={template.image} alt="" style={rowArtwork?{clipPath:'url(#'+clipId+')'}:undefined}/>
  {template.subtitleRegion&&<span className="template-subtitle" style={{...text('subtitle',30),left:template.subtitleRegion.x,top:template.subtitleRegion.y,width:template.subtitleRegion.width,height:template.subtitleRegion.height,color:template.numberColor}}>{score.subtitle}</span>}
  <div className="template-data-viewport" style={{position:'absolute',inset:0,...(template.dataRegion?{clipPath:`inset(${template.dataRegion.y}px ${1920-template.dataRegion.x-template.dataRegion.width}px ${1080-template.dataRegion.y-template.dataRegion.height}px ${template.dataRegion.x}px)`}:{})}}>{template.groups.map((group,column)=>{const start=template.groups.slice(0,column).reduce((sum,g)=>sum+g.rows,0);return Array.from({length:group.rows},(_,i)=>{const row=rows[start+i];if(!row)return null;const y=group.y+i*group.rowGap,logoSize=Math.min(template.logoSize,group.rowHeight*.8),crownSize=Math.min(36,group.rowHeight*.6),nameWidth=Math.max(20,group.statsX-template.nameX-12-(row.crown?crownSize+6:0));
   return <div key={row.teamId} className="template-row-viewport" style={{position:'absolute',left:group.x,top:y,width:Math.max(0,Math.min(group.width,(template.dataRegion?.x??group.x)+(template.dataRegion?.width??group.width)-group.x)),height:Math.max(0,Math.min(group.rowHeight,(template.dataRegion?.y??group.y)+(template.dataRegion?.height??1080)-y)),overflow:'hidden',contain:'paint'}}>
    {!rowArtwork&&template.coverPrintedRanks&&<div className="template-rank-mask" style={{left:template.rankX,top:0,width:template.rankWidth,height:group.rowHeight,backgroundImage:'url('+template.image+')',backgroundSize:'1920px 1080px',backgroundPosition:'-'+(group.x+template.logoX)+'px -'+y+'px'}}/>}
    <div className="template-score-row" style={{left:0,top:0,width:group.width,height:group.rowHeight,...(rowArtwork?{backgroundImage:'url('+template.image+')',backgroundSize:'1920px 1080px',backgroundPosition:'-'+group.x+'px -'+y+'px',backgroundRepeat:'no-repeat'}:{}),'--row-delay':`${(page*capacity+start+i+1)*250}ms`} as CSSProperties}>
     {rowArtwork&&template.coverPrintedRanks&&<div className="template-rank-mask" style={{left:template.rankX,top:0,width:template.rankWidth,height:group.rowHeight,backgroundImage:'url('+template.image+')',backgroundSize:'1920px 1080px',backgroundPosition:'-'+(group.x+template.logoX)+'px -'+y+'px'}}/>}
     {template.coverPrintedRanks&&<b className="template-rank" style={{...text('rank',Math.min(40,group.rowHeight*.45)),left:template.rankX,width:template.rankWidth,color:page*capacity+start+i===0?template.highlightColor:template.rankColor}}>{row.position}</b>}
     <span className="template-logo" style={{left:template.logoX,width:logoSize,height:logoSize}}>{row.logo&&<img src={row.logo} alt=""/>}</span>
     <strong className="template-team-name" style={{...text('teamName',Math.min(nameSize,group.rowHeight*.36)),left:template.nameX,width:nameWidth,color:template.nameColor}}>{row.name}</strong>
     {score.view==='total'&&row.crown&&<ChampionRushCrown status={row.crown} size={crownSize} style={{position:'absolute',left:group.statsX-crownSize-8,top:(group.rowHeight-crownSize)/2}}/>}
     <div className="template-stats" style={{left:group.statsX,width:group.statsWidth,gridTemplateColumns:`repeat(${template.stats.length},minmax(0,1fr))`,color:template.numberColor}}>{template.stats.map((stat,si)=><strong key={stat} style={{...(group.statPositions?.[si]!==undefined?{position:'absolute',left:group.statPositions[si]-group.statsX-group.width*.055,width:group.width*.11,top:0,height:'100%',display:'flex',alignItems:'center',justifyContent:'center'} as CSSProperties:{}),...text('numbers',Math.min(40,group.rowHeight*.48))}}>{formatScoreValue(row[stat])}</strong>)}</div>
    </div>
   </div>;
  });})}</div>
  {score.view==='match'&&score.rows.length>capacity&&<span className="template-page-counter" style={text('pageNumber',18)}>{page+1} / {Math.ceil(score.rows.length/capacity)}</span>}
 </div>;
}
