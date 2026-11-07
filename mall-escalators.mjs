import * as T from './vendor/three.module.js';
import {mallProject,mallPanel,MALL_HALF_W,MALL_HALF_H} from './mall-layout.mjs';

// Calibrated to the fixed seated photograph. Plants, balustrades and landing
// combs are protected by the surface mask, including the partly hidden flight.
export const MALL_ESCALATORS=Object.freeze([
 Object.freeze({id:'up',direction:1,steps:28,rate:.95,bottom:[937,540,18],top:[1018,334,28.17],width:.75}),
 Object.freeze({id:'down',direction:-1,steps:26,rate:.95,bottom:[1075,467,22],top:[1114,329,32],width:.75})
]);
export function escalatorRise(progress){const q=Math.max(0,Math.min(1,progress)),k=.065;return (q<k?q*q/(2*k):q>1-k?1-k-(1-q)*(1-q)/(2*k):q-k/2)/(1-k);}
export function escalatorTravel(time,flight){return time*flight.direction*flight.rate;}
export function escalatorStep(time,index,flight){return ((index+escalatorTravel(time,flight))%flight.steps+flight.steps)%flight.steps/flight.steps;}
const projection=`vec2 photoUV(vec3 p){return vec2(.5+p.x/(-p.z*${(2*MALL_HALF_W).toFixed(8)}),.5+p.y/(-p.z*${(2*MALL_HALF_H).toFixed(8)}));}`;
const vertex=`
attribute vec3 start,end;attribute vec3 flight;attribute vec3 detail;
uniform float t;varying vec3 vWorld;varying vec3 vDetail;varying float vLane,vAcross;
float lift(float s){float q=clamp(s,0.,1.),k=.065;return (q<k?q*q/(2.*k):q>1.-k?1.-k-(1.-q)*(1.-q)/(2.*k):q-k*.5)/(1.-k);}
void main(){
 float step=position.z-1.+fract(t*flight.y*flight.z);
 float along=(step+position.y)/flight.x;
 vec3 p=mix(start,end,along);
 // The tread stays horizontal as its rigid step advances up the incline.
 // Vertical riser faces close the gap to the next tread.
 p.y=mix(start.y,end.y,lift((step+detail.y)/flight.x));
 p.x+=position.x*.75;
 vWorld=p;vDetail=detail;vLane=detail.z;vAcross=position.x;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const fragment=`
uniform sampler2D photograph,escalatorMask;uniform float ready;
varying vec3 vWorld,vDetail;varying float vLane,vAcross;${projection}
void main(){if(ready<.5)discard;vec2 uv=photoUV(vWorld);vec3 mask=texture2D(escalatorMask,uv).rgb;float alpha=vLane<.5?mask.r:mask.g;if(alpha<.015)discard;
 // Retain local skylight/shadow color, while the real tread and riser geometry
 // supplies the moving silhouette and face changes.
 vec2 dy=vec2(.003,.008);vec3 base=(texture2D(photograph,uv-dy).rgb+texture2D(photograph,uv+dy).rgb+texture2D(photograph,uv).rgb)/3.;
 float light=clamp(dot(base,vec3(.2126,.7152,.0722)),.12,.46);
 float tread=1.-vDetail.x;float groove=.5+.5*cos(vAcross*235.);
 vec3 c=vec3(.90,.92,.88)*(light*(.93+.14*tread));
 c+=vec3(.025,.03,.026)*tread+vec3(.007)*groove;
 c+=vec3(.075,.070,.055)*smoothstep(.86,.99,vDetail.y)*vDetail.x;
 float edge=1.-smoothstep(.94,.995,vAcross);c*=.86+.14*edge;
 gl_FragColor=vec4(c,alpha);
}`;
const backingVertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const backingFragment=`
uniform sampler2D photograph,escalatorMask;uniform float t,ready;varying vec2 vUv;
void main(){if(ready<.5)discard;vec3 mask=texture2D(escalatorMask,vUv).rgb;float stairs=max(mask.r,mask.g);float rail=mask.b;
 if(max(stairs,rail)<.01)discard;vec2 uv=vUv;
 vec3 c=texture2D(photograph,uv).rgb;
 if(stairs>.01)c*=.58;
 if(rail>.01){
  // Both belt surfaces travel at the same step-chain phase as their flight.
  float farFlight=step(1060.,uv.x*1672.);float direction=1.-2.*farFlight;
  float pixelY=(1.-uv.y)*941.;
  float v=clamp((mix(540.,467.,farFlight)-pixelY)/mix(206.,138.,farFlight),0.,1.);
  float nearDepth=mix(18.,22.,farFlight),farDepth=mix(28.17,32.,farFlight);
  float distance=v*nearDepth/(farDepth-v*(farDepth-nearDepth));
  float phase=distance*mix(28.,26.,farFlight)*6.2831853-t*direction*${(MALL_ESCALATORS[0].rate*Math.PI*2).toFixed(8)};
  float rubber=.98+.018*sin(phase*5.17)+.012*sin(phase*11.41);
  float joint=pow(.5+.5*cos(phase*.142857),120.);
  c*=rubber*(1.-joint*.22);
 }
 gl_FragColor=vec4(c,max(stairs,rail));
}`;
function material(uniforms,vertexShader,fragmentShader){return new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide});}
export function createMallEscalators(uniforms){
 const root=new T.Group();root.name='Moving escalator flights';
 const back=new T.Mesh(mallPanel([890,315,1140,545],12),material(uniforms,backingVertex,backingFragment));back.name='escalator-landings-and-moving-belts';back.renderOrder=11;back.frustumCulled=false;root.add(back);
 const positions=[],starts=[],ends=[],flights=[],details=[];
 for(const [lane,f] of MALL_ESCALATORS.entries()){
  const start=mallProject(...f.bottom).toArray(),end=mallProject(...f.top).toArray();
  for(let i=0;i<f.steps+2;i++){
   // Two triangles for the horizontal tread and two for the vertical riser.
   for(const [x,y,z,face] of [[0,0,0,0],[1,0,0,0],[0,1,0,0],[0,1,0,0],[1,0,0,0],[1,1,0,0],[0,1,0,1],[1,1,0,1],[0,1,1,1],[0,1,1,1],[1,1,0,1],[1,1,1,1]]){
    positions.push(x,y,i);starts.push(...start);ends.push(...end);flights.push(f.steps,f.direction,f.rate);details.push(face,z,lane);
   }
  }
 }
 const g=new T.BufferGeometry();
 for(const [name,data] of Object.entries({position:positions,start:starts,end:ends,flight:flights,detail:details}))g.setAttribute(name,new T.Float32BufferAttribute(data,3));
 const steps=new T.Mesh(g,material(uniforms,vertex,fragment));steps.material.depthTest=true;steps.material.depthWrite=true;steps.name='moving-rigid-treads-and-risers';steps.renderOrder=11.1;steps.frustumCulled=false;root.add(steps);
 return {root,steps,back};
}
