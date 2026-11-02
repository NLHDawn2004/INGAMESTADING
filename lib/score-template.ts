import {z} from 'zod';
import {detectRowArtwork} from './row-artwork.ts';
import {detectKvTableRegion} from './kv-regions.ts';
import {overlayRegionSchema} from './overlay-layout.ts';

const color=z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const templateGroupSchema=z.object({x:z.number().min(0).max(1920),y:z.number().min(0).max(1080),width:z.number().min(40).max(1920),rowHeight:z.number().min(16).max(1080),rowGap:z.number().min(16).max(1080),rows:z.number().int().min(1).max(20),statsX:z.number().min(0).max(1920),statsWidth:z.number().min(16).max(1920),statPositions:z.array(z.number().min(0).max(1920)).min(1).max(4).optional()}).superRefine((g,c)=>{if(g.x+g.width>1921||g.y+(g.rows-1)*g.rowGap+g.rowHeight>1081||g.statsX+g.statsWidth>g.width+1)c.addIssue({code:'custom',message:'Vùng dữ liệu phải nằm trong ảnh mẫu 1920 × 1080.'});});
export const scoreTemplateSchema=z.object({image:z.string().max(300).regex(/^\/(api\/media\/[a-f0-9-]+|score-templates\/[a-z0-9-]+\.(png|jpg|webp))$/),label:z.string().max(100),dataRegion:overlayRegionSchema.optional(),inferredRows:z.boolean().optional(),subtitleRegion:z.object({x:z.number().min(0).max(1920),y:z.number().min(0).max(1080),width:z.number().min(16).max(1920),height:z.number().min(16).max(1080)}).optional(),groups:z.array(templateGroupSchema).min(1).max(4),stats:z.array(z.enum(['booyah','placementPoints','kills','total'])).min(1).max(4).refine(stats=>new Set(stats).size===stats.length,'Mỗi cột cần một chỉ số khác nhau.'),nameColor:color,numberColor:color,rankColor:color,highlightColor:color,coverPrintedRanks:z.boolean(),logoX:z.number().min(0).max(1920),logoSize:z.number().min(8).max(300),nameX:z.number().min(0).max(1920),rankX:z.number().min(0).max(1920),rankWidth:z.number().min(0).max(300),rowStyle:z.enum(['connected','separated']).default('connected'),rowArtwork:z.boolean().default(false),detected:z.boolean()});
export type ScoreTemplate=z.infer<typeof scoreTemplateSchema>;
export type TemplateGroup=z.infer<typeof templateGroupSchema>;
export function templateCapacity(template:ScoreTemplate){return template.groups.reduce((n,g)=>n+g.rows,0);}
export function defaultTemplateGroups(columns=2):TemplateGroup[]{const rows=Math.ceil(12/columns),gap=36,width=(1720-(columns-1)*gap)/columns,rowHeight=Math.min(90,(650-(rows-1)*14)/rows),rowGap=rowHeight+14;return Array.from({length:columns},(_,i)=>({x:100+i*(width+gap),y:350,width,rowHeight,rowGap,rows,statsX:width*.49,statsWidth:width*.49}));}
export function makeScoreTemplate(image:string,label:string,view:'match'|'total',groups=defaultTemplateGroups(),detected=false):ScoreTemplate {return scoreTemplateSchema.parse({image,label,groups,detected,stats:view==='match'?['placementPoints','kills','total']:['booyah','kills','total'],nameColor:'#ffffff',numberColor:'#071b13',rankColor:'#ffffff',highlightColor:'#f1f77c',coverPrintedRanks:true,logoX:95,logoSize:56,nameX:156,rankX:24,rankWidth:66});}

// Locate repeated, wide colored cells. Inconclusive images are flagged for manual alignment.
export function detectScoreTemplate(image:string,label:string,view:'match'|'total',width:number,height:number,pixels:Uint8ClampedArray|Uint8Array):ScoreTemplate {
 const count=width*height;if(pixels.length!==count*4)throw new Error('Dữ liệu ảnh mẫu không hợp lệ.');
 const region=detectKvTableRegion(width,height,pixels);
 if(region){const {x,y,width:w,height:h}=region;const step=h/12,statsX=w*.5;const template=makeScoreTemplate(image,label,view,[{x,y,width:w,rowHeight:step,rowGap:step,rows:12,statsX,statsWidth:w*.49}],true);template.dataRegion={x,y,width:w,height:h};template.inferredRows=true;template.rowStyle='connected';template.stats=region.statCount===2?['kills','total']:region.statCount===1?['total']:region.statCount===4?['placementPoints','booyah','kills','total']:view==='match'?['placementPoints','kills','total']:['booyah','kills','total'];template.logoX=w*.12;template.logoSize=Math.min(48,step*.75);template.nameX=w*.21;template.rankX=w*.025;template.rankWidth=w*.065;if(region.statCenters.length===template.stats.length)template.groups[0].statPositions=region.statCenters.map(cx=>cx-x);template.numberColor='#ffffff';return template;}
 const mask=new Uint8Array(count);for(let i=0;i<count;i++){const p=i*4,r=pixels[p],g=pixels[p+1],b=pixels[p+2];mask[i]=pixels[p+3]>180&&Math.max(r,g,b)>210&&Math.max(r,g,b)-Math.min(r,g,b)>45?1:0;}
 const boxes:Array<{x:number;y:number;width:number;height:number;color:string}>=[];const queue=new Int32Array(count);
 for(let origin=0;origin<count;origin++){if(!mask[origin])continue;let start=0,end=1;queue[0]=origin;mask[origin]=0;let minX=width,minY=height,maxX=0,maxY=0,area=0,red=0,green=0,blue=0;
  while(start<end){const i=queue[start++],x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);area++;red+=pixels[i*4];green+=pixels[i*4+1];blue+=pixels[i*4+2];for(const next of [x>0?i-1:-1,x+1<width?i+1:-1,y>0?i-width:-1,y+1<height?i+width:-1])if(next>=0&&mask[next]){mask[next]=0;queue[end++]=next;}}
  const w=maxX-minX+1,h=maxY-minY+1;if(w>=width*.12&&h>=height*.025&&h<=height*.14&&w/h>=2.5&&area/(w*h)>.65)boxes.push({x:minX*1920/width,y:minY*1080/height,width:w*1920/width,height:h*1080/height,color:'#'+[red,green,blue].map(v=>Math.round(v/area).toString(16).padStart(2,'0')).join('')});
 }
 const groups:typeof boxes[]=[];for(const box of boxes.sort((a,b)=>a.x-b.x||a.y-b.y)){const group=groups.find(g=>Math.abs(g[0].x-box.x)<30&&Math.abs(g[0].width-box.width)<40);if(group)group.push(box);else groups.push([box]);}
 const repeated=groups.filter(g=>g.length>=3&&g.length<=20).sort((a,b)=>a[0].x-b[0].x).slice(0,4);
 if(!repeated.length)return makeScoreTemplate(image,label,view);
 const detected:TemplateGroup[]=repeated.map(boxes=>{boxes.sort((a,b)=>a.y-b.y);const first=boxes[0];const gaps=boxes.slice(1).map((b,i)=>b.y-boxes[i].y).sort((a,b)=>a-b);const rowGap=gaps[Math.floor(gaps.length/2)],rowHeight=Math.min(rowGap,first.height+16),x=Math.max(0,first.x-first.width*.94),y=Math.max(0,first.y-8);return {x,y,width:Math.min(1920-x,first.x+first.width-x),rowHeight,rowGap,rows:boxes.length,statsX:first.x-x,statsWidth:first.width};});
 try{const template=makeScoreTemplate(image,label,view,detected,true);template.highlightColor=repeated[0][0].color;
  // Only slide whole rows when the artwork changes across most of their width
  // between each row and its gutter. Isolated statistic cells are insufficient.
  const separated=detectRowArtwork(width,height,pixels,detected.map(g=>({...g,rowStep:g.rowGap})));
  template.rowArtwork=separated;template.rowStyle=separated?'separated':'connected';const header=boxes.filter(b=>b.y+b.height<detected[0].y&&b.width>250).sort((a,b)=>b.width-a.width)[0];if(header)template.subtitleRegion={x:header.x+12,y:header.y,width:header.width-24,height:header.height};return template;}catch{return makeScoreTemplate(image,label,view);}
}

export async function analyzeTemplateImage(source:Blob|string,label:string,view:'match'|'total'):Promise<ScoreTemplate>{
 const temporary=typeof source!=='string';const url=temporary?URL.createObjectURL(source):source;
 try{const image=new Image();image.src=url;await image.decode();if(image.width<640||image.height<360)throw new Error('Ảnh mẫu cần ít nhất 640 × 360. Khuyến nghị 1920 × 1080.');const canvas=document.createElement('canvas');canvas.width=480;canvas.height=270;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Không đọc được ảnh mẫu.');context.drawImage(image,0,0,480,270);return detectScoreTemplate('/score-templates/pending.png',label.slice(0,100),view,480,270,context.getImageData(0,0,480,270).data);}finally{if(temporary)URL.revokeObjectURL(url);}
}
