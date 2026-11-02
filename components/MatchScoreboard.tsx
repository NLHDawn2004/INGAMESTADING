'use client';
import type {CSSProperties} from 'react';
import {Trophy} from 'lucide-react';
import {overlayTextStyle,fontStack,type TextRole} from '../lib/typography';

import {formatScoreValue,type PublishedScore} from '../lib/scoreboard';

export default function MatchScoreboard({score,page=0}:{score:PublishedScore;page?:number}){
 const text=(role:TextRole)=>overlayTextStyle('match',role,score.typography);
 const winner=score.rows.find(r=>r.booyah===1);const rows=score.rows.slice(page*12,page*12+12);
 return <div className="score-broadcast match-broadcast" style={{fontFamily:fontStack(),'--score-ink':score.textColor,'--score-title':score.titleColor,'--score-panel':score.panelColor,'--score-highlight':score.highlight} as CSSProperties}>
  <header className="match-score-heading"><h1 style={text('title')}>{score.title}</h1><div style={text('subtitle')}>{score.subtitle}</div></header>
  <section className="match-winner-paper"><div className="match-booyah-sticker" style={text('booyah')}>BOOYAH!</div><div className="match-notebook" aria-label="Vùng đặt cúp trong suốt"/><div className="match-winner-label"><strong style={text('winnerName')}>{winner?.name||'ĐỘI BOOYAH'}</strong></div></section>
  {winner&&<div className="match-winner-stats"><span style={text('winnerStatsLabel')}>ĐIỂM HẠNG: <b style={text('winnerStats')}>{formatScoreValue(winner.placementPoints)}</b></span><span style={text('winnerStatsLabel')}>ELIMS: <b style={text('winnerStats')}>{formatScoreValue(winner.kills)}</b></span><span style={text('winnerStatsLabel')}>ĐIỂM TỔNG: <b style={text('winnerStats')}>{formatScoreValue(winner.total)}</b></span></div>}
  <section className="match-rank-paper" key={page}><div className="match-rank-head"><span style={text('tableHeader')}>ĐỘI THAM GIA</span><span style={text('tableHeader')}>ĐIỂM HẠNG</span><span style={text('tableHeader')}>ELIMS</span><span style={text('tableHeader')}>ĐIỂM TỔNG</span></div>{Array.from({length:12},(_,i)=>{const row=rows[i];return <div className={'match-rank-row '+(row?.booyah===1?'match-booyah-row':'')} key={row?.teamId||'empty-'+i} style={{'--row-delay':`${(page*12+i+1)*250}ms`} as CSSProperties}><div className="match-rank-team"><span className="match-paper-dot"/><b style={text('rank')}>#{row?.position||page*12+i+1}</b>{row&&<><span className="match-row-logo">{row.logo?<img src={row.logo} alt=""/>:row.name.slice(0,2)}</span><strong style={text('teamName')}>{row.name}</strong>{row.booyah===1&&<Trophy size={22}/>}</>}</div><strong style={text('numbers')}>{row?formatScoreValue(row.placementPoints):''}</strong><strong style={text('numbers')}>{row?formatScoreValue(row.kills):''}</strong><strong style={text('numbers')}>{row?formatScoreValue(row.total):''}</strong></div>;})}<div className="match-torn-edge"/></section>
  {score.rows.length>12&&<span className="match-page-counter" style={text('pageNumber')}>{page+1} / {Math.ceil(score.rows.length/12)}</span>}
 </div>;
}
