import type {GameLogState} from './live-board-gamelog.ts';
export type LifeTracker={groups:Map<number,string[][]>;knocks:Map<string,{at:number;key:string}>;rescues:Set<string>};
function unique(options:string[][]){return [...new Map(options.map(ids=>{const sorted=[...new Set(ids)].sort();return [sorted.join(','),sorted] as const;})).values()];}
function tracker(s:GameLogState):LifeTracker{return s.lifeTracker??=( {groups:new Map(),knocks:new Map(),rescues:new Set()} );}
function options(s:GameLogState,group:number){const t=tracker(s);return t.groups.get(group)??[[...s.players].filter(([id,p])=>p.group===group&&s.playerStates.get(id)==='knocked'&&!s.deadPlayers.has(id)).map(([id])=>id)];}
function set(s:GameLogState,group:number,next:string[][]){const t=tracker(s),values=unique(next);t.groups.set(group,values);for(const [id,p]of s.players){if(p.group!==group||s.deadPlayers.has(id))continue;if(values.every(ids=>ids.includes(id)))s.playerStates.set(id,'knocked');else if(values.every(ids=>!ids.includes(id)))s.playerStates.set(id,'alive');}}
export function updateLife(s:GameLogState,event:'knock'|'recover'|'death'|'rescue',id:string,at:number,key:string){
 const player=s.players.get(id);if(!player)return false;const t=tracker(s),group=player.group;let current=options(s,group);
 if(event==='knock'){
  const previous=t.knocks.get(id);if(previous&&(previous.key===key||(key.startsWith('secondary:')&&at>=previous.at&&at-previous.at<1000)))return false;t.knocks.set(id,{at,key});
  const compatible=current.filter(ids=>!ids.includes(id));if(compatible.length)current=compatible;set(s,group,current.map(ids=>[...ids,id]));return true;
 }
 if(event==='recover'||event==='death'){t.knocks.delete(id);set(s,group,current.map(ids=>ids.filter(x=>x!==id)));return true;}
 if(t.rescues.has(key)||s.deadPlayers.has(id))return false;
 const helperAlive=current.filter(ids=>!ids.includes(id));if(helperAlive.length)current=helperAlive;
 const next=current.flatMap(ids=>ids.filter(target=>target!==id&&!s.deadPlayers.has(target)).map(target=>ids.filter(x=>x!==target)));
 if(!next.length)return false;t.rescues.add(key);set(s,group,next);return true;
}
export function aggregateLife(s:GameLogState,group:number,members:Array<[string,{alive:boolean}]>,capacity:number):Array<'alive'|'knocked'|'dead'|'unknown'>|null{
 const current=s.lifeTracker?.groups.get(group);if(!current?.length)return null;
 const valid=current.map(ids=>ids.filter(id=>!s.deadPlayers.has(id))),counts=valid.map(ids=>ids.length),min=Math.min(...counts),max=Math.max(...counts);
 // Bars represent team totals. After an ambiguous rescue every possible target
 // gives the same number of downed players; no recipient ID is invented.
 if(min===max){const chosen=new Set(valid[0]);return Array.from({length:capacity},(_,i)=>{const p=members[i];if(!p)return 'unknown';return !p[1].alive?'dead':chosen.has(p[0])?'knocked':'alive';});}
 const dead=members.filter(([,p])=>!p.alive).length;
 return [...Array(Math.max(0,capacity-dead-max)).fill('alive'),...Array(min).fill('knocked'),...Array(max-min).fill('unknown'),...Array(dead).fill('dead')].slice(0,capacity);
}
