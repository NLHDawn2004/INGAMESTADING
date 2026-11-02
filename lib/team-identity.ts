// Exact identity after normalizing case, accents and whitespace; never guess a similar name.
export function teamNameKey(value:string){return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,'');}
export function teamForName<T extends {id:string;name:string;abbreviation?:string}>(name:string,teams:T[]):T|undefined {
 const key=teamNameKey(name);if(!key)return;
 const matches=teams.filter(team=>[team.name,team.abbreviation].some(value=>value&&teamNameKey(value)===key));
 return matches.length===1?matches[0]:undefined;
}
