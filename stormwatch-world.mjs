import * as T from './vendor/three.module.js';
import {stormVertex,stormFragment,veilFragment,glassFragment} from './stormwatch-materials.mjs';
import {createStormOcean} from './stormwatch-ocean.mjs';
import {createStormFire} from './stormwatch-fire.mjs';

export const STORM_ART='./assets/stormwatch/refuge.webp';
export const STORM_MASK='./assets/stormwatch/surfaces.png';
export const STORM_SIZE=[1672,941];
export const STORM_VIEWS=Object.freeze({
 refuge:{label:'Refuge',yaw:0,pitch:0,fov:54},
 window:{label:'Storm window',yaw:.27,pitch:.09,fov:38},
 fire:{label:'Fireside',yaw:-.46,pitch:-.12,fov:25}
});
const RAD=Math.PI/180,halfH=Math.tan(28*RAD),halfW=halfH*1672/941;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// The eye stays in the armchair. Restrict the lens to the photographed room;
// turning is perspective-correct, but this is not a free-walking reconstruction.
export function stormView(view,aspect=1672/941){
 const fov=clamp(view.fov,22,Math.min(55.5,2*Math.atan(halfW/Math.max(.1,aspect))/RAD-.3));
 const vertical=fov*RAD/2,horizontal=Math.atan(Math.tan(vertical)*aspect);
 const yawLimit=Math.max(0,Math.atan(halfW)-horizontal-.004);
 let yaw=clamp(view.yaw,-yawLimit,yawLimit),pitch=clamp(view.pitch,-.45,.45);
 const fits=(y,p)=>{
  const sy=Math.sin(y),cy=Math.cos(y),sp=Math.sin(p),cp=Math.cos(p);
  for(const x of [-1,1])for(const v of [-1,1]){
   const a=x*Math.tan(horizontal),b=v*Math.tan(vertical);
   const rx=sy*cp+a*cy-b*sy*sp,ry=sp+b*cp,rz=-cy*cp+a*sy+b*cy*sp;
   if(rz>=0||Math.abs(rx/-rz)>halfW-.001||Math.abs(ry/-rz)>halfH-.001)return false;
  }return true;
 };
 if(!fits(yaw,pitch)){
  let a=0,b=1;for(let i=0;i<12;i++){const m=(a+b)/2;if(fits(yaw*m,pitch*m))a=m;else b=m;}
  yaw*=a;pitch*=a;
 }
 return {yaw,pitch,fov};
}
export function stormPose(view,aspect){
 const v=stormView(view,aspect),c=Math.cos(v.pitch);
 return {...v,position:[0,0,0],direction:[Math.sin(v.yaw)*c,Math.sin(v.pitch),-Math.cos(v.yaw)*c]};
}
export function stormFlash(t,enabled=true){
 if(!enabled)return 0;
 // Distant, short cloud illumination. One event every 47 seconds; no strobe.
 const age=((t-9)%47+47)%47;
 return age<1.4?Math.sin(Math.PI*age/1.4)**2*.52:0;
}
function project(x,y,depth){return new T.Vector3((x/1672*2-1)*halfW*depth,(1-y/941*2)*halfH*depth,-depth);}
function panel(rect,depth,cols=1,rows=1){
 const g=new T.PlaneGeometry(1,1,cols,rows),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const x=rect[0]+uv.getX(i)*(rect[2]-rect[0]),y=rect[3]-uv.getY(i)*(rect[3]-rect[1]);
  const v=project(x,y,typeof depth==='function'?depth(x,y):depth);p.setXYZ(i,v.x,v.y,v.z);uv.setXY(i,x/1672,1-y/941);
 }
 g.computeVertexNormals();return g;
}
export function createStormwatch({mobile=false,loadArt=true,onReady=()=>{},onError=()=>{},elapsed=0}={}){
 const root=new T.Group();root.name='Stormwatch — the sheltered room';
 const uniforms={t:{value:0},photograph:{value:null},surfaces:{value:null},ready:{value:0},rain:{value:1},flash:{value:0},detail:{value:mobile?0:1},viewportHeight:{value:941}};
 let lightning=true,disposed=false,loaded=0;
 const material=new T.ShaderMaterial({uniforms,vertexShader:stormVertex,fragmentShader:stormFragment,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide});
 // Registered depth layers: solid room, closer stove/chair/table, deep windows.
 // Projection preserves the approved composition; all live effects are attached
 // to surfaces rather than to screen coordinates, including when zooming.
 const depth=(x,y)=>x<510&&y>340?3.1:y>690?3.5:x>570&&x<1590&&y<600?8:5.8;
 const shell=new T.Mesh(panel([0,0,1672,941],depth,mobile?64:112,mobile?36:64),material);shell.name='projected-room';shell.renderOrder=10;shell.frustumCulled=false;root.add(shell);
 const ocean=createStormOcean(uniforms,{mobile}),fire=createStormFire(uniforms,{mobile,projectPanel:panel});root.add(ocean.root,fire.root);
 const glass=new T.Mesh(panel([589,0,1580,601],5),new T.ShaderMaterial({uniforms,vertexShader:stormVertex,fragmentShader:glassFragment,transparent:true,depthTest:false,depthWrite:false,toneMapped:false,side:T.DoubleSide}));
 glass.name='closed-rain-glass';glass.renderOrder=20;glass.frustumCulled=false;root.add(glass);
 const effects=[
  {name:'cup-steam',rect:[910,535,1030,682],depth:2.9,kind:0,seed:0}
 ];
 for(const e of effects){
  const u={...uniforms,kind:{value:e.kind},seed:{value:e.seed},boundsA:{value:new T.Vector2(e.rect[0],e.rect[1])},boundsB:{value:new T.Vector2(e.rect[2],e.rect[3])}};
  const m=new T.ShaderMaterial({uniforms:u,vertexShader:stormVertex,fragmentShader:veilFragment,transparent:true,depthWrite:false,depthTest:false,toneMapped:false,side:T.DoubleSide});
  const mesh=new T.Mesh(panel(e.rect,e.depth),m);mesh.name=e.name;mesh.renderOrder=25;mesh.frustumCulled=false;root.add(mesh);
 }
 const textures=[];
 material.addEventListener('dispose',()=>{disposed=true;for(const tex of textures)tex.dispose();});
 if(loadArt){const loader=new T.TextureLoader();
  for(const [key,url] of [['photograph',STORM_ART],['surfaces',STORM_MASK]]){
   const tex=loader.load(url,()=>{if(disposed){tex.dispose();return;}loaded++;uniforms.ready.value=loaded===2?1:0;onReady();},undefined,()=>{if(!disposed)onError('Stormwatch could not load its scenery. Reconnect and reload to try again.');});
   tex.colorSpace=T.NoColorSpace;tex.minFilter=T.LinearMipmapLinearFilter;tex.magFilter=T.LinearFilter;uniforms[key].value=tex;textures.push(tex);
  }
 }
 const screenSize=new T.Vector2();
 return {root,uniforms,ocean,fire,palette:{horizon:'#334a54',fog:'#334a54',fogNear:2000,fogFar:18000},
  beforeRender(renderer){uniforms.viewportHeight.value=renderer.getDrawingBufferSize(screenSize).y;},
  setRain(value){uniforms.rain.value=value?1:0;},setSky(){},
  configure(settings){uniforms.rain.value=settings.stormRain===false?0:1;lightning=settings.stormLightning!==false;},
  update(clock){const t=Math.max(0,clock-elapsed);uniforms.t.value=t;uniforms.flash.value=stormFlash(t,lightning);}
 };
}
