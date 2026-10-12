import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {initialState,validateState,completeTask,build} from '../domain.mjs';
import {backgroundRain,normaliseBackground} from '../backgrounds.mjs';
import {createForest,forestCameraPose} from '../forest-world.mjs';
import {forestInitialView,FOREST_EYE,FOREST_SIGN,FOREST_LAMP} from '../forest-geometry.mjs';
import {createWaterLook} from '../water-controls.mjs';
import {disposeGroup} from '../world-models.mjs';
import {skyAt} from '../sky-time.mjs';

test('Older saves acquire a separate forest weather setting without changing earned progress',()=>{
 const old=initialState();old.tasks=[{id:'walk',title:'Walk',repeat:'daily',area:'health',doneMeans:'Walked outside'}];completeTask(old,'walk','2026-10-12');build(old,'garden');old.settings.background='water';old.settings.rain=true;delete old.settings.forestRain;
 const before=validateState(old),loaded=validateState(JSON.parse(JSON.stringify(old)));assert.equal(loaded.settings.forestRain,true);assert.equal(loaded.settings.background,'water');
 loaded.settings.background='forest';loaded.settings.forestRain=false;assert.equal(backgroundRain(loaded.settings),false);assert.equal(loaded.settings.rain,true);
 const roundtrip=validateState(JSON.parse(JSON.stringify(loaded)));assert.equal(roundtrip.settings.background,'forest');assert.equal(roundtrip.settings.forestRain,false);assert.deepEqual(roundtrip.tasks,before.tasks);assert.deepEqual(roundtrip.completions,before.completions);assert.deepEqual(roundtrip.builds,before.builds);
 roundtrip.settings.background='meadow';assert.equal(backgroundRain(roundtrip.settings),true);assert.equal(normaliseBackground('unknown'),'meadow');
});

test('Forest opening views frame both the lamp and sign on desktop and portrait phone',()=>{
 for(const [mobile,width,height] of [[false,1200,675],[true,390,844]]){
  const view=forestInitialView(mobile),pose=forestCameraPose(view),camera=new T.PerspectiveCamera(view.fov,width/height,.1,1800);camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
  for(const p of [FOREST_SIGN,FOREST_LAMP]){const projected=new T.Vector3(...p).project(camera);assert.ok(Math.abs(projected.x)<.9&&Math.abs(projected.y)<.9,`${mobile?'Phone':'Desktop'} must include the stop and lamp`);assert.ok(projected.z<1);}
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const pitch of [-1.3,0,1.3]){const p=forestCameraPose({...view,yaw,pitch});assert.deepEqual(p.position,FOREST_EYE);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-12);}
 }
});

test('Touch look, zoom and Face bus stop preserve a separate opening view',()=>{
 const listeners={};let active=true,draws=0;const canvas={addEventListener:(n,f)=>listeners[n]=f,setPointerCapture(){}};
 const opening=forestInitialView(true),look=createWaterLook(canvas,{active:()=>active,draw:()=>draws++,initialView:opening});
 listeners.pointerdown({pointerId:1,button:0,clientX:50,clientY:100});listeners.pointermove({pointerId:1,clientX:150,clientY:140});assert.notDeepEqual(look.view,opening);
 listeners.wheel({deltaY:100,preventDefault(){}});assert.ok(look.view.fov>opening.fov);look.action('stop');assert.deepEqual(look.view,opening);
 active=false;listeners.pointermove({pointerId:1,clientX:250,clientY:300});assert.deepEqual(look.view,opening);assert.ok(draws>=3);
});

test('Forest geometry stays finite and bounded on mobile; lighting and motion settings reach its shaders',()=>{
 const forest=createForest({mobile:true}),u=forest.uniforms;let vertices=0;
 forest.root.traverse(o=>{if(!o.geometry)return;const p=o.geometry.attributes.position;vertices+=p.count;for(const n of p.array)assert.ok(Number.isFinite(n));});
 assert.ok(vertices<250000,`Mobile vertex budget: ${vertices}`);assert.equal(forest.root.children.length,7);assert.equal(forest.root.userData.reflectionSize,384);
 const noon=skyAt(new Date('2026-10-12T02:00Z')),night=skyAt(new Date('2026-10-12T09:00Z'));forest.setSky(noon);assert.equal(u.lampOn.value,0);forest.setSky(night);assert.equal(u.lampOn.value,1);assert.equal(u.daylight.value,night.daylight);
 forest.setRain(false);assert.equal(u.wetness.value,0);forest.setRain(true);assert.equal(u.wetness.value,1);
 forest.update(11,{motion:false,breeze:true});assert.equal(u.breeze.value,0);forest.update(11,{motion:true,breeze:false});assert.equal(u.breeze.value,0);forest.update(12,{motion:true,breeze:true});assert.equal(u.breeze.value,1);
 disposeGroup(forest.root);
});

test('Reflection refreshes after zoom in paused scenery and restores resources after a failed draw',()=>{
 const forest=createForest({mobile:true}),scene=new T.Scene(),camera=new T.PerspectiveCamera(60,1,.1,1800);scene.add(forest.root);camera.position.set(...FOREST_EYE);camera.lookAt(0,2,-20);
 const original={name:'original'},targets=[];let current=original,draws=0,fail=false;
 const renderer={getRenderTarget:()=>current,setRenderTarget:t=>{current=t;if(t!==original&&!targets.includes(t))targets.push(t);},render(s,c){assert.equal(s,scene);assert.equal(forest.ground.visible,false);assert.equal(forest.glow.visible,false);assert.equal(c.position.y,-camera.position.y);draws++;if(fail)throw Error('draw failed');}};
 forest.update(0,{camera,motion:false});forest.beforeRender(renderer,scene,camera);assert.equal(draws,1);assert.equal(current,original);assert.equal(forest.ground.visible,true);assert.equal(forest.glow.visible,true);
 forest.beforeRender(renderer,scene,camera);assert.equal(draws,1);camera.fov=45;camera.updateProjectionMatrix();forest.beforeRender(renderer,scene,camera);assert.equal(draws,2);
 forest.update(.3,{camera});forest.beforeRender(renderer,scene,camera);assert.equal(draws,3);
 forest.ground.visible=false;forest.glow.visible=false;camera.position.x=1;fail=true;assert.throws(()=>forest.beforeRender(renderer,scene,camera),/draw failed/);assert.equal(current,original);assert.equal(forest.ground.visible,false);assert.equal(forest.glow.visible,false);
 let texturesDisposed=0,targetsDisposed=0;for(const name of ['signMap','foliageMap','barkMap'])forest.uniforms[name].value.addEventListener('dispose',()=>texturesDisposed++);targets[0].addEventListener('dispose',()=>targetsDisposed++);
 disposeGroup(forest.root);assert.equal(texturesDisposed,3);assert.equal(targetsDisposed,1);forest.beforeRender(renderer,scene,camera);assert.equal(draws,4);disposeGroup(forest.root);assert.equal(targetsDisposed,1);
});
