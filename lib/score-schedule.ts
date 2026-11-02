import type {StudioState} from './state';
import type {OverlayRegion} from './overlay-layout';
export type ScoreSchedule=Pick<StudioState,'matches'|'teams'>;
export const scheduleReadableLimit=30;
export function scoreScheduleLayout(count:number,region:OverlayRegion={x:1100,y:140,width:652,height:824},mode:'list'|'cards'='list'){
 const maxColumns=Math.max(1,Math.min(12,Math.floor(region.width/200)));
 const maxRows=Math.max(1,Math.floor(region.height/80));
 const capacity=maxColumns*maxRows;
 const columns=mode==='cards'?(count<=6?Math.max(1,Math.min(count,maxColumns)):Math.max(1,Math.min(maxColumns,Math.ceil(Math.sqrt(count*region.width/region.height*.7))))):Math.max(1,Math.min(maxColumns,Math.ceil(count/maxRows)));
 const rows=Math.max(1,Math.ceil(count/columns));
 const requestedGap=count>capacity?Math.max(1,Math.min(6,Math.floor(240/count))):8;
 const gap=Math.min(requestedGap,columns>1?region.width/(columns-1)*.25:requestedGap,rows>1?region.height/(rows-1)*.25:requestedGap);
 const width=(region.width-(columns-1)*gap)/columns,height=(region.height-(rows-1)*gap)/rows;
 return {columns,rows,gap,width,height,fontSize:Math.max(1,Math.min(24,width*.067,height*.19)),crowded:count>capacity,capacity};
}
