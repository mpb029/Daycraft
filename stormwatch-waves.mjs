// A directional storm swell: long crests share a prevailing direction, while
// advected seeded fields vary their bend, spacing and height continuously.
// The CPU sampler and GPU displacement use the same coefficients and gradients.
export const SEA_LEVEL=-18;
export const SEA_TILT=Math.atan((1-2*397/941)*Math.tan(28*Math.PI/180));
export const STORM_WAVES=Object.freeze([
 {amplitude:3.55,wavelength:58.6,angle:-.052,chop:.60,phase:.37,seed:[3.7,11.2]},
 {amplitude:2.00,wavelength:37.3,angle:.091,chop:.58,phase:3.14,seed:[21.4,-8.1]},
 {amplitude:1.10,wavelength:23.9,angle:-.128,chop:.53,phase:5.19,seed:[-14.8,31.6]},
 {amplitude:.56,wavelength:15.7,angle:.172,chop:.51,phase:1.63,seed:[44.1,17.3]},
 {amplitude:.30,wavelength:10.3,angle:-.206,chop:.43,phase:4.28,seed:[8.3,-41.7]},
 {amplitude:.14,wavelength:7.1,angle:.237,chop:.36,phase:2.46,seed:[-33.2,-19.6]}
].map(w=>Object.freeze({...w,direction:Object.freeze([Math.sin(w.angle),Math.cos(w.angle)]),seed:Object.freeze(w.seed),k:2*Math.PI/w.wavelength,omega:Math.sqrt(9.81*2*Math.PI/w.wavelength),crossScale:1/(w.wavelength*2.2),alongScale:1/(w.wavelength*1.35)})));
export const MAX_STORM_RISE=STORM_WAVES.reduce((n,w)=>n+w.amplitude*1.17,0);
const mod=(x,n)=>((x%n)+n)%n;
function lattice(x,y){x=mod(x,289);y=mod(y,289);const a=mod((34*x+1)*x,289),b=mod(a+y,289);return mod((34*b+1)*b,289)/288;}
// Quintic interpolation gives continuous first and second derivatives.
function noiseGradient(x,y){
 const ix=Math.floor(x),iy=Math.floor(y),u=x-ix,v=y-iy;
 const sx=u*u*u*(u*(u*6-15)+10),sy=v*v*v*(v*(v*6-15)+10),dx=30*u*u*(u-1)*(u-1),dy=30*v*v*(v-1)*(v-1);
 const a=lattice(ix,iy),b=lattice(ix+1,iy),c=lattice(ix,iy+1),d=lattice(ix+1,iy+1),cross=a-b-c+d;
 return [a+(b-a)*sx+(c-a)*sy+cross*sx*sy,dx*(b-a+cross*sy),dy*(c-a+cross*sx)];
}
const smooth=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v);};
export function sampleStormSea(x,z,t,footprint=0){
 const p=[x,SEA_LEVEL,z],dx=[1,0,0],dz=[0,0,1];
 for(const w of STORM_WAVES){
  const [a,b]=w.direction,travel=a*x+b*z-w.omega/w.k*t;
  const qx=(-b*x+a*z)*w.crossScale+w.seed[0],qy=travel*w.alongScale+w.seed[1];
  const bend=noiseGradient(qx,qy),envelope=noiseGradient(qx*.61+19.4,qy*.79-7.9);
  const phase=w.k*(a*x+b*z)-w.omega*t+w.phase+4.0*(bend[0]-.5),s=Math.sin(phase),c=Math.cos(phase);
  const base=w.amplitude*(1-smooth(.16,.48,footprint/w.wavelength)),A=base*(.62+.55*envelope[0]);
  const px=w.k*a+4.0*(-b*w.crossScale*bend[1]+a*w.alongScale*bend[2]);
  const pz=w.k*b+4.0*(a*w.crossScale*bend[1]+b*w.alongScale*bend[2]);
  const ax=base*.55*(-b*w.crossScale*.61*envelope[1]+a*w.alongScale*.79*envelope[2]);
  const az=base*.55*(a*w.crossScale*.61*envelope[1]+b*w.alongScale*.79*envelope[2]);
  p[0]+=w.chop*A*a*c;p[1]+=A*s;p[2]+=w.chop*A*b*c;
  const hx=w.chop*(ax*c-A*s*px),hz=w.chop*(az*c-A*s*pz);
  dx[0]+=a*hx;dx[1]+=ax*s+A*c*px;dx[2]+=b*hx;
  dz[0]+=a*hz;dz[1]+=az*s+A*c*pz;dz[2]+=b*hz;
 }
 const n=[dz[1]*dx[2]-dz[2]*dx[1],dz[2]*dx[0]-dz[0]*dx[2],dz[0]*dx[1]-dz[1]*dx[0]],len=Math.hypot(...n);
 return {position:p,dx,dz,normal:n.map(v=>v/len),squeeze:1-(dx[0]*dz[2]-dx[2]*dz[0])};
}
const gl=n=>Number(n).toFixed(9);
export const stormWavesGLSL=`
float waveHash(vec2 p){p=mod(p,289.);float a=mod((34.*p.x+1.)*p.x,289.);float b=mod(a+p.y,289.);return mod((34.*b+1.)*b,289.)/288.;}
vec3 waveNoise(vec2 p){
 vec2 i=floor(p),f=fract(p),s=f*f*f*(f*(f*6.-15.)+10.),g=30.*f*f*(f-1.)*(f-1.);
 float a=waveHash(i),b=waveHash(i+vec2(1,0)),c=waveHash(i+vec2(0,1)),d=waveHash(i+1.),crossTerm=a-b-c+d;
 return vec3(a+(b-a)*s.x+(c-a)*s.y+crossTerm*s.x*s.y,g.x*(b-a+crossTerm*s.y),g.y*(c-a+crossTerm*s.x));
}
void addWave(vec2 base,float time,float footprint,vec2 d,float amplitude,float wavelength,float k,float speed,float chop,float phase,vec2 seed,vec2 scales,inout vec3 p,inout vec3 dx,inout vec3 dz){
 vec2 across=vec2(-d.y,d.x),q=vec2(dot(across,base),dot(d,base)-speed/k*time)*scales+seed;
 vec3 bend=waveNoise(q),envelope=waveNoise(q*vec2(.61,.79)+vec2(19.4,-7.9));
 float angle=k*dot(d,base)-speed*time+phase+4.0*(bend.x-.5),s=sin(angle),c=cos(angle);
 float weight=amplitude*(1.-smoothstep(.16,.48,footprint/wavelength)),a=weight*(.62+.55*envelope.x);
 vec2 gradient=k*d+4.0*(bend.y*scales.x*across+bend.z*scales.y*d);
 vec2 ag=weight*.55*(envelope.y*scales.x*.61*across+envelope.z*scales.y*.79*d);
 p+=vec3(chop*a*d.x*c,a*s,chop*a*d.y*c);
 vec2 h=chop*(ag*c-a*s*gradient);
 dx+=vec3(h.x*d.x,ag.x*s+a*c*gradient.x,h.x*d.y);
 dz+=vec3(h.y*d.x,ag.y*s+a*c*gradient.y,h.y*d.y);
}
void stormSeaFiltered(vec2 base,float time,float footprint,out vec3 p,out vec3 n,out float squeeze){
 p=vec3(base.x,${gl(SEA_LEVEL)},base.y);vec3 dx=vec3(1,0,0),dz=vec3(0,0,1);
 ${STORM_WAVES.map(w=>`addWave(base,time,footprint,vec2(${w.direction.map(gl).join(',')}),${gl(w.amplitude)},${gl(w.wavelength)},${gl(w.k)},${gl(w.omega)},${gl(w.chop)},${gl(w.phase)},vec2(${w.seed.map(gl).join(',')}),vec2(${gl(w.crossScale)},${gl(w.alongScale)}),p,dx,dz);`).join('\n ')}
 n=normalize(cross(dz,dx));squeeze=1.-(dx.x*dz.z-dx.z*dz.x);
}
void stormSea(vec2 base,float time,out vec3 p,out vec3 n,out float squeeze){stormSeaFiltered(base,time,0.,p,n,squeeze);}
`;
