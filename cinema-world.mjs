import * as T from './vendor/three.module.js';
import {createCinemaBuilder,CINEMA_FINISH} from './cinema-materials.mjs';
import {elephantGeometryData} from './assets/elephant/geometry.mjs';

export const CINEMA_VIEW=Object.freeze({yaw:-.10,pitch:-.20,fov:51});
export const CINEMA_STATIONS=Object.freeze({
 stairs:{position:[.50,2.67,7.15],yaw:-.10,pitch:-.20,fov:51},
 gallery:{position:[.12,1.63,1.4],yaw:0,pitch:.025,fov:60},
 elephant:{position:[-.9,1.9,1.65],yaw:-1.02,pitch:.14,fov:56},
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
 const rng=(()=>{let s=1927;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);})();
 material('exhibits',{file:'./assets/cinema/exhibit-atlas.png',finish:CINEMA_FINISH.art});
 material('elephant',{file:'./assets/elephant/texture.jpg'});
 material('leaves',{file:'./assets/forest/foliage.png',finish:CINEMA_FINISH.foliage});
 for(const id of ['toys','jurassic','earth','turtle','indy','roger','delorean'])material(id+'-label',{file:`./assets/cinema/${id}-label.svg`,finish:CINEMA_FINISH.art});
 for(const id of ['regent','mcdonalds','facilities'])material(id,{file:`./assets/cinema/${id}.svg`,finish:id==='regent'?0:CINEMA_FINISH.art});
 const cream='#c5b28c',trim='#18191b',vinyl='#782a2d',gold='#b79854';
 // Full gallery architecture. The central stair lands in a 2.3 m clear aisle.
 box(8,.15,20,0,-.08,-6,'#b9b8b3','tile');
 box(.18,3.65,20,-4.05,1.82,-6,cream);box(.18,3.65,20,4.05,1.82,-6,cream);
 box(8.2,.13,22,0,3.68,-5,'#bbb4a4','ceiling');
 for(const x of [-3.98,3.98])box(.04,.13,20,x,.065,-6,'#25231f');
 // The back wall has a discreet side passage rather than a prominent toilet door.
 box(5.28,3.65,.16,-1.4,1.825,-16.1,cream);box(1.08,3.65,.16,3.5,1.825,-16.1,cream);box(1.7,.92,.16,2.06,3.19,-16.1,cream);
 box(.13,3.1,5.5,1.22,1.55,-18.6,'#c2b399');box(.13,3.1,5.5,2.91,1.55,-18.6,'#a9987e');box(1.7,.1,5.5,2.06,-.055,-18.6,'#aba393','tile');box(1.7,.1,5.5,2.06,3.1,-18.6,'#c2bba9');
 box(1.65,3.1,.13,2.07,1.55,-21.4,'#aaa08c');rounded(.88,2.26,.06,.02,2.1,1.15,-21.28,'#38332a');box(.036,.10,.04,2.4,1.14,-21.23,'#bdb9ab','chrome');
 face(.43,.245,2.06,3.0,-15.99,'facilities');
 box(3.5,2.85,.10,-1.66,2.10,-15.98,'#582723');face(3.35,2.72,-1.66,2.10,-15.919,'mcdonalds');
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
 // Left entrance pier with gold Regent wayfinding.
 box(.73,4.55,.23,-1.60,2.27,4.40,'#111a27','mosaic');face(.55,1.21,-1.52,2.24,4.521,'regent');
 box(8,3.2,.18,0,3.0,7.65,cream);box(8,.10,4,0,4.58,6.0,'#c9c0ab','ceiling');

 function planter(x,z,w=1.7){
  rounded(w,.46,.35,.025,x,.72,z,'#cbbd9e');box(w-.065,.035,.30,x,.955,z,'#302b1b');
  for(let i=0;i<Math.ceil(w*20);i++){
   const px=x+(rng()-.5)*(w-.1),py=1.02+rng()*.34,pz=z+(rng()-.5)*.21,a=rng()*Math.PI*2;
   tube([[px,.94,pz],[px+.04*Math.sin(a),py+.13,pz+.04*Math.cos(a)]],.004,'#4b5833','plain',2);
   const g=new T.BufferGeometry(),p=[],uv=[];
   for(let j=0;j<7;j++)for(const [dv,edge] of [[0,-1],[1,-1],[1,1],[0,-1],[1,1],[0,1]]){const t=(j+dv)/7;p.push(edge*Math.sin(t*Math.PI)*.085,t*.28,Math.sin(t*Math.PI)*.028+Math.abs(edge)*.013);uv.push((edge+1)/2,t);}
   g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();add(g,'vinyl',px,py-.08,pz,['#304d26','#466431','#233c23'][i%3],[-.4+rng()*.8,a,-.6+rng()*1.2]);
  }
 }
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
 for(const z of [1.42,-1.25,-3.92,-6.59,-9.26,-11.93]){booth(-2.28,z);booth(2.28,z);}
 for(const z of [2.85,-2.585,-7.92,-13.28]){planter(-2.28,z,1.93);planter(2.28,z,1.93);}
 // A few table settings, kept sparse and free of animated diners.
 for(const [x,z] of [[-2.0,1.42],[2.4,-1.25],[-2.3,-3.92],[2.2,-9.26]]){
  rounded(.40,.019,.29,.012,x,.872,z,'#6f2227','vinyl');box(.30,.003,.22,x,.884,z,'#d8c9ad');
  cylinder(.044,.036,.13,x-.13,.950,z-.025,'#e6dcc4');cylinder(.047,.047,.012,x-.13,1.02,z-.025,'#e9e3d2');tube([[x-.125,1.024,z-.025],[x-.106,1.15,z-.025]],.0025,'#dfd6c4','plain',4);
 }

 function cabinet(id,x,y,z,w,h,yaw,cell=null){
  at(x,y,z,yaw,()=>{
   const depth=id==='toys'?1.32:.79,center=.145-depth/2,back=.145-depth;
   box(w+.10,h+.10,.035,0,0,back,trim);box(w-.03,h-.02,.013,0,0,back+.024,'#151714');
   // Recessed exhibit artwork sits behind a real frame, glazed face and lit shelf.
   if(cell)face(w-.09,h-.41,0,.16,.066,'exhibits','#fff',0,cell);
   for(const sx of [-1,1]){box(.055,h+.11,depth,sx*(w+.025)/2,0,center,'#242321','chrome');box(.009,h-.06,.015,sx*(w-.055)/2,0,.17,gold,'brass');}
   for(const sy of [-1,1])box(w+.10,.05,depth,0,sy*(h+.06)/2,center,'#262622','chrome');
   for(const sx of [-.34,0,.34]){cylinder(.034,.039,.027,sx*w,h/2-.017,-.01,'#bca570','brass');cylinder(.026,.026,.008,sx*w,h/2-.038,-.01,'#ffdc9c','glow');}
   box(w-.08,.013,depth-.06,0,-h/2+.37,center,'#d7b370','brass');
   face(w-.085,.33,0,-h/2+.165,.185,id+'-label');
   face(w-.025,h-.395,0,.185,.189,'glass');
   for(const sx of [-1,1])for(const sy of [-1,1])sphere(.007,.007,.003,sx*(w-.05)/2,sy*(h-.06)/2,.154,'#bbb4a0','chrome');
  });
 }
 cabinet('toys',-3.07,2.27,.30,1.42,2.39,.29);
 at(-3.07,2.27,.30,.29,()=>{
  const data=elephantGeometryData(),g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setAttribute('normal',new T.BufferAttribute(data.normals,3));g.setAttribute('uv',new T.BufferAttribute(data.uvs,2));g.setIndex(new T.BufferAttribute(data.indices,1));g.scale(.38,.38,.38);g.rotateY(-.38);add(g,'elephant',0,-.81,-.46);
 });
 cabinet('jurassic',-3.10,2.34,-3.0,1.5,2.17,.30,[0,0]);cabinet('earth',-3.12,2.36,-6.3,1.4,2.15,.32,[1,0]);
 cabinet('turtle',3.13,2.63,1.2,1.39,1.81,-.29,[2,0]);cabinet('roger',3.03,1.79,-1.0,1.46,1.39,-.29,[1,1]);cabinet('indy',3.10,2.41,-3.15,1.46,2.06,-.29,[0,1]);cabinet('delorean',3.10,2.06,-6.3,1.56,1.66,-.29,[2,1]);
 // Small framed posters beyond the display cases reuse the store's existing art.
 for(const [side,ids] of [[-1,['toys','jurassic-park']],[1,['back-to-the-future','roger-rabbit']]])for(let i=0;i<ids.length;i++){
  const id=ids[i],file=id==='jurassic-park'?'jurassic-park-studio-poster.jpg':id==='back-to-the-future'?'back-to-the-future-studio-poster.jpg':id+'-poster.jpg';material('poster-'+id,{file:'./assets/video-store/catalog/'+file,finish:CINEMA_FINISH.art});
  at(side*3.93,2.33,-10.2-i*2.9,-side*Math.PI/2,()=>{box(.85,1.21,.065,0,0,0,'#28271f','chrome');face(.77,1.13,0,0,.035,'poster-'+id);});
 }
 b.finish({exhibits:['toys','jurassic','earth','turtle','indy','roger','delorean'],steps,aisleWidth:2.3,artworkMode:'3D elephant; illustrated backing panels for the other exhibits',reflectionSize:options.mobile?384:768});
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
