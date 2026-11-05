import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {createPoolrooms,POOL_STATIONS,poolPose,poolReferenceCamera} from '../poolrooms-world.mjs';
import {disposeGroup} from '../world-models.mjs';
import {initialState,validateState} from '../domain.mjs';
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
  assert.equal(scene,world);assert.notEqual(bound,previous);assert.ok(!s.water.visible&&!s.fall.visible);assert.equal(this.shadowMap.enabled,false);
  calls.push({y:cam.position.y,clip:s.uniforms.reflectPass.value});if(fail)throw Error('lost');
 }};
 s.beforeRender(renderer,world,c);assert.deepEqual(calls,[{y:-1.1,clip:1},{y:1.1,clip:0}]);assert.equal(bound,previous);
 s.update(8);s.beforeRender(renderer,world,c);assert.equal(calls.length,2,'animation must not redraw the environment buffers');
 c.rotateY(.2);s.beforeRender(renderer,world,c);assert.equal(calls.length,4);
 width=390;height=844;s.beforeRender(renderer,world,c);assert.equal(calls.length,6);
 s.invalidate();fail=true;assert.throws(()=>s.beforeRender(renderer,world,c),/lost/);assert.equal(bound,previous);assert.ok(s.water.visible&&s.fall.visible&&renderer.shadowMap.enabled);
 fail=false;s.beforeRender(renderer,world,c);assert.equal(calls.length,9);disposeGroup(s.root);
});
