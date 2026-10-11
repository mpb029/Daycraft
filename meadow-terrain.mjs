import * as T from './vendor/three.module.js';
import {footprint,BUILD_RADIUS} from './world-rules.mjs';
// The saved arrangement remains a level clearing. Beyond it, smooth 3D hills
// extend far past the fog distance, so no shoreline or terrain edge is visible.
export const FIELD_SIZE=1200, FIELD_SEGMENTS=192;
export const FIELD_PALETTES={
 meadow:{ground:'#598836',base:'#356b29',tip:'#98bd59',sky:'#89b9dd',horizon:'#d9e9ed',fog:'#d9e9ed',fogNear:130,fogFar:470},
 autumn:{ground:'#698c36',base:'#4a7528',tip:'#b5c866',sky:'#b5c9d9',horizon:'#f1e6cc',fog:'#e8e7d4',fogNear:125,fogFar:440},
 coast:{ground:'#568a48',base:'#396e43',tip:'#9ab77a',sky:'#b2cddd',horizon:'#e2ece8',fog:'#dce8e2',fogNear:85,fogFar:360}
};
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function terrainHeight(x,z){const r=Math.hypot(x,z),fade=smooth(17,48,r);return fade*(5.8*Math.sin(x*.018+.45)*Math.cos(z*.012-.2)+6.4*Math.sin(z*.021-.4)+4.2*Math.cos((x+z)*.014)+2.6*Math.sin((x-1.5*z)*.026));}
export function makeRandom(seed=913){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function makeTerrainGeometry(theme='meadow'){
 const p=FIELD_PALETTES[theme]||FIELD_PALETTES.meadow,g=new T.PlaneGeometry(FIELD_SIZE,FIELD_SIZE,FIELD_SEGMENTS,FIELD_SEGMENTS);g.rotateX(-Math.PI/2);const pos=g.attributes.position,colors=new Float32Array(pos.count*3),base=new T.Color(p.ground),color=new T.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,terrainHeight(x,z));const band=.88+.07*Math.sin(x*.071+z*.027)+.06*Math.cos(z*.047-x*.023);color.copy(base).multiplyScalar(band);color.toArray(colors,i*3);}
 g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function groundIsOccupied(x,z,placed=[]){return placed.some(b=>{const [w,d]=footprint(b.id,b.placement.rotation);return Math.abs(x-b.placement.x)<w/2+.24&&Math.abs(z-b.placement.z)<d/2+.24;});}
function bladeGeometry(p,distant=false){
 const positions=[],colors=[],base=new T.Color(p.base),tip=new T.Color(p.tip),c=new T.Color();
 // Three curved, tapered blades per tuft, with actual depth from every angle.
 for(let blade=0;blade<3;blade++){const angle=blade*Math.PI*.71,cs=Math.cos(angle),sn=Math.sin(angle);const shape=[[-.07,0,0],[.07,0,0],[-.045,.38,.035],[.065,.38,.035],[-.01,.72,.13],[.055,.72,.13],[.09,1,.23]];
  for(const index of distant?[0,1,6]:[0,1,2,1,3,2,2,3,4,3,5,4,4,5,6]){const [x,y,z]=shape[index];positions.push(x*cs+z*sn,y,-x*sn+z*cs);c.copy(base).lerp(tip,y*.9);colors.push(c.r,c.g,c.b);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();return g;
}
export function makeGrass(theme='meadow',placed=[],count=78000){
 const p=FIELD_PALETTES[theme]||FIELD_PALETTES.meadow,time={value:0},breeze={value:1},arranging={value:0};
 const material=new T.MeshLambertMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide});
 material.onBeforeCompile=shader=>{shader.uniforms.fieldTime=time;shader.uniforms.fieldBreeze=breeze;shader.uniforms.fieldArranging=arranging;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float fieldTime;\nuniform float fieldBreeze;\nuniform float fieldArranging;');
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    vec2 root=instanceMatrix[3].xz;
    float bend=position.y*position.y;
    float wave=sin(fieldTime*.72+root.x*.16+root.y*.105)*.17+sin(fieldTime*1.03+root.y*.28)*.055;
    transformed.x+=wave*bend*fieldBreeze;
    transformed.z+=cos(fieldTime*.55+root.x*.08)*.06*bend*fieldBreeze;
    float shortGrass=1.0-fieldArranging*(1.0-smoothstep(${BUILD_RADIUS.toFixed(1)},${(BUILD_RADIUS+1.4).toFixed(1)},length(root)))*.98;
    transformed.y*=shortGrass;
   #endif`);
 };
 material.customProgramCacheKey=()=> 'daycraft-meadow-grass-v2';
 // Overlapping layers prevent a bald ring. Detailed foreground tufts blend into
 // simpler, broader grass that follows every hill, all the way to the field edge.
 // Logarithmic spacing and proportional width keep distant cover dense without
 // allocating millions of individual blades, especially on phones.
 const nearCount=Math.round(count*.6),meshes=[],random=makeRandom(),dummy=new T.Object3D(),tint=new T.Color();
 for(const distant of [false,true]){
  const capacity=distant?count-nearCount:nearCount,mesh=new T.InstancedMesh(bladeGeometry(p,distant),material,capacity);let n=0;
  for(let i=0;i<capacity;i++){
   const angle=random()*Math.PI*2,r=distant?36*Math.pow(FIELD_SIZE/Math.SQRT2/36,random()):Math.sqrt(random())*64,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
   const height=(.8+random()*.75)*(distant?1:1-.75*smooth(46,64,r)),width=(1.2+random()*.45)*(distant?1+r*.05:1),rotation=random()*Math.PI*2,tone=.87+random()*.2;
   if(Math.abs(x)>FIELD_SIZE/2||Math.abs(z)>FIELD_SIZE/2||groundIsOccupied(x,z,placed))continue;
   dummy.position.set(x,terrainHeight(x,z)-.10,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(width,height,width);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);tint.setRGB(tone*.96,tone,tone*.93);mesh.setColorAt(n,tint);n++;
  }
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();mesh.name=distant?'Grass across the hills':'Thick foreground grass';mesh.castShadow=false;mesh.receiveShadow=false;meshes.push(mesh);
 }
 return {mesh:meshes[0],meshes,update:(seconds,motion,editing)=>{time.value=seconds;breeze.value=motion?1:0;arranging.value=editing?1:0;},uniforms:{time,breeze,arranging}};
}
function sky(theme){const p=FIELD_PALETTES[theme]||FIELD_PALETTES.meadow;return new T.Mesh(new T.SphereGeometry(1400,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,toneMapped:false,uniforms:{rainMood:{value:0},daylight:{value:1},dusk:{value:0},sunDirection:{value:new T.Vector3(0,1,0)},nightTop:{value:new T.Color('#040a19')},nightHorizon:{value:new T.Color('#14263b')},top:{value:new T.Color(p.sky)},horizon:{value:new T.Color(p.horizon)}},vertexShader:`varying vec3 skyDirection;void main(){skyDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
 uniform vec3 top;uniform vec3 horizon;uniform vec3 nightTop;uniform vec3 nightHorizon;uniform vec3 sunDirection;uniform float rainMood;uniform float daylight;uniform float dusk;varying vec3 skyDirection;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){vec3 d=normalize(skyDirection);float h=max(d.y,0.0);vec3 colour=mix(mix(nightHorizon,nightTop,smoothstep(0.0,.65,h)),mix(horizon,top,smoothstep(0.0,.65,h)),daylight);
 float sunset=pow(max(0.0,dot(normalize(vec3(d.x,.05,d.z)),normalize(vec3(sunDirection.x,.05,sunDirection.z)))),7.0)*exp(-h*7.0)*dusk;
 colour=mix(colour,vec3(.8,.29,.13),sunset*.52*(1.0-rainMood));
 vec2 uv=d.xz/max(d.y+.12,.06)*1.3;float n=noise(uv)*.58+noise(uv*2.08)*.28+noise(uv*4.1)*.14;float cloud=smoothstep(.56,.76,n)*smoothstep(.025,.18,h);
 colour=mix(colour,mix(nightHorizon,vec3(.94,.955,.945),daylight),cloud*mix(.14,.72,daylight));
 vec3 wet=mix(mix(nightTop,nightHorizon,1.0-h),mix(vec3(.29,.37,.4),vec3(.46,.55,.58),1.0-h),daylight);
 colour=mix(colour,wet,rainMood*.9);gl_FragColor=vec4(colour,1.0);
 #include <colorspace_fragment>
 }`}));}
export function createMeadow({theme='meadow',placed=[],grassCount=78000}={}){
 const root=new T.Group();root.name='Open meadow';const ground=new T.Mesh(makeTerrainGeometry(theme),new T.MeshLambertMaterial({vertexColors:true,color:'#ffffff'}));ground.name='Rolling hills';ground.receiveShadow=true;root.add(ground);
 const grass=makeGrass(theme,placed,grassCount);root.add(...grass.meshes);const dome=sky(theme);root.add(dome);return {root,ground,grass,dome,setRain:enabled=>{dome.material.uniforms.rainMood.value=enabled?1:0;},setSky:info=>{const u=dome.material.uniforms;u.daylight.value=info.daylight;u.dusk.value=Math.max(0,1-Math.abs(info.sun.geometricAltitude+1)/9);u.sunDirection.value.fromArray(info.sun.direction);},palette:FIELD_PALETTES[theme]||FIELD_PALETTES.meadow};
}
export function createMeadowLights(scene){const ambient=new T.HemisphereLight('#e5f2ff','#405c23',1.45);scene.add(ambient);const moon=new T.DirectionalLight('#b7cef6',0);scene.add(moon);const sun=new T.DirectionalLight('#fff3d6',1.9);sun.position.set(-34,60,24);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:180});sun.shadow.bias=-.0006;sun.shadow.normalBias=.025;scene.add(sun);sun.userData.ambient=ambient;sun.userData.moon=moon;return sun;}
