// Run at repository root, then python3 verification/render-cinema-graphics.py --poolrooms.
// Exports actual geometry, shaders and matrices, including reflection and transmission passes.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createPoolrooms,POOL_STATIONS,poolPose,poolMirror,POOL_ART,POOL_LIGHT} from '../poolrooms-world.mjs';
const dir='poolrooms-graphics-check';fs.mkdirSync(dir,{recursive:true});
const scene=createPoolrooms({loadArt:false}),all=scene.root.children,U=scene.uniforms,geometry=[],frames=[];
scene.root.updateMatrixWorld(true);
fs.copyFileSync(POOL_ART,dir+'/reference.webp');if(fs.existsSync(POOL_LIGHT))fs.copyFileSync(POOL_LIGHT,dir+'/light.png');
for(const [i,o] of all.entries()){
 const g=o.geometry,attributes={};for(const [name,a] of Object.entries(g.attributes)){
  const file=i+'-'+name+'.bin';fs.writeFileSync(dir+'/'+file,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));attributes[name]={file,size:a.itemSize};
 }
 const indices=i+'-idx.bin';fs.writeFileSync(dir+'/'+indices,Buffer.from(new Uint32Array(g.index.array).buffer));
 geometry.push({attributes,indices,vertices:g.attributes.position.count,count:g.index.count});
}
const ftex=(name,mips=false)=>({texture:name,srgb:false,flipY:true,mipmaps:mips});
function exportFrame(name,camera,width,height,objects,overrides){
 const sceneObjects=objects.map(o=>{const m=o.material;return {name:o.name,geometry:all.indexOf(o),depthWrite:m.depthWrite,transparent:m.transparent,additive:false,points:false,
  vertex:m.vertexShader,fragment:m.fragmentShader,uniforms:{
   ...Object.fromEntries(Object.entries(m.uniforms).map(([k,{value:v}])=>[k,v?.toArray?v.toArray():v])),
   ...overrides,lightReady:fs.existsSync(POOL_LIGHT)?1:0,irradiance:{texture:fs.existsSync(POOL_LIGHT)?'light.png':null,srgb:false,flipY:false},photograph:ftex('reference.webp',true),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()
  }};});
 frames.push({name,width,height,clear:[.54,.62,.55,1],objects:sceneObjects});
}
const film=process.argv.includes('--film');let sequence=0;
for(const [name,station,w,h,time] of [['bend','bend',1672,941,4],['spillway','spillway',1360,765,7],['passage','passage',1360,765,7],['phone','bend',390,844,4],['bend-later','bend',900,507,10]]){
 const view=POOL_STATIONS[station],p=poolPose(view,station),cam=new T.PerspectiveCamera(view.fov,w/h,.1,1800);
 cam.position.fromArray(p.position);cam.lookAt(cam.position.clone().add(new T.Vector3(...p.direction)));cam.updateMatrixWorld();
 const mirror=poolMirror(cam),arch=all.filter(m=>m!==scene.water&&m!==scene.fall),ratio=Math.min(1,(name==='phone'?416:704)/Math.max(w,h)),tw=Math.round(w*ratio),th=Math.round(h*ratio);
 scene.update(time);U.mirrorMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
 exportFrame('reflection-'+name,mirror,tw,th,arch,{reflectPass:1,plateReady:0});
 exportFrame('transmission-'+name,cam,tw,th,arch,{reflectPass:0,plateReady:0});
 const pass={reflectPass:0,plateReady:station==='bend'?1:0,reflected:ftex('reflection-'+name+'.png'),refracted:ftex('transmission-'+name+'.png')};
 exportFrame(name,cam,w,h,all,pass);
 if(film&&name===station){const n={bend:60,spillway:48,passage:36}[name];
  for(let i=0;i<n;i++){scene.update(time+i/18);exportFrame('shot-'+String(sequence++).padStart(4,'0'),cam,960,540,all,pass);}
 }
}
fs.writeFileSync(dir+'/frames.json',JSON.stringify({geometry,frames}));
console.log('Poolrooms:',geometry.reduce((n,g)=>n+g.count/3,0),'triangles;',geometry.length,'batches;','3 stations, portrait framing and animation checks.');
