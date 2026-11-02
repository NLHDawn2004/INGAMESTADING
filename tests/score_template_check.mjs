import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {unzlibSync} from 'fflate';import {buildSync} from 'esbuild';
import {detectScoreTemplate,makeScoreTemplate,scoreTemplateSchema,templateCapacity} from '../lib/score-template.ts';
import {newScoreBoard,scoreSnapshot,resetScoreData} from '../lib/scoreboard.ts';
import {initialState,stateSchema} from '../lib/state.ts';

// Decode the actual supplied PNG for detector regression, without modifying the artwork.
const png=readFileSync(new URL('../public/score-templates/standing-neon.png',import.meta.url));const parts=[];let offset=8,width,height;
while(offset<png.length){const n=png.readUInt32BE(offset),tag=png.toString('ascii',offset+4,offset+8),chunk=png.subarray(offset+8,offset+8+n);if(tag==='IHDR'){width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);assert.equal(chunk[8],8);assert.equal(chunk[9],6);}if(tag==='IDAT')parts.push(chunk);offset+=n+12;}
const stride=width*4,raw=unzlibSync(Buffer.concat(parts)),rgba=new Uint8Array(height*stride);let at=0;
for(let y=0;y<height;y++){const filter=raw[at++];for(let x=0;x<stride;x++){const a=x>=4?rgba[y*stride+x-4]:0,b=y?rgba[(y-1)*stride+x]:0,c=y&&x>=4?rgba[(y-1)*stride+x-4]:0;let prediction=0;if(filter===1)prediction=a;if(filter===2)prediction=b;if(filter===3)prediction=Math.floor((a+b)/2);if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);prediction=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}rgba[y*stride+x]=(raw[at++]+prediction)&255;}}
const small=new Uint8Array(480*270*4);for(let y=0;y<270;y++)for(let x=0;x<480;x++)small.set(rgba.subarray(y*4*stride+x*16,y*4*stride+x*16+4),(y*480+x)*4);
const template=detectScoreTemplate('/score-templates/standing-neon.png','Neon','total',480,270,small);
assert.equal(template.detected,true);assert.equal(template.groups.length,2);assert.deepEqual(template.groups.map(g=>g.rows),[6,6]);assert.equal(templateCapacity(template),12);assert.ok(Math.abs(template.groups[0].statsX+template.groups[0].x-518)<6);assert.ok(Math.abs(template.groups[1].statsX+template.groups[1].x-1374)<6);assert.ok(template.subtitleRegion);assert.equal(rgba[3],0,'Preserve artwork transparency');
const other=new Uint8Array(240*135*4);for(let row=0;row<6;row++)for(let y=45+row*8;y<51+row*8;y++)for(let x=80;x<200;x++)other.set([40,240,140,255],(y*240+x)*4);
const single=detectScoreTemplate('/score-templates/standing-neon.png','Different layout','total',240,135,other);assert.equal(single.rowStyle,'connected','Separate statistic cells do not imply separate full rows');assert.equal(single.groups.length,1);assert.equal(single.groups[0].rows,6);assert.equal(single.detected,true);
assert.equal(detectScoreTemplate('/score-templates/standing-neon.png','Unknown','total',240,135,new Uint8Array(other.length)).detected,false,'Do not claim automatic alignment on an unrecognized image');
assert.equal(scoreTemplateSchema.safeParse({...template,image:'https://other.example/template.png'}).success,false);
assert.equal(scoreTemplateSchema.safeParse({...template,groups:[{...template.groups[0],x:1900}]}).success,false);
const board=newScoreBoard('Template');board.totalTemplate=template;board.matchTemplate=makeScoreTemplate('/score-templates/standing-neon.png','Match','match');board.teams=Array.from({length:12},(_,i)=>({id:'team-'+i,name:'TEAM '+i,logo:'/logos/team.png',externalKeys:[],adjustment:0}));board.matches=[{id:'test',stageId:board.stages[0].id,name:'TRẬN 1',source:'manual',enabled:true,importedAt:1,rows:board.teams.map((t,i)=>({teamId:t.id,rank:i+1,kills:i,booyah:i===0?1:0,sourcePoints:null,rankVerified:true}))}];
const score=scoreSnapshot(board,'total');const originalX=score.template.groups[0].x;board.totalTemplate.groups[0].x++;assert.equal(score.template.groups[0].x,originalX,'Published template is a snapshot');board.totalTemplate=template;
const state=initialState();state.scoreboards={boards:[board],selectedId:board.id,published:score,publishedMatch:scoreSnapshot(board,'match','test')};assert.deepEqual(stateSchema.parse(JSON.parse(JSON.stringify(state))).scoreboards.published.template,score.template);assert.deepEqual(resetScoreData(state.scoreboards,[]).boards[0].totalTemplate,board.totalTemplate);
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(new URL('../package.json',import.meta.url));const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');const build=buildSync({stdin:{contents:"export {default as Overlay} from './components/ScoreboardOverlay';export {default as Controls} from './components/ScoreTemplateControls';",resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom']});const module={exports:{}};new Function('require','module','exports',build.outputFiles[0].text)(require,module,module.exports);
const html=renderToStaticMarkup(React.createElement(module.exports.Overlay,{score}));assert.equal((html.match(/class="template-score-row"/g)||[]).length,12);assert.equal((html.match(/class="template-rank-mask"/g)||[]).length,12);assert.deepEqual([...html.matchAll(/--row-delay:(\d+)ms/g)].map(m=>Number(m[1])),Array.from({length:12},(_,i)=>(i+1)*250));assert.ok(html.includes('score-template-image'));assert.ok(!html.includes('score-tables'));assert.ok(!html.includes('>00<'));assert.ok(html.includes('TEAM 11'));
const controls=renderToStaticMarkup(React.createElement(module.exports.Controls,{view:'total',value:template,onChange:()=>{},disabled:false,notify:()=>{}}));assert.ok(controls.includes('Dùng mẫu neon 12 đội'));assert.ok(controls.includes('Đã tự nhận diện'));assert.ok(controls.includes('Căn dữ liệu trên mẫu'));
console.log('PASS: actual PNG auto-detects 2×6 rows and banner; different layout changes columns; unknown image flagged; transparent artwork retained; independent saved/published/reset templates; 12 rows with names/logos and correct delays, no padded zeroes.');

const strips=new Uint8Array(240*135*4);
for(let row=0;row<6;row++)for(let y=45+row*8;y<51+row*8;y++)for(let x=10;x<220;x++)strips.set([40,240,140,255],(y*240+x)*4);
const separate=detectScoreTemplate('/score-templates/standing-neon.png','Separate rows','total',240,135,strips);
assert.equal(separate.rowStyle,'separated','Full-width separate strips select the video animation');assert.equal(separate.rowArtwork,true,'Verified full-width strips have real row artwork');assert.equal(single.rowArtwork,false,'Stat cells cannot enable whole-row artwork');
const legacy={...template};delete legacy.rowStyle;
assert.equal(scoreTemplateSchema.parse(legacy).rowStyle,'connected','Existing templates retain the previous animation');
for(const rowStyle of ['connected','separated']){
 const rendered=renderToStaticMarkup(React.createElement(module.exports.Overlay,{score:{...score,template:{...score.template,rowStyle}}}));
 assert.ok(rendered.includes('data-row-style="'+rowStyle+'"'));
 assert.equal(rendered.includes('clipPathUnits="userSpaceOnUse"'),template.rowArtwork===true,'Only verified row artwork is cut from the KV');
 assert.equal((rendered.match(/background-repeat:no-repeat/g)||[]).length,template.rowArtwork?12:0,'Data animation style cannot enable artwork slicing');
}
const animationCss=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(animationCss.includes('@keyframes score-row-enter{from{clip-path:inset(0 0 100% 0)}'));
assert.ok(animationCss.includes('[data-row-style="separated"] .template-score-row{animation-name:score-row-slide}'));
console.log('PASS: full-row vs statistic-cell detection, legacy fallback, per-template animation and moving row artwork.');
