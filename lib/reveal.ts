import {mapNames,type StudioState} from './state';

// A stored start time keeps the reveal consistent across viewers and reloads.
const holds=[...Array<number>(10).fill(90),...Array<number>(8).fill(130),...Array<number>(6).fill(200),...Array<number>(3).fill(300),360];
export const revealDuration=holds.reduce((total,hold)=>total+hold,0);
type Match=StudioState['matches'][number];
export function revealFrame(match:Match,matchNumber:number,now:number){
 if(matchNumber<=5)return {hidden:false,spinning:false,map:match.map};
 if(match.status==='locked')return {hidden:true,spinning:false,map:null};
 const elapsed=Math.max(0,now-match.revealAt);
 if(match.status==='finished'||!match.revealAt||elapsed>=revealDuration)return {hidden:false,spinning:false,map:match.map};
 let frame=0,until=holds[0];
 while(frame<holds.length-1&&elapsed>=until){frame++;until+=holds[frame];}
 return {hidden:false,spinning:true,map:mapNames[frame%mapNames.length]};
}
