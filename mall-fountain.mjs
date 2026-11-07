import * as T from './vendor/three.module.js';
import {basinPoint,WATER_Y,MALL_HALF_H,MALL_HALF_W} from './mall-layout.mjs';

// Positions are registered to the basin in the approved atrium composition.
export const MALL_NOZZLES=Object.freeze([
 [1133,594,.68],[918,593,.27],[966,582,.33],
 [1270,584,.28],[1360,600,.35]
].map(([x,y,height],i)=>Object.freeze({position:basinPoint(x,y).toArray(),height,phase:i*1.913})));
// 144 different rendered liquid surfaces, sampled at 24 fps. The offline
// emission cycle is periodic; no shape is stretched or UV-warped at runtime.
export const FOUNTAIN_ATLAS=Object.freeze({columns:12,rows:12,frames:144,fps:24,width:128,height:192});
export function fountainFrame(time,phase=0,speed=1){
 const value=((time*FOUNTAIN_ATLAS.fps*speed+phase*23.7)%144+144)%144;
 return {first:Math.floor(value),second:(Math.floor(value)+1)%144,blend:value-Math.floor(value)};
}
const projectionGLSL=`vec2 photoUV(vec3 p){return vec2(.5+p.x/(-p.z*${(2*MALL_HALF_W).toFixed(8)}),.5+p.y/(-p.z*${(2*MALL_HALF_H).toFixed(8)}));}`;
const noiseGLSL=`
float fh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float foamNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(fh(i),fh(i+vec3(1,0,0)),f.x),mix(fh(i+vec3(0,1,0)),fh(i+vec3(1,1,0)),f.x),f.y),mix(mix(fh(i+vec3(0,0,1)),fh(i+vec3(1,0,1)),f.x),mix(fh(i+vec3(0,1,1)),fh(i+vec3(1,1,1)),f.x),f.y),f.z);}
`;
const impacts=MALL_NOZZLES.map((n,i)=>`vec2 q${i}=p-vec2(${n.position[0].toFixed(7)},${n.position[2].toFixed(7)});float d${i}=length(q${i});h+=.0065*sin(d${i}*31.-t*8.4+${n.phase.toFixed(4)})*exp(-d${i}*.92);`).join('\n');
const waterVertex=`
varying vec3 vWorld;varying vec3 vNormal;uniform float t;
float heightAt(vec2 p){float h=.0033*sin(p.x*11.3+p.y*4.2+t*2.2)+.0027*sin(p.y*14.1-p.x*3.7-t*2.8);
 h+=.0024*sin(p.x*23.7+p.y*16.1-t*4.7)+.0018*sin(p.y*32.4-p.x*18.7-t*5.1);
 h+=.0013*sin(p.x*51.1+p.y*24.3-t*6.6)+.0011*sin(p.y*58.9-p.x*31.7+t*7.4);${impacts}return h;}
void main(){vec3 p=position;p.y+=heightAt(p.xz);float e=.008;vNormal=normalize(vec3(heightAt(p.xz-vec2(e,0))-heightAt(p.xz+vec2(e,0)),2.*e,heightAt(p.xz-vec2(0,e))-heightAt(p.xz+vec2(0,e))));vWorld=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const waterFragment=`
uniform sampler2D photograph;uniform sampler2D surfaces;uniform float t,ready;varying vec3 vWorld,vNormal;
${projectionGLSL}${noiseGLSL}
void main(){vec2 uv=photoUV(vWorld);float mask=texture2D(surfaces,uv).r;if(mask<.02||ready<.5)discard;
 vec3 n=normalize(vNormal),v=normalize(-vWorld);float fresnel=.13+.70*pow(1.-max(0.,dot(n,v)),3.);
 // The photograph supplies registered architecture reflections, while actual
 // displaced surface normals determine refraction, glints and Fresnel light.
 vec2 bend=n.xz*vec2(.004,.0015);vec3 reflected=texture2D(photograph,uv+bend).rgb;
 vec3 c=mix(vec3(.13,.31,.31),reflected,.58+fresnel*.36);
 vec3 l=normalize(vec3(-.5,2.,.8));float glint=pow(max(0.,dot(n,normalize(v+l))),55.);
 float rippleLight=max(0.,n.x*.4+n.z*.7);c+=vec3(.78,.83,.76)*glint*.62+rippleLight*.25;
 // Broad skylight glints follow the changing surface, with no repeating grid.
 float glitter=smoothstep(.19,.38,abs(n.x*.43+n.z*.67))*(.55+.45*sin(vWorld.x*21.+vWorld.z*17.+t*3.));
 float flecks=smoothstep(.68,.85,foamNoise(vec3(vWorld.x*47.,vWorld.z*59.,t*.8)))*(.3+.7*glitter);
 c=mix(c,vec3(.94,.96,.89),glitter*.22+flecks*.24);
 gl_FragColor=vec4(c,1.);}`;
// Every atlas frame was rendered from a different connected 3D water mesh.
// A fixed camera lets us cache the costly water shading for phones and laptops.
const jetVertex=`
attribute vec3 nozzle;attribute vec3 jet;uniform float t,reflection;
varying vec3 vWorld;varying vec2 vUv;varying float vPhase,vSpeed;
void main(){float h=jet.x*1.04;vec3 p=nozzle+vec3(position.x*h*.80,h*(position.y-.055),0.);
 if(reflection>.5){p.y=2.*${WATER_Y.toFixed(4)}-p.y;p.x+=sin(p.y*48.+t*4.7)*.011;}
 vWorld=p;vUv=uv;vPhase=jet.z;vSpeed=sqrt(.68/jet.x);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const jetFragment=`
uniform sampler2D surfaces,flowAtlas;uniform float t,ready,reflection;
varying vec3 vWorld;varying vec2 vUv;varying float vPhase,vSpeed;
${projectionGLSL}
vec4 waterFrame(float frame,vec2 uv){
 // Half-texel insets prevent neighboring frames bleeding into transparent edges.
 vec2 tile=vec2(mod(frame,12.),11.-floor(frame/12.));
 vec2 pixel=vec2(.5)+clamp(uv,0.,1.)*vec2(127.,191.);
 return texture2D(flowAtlas,(tile+pixel/vec2(128.,192.))/12.);
}
void main(){if(ready<.5)discard;
 float frame=mod(t*24.*vSpeed+vPhase*23.7,144.);float first=floor(frame);
 vec4 a=waterFrame(first,vUv),b=waterFrame(mod(first+1.,144.),vUv);
 // Interpolate premultiplied colors so translucent droplets never acquire dark
 // halos when they move between frames. The stored atlas uses straight alpha.
 float blend=fract(frame);float alpha=mix(a.a,b.a,blend);
 vec3 c=mix(a.rgb*a.a,b.rgb*b.a,blend)/max(alpha,.0001);
 if(vWorld.y<${WATER_Y.toFixed(4)}&&reflection<.5)discard;
 if(reflection>.5){if(texture2D(surfaces,photoUV(vWorld)).r<.4)discard;alpha*=.22*(.55+.45*sin(vWorld.y*64.+t*7.));c=mix(vec3(.25,.42,.40),c,.72);}
 if(alpha<.008)discard;gl_FragColor=vec4(c,alpha*.70);}`;
const ringVertex=`varying vec2 vUv;varying float vPhase;uniform float t;attribute float phase;
void main(){vUv=uv;vPhase=phase;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const ringFragment=`uniform float t,ready;varying vec2 vUv;varying float vPhase;${noiseGLSL}
void main(){if(ready<.5)discard;vec2 q=(vUv-.5)*2.;float r=length(q);float a=atan(q.y,q.x);
 float noisy=r+.04*sin(a*9.+t*1.3)+.03*sin(a*17.-t*1.7);
 float wave=.5+.5*sin(noisy*23.-t*7.+vPhase);float broken=foamNoise(vec3(q*18.,t*.8+vPhase));
 float bubbles=foamNoise(vec3(q*59.,t*.65+vPhase));
 float foam=exp(-r*r*11.)*(.45+.4*bubbles)+pow(wave,6.)*.55*(1.-smoothstep(.18,1.,r))*broken;
 foam+=smoothstep(.58,.8,bubbles)*exp(-r*r*5.)*.35;
 gl_FragColor=vec4(.94,.98,.92,min(.92,foam));}`;
function mat(uniforms,vertexShader,fragmentShader,extra={}){return new T.ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide,...extra});}
export function createMallFountain(uniforms,{mobile=false}={}){
 const root=new T.Group();root.name='Live atrium fountain';
 const cols=mobile?112:192,rows=mobile?40:72,g=new T.PlaneGeometry(1,1,cols,rows),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const u=g.attributes.uv.getX(i),v=g.attributes.uv.getY(i),q=basinPoint(570+u*1102,637-v*72);p.setXYZ(i,q.x,q.y,q.z);}g.computeVertexNormals();
 const water=new T.Mesh(g,mat(uniforms,waterVertex,waterFragment));water.name='modeled-basin-water';water.renderOrder=0;water.frustumCulled=false;root.add(water);
 const points=[],nozzles=[],jets=[],uvs=[],indices=[],segments=1,columns=1;
 for(const [j,n] of MALL_NOZZLES.entries()){
  const start=points.length/3;
  for(let k=0;k<=segments;k++)for(let a=0;a<=columns;a++){
   points.push(a/columns-.5,k/segments,0);uvs.push(j%2?a/columns:1-a/columns,k/segments);nozzles.push(...n.position);jets.push(n.height,j,n.phase);
  }
  for(let k=0;k<segments;k++)for(let a=0;a<columns;a++){const q=start+k*(columns+1)+a;indices.push(q,q+columns+1,q+1,q+1,q+columns+1,q+columns+2);}
 }
 const jetG=new T.BufferGeometry();jetG.setAttribute('position',new T.Float32BufferAttribute(points,3));jetG.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));jetG.setAttribute('nozzle',new T.Float32BufferAttribute(nozzles,3));jetG.setAttribute('jet',new T.Float32BufferAttribute(jets,3));jetG.setIndex(indices);
 const streams=new T.Mesh(jetG,mat({...uniforms,reflection:{value:0}},jetVertex,jetFragment));streams.name='five-baked-liquid-plumes';streams.frustumCulled=false;streams.renderOrder=12;root.add(streams);
 const reflections=new T.Mesh(jetG,mat({...uniforms,reflection:{value:1}},jetVertex,jetFragment));reflections.name='live-plume-reflections';reflections.frustumCulled=false;reflections.renderOrder=1;root.add(reflections);
 const rings=new T.BufferGeometry(),rp=[],ru=[],rph=[];
 for(const n of MALL_NOZZLES)for(const [x,z] of [[-1,-1],[-1,1],[1,-1],[1,-1],[-1,1],[1,1]]){const radius=.34+.26*Math.sqrt(n.height/.68);rp.push(n.position[0]+x*radius,WATER_Y+.012,n.position[2]+z*radius);ru.push((x+1)/2,(z+1)/2);rph.push(n.phase);}
 rings.setAttribute('position',new T.Float32BufferAttribute(rp,3));rings.setAttribute('uv',new T.Float32BufferAttribute(ru,2));rings.setAttribute('phase',new T.Float32BufferAttribute(rph,1));
 const impacts=new T.Mesh(rings,mat(uniforms,ringVertex,ringFragment));impacts.name='jet-impact-foam-and-ripples';impacts.renderOrder=2;impacts.frustumCulled=false;root.add(impacts);
 return {root,water,streams,reflections,impacts};
}
