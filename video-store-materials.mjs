import * as T from './vendor/three.module.js';

// One mesh per finish or artwork. Cases and architectural details share batches.
export const FINISH=Object.freeze({plain:0,carpet:1,ceiling:2,wood:3,glow:4,asphalt:5,glass:6,foliage:7,metal:8,sky:9,rain:10,paint:11});
const VERTEX=`
uniform float surface;uniform float time;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vTint;varying vec2 vUV;
void main(){
 vec3 p=position;
 if(surface>9.5&&surface<10.5){p.y=mod(normal.y-time*5.8,8.)+(uv.y-.5)*.24;p.z+=.11*(p.y-normal.y);}
 vUV=uv;vTint=color;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(p,1.)).xyz;
 gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;
const FRAGMENT=`
uniform sampler2D artwork;uniform float hasArtwork;uniform float surface;uniform float daylight;uniform float rain;uniform float time;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vTint;varying vec2 vUV;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return noise(p)*.55+noise(p*2.03)*.27+noise(p*4.1)*.13;}
float shadow(vec2 p,vec2 c,vec2 size){vec2 q=max(abs(p-c)-size,0.);return exp(-dot(q,q)*12.);}
void main(){
 vec3 n=normalize(vNormal),base=vTint;float alpha=1.;
 if(hasArtwork>.5){vec4 a=texture2D(artwork,vUV);if(a.a<.48)discard;base*=a.rgb;}
 if(surface>8.5&&surface<9.5){
  vec3 d=normalize(vWorld-vec3(0.,1.6,0.));float h=max(d.y,0.);
  vec3 clear=mix(vec3(.58,.76,.88),vec3(.065,.32,.66),pow(h,.48));
  float cloud=fbm(d.xz/max(.13,d.y)*1.9+vec2(8.7,21.));
  float cover=smoothstep(.46,.68,cloud)*smoothstep(.015,.18,h);
  clear=mix(clear,vec3(.91,.95,.96),cover*.82);
  clear=mix(clear,vec3(.36,.47,.56)+cover*.12,rain*.78);
  base=mix(vec3(.009,.018,.055)+h*.014,clear,daylight);
  float star=step(.9982,hash(floor(d.xz/max(.04,d.y)*620.)))*smoothstep(.1,.3,h)*(1.-daylight)*(1.-rain);
  base+=star*.65;
  gl_FragColor=vec4(base,1.);
 }else if(surface>9.5&&surface<10.5){
  alpha=rain*.34*sin(vUV.y*3.14159);gl_FragColor=vec4(mix(vec3(.13,.2,.3),vec3(.63,.77,.83),daylight),alpha);
 }else{
  bool outdoor=vWorld.x< -6.42||vWorld.z>8.92;
  float sun=max(dot(n,normalize(vec3(-.7,.92,.36))),0.);
  vec3 light=vec3(.46,.42,.36)+vec3(.46,.42,.34)*max(n.y,0.)+vec3(.22,.18,.13)*max(n.z,0.);
  float window=exp(-max(0.,vWorld.x+6.3)*.18)*daylight;
  light+=vec3(.21,.31,.42)*window*(.3+.7*max(-n.x,0.));
  light+=vec3(.17,.105,.057)*exp(-length(vWorld.xz-vec2(4.,4.4))*.22);
  light*=.8+.2*smoothstep(0.,1.4,vWorld.y);
  if(outdoor)light=mix(vec3(.035,.045,.075),vec3(.5,.59,.64)+sun*vec3(.46,.39,.29)*(1.-rain*.75),daylight);
  if(surface>.5&&surface<1.5){
   vec2 p=vWorld.xz;float grain=hash(floor(p*350.));base*=.80+.35*grain;
   float dash=step(.935,hash(floor(p*45.)))*step(.45,fract(p.x*45.));base+=vec3(.045,.023,.012)*dash;
   float shade=shadow(p,vec2(-2.45,3.95),vec2(1.36,.27));
   shade+=shadow(p,vec2(-2.9,-.1),vec2(1.65,.34))+shadow(p,vec2(1.15,-.1),vec2(1.6,.34));
   shade+=shadow(p,vec2(-2.9,-3.8),vec2(1.65,.34))+shadow(p,vec2(1.15,-3.8),vec2(1.6,.34));
   shade+=shadow(p,vec2(4.65,4.5),vec2(1.65,.6));light*=1.-.39*min(1.,shade);
   float bands=smoothstep(.14,.2,fract((p.y+p.x*.36+1.7)/2.85));
   float sunPatch=(1.-smoothstep(-5.7,1.2,p.x))*bands*daylight*(1.-rain*.88);light+=vec3(.3,.26,.15)*sunPatch;
  }
  if(surface>1.5&&surface<2.5){vec2 p=vWorld.xz/.61,tile=abs(fract(p+.5)-.5),aa=fwidth(p);float grid=min(smoothstep(0.,.006+aa.x,tile.x),smoothstep(0.,.006+aa.y,tile.y));base*=mix(.76,1.,grid);base*=.97+.04*hash(floor(vWorld.xz*210.));}
  if(surface>2.5&&surface<3.5){
   vec2 p=abs(n.y)>.7?vWorld.xz:vec2(vWorld.x+vWorld.z,vWorld.y);
   float grain=sin(p.x*63.+noise(p*vec2(2.,.4))*9.);base*=.77+.12*grain+.2*noise(p*vec2(70.,1.5));
   base+=vec3(.025,.013,.004)*pow(max(0.,grain),8.);
  }
  if(surface>4.5&&surface<5.5){
   float carShade=shadow(vWorld.xz,vec2(-12.1,-4.5),vec2(2.05,.80))+shadow(vWorld.xz,vec2(-12.2,1.1),vec2(2.05,.80))+shadow(vWorld.xz,vec2(-12.0,6.7),vec2(2.05,.80));light*=1.-.52*min(1.,carShade);
   base*=.78+.38*hash(floor(vWorld.xz*150.));base=mix(base,base*.53,rain);
   float puddle=smoothstep(.51,.68,fbm(vWorld.xz*.72))*rain;
   vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(0.,dot(n,eye)),4.);
   base=mix(base,vec3(.13,.23,.32)*daylight+vec3(.014,.022,.04),puddle*(.35+.5*fresnel));
  }
  if(surface>5.5&&surface<6.5){
   vec3 eye=normalize(cameraPosition-vWorld);float f=pow(1.-abs(dot(n,eye)),4.);
   float reflection=pow(max(0.,sin((vWorld.z+vWorld.y*.17)*2.21)),48.);
   float column=floor(vWorld.z*13.),seed=hash(vec2(column,17.));vec2 bead=vec2(fract(vWorld.z*13.)-.5,fract(vWorld.y*7.-time*(.09+seed*.12)+seed)-.5);float drops=(1.-smoothstep(.025,.10,length(bead*vec2(2.,.55))))*step(.55,seed);
   alpha=.025+f*.12+reflection*.016+rain*drops*.27;
   base=mix(vec3(.24,.42,.48),vec3(.76,.82,.82),rain*drops);light=vec3(1.);
  }
  if(surface>6.5&&surface<7.5){light*=.68+.32*hash(floor(vUV*75.));}
  if((surface>7.5&&surface<8.5)||surface>10.5){
   vec3 eye=normalize(cameraPosition-vWorld),halfway=normalize(eye+normalize(vec3(-.6,1.,.4)));
   float highlight=pow(max(0.,dot(n,halfway)),surface>10.5?70.:35.);
   light+=vec3(.38,.42,.44)*highlight*(outdoor?max(.12,daylight):.7);
   if(outdoor&&surface>10.5){float reflection=pow(1.-abs(dot(n,eye)),3.)*.22; base=mix(base,vec3(.21,.36,.45),reflection*daylight);}
  }
  if(surface>3.5&&surface<4.5)light=vec3(1.);
  // A little contact darkening at all wall/floor junctions.
  if(!outdoor&&surface<3.5){float edge=min(6.4-abs(vWorld.x),8.9-abs(vWorld.z));light*=.79+.21*smoothstep(0.,.42,max(vWorld.y,edge));}
  gl_FragColor=vec4(base*light,alpha);
 }
 #include <colorspace_fragment>
}`;

export function createStoreBuilder({onReady=()=>{},onError=()=>{}}={}){
 const root=new T.Group();root.name='After Hours Video';
 const batches=new Map(),textures=[],materials=[],sourceFiles=new Map();let disposed=false;
 let frameYaw=0;const offset=new T.Vector3(),matrix=new T.Matrix4(),rotation=new T.Quaternion(),unit=new T.Vector3(1,1,1);
 function material(key,{file=null,surface=0,transparent=false}={}){
  if(batches.has(key))return key;
  let texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
  if(file&&typeof document!=='undefined'&&typeof document.createElementNS==='function'){
   texture.dispose();texture=new T.TextureLoader().load(file,()=>{if(!disposed)onReady();},undefined,()=>{if(!disposed)onError('A store image could not load. Check that the complete assets/video-store folder was uploaded.');});
  }
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);if(file)sourceFiles.set(texture,file);
  const mat=new T.ShaderMaterial({uniforms:{artwork:{value:texture},hasArtwork:{value:file?1:0},surface:{value:surface},daylight:{value:1},rain:{value:0},time:{value:0}},vertexShader:VERTEX,fragmentShader:FRAGMENT,vertexColors:true,side:T.DoubleSide,transparent,depthWrite:!transparent});
  materials.push(mat);batches.set(key,{mat,positions:[],normals:[],uvs:[],colors:[],file,surface});return key;
 }
 for(const [key,surface] of Object.entries(FINISH))material(key,{surface,transparent:['glass','rain'].includes(key)});
 function add(geometry,key,x,y,z,color='#ffffff',yaw=0){
  const b=batches.get(key),tint=new T.Color(color);rotation.setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw+frameYaw);matrix.compose(new T.Vector3(x,y,z).applyAxisAngle(T.Object3D.DEFAULT_UP,frameYaw).add(offset),rotation,unit);
  const g=geometry.index?geometry.toNonIndexed():geometry.clone();g.applyMatrix4(matrix);
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){b.positions.push(p.getX(i),p.getY(i),p.getZ(i));b.normals.push(n?.getX(i)||0,n?.getY(i)||0,n?.getZ(i)||0);b.uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);b.colors.push(tint.r,tint.g,tint.b);}
  g.dispose();geometry.dispose();
 }
 function box(w,h,d,x,y,z,color,key='plain',yaw=0){add(new T.BoxGeometry(w,h,d),key,x,y,z,color,yaw);}
 function face(w,h,x,y,z,key,yaw=0,color='#ffffff',turn=false){const g=new T.PlaneGeometry(w,h);if(turn){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,v,1-u);}}add(g,key,x,y,z,color,yaw);}
 function cylinder(rt,rb,h,x,y,z,color,key='plain',segments=12){add(new T.CylinderGeometry(rt,rb,h,segments),key,x,y,z,color);}
 function ellipsoid(rx,ry,rz,x,y,z,color,key='plain',segments=10){const g=new T.SphereGeometry(1,segments,6);g.scale(rx,ry,rz);add(g,key,x,y,z,color);}
 function rounded(w,h,d,r,x,y,z,color,key='plain',yaw=0){
  // Bevelled extruded rectangular profile; small radius gives visible edge light.
  const s=new T.Shape(),a=-w/2,b=-h/2;s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const g=new T.ExtrudeGeometry(s,{depth:Math.max(.001,d-r),bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:r*.45,bevelThickness:r*.5,curveSegments:3});g.translate(0,0,-(d-r)/2);add(g,key,x,y,z,color,yaw);
 }
 function finish(data={}){
  for(const [key,b] of batches){if(!b.positions.length)continue;const geometry=new T.BufferGeometry();for(const [name,array,size] of [['position',b.positions,3],['normal',b.normals,3],['uv',b.uvs,2],['color',b.colors,3]])geometry.setAttribute(name,new T.Float32BufferAttribute(array,size));geometry.computeBoundingSphere();const mesh=new T.Mesh(geometry,b.mat);mesh.name='After Hours · '+key;mesh.userData.finish=b.surface;mesh.renderOrder=b.surface===FINISH.sky?-10:b.surface===FINISH.glass?2:b.surface===FINISH.rain?1:0;root.add(mesh);}
  root.userData={...data,sourceFiles,indoor:true,tvOccluders:root.children.filter(o=>!o.material.transparent&&o.userData.finish!==FINISH.sky)};
  materials[0].addEventListener('dispose',()=>{if(disposed)return;disposed=true;for(const texture of textures)texture.dispose();for(const m of materials)if(m!==materials[0])m.dispose();});
  return root;
 }
 return {root,batches,materials,offset,setFrameYaw:value=>{frameYaw=value;},material,add,box,face,cylinder,ellipsoid,rounded,finish};
}
