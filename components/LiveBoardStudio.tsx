'use client';
import {canConnectLocalGame,connectLocalGame,gameConnectionPresentation} from '../lib/live-connection';
import {needsPortableBridge,prepareGameConnector} from '../lib/live-bridge-client';
import LiveBoardAlignmentControls from './LiveBoardAlignmentControls';
import {analyzeLiveImage} from '../lib/live-presentation';
import Link from 'next/link';
import {followsGame} from '../lib/live-board-auto';
import {useEffect,useRef,useState} from 'react';
import {defaultLiveBoardSettings,verticalLiveBoardDesign,LIVE_VERTICAL_KV,testLiveBoardDesign,compactLiveBoardDesign,LIVE_TEST_KV,LIVE_COMPACT_KV,type LiveBoardSettings,type LivePacket,type LiveHealth} from '../lib/live-board';
import {MAX_UPLOAD_BYTES,readUploadResponse} from '../lib/upload-response';
import LiveBoardOverlay from './LiveBoardOverlay';
import type {LiveTotalRow,LiveTotalSource} from '../lib/live-total';
type Data={totalRows?:LiveTotalRow[]|null;scoreSources?:LiveTotalSource[];selectedScoreBoardId?:string;settings:LiveBoardSettings;packet:LivePacket|null;health:LiveHealth;teams:Array<{id:string;name:string;abbreviation?:string;logo:string}>;serverNow:number;overlayToken:string};
export default function LiveBoardStudio(){
 const [data,setData]=useState<Data|null>(null),[draft,setDraft]=useState(defaultLiveBoardSettings),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[origin,setOrigin]=useState(''),[width,setWidth]=useState(0),[now,setNow]=useState(Date.now());
 const [apiError,setApiError]=useState(''),[connectionHint,setConnectionHint]=useState(''),[autoConnecting,setAutoConnecting]=useState(false);
 const connectionAttempt=useRef({busy:false,nextAt:0,mounted:true});
 const [previewVisible,setPreviewVisible]=useState(true),[previewRun,setPreviewRun]=useState(0);
 const settingsPanel=useRef<HTMLElement>(null);
 const dirty=useRef(false),saving=useRef(false),preview=useRef<HTMLDivElement>(null),receivedAt=useRef(0);
 useEffect(()=>{connectionAttempt.current.mounted=true;let stopped=false,timer:ReturnType<typeof setTimeout>;setOrigin(location.origin);const read=async()=>{try{const response=await fetch('/api/live-scoreboard',{cache:'no-store',signal:AbortSignal.timeout(3500)});if(response.status===403){location.assign('/login');return;}if(!response.ok)throw Error('Không đọc được trạng thái bridge.');const next=await response.json() as Data;if(!stopped&&!saving.current){setApiError('');setData(next);receivedAt.current=Date.now();if(!dirty.current)setDraft(next.settings);}}catch(error){if(!stopped)setApiError((error as Error).message);}if(!stopped)timer=setTimeout(read,1000);};void read();return()=>{stopped=true;connectionAttempt.current.mounted=false;clearTimeout(timer);};},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),500);const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));if(preview.current)observer.observe(preview.current);return()=>{clearInterval(timer);observer.disconnect();};},[]);
 useEffect(()=>{let cancelled=false;const kv=draft.design.kv;if(!kv||draft.design.autoAlign===false)return;void analyzeLiveImage(kv).then(alignment=>{if(cancelled||!alignment)return;dirty.current=true;setDraft(old=>old.design.kv===kv&&old.design.autoAlign!==false?{...old,design:{...old.design,alignment,showHeader:false}}:old);}).catch(()=>{});return()=>{cancelled=true;};},[draft.design.kv,draft.design.autoAlign]);
 function patch(value:Partial<LiveBoardSettings>){dirty.current=true;setDraft(old=>({...old,...value}));}
 async function save(next=draft){if(saving.current)return false;saving.current=true;setBusy(true);try{const response=await fetch('/api/live-scoreboard',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});const result=await response.json() as {settings:LiveBoardSettings;error?:string};if(!response.ok)throw Error(result.error||'Không lưu được cấu hình.');setDraft(result.settings);setData(old=>old?{...old,settings:result.settings,packet:null}:old);dirty.current=false;setMessage('Đã lưu và áp dụng cấu hình.');return true;}catch(error){setMessage((error as Error).message);return false;}finally{saving.current=false;setBusy(false);}}
 async function downloadPortableBridge(){
  setMessage('Đang tải ứng dụng kết nối Free Fire…');
  const executable=await prepareGameConnector(location.origin);
  const url=URL.createObjectURL(executable);
  const link=document.createElement('a');link.href=url;link.download='Overlay-Studio-Connect.exe';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  setMessage('Mở Overlay-Studio-Connect.exe vừa tải trên máy chạy Free Fire. Không cần cài đặt hay giải nén. Giữ ứng dụng chạy; trang này sẽ tự kết nối. Những lần sau chỉ cần mở lại file đó.');
 }
 async function pair(portable=false){
  if(connected||connectionAttempt.current.busy)return;
  if(dirty.current&&!await save(draft))return;
  setBusy(true);setConnectionHint('');setMessage('Đang chuẩn bị kết nối game…');
  try{
   if(portable||needsPortableBridge(location.hostname)){await downloadPortableBridge();return;}
   const result=await connectLocalGame(location.origin,{allowPairing:true});
   if(result.status==='unavailable'){await downloadPortableBridge();return;}
   if(['running','resumed','paired'].includes(result.status))setMessage('Đã khôi phục kết nối Free Fire. Dữ liệu sẽ tự cập nhật.');
   else setMessage(result.message||'Đang chờ kết nối game. Web sẽ tự thử lại.');
  }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!data||!origin||apiError||busy||!canConnectLocalGame(origin))return;
  const serverNow=data.serverNow+Math.max(0,Date.now()-receivedAt.current);
  if(data.health.lastSeenAt&&serverNow-data.health.lastSeenAt<5000)return;
  const attempt=connectionAttempt.current;
  if(attempt.busy||Date.now()<attempt.nextAt)return;
  attempt.busy=true;attempt.nextAt=Date.now()+10000;setAutoConnecting(true);
  void connectLocalGame(origin,{allowPairing:!data.health.paired}).then(result=>{
   if(!attempt.mounted)return;
   if(['running','resumed','paired'].includes(result.status))setConnectionHint('Kết nối đã sẵn sàng. Đang chờ dữ liệu từ game.');
   else if(result.status==='unavailable')setConnectionHint('Chưa tìm thấy kết nối tự động trên máy này. Nếu đã dùng ứng dụng kết nối, chỉ cần mở lại file đã tải.');
   else setConnectionHint(result.message||'Đang chờ kết nối game. Sẽ tự thử lại.');
  }).catch(error=>{if(attempt.mounted)setConnectionHint((error as Error).message);}).finally(()=>{attempt.busy=false;if(attempt.mounted)setAutoConnecting(false);});
 },[data,origin,apiError,busy,now]);
 async function upload(file:File|undefined){if(!file)return;setBusy(true);try{if(file.size>MAX_UPLOAD_BYTES)throw Error('Ảnh tối đa 10 MB.');const body=new FormData();body.append('file',file);const path=await readUploadResponse(await fetch('/api/upload',{method:'POST',body}));const alignment=await analyzeLiveImage(file);patch({design:{...draft.design,kv:path,alignment,autoAlign:true,showHeader:alignment?false:draft.design.showHeader}});setMessage(alignment?'Đã tự căn hàng theo ảnh KV. Kiểm tra các cột và Lưu & áp dụng cấu hình.':'Đã tải ảnh. Mở Căn dữ liệu theo ảnh KV để tự căn lại hoặc chỉnh riêng từng cột.');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}
 function number(label:string,value:number,min:number,max:number,change:(n:number)=>void,step=1){return <label>{label}<input type="number" min={min} max={max} step={step} value={value} disabled={busy} onChange={event=>{const n=event.target.valueAsNumber;if(Number.isFinite(n))change(Math.max(min,Math.min(max,n)));}}/></label>;}
 const automatic=followsGame(draft);
 const serverNow=data?data.serverNow+Math.max(0,now-receivedAt.current):now;
 const age=data?.packet?Math.max(0,serverNow-data.packet.capturedAt):0;const connection=gameConnectionPresentation(data?.health??null,data?.packet??null,serverNow,apiError);const connected=connection.connected;
 const diagnostic=data?.health.diagnostic as {rows?:Array<{teamName?:string;elims?:number|null;aliveCount?:number|null}>;detectedMatchId?:string;visibleRows?:number;remainingTeams?:number;remainingPlayers?:number;processingMs?:number;teamCount?:number;playerCount?:number;groupMappingCount?:number;sourceEventAgeMs?:number|null;elimsCoverage?:string}|null;
 const obsURL=data?origin+'/live-scoreboard/overlay?token='+encodeURIComponent(data.overlayToken):'';
 return <div className="home-shell"><header className="topbar"><Link href="/teams" className="account-link">Đội & logo</Link><Link href="/account" className="account-link">Đổi mật khẩu</Link><button className="logout-button" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});location.assign('/login');}}>Đăng xuất</button><strong>Bảng điểm trong trận</strong><span>{apiError?'Mất kết nối máy chủ':connected?'Đã kết nối game':autoConnecting?'Đang tự kết nối…':'Chờ kết nối game'}</span></header><main className="live-board-studio">
 <section className="panel live-board-controls" ref={settingsPanel}>
 <div className="live-board-control-heading"><h1>Điều khiển</h1><div className="live-board-disclosure-actions"><button type="button" onClick={()=>settingsPanel.current?.querySelectorAll('details').forEach(item=>{item.open=true;})}>Mở tất cả</button><button type="button" onClick={()=>settingsPanel.current?.querySelectorAll('details').forEach(item=>{item.open=false;})}>Thu gọn tất cả</button></div></div>
 <div className="live-board-health" role="status"><b>{connection.title}</b>{automatic&&<span>Trận {data?.packet?.matchId||diagnostic?.detectedMatchId||'—'} · {data?.packet?.expectedTeams??diagnostic?.teamCount??'—'} đội</span>}{data?.packet&&<span>{(age/1000).toFixed(1)} giây trước</span>}</div>
 <div className="player-leader-actions live-board-primary-actions"><button className="button primary" disabled={busy||!data} onClick={()=>void save()}>Lưu & áp dụng cấu hình</button><button className="button secondary" disabled={busy||autoConnecting||!data||connected||!!apiError} onClick={()=>void pair()}>{connected?'Đã kết nối Free Fire':autoConnecting?'Đang tự kết nối…':busy?'Đang chuẩn bị…':'Kết nối Free Fire'}</button><button className={'button '+(draft.enabled?'secondary':'primary')} disabled={busy||!data} onClick={async()=>{const enabled=!draft.enabled;if(await save({...draft,enabled}))setPreviewVisible(enabled);}}>{draft.enabled?'Ẩn bảng':'Bật bảng trong trận'}</button></div>
 <p className="live-board-connection-note" role="status" style={{fontSize:12,lineHeight:1.5,margin:'0 0 12px'}}>{!connected&&connectionHint&&!apiError?connectionHint:connection.detail}</p>
 {message&&<p className="loading-banner" role="status">{message}</p>}
 <details className="live-board-control-section"><summary>Kết nối trên máy game</summary><p>Chỉ cần mở ứng dụng kết nối trên máy có Free Fire. Nếu chuyển file sang máy khác, mở trang bằng IP LAN của máy chủ trước khi tải.</p><button className="button secondary" disabled={busy||autoConnecting||!data||connected||!!apiError} onClick={()=>void pair(true)}>Tải ứng dụng kết nối</button><p>Không cần cài Node.js, giải nén hay nhập cấu hình. Chỉ chuyển file kết nối cho máy game của bạn.</p></details>
 <label>Link OBS<input readOnly value={obsURL} onFocus={e=>e.target.select()}/></label>
 <label>Bảng điểm tổng liên kết<select value={draft.scoreBoardId} disabled={busy} onChange={e=>patch({scoreBoardId:e.target.value})}><option value="">Theo bảng đang chọn</option>{data?.scoreSources?.map(source=><option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
 {draft.scoreBoardId&&!data?.scoreSources?.some(s=>s.id===draft.scoreBoardId)&&<p role="status">Bảng điểm liên kết không còn tồn tại.</p>}
 <details className="live-board-control-section"><summary>Nguồn & trận</summary><div className="live-board-form">
 {!automatic&&<label>Match ID<input aria-label="Match ID bảng trong trận" value={draft.matchId} inputMode="numeric" maxLength={24} disabled={busy} onChange={e=>patch({matchId:e.target.value})}/></label>}
 <label>Nguồn<select value={draft.adapter} disabled={busy} onChange={e=>patch({adapter:e.target.value as LiveBoardSettings['adapter']})}><option value="game-log">Free Fire · Player.log</option><option value="windows-ocr">OCR bảng L</option><option value="normalized-file">File JSON</option></select></label>
 <label>Chế độ<select value={draft.mode} disabled={busy} onChange={e=>patch({mode:e.target.value as LiveBoardSettings['mode']})}><option value="replay">Replay</option><option value="live">Trực tiếp</option></select></label>
 {!automatic&&number('Số đội',draft.expectedTeams,1,100,n=>patch({expectedTeams:n}))}
 </div>{draft.adapter==='game-log'&&draft.mode==='live'&&<label className="live-board-check"><input type="checkbox" checked={draft.followGame} disabled={busy} onChange={e=>patch({followGame:e.target.checked})}/>Tự theo trận đang chạy trong game</label>}
 {!automatic&&<label className="live-board-check"><input type="checkbox" checked={draft.rosterConfirmed} disabled={busy} onChange={e=>patch({rosterConfirmed:e.target.checked})}/>Đã xác nhận đủ số đội</label>}
 {draft.adapter==='normalized-file'&&<label>Đường dẫn file JSON<input value={draft.sourcePath} disabled={busy} onChange={e=>patch({sourcePath:e.target.value})}/></label>}
 {!automatic&&diagnostic?.detectedMatchId&&<button className="button secondary" disabled={busy} onClick={()=>patch({matchId:diagnostic.detectedMatchId!})}>Dùng Match ID {diagnostic.detectedMatchId}</button>}
 {draft.adapter==='windows-ocr'&&<details><summary>Vùng OCR & ALIVE</summary><div className="live-board-form">
 {number('Y đầu hàng (%)',draft.layout.rowTop*100,0,100,n=>patch({layout:{...draft.layout,rowTop:n/100}}),.1)}
 {number('Bước hàng (%)',draft.layout.rowStep*100,.1,100,n=>patch({layout:{...draft.layout,rowStep:n/100}}),.1)}
 {number('Cao vùng chữ (%)',draft.layout.rowHeight*100,.1,100,n=>patch({layout:{...draft.layout,rowHeight:n/100}}),.1)}
 {number('Số hàng nhìn thấy',draft.layout.visibleRows,1,24,n=>patch({layout:{...draft.layout,visibleRows:n}}))}
 {number('X tên đội (%)',draft.layout.teamX*100,0,100,n=>patch({layout:{...draft.layout,teamX:n/100}}),.1)}
 {number('Rộng tên đội (%)',draft.layout.teamWidth*100,.1,100,n=>patch({layout:{...draft.layout,teamWidth:n/100}}),.1)}
 {number('X ELIMS (%)',draft.layout.elimsX*100,0,100,n=>patch({layout:{...draft.layout,elimsX:n/100}}),.1)}
 {number('Rộng ELIMS (%)',draft.layout.elimsWidth*100,.1,100,n=>patch({layout:{...draft.layout,elimsWidth:n/100}}),.1)}
 {number('Dung sai màu',draft.layout.colorTolerance,1,100,n=>patch({layout:{...draft.layout,colorTolerance:n}}))}
 </div><label className="live-board-check"><input type="checkbox" checked={draft.layout.readAlive} disabled={busy} onChange={e=>patch({layout:{...draft.layout,readAlive:e.target.checked}})}/>Đọc ALIVE từ vạch màu</label></details>}
 </details>
 <details className="live-board-control-section"><summary>Giao diện & KV</summary>
 <div className="player-leader-actions"><button className="button secondary" disabled={busy} onClick={()=>{patch({design:verticalLiveBoardDesign(draft.design)});setMessage('Đã chọn bảng dọc đỏ trắng. Bấm Lưu & áp dụng cấu hình để chiếu.');}}>Bảng dọc đỏ trắng</button><a className="button secondary" href={LIVE_VERTICAL_KV} download>Tải bảng dọc PNG</a><button className="button secondary" disabled={busy} onClick={()=>{patch({design:compactLiveBoardDesign(draft.design)});setMessage('Đã chọn KV 14 đội.');}}>KV 14 đội</button>{draft.design.kv&&<button className="button secondary" disabled={busy} onClick={()=>patch({design:{...draft.design,kv:'',alignment:null}})}>Bỏ KV</button>}</div>
 <label>Tải KV<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label>
 <details><summary>Mẫu & tải xuống</summary><div className="player-leader-actions"><a className="button secondary" href={LIVE_COMPACT_KV} download>Tải KV 14 đội</a><button className="button secondary" disabled={busy} onClick={()=>{patch({design:testLiveBoardDesign(draft.design)});setMessage('Đã chọn KV test.');}}>KV test</button><a className="button secondary" href={LIVE_TEST_KV} download>Tải KV test</a></div></details>
 </details>
 <details className="live-board-control-section"><summary>Vị trí dữ liệu & cột hiển thị</summary>
 <LiveBoardAlignmentControls design={draft.design} disabled={busy} onChange={design=>patch({design})} notify={setMessage}/>
 <label>Tiêu đề<input value={draft.design.title} disabled={busy} onChange={e=>patch({design:{...draft.design,title:e.target.value}})}/></label><div className="live-board-form">
 {!draft.design.alignment&&<>{number('Cách mép trái ảnh (px)' ,draft.design.x,0,1900,n=>patch({design:{...draft.design,x:n}}))}{number('Cách mép trên ảnh (px)' ,draft.design.y,0,1050,n=>patch({design:{...draft.design,y:n}}))}{number('Chiều rộng bảng (px)' ,draft.design.width,300,1920,n=>patch({design:{...draft.design,width:n}}))}{number('Chiều cao hàng (px)' ,draft.design.rowHeight,20,120,n=>patch({design:{...draft.design,rowHeight:n}}))}</>}{number('Cỡ chữ',draft.design.fontSize,10,70,n=>patch({design:{...draft.design,fontSize:n}}))}
 </div><div className="live-board-checks">{(['showHeader','showSlot','showAlive','showElims','showTotal','showDamage','showPlacement'] as const).map((key,i)=><label className="live-board-check" key={key}><input type="checkbox" checked={draft.design[key]} disabled={busy} onChange={e=>patch({design:{...draft.design,[key]:e.target.checked}})}/>{['Tiêu đề cột','SLOT','ALIVE','ELIMS','Điểm tổng','DAMAGE','Hạng'][i]}</label>)}</div>
 </details>
 <details className="live-board-control-section"><summary>Chẩn đoán</summary>
 <p>{data?.health.message||'Chưa có trạng thái nguồn.'}</p>
 {data?.packet?.source==='game-log'&&data.packet.sourceEventAt&&<p>Event gần nhất: {(Math.max(0,serverNow-data.packet.sourceEventAt)/1000).toFixed(1)} giây trước</p>}
 {draft.adapter==='game-log'&&diagnostic&&<><p>{diagnostic.teamCount??0} đội · {diagnostic.playerCount??0} player · {diagnostic.groupMappingCount??0} đội đã xác minh UID</p>{!automatic&&!!diagnostic.teamCount&&diagnostic.teamCount!==draft.expectedTeams&&<button className="button secondary" disabled={busy} onClick={()=>void save({...draft,expectedTeams:diagnostic.teamCount!})}>Dùng {diagnostic.teamCount} đội và áp dụng</button>}</>}
 {diagnostic?.elimsCoverage==='missing-start'&&<p>Log thiếu mốc đầu trận.</p>}
 {diagnostic?.rows&&<><p>{diagnostic.rows.length} hàng · {diagnostic.remainingTeams??'—'} đội · {diagnostic.remainingPlayers??'—'} người · {diagnostic.processingMs??'—'} ms</p><table><thead><tr><th>TEAM</th><th>ELIMS</th><th>ALIVE</th></tr></thead><tbody>{diagnostic.rows.map((row,i)=><tr key={i}><td>{row.teamName||'—'}</td><td>{row.elims??'—'}</td><td>{row.aliveCount??'—'}</td></tr>)}</tbody></table></>}
 </details>
 </section><section className="live-board-preview-column"><h2>Xem trước</h2><div className="player-leader-actions"><button className="button secondary" type="button" onClick={()=>setPreviewVisible(value=>!value)}>{previewVisible?'Ẩn xem trước · OUT':'Hiện xem trước · IN'}</button><button className="button secondary" type="button" onClick={()=>{setPreviewVisible(true);setPreviewRun(value=>value+1);}}>Xem lại animation IN</button></div><div className="player-leader-preview" ref={preview}><div style={{width:1920,height:1080,transform:`scale(${width/1920})`,transformOrigin:'top left'}}><LiveBoardOverlay key={previewRun} settings={{...draft,enabled:previewVisible}} packet={data?.packet||null} teams={data?.teams||[]} totalRows={data?.scoreSources?.find(s=>s.id===(draft.scoreBoardId||data.selectedScoreBoardId))?.rows??null} ageMs={age} preview={previewVisible}/></div></div></section>
 </main></div>;
}
