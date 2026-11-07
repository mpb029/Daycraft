import * as T from './vendor/three.module.js';
import {SEA_LEVEL,SEA_TILT,stormWavesGLSL} from './stormwatch-waves.mjs';

// Surface-following foam fragments: real quads with independent birth times,
// crest-gated emission, wind drift, fading edges and gaps. Every corner follows
// the same displaced sea as the ocean mesh instead of facing the camera.
export function createStormFoam(uniforms,{mobile=false}={}){
 const count=mobile?480:1200,positions=[],uvs=[],seeds=[],indices=[];
 let state=231906;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let i=0;i<count;i++){
  const depth=70*Math.pow(13,random()),x=(.04+random()*1.04)*depth,seed=[random(),random(),random()];
  for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){positions.push(x,SEA_LEVEL,-depth);uvs.push(u,v);seeds.push(...seed);}
  const b=i*4;indices.push(b,b+1,b+2,b,b+2,b+3);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setAttribute('seed',new T.Float32BufferAttribute(seeds,3));geometry.setIndex(indices);
 const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,side:T.DoubleSide,
 vertexShader:`
 attribute vec3 seed;uniform float t,meshFootprint;varying vec2 particleUV;varying float opacity,particleSeed,shade;
 ${stormWavesGLSL}
 void main(){
  float life=2.8+seed.y*3.0,period=life+.7,age=mod(t+seed.x*period,period);
  float footprint=-position.z*meshFootprint;vec3 born,bornNormal;float compression;
  stormSeaFiltered(position.xz,t-age,footprint,born,bornNormal,compression);
  float birth=smoothstep(.065,.24,compression)*smoothstep(${(SEA_LEVEL+.1).toFixed(2)},${(SEA_LEVEL+2.1).toFixed(2)},born.y);
  float fade=smoothstep(0.,.28,age)*(1.-smoothstep(life*.46,life,age));
  vec2 extent=vec2(3.0+seed.y*6.0,.65+seed.z*1.25)*(1.+age*.065);
  vec2 corner=(uv-.5)*extent;float angle=(seed.z-.5)*.42;
  corner=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*corner;
  vec2 base=position.xz+vec2(-.6,.55)*age+corner;
  vec3 p,n;float squeeze;stormSeaFiltered(base,t,footprint,p,n,squeeze);p+=n*.14;
  opacity=birth*fade*(.37+seed.z*.29);particleUV=uv;particleSeed=seed.x*79.3;shade=.76+.24*max(0.,dot(n,normalize(vec3(-.3,.8,.4))));
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
 }`,
 fragmentShader:`
 uniform float flash;varying vec2 particleUV;varying float opacity,particleSeed,shade;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
 void main(){
  vec2 q=particleUV*2.-1.;float grain=noise(particleUV*8.+particleSeed),fine=noise(particleUV*21.+particleSeed);
  float edge=1.-smoothstep(.42,.99,length(q)+.24*(grain-.5));
  float lace=smoothstep(.22,.63,grain)*(.65+.35*fine),a=opacity*edge*lace;
  if(a<.005)discard;
  gl_FragColor=vec4(vec3(.67,.76,.78)*shade+flash*.07,a);
 }`});
 const foam=new T.Mesh(geometry,material);foam.name='crest-foam-particles';foam.rotation.x=SEA_TILT;foam.frustumCulled=false;foam.renderOrder=4;return foam;
}
