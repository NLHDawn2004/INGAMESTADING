export const CONNECTOR_FOOTER='OVL-CONNECTOR-CONFIG-V1';
export type GameConnectorConfig={serverUrl:string;token:string;intervalMs:number};

function validateConfig(value:unknown):GameConnectorConfig{
 if(!value||typeof value!=='object')throw Error('Cấu hình kết nối không hợp lệ.');
 const config=value as Record<string,unknown>;
 if(typeof config.serverUrl!=='string')throw Error('Thiếu địa chỉ máy chủ.');
 const server=new URL(config.serverUrl);
 if(!['http:','https:'].includes(server.protocol)||server.username||server.password||server.pathname!=='/'||server.search||server.hash)throw Error('Địa chỉ máy chủ không hợp lệ.');
 if(typeof config.token!=='string'||config.token.length<50||config.token.length>200)throw Error('Khóa kết nối không hợp lệ.');
 return {serverUrl:server.origin,token:config.token,intervalMs:750};
}

export function gameConnectorTrailer(value:unknown){
 const config=new TextEncoder().encode(JSON.stringify(validateConfig(value)));
 const marker=new TextEncoder().encode(CONNECTOR_FOOTER);
 const result=new Uint8Array(config.length+4+marker.length);
 result.set(config);new DataView(result.buffer).setUint32(config.length,config.length,true);
 result.set(marker,config.length+4);
 return result;
}

export function configureGameConnector(executable:Uint8Array,value:unknown){
 if(executable.length<65536||executable[0]!==0x4d||executable[1]!==0x5a)throw Error('Ứng dụng kết nối tải về không hợp lệ.');
 const trailer=gameConnectorTrailer(value);
 const result=new Uint8Array(executable.length+trailer.length);
 result.set(executable);result.set(trailer,executable.length);
 return result;
}

export function readGameConnectorConfig(executable:Uint8Array):GameConnectorConfig|null{
 const marker=new TextEncoder().encode(CONNECTOR_FOOTER);
 if(executable.length<marker.length+4)return null;
 const markerAt=executable.length-marker.length;
 if(!marker.every((value,index)=>executable[markerAt+index]===value))return null;
 const length=new DataView(executable.buffer,executable.byteOffset,executable.byteLength).getUint32(markerAt-4,true);
 if(length<2||length>4096||length>markerAt-4)throw Error('File kết nối bị hỏng. Tải lại từ trang điều khiển.');
 return validateConfig(JSON.parse(new TextDecoder().decode(executable.subarray(markerAt-4-length,markerAt-4))));
}
