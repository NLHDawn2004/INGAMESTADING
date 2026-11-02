'use client';
import {useLayoutEffect,useRef,type ComponentPropsWithoutRef,type CSSProperties} from 'react';

// Layout coordinates are independent of the OBS/preview scale.
export default function LiveBoardAnimatedRow({rank,leader=false,style,className='',...props}:ComponentPropsWithoutRef<'article'>&{rank:number;leader?:boolean}){
 const ref=useRef<HTMLElement>(null),previous=useRef<{x:number;y:number}|null>(null),motion=useRef<Animation|null>(null);
 useLayoutEffect(()=>{
  const node=ref.current;if(!node)return;
  const next={x:node.offsetLeft,y:node.offsetTop},last=previous.current;previous.current=next;
  if(!last||(last.x===next.x&&last.y===next.y))return;
  // Reinserted DOM rows can restart a CSS animation in Chromium. A rank move
  // must remain visible, even if it interrupts the initial staggered reveal.
  node.dataset.liveEntered='true';
  const current=new DOMMatrixReadOnly(getComputedStyle(node).transform);
  motion.current?.cancel();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  motion.current=node.animate([{transform:`translate(${last.x-next.x+current.m41}px,${last.y-next.y+current.m42}px)`},{transform:'translate(0,0)'}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
 });
 useLayoutEffect(()=>()=>{motion.current?.cancel();},[]);
 return <article {...props} ref={ref} onAnimationEnd={event=>{if(event.target===event.currentTarget&&(event.animationName==='score-row-enter'||event.animationName==='score-row-slide'))event.currentTarget.dataset.liveEntered='true';props.onAnimationEnd?.(event);}} data-rank={rank} data-leader={leader?'true':undefined} className={'live-board-animated-row '+className+(leader?' live-board-leader':'')} style={{...style,'--row-delay':`${rank*250}ms`} as CSSProperties}/>;
}
