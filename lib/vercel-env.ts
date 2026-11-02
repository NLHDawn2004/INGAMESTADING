import {neon} from '@neondatabase/serverless';
const schema="CREATE TABLE IF NOT EXISTS studio (\n\tid text PRIMARY KEY NOT NULL,\n\tstate text NOT NULL,\n\trevision BIGINT NOT NULL,\n\thistory text NOT NULL,\n\toverlay_token text NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS auth_credentials (\n\tid text PRIMARY KEY NOT NULL,\n\tpassword_hash text NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS auth_limits (\n\tid text PRIMARY KEY NOT NULL,\n\tattempts BIGINT NOT NULL,\n\treset_at BIGINT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS auth_sessions (\n\ttoken_hash text PRIMARY KEY NOT NULL,\n\texpires_at BIGINT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS live_scoreboard_bridge (id TEXT PRIMARY KEY,token_hash TEXT,session_id TEXT,config_id TEXT,match_id TEXT NOT NULL DEFAULT '',last_sequence BIGINT NOT NULL DEFAULT -1,snapshot TEXT,last_seen_at BIGINT NOT NULL DEFAULT 0,sample_at BIGINT NOT NULL DEFAULT 0,received_at BIGINT NOT NULL DEFAULT 0,source_status TEXT NOT NULL DEFAULT 'waiting',source_error TEXT NOT NULL DEFAULT '',diagnostic TEXT);\n";
type Statement={sql:string;values:unknown[]};
let client:ReturnType<typeof neon<false,true>>|undefined;
function connection(){const url=process.env.DATABASE_URL||process.env.POSTGRES_URL;if(!url)throw Error('DATABASE_URL chưa được cấu hình.');return client??=neon(url,{fullResults:true});}
let ready:Promise<unknown>|undefined;
async function initialize(){if(!ready){ready=(async()=>{const sql=connection();for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await sql.query(statement,[]);await sql.query('CREATE TABLE IF NOT EXISTS standing_media (id TEXT PRIMARY KEY,content_type TEXT NOT NULL,data TEXT NOT NULL)',[]);})();ready.catch(()=>{ready=undefined;});}await ready;}
export function postgresSql(input:string){let i=0;let sql=input.replace(/\?/g,()=>'$'+(++i));if(/INSERT OR IGNORE INTO/i.test(sql))sql=sql.replace(/INSERT OR IGNORE INTO/i,'INSERT INTO')+' ON CONFLICT DO NOTHING';return sql;}
function normalize(row:Record<string,unknown>){const numeric=new Set(['revision','attempts','reset_at','expires_at','last_sequence','last_seen_at','sample_at','received_at']);return Object.fromEntries(Object.entries(row).map(([k,v])=>[k,numeric.has(k)&&typeof v==='string'?Number(v):v]));}
class Query implements Statement {
 values:unknown[]=[];
 constructor(public sql:string){}
 bind(...values:unknown[]){const query=new Query(this.sql);query.values=values;return query;}
 async run(){await initialize();const result=await connection().query(postgresSql(this.sql),this.values as never[]);return {meta:{changes:result.rowCount},results:result.rows.map(normalize)};}
 async first<T=Record<string,unknown>>():Promise<T|null>{const result=await this.run();return (result.results[0]??null) as T|null;}
 async all(){return this.run();}
}
const DB={prepare(sql:string){return new Query(sql);},async batch(queries:Query[]){await initialize();const sql=connection();const result=await sql.transaction(queries.map(q=>sql.query(postgresSql(q.sql),q.values as never[])));return result.map(r=>({meta:{changes:r.rowCount},results:r.rows.map(normalize)}));}};
// Media shares the project's durable database; no filesystem writes on Vercel.
const BUCKET={async put(key:string,bytes:Uint8Array,{httpMetadata}:{httpMetadata:{contentType:string}}){await initialize();await connection().query('INSERT INTO standing_media(id,content_type,data) VALUES ($1,$2,$3) ON CONFLICT(id) DO UPDATE SET content_type=excluded.content_type,data=excluded.data',[key,httpMetadata.contentType,Buffer.from(bytes).toString('base64')]);},async get(key:string){await initialize();const result=await connection().query('SELECT content_type,data FROM standing_media WHERE id=$1',[key]);const row=result.rows[0];return row?{body:new Uint8Array(Buffer.from(row.data as string,'base64')),httpMetadata:{contentType:row.content_type as string}}:null;}};
export const env={DB,BUCKET,get ADMIN_PASSWORD_HASH(){return process.env.ADMIN_PASSWORD_HASH;}};
