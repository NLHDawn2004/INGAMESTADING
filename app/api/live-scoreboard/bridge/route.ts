import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {readState} from '../../../../lib/storage';
import {authenticateLiveBridge,syncLiveBridgeConfig,startLiveBridge,liveBridgeHeartbeat,ingestLivePacket} from '../../../../lib/live-board-store';
const headers={'Cache-Control':'no-store'};
async function allowed(request:Request){const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1]||'';return authenticateLiveBridge(env.DB!,token);}
export async function GET(request:Request){if(!await allowed(request))return Response.json({error:'Khóa bridge không hợp lệ.'},{status:401});const {state}=await readState();await syncLiveBridgeConfig(env.DB!,state.liveBoard);return Response.json({settings:state.liveBoard,teams:state.teams.map(({id,name,abbreviation})=>({id,name,abbreviation})),serverNow:Date.now()},{headers});}
export async function POST(request:Request){
 if(!await allowed(request))return Response.json({error:'Khóa bridge không hợp lệ.'},{status:401});
 try{const text=await request.text();if(text.length>200000)throw Error('Dữ liệu bridge quá lớn.');const body=JSON.parse(text);const {state}=await readState();
  if(body.action==='start'){await startLiveBridge(env.DB!,z.string().uuid().parse(body.sessionId),state.liveBoard);return Response.json({ok:true},{headers});}
  if(body.action==='heartbeat'){const heartbeat=z.object({sessionId:z.string().uuid(),status:z.string().max(40),message:z.string().max(500),diagnostic:z.unknown().optional()}).parse(body);if(JSON.stringify(heartbeat.diagnostic??null).length>30000)throw Error('Chẩn đoán quá lớn.');await liveBridgeHeartbeat(env.DB!,heartbeat.sessionId,heartbeat.status,heartbeat.message,heartbeat.diagnostic);return Response.json({ok:true},{headers});}
  await ingestLivePacket(env.DB!,body.packet,state.liveBoard);return Response.json({ok:true},{headers});
 }catch(error){return Response.json({error:(error as Error).message},{status:409});}
}
