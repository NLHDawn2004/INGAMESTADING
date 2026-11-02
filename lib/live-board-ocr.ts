import {teamNameKey} from './team-identity.ts';
import {livePacketSchema,type LiveBoardSettings,type LivePacket,type LiveTeam} from './live-board.ts';
type Color={r:number;g:number;b:number};
export type OCRFrame={type:'frame';capturedAt:number;processStartedAt:number;processId:number;width:number;height:number;headerDetected:boolean;replayHint?:boolean;processingMs:number;rows:Array<{teamName:string;elimsText:string;zeroShape:boolean;oneShape?:boolean;pixels:Color[]}>;remainingTeams:number|null;remainingPlayers:number|null};
type Registered={id:string;name:string;abbreviation?:string};
export function parseOcrInteger(text:string,zeroShape=false,oneShape=false){const value=text.trim();if(zeroShape&&oneShape)return null;if(/^\d{1,4}$/.test(value)){if((zeroShape&&Number(value)!==0)||(oneShape&&Number(value)!==1))return null;return Number(value);}if(zeroShape&&(!value||/^[Oo]$/.test(value)))return 0;return oneShape&&(!value||/^[Il]$/.test(value))?1:null;}
export function colorAlive(pixels:Color[],settings:LiveBoardSettings){if(!settings.layout.readAlive)return null;let alive=0;
 for(const pixel of pixels){const distance=(color:number[])=>Math.hypot(pixel.r-color[0],pixel.g-color[1],pixel.b-color[2]);const yes=Math.min(...settings.layout.aliveColors.map(distance)),no=Math.min(...settings.layout.deadColors.map(distance));if(Math.min(yes,no)>settings.layout.colorTolerance||Math.abs(yes-no)<20)return null;if(yes<no)alive++;}
 return pixels.length===settings.layout.barXs.length?alive:null;
}
export function parseOcrFrame(frame:OCRFrame,settings:LiveBoardSettings,registered:Registered[]){
 const errors:string[]=[];if(!frame.headerDetected)errors.push('Chưa thấy đủ tiêu đề TEAM / ELIMS / ALIVE. Bật L và giữ game ở phía trước.');
 const rows=frame.rows.map(row=>{const name=row.teamName.trim();const matched=registered.filter(team=>[team.name,team.abbreviation||''].some(value=>value&&teamNameKey(value)===teamNameKey(name)));const elims=parseOcrInteger(row.elimsText,row.zeroShape,row.oneShape),aliveCount=colorAlive(row.pixels,settings);
  if(!name)errors.push('Có hàng chưa đọc được tên đội.');if(matched.length>1)errors.push('Tên đội trùng danh sách: '+name);if(elims===null)errors.push('Chưa đọc chắc ELIMS: '+(name||'hàng trống'));if(settings.layout.readAlive&&aliveCount===null)errors.push('Màu ALIVE chưa xác nhận: '+name);
  return {teamName:name,teamId:matched.length===1?matched[0].id:null,slot:null,elims,aliveCount,aliveStates:null,damage:null,placement:null} satisfies LiveTeam;
 });
 const nonempty=rows.filter(row=>row.teamName);
 if(nonempty.length!==settings.expectedTeams)errors.push('Đang đọc '+nonempty.length+'/'+settings.expectedTeams+' đội. Không phát bảng thiếu phần.');
 if(frame.remainingTeams!==null&&frame.remainingTeams>nonempty.length)errors.push('Game còn '+frame.remainingTeams+' đội nhưng khung chỉ có '+nonempty.length+' hàng.');
 if(frame.remainingPlayers!==null&&nonempty.every(row=>row.aliveCount!==null)&&nonempty.reduce((n,row)=>n+row.aliveCount!,0)!==frame.remainingPlayers)errors.push('Tổng vạch ALIVE không khớp số người của game.');
 return {rows:nonempty,errors};
}
export function packetFromOcr(frame:OCRFrame,settings:LiveBoardSettings,registered:Registered[],sessionId:string,sequence:number,detectedMatchId:string|null,clockOffset=0):{packet:LivePacket|null;diagnostic:object;message:string}{
 const parsed=parseOcrFrame(frame,settings,registered);const errors=[...parsed.errors];if(frame.replayHint&&settings.mode==='live')errors.push('Cửa sổ có thanh phát replay; không nhận thành dữ liệu live.');if(!settings.rosterConfirmed)errors.push('Chưa xác nhận tổng số đội của trận.');if(!settings.matchId)errors.push('Chưa chọn Match ID.');if(settings.mode==='live'&&detectedMatchId!==settings.matchId)errors.push('Match ID log phiên client chưa khớp; chưa xác nhận live.');
 const diagnostic={rows:parsed.rows,visibleRows:frame.rows.length,remainingTeams:frame.remainingTeams,remainingPlayers:frame.remainingPlayers,processingMs:frame.processingMs,detectedMatchId,processId:frame.processId,width:frame.width,height:frame.height,source:'windows-ocr',mode:settings.mode,replayHint:frame.replayHint||false,errors:errors.slice(0,8)};
 if(errors.length)return {packet:null,diagnostic,message:errors.slice(0,3).join(' ')};
 const result=livePacketSchema.safeParse({sessionId,configId:settings.configId,sequence,matchId:settings.matchId,detectedMatchId,source:'windows-ocr',isReplay:settings.mode==='replay',capturedAt:Math.round(frame.capturedAt+clockOffset),sourceEventAt:null,captureSpanMs:0,expectedTeams:settings.expectedTeams,complete:true,teams:parsed.rows,remainingTeams:frame.remainingTeams,remainingPlayers:frame.remainingPlayers});
 if(!result.success)return {packet:null,diagnostic,message:result.error.issues.map(issue=>issue.message).join(' ').slice(0,500)};
 return {packet:result.data,diagnostic,message:''};
}
export function parseLosslessJson(text:string):unknown{return JSON.parse(text.replace(/^\uFEFF/,''),(_key:string,value:unknown,context?:{source?:string})=>{if(typeof value==='number'&&Number.isInteger(value)&&!Number.isSafeInteger(value)){if(!context?.source)throw Error('Cần Node hỗ trợ JSON source context để giữ ID dài.');return context.source;}return value;});}
