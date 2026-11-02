import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import {digest,sessionCookie,sameOrigin} from '../../../../lib/auth';
export async function POST(request:Request){if(!sameOrigin(request))return new Response('Forbidden',{status:403});const jar=await cookies();const token=jar.get('__Host-ovl_session')?.value||jar.get('ovl_session')?.value;if(token)await env.DB!.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(request,'',0),'Cache-Control':'no-store'}});}
