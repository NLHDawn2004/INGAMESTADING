import {build} from 'esbuild';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {zipSync,strToU8} from 'fflate';
const root=fileURLToPath(new URL('..',import.meta.url));
const bundle=await build({entryPoints:[root+'/scripts/live-scoreboard-bridge.mjs'],bundle:true,write:false,format:'esm',platform:'node',target:'node22',packages:'bundle'});
const cmd=[
 '@echo off',
 'cd /d "%~dp0"',
 'where node >nul 2>nul',
 'if errorlevel 1 (',
 ' echo Can cai Node.js 22.13 tro len tren may chay Free Fire.',
 ' pause',
 ' exit /b 1',
 ')',
 'node -e "const [a,b]=process.versions.node.split(\'.\').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"',
 'if errorlevel 1 (',
 ' echo Node.js qua cu. Can Node.js 22.13 tro len.',
 ' pause',
 ' exit /b 1',
 ')',
 'if not exist ".live-scoreboard.local.json" (',
 ' echo Hay tai bo bridge co san cau hinh tu nut Ket noi game tren web.',
 ' echo Giai nen TOAN BO ZIP truoc khi chay START.cmd.',
 ' pause',
 ' exit /b 1',
 ')',
 'echo Giu cua so nay chay tren may co Free Fire. Web se tu nhan ket noi.',
 'node bridge.mjs --config ".live-scoreboard.local.json"',
 'pause',
 '',
].join('\r\n');
const readme=`BRIDGE BANG DIEM TRONG TRAN - MAY GAME / LAN
Yeu cau Windows 10/11 va Node.js >=22.13 tren may chay Free Fire.
1. Tren web /live-scoreboard, bam Ket noi game tren may nay hoac Tai bridge cho may game.
2. Giai nen TOAN BO Overlay-Studio-Game-Bridge.zip tren may chay Free Fire.
3. Mo START.cmd va giu cua so nay chay. Web tu nhan ket noi, khong can bam ket noi lan nua.
Cau hinh serverUrl va khoa rieng da duoc web them vao ZIP. Khong can chep ca du an.
Player.log duoc doc theo tai khoan Windows hien tai; khong can cai game vao o D hay bat bang L.
May game can truy cap duoc dia chi may chu web trong file cau hinh (cung LAN).
Neu tai tren may chu bang localhost, hay mo web bang IP LAN truoc khi tai de chuyen sang may game.
Tai goi moi se thay khoa cu. Khong chia se ZIP da co cau hinh; khong dua khoa vao Git.
Nguon va che do live/replay duoc dieu khien tren web. OCR bang L la nguon du phong.
`;
const zip=zipSync({'bridge.mjs':bundle.outputFiles[0].contents,'live-scoreboard-capture.ps1':new Uint8Array(readFileSync(root+'/scripts/live-scoreboard-capture.ps1')),'START.cmd':strToU8(cmd),'README.txt':strToU8(readme)});
writeFileSync(root+'/public/live-bridge.zip',zip);console.log('Built public/live-bridge.zip without private configuration.');
