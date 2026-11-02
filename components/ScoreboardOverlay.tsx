'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import ScheduleTotalScoreboard from './ScheduleTotalScoreboard';
import type {ScoreSchedule} from '../lib/score-schedule';
import {Trophy} from 'lucide-react';
import ChampionRushCrown from './ChampionRushCrown';
import OverlayTransition from './OverlayTransition';
import {overlayTextStyle,fontStack,type TextRole} from '../lib/typography';
import MatchScoreboard from './MatchScoreboard';
import TemplateScoreboard from './TemplateScoreboard';
import {templateCapacity} from '../lib/score-template';
import {formatScoreValue,type PublishedScore} from '../lib/scoreboard';

export default function ScoreboardOverlay({score,schedule}:{score:PublishedScore|null;schedule?:ScoreSchedule}){
 const [pageState,setPageState]=useState({publishedAt:score?.publishedAt,page:0});
 const capacity=score?.template?templateCapacity(score.template):12;
 const pages=score&&score.view==='match'?Math.max(1,Math.ceil(score.rows.length/capacity)):1;
 const page=pageState.publishedAt===score?.publishedAt?Math.min(pageState.page,pages-1):0;
 useEffect(()=>{
  if(!score||page>=pages-1)return;
  const timer=setTimeout(()=>setPageState({publishedAt:score.publishedAt,page:page+1}),Math.max(12000,(page*capacity+capacity)*250+500));
  return()=>clearTimeout(timer);
 },[score?.publishedAt,page,pages,capacity]);
 return <OverlayTransition replaceImmediately={score?.view==='total'} identity={score?`${score.view}:${score.publishedAt}:${page}`:null}>{score?<ScoreContent score={score} page={page} pages={pages} schedule={schedule}/>:null}</OverlayTransition>;
}
function ScoreContent({score,page,pages,schedule}:{score:PublishedScore;page:number;pages:number;schedule?:ScoreSchedule}){
 const text=(role:TextRole)=>overlayTextStyle('total',role,score.typography);
 if(score.view==='total'&&score.layout==='schedule')return <ScheduleTotalScoreboard score={score} schedule={schedule}/>;
 if(score.template)return <TemplateScoreboard score={score} page={page}/>;
 if(score.view==='match')return <MatchScoreboard score={score} page={page}/>;
 const rows=score.rows.slice(page*12,page*12+12);const columns=[rows.slice(0,6),rows.slice(6,12)];
 return <div className="score-broadcast" style={{fontFamily:fontStack(),'--score-panel':score.panelColor,'--score-ink':score.textColor,'--score-title':score.titleColor,'--score-highlight':score.highlight} as CSSProperties}>
  <header className="score-broadcast-heading"><h1 style={text('title')}>{score.title}</h1><p style={text('subtitle')}>{score.subtitle}</p><span className="score-heading-stroke"/></header>
  <div className="score-tables" key={score.publishedAt+'-'+page}>{columns.map((column,i)=><section className="score-table" key={i}><div className="score-table-head"><span style={text('tableHeader')}>ĐỘI THAM GIA</span><span style={text('tableHeader')}>BOOYAH!</span><span style={text('tableHeader')}>ELIMS</span><span style={text('tableHeader')}>ĐIỂM TỔNG</span></div>{Array.from({length:6},(_,j)=>{const row=column[j];return row?<div className={'score-table-row '+(row.position<=3?'podium':'')} key={row.teamId} style={{'--row-delay':`${(page*12+i*6+j+1)*250}ms`} as CSSProperties}><div className="score-team"><b className="score-rank" style={text('rank')}>#{row.position}</b><span className="score-team-logo">{row.logo?<img src={row.logo} alt=""/>:<span>{row.name.slice(0,2)}</span>}</span><strong style={text('teamName')}>{row.name}</strong>{row.crown?<ChampionRushCrown status={row.crown}/>:!score.championRushPoints&&row.position===1&&<Trophy className="score-trophy" size={44}/>}</div><strong style={text('numbers')}>{formatScoreValue(row.booyah)}</strong><strong style={text('numbers')}>{formatScoreValue(row.kills)}</strong><strong style={text('numbers')}>{formatScoreValue(row.total)}</strong></div>:<div className="score-table-row empty" key={'empty-'+j} aria-hidden="true"/>;})}<div className="score-paper-edge"/></section>)}</div>
  {pages>1&&<span className="score-page-counter" style={text('pageNumber')}>{page+1} / {pages}</span>}
 </div>;
}
