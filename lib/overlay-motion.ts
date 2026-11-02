// Exit from the current visual frame, including when an entrance is interrupted.
// The entire row (artwork, logo, name and statistics) moves as one unit.
export function animateOverlayOut(host:HTMLElement){
 const selector='.map-card,.unlimited-card,.map-center,.winner-logo,.map-label,.score-table-row:not(.empty),.match-rank-row,.template-score-row,.schedule-total-row,.schedule-map-card,.leader-header-motion,.leader-data-row,.live-board-animated-row,.live-board-chrome';
 const candidates=Array.from(host.querySelectorAll<HTMLElement>(selector));
 // The legend precedes rows in the DOM for painting, but must leave first.
 // Sort by visual reveal order before applying the reverse exit stagger.
 const order=(node:HTMLElement)=>node.matches('.live-board-footer-art')?1:node.matches('.live-board-header-art')?-1:0;
 const rows=candidates.filter(node=>!candidates.some(parent=>parent!==node&&parent.contains(node))).sort((a,b)=>order(a)-order(b));
 const animations:Animation[]=[];
 const duration=400,stagger=Math.min(60,1000/Math.max(1,rows.length-1));
 rows.forEach((node,index)=>{
  const style=getComputedStyle(node);
  const from:Keyframe={opacity:style.opacity,transform:style.transform,clipPath:style.clipPath};
  let to:Keyframe;
  if(node.matches('.score-table-row,.match-rank-row,.template-score-row,.schedule-total-row,.schedule-map-card,.leader-header-motion,.leader-data-row,.live-board-animated-row,.live-board-chrome')){
   const separated=node.closest('[data-row-style="separated"]');
   to=separated?{transform:'translateX(-100%)',clipPath:'inset(0 0 0 100%)'}:{clipPath:'inset(0 0 100% 0)'};
  }else if(node.matches('.winner-logo'))to={opacity:0,transform:'scale(.78) rotate(-8deg)'};
  else if(node.matches('.map-label'))to={opacity:0,transform:'translateX(-22px)'};
  else to={opacity:0,transform:node.matches('.map-center')?'translateY(8px)':'translateY(26px) scale(.97)'};
  animations.push(node.animate([from,to],{duration,delay:(rows.length-index-1)*stagger,easing:'ease-in',fill:'both'}));
 });
 // Leave the KV and headers in place until the rows have gone, then fade them.
 const rowEnd=rows.length?duration+(rows.length-1)*stagger:0;
 for(const node of Array.from(host.children)){
  if(node instanceof HTMLElement)animations.push(node.animate([{opacity:getComputedStyle(node).opacity},{opacity:0}],{duration:180,delay:rowEnd,easing:'ease-in',fill:'both'}));
 }
 return {finished:Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))),cancel:()=>animations.forEach(animation=>animation.cancel())};
}
