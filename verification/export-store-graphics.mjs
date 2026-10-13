import fs from 'node:fs';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {createVideoStore} from '../video-store-world.mjs';
import {STORE_VIEW,storeCameraPose} from '../video-store-catalog.mjs';
const directory='store-graphics-check';fs.mkdirSync(directory,{recursive:true});
const store=createVideoStore(),geometry=[],frames=[];store.root.updateMatrixWorld(true);
for(const [texture,file] of store.root.userData.sourceFiles)fs.copyFileSync(file,path.join(directory,path.basename(file)));
const all=store.root.children;
for(const object of all){const g=object.geometry,id=geometry.length,attributes={};for(const [name,a] of Object.entries(g.attributes)){const file=`geometry-${id}-${name}.bin`;fs.writeFileSync(`${directory}/${file}`,Buffer.from(a.array.buffer));attributes[name]={file,size:a.itemSize};}geometry.push({attributes,indices:null,count:g.attributes.position.count});}
const views=[
 ['entrance','entrance',1600,1000,STORE_VIEW.yaw,STORE_VIEW.pitch,false,false],
 ['phone','entrance',390,844,STORE_VIEW.yaw,STORE_VIEW.pitch,false,false],
 ['shelf','shelf',1440,900,0,-.12,false,false],
 ['tv','tv',1200,800,0,.14,false,false],
 ['windows','window',1440,900,-1.388,.08,false,false],
 ['rain','window',1440,900,-1.388,.08,true,false],
 ['night','window',1440,900,-1.388,.08,true,true],
 ['posters','posters',1440,900,.58,.17,false,false]
];
for(const [name,station,width,height,yaw,pitch,wet,night] of views){
 store.setLiveTime(night);store.setSky({daylight:night?0:1});store.setRain(wet);store.update(2.3);
 const pose=storeCameraPose({...STORE_VIEW,yaw,pitch},station),camera=new T.PerspectiveCamera(STORE_VIEW.fov,width/height,.1,1800);
 camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
 const sorted=all.filter(o=>o.visible).slice().sort((a,b)=>Number(a.material.transparent)-Number(b.material.transparent)||a.renderOrder-b.renderOrder);
 const objects=sorted.map(o=>({name:o.name,geometry:all.indexOf(o),points:false,lines:false,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,vertex:o.material.vertexShader,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v); }\n'+o.material.fragmentShader.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),uniforms:{...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,v?.isTexture?{texture:store.root.userData.sourceFiles.has(v)?path.basename(store.root.userData.sourceFiles.get(v)):null,srgb:true,flipY:true,mipmaps:true}:v])),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()}}));
 frames.push({name,width,height,objects});
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));
console.log(JSON.stringify({batches:geometry.length,vertices:geometry.reduce((n,g)=>n+g.count,0),cases:store.root.userData.caseCount,films:store.root.userData.filmCount,posters:store.root.userData.posterIds.length,views:frames.length}));
