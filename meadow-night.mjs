import * as T from './vendor/three.module.js';
import {makeRandom,terrainHeight,groundIsOccupied} from './meadow-terrain.mjs';
import {smoothRange} from './sky-time.mjs';

const pointFragment=`
 varying vec3 tint;varying float glow;
 void main(){float r=length(gl_PointCoord-.5)*2.0;if(r>1.0)discard;
 float a=exp(-r*r*5.0)*(1.0-smoothstep(.65,1.0,r))*glow;
 gl_FragColor=vec4(tint,a);
 #include <colorspace_fragment>
 }`;
function makeStars(mobile){
 const count=mobile?1600:3200,random=makeRandom(82931),positions=[],colours=[],sizes=[],phases=[];
 // An artistic star field, not a named constellation catalogue. Its celestial
 // sphere still turns with the actual Earth rotation and observer latitude.
 for(let i=0;i<count;i++){
  const z=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-z*z);
  positions.push(r*Math.cos(a)*1240,r*Math.sin(a)*1240,z*1240);
  colours.push(.75+random()*.25,.82+random()*.18,1);sizes.push(1.2+Math.pow(random(),6)*3.3);phases.push(random()*Math.PI*2);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('starTint',new T.Float32BufferAttribute(colours,3));g.setAttribute('pointSize',new T.Float32BufferAttribute(sizes,1));g.setAttribute('phase',new T.Float32BufferAttribute(phases,1));
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{brightness:{value:0},time:{value:0},pixelRatio:{value:1}},vertexShader:`
 attribute vec3 starTint;attribute float pointSize;attribute float phase;
 uniform float brightness;uniform float time;uniform float pixelRatio;varying vec3 tint;varying float glow;
 void main(){vec4 p=modelMatrix*vec4(position,1.0);vec3 direction=normalize(p.xyz-cameraPosition);tint=starTint;
 glow=brightness*smoothstep(.0,.07,direction.y)*(.88+.12*sin(time*.28+phase));
 gl_Position=projectionMatrix*viewMatrix*p;gl_PointSize=pointSize*pixelRatio;
 }`,fragmentShader:pointFragment});
 const points=new T.Points(g,m);points.name='Starry night';points.frustumCulled=false;points.renderOrder=1;return points;
}
function makeMoon(){
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{light:{value:new T.Vector3()},visibility:{value:0},daylight:{value:0},shadow:{value:new T.Color('#101b2b')}},vertexShader:`varying vec2 disc;void main(){disc=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`
 varying vec2 disc;uniform vec3 light;uniform float visibility;uniform float daylight;uniform vec3 shadow;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){float r2=dot(disc,disc);if(r2>1.0)discard;vec3 normal=vec3(disc,sqrt(max(0.0,1.0-r2)));
 float incidence=dot(normal,light),lit=smoothstep(-.012,.022,incidence);
 float markings=.83+.12*noise(disc*6.0)+.05*noise(disc*24.0);
 vec3 colour=mix(shadow,vec3(.92,.93,.83)*markings*(.5+.5*max(0.0,incidence)),lit);
 gl_FragColor=vec4(colour,visibility*(1.0-smoothstep(.985,1.0,r2)));
 #include <colorspace_fragment>
 }`});
 // Slightly enlarged for legibility; phase, sky position and limb orientation
 // use the real ephemeris. Surface markings are procedural artwork.
 const moon=new T.Mesh(new T.PlaneGeometry(25,25),m);moon.name='Moon at the current phase';moon.renderOrder=2;return moon;
}
function makeSun(){
 const sun=new T.Mesh(new T.PlaneGeometry(38,38),new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms:{visibility:{value:0}},vertexShader:`varying vec2 disc;void main(){disc=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`varying vec2 disc;uniform float visibility;void main(){float r=length(disc);if(r>1.0)discard;float core=1.0-smoothstep(.32,.38,r);float halo=exp(-r*r*7.0)*.3;gl_FragColor=vec4(1.0,.88,.62,(core+halo)*(1.0-smoothstep(.8,1.0,r))*visibility);
 #include <colorspace_fragment>
 }`}));sun.name='Sun at the current time';sun.renderOrder=2;return sun;
}
const cellRandom=(x,z,n)=>{let v=Math.imul(x^n,374761393)^Math.imul(z+n,668265263);v=Math.imul(v^(v>>>13),1274126177);return ((v^(v>>>16))>>>0)/4294967296;};

// Only candidates inside the current camera view are emitted. Their flight
 // paths belong to fixed world cells, so a turn never drags insects with it.
export function firefliesInView(camera,seconds,{limit=80,placed=[]}={}){
 camera.updateMatrixWorld();
 const step=5,cx=Math.floor(camera.position.x/step),cz=Math.floor(camera.position.z/step),p=new T.Vector3(),candidates=[];
 for(let ix=cx-12;ix<=cx+12;ix++)for(let iz=cz-12;iz<=cz+12;iz++){
  const seed=cellRandom(ix,iz,17);if(seed<.28)continue;
  const phase=seed*Math.PI*2,t=seconds*.62;
  const x=(ix+.1+cellRandom(ix,iz,53)*.8)*step+Math.sin(t*.73+phase)*.7+Math.sin(t*1.63+phase*2)*.18;
  const z=(iz+.1+cellRandom(ix,iz,89)*.8)*step+Math.sin(t*.57+phase*3)*.65+Math.cos(t*1.17+phase)*.16;
  const distance=Math.hypot(x-camera.position.x,z-camera.position.z);if(distance<3||distance>58||groundIsOccupied(x,z,placed))continue;
  const y=terrainHeight(x,z)+2.05+cellRandom(ix,iz,131)*1.1+Math.sin(t*.91+phase)*.18;
  p.set(x,y,z).project(camera);if(p.z<=-1||p.z>=1||Math.abs(p.x)>.98||Math.abs(p.y)>.98)continue;
  // Fading at the view boundary softens arrivals while turning.
  const edge=(1-smoothRange(.82,.98,Math.abs(p.x)))*(1-smoothRange(.82,.98,Math.abs(p.y)));
  const glow=(.3+.7*Math.pow(.5+.5*Math.sin(seconds*.74+phase*3),2))*edge*(1-smoothRange(36,58,distance));
  candidates.push({id:`${ix}:${iz}`,x,y,z,glow,seed,distance});
 }
 return candidates.sort((a,b)=>a.distance-b.distance).slice(0,limit);
}
function makeFireflies(mobile){
 const count=mobile?40:80,g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));g.setAttribute('strength',new T.BufferAttribute(new Float32Array(count),1).setUsage(T.DynamicDrawUsage));g.setDrawRange(0,0);
 const m=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,uniforms:{brightness:{value:0},pixelRatio:{value:1}},vertexShader:`attribute float strength;uniform float brightness;uniform float pixelRatio;varying vec3 tint;varying float glow;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(100.0/max(4.0,-p.z),3.0,13.0)*pixelRatio;tint=vec3(.83,1.0,.37);glow=strength*brightness;}`,fragmentShader:pointFragment});
 const flies=new T.Points(g,m);flies.name='Fireflies above the grass in view';flies.frustumCulled=false;flies.renderOrder=3;return {flies,count};
}
export function createNightSky({mobile=false}={}){
 const root=new T.Group(),celestial=new T.Group(),stars=makeStars(mobile),moon=makeMoon(),sun=makeSun(),{flies,count}=makeFireflies(mobile);
 root.name='Time of day';celestial.add(stars,moon,sun);root.add(celestial,flies);
 const right=new T.Vector3(),up=new T.Vector3(),facing=new T.Vector3(),basis=new T.Matrix4();let lastAt=null,animationTime=null;
 function update(seconds,{camera,sky,motion=true,raining=false,editing=false,placed=[],environment='meadow',skyScale=1}={}){
  if(!sky)return;
  if(motion||animationTime===null)animationTime=seconds;
  celestial.position.copy(camera.position);
  celestial.scale.setScalar(skyScale);
  const ratio=Math.min(globalThis.devicePixelRatio||1,1.5),wet=raining?1:0;
  stars.visible=sky.night>.001&&!raining;stars.material.uniforms.brightness.value=sky.night*(1-.42*sky.moon.fraction*smoothRange(-1,25,sky.moon.altitude));stars.material.uniforms.time.value=animationTime;stars.material.uniforms.pixelRatio.value=ratio;
  if(lastAt!==sky.at){
   const r=sky.starRotation;
   // Astronomy's matrix is column-major; HOR = north, west, zenith.
   stars.matrix.set(-r[0][1],-r[1][1],-r[2][1],0,r[0][2],r[1][2],r[2][2],0,-r[0][0],-r[1][0],-r[2][0],0,0,0,0,1);stars.matrixAutoUpdate=false;
   moon.position.fromArray(sky.moon.direction).multiplyScalar(1100);right.fromArray(sky.moon.right);up.fromArray(sky.moon.up);facing.fromArray(sky.moon.direction).negate();basis.makeBasis(right,up,facing);moon.quaternion.setFromRotationMatrix(basis);
   moon.material.uniforms.light.value.fromArray(sky.moon.light);
   sun.position.fromArray(sky.sun.direction).multiplyScalar(1170);sun.quaternion.copy(camera.quaternion);lastAt=sky.at;
  }
  // The sun always faces the viewer, even when only the camera orientation changes.
  sun.lookAt(camera.position);
  moon.visible=sky.moon.altitude>-.6;moon.material.uniforms.visibility.value=smoothRange(-.6,.3,sky.moon.altitude)*(1-.62*sky.daylight)*(1-.98*wet);moon.material.uniforms.daylight.value=sky.daylight;
  moon.material.uniforms.shadow.value.set('#091222').lerp(new T.Color('#abcada'),sky.daylight);
  sun.visible=sky.sun.altitude>-.6;sun.material.uniforms.visibility.value=smoothRange(-.6,.2,sky.sun.altitude)*(1-.97*wet);
  flies.visible=sky.night>.001&&!editing&&environment==='meadow';
  if(flies.visible){
   const candidates=firefliesInView(camera,animationTime,{limit:count,placed});
   const positions=flies.geometry.attributes.position,strength=flies.geometry.attributes.strength;
   candidates.forEach((f,i)=>{positions.setXYZ(i,f.x,f.y,f.z);strength.setX(i,f.glow);});positions.needsUpdate=true;strength.needsUpdate=true;flies.geometry.setDrawRange(0,candidates.length);
   flies.material.uniforms.brightness.value=sky.night*(raining?.35:1);flies.material.uniforms.pixelRatio.value=ratio;
  }else flies.geometry.setDrawRange(0,0);
 }
 return {root,stars,moon,sun,fireflies:flies,update};
}
