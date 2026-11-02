type Rows={x:number;y:number;width:number;rowHeight:number;rowStep:number;rows:number};
// Moving artwork requires repeated changes across most of a row's width.
// Numeric cells or manually adding row spacing do not count as an art layer.
export function detectRowArtwork(width:number,height:number,p:Uint8Array|Uint8ClampedArray,groups:Rows[]){
 if(p.length!==width*height*4||!groups.length)return false;
 return groups.every(g=>{if(g.rows<3)return false;let matches=0;
  for(let row=0;row<g.rows-1;row++){const center=Math.min(height-1,Math.floor((g.y+row*g.rowStep+g.rowHeight/2)*height/1080));const gutter=Math.min(height-1,Math.floor((g.y+(row+1)*g.rowStep-1)*height/1080));let changed=0,samples=0;
   for(let x=Math.max(0,Math.ceil(g.x*width/1920));x<Math.min(width,(g.x+g.width)*width/1920);x++){const a=(center*width+x)*4,b=(gutter*width+x)*4;const delta=Math.max(...[0,1,2].map(c=>Math.abs(p[a+c]*p[a+3]/255-p[b+c]*p[b+3]/255)),Math.abs(p[a+3]-p[b+3]));if(delta>45)changed++;samples++;}
   if(samples&&changed/samples>.65)matches++;
  }return matches>=Math.ceil((g.rows-1)*.75);
 });
}
