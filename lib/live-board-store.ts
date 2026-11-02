import {livePacketSchema,checkLivePacket,type LiveBoardSettings,type LiveHealth,type LivePacket} from './live-board';
import {followsGame} from './live-board-auto';
type DB={prepare:(sql:string)=>any};
const CREATE=`CREATE TABLE IF NOT EXISTS live_scoreboard_bridge (id TEXT PRIMARY KEY,token_hash TEXT,session_id TEXT,config_id TEXT,match_id TEXT NOT NULL DEFAULT '',last_sequence INTEGER NOT NULL DEFAULT -1,snapshot TEXT,last_seen_at INTEGER NOT NULL DEFAULT 0,sample_at INTEGER NOT NULL DEFAULT 0,received_at INTEGER NOT NULL DEFAULT 0,source_status TEXT NOT NULL DEFAULT 'waiting',source_error TEXT NOT NULL DEFAULT '',diagnostic TEXT)`;
const ready=new WeakMap<object,Promise<void>>();
export async function ensureLiveBridge(db:DB){let promise=ready.get(db);if(!promise){promise=(async()=>{await db.prepare(CREATE).run();await db.prepare("INSERT OR IGNORE INTO live_scoreboard_bridge(id) VALUES ('main')").run();})();ready.set(db,promise);}try{await promise;}catch(error){ready.delete(db);throw error;}}
async function hash(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
export async function bridgeRow(db:DB){await ensureLiveBridge(db);return await db.prepare("SELECT * FROM live_scoreboard_bridge WHERE id='main'").first();}
export async function pairLiveBridge(db:DB,settings:LiveBoardSettings){await ensureLiveBridge(db);const token=crypto.randomUUID()+crypto.randomUUID();await db.prepare("UPDATE live_scoreboard_bridge SET token_hash=?,session_id=NULL,config_id=?,match_id=?,last_sequence=-1,snapshot=NULL,source_status='waiting',source_error='',diagnostic=NULL WHERE id='main'").bind(await hash(token),settings.configId,followsGame(settings)?'':settings.matchId).run();return token;}
export async function authenticateLiveBridge(db:DB,bearer:string){if(!bearer||bearer.length>200)return false;const row=await bridgeRow(db);return Boolean(row?.token_hash&&row.token_hash===await hash(bearer));}
export async function syncLiveBridgeConfig(db:DB,settings:LiveBoardSettings){await ensureLiveBridge(db);if(followsGame(settings)){await db.prepare("UPDATE live_scoreboard_bridge SET config_id=? WHERE id='main'").bind(settings.configId).run();}else await db.prepare("UPDATE live_scoreboard_bridge SET config_id=?,match_id=? WHERE id='main'").bind(settings.configId,settings.matchId).run();}
export async function startLiveBridge(db:DB,sessionId:string,settings:LiveBoardSettings){await ensureLiveBridge(db);await db.prepare("UPDATE live_scoreboard_bridge SET session_id=?,config_id=?,match_id=?,last_sequence=-1,snapshot=NULL,last_seen_at=?,source_status='connected',source_error='',diagnostic=NULL WHERE id='main'").bind(sessionId,settings.configId,followsGame(settings)?'':settings.matchId,Date.now()).run();}
export async function liveBridgeHeartbeat(db:DB,sessionId:string,status:string,message:string,diagnostic:unknown){await ensureLiveBridge(db);const result=await db.prepare("UPDATE live_scoreboard_bridge SET last_seen_at=?,source_status=?,source_error=?,diagnostic=? WHERE id='main' AND session_id=?").bind(Date.now(),status.slice(0,40),message.slice(0,500),JSON.stringify(diagnostic??null),sessionId).run();if(!result.meta.changes)throw Error('Phi\u00ean bridge \u0111\u00e3 \u0111\u01b0\u1ee3c thay th\u1ebf. Kh\u1edfi \u0111\u1ed9ng l\u1ea1i bridge.');}
export async function ingestLivePacket(db:DB,raw:unknown,settings:LiveBoardSettings,now=Date.now()){
 const packet=livePacketSchema.parse(raw);checkLivePacket(packet,settings,now);await ensureLiveBridge(db);
 let result;
 if(followsGame(settings)){
  const row=await bridgeRow(db);let previous:LivePacket|null=null;try{previous=livePacketSchema.parse(JSON.parse(row.snapshot||'null'));}catch{}
  if(previous?.matchStartedAt&&packet.matchStartedAt&&packet.matchId!==previous.matchId&&packet.matchStartedAt<=previous.matchStartedAt)throw Error('Kh\u00f4ng quay l\u1ea1i d\u1eef li\u1ec7u tr\u1eadn c\u0169.');
  result=await db.prepare("UPDATE live_scoreboard_bridge SET match_id=?,last_sequence=?,snapshot=?,last_seen_at=?,sample_at=?,received_at=?,source_status='live',source_error='' WHERE id='main' AND session_id=? AND config_id=? AND last_sequence<?").bind(packet.matchId,packet.sequence,JSON.stringify(packet),now,packet.capturedAt,now,packet.sessionId,packet.configId,packet.sequence).run();
 }else result=await db.prepare("UPDATE live_scoreboard_bridge SET last_sequence=?,snapshot=?,last_seen_at=?,sample_at=?,received_at=?,source_status=?,source_error='' WHERE id='main' AND session_id=? AND config_id=? AND match_id=? AND last_sequence<?").bind(packet.sequence,JSON.stringify(packet),now,packet.capturedAt,now,packet.isReplay?'replay':'live',packet.sessionId,packet.configId,packet.matchId,packet.sequence).run();
 if(!result.meta.changes)throw Error('Snapshot c\u0169, sai c\u1ea5u h\u00ecnh ho\u1eb7c phi\u00ean bridge \u0111\u00e3 thay \u0111\u1ed5i.');return packet;
}
export async function readLiveBridge(db:DB,settings:LiveBoardSettings){
 const row=await bridgeRow(db);let packet:LivePacket|null=null;
 try{const parsed=livePacketSchema.parse(JSON.parse(row.snapshot||'null'));if(parsed.configId===settings.configId&&parsed.source===settings.adapter&&parsed.isReplay===(settings.mode==='replay')){
  if(followsGame(settings)){checkLivePacket(parsed,settings,parsed.capturedAt);packet=parsed;}
  else if(parsed.matchId===settings.matchId&&parsed.expectedTeams===settings.expectedTeams&&settings.rosterConfirmed)packet=parsed;
 }}catch{}
 const health:LiveHealth={paired:Boolean(row.token_hash),sourceStatus:row.source_status,message:row.source_error||'',lastSeenAt:row.last_seen_at||0,receivedAt:packet?row.received_at||0:0,sampleAt:packet?packet.capturedAt:0,diagnostic:null};try{health.diagnostic=JSON.parse(row.diagnostic||'null');}catch{}
 const diagnostic=health.diagnostic as {source?:string;detectedMatchId?:string;sourceReplay?:boolean}|null;
 if(packet&&settings.mode==='live'&&diagnostic&&['player-log','windows-ocr'].includes(diagnostic.source||'')&&((diagnostic.detectedMatchId&&diagnostic.detectedMatchId!==packet.matchId)||diagnostic.sourceReplay)){packet=null;health.receivedAt=0;health.sampleAt=0;}
 if(health.sourceStatus==='identity-pending'){packet=null;health.receivedAt=0;health.sampleAt=0;}
 return {packet,health};
}
