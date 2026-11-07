import * as T from './vendor/three.module.js';
import {SEA_LEVEL,SEA_TILT,STORM_WAVES,stormWavesGLSL} from './stormwatch-waves.mjs';
import {createStormFoam} from './stormwatch-particles.mjs';

const noiseGLSL=`
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+2.4)+.15*noise(p*4.11-7.);}
`;
const oceanVertex=`
uniform float t,meshFootprint;varying vec3 worldPoint,worldNormal;varying vec2 seaBase,gridUV;varying float compression,oldCompression;
${stormWavesGLSL}
void main(){
 // Remove individual wavelengths before they become smaller than the grid.
 // This prevents distant under-sampled crests forming a checkerboard.
 float footprint=-position.z*meshFootprint;
 vec3 p,n;stormSeaFiltered(position.xz,t,footprint,p,n,compression);seaBase=position.xz;gridUV=uv;
 worldPoint=(modelMatrix*vec4(p,1.)).xyz;worldNormal=normalize((modelMatrix*vec4(n,0.)).xyz);
 vec3 previous,unused;stormSeaFiltered(position.xz,t-.65,footprint,previous,unused,oldCompression);
 gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);
}
`;
const oceanFragment=`
uniform float t,flash,wire;uniform vec2 gridSize;
varying vec3 worldPoint,worldNormal;varying vec2 seaBase,gridUV;varying float compression,oldCompression;
${noiseGLSL}
vec3 stormReflection(vec3 ray){
 float clouds=fbm(ray.xz/max(.15,ray.y)*1.2+vec2(-t*.013,t*.003));
 float opening=pow(max(0.,dot(ray,normalize(vec3(-.48,.68,-.37)))),12.);
 return mix(vec3(.016,.032,.045),vec3(.17,.225,.25),smoothstep(.17,.77,clouds))*(.78+.22*max(ray.y,0.))+vec3(.12,.14,.15)*opening+flash*.028;
}
void main(){
 vec3 view=normalize(cameraPosition-worldPoint),n=normalize(worldNormal);
 float distanceToEye=length(cameraPosition-worldPoint);
 // Fine capillary normals ride on the displaced, metre-scale wave geometry.
 float fine=1.-smoothstep(450.,1400.,distanceToEye);
 vec2 rq=seaBase*vec2(.27,1.15)+vec2(t*.07,-t*.8);
 float rn=noise(rq);vec2 rip=vec2(noise(rq+vec2(.35,0))-rn,noise(rq+vec2(0,.35))-rn);
 n=normalize(n+vec3(rip.x,0.,rip.y)*.12*fine);
 float nv=max(.02,dot(n,view)),fresnel=.025+.975*pow(1.-nv,5.);
 vec3 reflected=stormReflection(reflect(-view,n));
 float facing=.35+.65*max(0.,dot(n,normalize(vec3(-.45,.72,.35))));
 vec3 body=vec3(.008,.035,.043)*facing;
 float crestLight=smoothstep(-18.3,-15.3,worldPoint.y*cos(${SEA_TILT.toFixed(9)})+worldPoint.z*sin(${SEA_TILT.toFixed(9)}));
 body+=vec3(.004,.012,.012)*crestLight;
 vec3 colour=mix(body,reflected,clamp(.22+fresnel*.80,0.,1.));
 float flecks=fbm(seaBase*vec2(.38,1.1)+vec2(t*.16,-t*.42));
 float patches=smoothstep(.28,.63,fbm(seaBase*vec2(.036,.085)+vec2(3.1,-t*.10)));
 float breaking=smoothstep(.13,.30,compression+.045*(flecks-.5));
 float lingering=smoothstep(.15,.32,oldCompression)*.58;
 float foam=max(breaking,lingering)*smoothstep(.19,.62,flecks)*patches;
 vec3 foamColour=vec3(.43,.55,.57)*(.78+.22*facing)+flash*.04;
 colour=mix(colour,foamColour,clamp(foam*.9,0.,.96));
 float fog=1.-exp(-pow(distanceToEye/3600.,1.25));
 colour=mix(colour,vec3(.043,.070,.095)+flash*.015,fog);
 colour=pow(max(colour,vec3(0.)),vec3(1./2.2));
 if(wire>.5){
  vec2 g=abs(fract(gridUV*gridSize-.5)-.5)/max(fwidth(gridUV*gridSize),vec2(.0001));
  float line=1.-smoothstep(.45,1.1,min(g.x,g.y));colour=mix(vec3(.04,.12,.17),vec3(.28,.90,.80),line);
 }
 gl_FragColor=vec4(colour,1.);
}
`;

export function seaPointForPixel(x,y,height=SEA_LEVEL){
 const hh=Math.tan(28*Math.PI/180),d=new T.Vector3((x/1672*2-1)*hh*1672/941,(1-y/941*2)*hh,-1);
 const depth=height/(d.y*Math.cos(SEA_TILT)+d.z*Math.sin(SEA_TILT));
 return d.multiplyScalar(depth);
}
export function createStormOcean(uniforms,{mobile=false}={}){
 const root=new T.Group();root.name='Modelled storm sea';
 const cols=mobile?128:192,rows=mobile?320:512,g=new T.PlaneGeometry(1,1,cols,rows),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const depth=40*Math.pow(250,uv.getY(i));p.setXYZ(i,(-.04+uv.getX(i)*1.12)*depth,SEA_LEVEL,-depth);
 }g.computeVertexNormals();
 const u={...uniforms,wire:{value:0},gridSize:{value:new T.Vector2(cols,rows)},meshFootprint:{value:Math.max(1.12/cols,Math.log(250)/rows)}};
 const water=new T.Mesh(g,new T.ShaderMaterial({uniforms:u,vertexShader:oceanVertex,fragmentShader:oceanFragment,toneMapped:false,side:T.DoubleSide}));
 water.name='ocean-wave-mesh';water.rotation.x=SEA_TILT;water.frustumCulled=false;water.renderOrder=0;root.add(water);
 const foam=createStormFoam(u,{mobile});root.add(foam);

 // Concrete wall and beacon have real thickness and share the sea's depth test.
 const axis=new T.Vector3(1,0,0),a=seaPointForPixel(1164,462,-14.5).applyAxisAngle(axis,-SEA_TILT),b=seaPointForPixel(1343,456,-14.5).applyAxisAngle(axis,-SEA_TILT);
 const along=b.clone().sub(a),centre=a.clone().add(b).multiplyScalar(.5);centre.y=-17.25;
 const bg=new T.BoxGeometry(along.length(),5.5,3.4);bg.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(1,0,0),along.clone().normalize()));bg.translate(...centre.toArray());bg.rotateX(SEA_TILT);
 const concrete=new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 worldPoint,worldNormal;void main(){worldPoint=(modelMatrix*vec4(position,1.)).xyz;worldNormal=normalize((modelMatrix*vec4(normal,0.)).xyz);gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}`,fragmentShader:`
 uniform float flash;varying vec3 worldPoint,worldNormal;
 ${noiseGLSL}
 void main(){float grain=fbm(worldPoint.xz*.8+worldPoint.y*vec2(.9,2.));float light=.62+.38*max(0.,dot(normalize(worldNormal),normalize(vec3(-.35,.75,.4))));vec3 c=mix(vec3(.19,.22,.22),vec3(.39,.40,.37),grain)*light+flash*.035;gl_FragColor=vec4(c,1.);}`,toneMapped:false});
 const breakwater=new T.Mesh(bg,concrete);breakwater.name='breakwater-solid';breakwater.renderOrder=1;breakwater.frustumCulled=false;root.add(breakwater);
 const beaconGeometry=new T.CylinderGeometry(.30,.42,1.9,10);beaconGeometry.translate(b.x,-13.55,b.z);beaconGeometry.rotateX(SEA_TILT);
 const beacon=new T.Mesh(beaconGeometry,concrete.clone());beacon.material.uniforms=uniforms;beacon.name='breakwater-beacon';beacon.renderOrder=1;root.add(beacon);

 const count=mobile?300:720,points=new T.BufferGeometry(),positions=[],seed=[],impacts=[],anchors=[];
 let rng=8723;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};
 for(const [x,y] of [[1343,476],[1048,506],[1502,565]]){
  const a=seaPointForPixel(x,y).applyAxisAngle(new T.Vector3(1,0,0),-SEA_TILT);anchors.push(a);
 }
 const w=STORM_WAVES[0],period=2*Math.PI/w.omega;
 for(let i=0;i<count;i++){
  const impact=i<count*.55?1:0;
  if(impact){const a=anchors[i%anchors.length];positions.push(a.x+(random()-.5)*4.,a.y,a.z+(random()-.5)*3.);}
  else{const depth=80*Math.pow(9,random());positions.push((.08+random())*depth,SEA_LEVEL,-depth);}
  seed.push(random(),random(),random()*period);impacts.push(impact);
 }
 points.setAttribute('position',new T.Float32BufferAttribute(positions,3));points.setAttribute('seed',new T.Float32BufferAttribute(seed,3));
 points.setAttribute('impact',new T.Float32BufferAttribute(impacts,1));
 const spray=new T.Points(points,new T.ShaderMaterial({uniforms,vertexShader:`
 attribute vec3 seed;attribute float impact;uniform float t,viewportHeight;varying float opacity;
 ${stormWavesGLSL}
 void main(){
  float age=mod(t-seed.z+${(period*100).toFixed(8)},${period.toFixed(8)});vec3 peak,n;float squeeze;
  stormSea(position.xz,t-age,peak,n,squeeze);
  float gust=.82+.28*sin((t-age)*.43+seed.z*.7);
  vec3 velocity=vec3((-3.0-seed.x*4.)*gust,mix(3.0+seed.y*4.,8.0+seed.y*6.,impact),(seed.x-.5)*4.);
  vec3 p=peak+velocity*age+vec3(0,-4.9*age*age,0.);
  float crest=smoothstep(.045,.18,squeeze)*smoothstep(${(SEA_LEVEL+.1).toFixed(2)},${(SEA_LEVEL+1.8).toFixed(2)},peak.y);
  opacity=smoothstep(0.,.08,age)*(1.-smoothstep(.85,2.1,age))*.63*crest;
  if(p.y<${SEA_LEVEL.toFixed(2)}-.3)opacity=0.;
  vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
  gl_PointSize=clamp(viewportHeight*(.25+seed.y*.75)/max(1.,-mv.z),1.,15.);
 }`,fragmentShader:`uniform float flash;varying float opacity;void main(){float r=length(gl_PointCoord-.5)*2.;float a=(1.-smoothstep(.12,1.,r))*opacity;if(a<.003)discard;gl_FragColor=vec4(vec3(.72,.81,.82)+flash*.09,a);}`,transparent:true,depthWrite:false,toneMapped:false}));
 spray.name='wave-impact-droplets';spray.rotation.x=SEA_TILT;spray.frustumCulled=false;spray.renderOrder=6;root.add(spray);
 return {root,water,breakwater,spray,foam};
}
