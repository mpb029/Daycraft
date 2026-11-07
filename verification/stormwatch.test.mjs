import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createStormwatch,STORM_VIEWS,stormPose,stormFlash} from '../stormwatch-world.mjs';
import {initialState,validateState} from '../domain.mjs';
import {backgroundRain} from '../backgrounds.mjs';
import {disposeGroup} from '../world-models.mjs';
import {sampleStormSea,SEA_LEVEL,MAX_STORM_RISE,STORM_WAVES} from '../stormwatch-waves.mjs';

test('Stormwatch backup keeps separate weather preferences and all existing progress',()=>{
 const original=initialState();original.settings.rain=false;original.settings.background='stormwatch';
 original.settings.stormRain=true;original.settings.stormLightning=false;
 const copy=validateState(JSON.parse(JSON.stringify(original)));
 assert.equal(copy.settings.background,'stormwatch');assert.equal(backgroundRain(copy.settings),true);
 assert.equal(copy.settings.stormLightning,false);assert.deepEqual(copy.islands,original.islands);
 copy.settings.background='meadow';assert.equal(backgroundRain(copy.settings),false);
 const old=initialState();delete old.settings.stormRain;delete old.settings.stormLightning;
 const restored=validateState(old);assert.equal(restored.settings.stormRain,true);assert.equal(restored.settings.stormLightning,true);
});

test('Dragging and zooming on desktop, portrait and ultrawide never leave the shelter artwork',()=>{
 const field=createStormwatch({loadArt:false}),ray=new T.Raycaster();field.root.updateMatrixWorld(true);
 const views=[...Object.values(STORM_VIEWS)];
 for(let i=0;i<30;i++)views.push({yaw:(i%7-3)*.8,pitch:(i%5-2)*.6,fov:22+i*2});
 for(const aspect of [390/844,844/390,16/9,32/9])for(const view of views){
  const p=stormPose(view,aspect),cam=new T.PerspectiveCamera(p.fov,aspect,.1,1800);
  cam.position.fromArray(p.position);cam.lookAt(new T.Vector3(...p.direction));cam.updateMatrixWorld(true);
  assert.deepEqual(p.position,[0,0,0],'the camera must stay still inside');
  for(const x of [-.999,.999])for(const y of [-.999,.999]){
   ray.setFromCamera(new T.Vector2(x,y),cam);
   assert.ok(ray.intersectObject(field.root.children[0]).length,JSON.stringify({aspect,view,p,x,y}));
  }
 }
 disposeGroup(field.root);
});

test('All effects share the paused viewing clock and lightning obeys its switch',()=>{
 const field=createStormwatch({loadArt:false,elapsed:100});
 field.configure({stormRain:true,stormLightning:true});field.update(109.7);
 const time=field.uniforms.t.value,flash=field.uniforms.flash.value;assert.ok(flash>.4);
 field.root.traverse(mesh=>{if(mesh.material){assert.equal(mesh.material.uniforms.t,field.uniforms.t);assert.equal(mesh.material.uniforms.flash,field.uniforms.flash);}});
 field.update(109.7);assert.equal(field.uniforms.t.value,time);assert.equal(field.uniforms.flash.value,flash);
 field.configure({stormRain:false,stormLightning:false});field.update(109.7);
 assert.equal(field.uniforms.flash.value,0);assert.equal(field.uniforms.rain.value,0);
 assert.equal(stormFlash(0),0);assert.equal(stormFlash(14),0);assert.ok(stormFlash(56.7)>.4);
 disposeGroup(field.root);
});

test('Modelled waves move in three dimensions and their normals agree with independent finite differences',()=>{
 const eps=.0001;let low=100,high=-100,horizontal=0;
 for(let i=0;i<240;i++){
  const x=45+(i*17.31)%400,z=-60-(i*23.17)%800,t=i*.217;
  const a=sampleStormSea(x,z,t),xp=sampleStormSea(x+eps,z,t),xm=sampleStormSea(x-eps,z,t),zp=sampleStormSea(x,z+eps,t),zm=sampleStormSea(x,z-eps,t);
  low=Math.min(low,a.position[1]);high=Math.max(high,a.position[1]);horizontal=Math.max(horizontal,Math.hypot(a.position[0]-x,a.position[2]-z));
  for(let j=0;j<3;j++){
   assert.ok(Math.abs(a.dx[j]-(xp.position[j]-xm.position[j])/(2*eps))<.00001);
   assert.ok(Math.abs(a.dz[j]-(zp.position[j]-zm.position[j])/(2*eps))<.00001);
  }
  const dx=new T.Vector3(...a.dx),dz=new T.Vector3(...a.dz),normal=dz.cross(dx).normalize();
  assert.ok(normal.distanceTo(new T.Vector3(...a.normal))<1e-10);assert.ok(a.normal[1]>0);
  assert.ok(Math.abs(a.position[1]-SEA_LEVEL)<=MAX_STORM_RISE+1e-9);
 }
 assert.ok(high-low>5,'a flat water plane cannot pass');assert.ok(horizontal>.8,'crests must also travel horizontally');
 assert.ok(SEA_LEVEL+MAX_STORM_RISE<-8,'the wilder sea still remains well below the sheltered eye');
});
test('Water and fire use geometry and a volume, with no animated water or flame photograph',()=>{
 const desktop=createStormwatch({loadArt:false}),mobile=createStormwatch({loadArt:false,mobile:true});
 assert.doesNotMatch(desktop.ocean.water.material.fragmentShader,/sampler2D|photograph|texture2D/);
 assert.doesNotMatch(desktop.fire.flame.material.fragmentShader,/sampler2D|photograph|texture2D/);
 assert.ok(desktop.fire.logs.geometry.attributes.position.count>100);
 assert.ok(mobile.ocean.water.geometry.attributes.position.count<desktop.ocean.water.geometry.attributes.position.count);
 assert.ok(mobile.ocean.spray.geometry.attributes.position.count<desktop.ocean.spray.geometry.attributes.position.count);
 assert.ok(desktop.ocean.foam.geometry.index.count>0);assert.ok(mobile.ocean.foam.geometry.index.count<desktop.ocean.foam.geometry.index.count);
 const geometry=desktop.ocean.water.geometry,emberGeometry=desktop.fire.coals.geometry,foamGeometry=desktop.ocean.foam.geometry;
 for(let t=0;t<20;t+=.1)desktop.update(t);
 assert.equal(desktop.ocean.water.geometry,geometry);assert.equal(desktop.fire.coals.geometry,emberGeometry);assert.equal(desktop.ocean.foam.geometry,foamGeometry);
 disposeGroup(desktop.root);disposeGroup(mobile.root);
});

test('Swell crests stretch across the horizon with uneven spacing and continuously varying heights',()=>{
 let crossEnergy=0,forwardEnergy=0,change=0,repeated=0;const gaps=[],heights=[];
 const period=2*Math.PI/STORM_WAVES[0].omega;
 for(let i=0;i<320;i++){
  const x=80+(i*47.21)%1200,z=-90-(i*33.73)%1600,t=i*.318,a=sampleStormSea(x,z,t);
  crossEnergy+=a.dx[1]**2;forwardEnergy+=a.dz[1]**2;
  change+=(a.position[1]-sampleStormSea(x+300,z,t).position[1])**2;
  repeated+=(a.position[1]-sampleStormSea(x,z,t+period).position[1])**2;
  assert.ok(Math.abs(a.position[1]-sampleStormSea(x,z,t+1/120).position[1])<.12,'randomness must advect smoothly, never jump between frames');
 }
 assert.ok(Math.sqrt(crossEnergy/forwardEnergy)<.4,'dominant crests must run across the view, not form a crossing grid');
 assert.ok(Math.sqrt(change/320)>.5,'long crests must still vary in height across their span');
 assert.ok(Math.sqrt(repeated/320)>.5,'the surface must not repeat each principal wave period');
 for(const x of [100,250,600]){
  let last;
  for(let z=-1800;z<-90;z++){
   const h=sampleStormSea(x,z,7).position[1];
   if(h>SEA_LEVEL+.7&&h>sampleStormSea(x,z-1,7).position[1]&&h>sampleStormSea(x,z+1,7).position[1]){
    heights.push(h-SEA_LEVEL);if(last!==undefined)gaps.push(z-last);last=z;
   }
  }
 }
 const mean=gaps.reduce((a,b)=>a+b,0)/gaps.length,sd=Math.sqrt(gaps.reduce((n,v)=>n+(v-mean)**2,0)/gaps.length);
 assert.ok(sd/mean>.3,'crest spacing must be visibly irregular');assert.ok(Math.max(...heights)-Math.min(...heights)>2);
});

test('Distant wavelengths fade before the mesh can alias them into a grid',()=>{
 for(const t of [0,7,31,300]){
  const distant=sampleStormSea(400,-2000,t,100);
  assert.deepEqual(distant.position,[400,SEA_LEVEL,-2000]);assert.deepEqual(distant.normal,[0,1,0]);
 }
 const field=createStormwatch({loadArt:false});
 assert.ok(field.ocean.water.material.uniforms.meshFootprint.value>0);
 assert.match(field.ocean.water.material.vertexShader,/stormSeaFiltered\(position\.xz,t,footprint/);
 disposeGroup(field.root);
});
