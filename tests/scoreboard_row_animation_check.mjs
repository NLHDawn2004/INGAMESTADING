import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';
import {formatScoreValue} from '../lib/scoreboard.ts';
const root=fileURLToPath(new URL('..',import.meta.url));const require=createRequire(new URL('../package.json',import.meta.url));
const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const build=buildSync({stdin:{contents:"export {default as Match} from './components/MatchScoreboard';export {default as Total} from './components/ScoreboardOverlay';",resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom']});
const module={exports:{}};new Function('require','module','exports',build.outputFiles[0].text)(require,module,module.exports);
const score={title:'TEST',subtitle:'TEST',publishedAt:1,rows:Array.from({length:12},(_,i)=>({teamId:String(i),name:'TEAM '+i,position:i+1,logo:'/logos/test.png',booyah:i===0?1:0,kills:i,total:i,placementPoints:i}))};
for(const [view,Component] of [['match',module.exports.Match],['total',module.exports.Total]]){
 const html=renderToStaticMarkup(React.createElement(Component,{score:{...score,view}}));
 assert.deepEqual([...html.matchAll(/--row-delay:(\d+)ms/g)].map(m=>Number(m[1])),Array.from({length:12},(_,i)=>(i+1)*250));
 const rows=[...html.matchAll(/<div class="(?:match-rank-row|score-table-row)[^"]*"[^>]*>([\s\S]*?)(?=<div class="(?:match-rank-row|score-table-row)|<div class="(?:match-torn-edge|score-paper-edge))/g)];
 assert.equal(rows.length,12);
 for(const [,row] of rows){assert.ok(row.includes('<img '),'Logo must be inside animated row');assert.ok(row.includes('TEAM '),'Team name must be inside animated row');assert.ok((row.match(/<strong\b/g)||[]).length>=4,'Name and all statistics share the animated row');}
 assert.ok(!html.includes('>00<')&&!html.includes('>01<')&&!html.includes('>09<'));
}
for(let n=0;n<=12;n++)assert.equal(formatScoreValue(n),String(n));
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
assert.ok(css.includes('.score-table-row:not(.empty),.match-rank-row{animation:score-row-enter .5s ease-out var(--row-delay,250ms) 1 both}'));
const numeric=css.match(/\.score-table-row>strong,\.match-rank-row>strong\{([^}]*)\}/)[1];assert.ok(!numeric.includes('animation'));assert.ok(numeric.includes('justify-content:center'));
for(const selector of ['.match-winner-paper','.match-rank-paper'])for(const [,body] of css.matchAll(new RegExp(selector.replaceAll('.','\\.')+'\\{([^}]*)\\}','g')))assert.ok(!body.includes('animation:')||body.includes('animation:none'));
console.log('PASS: entire row contains logo, name and all numbers; delays 250, 500, 750ms through 3000ms; 500ms animation runs once; frames still; all numeric values including zero unpadded and centered.');
