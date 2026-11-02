import {isSea,getAsset} from 'node:sea';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createServer,connect} from 'node:net';
import {readGameConnectorConfig} from '../lib/game-connector-file.ts';

async function main(){
 if(!isSea())throw Error('Hãy chạy ứng dụng kết nối được tải từ web.');
 if(process.argv.includes('--self-test')){
  console.log(JSON.stringify({application:'overlay-studio-game-connector',standalone:true,platform:process.platform,arch:process.arch,readerBytes:getAsset('reader').byteLength,captureBytes:getAsset('capture').byteLength}));return;
 }
 const config=readGameConnectorConfig(await readFile(process.execPath));
 if(!config)throw Error('Mở trang bảng điểm, bấm Kết nối Free Fire rồi mở file vừa tải.');
 const id=createHash('sha256').update(config.serverUrl+config.token).digest('hex').slice(0,24);
 const pipeName='\\\\.\\pipe\\overlay-studio-game-'+id;
 // Reopening the same download must not start a competing reader/session.
 const existing=await new Promise(resolve=>{
  const socket=connect(pipeName);socket.setTimeout(500);
  socket.once('connect',()=>{socket.end();resolve(true);});
  socket.once('error',()=>resolve(false));socket.once('timeout',()=>{socket.destroy();resolve(false);});
 });
 if(existing){console.log('Ứng dụng kết nối đang chạy. Bạn có thể quay lại trang bảng điểm.');return;}
 const instance=createServer(socket=>socket.end());
 await new Promise((resolve,reject)=>{instance.once('error',reject);instance.listen(pipeName,resolve);});
 const folder=join(process.env.LOCALAPPDATA||process.env.TEMP||'.','ToolStandingingame','Game Connector',id);
 await mkdir(folder,{recursive:true});
 const configPath=join(folder,'connection.json');
 await writeFile(configPath,JSON.stringify(config),{mode:0o600});
 await writeFile(join(folder,'live-scoreboard-capture.ps1'),Buffer.from(getAsset('capture')));
 globalThis.__bridgeScriptUrl=pathToFileURL(join(folder,'live-scoreboard-bridge.mjs')).href;
 process.argv.push('--config',configPath);
 console.log('OVERLAY STUDIO · KẾT NỐI FREE FIRE');
 console.log('Đang kết nối. Giữ cửa sổ này mở; bạn có thể thu nhỏ.');
 console.log('Trang bảng điểm sẽ tự nhận dữ liệu game. Đóng cửa sổ để dừng.');
 try{await import('data:text/javascript;base64,'+Buffer.from(getAsset('reader')).toString('base64'));}
 finally{instance.close();}
}

void main().catch(error=>{
 console.error('Không kết nối được: '+String(error?.message||error).slice(0,300));
 console.error('Kiểm tra máy chủ web đang mở, rồi mở lại ứng dụng kết nối.');
 process.exitCode=1;
 if(process.stdin.isTTY){console.error('Nhấn Enter để đóng.');process.stdin.resume();process.stdin.once('data',()=>process.exit(1));}
});
