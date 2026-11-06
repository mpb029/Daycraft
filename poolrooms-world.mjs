import * as T from './vendor/three.module.js';
import {poolMaterials} from './poolrooms-materials.mjs';
import {buildPoolArchitecture,buildManta,buildCurtain,RAY,POOL_STATIONS,poolPose} from './poolrooms-geometry.mjs';
export {POOL_STATIONS,poolPose};
export const POOL_ART='./assets/poolrooms/beyond-the-bend.webp';
export const POOL_LIGHT='./assets/poolrooms/indoor-light.png';
const ASPECT=1672/941;
const viewMatrix=c=>new T.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse);
export function poolReferenceCamera(){
 const s=POOL_STATIONS.bend,c=new T.PerspectiveCamera(s.fov,ASPECT,.1,1800),p=poolPose(s);
 c.position.fromArray(p.position);c.lookAt(c.position.clone().add(new T.Vector3(...p.direction)));c.updateMatrixWorld();return c;
}
export function poolMirror(camera){
 const m=camera.clone(),d=camera.getWorldDirection(new T.Vector3());m.position.y=-camera.position.y;d.y=-d.y;m.up.set(0,-1,0);
 m.lookAt(m.position.clone().add(d));m.updateMatrixWorld();return m;
}
function poolSpray(material,mobile){
 const count=mobile?28:48,positions=new Float32Array(count*3),seeds=new Float32Array(count*3);
 const rand=n=>{const x=Math.sin(n*127.13+31.71)*43758.5453;return x-Math.floor(x);};
 for(let i=0;i<count;i++){
  const a=rand(i+1),b=rand(i+81),c=rand(i+170);
  positions.set([RAY.dropX+(a-.5)*RAY.width,.009,RAY.dropZ+(b-.5)*.12],i*3);seeds.set([a,b,c],i*3);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('seed',new T.BufferAttribute(seeds,3));
 const spray=new T.Points(g,material);spray.name='Spillway droplets';spray.frustumCulled=false;spray.renderOrder=5;return spray;
}
export function createPoolrooms({mobile=false,onReady=()=>{},loadArt=true}={}){
 const root=new T.Group();root.name='Poolrooms · Beyond the Bend';
 const reference=poolReferenceCamera();
 const U={lightReady:{value:0},irradiance:{value:null},t:{value:0},viewportHeight:{value:941},impact:{value:new T.Vector2(RAY.dropX,RAY.dropZ)},photoMatrix:{value:viewMatrix(reference)},plateReady:{value:0},photograph:{value:null},reflectPass:{value:0},mirrorMatrix:{value:new T.Matrix4()},reflected:{value:null},refracted:{value:null}};
 const mat=poolMaterials(U),room=buildPoolArchitecture(mat.room),ray=buildManta(mat.room),fall=buildCurtain(mat.fall);
 const surface=new T.PlaneGeometry(21.17,33.25,mobile?28:48,mobile?40:68);
 surface.rotateX(-Math.PI/2);surface.translate(.42,0,-7.52);
 const water=new T.Mesh(surface,mat.water);water.name='Refracting pool surface';water.renderOrder=2;
 const spray=poolSpray(mat.spray,mobile);
 root.add(room,ray,water,fall,spray);
 const makeRT=()=>new T.WebGLRenderTarget(1,1,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false,depthBuffer:true,stencilBuffer:false});
 const reflection=makeRT(),transmission=makeRT(),signature=new T.Matrix4(),previousProjection=new T.Matrix4(),size=new T.Vector2();
 let valid=false,disposed=false,art=null,artReady=false,lighting=null;
 if(typeof document!=='undefined'&&document.createElementNS){
  lighting=new T.TextureLoader().load(new URL(POOL_LIGHT,import.meta.url).href,texture=>{
   if(disposed)return;
   texture.colorSpace=T.NoColorSpace;texture.flipY=false;texture.generateMipmaps=false;
   texture.minFilter=T.LinearFilter;texture.magFilter=T.LinearFilter;texture.needsUpdate=true;
   U.irradiance.value=texture;U.lightReady.value=1;invalidate();onReady();
  },undefined,()=>{});
 }
 if(loadArt&&typeof document!=='undefined'&&document.createElementNS){
  art=new T.TextureLoader().load(new URL(POOL_ART,import.meta.url).href,texture=>{
   if(disposed)return;
   texture.colorSpace=T.NoColorSpace;U.photograph.value=texture;artReady=true;onReady();
  },undefined,()=>{if(!disposed)onReady();}); // Chromatic room materials work without the photograph.
 }
 function invalidate(){valid=false;}
 function beforeRender(renderer,scene,camera){
  if(disposed)return;
  camera.updateMatrixWorld();
  const distance=reference.position.distanceTo(camera.position);
  const weight=artReady?1-T.MathUtils.smoothstep(distance,.12,1.1):0;
  U.plateReady.value=weight;
  renderer.getDrawingBufferSize(size);
  U.viewportHeight.value=size.y;
  const maxSide=mobile?416:704,scale=Math.min(1,maxSide/Math.max(1,size.x,size.y));
  const w=Math.max(1,Math.round(size.x*scale)),h=Math.max(1,Math.round(size.y*scale));
  if(w!==reflection.width||h!==reflection.height){reflection.setSize(w,h);transmission.setSize(w,h);valid=false;}
  if(valid&&signature.equals(camera.matrixWorld)&&previousProjection.equals(camera.projectionMatrix))return;
  // The architecture is stationary. Capture the two water buffers only when
  // the camera/lens changes. Ripples, sheet and surface caustics run in the final pass.
  const target=renderer.getRenderTarget(),oldShadows=renderer.shadowMap.enabled;
  const wasWater=water.visible,wasFall=fall.visible,wasSpray=spray.visible;valid=false;
  water.visible=false;fall.visible=false;spray.visible=false;U.plateReady.value=0;renderer.shadowMap.enabled=false;
  try{
   const mirror=poolMirror(camera);
   U.reflectPass.value=1;renderer.setRenderTarget(reflection);renderer.render(scene,mirror);
   U.mirrorMatrix.value.copy(viewMatrix(mirror));U.reflected.value=reflection.texture;
   U.reflectPass.value=0;renderer.setRenderTarget(transmission);renderer.render(scene,camera);
   U.refracted.value=transmission.texture;signature.copy(camera.matrixWorld);previousProjection.copy(camera.projectionMatrix);valid=true;
  }finally{
   U.reflectPass.value=0;U.plateReady.value=weight;water.visible=wasWater;fall.visible=wasFall;spray.visible=wasSpray;renderer.setRenderTarget(target);renderer.shadowMap.enabled=oldShadows;
  }
 }
 mat.water.addEventListener('dispose',()=>{disposed=true;reflection.dispose();transmission.dispose();art?.dispose();lighting?.dispose();});
 return {root,water,fall,spray,uniforms:U,palette:{horizon:'#8b9e8d',fog:'#889a8b',fogNear:85,fogFar:145},dome:null,setSky(){},setRain(){},update(elapsed){if(Number.isFinite(elapsed)&&elapsed>=0)U.t.value=elapsed;},beforeRender,invalidate};
}
