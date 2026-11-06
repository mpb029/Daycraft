import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createStormwatch,STORM_VIEWS,stormPose,stormFlash} from '../stormwatch-world.mjs';
import {initialState,validateState} from '../domain.mjs';
import {backgroundRain} from '../backgrounds.mjs';
import {disposeGroup} from '../world-models.mjs';

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
 for(const mesh of field.root.children){assert.equal(mesh.material.uniforms.t,field.uniforms.t);assert.equal(mesh.material.uniforms.flash,field.uniforms.flash);}
 field.update(109.7);assert.equal(field.uniforms.t.value,time);assert.equal(field.uniforms.flash.value,flash);
 field.configure({stormRain:false,stormLightning:false});field.update(109.7);
 assert.equal(field.uniforms.flash.value,0);assert.equal(field.uniforms.rain.value,0);
 assert.equal(stormFlash(0),0);assert.equal(stormFlash(14),0);assert.ok(stormFlash(56.7)>.4);
 disposeGroup(field.root);
});
