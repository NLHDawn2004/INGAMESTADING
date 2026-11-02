'use client';
import {useEffect,useState} from 'react';
import type {LiveBoardSettings,LivePacket} from '../lib/live-board';
import LiveBoardOverlay from './LiveBoardOverlay';
import type {LiveTotalRow} from '../lib/live-total';
type Data={totalRows?:LiveTotalRow[]|null;settings:LiveBoardSettings;packet:LivePacket|null;teams:Array<{id:string;name:string;abbreviation?:string;logo:string}>;serverNow:number};
export default function LiveBoardOutput(){
 const [data,setData]=useState<Data|null>(null),[scale,setScale]=useState(1),[age,setAge]=useState(0);
 useEffect(()=>{let stopped=false,timer:ReturnType<typeof setTimeout>,failures=0,sampleAt=0,serverAtReceipt=0,receipt=0;
 const token=new URL(location.href).searchParams.get('token')||'';
 const resize=()=>setScale(Math.min(innerWidth/1920,innerHeight/1080));resize();addEventListener('resize',resize);
 const aging=setInterval(()=>{if(sampleAt)setAge(Math.max(0,serverAtReceipt+performance.now()-receipt-sampleAt));},250);
 const poll=async()=>{try{const response=await fetch('/api/live-scoreboard?token='+encodeURIComponent(token),{cache:'no-store',signal:AbortSignal.timeout(4000)});
 if(response.status===403){if(!stopped)setData(null);sampleAt=0;return;}
 if(!response.ok)throw Error();const next=await response.json() as Data;
 if(!stopped){sampleAt=next.packet?.capturedAt||0;serverAtReceipt=next.serverNow;receipt=performance.now();setData(next);setAge(sampleAt?Math.max(0,next.serverNow-sampleAt):0);}failures=0;
 }catch{failures++;}if(!stopped)timer=setTimeout(poll,Math.min(500*2**failures,5000));};void poll();
 return()=>{stopped=true;clearTimeout(timer);clearInterval(aging);removeEventListener('resize',resize);};},[]);
 return <div className="obs-surface">{data&&<div style={{width:1920,height:1080,transform:'scale('+scale+')',transformOrigin:'top left'}}><LiveBoardOverlay {...data} ageMs={age}/></div>}</div>;
}
