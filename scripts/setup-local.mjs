import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
if(!existsSync('.dev.vars')){
 const password=process.env.STANDING_ADMIN_PASSWORD||randomBytes(18).toString('base64url');
 if(password.length<12)throw Error('Mật khẩu khởi tạo cần ít nhất 12 ký tự.');
 const salt=randomBytes(16);
 const hash='pbkdf2:100000:'+salt.toString('hex')+':'+pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
 writeFileSync('.dev.vars','ADMIN_PASSWORD_HASH="'+hash+'"\n',{flag:'wx',mode:0o600});
 mkdirSync('outputs',{recursive:true});
 writeFileSync('outputs/login-local.txt','Mật khẩu quản trị local: '+password+'\n',{mode:0o600});
 console.log('Đã tạo mật khẩu mới. Xem outputs/login-local.txt trên máy này.');
}else console.log('Giữ cấu hình mật khẩu local hiện có.');
