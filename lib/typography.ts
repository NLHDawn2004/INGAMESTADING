import {z} from 'zod';
import type {CSSProperties} from 'react';

export const fontFamilies=['GFF Latin','GFF VN','Arial','Arial Black','Calibri','Cambria','Candara','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS','Bodoni MT Condensed','Bernard MT Condensed','Book Antiqua','Bookman Old Style','Broadway','Cascadia Code','Cascadia Mono'] as const;
export const textRoles=['title','subtitle','tableHeader','teamName','numbers','rank','booyah','winnerName','winnerStats','winnerStatsLabel','pageNumber','mapName','status','matchNumber','matchLabel','unlimited','unlimitedLabel','mystery'] as const;
export const textStyleSchema=z.object({family:z.enum(fontFamilies),weight:z.number().int().min(100).max(950),size:z.number().min(8).max(288).optional()});
export const typographySchema=z.record(z.enum(textRoles),textStyleSchema);
export type TypographySettings=z.infer<typeof typographySchema>;
export type TextRole=typeof textRoles[number];
export type TypographyKind='map'|'match'|'total';
type Region={key:TextRole;label:string;size:number;weight:number};
const region=(key:TextRole,label:string,size:number,weight=800):Region=>({key,label,size,weight});
export const typographyRegions:Record<TypographyKind,Region[]>={
 map:[region('mapName','Tên map',20),region('teamName','Tên đội thắng',17),region('status','Trạng thái trận',16),region('matchLabel','Chữ TRẬN / RANDOM',27),region('matchNumber','Số trận',14),region('booyah','BOOYAH!',38),region('unlimited','Chữ SỐ TRẬN trên thẻ vô hạn',38),region('unlimitedLabel','Chữ KHÔNG GIỚI HẠN',14),region('mystery','Dấu hỏi map bí mật',155)],
 match:[region('title','Tiêu đề bảng',72),region('subtitle','Tên trận',30),region('tableHeader','Tiêu đề các cột',17),region('teamName','Tên đội trong bảng',25),region('numbers','Điểm hạng / ELIMS / điểm tổng',30),region('rank','Thứ hạng đội',25),region('booyah','BOOYAH!',60),region('winnerName','Tên đội BOOYAH',32),region('winnerStatsLabel','Nhãn thông số BOOYAH',25),region('winnerStats','Số liệu BOOYAH',32),region('pageNumber','Số trang',18)],
 total:[region('title','Tiêu đề bảng',84),region('subtitle','Dòng phụ',33),region('tableHeader','Tiêu đề các cột',12,700),region('teamName','Tên đội trong bảng',27),region('numbers','BOOYAH / ELIMS / điểm tổng',30),region('rank','Thứ hạng đội',23),region('pageNumber','Số trang',18)]
};
export const weightOptions=[{value:200,label:'ExtraLight'},{value:300,label:'Light'},{value:350,label:'SemiLight'},{value:400,label:'Regular'},{value:450,label:'Book'},{value:500,label:'Medium'},{value:600,label:'SemiBold'},{value:650,label:'DemiBold'},{value:700,label:'Bold'},{value:800,label:'ExtraBold'},{value:900,label:'Black'},{value:950,label:'ExtraBlack'}];
export function weightsForFont(family:string){return family==='GFF Latin'?weightOptions.filter(w=>w.value===700||w.value===800):family==='GFF VN'?weightOptions.filter(w=>w.value===900):weightOptions;}
export function fontStack(family:string='GFF Latin'){return `"${family}", "GFF VN", Arial, sans-serif`;}
export function textSettings(kind:TypographyKind,role:TextRole,value?:TypographySettings){const fallback=typographyRegions[kind].find(r=>r.key===role);const saved=value?.[role];return {family:saved?.family||'GFF Latin' as const,weight:saved?.weight??fallback?.weight??800,size:saved?.size??fallback?.size??30};}
export function overlayTextStyle(kind:TypographyKind,role:TextRole,value?:TypographySettings):CSSProperties {
 const settings=textSettings(kind,role,value);
 return {fontFamily:fontStack(settings.family),fontWeight:settings.weight,...(value?.[role]?.size!==undefined?{fontSize:settings.size}:{} )};
}
