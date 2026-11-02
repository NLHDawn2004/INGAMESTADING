'use client';
import type {CSSProperties} from 'react';
import {formatScoreValue,type PublishedScore} from '../lib/scoreboard';
import {fontStack,overlayTextStyle} from '../lib/typography';
import type {ScoreSchedule} from '../lib/score-schedule';
import {defaultScheduleDesign,separateScoreRegions} from '../lib/overlay-layout';
import ChampionRushCrown from './ChampionRushCrown';
import MapScheduleGrid from './MapScheduleGrid';

export default function ScheduleTotalScoreboard({score,schedule}:{score:PublishedScore;schedule?:ScoreSchedule}){
 const design=score.scheduleDesign??defaultScheduleDesign(),r=design.table;
 const fontSize=Math.max(1,Math.min(28,r.width*.028,r.height/13*.62));
 const rowHeight=r.height/(design.showHeader?13:12);
 const text=(role:'rank'|'teamName'|'numbers')=>overlayTextStyle('total',role,score.typography);
 return <main className="schedule-total-overlay" data-row-style="separated" data-row-artwork={design.background?'data':'rows'} style={{fontFamily:fontStack(),'--total-panel':score.panelColor,'--total-ink':score.textColor,'--total-highlight':score.highlight} as CSSProperties}>
  {design.background&&<img className="schedule-total-kv" src={design.background} alt=""/>}
  {design.showTitle&&<header className="schedule-total-heading" style={{left:r.x,top:Math.max(0,r.y-150),width:r.width,color:score.titleColor}}><h1 style={overlayTextStyle('total','title',score.typography)}>{score.title}</h1><p style={overlayTextStyle('total','subtitle',score.typography)}>{score.subtitle}</p></header>}
  <section className="schedule-total-table custom-total-table" aria-label="Bảng điểm tổng" style={{left:r.x,top:r.y,width:r.width,height:r.height,gridTemplateRows:design.showHeader?'repeat(13,minmax(0,1fr))':'repeat(12,minmax(0,1fr))','--total-font':`${fontSize}px`,'--total-logo':`${Math.max(1,Math.min(rowHeight*.72,r.width*.045))}px`} as CSSProperties}>
   {design.showHeader&&<header className="custom-total-columns"><span>#</span><span/><strong>TEAM</strong><strong>BOOYAH!</strong><strong>ELIMS</strong><strong>ĐIỂM</strong></header>}
   {score.rows.slice(0,12).map((row,i)=><article className={'schedule-total-row'+(i<3?' podium':'')} key={row.teamId} style={{'--row-delay':`${(i+1)*250}ms`} as CSSProperties}>
    <b style={text('rank')}>{row.position}</b><span className="schedule-total-logo">{row.logo&&<img src={row.logo} alt=""/>}</span>
    <strong className="schedule-total-name" style={text('teamName')}>{row.name}</strong>{row.crown&&<span className="schedule-total-crown"><ChampionRushCrown status={row.crown} size={Math.min(22,rowHeight*.5)}/></span>}
    <strong style={text('numbers')}>{formatScoreValue(row.booyah)}</strong><strong style={text('numbers')}>{formatScoreValue(row.kills)}</strong><strong style={text('numbers')}>{formatScoreValue(row.total)}</strong>
   </article>)}
  </section>
  {separateScoreRegions(r,design.maps).width>0&&<MapScheduleGrid schedule={schedule??{matches:[],teams:[]}} region={separateScoreRegions(r,design.maps)} accent={score.panelColor}/>}
 </main>;
}
