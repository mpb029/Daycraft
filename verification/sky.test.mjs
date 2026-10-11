import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three.module.js';
import {RotateVector,Vector,Observer,Rotation_EQJ_HOR} from '../astronomy-engine.mjs';
import {skyAt,currentSky,horizonDirection,moonLighting,skyClockText} from '../sky-time.mjs';
import {DEFAULT_SKY_LOCATION,normaliseSkyLocation,manualSkyLocation,requestSkyLocation} from '../sky-location.mjs';
import {createNightSky,firefliesInView} from '../meadow-night.mjs';
import {createAtmosphere} from '../meadow-atmosphere.mjs';
import {terrainHeight,createMeadow,createMeadowLights,groundIsOccupied} from '../meadow-terrain.mjs';
import {applySkyLighting,pointCameraAtSky} from '../world-renderer.mjs';
import {initialState,validateState} from '../domain.mjs';
import {disposeGroup} from '../world-models.mjs';

const at=iso=>skyAt(new Date(iso));
const noon=at('2026-10-11T02:00:00Z'),night=at('2026-10-11T12:00:00Z'),full=at('2026-10-26T12:00:00Z');
function camera(aspect=16/9){const c=new T.PerspectiveCamera(54,aspect,.1,1800);c.position.set(15,6.8,28);c.lookAt(0,1.4,0);c.updateMatrixWorld();return c;}

test('Saved sky location is backwards compatible, bounded and preserved by backups',()=>{
 const old=initialState();delete old.settings.skyLocation;assert.deepEqual(validateState(old).settings.skyLocation,DEFAULT_SKY_LOCATION);
 const s=initialState();s.settings.skyLocation=manualSkyLocation('51.5','-0.1','London');s.settings.rain=true;
 const restored=validateState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored,s);
 for(const value of [{latitude:NaN,longitude:1},{latitude:91,longitude:0},{latitude:0,longitude:-181},{latitude:'0',longitude:'0'},null])assert.deepEqual(normaliseSkyLocation(value),DEFAULT_SKY_LOCATION);
 for(const pair of [['','0'],['0',''],['91','0'],['0','Infinity'],['-91','0']])assert.throws(()=>manualSkyLocation(...pair));
 assert.deepEqual(manualSkyLocation('0','0','Equator'),{latitude:0,longitude:0,label:'Equator',source:'manual'});
});

test('Location is requested once, rounded for storage, and errors do not overwrite the saved place',async()=>{
 let count=0,options;const saved={...DEFAULT_SKY_LOCATION};
 const place=await requestSkyLocation({getCurrentPosition(ok,fail,opts){count++;options=opts;ok({coords:{latitude:51.507351,longitude:-.127758}});}});
 assert.equal(count,1);assert.equal(options.enableHighAccuracy,false);assert.equal(options.timeout,10000);assert.equal(place.latitude,51.507);assert.equal(place.longitude,-.128);
 for(const code of [1,2,3])await assert.rejects(requestSkyLocation({getCurrentPosition(ok,fail){fail({code});}}),/has not changed/);
 await assert.rejects(requestSkyLocation(null),/unavailable/);assert.deepEqual(saved,DEFAULT_SKY_LOCATION);
});

test('Sunlight follows the actual instant, longitude, season and polar day or night',()=>{
 assert.equal(noon.daytime,true);assert.equal(noon.night,0);assert.ok(noon.sun.altitude>60);
 assert.equal(night.daytime,false);assert.equal(night.night,1);assert.ok(night.sun.altitude<-40);
 const opposite=skyAt(new Date('2026-10-11T02:00Z'),{latitude:26.2,longitude:-27.33});assert.equal(opposite.daytime,false);
 const june=at('2026-06-21T02:00Z'),december=at('2026-12-21T02:00Z');assert.ok(december.sun.altitude-june.sun.altitude>40);
 for(const lat of [-90,90])for(const iso of ['2026-06-21T00:00Z','2026-12-21T00:00Z']){
  const sky=skyAt(new Date(iso),{latitude:lat,longitude:0});for(const v of [...sky.sun.direction,...sky.moon.direction,...sky.moon.light])assert.ok(Number.isFinite(v));
  assert.equal(sky.daytime,iso.includes('06-21')?lat>0:lat<0);
 }
});

test('Lunar phases agree with independent US Naval Observatory published 2026 UTC events',()=>{
 // Source: https://aa.usno.navy.mil/calculated/moon/phases?year=2026
 // Published to the minute. Phase angle has a 0.03° tolerance; illumination
 // is not exactly 0/1 at new/full moon because of the Moon’s orbital latitude.
 for(const [iso,expected,name,fraction] of [
  ['2026-10-10T15:50Z',0,'New moon',0],['2026-10-18T16:12Z',90,'First quarter',.5],
  ['2026-10-26T04:12Z',180,'Full moon',1],['2026-11-01T20:28Z',270,'Last quarter',.5]
 ]){const m=at(iso).moon;const error=Math.abs(((m.phase-expected+540)%360)-180);assert.ok(error<.03,iso);assert.equal(m.name,name);assert.ok(Math.abs(m.fraction-fraction)<.004);}
 const date=new Date('2026-10-18T18:00Z'),north=skyAt(date,{latitude:51.5,longitude:0}),south=skyAt(date,{latitude:-26.2,longitude:0});
 assert.equal(north.moon.fraction,south.moon.fraction);assert.ok(north.moon.light[0]>0&&south.moon.light[0]<0,'The bright limb must tilt with the observer, not use one hemisphere’s fixed crescent');
});

test('The moon disc has the requested illuminated fraction and bright limb toward the sun',()=>{
 for(const fraction of [0,.05,.25,.5,.75,.95,1]){
  const lighting=moonLighting(20,40,horizonDirection(100,20),fraction);let lit=0,total=0;
  for(let ix=-100;ix<=100;ix++)for(let iy=-100;iy<=100;iy++){
   const x=ix/100,y=iy/100,r=x*x+y*y;if(r>=1)continue;total++;if(x*lighting.light[0]+y*lighting.light[1]+Math.sqrt(1-r)*lighting.light[2]>0)lit++;
  }
  assert.ok(Math.abs(lit/total-fraction)<.004,`${fraction}: ${lit/total}`);
 }
 const east=moonLighting(0,0,[1,0,0],.5),west=moonLighting(0,0,[-1,0,0],.5);assert.ok(east.light[0]>.99);assert.ok(west.light[0]<-.99);
});

test('The real sky clock advances without animation and handles a corrected device clock or location',()=>{
 const first=currentSky(DEFAULT_SKY_LOCATION,new Date('2026-10-11T02:00:00Z'));
 assert.equal(currentSky(DEFAULT_SKY_LOCATION,new Date('2026-10-11T02:00:19Z')),first);
 const later=currentSky(DEFAULT_SKY_LOCATION,new Date('2026-10-11T12:00:00Z'));assert.notEqual(later,first);assert.equal(later.period,'Night');
 const corrected=currentSky(DEFAULT_SKY_LOCATION,new Date('2026-10-11T02:00:00Z'));assert.equal(corrected.period,'Daylight');
 const elsewhere=currentSky({latitude:26.2,longitude:-27.33},new Date('2026-10-11T02:00:00Z'));assert.equal(elsewhere.period,'Night');
 assert.match(skyClockText(first,'Australia/Brisbane',new Date(first.at)),/12:00 pm/);
});

test('Night removes balloons and leaves; stars, moon and fireflies respect horizon, weather and calm mode',()=>{
 const c=camera(),a=createAtmosphere(),n=createNightSky(),phone=createNightSky({mobile:true});
 try{
  a.update(100,{camera:c,daytime:true});assert.ok(a.balloons.some(b=>b.visible));assert.equal(a.leaves.visible,true);
  a.update(100,{camera:c,daytime:false});assert.ok(a.balloons.every(b=>!b.visible));assert.equal(a.leaves.visible,false);
  n.update(100,{camera:c,sky:noon});assert.equal(n.stars.visible,false);assert.equal(n.fireflies.geometry.drawRange.count,0);
  n.update(100,{camera:c,sky:night});assert.equal(n.stars.visible,true);assert.equal(n.moon.visible,false);assert.ok(n.fireflies.geometry.drawRange.count>20);
  n.update(100,{camera:c,sky:full});assert.equal(n.moon.visible,true);assert.ok(n.moon.position.clone().normalize().distanceTo(new T.Vector3(...full.moon.direction))<1e-9);
  n.update(100,{camera:c,sky:full,raining:true});assert.equal(n.stars.visible,false);assert.ok(n.moon.material.uniforms.visibility.value<.03);
  n.update(100,{camera:c,sky:night,motion:false});const positions=n.fireflies.geometry.attributes.position.array.slice(),strength=n.fireflies.geometry.attributes.strength.array.slice();
  n.update(900,{camera:c,sky:night,motion:false});assert.deepEqual(n.fireflies.geometry.attributes.position.array,positions);assert.deepEqual(n.fireflies.geometry.attributes.strength.array,strength);
  n.update(900,{camera:c,sky:night,editing:true});assert.equal(n.fireflies.geometry.drawRange.count,0);
  phone.update(100,{camera:c,sky:night});assert.ok(phone.stars.geometry.attributes.position.count<n.stars.geometry.attributes.position.count);assert.ok(phone.fireflies.geometry.drawRange.count<=40);
  // Check column/row order and the north-west-up → east-up-south conversion
  // against Astronomy Engine’s own vector rotation, not a duplicated formula.
  const r=Rotation_EQJ_HOR(new Date(night.at),new Observer(night.location.latitude,night.location.longitude,0));
  const expected=RotateVector(r,new Vector(.2,.4,.8,new Date(night.at))),actual=new T.Vector3(.2,.4,.8).applyMatrix4(n.stars.matrix);
  assert.ok(actual.distanceTo(new T.Vector3(-expected.y,expected.z,-expected.x))<1e-10);
 }finally{for(const root of [a.root,n.root,phone.root])disposeGroup(root);}
});

test('Fireflies remain world anchored, above visible grass, and within bounded phone and desktop budgets',()=>{
 for(const aspect of [16/9,390/844]){
  const c=camera(aspect),placed=[{id:'garden',placement:{x:0,z:0,rotation:0}}];
  const first=firefliesInView(c,30,{placed,limit:aspect<1?40:80});assert.ok(first.length>8);assert.ok(first.length<=80);
  for(const f of first){const p=new T.Vector3(f.x,f.y,f.z).project(c);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1&&p.z<1);assert.ok(f.y-terrainHeight(f.x,f.z)>1.8);assert.equal(groundIsOccupied(f.x,f.z,placed),false);}
  c.lookAt(-10,1.4,0);c.updateMatrixWorld();const turned=firefliesInView(c,30,{placed});let shared=0;
  for(const f of first){const same=turned.find(p=>p.id===f.id);if(same){shared++;assert.equal(same.x,f.x);assert.equal(same.y,f.y);assert.equal(same.z,f.z);}}assert.ok(shared>3);
  const moved=firefliesInView(c,31,{placed});assert.ok(moved.some(f=>{const before=turned.find(p=>p.id===f.id);return before&&Math.hypot(f.x-before.x,f.y-before.y,f.z-before.z)>.01;}));
  c.lookAt(c.position.x,1000,c.position.z);c.updateMatrixWorld();assert.equal(firefliesInView(c,30).length,0);
 }
});

test('Night and rain lighting change the existing meadow without replacing ground, grass or saved items',()=>{
 const scene=new T.Scene(),sun=createMeadowLights(scene),field=createMeadow({grassCount:20});scene.add(field.root);scene.fog=new T.Fog('#ffffff',100,400);scene.background=new T.Color();const m={scene,sun,field},geometry=field.ground.geometry;
 try{
  applySkyLighting(m,noon,false);const dayIntensity=sun.intensity,dayFog=scene.fog.color.clone();assert.equal(field.dome.material.uniforms.daylight.value,1);
  applySkyLighting(m,night,false);assert.equal(sun.intensity,0);assert.equal(sun.castShadow,false);assert.ok(sun.userData.ambient.intensity>0);assert.equal(field.dome.material.uniforms.daylight.value,0);assert.notDeepEqual(scene.fog.color,dayFog);
  applySkyLighting(m,full,false);assert.ok(sun.userData.moon.intensity>0);
  applySkyLighting(m,night,true);assert.equal(field.dome.material.uniforms.rainMood.value,1);assert.equal(field.dome.material.uniforms.daylight.value,0);
  applySkyLighting(m,noon,false);assert.equal(sun.intensity,dayIntensity);assert.equal(field.ground.geometry,geometry);assert.equal(field.dome.material.uniforms.rainMood.value,0);
 }finally{disposeGroup(field.root);}
});

test('Sky controls can point above the old orbit limit and center a high moon without moving the eye',()=>{
 const c=camera(),position=c.position.clone(),controls={target:new T.Vector3(),update(){}};
 const m={camera:c,controls};pointCameraAtSky(m,horizonDirection(120,75));c.updateMatrixWorld();
 const target=new T.Vector3(...horizonDirection(120,75)).multiplyScalar(1100).add(position).project(c);
 assert.ok(Math.abs(target.x)<1e-9&&Math.abs(target.y)<1e-9);assert.deepEqual(c.position,position);assert.ok(controls.maxPolarAngle>Math.PI/2);assert.equal(m.mode,'sky');
});
