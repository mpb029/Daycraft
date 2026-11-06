// Native rendering of the same meshes, materials, clock and lens used by the app.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createStormwatch,STORM_VIEWS,stormPose,STORM_ART,STORM_MASK,STORM_HEARTH} from '../stormwatch-world.mjs';
const dir='stormwatch-graphics-check';fs.mkdirSync(dir,{recursive:true});
const field=createStormwatch({loadArt:false}),all=field.root.children,geometry=[],frames=[];
fs.copyFileSync(STORM_ART,dir+'/refuge.webp');fs.copyFileSync(STORM_MASK,dir+'/surfaces.png');
fs.copyFileSync(STORM_HEARTH,dir+'/firelight.webp');
field.root.updateMatrixWorld(true);
for(const [i,o] of all.entries()){
 const g=o.geometry,attributes={};for(const [name,a] of Object.entries(g.attributes)){
  const file=i+'-'+name+'.bin';fs.writeFileSync(dir+'/'+file,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));attributes[name]={file,size:a.itemSize};
 }
 const indices=i+'-idx.bin';fs.writeFileSync(dir+'/'+indices,Buffer.from(new Uint32Array(g.index.array).buffer));
 geometry.push({attributes,indices,vertices:g.attributes.position.count,count:g.index.count});
}
function frame(name,view,w,h,t,settings={}){
 field.configure(settings);field.update(t);
 const pose=stormPose(view,w/h),cam=new T.PerspectiveCamera(pose.fov,w/h,.1,1800);
 cam.position.fromArray(pose.position);cam.lookAt(new T.Vector3(...pose.direction));cam.updateMatrixWorld(true);
 frames.push({name,width:w,height:h,clear:[.19,.16,.12,1],objects:all.map((o,i)=>({name:o.name,geometry:i,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,
  vertex:o.material.vertexShader,fragment:o.material.fragmentShader,uniforms:{
   ...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,v?.toArray?v.toArray():v])),
   ready:1,photograph:{texture:'refuge.webp',flipY:true,mipmaps:true},surfaces:{texture:'surfaces.png',flipY:true,mipmaps:true},hearth:{texture:'firelight.webp',flipY:true,mipmaps:true},
   projectionMatrix:cam.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(cam.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:cam.matrixWorldInverse.elements,cameraPosition:cam.position.toArray()
  }}))});
}
if(process.argv.includes('--film')){
 for(let i=0;i<288;i++)frame('shot-'+String(i).padStart(4,'0'),STORM_VIEWS.refuge,960,540,4+i/24);
}else{
 frame('refuge',STORM_VIEWS.refuge,1672,941,4);
 frame('window',STORM_VIEWS.window,1280,720,9.7);
 frame('fire',STORM_VIEWS.fire,1280,720,6);
 frame('phone',STORM_VIEWS.refuge,390,844,4);
 frame('phone-fire',STORM_VIEWS.fire,390,844,6);
 frame('rain-off',STORM_VIEWS.refuge,960,540,4,{stormRain:false});
 frame('refuge-later',STORM_VIEWS.refuge,960,540,12);
}
fs.writeFileSync(dir+'/frames.json',JSON.stringify({geometry,frames}));
console.log('Stormwatch:',geometry.reduce((n,g)=>n+g.count/3,0),'triangles;',all.length,'draw calls;',frames.length,'frames.');
