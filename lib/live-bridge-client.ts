import {unzipSync,zipSync,strToU8} from 'fflate';
import {gameConnectorTrailer} from './game-connector-file.ts';

export function needsPortableBridge(hostname:string){
 return hostname!=='localhost'&&hostname!=='127.0.0.1';
}

export async function prepareGameConnector(serverUrl:string,request:typeof fetch=fetch){
 const server=new URL(serverUrl);
 if(!['http:','https:'].includes(server.protocol)||server.username||server.password)throw Error('Địa chỉ máy chủ không hợp lệ.');
 const response=await request('/game-connector.exe?v=20261101-1',{cache:'no-store'});
 if(!response.ok)throw Error('Chưa tải được ứng dụng kết nối. Thử tải lại trang.');
 const executable=await response.blob();
 const signature=new Uint8Array(await executable.slice(0,2).arrayBuffer());
 if(executable.size<65536||signature[0]!==0x4d||signature[1]!==0x5a)throw Error('Ứng dụng kết nối tải về không hợp lệ.');
 // Pair only after the large executable has downloaded successfully.
 const paired=await request('/api/live-scoreboard',{method:'POST'});
 const result=await paired.json() as {token?:unknown;error?:string};
 if(!paired.ok)throw Error(result.error||'Cần đăng nhập lại để kết nối game.');
 // Blob composition shares the large runtime rather than copying it several
 // times in browser memory on the game/streaming PC.
 return new Blob([executable,new Uint8Array(gameConnectorTrailer({serverUrl:server.origin,token:result.token,intervalMs:750}))],{type:'application/vnd.microsoft.portable-executable'});
}

// Build the private download in the browser. The public archive never contains a token.
export async function preparePortableBridge(serverUrl:string,request:typeof fetch=fetch){
 const server=new URL(serverUrl);
 if(!['http:','https:'].includes(server.protocol)||server.username||server.password)throw Error('Địa chỉ máy chủ không hợp lệ.');
 const archive=await request('/live-bridge.zip?v=lan-20261101',{cache:'no-store'});
 if(!archive.ok)throw Error('Chưa tải được bộ bridge. Thử tải lại trang rồi kết nối.');
 let entries:ReturnType<typeof unzipSync>;
 try{entries=unzipSync(new Uint8Array(await archive.arrayBuffer()));}catch{throw Error('Bộ bridge tải về không hợp lệ. Thử tải lại trang.');}
 if(!entries['bridge.mjs']||!entries['START.cmd']||!entries['live-scoreboard-capture.ps1'])throw Error('Bộ bridge thiếu file. Cần tạo lại bộ cài trên máy chủ.');
 // Only replace the current pairing after the reusable archive has downloaded successfully.
 const response=await request('/api/live-scoreboard',{method:'POST'});
 const result=await response.json() as {token?:unknown;error?:string};
 if(!response.ok)throw Error(result.error||'Không tạo được khóa bridge. Đăng nhập lại rồi thử.');
 if(typeof result.token!=='string'||result.token.length<50||result.token.length>200)throw Error('Khóa bridge không hợp lệ. Thử kết nối lại.');
 entries['.live-scoreboard.local.json']=strToU8(JSON.stringify({serverUrl:server.origin,token:result.token,intervalMs:750},null,2));
 return zipSync(entries);
}
