'use client';
import {Fragment,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {animateOverlayOut} from '../lib/overlay-motion';

// Keep the outgoing React tree mounted until its last exit animation finishes.
// Revisions with the same identity update immediately, including live statistics.
export default function OverlayTransition({identity,children,replaceImmediately=false}:{identity:string|null;children:ReactNode;replaceImmediately?:boolean}){
 const incoming={identity,children};
 const [shown,setShown]=useState(incoming);
 const latest=useRef(incoming),host=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{latest.current=incoming;});
 if((shown.identity===identity&&shown.children!==children)||(replaceImmediately&&identity!==null&&shown.identity!==identity))setShown(incoming);
 useLayoutEffect(()=>{
  if(shown.identity===identity)return;
  const node=host.current;
  if(!node||shown.identity===null||matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(latest.current);return;}
  let stopped=false;
  node.dataset.overlayExiting='true';
  const exit=animateOverlayOut(node);
  void exit.finished.then(()=>{if(!stopped)setShown(latest.current);});
  return()=>{stopped=true;delete node.dataset.overlayExiting;exit.cancel();};
 },[identity,shown.identity]);
 return <div ref={host} style={{display:'contents'}} data-overlay-transition=""><Fragment key={shown.identity??'hidden'}>{shown.children}</Fragment></div>;
}
