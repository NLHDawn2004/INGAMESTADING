import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url)),require=createRequire(root+'/package.json');
const source=String.raw`import React from 'react';import assert from 'node:assert/strict';import {renderToStaticMarkup} from 'react-dom/server';import Overlay from './components/LiveBoardOverlay';import {defaultLiveBoardSettings,compactLiveBoardDesign,livePacketSchema} from './lib/live-board';
module.exports=()=>{
 const settings={...defaultLiveBoardSettings(),enabled:true};
 const homeTeams=[{id:'home-a',name:'THƯƠNG LÂM ESP',abbreviation:'TLE',logo:'/logos/tle.png'},{id:'home-b',name:'ĐỘI BETA',abbreviation:'BTA',logo:'/local-team-logos/'+'a'.repeat(64)}];
 const packet=livePacketSchema.parse({sessionId:crypto.randomUUID(),configId:settings.configId,sequence:1,matchId:'42',detectedMatchId:'42',source:'game-log',isReplay:false,capturedAt:Date.now(),expectedTeams:2,complete:true,teams:[{teamId:'game-1',teamName:' tle ',elims:4,aliveCount:4},{teamId:'game-2',teamName:'doi beta',elims:1,aliveCount:3}]});
 const original=JSON.stringify({packet,homeTeams});
 function render(design,teams=homeTeams,p=packet){return renderToStaticMarkup(<Overlay settings={{...settings,design}} packet={p} teams={teams}/>);}
 for(const design of [settings.design,compactLiveBoardDesign(settings.design)]){
  const html=render(design);
  assert.ok(html.includes('src="/logos/tle.png"'),'abbreviation uses homepage logo');
  assert.ok(html.includes('src="/local-team-logos/'+'a'.repeat(64)+'"'),'full name without accents uses homepage logo');
  const fullName={...packet,teams:packet.teams.map(t=>t.teamId==='game-1'?{...t,teamName:'thuong lam   esp'}:{...t,teamName:'bta'})};
  const full=render(design,homeTeams,fullName);assert.ok(full.includes('/logos/tle.png'));assert.ok(full.includes('/local-team-logos/'));
  const changed=render(design,homeTeams.map(t=>t.id==='home-a'?{...t,logo:'/logos/new-tle.png'}:t));assert.ok(changed.includes('/logos/new-tle.png'));assert.ok(!changed.includes('src="/logos/tle.png"'));
  const unknown=render(design,homeTeams,{...packet,teams:packet.teams.map(t=>({...t,teamName:'UNREGISTERED'}))});assert.ok(!unknown.includes('/logos/tle.png'));assert.ok(!unknown.includes('/local-team-logos/'));
  const ambiguous=render(design,[...homeTeams,{id:'duplicate',name:'TLE',logo:'/logos/wrong.png'}]);assert.ok(!ambiguous.includes('src="/logos/tle.png"'));assert.ok(!ambiguous.includes('/logos/wrong.png'));
 }
 assert.equal(JSON.stringify({packet,homeTeams}),original);
 console.log('PASS: live scoreboard grid and KV use homepage full names/abbreviations, accents/case/spacing, public/local logo URLs, refreshed homepage logos, unknown/ambiguous protection and immutable source packets.');
};`;
const out=await require('esbuild').build({stdin:{contents:source,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});
const module={exports:{}};new Function('require','module','exports',out.outputFiles[0].text)(require,module,module.exports);module.exports();
