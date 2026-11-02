import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export function isAllowedBridgeOrigin(value){
 try{
  const url=new URL(value);
  if(url.protocol!=='http:'||url.port!=='5183'||url.username||url.password)return false;
  if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return true;
  const parts=url.hostname.split('.').map(Number);
  return parts.length===4&&parts.every(n=>Number.isInteger(n)&&n>=0&&n<=255)&&(parts[0]===10||(parts[0]===192&&parts[1]===168)||(parts[0]===172&&parts[1]>=16&&parts[1]<=31));
 }catch{return false;}
}

export function createLiveBridgeHost({projectRoot,bridgePath,dataRoot,nodeArgs=[],spawnProcess=spawn,request=fetch}){
 const configPath=join(dataRoot,'live-scoreboard.local.json');
 let bridge=null,activeConfig=null,starting=false;
 const running=()=>Boolean(bridge&&!bridge.killed&&bridge.exitCode===null);
 function configFrom(value){
  const url=new URL(value.serverUrl);
  if(!isAllowedBridgeOrigin(url.origin)||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw Error('Địa chỉ máy chủ không hợp lệ.');
  if(typeof value.token!=='string'||value.token.length<50||value.token.length>200)throw Error('Cần kết nối lại từ trang điều khiển.');
  return {serverUrl:url.origin,token:value.token,intervalMs:750,...(typeof value.gameRoot==='string'?{gameRoot:value.gameRoot}:{})};
 }
 async function savedConfig(){try{return configFrom(JSON.parse(await readFile(configPath,'utf8')));}catch{return null;}}
 function respond(res,status,value,origin){
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Private-Network':'true','Vary':'Origin'}:{})});res.end(JSON.stringify(value));
 }
 async function readBody(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>12000)throw Error('Yêu cầu quá lớn.');}return JSON.parse(text);}
 async function stopBridge(){
  const current=bridge;if(!current)return;bridge=null;activeConfig=null;
  await new Promise(resolve=>{const timer=setTimeout(resolve,3000);timer.unref();current.once('exit',()=>{clearTimeout(timer);resolve();});current.kill();});
 }
 async function startReader(config){
  if(running()&&activeConfig?.serverUrl===config.serverUrl&&activeConfig.token===config.token)return;
  await stopBridge();await mkdir(dataRoot,{recursive:true});
  await writeFile(configPath,JSON.stringify(config),{encoding:'utf8',mode:0o600});
  const child=spawnProcess(process.execPath,[...nodeArgs,bridgePath,'--config',configPath],{cwd:projectRoot,windowsHide:true,stdio:'ignore'});
  bridge=child;activeConfig=config;
  child.once('exit',()=>{if(bridge===child){bridge=null;activeConfig=null;}});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',error=>{if(bridge===child){bridge=null;activeConfig=null;}reject(error);});});
 }
 const server=createServer(async(req,res)=>{
  const origin=req.headers.origin||'';
  if(!isAllowedBridgeOrigin(origin)){respond(res,403,{error:'Chỉ nhận yêu cầu từ Overlay Studio.'});return;}
  if(req.method==='OPTIONS'){respond(res,204,{},origin);return;}
  const path=new URL(req.url||'/','http://127.0.0.1').pathname;
  if(req.method==='GET'&&path==='/status'){
   respond(res,200,{service:'overlay-studio-live-bridge',ready:true,running:running(),serverUrl:running()?activeConfig?.serverUrl:null},origin);return;
  }
  if(req.method==='POST'&&(path==='/start'||path==='/resume')){
   if(starting){respond(res,409,{code:'starting',error:'Đang kết nối, vui lòng chờ.'},origin);return;}
   starting=true;
   try{
    const body=await readBody(req);const target=new URL(body.serverUrl);
    if(target.origin!==origin||target.pathname!=='/'||target.search||target.hash||target.username||target.password)throw Error('Máy chủ kết nối không khớp trang điều khiển.');
    if(path==='/resume'){
     if(running()){
      if(activeConfig.serverUrl!==target.origin){respond(res,409,{code:'other-server',error:'Máy game đang kết nối với máy chủ khác.'},origin);return;}
      respond(res,200,{ok:true,running:true,resumed:true},origin);return;
     }
     const config=await savedConfig();
     if(!config){respond(res,409,{code:'pairing-required',error:'Cần kết nối lần đầu trên máy này.'},origin);return;}
     if(config.serverUrl!==target.origin){respond(res,409,{code:'other-server',error:'Kết nối đã lưu thuộc máy chủ khác.'},origin);return;}
     // Reuse the saved credential only if the current server still accepts it.
     // A failed reconnect must never rotate keys or replace a source elsewhere.
     let accepted;
     try{accepted=await request(new URL('/api/live-scoreboard/bridge',config.serverUrl),{headers:{Authorization:'Bearer '+config.token},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4000)});}catch{respond(res,503,{code:'server-unavailable',error:'Đang chờ máy chủ web. Sẽ tự kết nối lại.'},origin);return;}
     if(accepted.status===401||accepted.status===403){respond(res,409,{code:'pairing-required',error:'Kết nối đã lưu không còn hiệu lực. Bấm Kết nối Free Fire để ghép lại.'},origin);return;}
     if(!accepted.ok){respond(res,503,{code:'server-unavailable',error:'Máy chủ chưa sẵn sàng. Sẽ tự kết nối lại.'},origin);return;}
     await accepted.body?.cancel();await startReader(config);
     respond(res,200,{ok:true,running:true,resumed:true},origin);return;
    }
    await startReader(configFrom(body));respond(res,200,{ok:true,running:true},origin);
   }catch(error){respond(res,400,{error:String(error?.message||error).slice(0,300)},origin);}
   finally{starting=false;}
   return;
  }
  if(req.method==='POST'&&path==='/stop'){await stopBridge();respond(res,200,{ok:true,running:false},origin);return;}
  respond(res,404,{error:'Không tìm thấy endpoint kết nối.'},origin);
 });
 return {server,async close(){await stopBridge();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
