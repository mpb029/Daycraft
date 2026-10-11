// A cinematic travelling swell, in scene metres and seconds. This is an
// authored landscape, not a fluid-dynamics or tsunami prediction model.
export const WAVE_PERIOD=20*60;
export const WAVE_HEIGHT=160,FRONT_WIDTH=160,BACK_WIDTH=240,WAVE_SPEED=8;
export const WAVE_TRAIL=125,EYE_HEIGHT=2.8;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const smoother=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};

export function tideAt(seconds){
 const elapsed=Number.isFinite(seconds)?Math.max(0,seconds):0;
 const cycle=Math.max(1,Math.floor((elapsed-WAVE_TRAIL)/WAVE_PERIOD)+1),relative=elapsed-cycle*WAVE_PERIOD;
 // Long approach, then a constant-speed passage. Position and velocity join
 // continuously at −95 s; the old ridge fades away before the next appears.
 const join=-95;
 let centre;
 if(relative<join){
  centre=join*WAVE_SPEED-WAVE_SPEED*245*(1-Math.exp((relative-join)/245));
 }else centre=relative*WAVE_SPEED;
 const born=cycle===1?1:smooth((elapsed-((cycle-1)*WAVE_PERIOD+WAVE_TRAIL))/50);
 const strength=born*(1-smooth((relative-85)/(WAVE_TRAIL-85)));
 return {seconds:elapsed,cycle,relative,centre,strength,untilCrest:relative<=0?-relative:WAVE_PERIOD-relative,stage:relative<-70?'calm':relative<-3?'rising':relative<6?'crest':relative<80?'settling':'calm'};
}

export function sampleWater(x,z,seconds,tide){
 const a=.42*x+.32*z-1.1*seconds,b=-.19*x+.73*z-1.55*seconds,c=.86*x-.15*z+.83*seconds;
 const ripples=.08*Math.sin(a)+.045*Math.sin(b)+.03*Math.sin(c);
 let dx=.08*.42*Math.cos(a)-.045*.19*Math.cos(b)+.03*.86*Math.cos(c);
 let dz=.08*.32*Math.cos(a)+.045*.73*Math.cos(b)-.03*.15*Math.cos(c);
 const warp=16*Math.sin(x*.008)+8*Math.sin(x*.019),warpDx=.128*Math.cos(x*.008)+.152*Math.cos(x*.019);
 const amplitude=WAVE_HEIGHT*(.96+.035*Math.sin(x*.005)+.02*Math.sin(x*.013+1.1));
 const amplitudeDx=WAVE_HEIGHT*(.035*.005*Math.cos(x*.005)+.02*.013*Math.cos(x*.013+1.1));
 const across=z-tide.centre-warp,width=across>=0?FRONT_WIDTH:BACK_WIDTH,q=across/width;
 const envelope=Math.exp(-q*q)*tide.strength,large=amplitude*envelope,largeDz=large*(-2*across/(width*width)),largeDx=amplitudeDx*envelope-largeDz*warpDx;
 dx+=largeDx;dz+=largeDz;
 return {height:ripples+large,ripples,large,dx,dz,largeDx,largeDz};
}

export function waterCameraPose(tide,seconds,yaw=0,pitch=0){
 const drift=26*Math.exp(-(((tide.relative-12)/42)**2))*tide.strength;
 const surface=sampleWater(0,drift,seconds,tide);
 const along=surface.largeDx*Math.sin(yaw)-surface.largeDz*Math.cos(yaw);
 const ridePitch=clamp(Math.atan(along)*.19,-.19,.19),angle=clamp(pitch+ridePitch,-Math.PI*.46,Math.PI*.46);
 return {x:0,y:surface.height+EYE_HEIGHT,z:drift,pitch:angle,yaw,direction:[Math.sin(yaw)*Math.cos(angle),Math.sin(angle),-Math.cos(yaw)*Math.cos(angle)],surface};
}

export function createTideClock(){
 let seconds=0,preview=null;
 return {
  advance(delta,running=true){
   if(!running||!Number.isFinite(delta)||delta<=0)return tideAt(seconds);
   if(preview){
    const used=Math.min(delta,preview.duration-preview.elapsed);preview.elapsed+=used;
    seconds=preview.start+(preview.target-preview.start)*smoother(preview.elapsed/preview.duration);
    if(preview.elapsed>=preview.duration){preview=null;seconds+=delta-used;}
   }else seconds+=delta;
   return tideAt(seconds);
  },
  preview(){
   const state=tideAt(seconds);if(preview||state.stage!=='calm'||state.relative>0)return false;
   const target=state.cycle*WAVE_PERIOD-72;if(target<=seconds)return false;
   preview={start:seconds,target,elapsed:0,duration:24};return true;
  },
  get snapshot(){return tideAt(seconds);},get previewing(){return !!preview;},
  get secondsToCrest(){return preview?preview.duration-preview.elapsed+72:tideAt(seconds).untilCrest;}
 };
}

// Generated from the same constants as the CPU sampler. The camera and mesh
// use matching height and slope equations, so the ride cannot cut underwater.
export const WATER_SURFACE_GLSL=`
 uniform float waterTime;uniform float waveCentre;uniform float waveStrength;
 vec4 waterSurface(vec2 p){
  float a=.42*p.x+.32*p.y-1.1*waterTime,b=-.19*p.x+.73*p.y-1.55*waterTime,c=.86*p.x-.15*p.y+.83*waterTime;
  float small=.08*sin(a)+.045*sin(b)+.03*sin(c);
  float dx=.08*.42*cos(a)-.045*.19*cos(b)+.03*.86*cos(c),dz=.08*.32*cos(a)+.045*.73*cos(b)-.03*.15*cos(c);
  float warp=16.0*sin(p.x*.008)+8.0*sin(p.x*.019),warpDx=.128*cos(p.x*.008)+.152*cos(p.x*.019);
  float amplitude=${WAVE_HEIGHT.toFixed(1)}*(.96+.035*sin(p.x*.005)+.02*sin(p.x*.013+1.1));
  float amplitudeDx=${WAVE_HEIGHT.toFixed(1)}*(.035*.005*cos(p.x*.005)+.02*.013*cos(p.x*.013+1.1));
  float across=p.y-waveCentre-warp,width=across>=0.0?${FRONT_WIDTH.toFixed(1)}:${BACK_WIDTH.toFixed(1)},q=across/width;
  float envelope=exp(-q*q)*waveStrength,large=amplitude*envelope,largeDz=large*(-2.0*across/(width*width));
  dx+=amplitudeDx*envelope-largeDz*warpDx;dz+=largeDz;
  return vec4(small+large,dx,dz,large/max(amplitude,.1));
 }
`;
