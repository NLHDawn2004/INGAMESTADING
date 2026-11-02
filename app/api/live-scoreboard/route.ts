import {env} from 'cloudflare:workers';
import {authenticated,sameOrigin} from '../../../lib/auth';
import {readState,changeState} from '../../../lib/storage';
import {displaySettings} from '../../../lib/live-board-auto';
import {liveBoardSettingsSchema} from '../../../lib/live-board';
import {readLiveBridge,pairLiveBridge,syncLiveBridgeConfig} from '../../../lib/live-board-store';
import {liveTotalSources} from '../../../lib/live-total';
const headers={'Cache-Control':'no-store'};
export async function GET(request:Request){
 const admin=await authenticated();const {state,token}=await readState();if(!admin&&new URL(request.url).searchParams.get('token')!==token)return Response.json({error:'Cần đăng nhập hoặc dùng link OBS hợp lệ.'},{status:403});
 const result=await readLiveBridge(env.DB!,state.liveBoard);const settings=displaySettings(state.liveBoard,result.packet);
 const scoreSources=liveTotalSources(state.scoreboards,state.teams);const totalRows=scoreSources.find(s=>s.id===(settings.scoreBoardId||state.scoreboards.selectedId))?.rows??null;
 return Response.json({settings:admin?settings:{...settings,sourcePath:''},...result,health:admin?result.health:{...result.health,diagnostic:null,message:result.health.message?'Nguồn đang chờ hoặc chưa đủ dữ liệu.':''},totalRows,...(admin?{scoreSources,selectedScoreBoardId:state.scoreboards.selectedId}:{}),teams:state.teams,serverNow:Date.now(),...(admin?{overlayToken:token}:{})},{headers});
}
export async function POST(request:Request){if(!await authenticated())return Response.json({error:'Cần đăng nhập.'},{status:401});if(!sameOrigin(request))return Response.json({error:'Yêu cầu không hợp lệ.'},{status:403});try{const {state}=await readState();return Response.json({token:await pairLiveBridge(env.DB!,state.liveBoard)},{headers});}catch(error){return Response.json({error:(error as Error).message},{status:400});}}
export async function PUT(request:Request){
 if(!await authenticated())return Response.json({error:'Cần đăng nhập.'},{status:401});if(!sameOrigin(request))return Response.json({error:'Yêu cầu không hợp lệ.'},{status:403});
 try{const text=await request.text();if(text.length>30000)throw Error('Cấu hình quá lớn.');const settings=liveBoardSettingsSchema.parse({...JSON.parse(text),configId:crypto.randomUUID()});
  for(let attempt=0;attempt<3;attempt++){const {state}=await readState();const changed=await changeState({state:{...state,liveBoard:settings},revision:state.revision,action:'live-board-config'});if(!changed.conflict){await syncLiveBridgeConfig(env.DB!,settings);return Response.json({settings},{headers});}}
  throw Error('Dữ liệu vừa thay đổi. Thử lưu lại.');
 }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
