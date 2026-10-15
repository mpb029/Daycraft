import * as T from './vendor/three.module.js';
import {createCinemaBuilder,CINEMA_FINISH} from './cinema-materials.mjs';
import {addMaccasMascots} from './maccas-mascots.mjs';
import {addMaccasPlants} from './maccas-plants.mjs';

export const CINEMA_VIEW=Object.freeze({yaw:0,pitch:-.22,fov:55});
export const CINEMA_STATIONS=Object.freeze({
 stairs:{position:[0,2.87,6.65],yaw:0,pitch:-.22,fov:55},
 gallery:{position:[.12,1.63,1.4],yaw:0,pitch:.025,fov:60},
 ronald:{position:[-.45,1.65,2.90],yaw:-.96,pitch:-.30,fov:61},
 booths:{position:[.55,1.33,-4.8],yaw:-.3,pitch:.045,fov:61}
});
export function cinemaCameraPose(view=CINEMA_VIEW,station='stairs'){
 const s=CINEMA_STATIONS[station]||CINEMA_STATIONS.stairs,c=Math.cos(view.pitch);
 return {position:s.position.slice(),direction:[Math.sin(view.yaw)*c,Math.sin(view.pitch),-Math.cos(view.yaw)*c]};
}
export function cinemaMirror(camera){
 const mirror=camera.clone(),direction=camera.getWorldDirection(new T.Vector3());mirror.position.y*=-1;direction.y*=-1;mirror.up.set(0,-1,0);mirror.lookAt(mirror.position.clone().add(direction));mirror.updateMatrixWorld();return mirror;
}
export function createCinema(options={}){
 let invalidateReflection=()=>{};
 const b=createCinemaBuilder({...options,onReady:()=>{invalidateReflection();options.onReady?.();}}),{root,material,add,box,rounded,face,tube,sphere,cylinder,at}=b;
 for(const id of ['welcome','mcdonalds','facilities'])material(id,{file:`./assets/cinema/${id}.svg`,finish:CINEMA_FINISH.art});
 const cream='#d3c8ad',vinyl='#782a2d';
 // The original restaurant architecture. The central stair lands in a 2.3 m clear aisle.
 box(8,.15,20,0,-.08,-6,'#b9b8b3','tile');
 box(.18,3.65,20,-4.05,1.82,-6,cream);box(.18,3.65,20,4.05,1.82,-6,cream);
 box(8.2,.13,22,0,3.68,-5,'#bbb4a4','ceiling');
 for(const x of [-3.98,3.98])box(.04,.13,20,x,.065,-6,'#25231f');
 // The back wall has a discreet side passage rather than a prominent toilet door.
 box(5.28,3.65,.16,-1.4,1.825,-16.1,cream);box(1.08,3.65,.16,3.5,1.825,-16.1,cream);box(1.7,.92,.16,2.06,3.19,-16.1,cream);
 box(.13,3.1,5.5,1.22,1.55,-18.6,'#c2b399');box(.13,3.1,5.5,2.91,1.55,-18.6,'#a9987e');box(1.7,.1,5.5,2.06,-.055,-18.6,'#aba393','tile');box(1.7,.1,5.5,2.06,3.1,-18.6,'#c2bba9');
 box(1.65,3.1,.13,2.07,1.55,-21.4,'#aaa08c');rounded(.88,2.26,.06,.02,2.1,1.15,-21.28,'#38332a');box(.036,.10,.04,2.4,1.14,-21.23,'#bdb9ab','chrome');
 face(.43,.245,2.06,3.0,-15.99,'facilities');
 rounded(3.22,1.30,.095,.035,-1.66,2.36,-15.98,'#9a7549','wood');face(3.08,1.16,-1.66,2.36,-15.92,'mcdonalds');
 for(const z of [2.0,-1.15,-4.3,-7.45,-10.6,-13.75]){
  box(2.18,.048,.68,0,3.576,z,'#6d685d','chrome');box(2.09,.026,.59,0,3.541,z,'#faf2db','glow');
  for(const x of [-2.85,2.85]){cylinder(.098,.098,.038,x,3.566,z,'#7c7160','chrome');cylinder(.071,.071,.006,x,3.542,z,'#ffe2b2','glow');}
 }
 for(const z of [-17.1,-19.5])box(.77,.03,.28,2.06,3.024,z,'#eadab7','glow');
 // Sprinklers, smoke detector and ceiling ventilation break the perfect grid.
 for(const z of [-3,-10]){cylinder(.047,.047,.034,.9,3.59,z,'#c6b894','chrome');sphere(.015,.031,.015,.9,3.553,z,'#743021');}
 cylinder(.10,.12,.027,-.8,3.582,-7.2,'#dfd8c8');
 for(const x of [-2.3,2.3]){box(.58,.02,.58,x,3.591,-11,'#b6b2a5');for(let j=0;j<13;j++)box(.51,.026,.012,x,3.574,-11.25+j*.041,'#5d5c52');}

 // Seven individual risers, tiled cheeks and polished stainless handrails.
 const steps=7,rise=.175,run=.30,landingZ=3.10;
 for(let i=0;i<steps;i++){
  const h=(i+1)*rise,z=landingZ+i*run;
  box(2.14,h,run,0,h/2,z,'#191d28','mosaic');box(2.14,.014,.018,0,h+.006,z-run/2+.014,'#969180','chrome');
 }
 box(2.14,1.225,2.5,0,.6125,6.25,'#171b27','mosaic');
 function cheek(sign){
  const vertices=[sign*1.12,0,2.90,sign*1.12,1.00,2.90,sign*1.12,2.26,5.06,sign*1.12,2.26,7.55,sign*1.12,0,7.55];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,0,1,1,2,2,2,2,0],2));g.setIndex([0,1,2,0,2,3,0,3,4]);g.computeVertexNormals();add(g,'mosaic');
  tube([[sign*1.07,1.04,2.83],[sign*1.07,1.09,3.00],[sign*1.07,2.27,5.03],[sign*1.07,2.3,5.23],[sign*1.07,2.3,7.5]],.046,'#d3d4d0','chrome',64);
  tube([[sign*1.07,.70,2.85],[sign*1.07,1.94,5.08],[sign*1.07,1.96,7.5]],.020,'#bdbfb9','chrome');
  for(const [z,h] of [[2.93,1.05],[4.04,1.66],[5.23,2.27],[6.4,2.27]]){cylinder(.022,.022,.87,sign*1.07,h-.435,z,'#c1c1b7','chrome');cylinder(.059,.059,.016,sign*1.07,h-.871,z,'#a5a79e','chrome');}
 }
 cheek(-1);cheek(1);
 // Keep the original entrance pier; replace the cinema wayfinding with a small restaurant plaque.
 box(.73,4.55,.23,-1.60,2.27,4.40,'#111a27','mosaic');rounded(.53,.83,.025,.012,-1.52,2.29,4.53,'#a78654','wood');face(.48,.77,-1.52,2.29,4.546,'welcome');
 box(8,3.2,.18,0,3.0,7.65,cream);box(8,.10,4,0,4.58,6.0,'#c9c0ab','ceiling');

 function booth(x,z){
  // Paired facing seats with rounded vinyl piping, timber skirts and black plinths.
  for(const sign of [-1,1]){
   const zz=z+sign*.89;
   rounded(1.91,.24,.55,.016,x,.13,zz,'#18191a');rounded(1.92,.44,.62,.025,x,.40,zz,'#b99757','wood');
   rounded(1.94,.17,.65,.055,x,.645,zz,'#883037','vinyl');rounded(1.94,.75,.19,.063,x,1.015,zz+sign*.27,vinyl,'vinyl');
   for(const sx of [-.92,0,.92])tube([[x+sx,.73,zz+sign*.164],[x+sx,1.26,zz+sign*.164],[x+sx,1.34,zz+sign*.20]],.004,'#b0504c','vinyl',12);
   tube([[x-.9,1.39,zz+sign*.265],[x,1.395,zz+sign*.265],[x+.9,1.39,zz+sign*.265]],.005,'#ac524a','vinyl');
   for(const sx of [-.8,.8])box(.07,.18,.055,x+sx,.1,zz+.21,'#0f1111');
  }
  cylinder(.045,.045,.76,x,.4,z,'#292928','chrome');cylinder(.23,.29,.037,x,.035,z,'#1d2020','chrome');
  rounded(1.95,.074,.75,.035,x,.82,z,'#d0b171','wood');
 }
 for(const z of [-1.25,-3.92,-6.59,-9.26,-11.93]){booth(-2.28,z);booth(2.28,z);}
 // The front two bays are welcoming character nooks, with the dining rows intact.
 rounded(.54,.43,1.8,.035,3.54,.25,1.20,'#a28659','wood');
 rounded(.58,.15,1.83,.055,3.54,.54,1.20,'#883037','vinyl');
 rounded(.16,.82,1.86,.065,3.85,.87,1.20,vinyl,'vinyl');
 rounded(1.50,.43,.73,.035,3.02,.25,.86,'#a28659','wood');
 rounded(1.54,.15,.77,.055,3.02,.54,.86,'#883037','vinyl');
 rounded(1.55,.76,.17,.060,3.02,.98,.47,vinyl,'vinyl');
 const planting=addMaccasPlants(b);
 const mascots=addMaccasMascots(b);
 // A few table settings, kept sparse and free of animated diners.
 for(const [x,z] of [[2.4,-1.25],[-2.3,-3.92],[2.2,-9.26]]){
  rounded(.40,.019,.29,.012,x,.872,z,'#6f2227','vinyl');box(.30,.003,.22,x,.884,z,'#d8c9ad');
  cylinder(.044,.036,.13,x-.13,.950,z-.025,'#e6dcc4');cylinder(.047,.047,.012,x-.13,1.02,z-.025,'#e9e3d2');tube([[x-.125,1.024,z-.025],[x-.106,1.15,z-.025]],.0025,'#dfd6c4','plain',4);
 }

 // Low timber dado, burgundy trim and simple opal wall lights replace every display.
 for(const side of [-1,1]){
  box(.045,1.07,19.7,side*3.94,.57,-6,'#a28659','wood');
  box(.055,.055,19.7,side*3.91,1.14,-6,'#692b31','vinyl');
  box(.056,.026,19.7,side*3.91,1.20,-6,'#c8ae7e','wood');
  for(let i=0;i<23;i++)box(.06,.96,.013,side*3.90,.57,3.75-i*.86,'#766142','wood');
  for(const z of [-.65,-6.85,-13.05])at(side*3.91,2.65,z,-side*Math.PI/2,()=>{
   rounded(.16,.25,.045,.025,0,0,0,'#8a784d','brass');
   tube([[0,-.04,.02],[0,-.11,.13],[0,-.07,.20]],.014,'#ae9763','brass',10);
   sphere(.115,.125,.10,0,.035,.17,'#ede4c7','glow');
  });
 }
 b.finish({mascots,planting,steps,aisleWidth:2.3,artworkMode:'Sculpted fibreglass mascots; no movie displays',reflectionSize:options.mobile?384:768});
 const floor=root.children.find(o=>o.name==='tile'),size=root.userData.reflectionSize;
 const reflection=new T.WebGLRenderTarget(size,size,{depthBuffer:true});reflection.texture.colorSpace=T.LinearSRGBColorSpace;
 const signature=new T.Matrix4(),lastProjection=new T.Matrix4();let valid=false;
 function invalidate(){valid=false;}
 function beforeRender(renderer,scene,camera){
  camera.updateMatrixWorld();if(valid&&signature.equals(camera.matrixWorld)&&lastProjection.equals(camera.projectionMatrix))return;
  valid=false;const mirror=cinemaMirror(camera),previous=renderer.getRenderTarget(),wasVisible=floor.visible,oldMap=b.reflection.reflectionMap.value;
  b.reflection.reflectionReady.value=0;b.reflection.reflectionMap.value=null;floor.visible=false;
  try{renderer.setRenderTarget(reflection);renderer.render(scene,mirror);b.reflection.reflectionMap.value=reflection.texture;b.reflection.reflectionMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);b.reflection.reflectionReady.value=1;signature.copy(camera.matrixWorld);lastProjection.copy(camera.projectionMatrix);valid=true;}
  finally{floor.visible=wasVisible;if(!valid)b.reflection.reflectionMap.value=oldMap;renderer.setRenderTarget(previous);}
 }
 // Texture readiness requests redraw; invalidate the reflected view as well.
 invalidateReflection=invalidate;
 b.materials[0].addEventListener('dispose',()=>reflection.dispose());
 return {root,floor,uniforms:b.reflection,palette:{horizon:'#29231e',fog:'#29231e',fogNear:60,fogFar:120},dome:null,setRain(){},setSky(){},update(){},beforeRender,invalidate};
}
