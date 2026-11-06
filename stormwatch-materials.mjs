export const stormVertex=`
varying vec3 plateCoordinate;
void main(){plateCoordinate=vec3(uv*(-position.z),-position.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const common=`
uniform float t,ready,rain,flash,detail;
uniform sampler2D photograph,surfaces,hearth;
varying vec3 plateCoordinate;
#define plateUV (plateCoordinate.xy/plateCoordinate.z)
const vec2 SIZE=vec2(1672.,941.);
vec2 texUV(vec2 p){return vec2(p.x/SIZE.x,1.-p.y/SIZE.y);}
vec4 maskAt(vec2 p){vec4 m=texture2D(surfaces,texUV(p));m.a=max(0.,(m.a-128./255.)*255./127.);return m;}
vec3 photo(vec2 p){return texture2D(photograph,texUV(p)).rgb;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+2.4)+.15*noise(p*4.11-7.);}
float bell(float x){return exp(-x*x);}
float segment(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
`;
export const stormFragment=common+`
// Two flow phases overlap so advection never visibly snaps back to its origin.
vec3 advect(vec2 p,vec2 flow,float phase,float ocean){
 float a=fract(phase),b=fract(phase+.5),blend=abs(a-.5)*2.;
 vec2 p0=p-flow*(a-.5),p1=p-flow*(b-.5);
 vec4 m0=maskAt(p0),m1=maskAt(p1);
 float g0=mix(m0.b,m0.g,ocean),g1=mix(m1.b,m1.g,ocean);
 return mix(photo(mix(p,p0,g0)),photo(mix(p,p1,g1)),blend);
}
float rainSheet(vec2 p,float density,float speed,float seed){
 p.x+=p.y*(.16+.08*sin(t*.21));
 vec2 q=p*vec2(density,density*.35);q.y-=t*speed;
 vec2 id=floor(q);q=fract(q);float n=hash(id+seed);
 float streak=(1.-smoothstep(.012,.04,abs(q.x-(.12+.76*n))))*(1.-smoothstep(.08+.1*n,.22+.53*n,q.y));
 return streak*step(.38,n);
}
vec3 glass(vec2 p,vec3 colour,float mask){
 float gust=.72+.28*sin(t*.42+sin(t*.093));
 float streak=rainSheet(p,.081,3.9,11.)*.16+rainSheet(p,.145,6.1,42.)*.10;
 if(detail>.5)streak+=rainSheet(p,.224,9.,76.)*.055;
 // Independently descending droplets, with thin trailing rivulets and refraction.
 vec2 cellSize=vec2(31.,86.),id=floor(p/cellSize),q=fract(p/cellSize);
 float h=hash(id),fall=fract(t*(.09+.11*h)+h*7.);
 float cx=.2+.6*hash(id+5.1)+.025*sin(q.y*18.+h*20.);
 vec2 d=(q-vec2(cx,fall))*cellSize;
 float head=bell(d.x/1.55)*bell(d.y/2.6),tail=bell(d.x/.65)*smoothstep(-43.,-3.,d.y)*(1.-smoothstep(-3.,0.,d.y));
 float dropEnabled=step(.24,h),lens=head*dropEnabled;
 vec2 refractOffset=vec2(d.x*.85,-d.y*.3)*lens;
 vec3 refracted=photo(p+refractOffset);
 colour=mix(colour,refracted,lens*.48*rain*mask);
 colour+=vec3(.55,.68,.73)*(streak*gust+head*.21*dropEnabled+tail*.10*dropEnabled)*rain*mask;
 colour-=vec3(.015,.023,.026)*head*dropEnabled*rain*mask;
 return colour;
}
void main(){
 vec2 p=vec2(plateUV.x*1672.,(1.-plateUV.y)*941.);
 if(ready<.5){gl_FragColor=vec4(.19,.16,.12,1.);return;}
 vec4 mask=maskAt(p);vec3 base=photo(p),col=base;
 if(mask.b>.001){
  vec2 flow=vec2(40.,-5.)+vec2(8.*sin(p.y*.012),3.*sin(p.x*.009));
  vec3 cloud=advect(p,flow,t/34.,0.);
  float shade=fbm(p*.006+vec2(-t*.045,t*.007));
  cloud*=.88+.18*shade;
  col=mix(col,cloud,mask.b);
 }
 if(mask.g>.001){
  float nearSea=clamp((p.y-397.)/185.,0.,1.);
  float swell=sin(p.y*(.14-.05*nearSea)+p.x*.013-t*1.65)+.48*sin(p.y*.20-p.x*.021-t*2.13);
  vec2 flow=vec2(-22.,41.)*(.18+nearSea);
  vec2 q=p+vec2(sin(p.y*.08+t*.8),swell)*(1.2+3.8*nearSea);
  q=mix(p,q,maskAt(q).g);
  vec3 sea=advect(q,flow,t/5.8,1.);
  float chop=fbm(vec2(p.x*.055,p.y*.12)+vec2(-t*.18,-t*.75));
  float crest=smoothstep(.57,.80,chop+.09*swell);
  sea*=.92+.08*swell;
  sea+=vec3(.19,.24,.25)*crest*(.12+.55*nearSea);
  col=mix(col,sea,mask.g);
 }
 // Lightning belongs to the distant sky; interior exposure changes gently.
 if(flash>.001){
  float dist=segment(p,vec2(1363,313),vec2(1355,327));
  dist=min(dist,segment(p,vec2(1355,327),vec2(1361,332)));
  dist=min(dist,segment(p,vec2(1361,332),vec2(1348,350)));
  dist=min(dist,segment(p,vec2(1348,350),vec2(1354,358)));
  dist=min(dist,segment(p,vec2(1354,358),vec2(1342,376)));
  dist=min(dist,segment(p,vec2(1342,376),vec2(1345,394)));
  float branch=min(segment(p,vec2(1348,350),vec2(1329,357)),segment(p,vec2(1329,357),vec2(1312,374)));
  float bolt=(1.-smoothstep(.35,1.25,dist))+.4*(1.-smoothstep(.1,.7,branch));
  float glow=bell((p.x-1350.)/130.)*bell((p.y-329.)/65.);
  col+=vec3(.38,.42,.52)*flash*mask.r*(.23+glow*.48+bolt*1.9);
  col+=vec3(.014,.020,.025)*flash*(1.-mask.r);
 }
 if(mask.r>.001)col=glass(p,col,mask.r);
 if(mask.a>.001){
  float height=1.-smoothstep(573.,625.,p.y);
  vec2 warp=vec2(3.2*sin(p.y*.065+t*2.9)+2.*sin(p.x*.1+t*4.1),7.*sin(p.x*.054+t*2.3))*height;
  vec2 q=p+warp*maskAt(p+warp).a;
  vec3 fire=texture2D(hearth,texUV(q)).rgb;
  fire*=.93+.11*noise(vec2(t*7.1,p.y*.04));
  col=mix(col,fire,mask.a);
 }
 float firelight=(.032*sin(t*4.7)+.018*sin(t*7.23)+.023*noise(vec2(t*9.,1.)));
 float warmth=exp(-length((p-vec2(210.,572.))/vec2(390.,330.)));
 col+=vec3(1.,.46,.13)*firelight*warmth*(1.-mask.r);
 gl_FragColor=vec4(clamp(col,0.,1.),1.);
}
`;
export const veilFragment=common+`
uniform float kind,seed;
uniform vec2 boundsA,boundsB;
void main(){
 if(ready<.5)discard;
 vec2 p=vec2(plateUV.x*1672.,(1.-plateUV.y)*941.);
 vec2 q=(p-boundsA)/(boundsB-boundsA);q.y=1.-q.y;
 float alpha=0.;vec3 colour;
 if(kind<.5){
  float y=q.y,x=q.x-.52;
  float bend=.09*sin(y*8.-t*.75)+.045*sin(y*19.+t*.65);
  float width=.015+.062*y;
  float wisp=bell((x-bend)/width)+.55*bell((x+bend*.8-.04)/width);
  float turbulent=fbm(vec2(q.x*9.+sin(y*8.-t*.4),y*7.-t*.62));
  alpha=wisp*(.11+.20*turbulent)*smoothstep(0.,.12,y)*(1.-smoothstep(.48,1.,y));
  colour=vec3(.78,.79,.77);
 }else{
  float cycle=fract(t/(6.7+seed*3.)+seed),life=sin(clamp(cycle/.73,0.,1.)*3.14159265);
  float crest=.18+life*.62;
  float x=q.x-.44-.16*q.y-.08*sin(t*.53+seed*5.);
  float shape=bell(x/(.12+.18*q.y))*bell((q.y-crest)/(.12+.21*life));
  float mist=fbm(vec2(q.x*10.-t*.43,q.y*12.-t*1.9)+seed*20.);
  alpha=shape*life*smoothstep(.25,.7,mist)*.64;
  alpha*=smoothstep(0.,.1,q.y)*(1.-smoothstep(.85,1.,q.y))*maskAt(p).r;
  colour=vec3(.66,.75,.78)+flash*.12;
 }
 gl_FragColor=vec4(colour,alpha);
}
`;
