// Astronomy Engine 2.1.19, bundled locally under its MIT licence.
import {Body,Observer,Equator,Horizon,Illumination,MoonPhase,Rotation_EQJ_HOR} from './astronomy-engine.mjs';
import {normaliseSkyLocation} from './sky-location.mjs';

const RAD=Math.PI/180;
export const clamp01=x=>Math.max(0,Math.min(1,x));
export function smoothRange(a,b,x){const t=clamp01((x-a)/(b-a));return t*t*(3-2*t);}
// World convention: east +X, zenith +Y, north −Z. Azimuth runs clockwise from north.
export function horizonDirection(azimuth,altitude){const az=azimuth*RAD,alt=altitude*RAD,c=Math.cos(alt);return [c*Math.sin(az),Math.sin(alt),-c*Math.cos(az)];}
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
export function moonLighting(azimuth,altitude,sunDirection,fraction){
 const az=azimuth*RAD,alt=altitude*RAD;
 const right=[Math.cos(az),0,Math.sin(az)],up=[-Math.sin(alt)*Math.sin(az),Math.cos(alt),Math.sin(alt)*Math.cos(az)];
 const z=2*clamp01(fraction)-1,amplitude=Math.sqrt(Math.max(0,1-z*z)),x=dot(sunDirection,right),y=dot(sunDirection,up),length=Math.hypot(x,y);
 return {right,up,light:length>1e-10?[x/length*amplitude,y/length*amplitude,z]:[amplitude,0,z]};
}
export function phaseName(angle){
 const a=((angle%360)+360)%360;
 if(a<6||a>=354)return 'New moon';if(a<84)return 'Waxing crescent';if(a<96)return 'First quarter';if(a<174)return 'Waxing gibbous';if(a<186)return 'Full moon';if(a<264)return 'Waning gibbous';if(a<276)return 'Last quarter';return 'Waning crescent';
}
export function skyAt(date=new Date(),location){
 const place=normaliseSkyLocation(location),observer=new Observer(place.latitude,place.longitude,0);
 function position(body){const eq=Equator(body,date,observer,true,true),h=Horizon(date,observer,eq.ra,eq.dec,'normal'),g=Horizon(date,observer,eq.ra,eq.dec);return {azimuth:h.azimuth,altitude:h.altitude,geometricAltitude:g.altitude,direction:horizonDirection(h.azimuth,h.altitude)};}
 const sun=position(Body.Sun),moon=position(Body.Moon),phase=MoonPhase(date),fraction=Illumination(Body.Moon,date).phase_fraction;
 const daylight=smoothRange(-12,6,sun.geometricAltitude),night=1-smoothRange(-12,-3,sun.geometricAltitude);
 return {at:date.getTime(),location:place,sun,moon:{...moon,phase,fraction,name:phaseName(phase),...moonLighting(moon.azimuth,moon.altitude,sun.direction,fraction)},daylight,night,daytime:sun.geometricAltitude>-.833,period:sun.geometricAltitude<=-6?'Night':sun.geometricAltitude<-.833?'Twilight':sun.geometricAltitude<6?'Low sun':'Daylight',starRotation:Rotation_EQJ_HOR(date,observer).rot};
}
// Shared by UI and renderer. A paused animation still reads the real wall clock.
let cached=null,cacheKey='';
export function currentSky(location,date=new Date()){
 const p=normaliseSkyLocation(location),key=`${p.latitude},${p.longitude},${p.label}`,now=date.getTime();
 if(!cached||key!==cacheKey||now<cached.at||now-cached.at>=20000){cached=skyAt(date,p);cacheKey=key;}
 return cached;
}
export function skyClockText(sky,zone,date=new Date()){
 return new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',timeZone:zone}).format(date)+' · '+sky.period;
}
