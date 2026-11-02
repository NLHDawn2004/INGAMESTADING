import {recognizeNeonCompact,neonCompactAlignment,compactAlignment,recognizeCompact,detectStructuralKv} from './live-kv-detect.ts';
import {z} from 'zod';
import {detectRowArtwork} from './row-artwork.ts';
import {detectKvTableRegion} from './kv-regions.ts';
import type {LiveTeam} from './live-board';
export const liveAlignmentSchema=z.object({detected:z.boolean(),rowArtwork:z.boolean().optional(),groups:z.array(z.object({x:z.number().min(0).max(1920),y:z.number().min(0).max(1080),width:z.number().min(40).max(1920),rowHeight:z.number().min(8).max(200),rowStep:z.number().min(8).max(200),rows:z.number().int().min(1).max(100)})).min(1).max(4),columns:z.object({total:z.number().min(0).max(1).default(.6),logo:z.number().min(0).max(1),teamName:z.number().min(0).max(1),slot:z.number().min(0).max(1),elims:z.number().min(0).max(1),aliveCount:z.number().min(0).max(1),damage:z.number().min(0).max(1),placement:z.number().min(0).max(1)})});
export type LiveAlignment=z.infer<typeof liveAlignmentSchema>;
export const liveColumns={total:.6,logo:.03,teamName:.12,slot:.01,elims:.68,aliveCount:.86,damage:.55,placement:.47};
export function displayTeams(teams:LiveTeam[]){return teams.map((team,index)=>({team,index})).sort((a,b)=>(b.team.elims??0)-(a.team.elims??0)||a.index-b.index).map(x=>x.team);}
export function displayAlive(team:LiveTeam,capacity=4):Array<'alive'|'knocked'|'dead'|'unknown'>{
 const count=Math.max(capacity,team.aliveStates?.length??0,team.aliveCount??0);
 // The requested opening display is four yellow slots, until an explicit
 // knock/death/revive state is available. This does not mutate source data.
 if(team.aliveStates)return Array.from({length:count},(_,i)=>{const state=team.aliveStates![i];return !state?'alive':state;});
 return Array.from({length:count},(_,i)=>team.aliveCount!==null&&i>=team.aliveCount?'dead':'alive');
}
export function detectLiveAlignment(width:number,height:number,pixels:Uint8ClampedArray|Uint8Array):LiveAlignment|null{
 if(pixels.length!==width*height*4)return null;
 const active=(x:number,y:number)=>{const i=(y*width+x)*4,r=pixels[i],g=pixels[i+1],b=pixels[i+2];return pixels[i+3]>90&&Math.max(r,g,b)>45&&Math.max(r,g,b)-Math.min(r,g,b)>25;};
 const spans:Array<{y:number;h:number;x:number;right:number}>=[];
 let start=-1,left=width,right=0;
 for(let y=0;y<=height;y++){
  let n=0,l=width,r=0;if(y<height)for(let x=0;x<width;x++)if(active(x,y)){n++;l=Math.min(l,x);r=x;}
  if(n>=width*.08){if(start<0)start=y;left=Math.min(left,l);right=Math.max(right,r);}
  else if(start>=0){const h=y-start;if(h>=2&&h<=height*.1)spans.push({y:start,h,x:left,right});start=-1;left=width;right=0;}
 }
 const candidates=spans.filter(s=>s.right-s.x>width*.1);const clusters:typeof spans[]=[];
 for(const s of candidates){const c=clusters.find(c=>Math.abs(c[0].h-s.h)<=Math.max(2,c[0].h*.3)&&Math.abs(c[0].x-s.x)<width*.08&&Math.abs(c[0].right-s.right)<width*.1);if(c)c.push(s);else clusters.push([s]);}
 const best=clusters.filter(c=>c.length>=3).sort((a,b)=>b.length-a.length)[0];if(!best)return null;
 const steps=best.slice(1).map((s,i)=>s.y-best[i].y).sort((a,b)=>a-b);const step=steps[Math.floor(steps.length/2)];if(!step||best.some((s,i)=>i&&Math.abs(s.y-best[i-1].y-step)>2))return null;
 const first=best[0],sx=1920/width,sy=1080/height;
 const runs:Array<{left:number;right:number}>=[];let run=-1;
 for(let x=first.x;x<=first.right+1;x++){const present=x<=first.right&&best.filter(row=>active(x,Math.min(height-1,row.y+Math.floor(row.h*.25)))).length>=Math.ceil(best.length*.7);if(present&&run<0)run=x;else if(!present&&run>=0){if(x-run>=Math.max(3,width*.012))runs.push({left:run,right:x});run=-1;}}
 const columns={...liveColumns};const span=first.right-first.x+1;
 if(runs.length>=3){const stats=runs.slice(-2);columns.elims=((stats[0].left+stats[0].right)/2-first.x)/span;columns.aliveCount=(stats[1].left-first.x+Math.min(4,(stats[1].right-stats[1].left)*.1))/span;columns.teamName=Math.min(.25,(runs[0].left-first.x+Math.min(35,(runs[0].right-runs[0].left)*.15))/span);}
 const groups=[{x:first.x*sx,y:first.y*sy,width:span*sx,rowHeight:first.h*sy,rowStep:step*sy,rows:best.length}];return liveAlignmentSchema.parse({detected:true,rowArtwork:detectRowArtwork(width,height,pixels,groups),groups,columns});
}
export async function analyzeLiveImage(source:Blob|string):Promise<LiveAlignment|null>{
 if(typeof source==='string'&&source.split('?')[0]==='/live-board-templates/standing-compact-neon-14-v1.png')return structuredClone(neonCompactAlignment);
 if(typeof source==='string'&&source.split('?')[0]==='/live-board-templates/standing-compact-v1.png')return structuredClone(compactAlignment);
 const temporary=typeof source!=='string',url=temporary?URL.createObjectURL(source):source;
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)return null;ctx.drawImage(image,0,0,480,270);const pixels=ctx.getImageData(0,0,480,270).data;if(await recognizeNeonCompact(pixels))return structuredClone(neonCompactAlignment);if(await recognizeCompact(pixels))return structuredClone(compactAlignment);const region=detectKvTableRegion(480,270,pixels);if(region){const step=region.height/12;return {detected:true,groups:[{x:region.x,y:region.y,width:region.width,rowHeight:step,rowStep:step,rows:12}],columns:{...liveColumns,logo:.06,teamName:.15,elims:.72,total:.93}};}return detectStructuralKv(480,270,pixels)??detectLiveAlignment(480,270,pixels);}finally{if(temporary)URL.revokeObjectURL(url);}
}
