export const MAX_UPLOAD_BYTES=10*1024*1024;
export async function readUploadResponse(response:Response):Promise<string>{
 const text=await response.text();let data:{url?:unknown;error?:unknown}={};
 try{const parsed:unknown=JSON.parse(text);if(parsed&&typeof parsed==='object')data=parsed as typeof data;}catch{/* Proxies and framework limits may return plain text or HTML. */}
 if(response.status===413)throw Error('Máy chủ từ chối vì dữ liệu tải lên quá lớn. Ảnh tối đa 10 MB. Nếu ảnh nhỏ hơn 10 MB, hãy khởi động lại web để áp dụng cấu hình tải ảnh mới.');
 if(response.status===401)throw Error('Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi tải ảnh.');
 if(!response.ok)throw Error(typeof data.error==='string'?data.error:'Không tải được ảnh (HTTP '+response.status+'). Thử lại sau.');
 if(typeof data.url!=='string'||!/^\/api\/media\/[a-f0-9-]+$/.test(data.url))throw Error('Máy chủ trả dữ liệu tải ảnh không hợp lệ. Tải lại trang và thử lại.');
 return data.url;
}
