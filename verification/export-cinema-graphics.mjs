import fs from 'node:fs';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {createCinema,CINEMA_VIEW,CINEMA_STATIONS,cinemaCameraPose,cinemaMirror} from '../cinema-world.mjs';
const directory='cinema-graphics-check';fs.mkdirSync(directory,{recursive:true});
const gallery=createCinema(),geometry=[],frames=[];gallery.root.updateMatrixWorld(true);
for(const [texture,file] of gallery.root.userData.sourceFiles)fs.copyFileSync(file,path.join(directory,path.basename(file)));
const all=gallery.root.children;
for(const object of all){const g=object.geometry,id=geometry.length,attributes={};for(const [name,a] of Object.entries(g.attributes)){const file=`geometry-${id}-${name}.bin`;fs.writeFileSync(`${directory}/${file}`,Buffer.from(a.array.buffer));attributes[name]={file,size:a.itemSize};}geometry.push({attributes,indices:null,count:g.attributes.position.count});}
function objects(camera,mirror=false,reflectionFile=null){
 const sorted=all.filter(o=>o.visible&&(!mirror||o!==gallery.floor)).slice().sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent)||a.renderOrder-b.renderOrder);
 return sorted.map(o=>({name:o.name,geometry:all.indexOf(o),points:false,lines:false,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,vertex:o.material.vertexShader,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v); }\n'+o.material.fragmentShader.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),uniforms:{...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,k==='reflectionMap'&&reflectionFile?{texture:reflectionFile,srgb:true,flipY:true}:v?.isTexture?{texture:gallery.root.userData.sourceFiles.has(v)?path.basename(gallery.root.userData.sourceFiles.get(v)):null,srgb:true,flipY:true,mipmaps:true}:v?.toArray?v.toArray():v])),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()}}));
}
const views=[['stairs','stairs',1600,1100],['phone','stairs',390,844],['gallery','gallery',1600,1000],['elephant','elephant',1400,1000],['booths','booths',1400,1000]];
for(const [name,station,width,height] of views){
 const view=CINEMA_STATIONS[station],pose=cinemaCameraPose(view,station),camera=new T.PerspectiveCamera(view.fov,width/height,.06,150);
 camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
 const mirror=cinemaMirror(camera);gallery.uniforms.reflectionReady.value=0;
 frames.push({name:'reflection-'+name,width:768,height:768,objects:objects(mirror,true)});
 gallery.uniforms.reflectionMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);gallery.uniforms.reflectionReady.value=1;
 frames.push({name,width,height,objects:objects(camera,false,'reflection-'+name+'.png')});
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));
console.log(JSON.stringify({batches:geometry.length,vertices:geometry.reduce((n,g)=>n+g.count,0),exhibits:gallery.root.userData.exhibits.length,views:views.length}));
