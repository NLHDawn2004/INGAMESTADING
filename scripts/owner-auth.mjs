import fs from 'node:fs';
const p='cloudflare-env.d.ts';let s=fs.readFileSync(p,'utf8');s=s.replace('interface Env {','interface Env {\n    OWNER_EMAIL?: string;');fs.writeFileSync(p,s);
