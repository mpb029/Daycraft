import * as T from './vendor/three.module.js';

export const CINEMA_FINISH={plain:0,tile:1,mosaic:2,vinyl:3,wood:4,chrome:5,glass:6,glow:7,ceiling:8,art:9,foliage:10,brass:11,fibreglass:12};
const vertex=`varying vec3 vP;varying vec3 vN;varying vec3 vC;varying vec2 vUV;void main(){vP=(modelMatrix*vec4(position,1.)).xyz;vN=normalize(mat3(modelMatrix)*normal);vC=color;vUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
uniform float finish;uniform float hasMap;uniform sampler2D artwork;uniform sampler2D reflectionMap;uniform mat4 reflectionMatrix;uniform float reflectionReady;
varying vec3 vP;varying vec3 vN;varying vec3 vC;varying vec2 vUV;
const float PI=3.14159265;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
vec3 environment(vec3 d){
 vec3 c=mix(vec3(.015,.019,.024),vec3(.24,.24,.22),smoothstep(-.2,.45,d.y));
 float bands=pow(max(0.,cos(d.z*17.+d.x*2.)),28.);
 c+=vec3(3.8,3.65,3.3)*bands*smoothstep(.15,.5,d.y);
 c+=vec3(1.3,.65,.23)*pow(abs(d.x),12.)*(.25+.75*pow(max(0.,cos(d.z*24.)),25.));
 c*=.4+.6*smoothstep(-.3,.05,d.y);return c;
}
vec3 lightBRDF(vec3 N,vec3 V,vec3 L,vec3 albedo,float rough,float metal,vec3 flux){
 vec3 H=normalize(V+L);float nl=max(dot(N,L),0.),nv=max(dot(N,V),.025),nh=max(dot(N,H),0.),vh=max(dot(V,H),0.);
 float a=rough*rough,a2=a*a,d=nh*nh*(a2-1.)+1.;float D=a2/(PI*d*d+.0001);
 float k=(rough+1.)*(rough+1.)/8.,G=nv/(nv*(1.-k)+k)*nl/(nl*(1.-k)+k);
 vec3 F=mix(vec3(.04),albedo,metal);F+=(1.-F)*pow(1.-vh,5.);
 return ((1.-F)*(1.-metal)*albedo/PI+F*D*G/(4.*nv*max(nl,.025)))*flux*nl;
}
void main(){
 vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;vec3 V=normalize(cameraPosition-vP),base=vC;float alpha=1.,rough=.65,metal=0.;
 if(hasMap>.5){vec4 tex=texture2D(artwork,vUV);if(tex.a<.40)discard;base*=tex.rgb;}
 vec2 p=abs(N.y)>.6?vP.xz:abs(N.x)>.6?vP.zy:vP.xy;
 float grain=hash(floor(p*420.));
 if(finish<.5){base*=.976+.033*noise(p*38.);}
 if(finish>.5&&finish<1.5){
  vec2 tile=vP.xz/.61,g=abs(fract(tile+.5)-.5),aa=fwidth(tile);float grout=1.-min(smoothstep(.002,.009+aa.x,g.x),smoothstep(.002,.009+aa.y,g.y));
  base*=.93+.11*hash(floor(tile+.5));base*=.97+.045*noise(p*46.);base=mix(base,vec3(.085,.078,.071),grout*.85);rough=.24+grout*.4;
  N=normalize(N+vec3((noise(p*37.)-.5)*.009,0.,(noise(p*41.+12.)-.5)*.009));
 }
 if(finish>1.5&&finish<2.5){
  vec2 tile=p/.027,g=abs(fract(tile+.5)-.5);float grout=1.-min(smoothstep(.00,.075+fwidth(tile.x),g.x),smoothstep(.00,.075+fwidth(tile.y),g.y));
  float h=hash(floor(tile+.5)),vein=pow(1.-abs(sin(p.x*11.+p.y*8.+noise(p*7.)*3.)),19.);
  base=mix(vec3(.006,.010,.020),vec3(.052,.045,.039),h*.68+vein*.45);base+=vec3(.12,.081,.032)*step(.96,h);base=mix(base,vec3(.018,.017,.017),grout*.4);rough=.24;
 }
 if(finish>2.5&&finish<3.5){base*=.96+.06*grain;rough=.28+.09*grain;}
 if(finish>3.5&&finish<4.5){base*=.98+.025*noise(p*vec2(1.,60.));rough=.34;}
 if(finish>4.5&&finish<5.5){rough=.14;metal=.96;}
 if(finish>7.5&&finish<8.5){vec2 q=vP.xz/vec2(.61,1.22),g=abs(fract(q+.5)-.5);float grid=1.-min(smoothstep(0.,.005+fwidth(q.x),g.x),smoothstep(0.,.005+fwidth(q.y),g.y));base*=mix(1.,.62,grid);base*=.95+.08*grain;rough=.9;}
 if(finish>10.5&&finish<11.5){rough=.24;metal=.75;}
 if(finish>11.5){rough=.25+.025*grain;base*=.986+.018*noise(p*125.);}
 if(finish>12.5&&finish<13.5){vec2 holes=vUV*vec2(100.,29.);if(length(fract(holes)-.5)<.21)discard;rough=.34;}
 if(finish>9.5&&finish<10.5){rough=.43;base*=.94+.07*grain;}
 vec3 col=base*vec3(.25,.24,.205)*(metal>.5?.15:1.)*(.65+.35*max(N.y,0.));
 // Broad fluorescent fixtures, sampled in a repeating line down the aisle.
 float nearZ=round((vP.z+1.)/3.15)*3.15-1.;
 for(int i=-2;i<=2;i++){
  vec3 pos=vec3(0.,3.5,nearZ+float(i)*3.15),delta=pos-vP;float r2=dot(delta,delta);
  col+=lightBRDF(N,V,normalize(delta),base,max(.22,rough),metal,vec3(6.4,6.2,5.65)/(1.+r2*.44));
 }
 // Warm wall sconces supplement the neutral ceiling fixtures.
 for(int side=-1;side<=1;side+=2){
  float z=round((vP.z+.3)/3.1)*3.1-.3;vec3 d=vec3(float(side)*3.2,2.8,z)-vP;
  col+=lightBRDF(N,V,normalize(d),base,max(.23,rough),metal,vec3(1.65,1.36,.89)/(1.+dot(d,d)*.65));
 }
 float nv=max(dot(N,V),0.);vec3 F=mix(vec3(.04),base,metal);F+=(1.-F)*pow(1.-nv,5.);
 col+=environment(reflect(-V,N))*F*(.22+.7*metal)*(1.-rough*.5);
 // Soft contact occlusion under booths, table bases and at wall junctions.
 if(finish<2.){
  float edge=min(4.-abs(vP.x),abs(vP.z+16.));col*=.70+.30*smoothstep(.0,.55,max(vP.y,edge));
  if(vP.y<.04){float booth=smoothstep(1.03,1.45,abs(vP.x));col*=1.-booth*.41;}
 }
 if(finish>.5&&finish<1.5&&reflectionReady>.5){
  vec4 q=reflectionMatrix*vec4(vP,1.);vec2 uv=q.xy/q.w*.5+.5;
  vec3 ref=texture2D(reflectionMap,uv).rgb*.20;
  ref+=(texture2D(reflectionMap,uv+vec2(.004,0.)).rgb+texture2D(reflectionMap,uv-vec2(.004,0.)).rgb+texture2D(reflectionMap,uv+vec2(0.,.007)).rgb+texture2D(reflectionMap,uv-vec2(0.,.007)).rgb)*.12;
  ref+=(texture2D(reflectionMap,uv+vec2(.006,.009)).rgb+texture2D(reflectionMap,uv-vec2(.006,.009)).rgb+texture2D(reflectionMap,uv+vec2(-.006,.009)).rgb+texture2D(reflectionMap,uv-vec2(-.006,.009)).rgb)*.08;
  float weight=.12+.28*pow(1.-nv,3.);col=mix(col,ref,weight);
 }
 if(finish>5.5&&finish<6.5){float f=pow(1.-abs(dot(N,V)),4.);col=environment(reflect(-V,N))*.72;alpha=.025+f*.19;}
 if(finish>6.5&&finish<7.5)col=base*1.2;
 if(finish>8.5&&finish<9.5)col=base*.85;
 if(finish>9.5&&finish<10.5)col*=.68+.32*abs(N.y);
 gl_FragColor=vec4(col,alpha);
 #include <colorspace_fragment>
}`;

export function createCinemaBuilder({onReady=()=>{},onError=()=>{}}={}){
 const root=new T.Group();root.name='90s Macca’s';const batches=new Map(),textures=new Map(),sourceFiles=new Map(),materials=[];let disposed=false;
 const frame=new T.Matrix4();
 const reflection={reflectionMap:{value:null},reflectionMatrix:{value:new T.Matrix4()},reflectionReady:{value:0}};
 function material(key,{file=null,finish=0,transparent=false}={}){
  if(batches.has(key))return key;
  let texture=null;
  if(file){texture=textures.get(file);if(!texture){texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
   if(typeof globalThis.document?.createElementNS==='function'){texture.dispose();texture=new T.TextureLoader().load(file,()=>{if(!disposed)onReady();},undefined,()=>{if(!disposed)onError('A restaurant image could not load. Upload the complete assets/cinema folder.');});}
   texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.set(file,texture);sourceFiles.set(texture,file);}}
  const mat=new T.ShaderMaterial({uniforms:{finish:{value:finish},hasMap:{value:file?1:0},artwork:{value:texture},...reflection},vertexShader:vertex,fragmentShader:fragment,vertexColors:true,side:T.DoubleSide,transparent,depthWrite:!transparent});
  materials.push(mat);batches.set(key,{material:mat,p:[],n:[],uv:[],c:[],indices:[],finish});return key;
 }
 for(const [key,finish] of Object.entries(CINEMA_FINISH))material(key,{finish,transparent:key==='glass'});
 function add(geometry,key='plain',x=0,y=0,z=0,color='#fff',rotation=null){
  const b=batches.get(key),offset=b.p.length/3,g=geometry.clone(),local=new T.Matrix4().compose(new T.Vector3(x,y,z),rotation?new T.Quaternion().setFromEuler(new T.Euler(...rotation)):new T.Quaternion(),new T.Vector3(1,1,1));
  g.applyMatrix4(new T.Matrix4().multiplyMatrices(frame,local));const tint=new T.Color(color),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,paint=g.attributes.color;
  for(let i=0;i<p.count;i++){b.p.push(p.getX(i),p.getY(i),p.getZ(i));b.n.push(n?.getX(i)||0,n?.getY(i)||0,n?.getZ(i)||0);b.uv.push(uv?.getX(i)||0,uv?.getY(i)||0);b.c.push(tint.r*(paint?paint.getX(i):1),tint.g*(paint?paint.getY(i):1),tint.b*(paint?paint.getZ(i):1));}
  for(let i=0;i<(g.index?.count||p.count);i++)b.indices.push(offset+(g.index?g.index.getX(i):i));
  g.dispose();geometry.dispose();
 }
 function box(w,h,d,x,y,z,color,key='plain'){add(new T.BoxGeometry(w,h,d),key,x,y,z,color);}
 function rounded(w,h,d,r,x,y,z,color,key='plain'){
  r=Math.min(r,w*.49,h*.49,d*.49);const dimensions=[w,h,d],positions=[],normals=[],uvs=[],indices=[];
  const sample=(size)=>[-size/2,-size/2+r*.5,-size/2+r,0,size/2-r,size/2-r*.5,size/2];
  for(let axis=0;axis<3;axis++)for(const side of [-1,1]){
   const u=(axis+1)%3,v=(axis+2)%3,U=sample(dimensions[u]),V=sample(dimensions[v]);
   const offset=positions.length/3;
   for(let i=0;i<7;i++)for(let j=0;j<7;j++){
    const p=[0,0,0];p[axis]=side*dimensions[axis]/2;p[u]=U[i];p[v]=V[j];
    const core=p.map((q,k)=>Math.max(-dimensions[k]/2+r,Math.min(dimensions[k]/2-r,q))),n=new T.Vector3(...p.map((q,k)=>q-core[k])).normalize();
    positions.push(...core.map((q,k)=>q+n.getComponent(k)*r));normals.push(...n.toArray());uvs.push(i/6,j/6);
   }
   for(let i=0;i<6;i++)for(let j=0;j<6;j++){const a=offset+i*7+j;if(side===1)indices.push(a,a+7,a+8,a,a+8,a+1);else indices.push(a,a+8,a+7,a,a+1,a+8);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);add(g,key,x,y,z,color);
 }
 function face(w,h,x,y,z,key='plain',color='#fff',yaw=0,cell=null){
  const g=new T.PlaneGeometry(w,h);if(cell){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(cell[0]+.008+uv.getX(i)*.984)/3,(1-cell[1]+.008+uv.getY(i)*.984)/2);}
  add(g,key,x,y,z,color,[0,yaw,0]);
 }
 function tube(points,r,color,key='chrome',segments=32){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));add(new T.TubeGeometry(curve,segments,r,12,false),key,0,0,0,color);}
 function sphere(rx,ry,rz,x,y,z,color,key='plain'){const g=new T.SphereGeometry(1,24,16);g.scale(rx,ry,rz);add(g,key,x,y,z,color);}
 function cylinder(r1,r2,h,x,y,z,color,key='plain',segments=24){add(new T.CylinderGeometry(r1,r2,h,segments),key,x,y,z,color);}
 function at(x,y,z,yaw,fn,scale=1){const previous=frame.clone();frame.multiply(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw),new T.Vector3(scale,scale,scale)));try{fn();}finally{frame.copy(previous);}}
 function finish(data={}){
  for(const [key,b] of batches){if(!b.p.length)continue;const g=new T.BufferGeometry();for(const [name,a,size] of [['position',b.p,3],['normal',b.n,3],['uv',b.uv,2],['color',b.c,3]])g.setAttribute(name,new T.Float32BufferAttribute(a,size));g.setIndex(b.indices);g.computeBoundingSphere();const m=new T.Mesh(g,b.material);m.name=key;m.userData.finish=b.finish;m.renderOrder=b.finish===6?3:0;root.add(m);}
  root.userData={...data,sourceFiles,indoor:true};
  materials[0].addEventListener('dispose',()=>{if(disposed)return;disposed=true;for(const t of textures.values())t.dispose();for(const m of materials)if(m!==materials[0])m.dispose();});
  return root;
 }
 return {root,batches,materials,reflection,sourceFiles,material,add,box,rounded,face,tube,sphere,cylinder,at,finish};
}
