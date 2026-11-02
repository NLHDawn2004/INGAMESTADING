import './setup-local.mjs';
import {spawnSync} from 'node:child_process';
const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','migrations','apply','DB','--local','--persist-to','.wrangler/state','--config','wrangler.local.json'],{stdio:'inherit',windowsHide:true,env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(r.status!==0)process.exit(r.status||1);
