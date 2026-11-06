import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createPoolrooms,POOL_STATIONS,poolPose,poolReferenceCamera} from '../poolrooms-world.mjs';
import {disposeGroup} from '../world-models.mjs';
import {initialState,validateState} from '../domain.mjs';
import {POOL_MAX_RISE,samplePoolSwell} from '../poolrooms-water-motion.mjs';
import {backgroundRain} from '../backgrounds.mjs';
test('Poolrooms persists through backup without borrowing outdoor rain or touching the collection',()=>{
 const s=initialState();s.settings.rain=true;s.settings.background='poolrooms';const r=validateState(JSON.parse(JSON.stringify(s)));
 assert.equal(r.settings.background,'poolrooms');assert.equal(backgroundRain(r.settings),false);assert.deepEqual(r.islands,s.islands);
 r.settings.background='meadow';assert.equal(backgroundRain(r.settings),true);
});
test('Each viewpoint is enclosed, and the footbridge and side doorway have open sightlines',()=>{
 const s=createPoolrooms({loadArt:false}),shell=s.root.children[0],ray=new T.Raycaster();s.root.updateMatrixWorld(true);
 const hit=(origin,dir)=>{ray.set(new T.Vector3(...origin),new T.Vector3(...dir).normalize());return ray.intersectObject(shell)[0]?.distance;};
 for(const [id,v] of Object.entries(POOL_STATIONS)){
  const p=poolPose(v,id);assert.ok(v.position[1]>0);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-9);
  for(const d of [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]]){
   const distance=hit(p.position,d);assert.ok(distance>.28&&distance<45,id+' is missing an enclosure surface');
  }
 }
 assert.ok(hit([6.43,1.10,-1.64],[0,0,-1])>6,'side doorway is capped');
 assert.ok(hit([-5.20,.89,-6.30],[0,0,-1])>8,'bridge obstructs passage');
 disposeGroup(s.root);
});
test('Still camera reuses both water buffers; turning, resizing and restoration refresh them',()=>{
 const s=createPoolrooms({loadArt:false}),c=poolReferenceCamera(),previous={name:'caller target'},world=new T.Scene();world.add(s.root);
 let bound=previous,width=1360,height=765,fail=false;const calls=[];
 const renderer={shadowMap:{enabled:true},getDrawingBufferSize(v){return v.set(width,height);},getRenderTarget:()=>bound,setRenderTarget(x){bound=x;},render(scene,cam){
  assert.equal(scene,world);assert.notEqual(bound,previous);assert.ok(!s.water.visible&&!s.fall.visible&&!s.spray.visible);assert.equal(this.shadowMap.enabled,false);
  calls.push({y:cam.position.y,clip:s.uniforms.reflectPass.value});if(fail)throw Error('lost');
 }};
 s.beforeRender(renderer,world,c);assert.deepEqual(calls,[{y:-1.1,clip:1},{y:1.1,clip:0}]);assert.equal(bound,previous);
 s.update(8);s.beforeRender(renderer,world,c);assert.equal(calls.length,2,'animation must not redraw the environment buffers');
 c.rotateY(.2);s.beforeRender(renderer,world,c);assert.equal(calls.length,4);
 width=390;height=844;s.beforeRender(renderer,world,c);assert.equal(calls.length,6);
 s.invalidate();fail=true;assert.throws(()=>s.beforeRender(renderer,world,c),/lost/);assert.equal(bound,previous);assert.ok(s.water.visible&&s.fall.visible&&s.spray.visible&&renderer.shadowMap.enabled);
 fail=false;s.beforeRender(renderer,world,c);assert.equal(calls.length,9);disposeGroup(s.root);
});

test('Pool swells move visibly but stay bounded; normals follow the same height field',()=>{
 let largest=0,changed=0;const eps=.0001;
 for(let i=0;i<120;i++){
  const x=-10+(i*1.17)%21,z=-24+(i*2.37)%33,t=i*.29,a=samplePoolSwell(x,z,t),b=samplePoolSwell(x,z,t+1);
  const dx=(samplePoolSwell(x+eps,z,t).height-samplePoolSwell(x-eps,z,t).height)/(2*eps);
  const dz=(samplePoolSwell(x,z+eps,t).height-samplePoolSwell(x,z-eps,t).height)/(2*eps);
  assert.ok(Math.abs(a.height)<=POOL_MAX_RISE+1e-10);assert.ok(Math.abs(a.dx-dx)<1e-7&&Math.abs(a.dz-dz)<1e-7);
  largest=Math.max(largest,Math.abs(a.height));changed=Math.max(changed,Math.abs(a.height-b.height));
 }
 assert.ok(largest>.025&&POOL_MAX_RISE<=.04,'small pool waves, not a flat sheet or a wave ride');
 assert.ok(changed>.025,'motion is appreciable within one second');
});
test('Water, lighting, fall and spray share one clock; mobile spray is bounded and idle time is stable',()=>{
 for(const mobile of [false,true]){
  const s=createPoolrooms({mobile,loadArt:false});
  assert.equal(s.spray.geometry.attributes.position.count,mobile?28:48);
  const g=s.water.geometry,spray=s.spray.geometry;let disposed=0;
  spray.addEventListener('dispose',()=>disposed++);
  s.update(5.25);for(const o of s.root.children)assert.equal(o.material.uniforms.t,s.uniforms.t);
  s.update(5.25);assert.equal(s.uniforms.t.value,5.25);
  for(const invalid of [NaN,Infinity,-1])s.update(invalid);
  assert.equal(s.uniforms.t.value,5.25);assert.equal(s.water.geometry,g);assert.equal(s.spray.geometry,spray);
  disposeGroup(s.root);assert.equal(disposed,1);
 }
});
