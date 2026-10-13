import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createCinema,cinemaMirror,cinemaCameraPose,CINEMA_STATIONS} from '../cinema-world.mjs';
import {disposeGroup} from '../world-models.mjs';
import {initialState,validateState,completeTask,build,placeItem} from '../domain.mjs';
import {backgroundRain} from '../backgrounds.mjs';

test('Cinema selection preserves tasks, earned items and independent outdoor rain settings',()=>{
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
test('Cinema resources fit a bounded scene, all local artwork exists and textures release on scene changes',()=>{
 const gallery=createCinema({mobile:true});let vertices=0,disposed=0;assert.ok(gallery.root.children.length<40);
 for(const o of gallery.root.children){vertices+=o.geometry.attributes.position.count;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));}
 assert.ok(vertices<650000);assert.equal(gallery.root.userData.reflectionSize,384);
 for(const [texture,file] of gallery.root.userData.sourceFiles){assert.ok(fs.statSync(new URL('../'+file,import.meta.url)).size);texture.addEventListener('dispose',()=>disposed++);}
 for(const [station,preset] of Object.entries(CINEMA_STATIONS)){const p=cinemaCameraPose(preset,station);assert.ok(p.position.every(Number.isFinite));assert.ok(Math.abs(new T.Vector3(...p.direction).length()-1)<1e-10);assert.ok(p.position[1]>1.2);}
 disposeGroup(gallery.root);assert.equal(disposed,gallery.root.userData.sourceFiles.size);
});
