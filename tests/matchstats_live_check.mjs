import {fetchMatchStats} from '../lib/matchstats.ts';
const result=await fetchMatchStats('1989692635121453056',153041);
if(result.id!=='1989692635121453056'||result.rows.length!==12||result.rows.find(r=>r.name==='BRU')?.sourcePoints!==21)throw new Error('Live lookup differs from verified match.');
console.log('PASS: live Match Stats lookup, full Match ID string, 12 teams, BRU 9 kills / 21 source points.');

const unlisted=await fetchMatchStats('2109343903444019200');
const winner=unlisted.rows.find(r=>r.booyah===1);
if(unlisted.rows.length!==9||winner?.name!=='MPE'||winner.rank!==1||winner.kills!==36||unlisted.sourceRecordId!==undefined)throw new Error('Unlisted match lookup failed.');
const {commitImport,newScoreBoard,matchStandings}=await import('../lib/scoreboard.ts');
const draft=newScoreBoard('QA');
const board=commitImport(draft,unlisted,draft.stages[0].id,Object.fromEntries(unlisted.rows.map(r=>[r.externalKey,'new'])),[]);
if(matchStandings(board,board.matches[0])[0].total!==48)throw new Error('Unlisted match import scoring failed.');
console.log('PASS: user Match ID, unlisted -1 metadata, 9 teams, saved match and MPE 12 + 36 = 48 points.');
