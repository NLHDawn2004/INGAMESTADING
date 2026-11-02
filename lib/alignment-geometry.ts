export type RowGeometry={x:number;y:number;width:number;rowHeight:number;rowStep:number;rows:number};
export function fitRowsToCanvas(value:RowGeometry,{minHeight=16,minStep=16,maxHeight=1080,maxStep=1080,maxRows=20}={}){
 const rows=Math.max(1,Math.min(maxRows,Math.round(value.rows)));
 const width=Math.max(40,Math.min(1920,value.width));
 const rowHeight=Math.max(minHeight,Math.min(maxHeight,1080-(rows-1)*minStep,value.rowHeight));
 const rowStep=Math.max(minStep,Math.min(maxStep,rows>1?(1080-rowHeight)/(rows-1):maxStep,value.rowStep));
 return {...value,rows,width,rowHeight,rowStep,x:Math.max(0,Math.min(1920-width,value.x)),y:Math.max(0,Math.min(1080-rowHeight-(rows-1)*rowStep,value.y))};
}

export function fitRowsToRegion(value:RowGeometry,region:{x:number;y:number;width:number;height:number}){
 const rows=Math.max(1,Math.min(value.rows,Math.floor(region.height/16)));
 const width=Math.min(value.width,region.width),rowHeight=Math.max(16,Math.min(value.rowHeight,region.height-(rows-1)*16));
 const rowStep=Math.max(16,Math.min(value.rowStep,rows>1?(region.height-rowHeight)/(rows-1):region.height));
 return {...value,rows,width,rowHeight,rowStep,x:Math.max(region.x,Math.min(region.x+region.width-width,value.x)),y:Math.max(region.y,Math.min(region.y+region.height-rowHeight-(rows-1)*rowStep,value.y))};
}
