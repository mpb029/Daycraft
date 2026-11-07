import * as T from './vendor/three.module.js';
import {MALL_ART,MALL_MASK,mallPanel} from './mall-layout.mjs';
import {createMallFountain} from './mall-fountain.mjs';
import {createMallEscalators} from './mall-escalators.mjs';
export {MALL_ART,MALL_MASK,MALL_VIEWS,mallView,mallPose} from './mall-layout.mjs';

const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const fragment=`
uniform sampler2D photograph,surfaces;uniform float t,ready;varying vec2 vUv;
void main(){if(ready<.5){gl_FragColor=vec4(.28,.27,.23,1.);return;}
 vec4 mask=texture2D(surfaces,vUv);vec2 uv=vUv;
 vec3 c=texture2D(photograph,uv).rgb;
 // Local, restrained CRT activity. These are abstract display loops, not films.
 float screen=mask.b;vec2 px=uv*vec2(1672.,941.);
 float scan=.94+.06*sin(px.y*3.14-t*.8);float glow=.5+.5*sin(t*1.2+px.x*.021);
 c=mix(c,c*scan+vec3(.015,.035,.045)*glow,screen);
 gl_FragColor=vec4(c,1.-mask.r);
}`;
export function createMall({mobile=false,loadArt=true,onReady=()=>{},onError=()=>{},elapsed=0}={}){
 const root=new T.Group();root.name='Circa 1990 — mall atrium';
 const uniforms={t:{value:0},photograph:{value:null},surfaces:{value:null},flowAtlas:{value:null},escalatorMask:{value:null},ready:{value:0},viewportHeight:{value:941}};
 const material=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 const shell=new T.Mesh(mallPanel([0,0,1672,941],12),material);shell.name='registered-atrium-architecture';shell.renderOrder=10;shell.frustumCulled=false;root.add(shell);
 const escalators=createMallEscalators(uniforms);root.add(escalators.root);
 const fountain=createMallFountain(uniforms,{mobile});root.add(fountain.root);
 let loaded=0,disposed=false;const textures=[];
 material.addEventListener('dispose',()=>{disposed=true;for(const tex of textures)tex.dispose();});
 if(loadArt){const loader=new T.TextureLoader();for(const [key,url] of [['photograph',MALL_ART],['surfaces',MALL_MASK],['flowAtlas','./assets/mall/liquid-flow.webp'],['escalatorMask','./assets/mall/escalators.png']]){
  const tex=loader.load(url,()=>{if(disposed){tex.dispose();return;}uniforms.ready.value=++loaded===4?1:0;onReady();},undefined,()=>{if(!disposed)onError('The mall artwork could not load. Reconnect and reload to try again.');});
  tex.colorSpace=T.NoColorSpace;tex.generateMipmaps=key!=='flowAtlas';tex.minFilter=key==='flowAtlas'?T.LinearFilter:T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;uniforms[key].value=tex;textures.push(tex);
 }}
 const size=new T.Vector2();
 return {root,uniforms,fountain,escalators,palette:{horizon:'#8e8a7b',fog:'#8e8a7b',fogNear:100, fogFar:1000},setRain(){},setSky(){},configure(){},
  beforeRender(renderer){uniforms.viewportHeight.value=renderer.getDrawingBufferSize(size).y;},
  update(clock){uniforms.t.value=Math.max(0,clock-elapsed);}
 };
}
