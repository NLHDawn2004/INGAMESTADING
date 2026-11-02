import {spawnSync} from 'node:child_process';
const tests=['live_scoreboard_check','live_scoreboard_api_check','live_gamelog_check','live_connection_check','live_bridge_resume_check','live_board_logos_check','live_auto_follow_check','live_total_check','live_uid_roster_check','live_latency_check'];
for(const test of tests){const result=spawnSync(process.execPath,['tests/'+test+'.mjs'],{stdio:'inherit',windowsHide:true});if(result.status!==0)process.exit(result.status||1);}
console.log('PASS: standalone in-game scoreboard regression suite.');
