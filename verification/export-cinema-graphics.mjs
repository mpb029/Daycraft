import fs from 'node:fs';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {createCinema,CINEMA_VIEW,CINEMA_STATIONS,cinemaCameraPose,cinemaMirror} from '../cinema-world.mjs';
import {createCinemaBuilder,CINEMA_FINISH} from '../cinema-materials.mjs';
import {mascotGeometry,MACCAS_MODELS} from '../maccas-models.mjs';
const directory='cinema-graphics-check';fs.mkdirSync(directory,{recursive:true});
const review=process.argv.includes('--mascots');
function mascotReview(){
 const b=createCinemaBuilder();
 b.box(9,.12,7,0,-.07,0,'#b9b8b3','tile');b.box(9,4,.12,0,1.94,-1.8,'#cfc6b3');
 Object.keys(MACCAS_MODELS).forEach((id,i)=>{b.material(id,{file:`./assets/cinema/models/${id}-color.png`,finish:CINEMA_FINISH.fibreglass});b.at((i-1.5)*1.7,0,0,0,()=>b.add(mascotGeometry(id),id),id==='ronald'?1.65:1.5);});
 b.finish({mascots:Object.keys(MACCAS_MODELS)});return {root:b.root,floor:b.root.children.find(m=>m.name==='tile'),uniforms:b.reflection};
}
const gallery=review?mascotReview():createCinema(),geometry=[],frames=[];gallery.root.updateMatrixWorld(true);
for(const [texture,file] of gallery.root.userData.sourceFiles)fs.copyFileSync(file,path.join(directory,path.basename(file)));
const all=gallery.root.children;
for(const object of all){const g=object.geometry,id=geometry.length,attributes={};for(const [name,a] of Object.entries(g.attributes)){const file=`geometry-${id}-${name}.bin`;fs.writeFileSync(`${directory}/${file}`,Buffer.from(a.array.buffer));attributes[name]={file,size:a.itemSize};}const indexFile=g.index?`geometry-${id}-indices.bin`:null;if(indexFile)fs.writeFileSync(`${directory}/${indexFile}`,Buffer.from(new Uint32Array(g.index.array).buffer));geometry.push({attributes,indices:indexFile,vertices:g.attributes.position.count,count:g.index?.count||g.attributes.position.count});}
function objects(camera,mirror=false,reflectionFile=null){
 const sorted=all.filter(o=>o.visible&&(!mirror||o!==gallery.floor)).slice().sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent)||a.renderOrder-b.renderOrder);
 return sorted.map(o=>({name:o.name,geometry:all.indexOf(o),points:false,lines:false,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,vertex:o.material.vertexShader,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v); }\n'+o.material.fragmentShader.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),uniforms:{...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,k==='reflectionMap'&&reflectionFile?{texture:reflectionFile,srgb:true,flipY:true}:v?.isTexture?{texture:gallery.root.userData.sourceFiles.has(v)?path.basename(gallery.root.userData.sourceFiles.get(v)):null,srgb:true,flipY:true,mipmaps:true}:v?.toArray?v.toArray():v])),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()}}));
}
const views=review?[['mascots','mascots',1920,900]]:[['stairs','stairs',1600,1100],['phone','stairs',390,844],['gallery','gallery',1600,1000],['ronald','ronald',1400,1000],['booths','booths',1400,1000],['grimace',{position:[2.75,1.60,3.3],target:[2.95,1.15,1.05],fov:53},1400,1000],['hamburglar',{position:[.2,1.85,-1.4],target:[1.78,1.90,-2.585],fov:49},1400,1000],['birdie',{position:[0,1.85,-3.8],target:[-1.88,1.90,-5.255],fov:49},1400,1000]];
for(const [name,station,width,height] of views){
 const view=review?{fov:44}:typeof station==='object'?station:CINEMA_STATIONS[station],pose=review?{position:[0,1.4,5.4],direction:[0,-.09,-1]}:view.target?{position:view.position,direction:view.target.map((v,i)=>v-view.position[i])}:cinemaCameraPose(view,station),camera=new T.PerspectiveCamera(view.fov,width/height,.06,150);
 camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
 const mirror=cinemaMirror(camera);gallery.uniforms.reflectionReady.value=0;
 frames.push({name:'reflection-'+name,width:768,height:768,objects:objects(mirror,true)});
 gallery.uniforms.reflectionMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);gallery.uniforms.reflectionReady.value=1;
 frames.push({name,width,height,objects:objects(camera,false,'reflection-'+name+'.png')});
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));
console.log(JSON.stringify({batches:geometry.length,vertices:geometry.reduce((n,g)=>n+g.vertices,0),triangles:geometry.reduce((n,g)=>n+g.count/3,0),mascots:gallery.root.userData.mascots.length,views:views.length}));
