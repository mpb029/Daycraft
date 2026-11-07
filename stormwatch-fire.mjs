import * as T from './vendor/three.module.js';

export const FIRE_LOGS=Object.freeze([
 {a:[-2.56,-.51,-3.14],b:[-2.22,-.43,-3.30],radius:.046},
 {a:[-2.40,-.53,-3.29],b:[-2.14,-.51,-3.13],radius:.048},
 {a:[-2.57,-.54,-3.30],b:[-2.15,-.55,-3.31],radius:.055}
]);
const noise3D=`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
`;
const logSDF=`
float capsule(vec3 p,vec3 a,vec3 b,float r){vec3 ab=b-a;return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.))-r;}
float logs(vec3 p){return min(${FIRE_LOGS.map(l=>`capsule(p,vec3(${l.a.map(x=>x.toFixed(6)).join(',')}),vec3(${l.b.map(x=>x.toFixed(6)).join(',')}),${l.radius.toFixed(6)})`).reduce((a,b)=>`min(${a},${b})`)},100.);}
`;
const solidVertex=`
varying vec3 worldPoint,worldNormal;
void main(){worldPoint=(modelMatrix*vec4(position,1.)).xyz;worldNormal=normalize((modelMatrix*vec4(normal,0.)).xyz);gl_Position=projectionMatrix*viewMatrix*vec4(worldPoint,1.);}
`;
const solidFragment=`
uniform float t,coal;varying vec3 worldPoint,worldNormal;
${noise3D}
void main(){
 vec3 p=worldPoint,n=normalize(worldNormal);float grain=noise3(p*vec3(8.,96.,66.));
 float fractures=pow(1.-abs(sin(p.x*48.+noise3(p*28.)*4.)),10.);
 float pulse=.76+.24*sin(t*1.7+noise3(p*17.)*6.);
 float glow=fractures*(.18+.82*coal)*pulse;
 vec3 charred=mix(vec3(.018,.011,.008),vec3(.13,.065,.025),grain);
 float firelight=.28+.7*max(0.,dot(n,normalize(vec3(-.1,1.,.3))));
 vec3 colour=charred*firelight+vec3(1.,.18,.013)*glow;
 if(coal>.5)colour+=vec3(.26,.032,.003)*noise3(p*31.)*pulse;
 gl_FragColor=vec4(colour,1.);
}
`;
function merge(parts){
 const g=new T.BufferGeometry(),p=[],n=[],indices=[];let offset=0;
 for(const part of parts){p.push(...part.attributes.position.array);n.push(...part.attributes.normal.array);for(const id of part.index?.array||Array.from({length:part.attributes.position.count},(_,i)=>i))indices.push(offset+id);offset+=part.attributes.position.count;part.dispose();}
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('normal',new T.Float32BufferAttribute(n,3));g.setIndex(indices);return g;
}
export function createStormFire(uniforms,{mobile=false,projectPanel}={}){
 const root=new T.Group();root.name='Modelled stove and volumetric fire';
 const back=new T.Mesh(projectPanel([110,495,262,638],3.65),new T.ShaderMaterial({uniforms,vertexShader:`void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float t;void main(){float glow=.014+.004*sin(t*3.4);gl_FragColor=vec4(glow,glow*.32,glow*.12,1.);}`,toneMapped:false,side:T.DoubleSide}));back.name='stove-firebox';back.renderOrder=2;root.add(back);
 const parts=FIRE_LOGS.map(l=>{
  const a=new T.Vector3(...l.a),b=new T.Vector3(...l.b),d=b.clone().sub(a);
  const g=new T.CapsuleGeometry(l.radius,d.length(),5,14);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());return g;
 });
 const logs=new T.Mesh(merge(parts),new T.ShaderMaterial({uniforms:{...uniforms,coal:{value:0}},vertexShader:solidVertex,fragmentShader:solidFragment,toneMapped:false}));logs.name='charred-wood-geometry';logs.renderOrder=3;root.add(logs);
 const embers=[];let state=116;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 for(let i=0;i<32;i++){
  const g=new T.IcosahedronGeometry(.022+random()*.018,1);g.scale(1,.5,.8);g.translate(-2.57+random()*.42,-.571+random()*.014,-3.34+random()*.23);embers.push(g);
 }
 const coals=new T.Mesh(merge(embers),new T.ShaderMaterial({uniforms:{...uniforms,coal:{value:1}},vertexShader:solidVertex,fragmentShader:solidFragment,toneMapped:false}));coals.name='glowing-ember-bed';coals.renderOrder=3;root.add(coals);
 const steps=mobile?28:44;
 const flame=new T.Mesh(projectPanel([110,493,263,637],2.96),new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 rayPoint;void main(){rayPoint=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(rayPoint,1.);}`,fragmentShader:`
 uniform float t;varying vec3 rayPoint;
 ${noise3D}
 ${logSDF}
 vec2 intersectBox(vec3 ro,vec3 rd){
  vec3 a=(vec3(-2.76,-.60,-3.48)-ro)/rd,b=(vec3(-2.04,-.08,-3.01)-ro)/rd;
  vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));
 }
 float density(vec3 p){
  float h=(p.y+.48)/.38;if(h<0.||h>1.)return 0.;
  float envelope=0.;
  for(int j=0;j<5;j++){
   float id=float(j),reach=.68+.19*sin(t*1.13+id*2.7)+.08*sin(t*2.39+id*4.1);
   vec2 centre=vec2(-2.52+.074*id,-3.21+.035*sin(id*2.1));
   centre+=vec2(.026*sin(h*18.-t*4.8+id)+.012*sin(h*39.+t*3.2),.020*sin(h*17.+t*3.1+id*2.))*h;
   vec2 q=p.xz-centre;float breadth=.036*(1.-h*.82),depth=.044*(1.-h*.75);
   envelope=max(envelope,exp(-pow(q.x/breadth,2.)-pow(q.y/depth,2.))*(1.-smoothstep(reach-.14,reach,h)));
  }
  if(envelope<.018)return 0.;
  vec3 advected=vec3(p.x*65.,p.y*31.-t*7.2,p.z*69.);
  float turbulence=.68*noise3(advected)+.32*noise3(advected*2.03+vec3(2.,-t*.8,1.));
  float tongues=smoothstep(.27,.61,turbulence);
  return envelope*tongues*smoothstep(0.,.07,h)*(1.-smoothstep(.80,1.,h));
 }
 void main(){
  vec3 ro=cameraPosition,rd=normalize(rayPoint-ro);vec2 hit=intersectBox(ro,rd);if(hit.y<=max(0.,hit.x))discard;
  float start=max(0.,hit.x),stepLength=(hit.y-start)/${steps.toFixed(1)},transmittance=1.;vec3 light=vec3(0.);
  for(int i=0;i<${steps};i++){
   vec3 p=ro+rd*(start+(float(i)+.5)*stepLength);if(logs(p)<-.002)break;
   float fuel=density(p);if(fuel>.002){
    float heat=clamp(.15+fuel*.95+(1.-(p.y+.48)/.42)*.35,0.,1.);
    vec3 radiance=mix(vec3(1.,.055,.001),vec3(1.,.82,.44),pow(heat,2.2));
    float a=1.-exp(-fuel*72.*stepLength);light+=transmittance*a*radiance*1.06;transmittance*=1.-a;
   }
  }
  float alpha=1.-transmittance;if(alpha<.004)discard;
  gl_FragColor=vec4(clamp(light/max(.001,alpha),0.,1.),alpha);
 }
 `,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide}));
 flame.name='raymarched-flame-volume';flame.renderOrder=5;flame.frustumCulled=false;root.add(flame);
 return {root,logs,coals,flame,back};
}
