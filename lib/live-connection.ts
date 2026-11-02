import type {LiveHealth,LivePacket} from './live-board';

export type LocalConnectionResult={status:'unavailable'|'running'|'resumed'|'paired'|'pairing-required'|'other-server'|'waiting';message?:string};

export function canConnectLocalGame(serverUrl:string){
 try{const url=new URL(serverUrl);return url.protocol==='http:'&&url.port==='5183'&&(url.hostname==='localhost'||url.hostname==='127.0.0.1');}catch{return false;}
}

// Automatic use never downloads an application and never rotates an existing key.
export async function connectLocalGame(serverUrl:string,{allowPairing=false,request=fetch}:{allowPairing?:boolean;request?:typeof fetch}={}):Promise<LocalConnectionResult>{
 if(!canConnectLocalGame(serverUrl))return {status:'unavailable'};
 const origin=new URL(serverUrl).origin;
 let status:{service?:string;running?:boolean;serverUrl?:string|null};
 try{
  const response=await request('http://127.0.0.1:5184/status',{cache:'no-store',signal:AbortSignal.timeout(2000)});
  if(!response.ok)return {status:'unavailable'};
  status=await response.json() as typeof status;
  if(status.service!=='overlay-studio-live-bridge')return {status:'unavailable'};
 }catch{return {status:'unavailable'};}
 if(status.running)return status.serverUrl&&status.serverUrl!==origin?{status:'other-server',message:'Máy game đang kết nối với máy chủ khác.'}:{status:'running'};
 let resumed:Response;
 try{resumed=await request('http://127.0.0.1:5184/resume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverUrl:origin}),signal:AbortSignal.timeout(5000)});}catch{return {status:'waiting',message:'Đang chờ kết nối đã lưu. Sẽ tự thử lại.'};}
 if(resumed.ok)return {status:'resumed'};
 let reason:{code?:string;error?:string}={};try{reason=await resumed.json() as typeof reason;}catch{/* Older launchers may not implement resume. */}
 if(reason.code==='other-server')return {status:'other-server',message:reason.error};
 if(resumed.status!==404&&reason.code!=='pairing-required')return {status:'waiting',message:reason.error||'Đang chờ kết nối game. Sẽ tự thử lại.'};
 if(!allowPairing)return {status:'pairing-required',message:'Bấm Kết nối Free Fire để ghép lại máy này.'};
 const paired=await request('/api/live-scoreboard',{method:'POST',signal:AbortSignal.timeout(4000)});
 const result=await paired.json() as {token?:string;error?:string};
 if(!paired.ok)throw Error(result.error||'Chưa ghép được kết nối game.');
 if(typeof result.token!=='string'||result.token.length<50||result.token.length>200)throw Error('Khóa kết nối không hợp lệ.');
 const started=await request('http://127.0.0.1:5184/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serverUrl:origin,token:result.token}),signal:AbortSignal.timeout(5000)});
 if(!started.ok){let error='Chưa khởi động được kết nối game.';try{error=(await started.json() as {error?:string}).error||error;}catch{}throw Error(error);}
 return {status:'paired'};
}

export function gameConnectionPresentation(health:LiveHealth|null,packet:LivePacket|null,now:number,serverError=''){
 if(serverError)return {connected:false,title:'Mất kết nối máy chủ',detail:'Web đang tự thử lại. Kết nối đọc game vẫn được giữ nguyên.'};
 const connected=!!health?.lastSeenAt&&now-health.lastSeenAt<5000;
 if(!connected)return {connected:false,title:'Chờ kết nối game',detail:'Web đang chờ máy game gửi dữ liệu.'};
 if(health.sourceStatus==='identity-pending')return {connected:true,title:'Đang xác minh đội',detail:health.message||'Đang chờ đủ thông tin đội từ nguồn game.'};
 if(health.sourceStatus==='source-error')return {connected:true,title:'Đã kết nối · chờ nguồn game',detail:health.message||'Ứng dụng đã kết nối; nguồn game chưa sẵn sàng.'};
 if(health.sourceStatus==='source-stale')return {connected:true,title:'Game tạm ngừng cập nhật',detail:health.message||'Đang giữ dữ liệu hợp lệ gần nhất.'};
 if(packet)return now-packet.capturedAt>5000?{connected:true,title:'Dữ liệu chậm',detail:'Đang giữ dữ liệu hợp lệ gần nhất.'}:{connected:true,title:packet.isReplay?'REPLAY':'LIVE',detail:'Dữ liệu đang tự cập nhật.'};
 return {connected:true,title:'Đã kết nối · chờ trận',detail:health.message||'Mở Free Fire và vào trận. Không cần kết nối lại.'};
}
