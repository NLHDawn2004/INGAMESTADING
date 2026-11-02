import {detectRowArtwork} from './row-artwork.ts';
import type {LiveAlignment} from './live-presentation';
export const compactAlignment:LiveAlignment={detected:true,rowArtwork:true,groups:[{x:1376,y:124,width:524,rowHeight:62,rowStep:68,rows:12}],columns:{total:.6,logo:.15,teamName:.255,slot:.01,elims:.735,aliveCount:.87,damage:.55,placement:.47}};
export const neonCompactAlignment:LiveAlignment={"detected":true,"rowArtwork":true,"groups":[{"x":1320,"y":124,"width":580,"rowHeight":52,"rowStep":58,"rows":14}],"columns":{"total":0.57,"logo":0.12,"teamName":0.23,"slot":0.01,"elims":0.7,"aliveCount":0.8,"damage":0.55,"placement":0.47}};

type Band={y:number;h:number;left:number;right:number};
function repeated(bands:Band[],width:number){let best:Band[]=[];for(const first of bands)for(const second of bands){const step=second.y-first.y;if(step<8||step>80)continue;const seq=[first];for(let expected=first.y+step;expected<270;expected+=step){const next=bands.find(b=>Math.abs(b.y-expected)<=2&&Math.abs(b.left-first.left)<width*.05&&Math.abs(b.right-first.right)<width*.05&&Math.abs(b.h-first.h)<=3);if(!next)break;seq.push(next);}if(seq.length>=3&&seq.length>best.length)best=seq;}return best;}
export function detectStructuralKv(width:number,height:number,pixels:Uint8ClampedArray|Uint8Array):LiveAlignment|null{
 const scaleX=1920/width,scaleY=1080/height;let transparent=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<40)transparent++;
 const modes=transparent>width*height*.1?['alpha','line']:['line'];
 for(const mode of modes){const bands:Band[]=[];let start=-1,left=width,right=0;
  for(let y=0;y<=height;y++){let count=0,l=width,r=0;if(y<height)for(let x=0;x<width;x++){const i=(y*width+x)*4,red=pixels[i],g=pixels[i+1],b=pixels[i+2];const yes=mode==='alpha'?pixels[i+3]>150:pixels[i+3]>90&&red>100&&g>55&&red>g*1.08&&g>b*1.25;if(yes){count++;l=Math.min(l,x);r=x;}}
   if(count>width*.12){if(start<0)start=y;left=Math.min(left,l);right=Math.max(right,r);}else if(start>=0){const h=y-start;if((mode==='alpha'&&h>=3&&h<=35)||(mode==='line'&&h<=4))bands.push({y:start,h,left,right});start=-1;left=width;right=0;}
  }
  const rows=repeated(bands,width);if(rows.length<3)continue;const first=rows[0],step=rows[1].y-first.y;
  const rowY=mode==='alpha'?first.y:Math.max(0,first.y-step+2),h=mode==='alpha'?first.h:Math.max(8,step-2);
  return {detected:true,rowArtwork:mode==='alpha'||detectRowArtwork(width,height,pixels,[{x:first.left*scaleX,y:rowY*scaleY,width:(first.right-first.left+1)*scaleX,rowHeight:h*scaleY,rowStep:step*scaleY,rows:rows.length}]),groups:[{x:first.left*scaleX,y:rowY*scaleY,width:(first.right-first.left+1)*scaleX,rowHeight:h*scaleY,rowStep:step*scaleY,rows:rows.length}],columns:{total:.6,logo:.05,teamName:.16,slot:.01,elims:.74,aliveCount:.87,damage:.55,placement:.47}};
 }
 return null;
}
let reference:Promise<Uint8ClampedArray|null>|null=null;
export async function recognizeCompact(pixels:Uint8ClampedArray){
 reference??=(async()=>{try{const img=new Image();img.src='/live-board-templates/standing-compact-v1.png?palette=gray';await img.decode();const c=document.createElement('canvas');c.width=480;c.height=270;const ctx=c.getContext('2d');if(!ctx)return null;ctx.drawImage(img,0,0,480,270);return ctx.getImageData(0,0,480,270).data;}catch{return null;}})();
 const ref=await reference;if(!ref)return false;let error=0,n=0;for(let i=0;i<ref.length;i+=4*7){if(ref[i+3]<200)continue;for(let c=0;c<3;c++)error+=Math.abs(ref[i+c]-pixels[i+c]);n+=3;}return n>100&&error/n<12;
}

// Recognize the complete uploaded template before attempting structural bands.
// This keeps its 14 full-width cards and all columns in one animation group.
let neonReference:Promise<Uint8ClampedArray|null>|null=null;
export async function recognizeNeonCompact(pixels:Uint8ClampedArray){
 neonReference??=(async()=>{try{const img=new Image();img.src='/live-board-templates/standing-compact-neon-14-v1.png';await img.decode();const c=document.createElement('canvas');c.width=480;c.height=270;const ctx=c.getContext('2d');if(!ctx)return null;ctx.drawImage(img,0,0,480,270);return ctx.getImageData(0,0,480,270).data;}catch{return null;}})();
 const ref=await neonReference;if(!ref||ref.length!==pixels.length)return false;let error=0,n=0;
 for(let i=0;i<ref.length;i+=4*7){error+=Math.abs(ref[i+3]-pixels[i+3]);n++;if(ref[i+3]<200)continue;for(let c=0;c<3;c++)error+=Math.abs(ref[i+c]-pixels[i+c]);n+=3;}
 return n>100&&error/n<12;
}
