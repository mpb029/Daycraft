import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createItem,createLights,disposeGroup,onItemAssetsChanged} from './world-models.mjs';
import {createMeadow,createMeadowLights,terrainHeight} from './meadow-terrain.mjs';
import {createAtmosphere} from './meadow-atmosphere.mjs';
import {footprint,BUILD_RADIUS} from './world-rules.mjs';
let main=null,previewRenderer=null,previewFailed=false;
const previews=new Map();
function newRenderer(extra={}){const r=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power',...extra});r.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.5));r.outputColorSpace=T.SRGBColorSpace;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=1.06;return r;}
export function previewImage(id){if(previews.has(id))return previews.get(id);if(previewFailed)return null;let scene;
 try{previewRenderer??=newRenderer({preserveDrawingBuffer:true});previewRenderer.setPixelRatio(1);previewRenderer.setSize(280,210,false);previewRenderer.setClearColor('#e9eee1',0);scene=new T.Scene();createLights(scene,false);const model=createItem(id);scene.add(model);const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());const span=Math.max(size.x,size.z,size.y)*.84+.35;const camera=new T.OrthographicCamera(-span*4/3,span*4/3,span,-span,.1,100);camera.position.set(center.x+8,center.y+6,center.z+10);camera.lookAt(center);previewRenderer.render(scene,camera);const url=previewRenderer.domElement.toDataURL('image/png');previews.set(id,url);return url;}catch{previewFailed=true;return null;}finally{if(scene)disposeGroup(scene);}
}
function grid(){const points=[];for(let n=-13;n<=13;n++){const reach=Math.sqrt(BUILD_RADIUS**2-n*n);points.push(n,.014,-reach,n,.014,reach,-reach,.014,n,reach,.014,n);}const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(points,3));return new T.LineSegments(geom,new T.LineBasicMaterial({color:'#466553',transparent:true,opacity:.2}));}
function preset(m,mode='field'){
 m.mode=mode;m.camera.zoom=1;m.controls.target.set(0,mode==='field'?1.4:0,0);
 if(mode==='field')m.camera.position.set(15,6.8,28);
 if(mode==='arrange')m.camera.position.set(24,33,34);
 if(mode==='top')m.camera.position.set(.1,43,.1);
 m.camera.updateProjectionMatrix();m.controls.update();m.draw?.();
}
function createMain(){
 const renderer=newRenderer();renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const scene=new T.Scene(),sun=createMeadowLights(scene),atmosphere=createAtmosphere({mobile:(globalThis.innerWidth||1000)<720});scene.add(atmosphere.root);
 const camera=new T.PerspectiveCamera(54,1,.1,1800);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enablePan=false;controls.minPolarAngle=.04;controls.maxPolarAngle=Math.PI*.49;controls.minDistance=8;controls.maxDistance=90;
 const raycaster=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,1,0),0),pointer=new T.Vector2();
 const state={renderer,scene,camera,controls,sun,atmosphere,elapsed:0,root:null,field:null,fieldKey:'',host:null,config:null,frame:0,dirty:true,lastFrame:0,inView:true,lost:false,observer:null,intersection:null,pointers:new Map(),multi:false,lastIsland:null,lastDraft:false,lastEditable:false,mode:'field'};
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 const visible=()=>state.host?.isConnected&&state.inView&&!document.hidden&&!state.lost;
 const moving=()=>!!state.config&&!state.config.state.settings.calm&&!reduced?.matches;
 function tick(now){
  state.frame=0;if(!visible()){state.lastFrame=0;return;}
  const motion=moving();
  if(state.dirty||now-state.lastFrame>=1000/24){
   if(motion&&state.lastFrame)state.elapsed+=Math.min(.15,(now-state.lastFrame)/1000);
   state.field?.grass.update(state.elapsed,motion&&state.config.breeze,!!state.config?.draft);
   state.atmosphere.update(state.elapsed,{camera,motion,breeze:state.config.breeze,raining:!!state.config.state.settings.rain,editing:!!state.config.draft});
   renderer.render(scene,camera);state.dirty=false;state.lastFrame=now;
  }
  if(motion)state.frame=requestAnimationFrame(tick);
 }

 state.draw=()=>{state.dirty=true;if(!state.frame&&visible())state.frame=requestAnimationFrame(tick);};
 state.stop=()=>{if(state.frame)cancelAnimationFrame(state.frame);state.frame=0;state.lastFrame=0;};
 onItemAssetsChanged(message=>{state.config?.onAssetStatus?.(message);state.draw();});
 controls.addEventListener('change',()=>{const floor=terrainHeight(camera.position.x,camera.position.z)+1.9;if(camera.position.y<floor){camera.position.y=floor;camera.lookAt(controls.target);}state.draw();});
 preset(state);
 function resize(){if(!state.host)return;const {width,height}=state.host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();state.draw();}
 state.resize=resize;state.observer=new ResizeObserver(resize);
 if(typeof IntersectionObserver==='function')state.intersection=new IntersectionObserver(entries=>{state.inView=entries.some(e=>e.isIntersecting);if(state.inView)state.draw();else state.stop();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)state.stop();else state.draw();});reduced?.addEventListener?.('change',()=>state.draw());
 const canvas=renderer.domElement;canvas.setAttribute('aria-label','3D green meadow with rolling hills and long grass. Drag to look around, pinch or scroll to zoom. Use Arrange for placement.');canvas.setAttribute('role','img');
 renderer.debug.onShaderError=()=>state.config?.onError('This device could not draw the 3D meadow. Tasks, inventory and coordinate placement are still available.');
 canvas.addEventListener('webglcontextlost',ev=>{ev.preventDefault();state.lost=true;state.stop();state.config?.onError('The 3D view paused. Reload to restore it. Your saved world is safe.');});
 canvas.addEventListener('webglcontextrestored',()=>{state.lost=false;state.draw();});
 canvas.addEventListener('pointerdown',ev=>{state.pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY,moved:false});if(state.pointers.size>1)state.multi=true;},true);
 canvas.addEventListener('pointermove',ev=>{const p=state.pointers.get(ev.pointerId);if(p&&Math.hypot(ev.clientX-p.x,ev.clientY-p.y)>8)p.moved=true;},true);
 canvas.addEventListener('pointercancel',ev=>{state.pointers.delete(ev.pointerId);if(!state.pointers.size)state.multi=false;},true);
 canvas.addEventListener('pointerup',ev=>{const p=state.pointers.get(ev.pointerId),tap=p&&!p.moved&&!state.multi&&ev.button===0;state.pointers.delete(ev.pointerId);if(!state.pointers.size)state.multi=false;if(!tap||!state.config?.editable)return;
  const r=canvas.getBoundingClientRect();pointer.set((ev.clientX-r.left)/r.width*2-1,-(ev.clientY-r.top)/r.height*2+1);scene.updateMatrixWorld(true);camera.updateMatrixWorld();raycaster.setFromCamera(pointer,camera);
  if(state.config.draft){const spot=raycaster.ray.intersectPlane(plane,new T.Vector3());if(spot)state.config.onSpot(Math.round(spot.x),Math.round(spot.z));}
  else{const hits=raycaster.intersectObjects(state.root.children,true);for(const hit of hits){let obj=hit.object;while(obj&&!obj.userData.instanceId)obj=obj.parent;if(obj?.userData.instanceId){state.config.onSelect(obj.userData.instanceId);break;}}}
 },true);
 return state;
}
export function mountScene(host,config){
 if(!host){if(main){main.stop();main.host=null;main.observer.disconnect();main.intersection?.disconnect();}return;}
 try{main??=createMain();const m=main;m.observer.disconnect();m.intersection?.disconnect();m.host=host;m.config=config;m.inView=true;host.replaceChildren(m.renderer.domElement);m.observer.observe(host);m.intersection?.observe(host);m.controls.enabled=true;
  const placed=config.state.builds.filter(b=>b.placement?.islandId===config.island.id);
  const fieldKey=JSON.stringify([config.island.id,config.island.theme,placed.map(b=>[b.id,b.placement])]);
  if(m.fieldKey!==fieldKey){if(m.field){m.scene.remove(m.field.root);disposeGroup(m.field.root);}m.field=createMeadow({theme:config.island.theme,placed,grassCount:(globalThis.innerWidth||1000)<720?46000:78000});m.scene.add(m.field.root);m.fieldKey=fieldKey;const p=m.field.palette;m.scene.background=new T.Color(p.horizon);m.scene.fog=new T.Fog(p.fog,p.fogNear,p.fogFar);}
  const wet=!!config.state.settings.rain;m.field.setRain(wet);m.sun.intensity=wet?.75:1.9;const palette=m.field.palette;m.scene.fog.color.set(wet?'#b3c5c9':palette.fog);m.scene.fog.near=wet?65:palette.fogNear;m.scene.fog.far=wet?310:palette.fogFar;
  if(m.root){m.scene.remove(m.root);disposeGroup(m.root);}m.root=new T.Group();m.scene.add(m.root);
  if(m.lastIsland!==config.island.id)preset(m,'field');
  if(config.draft&&!m.lastDraft)preset(m,'arrange');m.lastDraft=!!config.draft;m.lastIsland=config.island.id;m.lastEditable=!!config.editable;
  for(const b of placed){if(b.instanceId===config.draft?.instanceId)continue;const item=createItem(b.id);item.position.set(b.placement.x,0,b.placement.z);item.rotation.y=b.placement.rotation*Math.PI/180;item.userData.instanceId=b.instanceId;m.root.add(item);}
  if(config.draft){m.root.add(grid());const b=config.state.builds.find(b=>b.instanceId===config.draft.instanceId);if(b){const p=config.draft.placement,item=createItem(b.id);item.position.set(p.x,.06,p.z);item.rotation.y=p.rotation*Math.PI/180;item.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.72;o.material.depthWrite=false;o.castShadow=false;}});m.root.add(item);const [w,d]=footprint(b.id,p.rotation);const pad=new T.Mesh(new T.PlaneGeometry(w+.14,d+.14),new T.MeshBasicMaterial({color:config.error?'#d78466':'#bfd496',transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide}));pad.rotation.x=-Math.PI/2;pad.position.set(p.x,.04,p.z);m.root.add(pad);}}
  m.resize();m.draw();return true;
 }catch{config.onError?.('The 3D meadow could not open on this device. Tasks and coordinate placement still work. Try an up-to-date browser with WebGL 2 and graphics acceleration.');return false;}
}
export function cameraAction(action){if(!main)return;const {controls,camera}=main;if(['field','arrange','top','reset'].includes(action)){preset(main,action==='reset'?'field':action);return;}if(action==='left'||action==='right')camera.position.sub(controls.target).applyAxisAngle(T.Object3D.DEFAULT_UP,action==='left'?Math.PI/8:-Math.PI/8).add(controls.target);if(action==='in'||action==='out'){camera.position.sub(controls.target).multiplyScalar(action==='in'?.82:1.22).add(controls.target);}controls.update();main.draw();}
