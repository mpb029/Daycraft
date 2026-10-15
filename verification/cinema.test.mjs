import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createCinema,cinemaMirror,cinemaCameraPose,CINEMA_STATIONS} from '../cinema-world.mjs';
import {disposeGroup} from '../world-models.mjs';
import {initialState,validateState,completeTask,build,placeItem} from '../domain.mjs';
import {backgroundRain} from '../backgrounds.mjs';
import {mascotGeometry} from '../maccas-models.mjs';

test('The updated restaurant preserves the previous scene selection, tasks, earned items and outdoor rain settings',()=>{
 let s=initialState();s.tasks=[{id:'walk',title:'A short walk',area:'health',repeat:'none'}];s=validateState(s);completeTask(s,'walk','2026-10-14');const item=build(s,'garden');placeItem(s,item.instanceId,{islandId:'outlook',x:3,z:2,rotation:90});
 const original=structuredClone(s);s.settings.background='cinema';s.settings.rain=true;s.settings.storeRain=true;
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.settings.background,'cinema');assert.equal(backgroundRain(restored.settings),false);
 for(const key of ['tasks','completions','builds','islands'])assert.deepEqual(restored[key],original[key]);restored.settings.background='meadow';assert.equal(backgroundRain(restored.settings),true);restored.settings.background='video-store';assert.equal(backgroundRain(restored.settings),true);
});
test('Floor reflections match the real camera, avoid feedback loops and restore renderer state after failures',()=>{
 const gallery=createCinema(),camera=new T.PerspectiveCamera(51,1.6,.1,150);camera.position.set(0,2.67,7.15);camera.lookAt(0,1,-10);camera.updateMatrixWorld();
 const mirror=cinemaMirror(camera),d=camera.getWorldDirection(new T.Vector3()),md=mirror.getWorldDirection(new T.Vector3());assert.equal(mirror.position.y,-camera.position.y);assert.ok(md.distanceTo(new T.Vector3(d.x,-d.y,d.z))<1e-10);
 const output={name:'main canvas'};let target=output,renders=0,fail=false;
 const renderer={getRenderTarget:()=>target,setRenderTarget:t=>target=t,render(scene,eye){renders++;assert.notEqual(target,output);assert.equal(gallery.floor.visible,false);assert.equal(gallery.uniforms.reflectionMap.value,null,'The render target must not be sampled while it is being written');assert.ok(eye.position.y<0);if(fail)throw Error('Lost context');}};
 gallery.beforeRender(renderer,new T.Scene(),camera);assert.equal(target,output);assert.equal(gallery.floor.visible,true);assert.equal(gallery.uniforms.reflectionReady.value,1);assert.ok(gallery.uniforms.reflectionMap.value);
 gallery.beforeRender(renderer,new T.Scene(),camera);assert.equal(renders,1,'No offscreen redraw for an unchanged scene');
 gallery.invalidate();fail=true;assert.throws(()=>gallery.beforeRender(renderer,new T.Scene(),camera),/Lost context/);assert.equal(target,output);assert.equal(gallery.floor.visible,true);assert.equal(gallery.uniforms.reflectionReady.value,0);
 fail=false;gallery.beforeRender(renderer,new T.Scene(),camera);assert.equal(gallery.uniforms.reflectionReady.value,1);assert.equal(renders,3);
 camera.position.x=.1;camera.updateMatrixWorld();gallery.beforeRender(renderer,new T.Scene(),camera);assert.equal(renders,4);
 disposeGroup(gallery.root);
});
test('Restaurant resources fit a bounded scene, local images exist and textures release on scene changes',()=>{
 const gallery=createCinema({mobile:true});let vertices=0,disposed=0;assert.ok(gallery.root.children.length<40);
 for(const o of gallery.root.children){const count=o.geometry.attributes.position.count;vertices+=count;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));for(const index of o.geometry.index.array)assert.ok(index<count);}
 assert.ok(vertices<650000);assert.equal(gallery.root.userData.reflectionSize,384);
 for(const [texture,file] of gallery.root.userData.sourceFiles){assert.ok(fs.statSync(new URL('../'+file,import.meta.url)).size);texture.addEventListener('dispose',()=>disposed++);}
 for(const [station,preset] of Object.entries(CINEMA_STATIONS)){const p=cinemaCameraPose(preset,station);assert.ok(p.position.every(Number.isFinite));assert.ok(Math.abs(new T.Vector3(...p.direction).length()-1)<1e-10);assert.ok(p.position[1]>1.2);}
 disposeGroup(gallery.root);assert.equal(disposed,gallery.root.userData.sourceFiles.size);
});
test('The restaurant loads no movie exhibits and keeps its sculptures and planters outside the central aisle',()=>{
 const scene=createCinema(),{mascots,planting,aisleWidth}=scene.root.userData;
 const expected=['./assets/cinema/facilities.svg','./assets/cinema/mcdonalds.svg','./assets/cinema/welcome.svg',...['ronald','grimace','hamburglar','birdie'].map(id=>'./assets/cinema/models/'+id+'-color.png')];
 assert.deepEqual([...scene.root.userData.sourceFiles.values()].sort(),expected.sort());
 assert.deepEqual(mascots.map(m=>m.id).sort(),['birdie','grimace','hamburglar','ronald']);
 for(const m of mascots){assert.ok(m.vertices>5000,'Each mascot has substantial volumetric geometry');assert.ok(m.bounds.max[0]<-aisleWidth/2||m.bounds.min[0]>aisleWidth/2,'The complete model stays outside the aisle');assert.ok(m.bounds.min[0]>-3.9&&m.bounds.max[0]<3.9,'Models stay inside the room');}
 for(const p of planting.planters)assert.ok(Math.abs(p.x)-p.width/2>aisleWidth/2,'Planter edge stays clear of the aisle');
 assert.ok(planting.tallPlants>=4&&planting.hangingBaskets>=2);
 assert.ok(scene.root.children.some(m=>m.name==='fibreglass'));
 disposeGroup(scene.root);
});
test('Uploaded character meshes retain their triangle counts, UVs and finite normals',()=>{
 const expected={ronald:10484,grimace:10534,hamburglar:10463,birdie:10541};
 for(const [id,triangles] of Object.entries(expected)){
  const g=mascotGeometry(id),{position,normal,uv}=g.attributes;
  assert.equal(g.index.count,triangles*3);assert.equal(normal.count,position.count);assert.equal(uv.count,position.count);
  for(const i of g.index.array)assert.ok(i<position.count);
  for(let i=0;i<normal.count;i++){const n=Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i));assert.ok(Math.abs(n-1)<.002);assert.ok(Number.isFinite(position.getX(i))&&Number.isFinite(position.getY(i))&&Number.isFinite(position.getZ(i)));assert.ok(uv.getX(i)>=0&&uv.getX(i)<=1&&uv.getY(i)>=0&&uv.getY(i)<=1);}
  assert.ok(Math.abs(g.boundingBox.min.y)<1e-6);assert.ok(Math.abs(g.boundingBox.max.y-1)<1e-6);g.dispose();
 }
});
