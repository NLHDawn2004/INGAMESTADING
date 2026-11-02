// Find a tall framed table before inspecting individual cells. Map cards are short,
// and decorative bands must never expand the table into neighboring artwork.
export type KvTableRegion={x:number;y:number;width:number;height:number;headerY:number;headerHeight:number;statCount:number;statCenters:number[]};
export function detectKvTableRegion(width:number,height:number,p:Uint8Array|Uint8ClampedArray):KvTableRegion|null{
 if(p.length!==width*height*4)return null;
 const vivid=(x:number,y:number)=>{const i=(y*width+x)*4,r=p[i],g=p[i+1],b=p[i+2];return p[i+3]>180&&Math.max(r,g,b)>130&&Math.max(r,g,b)-Math.min(r,g,b)>70;};
 const runs:Array<{x:number;top:number;bottom:number}>=[];
 for(let x=1;x<width-1;x++){let start=-1,last=-1;for(let y=0;y<=height+3;y++){if(y<height&&vivid(x,y)){if(start<0)start=y;last=y;}else if(start>=0&&y-last>3){if(last-start>height*.32)runs.push({x,top:start,bottom:last});start=-1;}}}
 // Collapse thick border stripes so large flat images do not create quadratic
 // scans for every pixel of a broad color area.
 const edges:typeof runs=[];for(let i=0;i<runs.length;){const first=runs[i];let end=i;while(end+1<runs.length&&runs[end+1].x===runs[end].x+1&&Math.abs(runs[end+1].top-first.top)<=3&&Math.abs(runs[end+1].bottom-first.bottom)<=3)end++;edges.push(first);if(end>i)edges.push(runs[end]);i=end+1;}
 let best:KvTableRegion|null=null,bestScore=0;
 for(const a of edges)for(const b of edges){const w=b.x-a.x,top=Math.max(a.top,b.top),bottom=Math.min(a.bottom,b.bottom),h=bottom-top;if(w<width*.24||w>width*.8||h<height*.34||Math.abs(a.top-b.top)>height*.1||Math.abs(a.bottom-b.bottom)>height*.1)continue;
  let headerEnd=-1,headerStart=-1;let headerColor:number[]|null=null;
  for(let y=Math.max(0,top-5);y<Math.min(bottom,top+height*.14);y++){let n=0;for(let x=a.x+3;x<b.x-3;x++)if(vivid(x,y))n++;if(n/Math.max(1,w-6)>.78){const values=[[],[],[]] as number[][];for(let x=a.x+4;x<b.x-4;x+=2){const i=(y*width+x)*4;for(let k=0;k<3;k++)values[k].push(p[i+k]);}const color=values.map(v=>v.sort((a,b)=>a-b)[Math.floor(v.length/2)]);if(headerColor&&Math.max(...color.map((v,k)=>Math.abs(v-headerColor![k])))>80){if(headerEnd-headerStart>=3)break;headerStart=-1;}if(headerStart<0){headerStart=y;headerColor=color;}headerEnd=y;}else if(headerEnd>=0&&y-headerEnd>3){if(headerEnd-headerStart>=3)break;headerStart=-1;headerEnd=-1;headerColor=null;}}
  if(headerStart<0||headerEnd-headerStart<3||bottom-headerEnd<height*.28||headerEnd>=Math.min(bottom,top+height*.14)-2)continue;
  // A real table has a reasonably quiet interior, rather than a large picture.
  let smooth=0,total=0;for(let y=headerEnd+6;y<bottom-3;y+=3)for(let x=a.x+6;x<b.x-6;x+=3){const i=(y*width+x)*4,j=i+4;const delta=Math.max(Math.abs(p[i]-p[j]),Math.abs(p[i+1]-p[j+1]),Math.abs(p[i+2]-p[j+2]));if(delta<30)smooth++;total++;}
  if(!total||smooth/total<.78)continue;
  const score=w*(bottom-headerEnd)*(smooth/total);if(score<=bestScore)continue;
  // Count separated header labels; digits are deliberately not read as OCR.
  const ink:number[]=[];for(let x=a.x+5;x<b.x-5;x++){let n=0;for(let y=headerStart+1;y<headerEnd;y++){const i=(y*width+x)*4;if(p[i]>175&&p[i+1]>155)n++;}if(n>0)ink.push(x);}
  const clusters:number[][]=[];for(const x of ink){const last=clusters.at(-1);if(!last||x-last.at(-1)!>Math.max(4,w*.035))clusters.push([x]);else last.push(x);}const labels=clusters.length;const statCenters=clusters.slice(1).map(c=>(c[0]+c.at(-1)!)/2*1920/width);
  bestScore=score;best={x:(a.x+3)*1920/width,y:(headerEnd+3)*1080/height,width:(w-6)*1920/width,height:(bottom-headerEnd-6)*1080/height,headerY:headerStart*1080/height,headerHeight:(headerEnd-headerStart+1)*1080/height,statCount:Math.max(1,Math.min(4,labels-1||3)),statCenters:statCenters.slice(0,4)};
 }
 return best;
}
export async function analyzeKvTableRegion(source:Blob|string){
 const temporary=typeof source!=='string',url=temporary?URL.createObjectURL(source):source;
 try{const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=480;c.height=270;const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return null;ctx.drawImage(image,0,0,480,270);return detectKvTableRegion(480,270,ctx.getImageData(0,0,480,270).data);}finally{if(temporary)URL.revokeObjectURL(url);}
}
