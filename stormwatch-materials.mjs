export const stormVertex=`
varying vec3 plateCoordinate;
void main(){plateCoordinate=vec3(uv*(-position.z),-position.z);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const common=`
uniform float t,ready,rain,flash,detail;
uniform sampler2D photograph,surfaces;
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
vec3 driftingClouds(vec2 p,vec2 flow,float phase){
 float a=fract(phase),b=fract(phase+.5),blend=abs(a-.5)*2.;
 vec2 p0=p-flow*(a-.5),p1=p-flow*(b-.5);
 vec4 m0=maskAt(p0),m1=maskAt(p1);
 float g0=m0.b,g1=m1.b;
 return mix(photo(mix(p,p0,g0)),photo(mix(p,p1,g1)),blend);
}

void main(){
 vec2 p=vec2(plateUV.x*1672.,(1.-plateUV.y)*941.);
 if(ready<.5){gl_FragColor=vec4(.19,.16,.12,1.);return;}
 vec4 mask=maskAt(p);vec3 base=photo(p),col=base;
 if(mask.b>.001){
  vec2 flow=vec2(40.,-5.)+vec2(8.*sin(p.y*.012),3.*sin(p.x*.009));
  vec3 cloud=driftingClouds(p,flow,t/34.);
  float shade=fbm(p*.006+vec2(-t*.045,t*.007));
  cloud*=.88+.18*shade;
  col=mix(col,cloud,mask.b);
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
 float firelight=(.032*sin(t*4.7)+.018*sin(t*7.23)+.023*noise(vec2(t*9.,1.)));
 float warmth=exp(-length((p-vec2(210.,572.))/vec2(390.,330.)));
 col+=vec3(1.,.46,.13)*firelight*warmth*(1.-mask.r);
 gl_FragColor=vec4(clamp(col,0.,1.),1.-max(mask.g,mask.a));
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
 }
 gl_FragColor=vec4(colour,alpha);
}
`;

export const glassFragment=common+`
float rainSheet(vec2 p,float density,float speed,float seed){
 p.x+=p.y*(.16+.08*sin(t*.21));
 vec2 q=p*vec2(density,density*.35);q.y-=t*speed;
 vec2 id=floor(q);q=fract(q);float n=hash(id+seed);
 float streak=(1.-smoothstep(.012,.04,abs(q.x-(.12+.76*n))))*(1.-smoothstep(.08+.1*n,.22+.53*n,q.y));
 return streak*step(.38,n);
}
void main(){
 vec2 p=vec2(plateUV.x*1672.,(1.-plateUV.y)*941.);float pane=maskAt(p).r;
 if(ready<.5||rain<.5||pane<.001)discard;
 float gust=.72+.28*sin(t*.42+sin(t*.093));
 float streak=rainSheet(p,.081,3.9,11.)*.14+rainSheet(p,.145,6.1,42.)*.09;
 if(detail>.5)streak+=rainSheet(p,.224,9.,76.)*.05;
 vec2 cellSize=vec2(31.,86.),id=floor(p/cellSize),q=fract(p/cellSize);
 float h=hash(id),fall=fract(t*(.09+.11*h)+h*7.);
 float cx=.2+.6*hash(id+5.1)+.025*sin(q.y*18.+h*20.);
 vec2 d=(q-vec2(cx,fall))*cellSize;
 float head=bell(d.x/1.55)*bell(d.y/2.6),tail=bell(d.x/.65)*smoothstep(-43.,-3.,d.y)*(1.-smoothstep(-3.,0.,d.y));
 float dropEnabled=step(.24,h);
 float alpha=(streak*gust+head*.23*dropEnabled+tail*.13*dropEnabled)*pane;
 gl_FragColor=vec4(vec3(.67,.78,.81)+flash*.08,alpha);
}
`;
