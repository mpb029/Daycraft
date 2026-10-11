// A cinematic travelling swell, in scene metres and seconds. This is an
// authored landscape, not a fluid-dynamics or tsunami prediction model.
export const WAVE_PERIOD=20*60;
export const WAVE_HEIGHT=640,FRONT_WIDTH=260,BACK_WIDTH=440,WAVE_SPEED=88;
export const WAVE_TRAIL=125,EYE_HEIGHT=2.8;
const CREST_BLEND=110,PULL_DISTANCE=140,PULL_TIME=4,DRIFT_WINDOW=14;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const smoother=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};

export function waveMotion(relative){
 // The arctangent tails approach a distant horizon slowly. Their position,
 // speed and acceleration match the fast central passage at both joins.
 const join=relative<-12?-12:relative>10?10:null;
 if(join===null)return {centre:relative*WAVE_SPEED,speed:WAVE_SPEED,acceleration:0};
 const duration=join<0?22:30,u=(relative-join)/duration,square=1+u*u;
 return {centre:join*WAVE_SPEED+WAVE_SPEED*duration*Math.atan(u),speed:WAVE_SPEED/square,acceleration:-2*WAVE_SPEED*u/(duration*square*square)};
}

export function tideAt(seconds){
 const elapsed=Number.isFinite(seconds)?Math.max(0,seconds):0;
 const cycle=Math.max(1,Math.floor((elapsed-WAVE_TRAIL)/WAVE_PERIOD)+1),relative=elapsed-cycle*WAVE_PERIOD;
 const travel=waveMotion(relative);
 const born=cycle===1?1:smooth((elapsed-((cycle-1)*WAVE_PERIOD+WAVE_TRAIL))/50);
 const strength=born*(1-smooth((relative-85)/(WAVE_TRAIL-85)));
 return {seconds:elapsed,cycle,relative,...travel,strength,untilCrest:relative<=0?-relative:WAVE_PERIOD-relative,stage:relative<-45?'calm':relative<-10?'approaching':relative<-1.3?'rising':relative<2.8?'crest':relative<24?'settling':'calm'};
}

export function sampleWater(x,z,seconds,tide){
 const a=.42*x+.32*z-1.1*seconds,b=-.19*x+.73*z-1.55*seconds,c=.86*x-.15*z+.83*seconds;
 const ripples=.08*Math.sin(a)+.045*Math.sin(b)+.03*Math.sin(c);
 let dx=.08*.42*Math.cos(a)-.045*.19*Math.cos(b)+.03*.86*Math.cos(c);
 let dz=.08*.32*Math.cos(a)+.045*.73*Math.cos(b)-.03*.15*Math.cos(c);
 const warp=16*Math.sin(x*.008)+8*Math.sin(x*.019),warpDx=.128*Math.cos(x*.008)+.152*Math.cos(x*.019);
 const amplitude=WAVE_HEIGHT*(.96+.035*Math.sin(x*.005)+.02*Math.sin(x*.013+1.1));
 const amplitudeDx=WAVE_HEIGHT*(.035*.005*Math.cos(x*.005)+.02*.013*Math.cos(x*.013+1.1));
 // A continuous width transition removes the acceleration kink caused by
 // joining two different Gaussian widths directly at the crest.
 const across=z-tide.centre-warp,blend=Math.tanh(across/CREST_BLEND),width=BACK_WIDTH+(FRONT_WIDTH-BACK_WIDTH)*(.5+.5*blend);
 const widthDz=(FRONT_WIDTH-BACK_WIDTH)*.5*(1-blend*blend)/CREST_BLEND,q=across/width,qDz=1/width-across*widthDz/(width*width);
 const envelope=Math.exp(-q*q)*tide.strength,large=amplitude*envelope,largeDz=-2*large*q*qDz,largeDx=amplitudeDx*envelope-largeDz*warpDx;
 dx+=largeDx;dz+=largeDz;
 return {height:ripples+large,ripples,large,dx,dz,largeDx,largeDz};
}

export function waterCameraPose(tide,seconds,yaw=0,pitch=0){
 // A smooth forward draw precedes the lift, then carries the eye over the
 // crest. The offset is zero at the crest, so the 20-minute timing stays exact.
 const drift=PULL_DISTANCE*Math.tanh(tide.relative/PULL_TIME)*Math.exp(-((tide.relative/DRIFT_WINDOW)**2))*tide.strength;
 const surface=sampleWater(0,drift,seconds,tide);
 const along=surface.largeDx*Math.sin(yaw)-surface.largeDz*Math.cos(yaw);
 const towardsWave=(.5+.5*Math.cos(yaw))**4;
 const lookAhead=.43*Math.exp(-(((tide.relative+6)/5)**2))*towardsWave*tide.strength;
 const ridePitch=.48*Math.tanh(Math.atan(along)*.9)+lookAhead,angle=clamp(pitch+ridePitch,-Math.PI*.46,Math.PI*.46);
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
  float across=p.y-waveCentre-warp,blend=tanh(across/${CREST_BLEND.toFixed(1)});
  float width=${BACK_WIDTH.toFixed(1)}+${(FRONT_WIDTH-BACK_WIDTH).toFixed(1)}*(.5+.5*blend),widthDz=${((FRONT_WIDTH-BACK_WIDTH)*.5).toFixed(1)}*(1.0-blend*blend)/${CREST_BLEND.toFixed(1)};
  float q=across/width,qDz=1.0/width-across*widthDz/(width*width);
  float envelope=exp(-q*q)*waveStrength,large=amplitude*envelope,largeDz=-2.0*large*q*qDz;
  dx+=amplitudeDx*envelope-largeDz*warpDx;dz+=largeDz;
  return vec4(small+large,dx,dz,large/max(amplitude,.1));
 }
`;
