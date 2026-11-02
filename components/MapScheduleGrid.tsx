'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {mapLabels} from '../lib/state';
import {revealFrame,revealDuration} from '../lib/reveal';
import {scoreScheduleLayout,type ScoreSchedule} from '../lib/score-schedule';
import type {OverlayRegion} from '../lib/overlay-layout';

export default function MapScheduleGrid({schedule,region,mode='list',accent='#00cbe9',shade=.42,color='#ffffff'}:{schedule:ScoreSchedule;region:OverlayRegion;mode?:'list'|'cards';accent?:string;shade?:number;color?:string}){
 const rgb=accent.slice(1).match(/.{2}/g)?.map(v=>parseInt(v,16))??[0,0,0];const headerInk=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>150?'#06182c':'#ffffff';const {matches,teams}=schedule;const layout=scoreScheduleLayout(matches.length,region,mode);
 const [now,setNow]=useState(()=>Date.now());
 const revealEnd=Math.max(0,...matches.filter((m,i)=>i>=5&&['ready','live'].includes(m.status)&&m.revealAt>0).map(m=>m.revealAt+revealDuration));
 useEffect(()=>{if(!revealEnd||Date.now()>=revealEnd)return;setNow(Date.now());const timer=setInterval(()=>{const time=Date.now();setNow(time);if(time>=revealEnd)clearInterval(timer);},40);return()=>clearInterval(timer);},[revealEnd]);
 return <section className="score-schedule-maps" aria-label="Toàn bộ lịch thi đấu" data-map-layout={mode} data-columns={layout.columns} data-crowded={layout.crowded?'true':undefined} style={{left:region.x,top:region.y,width:region.width,height:region.height,gridTemplateColumns:`repeat(${layout.columns},minmax(0,1fr))`,gridTemplateRows:`repeat(${layout.rows},minmax(0,1fr))`,gap:layout.gap,'--map-font':`${layout.fontSize}px`,'--map-accent':accent,'--map-header-ink':headerInk,color} as CSSProperties}>
 {matches.map((match,i)=>{const frame=revealFrame(match,i+1,now),hidden=frame.hidden||frame.spinning;const team=teams.find(t=>t.id===match.winner);
 return <article className={'schedule-map-card status-'+match.status} key={match.id} data-match-id={match.id} data-match-number={i+1} style={{gridColumn:mode==='list'?Math.floor(i/layout.rows)+1:i%layout.columns+1,gridRow:mode==='list'?i%layout.rows+1:Math.floor(i/layout.columns)+1,'--map-delay':`${i*Math.min(45,900/Math.max(1,matches.length-1))}ms`} as CSSProperties}>
  {!hidden&&<img className="schedule-map-photo" key={match.map} src={'/maps/'+match.map+'.webp'} alt={mapLabels[match.map]} style={{objectPosition:`${match.position}% center`}}/>}<div className="schedule-map-shade" style={{opacity:shade}}/>
  <header>TRẬN {i+1} · {hidden?'RANDOM':mapLabels[match.map]}</header>
  <div className="schedule-map-content" key={`${match.status}:${match.winner}:${hidden}`}>{hidden?<strong className="schedule-map-random">RANDOM</strong>:match.status==='finished'?<><strong className="schedule-map-booyah">BOOYAH!</strong>{team?.logo?<img className="schedule-map-winner" src={team.logo} alt={team.name}/>:<strong className="schedule-map-team">{team?.name||'ĐỘI THẮNG'}</strong>}</>:match.status==='live'?<span className="schedule-map-status">● ĐANG THI ĐẤU</span>:match.status==='ready'?<span className="schedule-map-status">CHUẨN BỊ</span>:null}</div>
 </article>;})}
 </section>;
}
