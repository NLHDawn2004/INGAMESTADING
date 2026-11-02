import type {DriveImage} from './drive-team-logos';
export type PortraitPlayer={playerId:string;name:string;teamName:string};
export function portraitFilenameId(name:string):string|null{
 return name.trim().match(/^(\d{1,24})\.(png|jpe?g|webp|gif)$/i)?.[1]||null;
}
export function matchDrivePortraits(files:DriveImage[],players:PortraitPlayer[]){
 const unique=Array.from(new Map(players.map(player=>[player.playerId,player])).values());
 const matches:Array<{player:PortraitPlayer;file:DriveImage}>=[],missing:PortraitPlayer[]=[],ambiguous:PortraitPlayer[]=[];
 for(const player of unique){
  const found=Array.from(new Map(files.filter(file=>portraitFilenameId(file.name)===player.playerId).map(file=>[file.id,file])).values());
  if(found.length===1)matches.push({player,file:found[0]});else if(found.length>1)ambiguous.push(player);else missing.push(player);
 }
 return {matches,missing,ambiguous};
}
