import * as T from './vendor/three.module.js';
import {FOREST_LAMP} from './forest-geometry.mjs';

const common=`
 uniform float forestTime;uniform float daylight;uniform float wetness;uniform float lampOn;uniform float breeze;uniform vec3 lampPosition;uniform vec3 forestFog;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){return noise(p)*.58+noise(p*2.03)*.28+noise(p*4.13)*.14;}
 vec3 illumination(vec3 p,vec3 n){
  vec3 light=lampPosition-p;float d=length(light),cone=smoothstep(-.25,.6,normalize(p-lampPosition).y*-1.0);
  float point=lampOn*30.0/(1.0+d*d)*cone;
  float diffuse=max(dot(n,normalize(light)),0.0);
  vec3 ambient=mix(vec3(.22,.29,.38),vec3(.57,.63,.55),daylight);
  float sky=max(n.y*.5+.5,0.0);ambient*=.55+.45*sky;
  vec3 sun=vec3(.35,.37,.27)*max(dot(n,normalize(vec3(-.5,1.0,.3))),0.0)*daylight;
  return ambient+sun+vec3(1.0,.67,.24)*point*(.16+.84*diffuse);
 }
 vec3 fogged(vec3 colour,vec3 p){float d=distance(cameraPosition,p);float haze=1.0-exp(-pow(d/108.0,1.38));float low=exp(-max(p.y,0.0)*.12);haze*=.75+.25*low;return mix(colour,forestFog,clamp(haze,0.0,1.0));}
`;

export function createForestMaterials(signTexture,foliageTexture,barkTexture){
 const uniforms={forestTime:{value:0},daylight:{value:0},wetness:{value:1},lampOn:{value:1},breeze:{value:1},lampPosition:{value:new T.Vector3(...FOREST_LAMP)},forestFog:{value:new T.Color('#263c51')},signMap:{value:signTexture},foliageMap:{value:foliageTexture},barkMap:{value:barkTexture},reflectionMap:{value:null},reflectionMatrix:{value:new T.Matrix4()},reflectionReady:{value:0}};
 const solid=new T.ShaderMaterial({side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:`
 attribute vec3 tint;attribute float surfaceKind;uniform float forestTime;uniform float breeze;
 varying vec3 worldP;varying vec3 worldN;varying vec3 baseTint;varying vec2 tex;varying float kind;
 void main(){vec3 p=position;if((surfaceKind>.5&&surfaceKind<1.5)||surfaceKind>6.5){float sway=sin(forestTime*.7+p.x*.3+p.z*.13)*.018*breeze*uv.y;p.x+=sway;p.z+=sway*.5;}
 worldP=(modelMatrix*vec4(p,1.0)).xyz;worldN=normalize(mat3(modelMatrix)*normal);baseTint=tint;tex=uv;kind=surfaceKind;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}
 `,fragmentShader:`
 ${common}
 uniform sampler2D signMap;uniform sampler2D foliageMap;uniform sampler2D barkMap;varying vec3 worldP;varying vec3 worldN;varying vec3 baseTint;varying vec2 tex;varying float kind;
 void main(){vec3 n=normalize(worldN);if(!gl_FrontFacing)n=-n;vec3 albedo=baseTint;
  if(kind<.5){
   vec3 bark=texture2D(barkMap,vec2(tex.x*2.0,tex.y*.28)).rgb;
   albedo=mix(baseTint*.6,bark*.62,.85);
   float moss=smoothstep(.46,.71,fbm(worldP.xz*.8+worldP.y*.03))*(1.0-smoothstep(1.0,6.0,worldP.y));albedo=mix(albedo,vec3(.057,.088,.035),moss*.75);
  }else if(kind<1.5){
   float vein=1.0-smoothstep(.012,.035,abs(tex.x-.5));float ribs=pow(.5+.5*cos((tex.y+abs(tex.x-.5)*.6)*54.0),15.0);
   albedo*=.68+.32*sin(tex.y*3.14159);albedo+=vec3(.022,.027,.009)*(vein+ribs*.27);
  }else if(kind<2.5){albedo*=.72+.38*fbm(worldP.xz*8.0+worldP.y);}
  else if(kind>4.5&&kind<5.5){albedo=texture2D(signMap,tex).rgb;}
  else if(kind>5.5&&kind<6.5){float border=step(.07,tex.x)*step(tex.x,.93)*step(.06,tex.y)*step(tex.y,.94);float rows=step(.92,fract(tex.y*16.0)),columns=step(.95,fract(tex.x*4.0));albedo=mix(vec3(.26,.29,.26),baseTint,border);albedo*=1.0-border*max(rows,columns)*.58;}
  else if(kind>6.5){vec4 foliage=texture2D(foliageMap,tex);if(foliage.a<.70)discard;albedo=foliage.rgb*baseTint*1.5;}
  vec3 colour=albedo*illumination(worldP,n);
  vec3 l=normalize(lampPosition-worldP),v=normalize(cameraPosition-worldP),h=normalize(l+v);float shine=pow(max(dot(n,h),0.0),kind<.5?26.0:55.0);
  colour+=vec3(.13,.085,.029)*shine*lampOn*wetness/(1.0+distance(worldP,lampPosition)*.25);
  if(kind>3.5&&kind<4.5)colour=mix(baseTint*.4,vec3(1.0,.88,.52),lampOn);
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
 float roadX(float z){return -7.0/(1.0+exp((z+45.0)/12.0))+3.0/(1.0+exp(-(z-70.0)/20.0));}
 vec2 ripples(vec2 p){vec2 cell=floor(p*1.8),f=fract(p*1.8)-.5;float seed=hash(cell),age=fract(forestTime*.54+seed*9.0),radius=length(f);float ring=sin((radius-age*.64)*72.0)*exp(-abs(radius-age*.64)*30.0)*(1.0-age);return normalize(f+vec2(.001))*ring*.012;}
 void main(){
  vec2 p=worldP.xz;float edge=abs(p.x-roadX(p.y)),road=1.0-smoothstep(3.25,4.0,edge+noise(p*.6)*.35);
  float grit=fbm(p*8.0),mud=fbm(p*.73);vec3 soil=mix(vec3(.031,.038,.023),vec3(.075,.068,.052),road);soil*=.57+grit*.72;
  float tracks=exp(-pow((edge-1.7)*2.5,2.0));soil*=1.0-tracks*.15;
  float pool=smoothstep(.42,.65,mud+noise(p*2.7)*.15)*road;
  vec2 distortion=ripples(p)*wetness+vec2(sin(p.y*9.0+forestTime*.8),cos(p.x*13.0+forestTime*.7))*.0004*wetness;
  vec3 n=normalize(worldN+vec3(distortion.x*8.0,0.0,distortion.y*8.0));
  vec3 v=normalize(cameraPosition-worldP),light=normalize(lampPosition-worldP),h=normalize(v+light);
  vec3 colour=soil*illumination(worldP,n);
  vec2 reflectionUV=projectedReflection.xy/projectedReflection.w*.5+.5+distortion;
  vec3 reflected=mix(vec3(.021,.038,.063),vec3(.27,.33,.32),daylight);
  if(reflectionReady>.5&&reflectionUV.x>0.0&&reflectionUV.x<1.0&&reflectionUV.y>0.0&&reflectionUV.y<1.0)reflected=texture2D(reflectionMap,reflectionUV).rgb;
  float fresnel=.08+.78*pow(1.0-max(dot(n,v),0.0),3.0);colour=mix(colour,reflected,pool*fresnel*.85);
  float specular=pow(max(dot(n,h),0.0),mix(38.0,220.0,pool));colour+=vec3(1.0,.67,.22)*specular*lampOn*.85;
  colour+=vec3(.035,.054,.073)*abs(distortion.x+distortion.y)*pool*4.0;
  gl_FragColor=vec4(fogged(colour,worldP),1.0);
  #include <colorspace_fragment>
 }
 `});
 const glow=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,toneMapped:false,uniforms,vertexShader:`varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform float lampOn;varying vec2 tex;void main(){float r=length(tex-.5)*2.0;float a=exp(-r*r*6.0)*(1.0-smoothstep(.4,1.0,r))*.22*lampOn;gl_FragColor=vec4(.92,.62,.22,a);}`});
 return {uniforms,solid,ground,glow};
}
