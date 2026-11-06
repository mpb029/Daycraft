// Display-referred indoor lighting. The reference photograph and both offscreen
// buffers use the same display encoding; these materials bypass outdoor tone mapping.
import * as T from './vendor/three.module.js';
import {POOL_SWELL_GLSL} from './poolrooms-water-motion.mjs';
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
 vec3 col=base;float dancingLight=0.;
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
   // Light ripples remain visible over the registered opening artwork.
   // Map onto each wall/floor, rather than stretching world-XZ into stripes.
   vec2 cp=abs(n.y)>.65?wp.xz:abs(n.x)>abs(n.z)?vec2(wp.z,wp.y*1.2):vec2(wp.x,wp.y*1.2);
   float under=1.-smoothstep(.35,1.85,wp.y);
   dancingLight=(.68*folds(cp*1.78+vec2(t*.05,-t*.07),t*.82)+.32*folds(cp*2.72,-t*.56))*under;
   col+=vec3(.018,.025,.015)*dancingLight;
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
 col=art(col,wp,vec2(0.),.953);
 col+=vec3(.082,.112,.072)*dancingLight;
 gl_FragColor=vec4(col,1.);
}`;
const waterV=`
uniform float t;varying vec3 wp;varying vec4 eyeClip,mirrorClip;
uniform mat4 mirrorMatrix;
`+POOL_SWELL_GLSL+`
void main(){vec4 w=modelMatrix*vec4(position,1.);
 w.y+=poolSwell(w.xz,t).x;
 wp=w.xyz;eyeClip=projectionMatrix*viewMatrix*w;mirrorClip=mirrorMatrix*w;gl_Position=eyeClip;}`;
const waterF=shared+POOL_SWELL_GLSL+`
uniform sampler2D reflected,refracted;
uniform vec2 impact;
varying vec4 eyeClip,mirrorClip;
void main(){
 vec2 p=wp.xz;
 vec3 swell=poolSwell(p,t);
 float h1=dot(p,vec2(3.9,2.1))-t*2.05+.36*sin(p.y*1.7-t*.64);
 float h2=dot(p,vec2(-2.1,5.2))-t*2.67+.41*sin(p.x*1.4+t*.51);
 vec2 off=p-impact;float r=length(off),decay=exp(-r*.68)*smoothstep(.035,.26,r);
 float ring=(sin(13.*r-t*5.8)+.34*sin(21.*r-t*8.1+.7))*decay;
 vec2 normal=swell.yz+vec2(.014*cos(h1)-.010*cos(h2),.011*cos(h1)+.016*cos(h2));
 normal+=off/max(.08,r)*ring*.063;
 vec3 n=normalize(vec3(-normal.x,1.,-normal.y)),v=normalize(cameraPosition-wp);
 float grazing=pow(1.-sat(dot(n,v)),3.7);
 vec2 ruv=mirrorClip.xy/mirrorClip.w*.5+.5,tuv=eyeClip.xy/eyeClip.w*.5+.5;
 float distort=.22+.64*smoothstep(.2,5.,distance(wp,cameraPosition));
 vec2 disp=normal*distort*.39;
 vec3 ref=texture2D(reflected,clamp(ruv+disp,.001,.999)).rgb;
 vec3 trans=texture2D(refracted,clamp(tuv+disp*.76,.001,.999)).rgb;
 float depth=wp.z<1.4?1.42:max(.22,.96-floor(clamp((wp.z-1.4)/.68,0.,4.))*.178);
 vec3 water=mix(trans*vec3(.78,.95,.88),vec3(.12,.39,.35),(.18+.27*depth)*(1.-.26*grazing));
 float focusing=.67*folds(p*1.72+normal*2.3,t*1.02)+.33*folds(p*2.87,-t*.61);
 water+=vec3(.066,.090,.053)*focusing*(1.-grazing);
 vec3 col=mix(water,ref,.13+.79*grazing);
 // Preserve the approved composition while moving the water/reflections within it.
 vec2 drift=normal*vec2(.132,.088)*smoothstep(.1,1.7,distance(wp,cameraPosition));
 col=art(col,wp,drift,.84);
 col+=vec3(.066,.084,.059)*(focusing-.20)*(1.-.7*grazing);
 vec3 lamp=normalize(vec3(-.28,.79,.53)),halfway=normalize(lamp+v);
 float shimmer=pow(max(0.,dot(n,halfway)),90.)*.09;
 col+=vec3(.93,.98,.83)*shimmer;
 // An irregular impact patch and dispersing rings, not uniform stripes.
 float churn=exp(-pow(off.x/.62,2.)-pow(off.y/.24,2.));
 float bubbles=folds(off*8.+vec2(t*.14,-t*.24),t*1.8);
 float crest=pow(max(0.,sin(13.*r-t*5.8)),12.)*decay;
 col+=vec3(.19,.22,.20)*churn*(.25+.75*bubbles)+vec3(.043,.060,.048)*crest;
 gl_FragColor=vec4(col,1.);
}`;
const fallV=`varying vec3 wp;varying vec2 st;uniform float t;
 void main(){vec4 w=modelMatrix*vec4(position,1.);st=uv;
 float free=st.y*st.y;
 w.z+=.021*sin(st.x*26.-t*3.1+st.y*12.)*free;
 w.x+=.008*sin(st.y*21.-t*5.2+st.x*12.)*free;
 wp=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const fallF=`varying vec3 wp;varying vec2 st;uniform float t,plateReady;
 void main(){float s=st.x,v=st.y;
 float flow=18.*v-t*8.4;
 float seam=sin(s*137.+2.3*sin(s*31.-v*5.+t*1.35)+.8*sin(flow+s*8.));
 float glint=pow(.5+.5*seam,6.);
 float breakup=.58+.42*sin(37.*v-t*12.6+s*24.);
 float rim=pow(abs(s*2.-1.),11.);
 float streak=pow(.5+.5*sin(flow+s*18.),7.);
 vec3 tint=mix(vec3(.48,.66,.61),vec3(.91,.95,.86),.25+.53*glint+.12*rim+.10*streak);
 gl_FragColor=vec4(tint,clamp(.18+(.38+.17*v)*glint*breakup+.21*rim+.16*v*v+.08*streak,.13,.86)*(1.-.18*plateReady));
 }`;
const sprayV=`attribute vec3 seed;uniform float t,viewportHeight;
 varying float opacity;
 void main(){
 float speed=1.38+seed.z*.78,life=2.*speed/9.8;
 float age=mod(t+seed.x*7.3,life+.16),a=min(age,life);
 vec4 w=modelMatrix*vec4(position,1.);
 w.x+=(seed.y-.5)*a*.68;w.z+=(.15+seed.x*.56)*a;
 w.y+=speed*a-4.9*a*a;
 opacity=(1.-step(life,age))*smoothstep(0.,.035,a)*(1.-smoothstep(life*.65,life,a));
 vec4 eye=viewMatrix*w;gl_Position=projectionMatrix*eye;
 gl_PointSize=clamp(viewportHeight*.012/max(.1,-eye.z),1.2,4.6);
 }`;
const sprayF=`varying float opacity;
 void main(){
 vec2 q=(gl_PointCoord-.5)*2.;q.x*=1.35;
 float edge=1.-smoothstep(.15,1.,dot(q,q));
 gl_FragColor=vec4(.77,.91,.85,opacity*edge*.58);
 }`;
function shader(vertexShader,fragmentShader,uniforms,params={}){return new T.ShaderMaterial({vertexShader,fragmentShader,uniforms,side:T.DoubleSide,toneMapped:false,...params});}
export function poolMaterials(U){
 return {room:shader(opaqueV,opaqueF,U),water:shader(waterV,waterF,U),fall:shader(fallV,fallF,U,{transparent:true,depthWrite:false,forceSinglePass:true}),spray:shader(sprayV,sprayF,U,{transparent:true,depthWrite:false})};
}
