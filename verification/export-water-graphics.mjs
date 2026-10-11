import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createWaterPlanet} from '../water-world.mjs';
import {createNightSky} from '../meadow-night.mjs';
import {tideAt,waterCameraPose} from '../water-cycle.mjs';
import {skyAt} from '../sky-time.mjs';
const directory='water-graphics-check';fs.mkdirSync(directory,{recursive:true});
const desktop=createWaterPlanet(),phone=createWaterPlanet({mobile:true}),night=createNightSky(),frames=[],geometry=[],registered=new Map();
function geometryId(o){
 if(registered.has(o.geometry))return registered.get(o.geometry);
 const id=geometry.length,g=o.geometry,attributes={};
 for(const [name,attribute] of Object.entries(g.attributes)){
  const file=`geometry-${id}-${name}.bin`,p=attribute.array;
  fs.writeFileSync(`${directory}/${file}`,Buffer.from(p.buffer,p.byteOffset,p.byteLength));attributes[name]={file,size:attribute.itemSize};
 }
 const index=g.index?new Uint32Array(g.index.array):null,file=`geometry-${id}-index.bin`;
 if(index)fs.writeFileSync(`${directory}/${file}`,Buffer.from(index.buffer));
 geometry.push({attributes,indices:index?file:null,count:index?index.length:g.attributes.position.count});registered.set(g,id);return id;
}
for(const [name,seconds,aspect,date,rain=false,yaw=0] of [
 ['calm',0,16/9,'2026-10-11T02:00Z'],['approach',1170,16/9,'2026-10-11T02:00Z'],
 ['night',0,16/9,'2026-10-11T09:12Z'],['night-approach',1170,16/9,'2026-10-11T09:12Z'],
 ['night-crest',1203,16/9,'2026-10-11T09:12Z'],['night-settling',1240,16/9,'2026-10-11T09:12Z'],
 ['night-phone',0,390/844,'2026-10-11T09:12Z'],['night-rain',0,16/9,'2026-10-11T09:12Z',true],
 ['night-away',0,16/9,'2026-10-11T09:12Z',false,Math.PI],['full-moon',0,16/9,'2026-10-26T12:00Z']]){
 const width=aspect<1?390:960,height=aspect<1?844:540,camera=new T.PerspectiveCamera(58,aspect,.1,18000),tide=tideAt(seconds),p=waterCameraPose(tide,seconds,yaw,-.025),w=aspect<1?phone:desktop,sky=skyAt(new Date(date));
 camera.position.set(p.x,p.y,p.z);camera.lookAt(p.x+p.direction[0],p.y+p.direction[1],p.z+p.direction[2]);camera.updateMatrixWorld();w.update(seconds,tide);w.setRain(rain);w.setSky(sky);w.dome.position.copy(camera.position);w.root.updateMatrixWorld(true);
 night.update(seconds,{camera,sky,raining:rain,environment:'water',skyScale:5});night.root.updateMatrixWorld(true);
 const objects=[w.dome,w.water,...[night.stars,night.moon,night.sun].filter(o=>o.visible)].map(o=>({
  name:o.name,geometry:geometryId(o),points:!!o.isPoints,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:o.material.blending===T.AdditiveBlending,
  vertex:o.material.vertexShader,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 value){return sRGBTransferOETF(value);}\n'+o.material.fragmentShader.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),
  uniforms:{...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,u])=>[k,u.value?.toArray?u.value.toArray():u.value])),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()}
 }));
 frames.push({name,width,height,objects});
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));
console.log(`Exported ${frames.length} GPU checks with actual desktop/phone geometry, moon and stars.`);
