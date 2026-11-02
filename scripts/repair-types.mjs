import fs from 'node:fs';
for(const name of ['state','upload']) {
const p='app/api/'+name+'/route.ts';let s=fs.readFileSync(p,'utf8');s="import { authenticated } from '../../../lib/auth';\n"+s;
for(const signature of ['GET()','PUT(request:Request)','POST(request:Request)']) s=s.replace('export async function '+signature+'{','export async function '+signature+"{if(!await authenticated())return Response.json({error:'Cần đăng nhập.'},{status:401});");
s=s.replace('const body=await request.json();',"const body=await request.json() as {state?:unknown;revision:number;action?:string};");fs.writeFileSync(p,s);
}
for(const p of ['lib/storage.ts','app/api/media/[key]/route.ts','app/api/upload/route.ts']){let s=fs.readFileSync(p,'utf8').replaceAll('env.DB.','env.DB!.').replaceAll('env.BUCKET.','env.BUCKET!.');fs.writeFileSync(p,s);}
const p='components/Studio.tsx';let s=fs.readFileSync(p,'utf8');s=s.replace("type Tab=", "type ApiResponse={state:StudioState;token:string;error?:string};\ntype Tab=");s=s.replaceAll('const data=await r.json();','const data=await r.json() as ApiResponse;');s=s.replace("const refreshed=await fetch('/api/state').then(x=>x.json());", "const refreshed=await fetch('/api/state').then(x=>x.json()) as ApiResponse;");s=s.replace("const data=await r.json() as ApiResponse;if(!r.ok)throw new Error(data.error);done(data.url);", "const data=await r.json() as {url:string;error?:string};if(!r.ok)throw new Error(data.error);done(data.url);");fs.writeFileSync(p,s);
const q='components/OverlayPage.tsx';s=fs.readFileSync(q,'utf8').replace('const data=await r.json();','const data=await r.json() as {state:StudioState};');fs.writeFileSync(q,s);
