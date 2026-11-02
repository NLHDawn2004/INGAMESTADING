import {createId} from './client-id.ts';
import {teamNameKey} from './team-identity.ts';
import type {TeamList,ListTeam} from './team-list.ts';
const label=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').trim().toLowerCase().replace(/\s+/g,' ');
const teamLabels=['ten team','ten doi','team'];
const groupLabels=['bang','nhom','group'];
export function importTeamListRows(list:TeamList,registered:ListTeam[],rows:string[][]){
 const header=rows.findIndex(r=>r.some(c=>teamLabels.includes(label(c||''))));if(header<0)throw Error('File cần hai cột BẢNG và TÊN TEAM.');
 const labels=rows[header].map(c=>label(c||'')),teamColumn=labels.findIndex(c=>teamLabels.includes(c)),groupColumn=labels.findIndex(c=>groupLabels.includes(c));if(groupColumn<0)throw Error('Thiếu cột BẢNG.');
 const teams=[...registered],collected=new Map<string,{name:string;teamIds:string[]}>();let currentGroup='',added=0;
 for(const [i,row] of rows.slice(header+1).entries()){
  if(!row.some(c=>c?.trim()))continue;
  const explicitGroup=(row[groupColumn]||'').trim(),name=(row[teamColumn]||'').trim(),line=header+i+2;
  if(groupLabels.includes(label(explicitGroup))&&teamLabels.includes(label(name)))continue;
  if(explicitGroup)currentGroup=explicitGroup;
  if(!currentGroup)throw Error('Dòng '+line+': chưa có tên bảng. Điền tên bảng ở đội đầu tiên của mỗi bảng.');
  if(!name)throw Error('Dòng '+line+': thiếu tên đội.');if(name.length>80||currentGroup.length>80)throw Error('Dòng '+line+': tên đội và tên bảng tối đa 80 ký tự.');
  const key=teamNameKey(name),matches=teams.filter(t=>[t.name,t.abbreviation].some(v=>v&&teamNameKey(v)===key));
  if(matches.length>1)throw Error('Dòng '+line+': tên '+name+' khớp nhiều đội. Kiểm tra tên hoặc viết tắt trong danh sách đội.');
  let team=matches[0];if(!team){if(teams.length>=100)throw Error('Danh sách vượt quá 100 đội.');team={id:createId(),name,logo:''};teams.push(team);added++;}
  const groupKey=label(currentGroup),group=collected.get(groupKey)||{name:currentGroup,teamIds:[]};
  if(group.teamIds.includes(team.id))throw Error('Dòng '+line+': trùng đội '+name+' trong '+currentGroup+'.');
  group.teamIds.push(team.id);collected.set(groupKey,group);
 }
 if(!collected.size)throw Error('File không có đội.');
 const groups=[...list.groups];for(const group of collected.values()){const index=groups.findIndex(g=>label(g.name)===label(group.name));if(index>=0)groups[index]={...groups[index],teamIds:group.teamIds};else groups.push({id:createId(),...group});}
 if(groups.length>30)throw Error('Tối đa 30 bảng.');
 const first=groups.find(g=>label(g.name)===label([...collected.values()][0].name))!;
 return {list:{...list,groups,selectedId:first.id,page:0},teams,added,groupCount:collected.size,teamCount:[...collected.values()].reduce((n,g)=>n+g.teamIds.length,0)};
}
