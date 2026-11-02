'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {overlayTextStyle,type TextRole} from '../lib/typography';
import {mapLabels,type StudioState} from '../lib/state';
import OverlayTransition from './OverlayTransition';

const pageSize=10;
export default function Recap({state}:{state:StudioState}){
 const text=(role:TextRole)=>overlayTextStyle('map',role,state.theme.typography);
 const completed=state.matches.map((match,index)=>({match,number:index+1})).filter(({match})=>match.status==='finished');
 const pages=Math.ceil(completed.length/pageSize);
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{if(pages<2)return;const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer);},[pages]);
 const page=pages>1?Math.floor(Math.max(0,now-state.recapAt)/12000)%pages:0;
 const matches=completed.slice(page*pageSize,(page+1)*pageSize);
 const count=matches.length;
 return <OverlayTransition identity={`recap:${page}:${matches.map(m=>m.match.id).join(',')}`}><div className="recap-grid" data-page={page+1} data-pages={pages} style={{gridTemplateColumns:`repeat(${count},minmax(0,1fr))`,gridTemplateRows:'minmax(0,1fr)','--recap-booyah-size':`${count>=10?26:count>=8?32:42}px`,'--recap-team-size':`${count>=10?13:count>=8?16:20}px`,'--recap-label-size':`${count>=10?11:count>=8?14:19}px`} as CSSProperties}>
  {matches.map(({match,number})=>{
   const team=state.teams.find(t=>t.id===match.winner);
   return <div className="map-card recap-card status-finished" key={match.id}>
    <div className="map-art"><img className="map-photo" src={'/maps/'+match.map+'.webp'} alt={match.map} style={{objectPosition:`${match.position}% center`}}/></div>
    <div className="map-shade" style={{background:`rgba(0,8,18,${Math.max(.3,state.theme.shade)})`}}/>
    <span className="recap-number" style={text('matchNumber')}>TRẬN {String(number).padStart(2,'0')}</span>
    <div className="recap-win"><span className="booyah" style={text('booyah')}>BOOYAH!</span><span className="recap-logo-slot">{team?.logo&&<img className="winner-logo" src={team.logo} alt=""/>}</span><div className="ribbon winner" style={text('teamName')}>{team?.name||'ĐỘI THẮNG'}</div></div>
    <div className="map-label" style={text('mapName')}>{mapLabels[match.map]}</div>
   </div>;
  })}
 </div></OverlayTransition>;
}
