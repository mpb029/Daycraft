import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createMall,MALL_VIEWS,mallPose} from '../mall-world.mjs';
import {MALL_HALF_W,MALL_HALF_H,WATER_Y} from '../mall-layout.mjs';
import {MALL_NOZZLES,FOUNTAIN_ATLAS,fountainFrame} from '../mall-fountain.mjs';
import {MALL_ESCALATORS,escalatorRise,escalatorTravel,escalatorStep} from '../mall-escalators.mjs';
import {backgroundRain,normaliseBackground} from '../backgrounds.mjs';
import {initialState,validateState} from '../domain.mjs';
import {disposeGroup} from '../world-models.mjs';

test('All view corners stay on the artwork on portrait, landscape and ultrawide screens',()=>{
 for(const aspect of [390/844,1,1672/941,3.6])for(const v of [...Object.values(MALL_VIEWS),{yaw:10,pitch:-10,fov:80},{yaw:-10,pitch:10,fov:22}]){
  const p=mallPose(v,aspect),camera=new T.PerspectiveCamera(p.fov,aspect,.1,1000);camera.lookAt(new T.Vector3(...p.direction));camera.updateMatrixWorld(true);
  for(const x of [-1,1])for(const y of [-1,1]){const ray=new T.Vector3(x,y,.5).unproject(camera);assert.ok(ray.z<0);assert.ok(Math.abs(ray.x/-ray.z)<=MALL_HALF_W);assert.ok(Math.abs(ray.y/-ray.z)<=MALL_HALF_H);}
 }
});
test('All five nozzles meet the basin and their animation wraps continuously',()=>{
 for(const n of MALL_NOZZLES){
  assert.ok(Math.abs(n.position[1]-WATER_Y)<1e-12);
  const speed=Math.sqrt(.68/n.height),period=FOUNTAIN_ATLAS.frames/FOUNTAIN_ATLAS.fps/speed;
  for(const t of [0,.1,1.71,5.99,87.3]){
   const a=fountainFrame(t,n.phase,speed),b=fountainFrame(t+period,n.phase,speed);
   assert.equal(a.first,b.first);assert.equal(a.second,b.second);assert.ok(Math.abs(a.blend-b.blend)<1e-10);
   assert.ok(a.first>=0&&a.first<144&&a.second>=0&&a.second<144&&a.blend>=0&&a.blend<1);
  }
 }
 const before=fountainFrame(6-1e-6),after=fountainFrame(6);
 assert.equal(before.second,after.first);assert.ok(before.blend>.999);
 assert.equal(new Set(MALL_NOZZLES.map(n=>fountainFrame(1,n.phase).first)).size,5);
});
test('One elapsed clock freezes every animated layer and survives resumed updates',()=>{
 const field=createMall({loadArt:false,elapsed:100});field.update(104);assert.equal(field.uniforms.t.value,4);
 const snapshots=[];field.root.traverse(o=>{if(o.material)snapshots.push(o.material.uniforms.t);});assert.ok(snapshots.length>=5);assert.ok(snapshots.every(u=>u===field.uniforms.t));
 field.update(104);assert.equal(field.uniforms.t.value,4);field.update(105);assert.equal(field.uniforms.t.value,5);
 let disposed=0;const geometries=new Set();field.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});for(const g of geometries)g.addEventListener('dispose',()=>disposed++);disposeGroup(field.root);assert.equal(disposed,geometries.size);
});
test('Mobile reduces basin geometry without losing water frames; saved backgrounds remain valid',()=>{
 const a=createMall({loadArt:false}),b=createMall({loadArt:false,mobile:true});assert.ok(b.fountain.water.geometry.index.count<a.fountain.water.geometry.index.count);assert.equal(b.fountain.streams.geometry.index.count,30);assert.equal(a.fountain.streams.material.uniforms.flowAtlas,a.uniforms.flowAtlas);
 const s=initialState();s.settings.background='mall';s.settings.rain=true;assert.equal(normaliseBackground('mall'),'mall');assert.equal(validateState(s).settings.background,'mall');assert.equal(backgroundRain(s.settings),false);disposeGroup(a.root);disposeGroup(b.root);
});

test('A device without WebGL receives a clearly labelled mall still',async()=>{
 const previous=globalThis.document,classes=new Set(),attributes={},host={dataset:{},replaceChildren(){this.empty=true;},setAttribute(k,v){attributes[k]=v;}};
 globalThis.document={querySelector:()=>({classList:{add:c=>classes.add(c),remove:(...names)=>names.forEach(c=>classes.delete(c))}}),createElementNS(){throw Error('WebGL unavailable');}};
 try{const {mountScene}=await import('../world-renderer.mjs');const s=initialState();s.settings.background='mall';assert.equal(mountScene(host,{state:s}),true);assert.equal(host.dataset.mallStill,'true');assert.match(attributes['aria-label'],/Mall atrium still view/);assert.ok(classes.has('mall-still-on'));assert.ok(host.empty);}
 finally{globalThis.document=previous;}
});

test('Escalators run in opposite directions, wrap continuously, and flatten at landings',()=>{
 const [up,down]=MALL_ESCALATORS;
 assert.equal(escalatorTravel(3,up),-escalatorTravel(3,down));
 for(const f of MALL_ESCALATORS){
  const a=escalatorStep(1,10,f),b=escalatorStep(1.1,10,f);
  assert.equal(Math.sign(b-a),f.direction);
  assert.ok(Math.abs(escalatorStep(1+f.steps/f.rate,10,f)-a)<1e-12);
 }
 assert.equal(escalatorRise(0),0);assert.equal(escalatorRise(1),1);
 assert.ok(escalatorRise(.0001)/.0001<.002);
 assert.ok((1-escalatorRise(.9999))/.0001<.002);
 for(let q=0;q<1;q+=.01)assert.ok(escalatorRise(q+.01)>=escalatorRise(q));
});
test('Escalator meshes retain resources while sharing the pause clock with the water',()=>{
 const field=createMall({loadArt:false}),steps=field.escalators.steps,geometry=steps.geometry,position=geometry.attributes.position.array;
 assert.equal(steps.material.uniforms.t,field.fountain.streams.material.uniforms.t);
 assert.equal(field.escalators.back.material.uniforms.t,field.uniforms.t);
 for(let t=0;t<10;t+=.1)field.update(t);
 assert.equal(steps.geometry,geometry);assert.equal(steps.geometry.attributes.position.array,position);
 assert.ok(geometry.attributes.position.count<1000);
 disposeGroup(field.root);
});
