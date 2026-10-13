import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {TRAILERS,STORE_VIEW,STORE_TV,storeCameraPose,VHS_EDITIONS,FILM_CATALOG} from '../video-store-catalog.mjs';
import {createVideoStore} from '../video-store-world.mjs';
import {createTrailerReel,screenHomography} from '../video-store-reel.mjs';
import {initialState,validateState,completeTask,build,placeItem} from '../domain.mjs';
import {backgroundRain} from '../backgrounds.mjs';
import {disposeGroup} from '../world-models.mjs';
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
function harness(ensureProvider=()=>Promise.resolve()){
 let hidden=false;const made=[];
 const reel=createTrailerReel({ensureProvider,hidden:()=>hidden,createPlayer(item,events){const calls={play:0,pause:0,destroy:0,sound:null},adapter={play(){calls.play++;},pause(){calls.pause++;events.paused();},destroy(){calls.destroy++;},audio(on){calls.sound=on;}};made.push({item,events,calls});return adapter;}});
 return {reel,made,setHidden(v){hidden=v;reel.visibilityChanged();}};
}
test('Trailer reel loops all four titles, starts muted and ignores callbacks from destroyed players',async()=>{
 const h=harness();h.reel.play();await flush();assert.equal(h.made.length,0);
 h.reel.setActive(true);h.reel.play();await flush();h.made[0].events.ready();assert.equal(h.made[0].calls.play,1);assert.equal(h.made[0].calls.sound,false);
 const old=h.made[0];
 for(let i=0;i<4;i++){h.made.at(-1).events.ended();await flush();h.made.at(-1).events.ready();}
 assert.deepEqual(h.made.map(p=>p.item.title),[...TRAILERS.map(p=>p.title),TRAILERS[0].title]);
 assert.equal(TRAILERS[3].year,1982);assert.equal(TRAILERS[2].year,1992);
 const count=h.made.length;old.events.ended();old.events.playing();old.events.error('old failure');await flush();assert.equal(h.made.length,count);assert.equal(h.reel.snapshot.failed,false);
 h.made.at(-1).events.playing();h.reel.toggleSound();assert.equal(h.made.at(-1).calls.sound,true);assert.match(h.reel.snapshot.status,/sound on/);
});
test('Playback pauses when hidden, stays paused after a user pause, and shuts down when switching scenes',async()=>{
 const h=harness();h.reel.setActive(true);h.reel.play();await flush();const first=h.made[0];first.events.ready();
 h.setHidden(true);assert.equal(first.calls.pause,1);first.events.ended();await flush();assert.equal(h.made.length,1);assert.equal(h.reel.snapshot.wanted,true);
 h.setHidden(false);assert.equal(first.calls.play,2);
 first.events.paused();h.setHidden(true);h.setHidden(false);assert.equal(first.calls.play,2,'native player pause must be respected');
 h.reel.play();h.reel.pause();first.events.ended();await flush();assert.equal(h.made.length,1);
 h.reel.setActive(false);assert.equal(first.calls.destroy,1);assert.equal(h.reel.snapshot.wanted,false);h.reel.setActive(true);assert.equal(h.made.length,1,'reopening the store does not autoplay');
});
test('Slow provider loads cannot resurrect playback after leaving the store; pause during loading is retained',async()=>{
 let resolve;const h=harness(()=>new Promise(r=>resolve=r));h.reel.setActive(true);h.reel.play();h.reel.setActive(false);resolve();await flush();assert.equal(h.made.length,0);
 h.reel.setActive(true);h.reel.play();h.reel.pause();resolve();await flush();h.made[0].events.ready();assert.equal(h.made[0].calls.play,0);
 h.made[0].events.error('Embedding is blocked.');assert.equal(h.reel.snapshot.failed,true);assert.match(h.reel.snapshot.status,/source link/);
});
test('TV homography maps the iframe corners onto the real 3D screen at desktop and phone sizes',()=>{
 const store=createVideoStore();
 for(const [w,h] of [[1440,900],[390,844]])for(const [station,yaw,pitch] of [['entrance',STORE_VIEW.yaw,STORE_VIEW.pitch],['tv',0,.14]]){
  const camera=new T.PerspectiveCamera(STORE_VIEW.fov,w/h,.1,1800),pose=storeCameraPose({...STORE_VIEW,yaw,pitch},station);camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
  const quad=store.screenCorners().map(p=>{const v=new T.Vector3(...p).project(camera);assert.ok(Math.abs(v.x)<1&&Math.abs(v.y)<1);return [(v.x+1)*w/2,(1-v.y)*h/2];}),m=screenHomography(quad);
  for(const [i,[x,y]] of [[0,0],[640,0],[640,480],[0,480]].entries()){const d=m[3]*x+m[7]*y+m[15];assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/d-quad[i][0])<1e-8);assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/d-quad[i][1])<1e-8);}
  const target=new T.Vector3(...STORE_TV.position);target.z+=.044;const delta=target.clone().sub(camera.position),ray=new T.Raycaster(camera.position,delta.clone().normalize(),.1,delta.length()-.025);store.root.updateMatrixWorld(true);assert.equal(ray.intersectObjects(store.root.userData.tvOccluders,true).length,0,'TV must be unobstructed from the provided views');
 }
 assert.equal(screenHomography([[0,0],[0,0],[0,0],[0,0]]),null);disposeGroup(store.root);
});
test('The store batches geometry, loads original local scans, and releases GPU textures on scene changes',()=>{
 const store=createVideoStore();let vertices=0,disposed=0;assert.ok(store.root.children.length<=120);assert.ok(store.root.userData.caseCount>500);
 for(const object of store.root.children){vertices+=object.geometry.attributes.position.count;for(const n of object.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}
 assert.ok(vertices<250000,`bounded scene vertices: ${vertices}`);
 for(const [texture,file] of store.root.userData.sourceFiles){assert.ok(fs.statSync(new URL('../'+file,import.meta.url)).size>0);texture.addEventListener('dispose',()=>disposed++);}
 assert.equal(FILM_CATALOG.length,36);assert.equal(new Set(FILM_CATALOG.map(t=>t.id)).size,36);assert.equal(VHS_EDITIONS.filter(t=>t.front).length,27);assert.equal(VHS_EDITIONS.filter(t=>t.spine).length,28);assert.equal(store.root.userData.posterIds.length,10);
 store.setSky({daylight:0});for(const object of store.root.children)assert.equal(object.material.uniforms.daylight.value,1,'Blue sky is the default even at night');store.setLiveTime(true);for(const object of store.root.children)assert.equal(object.material.uniforms.daylight.value,0);store.setSky({daylight:1});
 disposeGroup(store.root);assert.equal(disposed,store.root.userData.sourceFiles.size);
});
test('Store selection round-trips without resetting tasks, earned items, rain preferences or positions',()=>{
 let state=initialState();state.tasks=[{id:'test',title:'Finish a useful action',area:'work',repeat:'none'}];state=validateState(state);completeTask(state,'test','2026-10-14');const item=build(state,'garden');placeItem(state,item.instanceId,{islandId:'outlook',x:0,z:0,rotation:0});
 const before=structuredClone(state);state.settings.background='video-store';state.settings.rain=true;state.settings.storeRain=true;state.settings.storeLiveTime=true;const restored=validateState(JSON.parse(JSON.stringify(state)));
 assert.equal(restored.settings.background,'video-store');assert.equal(backgroundRain(restored.settings),true);assert.equal(restored.settings.storeLiveTime,true);restored.settings.storeRain=false;assert.equal(backgroundRain(restored.settings),false);assert.equal(restored.settings.rain,true);for(const k of ['tasks','completions','builds'])assert.deepEqual(restored[k],before[k]);
 restored.settings.background='meadow';assert.equal(backgroundRain(restored.settings),true);
});

test('Windows have real openings, rain stays outdoors and dry mode needs no animation',()=>{
 const store=createVideoStore(),origin=new T.Vector3(-4.8,1.66,3.3),ray=new T.Raycaster(origin,new T.Vector3(-1,0,0),0,8);
 store.root.updateMatrixWorld(true);assert.equal(ray.intersectObjects(store.root.userData.tvOccluders,true).length,0,'No opaque wall or fake window may block the view to the car park');
 const rain=store.root.children.find(o=>o.userData.finish===10);assert.equal(rain.visible,false);
 for(let i=0;i<rain.geometry.attributes.position.count;i++)assert.ok(rain.geometry.attributes.position.getX(i)<-6.5,'Rain must stay outside');
 store.setRain(true);assert.equal(rain.visible,true);store.update(12);assert.equal(rain.material.uniforms.time.value,12);
 store.setRain(false);assert.equal(rain.visible,false);for(const o of store.root.children)assert.equal(o.material.uniforms.rain.value,0);
 const migrated=initialState();delete migrated.settings.storeRain;delete migrated.settings.storeLiveTime;const restored=validateState(migrated);assert.equal(restored.settings.storeRain,false);assert.equal(restored.settings.storeLiveTime,false);disposeGroup(store.root);
});
