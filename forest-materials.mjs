import * as T from './vendor/three.module.js';
import {FOREST_LAMP} from './forest-geometry.mjs';

// All detail stays local to the forest. Colour textures are decoded to linear
// light; derivatives add surface relief without another texture or mesh pass.
const common=`
 uniform float forestTime;uniform float daylight;uniform float wetness;uniform float lampOn;uniform float breeze;uniform vec3 lampPosition;uniform vec3 forestFog;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.58+noise(p*2.03)*.28+noise(p*4.13)*.14;}
 vec3 relief(vec3 p,vec3 n,float height){vec3 dx=dFdx(p),dy=dFdy(p),r1=cross(dy,n),r2=cross(n,dx);float det=dot(dx,r1);if(abs(det)<1e-10)return n;vec3 gradient=sign(det)*(dFdx(height)*r1+dFdy(height)*r2);return normalize(abs(det)*n-gradient);}
 float lampPower(vec3 p){vec3 d=p-lampPosition;return lampOn*24.0/(1.0+dot(d,d))*smoothstep(-.12,.72,-normalize(d).y);}
 vec3 illumination(vec3 p,vec3 n){
  vec3 l=normalize(lampPosition-p);float point=lampPower(p),diffuse=max(dot(n,l),0.0);
  vec3 ambient=mix(vec3(.065,.11,.175),vec3(.44,.51,.46),daylight);float sky=.48+.52*max(n.y*.5+.5,0.0);
  vec3 sun=vec3(.29,.31,.24)*max(dot(n,normalize(vec3(-.5,1.0,.3))),0.0)*daylight;
  return ambient*sky+sun+vec3(1.0,.61,.19)*point*(.055+.945*diffuse);
 }
 vec3 fogged(vec3 colour,vec3 p){float d=distance(cameraPosition,p),low=exp(-max(p.y,0.0)*.38);float haze=1.0-exp(-d*.0105-d*d*.000082*(.30+.70*low));return mix(colour,forestFog,clamp(haze,0.0,1.0));}
`;
const worldVertex=`varying vec3 worldP;varying vec2 tex;void main(){tex=uv;worldP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
export function createForestMaterials(signTexture,foliageTexture,barkTexture){
 const uniforms={forestTime:{value:0},daylight:{value:0},wetness:{value:1},lampOn:{value:1},breeze:{value:1},lampPosition:{value:new T.Vector3(...FOREST_LAMP)},forestFog:{value:new T.Color('#233b55')},signMap:{value:signTexture},foliageMap:{value:foliageTexture},barkMap:{value:barkTexture},reflectionMap:{value:null},reflectionMatrix:{value:new T.Matrix4()},reflectionReady:{value:0}};
 const solid=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:`
 attribute vec3 tint;attribute float surfaceKind;uniform float forestTime;uniform float breeze;
 varying vec3 worldP;varying vec3 worldN;varying vec3 baseTint;varying vec2 tex;varying float kind;
 void main(){vec3 p=position;if((surfaceKind>.5&&surfaceKind<1.5)||surfaceKind>6.5){float sway=sin(forestTime*.7+p.x*.3+p.z*.13)*.015*breeze*uv.y;p.x+=sway;p.z+=sway*.5;}
 worldP=(modelMatrix*vec4(p,1.0)).xyz;worldN=normalize(mat3(modelMatrix)*normal);baseTint=tint;tex=uv;kind=surfaceKind;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}
 `,fragmentShader:`
 ${common}
 uniform sampler2D signMap;uniform sampler2D foliageMap;uniform sampler2D barkMap;varying vec3 worldP;varying vec3 worldN;varying vec3 baseTint;varying vec2 tex;varying float kind;
 void main(){vec3 n=normalize(worldN);if(!gl_FrontFacing)n=-n;vec3 albedo=baseTint;float height=0.0;
  if(kind<.5){
   vec3 bark=texture2D(barkMap,vec2(tex.x*.75,tex.y*.105)).rgb;
   albedo=mix(baseTint*.45,bark*.72,.9);height=dot(bark,vec3(.299,.587,.114))*.045;
   float moss=smoothstep(.45,.73,fbm(worldP.xz*.8+worldP.y*.04))*(1.0-smoothstep(.5,5.0,worldP.y));albedo=mix(albedo,vec3(.033,.055,.019),moss*.65);
  }else if(kind<1.5){
   float vein=1.0-smoothstep(.012,.035,abs(tex.x-.5));float ribs=pow(.5+.5*cos((tex.y+abs(tex.x-.5)*.6)*54.0),15.0);albedo*=.65+.35*sin(tex.y*3.14159);albedo+=vec3(.018,.023,.007)*(vein+ribs*.27);
  }else if(kind<2.5){float grain=fbm(worldP.xz*13.0+worldP.y);albedo*=.55+.60*grain;height=grain*.035;}
  else if(kind>4.5&&kind<5.5){albedo=texture2D(signMap,tex).rgb;}
  else if(kind>5.5&&kind<6.5){float border=step(.07,tex.x)*step(tex.x,.93)*step(.06,tex.y)*step(tex.y,.94);float rows=step(.92,fract(tex.y*16.0)),columns=step(.95,fract(tex.x*4.0));albedo=mix(vec3(.26,.29,.26),baseTint,border);albedo*=1.0-border*max(rows,columns)*.58;}
  else if(kind>6.5){vec4 foliage=texture2D(foliageMap,tex);if(foliage.a<.68)discard;albedo=foliage.rgb*baseTint*1.18;height=dot(foliage.rgb,vec3(.299,.587,.114))*.018;}
  n=relief(worldP,n,height);vec3 colour=albedo*illumination(worldP,n);
  vec3 l=normalize(lampPosition-worldP),v=normalize(cameraPosition-worldP),h=normalize(l+v);float fresnel=.035+.4*pow(1.0-max(dot(n,v),0.0),5.0);
  float shine=pow(max(dot(n,h),0.0),kind<.5?62.0:95.0);colour+=vec3(1.0,.64,.26)*shine*lampPower(worldP)*fresnel*(.5+.5*wetness);
  vec3 skyHalf=normalize(v+normalize(vec3(-.4,.9,.1)));colour+=vec3(.007,.018,.030)*pow(max(dot(n,skyHalf),0.0),58.0)*wetness*(1.0-daylight);
  if(kind>4.5&&kind<6.5)colour+=albedo*vec3(.09,.12,.16)*(1.0-daylight);
  if(kind>3.5&&kind<4.5)colour=mix(baseTint*.4,vec3(1.0,.90,.62),lampOn);
  gl_FragColor=vec4(fogged(colour,worldP),1.0);
  #include <colorspace_fragment>
 }
 `});
 const ground=new T.ShaderMaterial({toneMapped:false,uniforms,vertexShader:`
 varying vec3 worldP;varying vec3 worldN;varying vec4 projectedReflection;uniform mat4 reflectionMatrix;
 void main(){worldP=(modelMatrix*vec4(position,1.0)).xyz;worldN=normalize(mat3(modelMatrix)*normal);projectedReflection=reflectionMatrix*vec4(worldP.x,0.0,worldP.z,1.0);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
 `,fragmentShader:`
 ${common}
 uniform sampler2D reflectionMap;uniform float reflectionReady;varying vec3 worldP;varying vec3 worldN;varying vec4 projectedReflection;
 float roadX(float z){return -15.0/(1.0+exp((z+30.0)/8.0))+3.0/(1.0+exp(-(z-70.0)/20.0));}
 vec2 ripples(vec2 p){vec2 cell=floor(p*1.6),f=fract(p*1.6)-.5;float seed=hash(cell),age=fract(forestTime*.57+seed*9.0),radius=length(f);float ring=sin((radius-age*.55)*100.0)*exp(-abs(radius-age*.55)*55.0)*(1.0-age);return normalize(f+vec2(.001))*ring*.003;}
 void main(){
  vec2 p=worldP.xz;float edge=abs(p.x-roadX(p.y)),road=1.0-smoothstep(2.9,3.65,edge+noise(p*.8)*.32);
  float grit=noise(p*83.0),aggregate=fbm(p*16.0),mud=fbm(p*.87);float tracks=exp(-pow((edge-1.3)*2.7,2.0));
  float verge=1.0-smoothstep(3.1,5.1,edge);vec3 soil=mix(mix(vec3(.019,.024,.013),vec3(.052,.042,.026),verge),vec3(.053,.049,.041),road);soil*=.36+aggregate*.75+grit*.32;
  float pool=smoothstep(.48,.58,mud+noise(p*4.3)*.15+tracks*.045)*road;
  vec2 ripple=ripples(p)*wetness;float height=(aggregate*.022+grit*.006)*(1.0-pool);
  vec3 n=relief(worldP,normalize(worldN),height);n=normalize(n+vec3(ripple.x*4.0,0.0,ripple.y*4.0));
  vec3 v=normalize(cameraPosition-worldP),light=normalize(lampPosition-worldP),h=normalize(v+light);
  vec3 colour=soil*illumination(worldP,n);vec2 distortion=ripple+vec2(n.x,n.z)*.005*(1.0-pool);
  vec2 reflectionUV=projectedReflection.xy/projectedReflection.w*.5+.5+distortion;
  vec3 reflected=mix(vec3(.015,.035,.065),vec3(.22,.28,.27),daylight);
  if(reflectionReady>.5&&reflectionUV.x>0.0&&reflectionUV.x<1.0&&reflectionUV.y>0.0&&reflectionUV.y<1.0)reflected=texture2D(reflectionMap,reflectionUV).rgb;
  float fresnel=.045+.94*pow(1.0-max(dot(n,v),0.0),4.0);colour=mix(colour,reflected,(.10*road+.90*pool)*fresnel);
  float specular=pow(max(dot(n,h),0.0),mix(95.0,420.0,pool));colour+=vec3(1.0,.65,.25)*specular*lampPower(worldP)*(1.0+pool)*.8;
  colour+=vec3(.026,.045,.069)*pow(1.0-max(dot(n,v),0.0),4.0)*road*(.3+.7*aggregate)*(1.0-daylight);
  gl_FragColor=vec4(fogged(colour,worldP),1.0);
  #include <colorspace_fragment>
 }
 `});
 const glow=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:`varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform float lampOn;varying vec2 tex;void main(){float r=length(tex-.5)*2.0;float a=exp(-r*r*7.0)*(1.0-smoothstep(.25,1.0,r))*.32*lampOn;gl_FragColor=vec4(1.0,.65,.22,a);}`});
 const beam=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false,uniforms,vertexShader:worldVertex,fragmentShader:`
 ${common}
 varying vec3 worldP;void main(){if(!gl_FrontFacing)discard;vec3 ray=normalize(worldP-cameraPosition),o=cameraPosition-lampPosition;float slope=.46;
 float a=dot(ray.xz,ray.xz)-slope*slope*ray.y*ray.y,b=2.0*(dot(o.xz,ray.xz)-slope*slope*o.y*ray.y),c=dot(o.xz,o.xz)-slope*slope*o.y*o.y,disc=b*b-4.0*a*c;
 if(disc<=0.0||abs(a)<.00001)discard;float first=(-b-sqrt(disc))/(2.0*a),last=(-b+sqrt(disc))/(2.0*a);float start=max(0.0,min(first,last)),end=max(first,last);
 if(abs(ray.y)>.00001){float floorHit=(.015-cameraPosition.y)/ray.y,topHit=(lampPosition.y-cameraPosition.y)/ray.y;start=max(start,min(floorHit,topHit));end=min(end,max(floorHit,topHit));}
 if(end<=start)discard;float stepSize=(end-start)/12.0,density=0.0;
 for(int i=0;i<12;i++){vec3 p=cameraPosition+ray*(start+(float(i)+.5)*stepSize);float below=lampPosition.y-p.y,radius=.055+max(below,0.0)*slope,r=length(p.xz-lampPosition.xz)/radius;density+=exp(-r*r*3.0)*(1.0-smoothstep(.70,1.0,r))*stepSize/(1.0+below*below*.20);}
 float alpha=(1.0-exp(-density*.5))*lampOn*(.6+.4*wetness);gl_FragColor=vec4(1.0,.72,.29,alpha);}

 `});
 const mist=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:worldVertex,fragmentShader:`
 ${common}
 varying vec3 worldP;varying vec2 tex;void main(){float drift=forestTime*.018;float wisps=fbm(worldP.xz*.24+vec2(drift,0.0));float height=exp(-pow((worldP.y-.55)*.85,2.0));float edge=smoothstep(0.0,.12,tex.x)*(1.0-smoothstep(.88,1.0,tex.x));float a=height*edge*(.045+.12*wisps)*(.5+.5*wetness);gl_FragColor=vec4(forestFog,a);
 #include <colorspace_fragment>
 }
 `});
 const rain=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,uniforms,vertexShader:`uniform float forestTime;varying vec3 worldP;varying float endFade;void main(){vec3 p=position;p.y=mod(p.y-forestTime*10.0,22.0)-2.0-uv.y*.34;p.x+=uv.y*.045;worldP=(modelMatrix*vec4(p,1.0)).xyz;endFade=.45+.55*(1.0-uv.y);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,fragmentShader:`
 ${common}
 varying vec3 worldP;varying float endFade;void main(){if(worldP.y<.015)discard;float d=distance(cameraPosition,worldP),nearFade=smoothstep(1.5,4.0,d);float warm=clamp(lampPower(worldP)*.75,0.0,1.0);vec3 colour=mix(mix(vec3(.11,.20,.32),vec3(.38,.47,.51),daylight),vec3(.85,.57,.21),warm);gl_FragColor=vec4(fogged(colour,worldP),(.32+.22*warm)*nearFade*endFade);
 #include <colorspace_fragment>
 }
 `});
 return {uniforms,solid,ground,glow,beam,mist,rain};
}
