import {z} from 'zod';
export const overlayRegionSchema=z.object({x:z.number().min(0).max(1880),y:z.number().min(0).max(1040),width:z.number().min(40).max(1920),height:z.number().min(40).max(1080)}).superRefine((r,c)=>{if(r.x+r.width>1920||r.y+r.height>1080)c.addIssue({code:'custom',message:'Vùng nội dung phải nằm trong khung 1920 × 1080.'});});
export type OverlayRegion=z.infer<typeof overlayRegionSchema>;
export const defaultMapRegion:OverlayRegion={x:75,y:170,width:1770,height:740};
export const defaultScoreMapRegion:OverlayRegion={x:1100,y:180,width:720,height:760};
export const defaultScoreTableRegion:OverlayRegion={x:100,y:300,width:900,height:640};
export const scheduleDesignSchema=z.object({background:z.string().max(300).refine(v=>!v||/^\/api\/media\/[a-f0-9-]+$/.test(v)||/^\/score-templates\/[a-z0-9-]+\.(png|jpg|webp)$/.test(v)),maps:overlayRegionSchema,table:overlayRegionSchema,showTitle:z.boolean().default(true),showHeader:z.boolean().default(true)});
export type ScheduleDesign=z.infer<typeof scheduleDesignSchema>;
export function defaultScheduleDesign():ScheduleDesign{return {background:'',maps:{...defaultScoreMapRegion},table:{...defaultScoreTableRegion},showTitle:true,showHeader:true};}

// Keep the table and maps disjoint even when a saved/manual rectangle overlaps.
export function separateScoreRegions(table:OverlayRegion,maps:OverlayRegion):OverlayRegion{
 if(table.x+table.width<=maps.x||maps.x+maps.width<=table.x||table.y+table.height<=maps.y||maps.y+maps.height<=table.y)return maps;
 const right={...maps,x:Math.max(maps.x,table.x+table.width+12)};right.width=Math.min(maps.x+maps.width-right.x,1920-right.x);
 const left={...maps,width:Math.min(maps.width,table.x-12-maps.x)};
 const bottom={...maps,y:Math.max(maps.y,table.y+table.height+12)};bottom.height=Math.min(maps.y+maps.height-bottom.y,1080-bottom.y);
 const top={...maps,height:Math.min(maps.height,table.y-12-maps.y)};
 const candidates=[right,left,bottom,top].filter(v=>v.width>=40&&v.height>=40);
 return candidates.sort((a,b)=>b.width*b.height-a.width*a.height)[0]??{x:maps.x,y:maps.y,width:0,height:0};
}
