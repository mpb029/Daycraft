// Metres and seconds. The same waves supply surface height and analytic slopes;
// small fragment-only ripples do not need a denser mesh or another render pass.
export const POOL_SWELLS=Object.freeze([
 Object.freeze([.019, 1.13, .84, -1.09, .31]),
 Object.freeze([.012, -.71, 1.61, -1.37, 1.70]),
 Object.freeze([.007, 1.87, -.54, -.94, 3.20])
]);
export const POOL_MAX_RISE=POOL_SWELLS.reduce((sum,w)=>sum+w[0],0);
export function samplePoolSwell(x,z,time){
 let height=0,dx=0,dz=0;
 for(const [a,kx,kz,speed,phase] of POOL_SWELLS){
  const angle=x*kx+z*kz+time*speed+phase;
  height+=a*Math.sin(angle);dx+=a*kx*Math.cos(angle);dz+=a*kz*Math.cos(angle);
 }
 return {height,dx,dz};
}
const gl=n=>Number(n).toFixed(5);
export const POOL_SWELL_GLSL=`
vec3 poolSwell(vec2 p,float seconds){
 vec3 wave=vec3(0.);
 ${POOL_SWELLS.map(([a,kx,kz,speed,phase],i)=>`
 float phase${i}=dot(p,vec2(${gl(kx)},${gl(kz)}))+${gl(speed)}*seconds+${gl(phase)};
 wave+=${gl(a)}*vec3(sin(phase${i}),cos(phase${i})*vec2(${gl(kx)},${gl(kz)}));`).join('')}
 return wave;
}`;
