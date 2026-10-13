import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {BACKGROUNDS,normaliseBackground} from '../backgrounds.mjs';
import {tideAt,waveMotion,sampleWater,waterCameraPose,createTideClock,WAVE_PERIOD,EYE_HEIGHT} from '../water-cycle.mjs';
import {createWaterPlanet,WATER_RADIUS} from '../water-world.mjs';
import {WATER_MOON,WATER_SKY_SCALE} from '../water-lighting.mjs';
import {createWaterLook} from '../water-controls.mjs';
import {createNightSky} from '../meadow-night.mjs';
import {skyAt} from '../sky-time.mjs';
import {initialState,validateState,completeTask,build,placeItem} from '../domain.mjs';
import {disposeGroup} from '../world-models.mjs';

test('Background preferences migrate and round-trip without changing tasks, materials or placements',()=>{
 const old=initialState();delete old.settings.background;delete old.settings.waterRide;
 const migrated=validateState(old);assert.equal(migrated.settings.background,'meadow');assert.equal(migrated.settings.waterRide,true);
 assert.equal(normaliseBackground('__proto__'),'meadow');assert.equal(normaliseBackground(null),'meadow');assert.equal(Object.keys(BACKGROUNDS).length,5);
 const s=initialState();s.tasks=[{id:'a',title:'A useful task',repeat:'none',area:'work',doneMeans:'Done well'}];completeTask(s,'a','2026-10-11');const b=build(s,'garden');placeItem(s,b.instanceId,{islandId:'outlook',x:0,z:0,rotation:0});
 const builds=structuredClone(s.builds),completions=structuredClone(s.completions);s.settings.background='water';s.settings.waterRide=false;
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(restored.settings.background,'water');assert.equal(restored.settings.waterRide,false);assert.deepEqual(restored.builds,builds);assert.deepEqual(restored.completions,completions);
 s.settings.background='javascript:alert(1)';assert.equal(validateState(s).settings.background,'meadow');
});

test('The first crest reaches the origin after 20 active minutes, repeating every 20 minutes',()=>{
 assert.equal(WAVE_PERIOD,1200);assert.ok(tideAt(0).centre<-7000);assert.equal(tideAt(0).strength,1);
 for(const second of [1200,2400,3600,120000]){const s=tideAt(second);assert.equal(s.centre,0);assert.equal(s.strength,1);assert.equal(s.stage,'crest');assert.ok(sampleWater(0,0,0,s).large>600);}
 for(let t=0;t<1325;t+=.5){assert.ok(tideAt(t+.5).centre>=tideAt(t).centre||t+ .5===1325);}
 for(const t of [200,700,1400,1800])assert.ok(sampleWater(0,0,0,tideAt(t)).large<.001);
 assert.equal(tideAt(1325).waves.find(w=>w.cycle===1).strength,1,'The departing wave must remain visible after focus moves to the next wave');
});

test('The approaching wall grows throughout all 20 minutes and the departing wall shrinks into the opposite horizon',()=>{
 function projectedHeight(seconds,yaw){
  const tide=tideAt(seconds),wave=tide.waves.find(w=>w.cycle===1),pose=waterCameraPose(tide,seconds,yaw,-.025);
  const camera=new T.PerspectiveCamera(58,16/9,.1,18000);camera.position.set(pose.x,pose.y,pose.z);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
  const peak=new T.Vector3(0,sampleWater(0,wave.centre,seconds,tide).height,wave.centre).project(camera),base=new T.Vector3(0,0,wave.centre).project(camera);
  return peak.y-base.y;
 }
 const heights=[0,120,300,600,900,1140].map(t=>projectedHeight(t,0));
 assert.ok(heights[0]>.015&&heights[0]<.04,'The first ridge must be small but visible at the far horizon');
 for(let i=1;i<heights.length;i++)assert.ok(heights[i]>heights[i-1]*1.2,'Each approach interval should show a visibly larger wave');
 for(let t=0;t<1020;t+=60)assert.ok(tideAt(t+60).centre-tideAt(t).centre>150,'The wall must travel instead of hovering at the horizon');
 const departing=[1230,1320,1500,1800,2100,2340].map(t=>projectedHeight(t,Math.PI));
 for(let i=1;i<departing.length;i++)assert.ok(departing[i]<departing[i-1]*.95);
 assert.ok(departing.at(-1)>0&&departing.at(-1)<.02);
});

test('Outgoing and incoming waves coexist without popping at crest, focus or repeat-cycle boundaries',()=>{
 for(const t of [1500,1800,2100]){const waves=tideAt(t).waves;assert.equal(waves.length,2);assert.ok(waves[0].centre>0&&waves[1].centre<0);assert.equal(waves[0].strength,1);assert.equal(waves[1].strength,1);}
 const h=.001;
 for(const boundary of [1200,1325,2400,2525,3600]){
  const left=tideAt(boundary-h),right=tideAt(boundary+h),locations=new Set([...left.waves,...right.waves].map(w=>w.centre));
  for(const z of locations)assert.ok(Math.abs(sampleWater(0,z,0,left).height-sampleWater(0,z,0,right).height)<.02,'Changing the primary cycle must not reset visible water');
  const p=waterCameraPose(left,boundary-h),q=waterCameraPose(right,boundary+h);assert.ok(Math.abs(p.y-q.y)<.01);assert.ok(Math.abs(p.z-q.z)<.1);
 }
 assert.ok(tideAt(2399.999).waves.find(w=>w.cycle===1).strength<1e-10);
 assert.equal(tideAt(2400).waves.some(w=>w.cycle===1),false);
 for(let t=0;t<36000;t+=17)assert.ok(tideAt(t).waves.length<=2,'Retired waves must not accumulate');
});

test('The wave has a smooth crest and join; sampled slopes agree with independent finite differences',()=>{
 const h=.001;
 for(const t of [1000,1105,1175,1200,1225])for(const x of [-120,0,180])for(const z of [-100,0,125]){
  const tide=tideAt(t),s=sampleWater(x,z,15,tide),dx=(sampleWater(x+h,z,15,tide).height-sampleWater(x-h,z,15,tide).height)/(2*h),dz=(sampleWater(x,z+h,15,tide).height-sampleWater(x,z-h,15,tide).height)/(2*h);
  assert.ok(Math.abs(s.dx-dx)<.00005);assert.ok(Math.abs(s.dz-dz)<.00005);
 }
 const crest=tideAt(1200);assert.ok(Math.abs(sampleWater(0,h,0,crest).large-sampleWater(0,-h,0,crest).large)<1e-6);
 const left=(sampleWater(0,0,0,crest).largeDz-sampleWater(0,-h,0,crest).largeDz)/h,right=(sampleWater(0,h,0,crest).largeDz-sampleWater(0,0,0,crest).largeDz)/h;
 assert.ok(Math.abs(left-right)<1e-6,'Crest curvature must join smoothly without a camera acceleration kink');
});

test('The ride climbs over 600 metres rapidly, remains above the water and rolls smoothly over the crest',()=>{
 let previous=null,velocity=null,maximum=0,minimum=Infinity,maxSpeed=0,maxAcceleration=0,maxPitchRate=0,ten=null,ninety=null;
 for(let i=0;i<=240*120;i++){
  const time=1090+i/120,tide=tideAt(time),p=waterCameraPose(tide,time,0,-.025),surface=sampleWater(p.x,p.z,time,tide);
  assert.ok(Math.abs(p.y-surface.height-EYE_HEIGHT)<1e-9);assert.ok(Math.abs(p.pitch+.025)<.8);assert.ok(Math.abs(Math.hypot(...p.direction)-1)<1e-10);
  if(previous){const v=[(p.y-previous.y)*120,(p.z-previous.z)*120];maxSpeed=Math.max(maxSpeed,Math.hypot(...v));maxPitchRate=Math.max(maxPitchRate,Math.abs(p.pitch-previous.pitch)*120);if(velocity)maxAcceleration=Math.max(maxAcceleration,Math.hypot((v[0]-velocity[0])*120,(v[1]-velocity[1])*120));velocity=v;}
  if(ten===null&&p.y>65)ten=time;if(ninety===null&&p.y>564)ninety=time;
  previous=p;maximum=Math.max(maximum,p.y);minimum=Math.min(minimum,p.y);
 }
 assert.ok(maximum>600&&maximum<680);assert.ok(minimum>2.6&&minimum<3);assert.ok(maxSpeed>100&&maxSpeed<180);
 assert.ok(ninety-ten>3&&ninety-ten<5,'The main lift should take a few seconds');assert.ok(maxAcceleration<100);assert.ok(maxPitchRate<.42,'Pitch must ease over the crest');
 assert.ok(waterCameraPose(tideAt(1194),1194).z<-100,'The approach must draw the eye towards the wave');assert.equal(waterCameraPose(tideAt(1200),1200).z,0);
 assert.ok(waterCameraPose(tideAt(1206),1206).z>100,'After the crest, the wave carries the eye through to the other side');
 const settled=waterCameraPose(tideAt(1325),1325);assert.ok(Math.abs(settled.y-EYE_HEIGHT)<.16);assert.ok(Math.abs(settled.z)<.0001);
 for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2])for(const t of [0,1194,1198,1200,1206,1230]){const p=waterCameraPose(tideAt(t),t,yaw,1.3);assert.ok(p.y>p.surface.height+2.7);for(const n of [p.y,p.pitch,...p.direction])assert.ok(Number.isFinite(n));}
});

test('The wave accelerates near the eye and its position, speed and acceleration remain continuous',()=>{
 assert.ok(waveMotion(-120).speed<4);assert.ok(waveMotion(-30).speed>50);assert.ok(waveMotion(-12).speed>80);assert.ok(waveMotion(60).speed<30);
 const h=.001;
 for(const t of [-1200,-180,-150,-120,-90,-30,-12,-11.9,0,9.9,10,20,60,90,120,150,180,1200]){
  const m=waveMotion(t),left=waveMotion(t-h),right=waveMotion(t+h);
  assert.ok(Math.abs((right.centre-left.centre)/(2*h)-m.speed)<.0001);
  assert.ok(Math.abs((right.speed-left.speed)/(2*h)-m.acceleration)<.001);
 }
 for(const join of [-180,-90,-12,10,90,180]){const left=waveMotion(join-h),right=waveMotion(join+h);assert.ok(Math.abs(left.speed-right.speed)<.001);assert.ok(Math.abs(left.acceleration-right.acceleration)<.001);}
 for(let t=-1200;t<=1200;t+=.5)assert.ok(waveMotion(t).speed>0,'The wave must never reverse while crossing a transition');
});

test('The active-view clock pauses without catch-up; preview has no initial jump and preserves the ride',()=>{
 const clock=createTideClock();clock.advance(600);const before=clock.snapshot;clock.advance(3600,false);assert.deepEqual(clock.snapshot,before);
 clock.advance(600);assert.equal(clock.snapshot.stage,'crest');clock.advance(100,false);assert.equal(clock.snapshot.seconds,1200);assert.equal(clock.preview(),false);
 const p=createTideClock();assert.equal(p.secondsToCrest,1200);assert.equal(p.preview(),true);assert.equal(p.preview(),false);assert.equal(p.snapshot.seconds,0);assert.equal(p.secondsToCrest,96);
 p.advance(.001);assert.ok(Math.abs(p.snapshot.centre-tideAt(0).centre)<.001);p.advance(23.999);assert.equal(p.previewing,false);assert.equal(p.snapshot.relative,-72);
 assert.equal(p.secondsToCrest,72);p.advance(72);assert.equal(p.snapshot.stage,'crest');p.advance(1200);assert.equal(p.snapshot.stage,'crest');
 for(const delta of [-1,NaN,Infinity]){const s=p.snapshot;p.advance(delta);assert.deepEqual(p.snapshot,s);}
});

test('Calm water covers every heading and the far edge stays hidden beyond the fog',()=>{
 const desktop=createWaterPlanet(),phone=createWaterPlanet({mobile:true});
 try{
  assert.ok(phone.water.geometry.attributes.position.count<desktop.water.geometry.attributes.position.count);assert.ok(phone.water.geometry.attributes.position.count<35000);assert.ok(desktop.water.geometry.attributes.position.count<85000);
  assert.ok(WATER_RADIUS>desktop.palette.fogFar+1000);assert.equal(desktop.water.frustumCulled,false);
  for(const object of [desktop,phone]){const p=object.water.geometry.attributes.position,indices=object.water.geometry.index;let max=0;for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(p.getX(i)));max=Math.max(max,Math.hypot(p.getX(i),p.getZ(i)));}assert.ok(Math.abs(max-WATER_RADIUS)<.002);for(const index of indices.array)assert.ok(index<p.count);}
  for(let t=0;t<100;t++)assert.ok(Math.abs(sampleWater(0,0,t,tideAt(0)).height)<.156);
 }finally{disposeGroup(desktop.root);disposeGroup(phone.root);}
});

test('The distant wave is visible in the initial phone and desktop view and rises above the horizon',()=>{
 const tide=tideAt(0),pose=waterCameraPose(tide,0,0,-.025);
 for(const aspect of [16/9,390/844]){
  const c=new T.PerspectiveCamera(58,aspect,.1,18000);c.position.set(pose.x,pose.y,pose.z);c.lookAt(...pose.direction.map((d,i)=>d+[pose.x,pose.y,pose.z][i]));c.updateMatrixWorld();
  const peak=new T.Vector3(0,sampleWater(0,tide.centre,0,tide).height,tide.centre).project(c),base=new T.Vector3(0,0,tide.centre).project(c);
  assert.ok(Math.abs(peak.x)<1&&Math.abs(peak.y)<1&&peak.z<1);assert.ok(peak.y-base.y>.015&&peak.y-base.y<.04,'The initial wave should be a small visible ridge, far away');
  for(const relative of [-10,-8,-6,-4,-2]){
   const time=1200+relative,t=tideAt(time),p=waterCameraPose(t,time,0,-.025);c.position.set(p.x,p.y,p.z);c.lookAt(c.position.clone().add(new T.Vector3(...p.direction)));c.updateMatrixWorld();
   const crest=new T.Vector3(0,sampleWater(0,t.centre,time,t).height,t.centre).project(c);
   assert.ok(Math.abs(crest.y)<.94&&crest.z<1,'The camera should keep the looming crest in view during the climb');
  }
 }
});

test('Water supports day/night and rain; meadow fireflies never leak into the ocean',()=>{
 const w=createWaterPlanet({mobile:true}),n=createNightSky({mobile:true}),c=new T.PerspectiveCamera(58,1,.1,18000);c.position.set(0,3,0);c.lookAt(0,3,-10);c.updateMatrixWorld();
 const day=skyAt(new Date('2026-10-11T02:00Z')),night=skyAt(new Date('2026-10-26T12:00Z'));
 try{
  const geometry=w.water.geometry;w.setSky(day);const dayColour=w.water.material.uniforms.waterBody.value.clone();w.setSky(night);assert.notDeepEqual(w.water.material.uniforms.waterBody.value,dayColour);assert.ok(w.water.material.uniforms.moonPower.value>0);
  w.setRain(true);assert.equal(w.water.material.uniforms.rainMood.value,1);assert.equal(w.dome.material.uniforms.rainMood.value,1);w.setRain(false);
  const tide=tideAt(1200);w.update(8,tide);assert.equal(w.water.material.uniforms.waveCentres.value.x,0);assert.ok(w.water.material.uniforms.waveCentres.value.y<-7000);assert.equal(w.water.material.uniforms.waveStrengths.value.y,0);assert.equal(w.water.geometry,geometry);
  const overlap=tideAt(1800);w.update(9,overlap);assert.deepEqual(w.water.material.uniforms.waveCentres.value.toArray(),overlap.waves.map(w=>w.centre));assert.deepEqual(w.water.material.uniforms.waveScales.value.toArray(),overlap.waves.map(w=>w.scale));assert.deepEqual(w.water.material.uniforms.waveStrengths.value.toArray(),[1,1]);
  n.update(10,{camera:c,sky:night,environment:'water',skyScale:WATER_SKY_SCALE});assert.equal(n.fireflies.visible,false);assert.equal(n.fireflies.geometry.drawRange.count,0);assert.equal(n.stars.visible,true);assert.equal(n.stars.parent.scale.x,WATER_SKY_SCALE);
  assert.ok(n.stars.geometry.attributes.position.count>0);assert.ok(new T.Vector3().fromBufferAttribute(n.stars.geometry.attributes.position,0).length()*WATER_SKY_SCALE>WATER_RADIUS,'Stars must stay behind the distant water');
 }finally{disposeGroup(w.root);disposeGroup(n.root);}
});

test('Mouse and touch can look and zoom on water without affecting the meadow controls',()=>{
 const handlers={},canvas={addEventListener:(name,fn)=>handlers[name]=fn,setPointerCapture(){}};let active=false,draws=0;const look=createWaterLook(canvas,{active:()=>active,draw:()=>draws++});
 const pointer=(pointerId,x,y)=>({pointerId,clientX:x,clientY:y,button:0});
 handlers.pointerdown(pointer(1,0,0));handlers.pointermove(pointer(1,100,100));assert.equal(look.view.yaw,0);
 active=true;handlers.pointerdown(pointer(1,0,0));handlers.pointermove(pointer(1,100,100));assert.notEqual(look.view.yaw,0);assert.ok(look.view.pitch>0);handlers.pointerup(pointer(1,100,100));
 handlers.pointerdown(pointer(1,0,0));handlers.pointerdown(pointer(2,100,0));const before=look.view;handlers.pointermove(pointer(2,200,0));assert.ok(look.view.fov<before.fov);assert.equal(look.view.yaw,before.yaw);look.clear();
 let prevented=false;handlers.wheel({deltaY:1e9,preventDefault:()=>prevented=true});assert.equal(prevented,true);assert.ok(look.view.fov<=80);
 look.action('wave');assert.deepEqual(look.view,{yaw:0,pitch:-.025,fov:58});look.aim([1,0,0]);assert.equal(look.view.yaw,Math.PI/2);assert.ok(draws>=4);
});

test('The reported moonless evening still has a visible water moon and matching illumination; switching restores the real meadow moon',()=>{
 const sky=skyAt(new Date('2026-10-11T09:12Z')),original=structuredClone(sky),w=createWaterPlanet({mobile:true}),n=createNightSky({mobile:true});
 assert.ok(sky.moon.altitude<0&&sky.moon.fraction<.02);assert.ok(sky.daylight<.01);
 try{
  w.setSky(sky);const uniforms=w.water.material.uniforms;
  assert.ok(uniforms.moonPower.value>.85);assert.deepEqual(uniforms.moonDirection.value.toArray(),WATER_MOON.direction);
  for(const aspect of [16/9,390/844]){
   const c=new T.PerspectiveCamera(58,aspect,.1,18000),pose=waterCameraPose(tideAt(0),0,0,-.025);c.position.set(pose.x,pose.y,pose.z);c.lookAt(c.position.clone().add(new T.Vector3(...pose.direction)));c.updateMatrixWorld();
   n.update(0,{camera:c,sky,environment:'water',skyScale:WATER_SKY_SCALE});n.root.updateMatrixWorld(true);
   const onScreen=n.moon.getWorldPosition(new T.Vector3()).project(c);assert.ok(Math.abs(onScreen.x)<.9&&Math.abs(onScreen.y)<.9&&onScreen.z<1);
   assert.equal(n.moon.visible,true);assert.ok(n.moon.material.uniforms.visibility.value>.98);assert.ok(n.moon.position.clone().normalize().distanceTo(uniforms.moonDirection.value)<1e-9);
   n.update(0,{camera:c,sky,environment:'water',skyScale:WATER_SKY_SCALE,raining:true});assert.ok(n.moon.material.uniforms.visibility.value>.45);assert.equal(n.stars.visible,false);
   // The same sky timestamp must still rebuild the moon when changing worlds.
   n.update(0,{camera:c,sky,environment:'meadow'});assert.equal(n.moon.visible,false);assert.equal(n.moon.scale.x,1);assert.ok(n.moon.position.clone().normalize().distanceTo(new T.Vector3(...sky.moon.direction))<1e-9);
  }
  assert.deepEqual(sky,original,'The fictional water moon must never change real astronomy data');
 }finally{disposeGroup(w.root);disposeGroup(n.root);}
});
