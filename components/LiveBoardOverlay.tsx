'use client';
import {useEffect,useState,useId,type CSSProperties} from 'react';
import {teamForName} from '../lib/team-identity';
import type {LiveBoardSettings,LivePacket,LiveTeam} from '../lib/live-board';
import {analyzeLiveImage,displayAlive,type LiveAlignment} from '../lib/live-presentation';
import {liveTotal,liveTotalRow,type LiveTotalRow} from '../lib/live-total';
import LiveBoardAnimatedRow from './LiveBoardAnimatedRow';
import ChampionRushCrown from './ChampionRushCrown';
import OverlayTransition from './OverlayTransition';
import {rankLiveTeams} from '../lib/live-board-ranking';
import {compactAlignment,neonCompactAlignment} from '../lib/live-kv-detect';

type Team={id:string;name:string;abbreviation?:string;logo:string};
type Props={settings:LiveBoardSettings;packet:LivePacket|null;teams:Team[];totalRows?:LiveTotalRow[]|null;ageMs?:number;preview?:boolean};
export default function LiveBoardOverlay(props:Props){
 const visible=(props.preview||props.settings.enabled)&&(props.preview||!!props.packet?.teams.length);
 const identity=visible?`${props.packet?.sessionId??'waiting'}:${props.packet?.matchId??''}:${props.settings.design.kv}`:null;
 return <OverlayTransition identity={identity}>{visible?<LiveBoardContent {...props}/>:null}</OverlayTransition>;
}
function LiveBoardContent({settings,packet,teams,totalRows=null,ageMs=0,preview=false}:Props){
 const clipId='live-board-art-'+useId().replaceAll(':','');
 const d=settings.design;const [auto,setAuto]=useState<{image:string;value:LiveAlignment|null}|null>(null);
 useEffect(()=>{let stop=false;if(d.kv&&d.autoAlign!==false)void analyzeLiveImage(d.kv).then(value=>{if(!stop)setAuto({image:d.kv,value});}).catch(()=>{});return()=>{stop=true;};},[d.kv,d.autoAlign]);

 const known=d.kv==='/live-board-templates/standing-compact-neon-14-v1.png'?neonCompactAlignment:d.kv==='/live-board-templates/standing-compact-v1.png'?compactAlignment:null;
 const alignment=d.autoAlign!==false&&auto?.image===d.kv?(auto.value??d.alignment??known):(d.alignment??(d.autoAlign!==false?known:null));
 // Wait for uploaded artwork to be split into rows instead of flashing the
 // complete static image before mounting the animated row crops.
 if(d.kv&&d.autoAlign!==false&&!alignment&&auto?.image!==d.kv)return null;
 const neon=d.kv==='/live-board-templates/standing-compact-neon-14-v1.png'||!!(d.kv&&alignment?.groups.length===1&&alignment.groups[0].x===1320&&alignment.groups[0].y===124&&alignment.groups[0].width===580&&alignment.groups[0].rows===14&&alignment.columns.total===neonCompactAlignment.columns.total);
 const compact=neon||d.kv==='/live-board-templates/standing-compact-v1.png';
 const waiting=!packet?<div className="live-board-source-label" style={{position:'absolute',left:32,top:32}}>Đang xác minh số liệu đúng đội của trận…</div>:null;
 if(!packet&&!alignment)return <main className="live-board-overlay">{d.kv&&<img className="live-board-kv" src={d.kv} alt=""/>}{waiting}</main>;
 const rows=packet?rankLiveTeams(packet.teams,totalRows,teams):[],leader=rows[0]&&liveTotal(rows[0],totalRows,teams)!==null?rows[0]:null;
 const keys=[...(d.showSlot?['slot']:[]),'teamName',...(d.showTotal?['total']:[]),...(d.showElims?['elims']:[]),...(d.showAlive?['aliveCount']:[]),...(d.showDamage?['damage']:[]),...(d.showPlacement?['placement']:[])];
 const labels:Record<string,string>={slot:'SLOT',teamName:'TEAM',aliveCount:'ALIVE',elims:'ELIMS',total:'TỔNG',damage:'DAMAGE',placement:'HẠNG'};
 const template=keys.map(key=>key==='teamName'?'minmax(0,1fr)':'minmax(60px,.22fr)').join(' ');
 function cell(row:LiveTeam,key:string){if(key==='total')return <span className="live-board-value total">{liveTotal(row,totalRows,teams)??0}</span>;const team=teamForName(row.teamName,teams);if(key==='teamName'){const crown=liveTotalRow(row,totalRows,teams)?.crown;return <span className="live-board-team"><span className="live-board-logo">{team?.logo&&<img src={team.logo} alt=""/>}</span><b>{row.teamName}</b><span className="live-board-crown">{crown&&<ChampionRushCrown status={crown} size={Math.min(30,d.fontSize)}/>}</span></span>;}
  if(key==='aliveCount'&&packet!.source==='game-log'){const states=displayAlive(row,packet!.rosterProof?.capacity??row.aliveStates?.length??4);return <span className="live-board-alive" role="img" aria-label={'ALIVE: '+(row.aliveCount??0)}>{states.map((state,i)=><i key={i} className={'live-board-alive-bar '+state}/>)}</span>;}
  return <span className={'live-board-value '+key}>{compact&&key==='elims'?String(row.elims??0).padStart(2,'0'):row[key as keyof LiveTeam] as number|string|null??'—'}</span>;
 }
 const status=packet&&(packet.isReplay||ageMs>5000)&&<div className="live-board-source-label">{packet.isReplay?'REPLAY':'NGUỒN CHẬM · giữ khung đã xác nhận'}</div>;
 if(alignment){let offset=0;const capacity=alignment.groups.reduce((n,g)=>n+g.rows,0);const page=Math.floor(Date.now()/12000)%Math.max(1,Math.ceil(rows.length/capacity));const visible=rows.slice(page*capacity,(page+1)*capacity);
  const rowArtwork=!!d.kv&&(compact||alignment.rowArtwork===true);
  const separated=rowArtwork&&alignment.groups.every(g=>g.rowStep>g.rowHeight);
  // Compact artwork has one header and one legend surrounding its row strip.
  // Keep all row holes, but render only teams present in the packet.
  const trim=rowArtwork&&compact&&alignment.groups.length===1;
  const g=alignment.groups[0];
  const count=packet?visible.length:g.rows;
  const footerY=g.y+g.rows*g.rowStep;
  const footerTop=footerY-(g.rows-count)*g.rowStep;
  const chromeHoles=trim?`M${g.x} 0h${g.width}v${g.y}h-${g.width}ZM${g.x} ${footerY}h${g.width}v${1080-footerY}h-${g.width}Z`:'';
  const art=(y:number,height:number):CSSProperties=>({position:'absolute',left:g.x,top:y,width:g.width,height,backgroundImage:'url('+d.kv+')',backgroundSize:'1920px 1080px',backgroundPosition:`-${g.x}px -${y}px`,backgroundRepeat:'no-repeat'});
  const holes=chromeHoles+alignment.groups.flatMap(g=>Array.from({length:g.rows},(_,i)=>{const y=g.y+i*g.rowStep;return 'M'+g.x+' '+y+'h'+g.width+'v'+Math.min(g.rowStep,g.rowHeight+1)+'h-'+g.width+'Z';})).join('');
  return <OverlayTransition identity={`page:${page}`}><main key={(packet?.sessionId??"waiting")+":"+(packet?.matchId??"")} className="live-board-overlay" data-row-style={separated?'separated':'connected'} data-row-artwork={rowArtwork?'rows':'data'} data-kv-theme={neon?'neon':undefined} style={{color:d.color}}>{d.kv&&rowArtwork&&<svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}><defs><clipPath id={clipId} clipPathUnits="userSpaceOnUse"><path clipRule="evenodd" d={'M0 0H1920V1080H0Z'+holes}/></clipPath></defs></svg>}{d.kv&&<img className="live-board-kv" src={d.kv} alt="" style={rowArtwork?{clipPath:'url(#'+clipId+')'}:undefined}/>}{trim&&d.kv&&<><div className="live-board-chrome live-board-header-art" style={art(0,g.y)}>{d.showTotal&&!neon&&<span className="live-board-total-heading" style={{position:'absolute',left:(alignment.columns.total-.05)*g.width,top:Math.max(0,g.y-42),width:g.width*.1,textAlign:'center',fontSize:18,lineHeight:'24px',fontWeight:800}}>TỔNG</span>}</div><div className="live-board-chrome live-board-footer-art" data-visible-rows={count} style={{...art(footerY,1080-footerY),top:footerTop,'--row-delay':`${(count+1)*250}ms`} as CSSProperties}/></>}{waiting}{status&&<div style={{position:'absolute',left:16,top:16}}>{status}</div>}{d.showTotal&&!neon&&!trim&&alignment.groups.map((g,i)=><span key={'total-header-'+i} className="live-board-total-heading" style={{position:'absolute',left:(alignment.columns.total-.05)*g.width+g.x,top:Math.max(0,g.y-42),width:g.width*.1,textAlign:'center',fontSize:18,lineHeight:'24px',fontWeight:800}}>TỔNG</span>)}{alignment.groups.map((g,gi)=>{const group=visible.slice(offset,offset+g.rows);offset+=g.rows;const slots=separated&&!trim?Array.from({length:g.rows},(_,i)=>group[i]??null):trim&&!packet?Array.from({length:g.rows},()=>null):group;return <div key={gi} className="live-board-group-viewport" style={{position:'absolute',inset:0,clipPath:`inset(${g.y}px ${1920-g.x-g.width}px ${1080-g.y-(g.rows-1)*g.rowStep-g.rowHeight}px ${g.x}px)`}}>{slots.map((row,i)=><LiveBoardAnimatedRow key={row?(row.teamId||row.teamName):"empty:"+gi+":"+i} rank={page*capacity+offset-g.rows+i+1} data-placeholder={!row?"true":undefined} leader={!!row&&row===leader} className={'live-board-aligned-row'+(row?.aliveCount===0?' eliminated':'')} style={{left:g.x,top:g.y+i*g.rowStep,width:g.width,height:separated?Math.min(g.rowStep,g.rowHeight+1):g.rowHeight,fontSize:Math.min(d.fontSize,g.rowHeight*.65),...(rowArtwork?{backgroundImage:'url('+d.kv+')',backgroundSize:'1920px 1080px',backgroundPosition:'-'+g.x+'px -'+(g.y+i*g.rowStep)+'px',backgroundRepeat:'no-repeat'}:{})}}>{row&&<>{compact&&<b className="live-board-compact-rank">#{page*capacity+offset-g.rows+i+1}</b>}{teamForName(row.teamName,teams)?.logo&&<img className="live-board-aligned-logo" src={teamForName(row.teamName,teams)!.logo} alt="" style={{left:alignment.columns.logo*g.width,width:Math.min(g.rowHeight*.8,d.fontSize*1.5),height:Math.min(g.rowHeight*.8,d.fontSize*1.5)}}/>}{keys.map(key=>{const x=alignment.columns[key as keyof typeof alignment.columns];const next=Math.min(1,...keys.filter(k=>alignment.columns[k as keyof typeof alignment.columns]>x).map(k=>alignment.columns[k as keyof typeof alignment.columns]));return <div key={key} className={'live-board-aligned-cell '+key} style={{left:key==='teamName'||key==='aliveCount'?x*g.width:(x-.05)*g.width,width:compact&&key==='teamName'?Math.max(20,(Math.min(alignment.columns.elims,d.showTotal?alignment.columns.total:1)-.05-x)*g.width-8):key==='teamName'||key==='aliveCount'?Math.max(20,(next-x)*g.width-6):g.width*.1}}>{cell(row,key)}</div>;})}</>}</LiveBoardAnimatedRow>)}</div>;})}</main></OverlayTransition>;
 }
 const rowHeight=Math.max(16,Math.min(d.rowHeight,(1080-d.y-80)/rows.length-d.gap));
 return <main key={(packet?.sessionId??"waiting")+":"+(packet?.matchId??"")} className="live-board-overlay" style={{color:d.color}}>{d.kv&&<img className="live-board-kv" src={d.kv} alt=""/>}<section className={d.kv?'live-board-table with-kv':'live-board-table'} style={{left:d.x,top:d.y,width:d.width,gap:d.gap}}>{!d.kv&&d.title&&<div className="live-board-title"><strong>{d.title}</strong></div>}{status}{d.showHeader&&<header style={{gridTemplateColumns:template}}>{keys.map(key=><span key={key}>{labels[key]}</span>)}</header>}{rows.map((row,index)=><LiveBoardAnimatedRow key={row.teamId||row.teamName} rank={index+1} leader={row===leader} style={{gridTemplateColumns:template,minHeight:rowHeight,fontSize:Math.min(d.fontSize,rowHeight*.6)} as CSSProperties} className={row.aliveCount===0?'eliminated':''}>{keys.map(key=><div key={key}>{cell(row,key)}</div>)}</LiveBoardAnimatedRow>)}</section></main>;
}
