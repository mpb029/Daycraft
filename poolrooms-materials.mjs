// Display-referred indoor lighting. The reference photograph and both offscreen
// buffers use the same display encoding; these materials bypass outdoor tone mapping.
import * as T from './vendor/three.module.js';
const shared=`
uniform float t, plateReady;
uniform mat4 photoMatrix;
uniform sampler2D photograph;
varying vec3 wp;
float sat(float a){return clamp(a,0.,1.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*4375.5453);}
float glow(vec3 p,vec3 centre,vec3 spread){vec3 q=(p-centre)/spread;return exp(-dot(q,q));}
// A registered material/light projection only around the art-directed first
// camera. Alternate stations, and all rays outside its frustum, shade in 3D.
vec3 art(vec3 col,vec3 pos,vec2 drift,float amount){
 if(plateReady<.001)return col;
 vec4 clip=photoMatrix*vec4(pos,1.);if(clip.w<=.02)return col;
 vec2 uv=clip.xy/clip.w*.5+.5;
 float b=min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y));
 float a=smoothstep(0.,.052,b)*plateReady*amount;
 return mix(col,texture2D(photograph,clamp(uv+drift,.001,.999)).rgb,a);
}
float folds(vec2 p,float time){
 vec2 k=p*2.2;float a=sin(k.x+.49*k.y+.50*time+.71*sin(k.y-.28*time));
 float b=sin(1.29*k.y-.42*k.x-.33*time+.65*cos(k.x*.74+.31*time));
 return pow(max(0.,1.-abs(a+b)*.94),9.);
}`;
const opaqueV=`
attribute vec3 ink;attribute float kind;
varying vec3 wp,wn,base;varying vec2 tile;varying float code;
void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;wn=mat3(modelMatrix)*normal;base=ink;tile=uv;code=kind;gl_Position=projectionMatrix*viewMatrix*w;}`;
const opaqueF=shared+`
varying vec3 wn,base;varying vec2 tile;varying float code;
uniform float reflectPass,lightReady;uniform sampler2D irradiance;
vec3 atlasLayer(vec3 grid,float j){
 vec2 at=vec2(mod(j,6.)*55.+grid.x,floor(j/6.)*81.+grid.z)+.5;
 return texture2D(irradiance,at/vec2(330.,324.)).rgb;
}
vec3 indoorLight(vec3 p){
 vec3 g=clamp((p-vec3(-10.35,-1.56,-24.15))/.40,vec3(0.),vec3(54.,22.,80.));
 float j=floor(g.y);return mix(atlasLayer(g,j),atlasLayer(g,min(j+1.,22.)),fract(g.y));
}
void main(){
 if(reflectPass>.5&&wp.y<-.002)discard;
 vec3 viewDir=normalize(cameraPosition-wp),n=normalize(wn);
 if(dot(viewDir,n)<0.)n=-n;
 vec3 col=base;
 float sideCh=smoothstep(2.4,4.9,wp.x)*smoothstep(2.48,3.60,-wp.z);
 float back=smoothstep(8.,19.,-wp.z);
 float low=1.-smoothstep(.45,2.8,wp.y),deep=smoothstep(.10,1.40,-wp.y);
 vec3 light=vec3(.74,.75,.69);
 light+=vec3(.23,.21,.145)*glow(wp,vec3(-.8,4.,-5.),vec3(5.,3.,8.));
 light+=vec3(.19,.20,.14)*glow(wp,vec3(-4.,3.,2.),vec3(4.,3.,4.));
 light+=vec3(.040,.21,.19)*glow(wp,vec3(6.7,2.7,-6.2),vec3(3.,2.8,5.));
 light+=vec3(.33,.235,.12)*glow(wp,vec3(-7.8,2.6,-18.8),vec3(3.2,2.4,4.7));
 light+=vec3(.045,.14,.11)*low;
 light-=vec3(.19,.18,.16)*glow(wp,vec3(-5.8,1.,-8.5),vec3(4.2,1.6,2.8));
 light*=1.-.16*back;light*=.82+.13*n.y+.13*max(0.,dot(n,normalize(vec3(-.5,.30,.55))));
 if(lightReady>.5){
  vec3 baked=indoorLight(wp+n*.235);light*=.23+.99*baked;
 }
 if(code<1.5){
   if(code<.5)col=mix(col,vec3(.598,.704,.644),1.-smoothstep(.60,.617,wp.y));
   vec2 grid=tile/.0975,id=floor(grid),cell=fract(grid);
   vec2 aa=max(fwidth(grid),vec2(.002)),edge=min(cell,1.-cell),b=smoothstep(vec2(.014)-aa*.55,vec2(.027)+aa*.65,edge);
   float face=b.x*b.y,lodWeight=1.-smoothstep(.28,.85,max(aa.x,aa.y));
   face=mix(.948,face,lodWeight);
   float per=hash(id+vec2(.31,.73));
   col*=1.+(per-.5)*.032*lodWeight;
   float bevel=(max(0.,1.-abs(edge.x-.046)/.034)+max(0.,1.-abs(edge.y-.046)/.034))*lodWeight;
   col=mix(col*.77,col,face)+bevel*.021;
   vec3 R=reflect(-viewDir,n);
   float sheen=pow(1.-max(0.,dot(viewDir,n)),3.)*.068;
   col=col*light+sheen*vec3(.73,.86,.80)+.032*pow(max(0.,R.y),7.)*face;
   float under=1.-smoothstep(.0,1.12,wp.y);
   float c=.64*folds(wp.xz*2.2+vec2(wp.y*.72,wp.y*.51),t*.48)+.36*folds(wp.xz*3.8+wp.y*.32,-t*.25);
   col+=vec3(.068,.108,.063)*c*under;
   col=mix(col,col*vec3(.65,.91,.85)+vec3(.015,.033,.033),deep*.57);
 }else if(code<2.5){
   col*=light*(.94+.018*hash(floor(wp.xz*56.)));
 }else if(code<3.5){col=base*.85+vec3(.14,.14,.14);}
 else{
   vec3 V=viewDir,refl=reflect(-V,n),L=normalize(vec3(-.38,.83,.49));
   float wax=pow(max(0.,dot(n,normalize(L+V))),38.);
   float rect=exp(-pow(abs(refl.y-.72)*7.,2.))*exp(-pow(abs(refl.x+.17)*2.4,2.));
   vec3 localL=normalize(vec3(-.83,5.7,-5.32)-wp);
   float coat=pow(max(0.,dot(n,normalize(localL+V))),62.);
   col=base*light*(.89+.26*max(0.,dot(n,L)))+vec3(.31,.295,.22)*coat+vec3(.20,.205,.18)*wax+vec3(.21,.224,.20)*rect;
   col+=vec3(.056,.074,.071)*pow(1.-max(0.,dot(n,V)),3.);
   if(code>5.5)col=base*.85+vec3(.28)*wax;
 }
 col*=mix(vec3(1.),vec3(.78,1.02,.98),sideCh*.65);
 col=mix(col,vec3(.32,.39,.34),smoothstep(17.,42.,distance(wp,cameraPosition))*.16);
 gl_FragColor=vec4(art(col,wp,vec2(0.),.953),1.);
}`;
const waterV=`
uniform float t;varying vec3 wp;varying vec4 eyeClip,mirrorClip;
uniform mat4 mirrorMatrix;
void main(){vec4 w=modelMatrix*vec4(position,1.);
 w.y+=.0017*sin(w.x*2.8+w.z*1.74+t*.63)+.0012*sin(w.z*3.3-w.x*.75-t*.54);
 wp=w.xyz;eyeClip=projectionMatrix*viewMatrix*w;mirrorClip=mirrorMatrix*w;gl_Position=eyeClip;}`;
const waterF=shared+`
uniform sampler2D reflected,refracted;
uniform vec2 impact;
varying vec4 eyeClip,mirrorClip;
void main(){
 vec2 p=wp.xz;
 float h1=p.x*2.60+p.y*1.71+t*.62+.34*sin(p.y*1.43-t*.30);
 float h2=p.y*3.45-p.x*.73-t*.49+.36*sin(p.x*2.14+t*.27);
 float h3=p.y*6.20+p.x*1.05+t*.81;
 vec2 off=p-impact;float r=length(off);
 float ring=sin(22.*r-t*3.3)*exp(-r*.95)*smoothstep(.07,.42,r);
 vec2 normal=vec2(.011*cos(h1)-.008*cos(h2),.013*cos(h2)+.006*cos(h1))+.003*cos(h3)+off/max(.08,r)*ring*.027;
 vec3 n=normalize(vec3(-normal.x,1.,-normal.y)),v=normalize(cameraPosition-wp);
 float grazing=pow(1.-sat(dot(n,v)),3.7);
 vec2 ruv=mirrorClip.xy/mirrorClip.w*.5+.5,tuv=eyeClip.xy/eyeClip.w*.5+.5;
 float distort=.25+.87*smoothstep(.2,5.,distance(wp,cameraPosition));
 vec2 disp=normal*distort*.66;
 vec3 ref=texture2D(reflected,clamp(ruv+disp,.001,.999)).rgb;
 vec3 trans=texture2D(refracted,clamp(tuv+disp*.84,.001,.999)).rgb;
 float depth=wp.z<1.4?1.42:max(.22,.96-floor(clamp((wp.z-1.4)/.68,0.,4.))*.178);
 vec3 water=mix(trans*vec3(.78,.95,.88),vec3(.12,.39,.35),(.18+.27*depth)*(1.-.26*grazing));
 float focusing=.69*folds(p*2.25+normal*1.6,t*.65)+.31*folds(p*3.65,-t*.32);
 water+=vec3(.058,.080,.048)*focusing*(1.-grazing);
 vec3 col=mix(water,ref,.13+.79*grazing);
 vec2 drift=normal*vec2(.115,.078)*smoothstep(.1,2.,distance(wp,cameraPosition));
 col=art(col,wp,drift,.89);
 col+=vec3(.022,.032,.022)*(focusing-.24)*(1.-.8*grazing);
 float splash=exp(-pow(abs(off.x)/.52,2.)-pow(abs(off.y)/.13,2.));
 float sparkle=.5+.5*sin(off.x*107.+sin(t*2.3+off.y*33.)*3.+t*4.);
 col+=vec3(.12,.15,.14)*splash*(.36+.64*sparkle)+max(ring,0.)*.016;
 gl_FragColor=vec4(col,1.);
}`;
const fallV=`varying vec3 wp;varying vec2 st;uniform float t;
 void main(){vec4 w=modelMatrix*vec4(position,1.);st=uv;
 w.z+=.010*sin(st.x*32.+t*.94+st.y*9.)*st.y;
 wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const fallF=`varying vec3 wp;varying vec2 st;uniform float t,plateReady;
 void main(){float s=st.x,v=st.y;
 float seam=sin(s*138.+3.2*sin(s*29.-v*4.+t*.78)+sin(19.*v-t*2.5));
 float glint=pow(.5+.5*seam,9.);
 float breakup=.6+.4*sin(36.*v-t*4.3+s*27.);
 float rim=pow(abs(s*2.-1.),11.);
 vec3 tint=mix(vec3(.48,.66,.61),vec3(.91,.95,.86),.29+.57*glint+.13*rim);
 gl_FragColor=vec4(tint,clamp(.145+(.35+.20*v)*glint*breakup+.23*rim+.16*v*v,.11,.83)*(1.-.45*plateReady));
 }`;
function shader(vertexShader,fragmentShader,uniforms,params={}){return new T.ShaderMaterial({vertexShader,fragmentShader,uniforms,side:T.DoubleSide,toneMapped:false,...params});}
export function poolMaterials(U){
 return {room:shader(opaqueV,opaqueF,U),water:shader(waterV,waterF,U),fall:shader(fallV,fallF,U,{transparent:true,depthWrite:false,forceSinglePass:true})};
}
