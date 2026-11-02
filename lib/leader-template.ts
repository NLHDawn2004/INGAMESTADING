import {videoLeaderDesign,defaultLeaderDesign,type LeaderDesign} from './player-leaders';
type Kind='elims'|'damage';type TemplateBytes={kind:Kind;bytes:Uint8Array};
const sources=[{kind:'elims',url:'/player-templates/video-elims-v2.png'},{kind:'damage',url:'/player-templates/video-damage-v2.png'},{kind:'elims',url:'/player-templates/red-gold-elims.png'},{kind:'damage',url:'/player-templates/red-gold-damage.png'}] as const;
let templateBytes:Promise<TemplateBytes[]>|undefined;
function templates(){return templateBytes??=Promise.all(sources.map(async ({kind,url}):Promise<TemplateBytes|null>=>{try{const response=await fetch(url,{cache:'force-cache'});return response.ok?{kind,bytes:new Uint8Array(await response.arrayBuffer())}:null;}catch{return null;}})).then(rows=>rows.filter((row):row is TemplateBytes=>row!==null));}
export async function detectLeaderTemplate(bytes:Uint8Array):Promise<Kind|null>{return (await templates()).find(template=>bytes.length===template.bytes.length&&bytes.every((value,i)=>value===template.bytes[i]))?.kind||null;}
export function applyLeaderTemplate(_current:LeaderDesign,kind:Kind):LeaderDesign{return videoLeaderDesign(kind);}
export function hasDefaultLeaderLayout(design:LeaderDesign){const base=defaultLeaderDesign();return design.x===base.x&&design.y===base.y&&design.stepX===base.stepX&&design.stepY===base.stepY;}
const recognized=new Map<string,Promise<Kind|null>>();
export async function repairLegacyLeaderLayout(design:LeaderDesign):Promise<LeaderDesign>{
 if(!design.background||/^\/player-templates\/video-(elims|damage)-v2\.png$/.test(design.background))return design;
 const old=sources.find(source=>source.url===design.background);if(old)return videoLeaderDesign(old.kind);
 if(!/^\/api\/media\/[a-f0-9-]+$/.test(design.background))return design;
 let pending=recognized.get(design.background);if(!pending){pending=(async()=>{try{const response=await fetch(design.background,{cache:'force-cache'});return response.ok?detectLeaderTemplate(new Uint8Array(await response.arrayBuffer())):null;}catch{return null;}})();recognized.set(design.background,pending);}
 const kind=await pending;return kind?videoLeaderDesign(kind):design;
}
