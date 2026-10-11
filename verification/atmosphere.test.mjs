import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {balloonPass,leafPass,createAtmosphere} from '../meadow-atmosphere.mjs';
import {initialState,validateState} from '../domain.mjs';
import {terrainHeight,createMeadow} from '../meadow-terrain.mjs';
import {disposeGroup} from '../world-models.mjs';

function camera(aspect=16/9){const c=new T.PerspectiveCamera(54,aspect,.1,1800);c.position.set(15,6.8,28);c.lookAt(0,1.4,0);c.updateMatrixWorld();return c;}
test('Balloon passages leave quiet gaps, stay beyond the clearing, and cross the field camera on desktop and phone',()=>{
 for(let i=0;i<2;i++){
  let shown=0,hidden=0;const coordinates=[];
  for(let t=0;t<1000;t++){
   const pass=balloonPass(t,i);if(!pass){hidden++;continue;}shown++;coordinates.push(pass.x);
   assert.ok(Math.hypot(pass.x,pass.z)>170);assert.ok(pass.y>terrainHeight(pass.x,pass.z)+22);assert.ok(pass.opacity>=0&&pass.opacity<=1);
  }
  assert.ok(shown>200&&hidden>200);assert.ok(Math.max(...coordinates)-Math.min(...coordinates)>390);
 }
 for(const aspect of [16/9,390/844]){
  const c=camera(aspect);let onscreen=0;
  for(let t=15;t<175;t++){
   const pass=balloonPass(t);if(!pass)continue;
   const p=new T.Vector3(pass.x,pass.y+7,pass.z).project(c);
   if(Math.abs(p.x)<.9&&Math.abs(p.y)<.9&&p.z<1)onscreen++;
  }
  assert.ok(onscreen>15,'Balloons must actually pass through the default field camera');
 }
});
test('Leaves arrive in separated bursts; rain follows the camera; still mode and placement stop the effects',()=>{
 let empty=0,occupied=0;
 for(let t=0;t<237;t++){
  const visible=Array.from({length:16},(_,i)=>leafPass(t,i)).filter(p=>p!==null);
  if(visible.length)occupied++;else empty++;
  for(const p of visible)assert.ok(p>=0&&p<1);
 }
 assert.ok(empty>80&&occupied>60);
 const a=createAtmosphere(),c=camera();
 try{
  a.update(13,{camera:c,breeze:true});assert.equal(a.leaves.visible,true);assert.equal(a.rain.visible,false);
  const m=new T.Matrix4();let nonzero=0;for(let i=0;i<a.leaves.count;i++){a.leaves.getMatrixAt(i,m);if(m.determinant()>.01)nonzero++;for(const n of m.elements)assert.ok(Number.isFinite(n));}assert.ok(nonzero>0&&nonzero<16);
  a.update(24,{camera:c,raining:true});assert.equal(a.rain.visible,true);assert.ok(a.balloons.every(b=>!b.visible));
  const old=a.rain.position.clone(),before=a.rain.geometry.attributes.position.array.slice();c.position.x+=80;
  a.update(24.25,{camera:c,raining:true});assert.equal(a.rain.position.x-old.x,80);assert.notDeepEqual(a.rain.geometry.attributes.position.array,before);
  a.update(1e8,{camera:c,raining:true});for(const n of a.rain.geometry.attributes.position.array)assert.ok(Number.isFinite(n));
  a.update(13,{camera:c,breeze:false});assert.equal(a.leaves.visible,false);
  for(const mode of [{motion:false},{editing:true}]){a.update(13,{camera:c,raining:true,...mode});assert.equal(a.rain.visible,false);assert.equal(a.leaves.visible,false);assert.ok(a.balloons.every(b=>!b.visible));}
 }finally{disposeGroup(a.root);}
});
test('Mobile effects use fewer particles; rain lighting is reversible without changing the meadow or progress',()=>{
 const desktop=createAtmosphere(),phone=createAtmosphere({mobile:true}),meadow=createMeadow({grassCount:50});
 try{
  assert.ok(phone.rain.geometry.attributes.position.count<desktop.rain.geometry.attributes.position.count);
  assert.ok(phone.leaves.count<desktop.leaves.count);
  const sky=meadow.root.children.find(c=>c.material?.uniforms?.rainMood),geometry=meadow.ground.geometry;
  meadow.setRain(true);assert.equal(sky.material.uniforms.rainMood.value,1);meadow.setRain(false);assert.equal(sky.material.uniforms.rainMood.value,0);assert.equal(meadow.ground.geometry,geometry);
  const old=initialState();delete old.settings.rain;assert.equal(validateState(old).settings.rain,false);
  const on=initialState();on.settings.rain=true;on.settings.breeze=false;const restored=validateState(JSON.parse(JSON.stringify(on)));assert.equal(restored.settings.rain,true);assert.equal(restored.settings.breeze,false);assert.deepEqual(restored.tasks,on.tasks);assert.deepEqual(restored.builds,on.builds);
 }finally{disposeGroup(desktop.root);disposeGroup(phone.root);disposeGroup(meadow.root);}
});
