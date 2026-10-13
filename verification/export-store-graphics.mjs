import fs from 'node:fs';
import path from 'node:path';
import * as T from '../vendor/three.module.js';
import {createVideoStore} from '../video-store-world.mjs';
import {STORE_VIEW,storeCameraPose} from '../video-store-catalog.mjs';
const directory='store-graphics-check';fs.mkdirSync(directory,{recursive:true});
const store=createVideoStore(),geometry=[],frames=[];store.root.updateMatrixWorld(true);
for(const [texture,file] of store.root.userData.sourceFiles){fs.copyFileSync(file,path.join(directory,path.basename(file)));}
for(const object of store.root.children){const g=object.geometry,id=geometry.length,attributes={};for(const [name,a] of Object.entries(g.attributes)){const file=`geometry-${id}-${name}.bin`;fs.writeFileSync(`${directory}/${file}`,Buffer.from(a.array.buffer));attributes[name]={file,size:a.itemSize};}geometry.push({attributes,indices:null,count:g.attributes.position.count});}
for(const [name,station,width,height,pitch] of [['entrance','entrance',1440,900,STORE_VIEW.pitch],['phone','entrance',390,844,STORE_VIEW.pitch],['shelf','shelf',1440,900,.035],['tv','tv',1200,800,.14]]){
 const pose=storeCameraPose({...STORE_VIEW,yaw:station==='entrance'?STORE_VIEW.yaw:0,pitch},station),camera=new T.PerspectiveCamera(STORE_VIEW.fov,width/height,.1,1800);
 camera.position.fromArray(pose.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...pose.direction)));camera.updateMatrixWorld();
 const objects=store.root.children.map((o,i)=>({name:o.name,geometry:i,points:false,lines:false,depthWrite:true,transparent:false,vertex:o.material.vertexShader,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v); }\n'+o.material.fragmentShader.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),uniforms:{...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,v?.isTexture?{texture:store.root.userData.sourceFiles.has(v)?path.basename(store.root.userData.sourceFiles.get(v)):null,srgb:true,flipY:true,mipmaps:true}:v])),projectionMatrix:camera.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(camera.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:camera.matrixWorldInverse.elements,cameraPosition:camera.position.toArray()}}));
 frames.push({name,width,height,objects});
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));console.log(`Exported ${geometry.length} draw batches, ${store.root.userData.caseCount} VHS cases and ${frames.length} camera views.`);
