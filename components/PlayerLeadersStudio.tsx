'use client';
import CompactMenuActions from './CompactMenuActions';
import {useMemo,useRef,useState,useEffect} from 'react';
import {Copy,ExternalLink,Medal,Search,Target,Trophy,Radio,Square} from 'lucide-react';
import type {ImportedMatch,MatchCandidate} from '../lib/scoreboard';
import {teamForName} from '../lib/team-identity';
import type {PlayerLeaderRow,PlayerLeaderSnapshot} from '../lib/player-leaders';
import type {StudioState} from '../lib/state';
import LeaderOverlay from './LeaderOverlay';
import LeaderDesignControls from './LeaderDesignControls';
import PlayerPortraitControls from './PlayerPortraitControls';
import {LIVE_POLL_MS,SOURCE_WARNING_MS} from '../lib/live-timing';
import {repairLegacyLeaderLayout} from '../lib/leader-template';
import {defaultLeaderDesign,redGoldLeaderDesign,demoLeaderSnapshot,type LeaderDesign} from '../lib/player-leaders';

type Props={state:StudioState;save:(next:StudioState,action?:string)=>Promise<boolean>;loaded:boolean;busy:boolean;notify:(text:string)=>void;overlayURL:string};
type LiveResponse={match?:Pick<ImportedMatch,'id'|'name'|'players'>&{endTime:number;expectedPlayers:number;sourceRecordId?:number;eventId?:number;seasonId?:number};candidates?:MatchCandidate[];error?:string};
export default function PlayerLeadersStudio({state,save,loaded,busy,notify,overlayURL}:Props){
 const [matchId,setMatchId]=useState('');const [incoming,setIncoming]=useState<LiveResponse['match']|null>(null);const [candidates,setCandidates]=useState<MatchCandidate[]>([]);const [selectedResult,setSelectedResult]=useState('');const [lookupBusy,setLookupBusy]=useState(false);const [live,setLive]=useState(false);const [status,setStatus]=useState('Chưa kết nối trận');const [lastUpdate,setLastUpdate]=useState(0);const [width,setWidth]=useState(0);const previewRef=useRef<HTMLDivElement>(null);const stateRef=useRef(state);stateRef.current=state;
 useEffect(()=>{const el=previewRef.current;if(!el)return;const observer=new ResizeObserver(([entry])=>setWidth(entry.contentRect.width));observer.observe(el);return()=>observer.disconnect();},[]);
 const rows=useMemo<PlayerLeaderRow[]>(()=>incoming?.players.map(p=>({...p,logo:teamForName(p.teamName,state.teams)?.logo||'',portrait:state.playerOverlays.portraits?.[p.playerId]??''}))||[],[incoming,state.teams,state.playerOverlays.portraits]);
 const preview=useMemo<PlayerLeaderSnapshot|null>(()=>rows.length?{matchId:incoming!.id,matchName:incoming!.name||'MATCH '+incoming!.id,sourceRecordId:incoming!.sourceRecordId,publishedAt:Date.now(),onAir:true,players:rows}:null,[rows,incoming]);
 const [designs,setDesigns]=useState(()=>({elims:defaultLeaderDesign(),damage:defaultLeaderDesign()}));
 const [showDemo,setShowDemo]=useState(false);
 const [previewReplay,setPreviewReplay]=useState({elims:0,damage:0});
 const demo=useMemo(()=>demoLeaderSnapshot(),[]);
 const dirtyDesigns=useRef(false);
 useEffect(()=>{if(!loaded||dirtyDesigns.current)return;let cancelled=false;const stored=state.playerOverlays.designs||{elims:defaultLeaderDesign(),damage:defaultLeaderDesign()};setDesigns(stored);
  void Promise.all([repairLegacyLeaderLayout(stored.elims),repairLegacyLeaderLayout(stored.damage)]).then(([elims,damage])=>{if(cancelled||dirtyDesigns.current)return;if(elims!==stored.elims||damage!==stored.damage){dirtyDesigns.current=true;setDesigns({elims,damage});notify('Đã tự căn lại dữ liệu theo mẫu video. Lưu bố cục rồi bật overlay để cập nhật OBS.');}});
  return()=>{cancelled=true;};
 },[loaded,state.playerOverlays.designs]);
 function changeDesign(kind:'elims'|'damage',design:LeaderDesign){dirtyDesigns.current=true;setDesigns(current=>({...current,[kind]:design}));}
 async function saveDesigns(){if(await save({...state,playerOverlays:{...state.playerOverlays,designs}},'Lưu KV tuyển thủ')){dirtyDesigns.current=false;notify('Đã lưu KV và bố cục. Bấm Bật overlay để cập nhật OBS.');}}
 function useSample(kind:'elims'|'damage'){changeDesign(kind,redGoldLeaderDesign(kind));setShowDemo(!preview&&!state.playerOverlays[kind]);notify('Đã dùng KV mẫu và căn sẵn vị trí dữ liệu. Lưu rồi bật overlay để cập nhật OBS.');}
 function playerAssets(p:PlayerLeaderRow){return {...p,logo:teamForName(p.teamName,state.teams)?.logo||'',portrait:state.playerOverlays.portraits?.[p.playerId]??p.portrait??''};}
 function previewData(kind:'elims'|'damage'){if(showDemo)return demo;const source=preview||state.playerOverlays[kind];return source?{...source,onAir:true,players:source.players.map(playerAssets)}:null;}
 const portraitPlayers=Array.from(new Map((rows.length?rows:[...(state.playerOverlays.elims?.players||[]),...(state.playerOverlays.damage?.players||[])]).map(p=>[p.playerId,playerAssets(p)])).values());
 async function saveDrivePortraits(folderUrl:string,photos:Record<string,string>){const current=stateRef.current;return saveRef.current({...current,playerOverlays:{...current.playerOverlays,portraitDriveFolderUrl:folderUrl,portraits:{...current.playerOverlays.portraits,...photos}}},'Lưu ảnh Drive theo player ID');}
 async function savePortrait(id:string,url:string){const current=stateRef.current;return save({...current,playerOverlays:{...current.playerOverlays,portraits:{...current.playerOverlays.portraits,[id]:url}}},'Lưu ảnh tuyển thủ');}
 const [portraitBusy,setPortraitBusy]=useState(false);const portraitBusyRef=useRef(false);portraitBusyRef.current=portraitBusy;
 const saveRef=useRef(save);saveRef.current=save;
 const disabled=!loaded||busy||lookupBusy||portraitBusy;
 const [clockNow,setClockNow]=useState(Date.now());
 useEffect(()=>{if(!live)return;setClockNow(Date.now());const timer=setInterval(()=>setClockNow(Date.now()),500);return()=>clearInterval(timer);},[live]);
 const pollLock=useRef(false);const requestAbort=useRef<AbortController|null>(null);const mounted=useRef(true);const liveRef=useRef(live);liveRef.current=live;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;requestAbort.current?.abort();};},[]);
 async function poll(resultId?:number,quiet=false){
  const requestedId=matchId.trim();if(!requestedId||pollLock.current||(quiet&&portraitBusyRef.current))return;
  pollLock.current=true;const controller=new AbortController();requestAbort.current=controller;if(!quiet)setLookupBusy(true);
  try{
   const response=await fetch('/api/matchstats/players',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matchId:requestedId,resultId}),cache:'no-store',signal:controller.signal});
   const data=await response.json() as LiveResponse;
   if(!mounted.current||controller.signal.aborted||(quiet&&!liveRef.current))return;
   if(response.ok&&data.candidates){setCandidates(data.candidates);setSelectedResult('');setLive(false);setStatus('Chọn đúng Event / Season để kết nối');return;}
   if(!response.ok||!data.match)throw Error(data.error||'Chưa nhận được số liệu tuyển thủ.');
   if(data.match.id!==requestedId)throw Error('Nguồn trả khác Match ID đã chọn. Giữ dữ liệu trước đó.');
   setIncoming(data.match);setCandidates([]);setLastUpdate(Date.now());setStatus(data.match.endTime>0?'Nguồn đánh dấu trận đã kết thúc · dữ liệu cuối trận':'Đã nhận số liệu từ Match Stats');
   if(quiet){
    const current=stateRef.current;const updates={...current.playerOverlays};let changed=false;let mismatched=false;
    for(const kind of ['elims','damage'] as const){const active=updates[kind];if(!active?.onAir||active.matchId!==data.match.id)continue;
     if(active.sourceRecordId!==data.match.sourceRecordId){mismatched=true;continue;}
     updates[kind]={...active,players:data.match.players.map(p=>({...p,logo:teamForName(p.teamName,current.teams)?.logo||'',portrait:active.players.find(old=>old.playerId===p.playerId)?.portrait??''}))};changed=true;
    }
    if(changed&&!await saveRef.current({...current,playerOverlays:updates},'live-player-stats'))throw Error('Đã nhận nguồn nhưng chưa lưu được lên OBS. Giữ bản đang chiếu và sẽ thử lại.');
    if(mismatched)setStatus('Overlay đang chiếu có mã kết quả khác hoặc chưa xác nhận. Bật lại bảng để theo đúng Event / Season hiện tại.');
   }
   if(data.match.endTime>0)setLive(false);
  }catch(error){if(!mounted.current||controller.signal.aborted)return;const message=(error as Error).message;setStatus(message);if(!quiet)notify(message);}
  finally{pollLock.current=false;if(requestAbort.current===controller)requestAbort.current=null;if(mounted.current&&!quiet)setLookupBusy(false);}
 }
 const pollRef=useRef(poll);pollRef.current=poll;
 useEffect(()=>{
  if(!live)return;let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
  const run=async()=>{await pollRef.current(selectedResult?Number(selectedResult):undefined,true);if(!stopped)timer=setTimeout(()=>void run(),LIVE_POLL_MS);};
  void run();return()=>{stopped=true;if(timer)clearTimeout(timer);requestAbort.current?.abort();};
 },[live,matchId,selectedResult]);
 async function connect(){setShowDemo(false);await poll(selectedResult?Number(selectedResult):undefined,false);}
 async function publish(kind:'elims'|'damage'){const current=stateRef.current;const source=preview||current.playerOverlays[kind];if(!source)return;if(!designs[kind].background){notify('Thêm ảnh KV cho overlay này trước khi bật.');return;}const playerOverlays={...current.playerOverlays,designs,[kind]:{...source,players:source.players.map(playerAssets),design:structuredClone(designs[kind]),publishedAt:Date.now(),onAir:true}};if(await save({...current,playerOverlays},kind==='elims'?'Chiếu Top 5 Elim':'Chiếu Top 5 Damage')){setPreviewReplay(value=>({...value,[kind]:value[kind]+1}));notify(kind==='elims'?'Đã bật Top 5 Elim.':'Đã bật Top 5 Damage.');}}
 async function takeOff(kind:'elims'|'damage'){const current=stateRef.current;const active=current.playerOverlays[kind];if(!active)return;const playerOverlays={...current.playerOverlays,[kind]:{...active,onAir:false}};await save({...current,playerOverlays},'Ẩn player overlay');}
 async function copy(kind:'elims'|'damage'){const url=overlayURL+'&view=player-'+kind;try{await navigator.clipboard.writeText(url);notify('Đã sao chép link OBS.');}catch{notify('Chọn link OBS để sao chép thủ công.');}}
 const elimsURL=overlayURL+'&view=player-elims',damageURL=overlayURL+'&view=player-damage';
 return <section className="panel player-leaders-studio" data-compact-menu><CompactMenuActions/><div className="panel-heading"><h2><Medal size={19}/> Top 5 Elim & Top 5 Damage</h2><span className="small-badge">Hai overlay độc lập · live</span></div><div className="player-leaders-content"><div className="player-leaders-controls"><form className="simple-match-import" onSubmit={e=>{e.preventDefault();void connect();}}><input aria-label="Match ID thống kê tuyển thủ" inputMode="numeric" maxLength={24} placeholder="Dán Match ID trận đang diễn ra…" value={matchId} disabled={lookupBusy||live} onChange={e=>{setMatchId(e.target.value);setIncoming(null);setCandidates([]);}}/><button className="button primary" disabled={disabled||!/^[0-9]{1,24}$/.test(matchId.trim())}><Search size={15}/>{lookupBusy?'Đang kết nối…':'Kết nối trận'}</button></form><div className="player-leader-result"><strong>{live?<Radio size={15}/>:null}{status}</strong><span>{incoming?`${rows.length}${incoming.expectedPlayers?` / ${incoming.expectedPlayers}`:''} tuyển thủ · lấy nguồn mỗi 1 giây`: 'Chưa có dữ liệu'}</span>{lastUpdate>0&&<span>Nhận nguồn lúc {new Date(lastUpdate).toLocaleTimeString()}</span>}</div>
 {live&&lastUpdate>0&&clockNow-lastUpdate>SOURCE_WARNING_MS&&<p className="drive-logo-warning" role="status">Hơn 5 giây chưa nhận phản hồi hợp lệ từ nguồn. Đang giữ số liệu trước đó; chưa xác nhận được độ trễ so với trận.</p>}
 {candidates.length>0&&<div className="score-import-preview"><strong>Chọn event của trận</strong><select aria-label="Event Match Stats" value={selectedResult} onChange={e=>setSelectedResult(e.target.value)}><option value="">Chọn event…</option>{candidates.map(c=><option key={c.recordId} value={c.recordId}>Event {c.eventId} · Season {c.seasonId} · {c.recordId}</option>)}</select><button className="button primary" disabled={!selectedResult||disabled} onClick={()=>void connect()}>Kết nối event này</button></div>}
 <div className="player-leader-actions"><button className={'button '+(live?'secondary':'primary')} disabled={live?false:(!incoming||incoming.endTime>0||busy||lookupBusy||portraitBusy)} onClick={()=>setLive(!live)}>{live?<><Square size={14}/> Dừng cập nhật</>:<><Radio size={14}/> Bắt đầu cập nhật trực tiếp</>}</button></div>
 {incoming&&incoming.endTime>0&&<p className="muted">Match Stats đang đánh dấu trận này đã kết thúc. Hãy nhập Match ID của trận đang thi đấu để bật cập nhật trực tiếp.</p>}

 <PlayerPortraitControls folderUrl={state.playerOverlays.portraitDriveFolderUrl||''} onDriveApply={saveDrivePortraits} onBusy={setPortraitBusy} players={portraitPlayers} portraits={state.playerOverlays.portraits||{}} onChange={savePortrait} disabled={disabled||live} notify={notify}/><div className="player-leader-publish"><div><strong><Trophy size={16}/> Top 5 Elim</strong><p role="status">{state.playerOverlays.elims?.onAir?'Đang chiếu trên OBS':'Đang ẩn trên OBS'}</p><LeaderDesignControls onSample={()=>useSample('elims')} sampleURL="/player-templates/video-elims-v2.png" value={designs.elims} onChange={value=>changeDesign('elims',value)} onSave={()=>void saveDesigns()} disabled={disabled||live} notify={notify}/><label>Link OBS<input readOnly value={elimsURL} onFocus={e=>e.target.select()}/></label><div className="player-leader-actions"><button className="button primary" disabled={disabled||(!preview&&!state.playerOverlays.elims)||!designs.elims.background} onClick={()=>void publish('elims')}>Bật Top 5 Elim</button><button className="button secondary" disabled={!state.playerOverlays.elims?.onAir} onClick={()=>void takeOff('elims')}>Ẩn overlay</button><button className="button secondary" disabled={!loaded} onClick={()=>void copy('elims')}><Copy size={14}/> Sao chép link</button><button className="icon-button" title="Mở overlay Top 5 Elim" disabled={!loaded} onClick={()=>window.open(elimsURL,'_blank','noopener,noreferrer')}><ExternalLink size={15}/></button></div></div><div><strong><Target size={16}/> Top 5 Damage</strong><p role="status">{state.playerOverlays.damage?.onAir?'Đang chiếu trên OBS':'Đang ẩn trên OBS'}</p><LeaderDesignControls onSample={()=>useSample('damage')} sampleURL="/player-templates/video-damage-v2.png" value={designs.damage} onChange={value=>changeDesign('damage',value)} onSave={()=>void saveDesigns()} disabled={disabled||live} notify={notify}/><label>Link OBS<input readOnly value={damageURL} onFocus={e=>e.target.select()}/></label><div className="player-leader-actions"><button className="button primary" disabled={disabled||(!preview&&!state.playerOverlays.damage)||!designs.damage.background} onClick={()=>void publish('damage')}>Bật Top 5 Damage</button><button className="button secondary" disabled={!state.playerOverlays.damage?.onAir} onClick={()=>void takeOff('damage')}>Ẩn overlay</button><button className="button secondary" disabled={!loaded} onClick={()=>void copy('damage')}><Copy size={14}/> Sao chép link</button><button className="icon-button" title="Mở overlay Top 5 Damage" disabled={!loaded} onClick={()=>window.open(damageURL,'_blank','noopener,noreferrer')}><ExternalLink size={15}/></button></div></div></div>
 </div><div className="player-leader-preview-column"><label className="leader-demo-toggle"><input type="checkbox" checked={showDemo} onChange={e=>setShowDemo(e.target.checked)}/> Xem dữ liệu mẫu</label>{showDemo&&null}<h3>Top 5 Elim · KV & dữ liệu</h3><button className="button secondary" disabled={!designs.elims.background} onClick={()=>setPreviewReplay(current=>({...current,elims:current.elims+1}))}>Xem lại animation</button>{!designs.elims.background&&null}{designs.elims.background&&!previewData('elims')&&null}<div className="player-leader-preview" ref={previewRef}><div style={{width:1920,height:1080,transform:`scale(${width/1920})`,transformOrigin:'top left'}}><LeaderOverlay key={previewReplay.elims} kind="elims" data={previewData('elims')} design={designs.elims}/></div></div><h3 className="leader-preview-title">Top 5 Damage · KV & dữ liệu</h3><button className="button secondary" disabled={!designs.damage.background} onClick={()=>setPreviewReplay(current=>({...current,damage:current.damage+1}))}>Xem lại animation</button>{!designs.damage.background&&null}{designs.damage.background&&!previewData('damage')&&null}<div className="player-leader-preview secondary-preview"><div style={{width:1920,height:1080,transform:`scale(${width/1920})`,transformOrigin:'top left'}}><LeaderOverlay key={previewReplay.damage} kind="damage" data={previewData('damage')} design={designs.damage}/></div></div></div></div></section>;
}
