// Exports the actual runtime meshes/shaders for a native GLES visual check.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createMall,MALL_VIEWS,mallPose,MALL_ART,MALL_MASK} from '../mall-world.mjs';
const dir='mall-graphics-check';fs.mkdirSync(dir,{recursive:true});
const field=createMall({loadArt:false,mobile:process.argv.includes('--mobile')}),all=[],geometry=[],frames=[];
fs.copyFileSync(MALL_ART,dir+'/atrium.webp');fs.copyFileSync(MALL_MASK,dir+'/surfaces.png');
fs.copyFileSync('assets/mall/liquid-flow.webp',dir+'/liquid-flow.webp');
fs.copyFileSync('assets/mall/escalators.png',dir+'/escalators.png');
field.root.updateMatrixWorld(true);field.root.traverse(o=>{if(o.isMesh||o.isPoints)all.push(o);});all.sort((a,b)=>a.renderOrder-b.renderOrder);
for(const [i,o] of all.entries()){
 const g=o.geometry,attributes={};for(const [name,a] of Object.entries(g.attributes)){
  const file=i+'-'+name+'.bin';fs.writeFileSync(dir+'/'+file,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));attributes[name]={file,size:a.itemSize};
 }
 const indices=g.index?i+'-idx.bin':null;if(indices)fs.writeFileSync(dir+'/'+indices,Buffer.from(new Uint32Array(g.index.array).buffer));
 geometry.push({attributes,indices,points:!!o.isPoints,vertices:g.attributes.position.count,count:g.index?.count||g.attributes.position.count});
}
function frame(name,view,w,h,t){
 field.update(t);const pose=mallPose(view,w/h),cam=new T.PerspectiveCamera(pose.fov,w/h,.1,1000);
 cam.position.fromArray(pose.position);cam.lookAt(new T.Vector3(...pose.direction));cam.updateMatrixWorld(true);
 frames.push({name,width:w,height:h,clear:[.35,.32,.27,1],objects:all.map((o,i)=>({name:o.name,geometry:i,depthTest:o.material.depthTest,points:!!o.isPoints,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,
  vertex:o.material.vertexShader,fragment:o.material.fragmentShader,uniforms:{
   ...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,v?.toArray?v.toArray():v])),
   ready:1,escalatorMask:{texture:'escalators.png',flipY:true,mipmaps:true},flowAtlas:{texture:'liquid-flow.webp',flipY:true,mipmaps:false},photograph:{texture:'atrium.webp',flipY:true,mipmaps:true},surfaces:{texture:'surfaces.png',flipY:true,mipmaps:true},viewportHeight:h,
   projectionMatrix:cam.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(cam.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:cam.matrixWorldInverse.elements,cameraPosition:cam.position.toArray()
  }}))});
}
if(process.argv.includes('--escalator-film')){
 for(let i=0;i<240;i++)frame('shot-'+String(i).padStart(4,'0'),i<72?MALL_VIEWS.atrium:{yaw:.22,pitch:.09,fov:26},960,540,2+i/24);
}else if(process.argv.includes('--escalators')){
 frame('escalators',{yaw:.22,pitch:.09,fov:26},1672,941,2);
 frame('escalators-later',{yaw:.22,pitch:.09,fov:26},1672,941,2.35);
 frame('escalators-paused',{yaw:.22,pitch:.09,fov:26},1672,941,2.35);
}else if(process.argv.includes('--froth-film')){
 for(let i=0;i<288;i++)frame('froth-'+String(i).padStart(4,'0'),i<96?MALL_VIEWS.atrium:MALL_VIEWS.fountain,960,540,3+i/24);
}else if(process.argv.includes('--film')){
 for(let i=0;i<384;i++)frame('shot-'+String(i).padStart(4,'0'),i<144?MALL_VIEWS.atrium:i<288?MALL_VIEWS.fountain:MALL_VIEWS.shops,1280,720,3+i/24);
}else if(process.argv.includes('--mobile')){
 frame('phone-quality',MALL_VIEWS.fountain,390,844,4);
}else{
 for(const [name,view] of Object.entries(MALL_VIEWS))frame(name,view,1672,941,4);
 frame('phone',MALL_VIEWS.fountain,390,844,4);
 frame('fountain-later',MALL_VIEWS.fountain,1672,941,7);
 frame('fountain-paused',MALL_VIEWS.fountain,1672,941,7);
}
fs.writeFileSync(dir+'/frames.json',JSON.stringify({geometry,frames}));
console.log('Mall:',geometry.reduce((n,g)=>n+(g.points?0:g.count/3),0),'triangles;',all.length,'draw calls;',frames.length,'frames.');
