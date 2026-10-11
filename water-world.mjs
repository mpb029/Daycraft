import * as T from './vendor/three.module.js';
import {createSkyDome} from './meadow-terrain.mjs';
import {WATER_SURFACE_GLSL,tideAt} from './water-cycle.mjs';
import {WATER_MOON,WATER_NIGHT} from './water-lighting.mjs';

export const WATER_RADIUS=9000;
export const WATER_PALETTE={sky:'#9eafb8',horizon:'#dae1df',fog:'#dae1df',fogNear:3200,fogFar:7600};

export function makeWaterGeometry({mobile=false}={}){
 const rings=mobile?176:272,sectors=mobile?160:256,positions=[],indices=[];
 // Radial density is highest around the viewer and stretches towards the
 // horizon. Every distant ridge remains real geometry, from every heading.
 positions.push(0,0,0);
 for(let r=1;r<=rings;r++){
  const radius=6*(Math.pow(1+WATER_RADIUS/6,r/rings)-1);
  for(let s=0;s<=sectors;s++){const a=s/sectors*Math.PI*2;positions.push(Math.sin(a)*radius,0,Math.cos(a)*radius);}
 }
 for(let s=0;s<sectors;s++)indices.push(0,1+s,2+s);
 for(let r=1;r<rings;r++)for(let s=0;s<sectors;s++){
  const a=1+(r-1)*(sectors+1)+s,b=a+sectors+1;indices.push(a,b,a+1,a+1,b,b+1);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
}

export function createWaterPlanet({mobile=false}={}){
 const root=new T.Group();root.name='Water planet';
 const dome=createSkyDome('meadow',WATER_PALETTE);dome.scale.setScalar(5);dome.name='Water planet sky';root.add(dome);
 dome.material.uniforms.nightTop.value.set(WATER_NIGHT.top);dome.material.uniforms.nightHorizon.value.set(WATER_NIGHT.horizon);
 const uniforms={waterTime:{value:0},waveCentre:{value:tideAt(0).centre},waveStrength:{value:1},daylight:{value:1},rainMood:{value:0},skyTop:{value:new T.Color(WATER_PALETTE.sky)},skyHorizon:{value:new T.Color(WATER_PALETTE.horizon)},waterBody:{value:new T.Color('#264449')},sunDirection:{value:new T.Vector3(0,1,0)},moonDirection:{value:new T.Vector3(0,-1,0)},moonPower:{value:0}};
 const material=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:`
 ${WATER_SURFACE_GLSL}
 varying vec3 surfacePosition;varying vec2 surfaceSlope;varying float ridge;
 void main(){vec4 waterSample=waterSurface(position.xz);vec3 p=vec3(position.x,waterSample.x,position.z);surfacePosition=p;surfaceSlope=waterSample.yz;ridge=waterSample.w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}
 `,fragmentShader:`
 uniform float waterTime;uniform float daylight;uniform float rainMood;uniform vec3 skyTop;uniform vec3 skyHorizon;uniform vec3 waterBody;uniform vec3 sunDirection;uniform vec3 moonDirection;uniform float moonPower;
 varying vec3 surfacePosition;varying vec2 surfaceSlope;varying float ridge;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 vec3 reflectionSky(vec3 d){float h=max(d.y,0.0);vec3 sky=mix(skyHorizon,skyTop,smoothstep(0.0,.65,h));float n=noise(d.xz/max(d.y+.12,.06)*1.3);sky=mix(sky,mix(skyHorizon,vec3(.87,.91,.9),daylight),smoothstep(.59,.8,n)*daylight*.35);return sky;}
 void main(){
  vec3 eye=cameraPosition-surfacePosition;float distance=length(eye);vec3 view=normalize(eye);
  float detail=1.0/(1.0+distance*.024);vec2 p=surfacePosition.xz;
  vec2 fine=vec2(cos(p.x*2.7+p.y*1.8-waterTime*1.8),sin(p.x*1.3-p.y*3.1+waterTime*2.1))*.036*detail;
  fine+=vec2(cos(p.x*7.2+p.y*4.3-waterTime*3.0),sin(p.y*6.2-p.x*3.8+waterTime*3.6))*.018*detail*rainMood;
  vec3 normal=normalize(vec3(-surfaceSlope.x-fine.x,1.0,-surfaceSlope.y-fine.y));
  float facing=max(dot(normal,view),0.0),fresnel=.035+.965*pow(1.0-facing,5.0);
  vec3 reflected=reflect(-view,normal),reflection=reflectionSky(reflected);reflection*=mix(.23,1.0,smoothstep(-.25,.08,reflected.y));
  vec3 body=waterBody*(.65+.35*max(dot(normal,sunDirection),0.0));
  vec3 colour=mix(body,reflection,.18+.82*fresnel);
  // Diffuse moonlight, a broad reflection and light through the wave's crest
  // keep its face readable; specular glints alone left moonless dates black.
  float moonDiffuse=max(dot(normal,moonDirection),0.0);
  float moonThrough=pow(max(dot(normal,-moonDirection),0.0),2.0)*smoothstep(.12,.92,ridge);
  colour+=vec3(.025,.047,.074)*moonPower*(.24+.76*moonDiffuse+moonThrough*.6);
  float sunGlint=pow(max(dot(reflect(-sunDirection,normal),view),0.0),130.0)*daylight*smoothstep(-.02,.1,sunDirection.y);
  float moonGlint=pow(max(dot(reflect(-moonDirection,normal),view),0.0),110.0)*moonPower;
  float moonSheen=pow(max(dot(reflect(-moonDirection,normal),view),0.0),24.0)*moonPower;
  colour+=vec3(1.0,.92,.75)*sunGlint*.8*(1.0-rainMood*.87)+vec3(.53,.67,.88)*(moonGlint*.9+moonSheen*.13)*(1.0-rainMood*.55);
  float foam=smoothstep(.94,.992,ridge)*(.4+.6*noise(vec2(p.x*.042+waterTime*.08,p.y*.072-waterTime*.12)));
  vec3 foamColour=mix(vec3(.22,.32,.43),vec3(.72,.8,.8),daylight);colour=mix(colour,foamColour,foam*.78);
  float haze=smoothstep(mix(3200.0,1500.0,rainMood),mix(7600.0,4600.0,rainMood),distance);colour=mix(colour,skyHorizon,haze);
  gl_FragColor=vec4(colour,1.0);
  #include <colorspace_fragment>
 }
 `});
 const water=new T.Mesh(makeWaterGeometry({mobile}),material);water.name='Continuous water and travelling tidal wave';water.frustumCulled=false;root.add(water);
 let lastSky=null,raining=false;
 function recolour(){if(!lastSky)return;const d=lastSky.daylight;
  uniforms.skyTop.value.set(WATER_NIGHT.top).lerp(new T.Color(raining?'#6f8790':WATER_PALETTE.sky),d);
  uniforms.skyHorizon.value.set(WATER_NIGHT.horizon).lerp(new T.Color(raining?'#b3c5c9':WATER_PALETTE.horizon),d);
  uniforms.waterBody.value.set(WATER_NIGHT.body).lerp(new T.Color(raining?'#293e46':'#264449'),d);
 }
 return {root,dome,water,palette:WATER_PALETTE,
  setRain(value){raining=!!value;uniforms.rainMood.value=raining?1:0;dome.material.uniforms.rainMood.value=raining?1:0;recolour();},
  setSky(info){lastSky=info;const u=dome.material.uniforms;u.daylight.value=info.daylight;u.dusk.value=Math.max(0,1-Math.abs(info.sun.geometricAltitude+1)/9);u.sunDirection.value.fromArray(info.sun.direction);uniforms.daylight.value=info.daylight;uniforms.sunDirection.value.fromArray(info.sun.direction);uniforms.moonDirection.value.fromArray(WATER_MOON.direction);uniforms.moonPower.value=WATER_MOON.fraction*(1-info.daylight);recolour();},
  update(seconds,tide){uniforms.waterTime.value=seconds;uniforms.waveCentre.value=tide.centre;uniforms.waveStrength.value=tide.strength;}
 };
}
