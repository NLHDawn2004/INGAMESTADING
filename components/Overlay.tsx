'use client';
import type {CSSProperties} from 'react';
import {fontStack,overlayTextStyle} from '../lib/typography';
import type {StudioState} from '../lib/state';
import {defaultMapRegion} from '../lib/overlay-layout';
import MapScheduleGrid from './MapScheduleGrid';
import Recap from './Recap';
import OverlayTransition from './OverlayTransition';

export default function Overlay({state,background=false}:{state:StudioState;background?:boolean}){
 const theme=state.theme;
 const recap=state.recapView==='summary';
 return <div className="broadcast configurable-map-overlay" style={{fontFamily:fontStack(),'--accent':theme.accent,'--overlay-text':theme.text} as CSSProperties}>
  {(background||theme.showBackgroundInOverlay)&&theme.useBackground&&theme.background&&<img className="kv-layer" src={theme.background} alt=""/>}
  {theme.showTitle&&<header className="custom-map-title" style={overlayTextStyle('map','title',theme.typography)}>{theme.title}</header>}
  <OverlayTransition identity={recap?'recap':'all-matches'}>{recap?<Recap state={state}/>:<MapScheduleGrid schedule={state} region={theme.mapRegion??defaultMapRegion} mode="cards" accent={theme.accent} shade={theme.shade} color={theme.text}/>}</OverlayTransition>
 </div>;
}
