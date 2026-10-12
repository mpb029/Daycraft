import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createForest,forestCameraPose} from '../forest-world.mjs';
import {FOREST_VIEW} from '../forest-geometry.mjs';
import {createAtmosphere} from '../meadow-atmosphere.mjs';
import {skyAt} from '../sky-time.mjs';
const directory='forest-graphics-check';fs.mkdirSync(directory,{recursive:true});
fs.copyFileSync(new URL('../assets/forest/foliage.png',import.meta.url),`${directory}/foliage.png`);
fs.copyFileSync(new URL('../assets/forest/bark.png',import.meta.url),`${directory}/bark.png`);
const frames=[],geometry=[],registered=new Map(),textureIds=new Map();
function geometryId(o){if(registered.has(o.geometry))return registered.get(o.geometry);const id=geometry.length,g=o.geometry,attributes={};for(const [name,attribute] of Object.entries(g.attributes)){const file=`geometry-${id}-${name}.bin`,p=attribute.array;fs.writeFileSync(`${directory}/${file}`,Buffer.from(p.buffer,p.byteOffset,p.byteLength));attributes[name]={file,size:attribute.itemSize};}const index=g.index?new Uint32Array(g.index.array):null,file=`geometry-${id}-index.bin`;if(index)fs.writeFileSync(`${directory}/${file}`,Buffer.from(index.buffer));geometry.push({attributes,indices:index?file:null,count:index?index.length:g.attributes.position.count});registered.set(g,id);return id;}
function value(v){if(v?.isTexture){if(!v.image?.data)return {texture:null};if(!textureIds.has(v)){const file=`texture-${textureIds.size}.bin`;fs.writeFileSync(`${directory}/${file}`,Buffer.from(v.image.data));textureIds.set(v,{texture:file,width:v.image.width,height:v.image.height,srgb:v.colorSpace===T.SRGBColorSpace,flipY:v.flipY});}return textureIds.get(v);}return v?.toArray?v.toArray():v;}
function objects(f,c,reflection=false,reflectionFile=null,rain=null){
 f.root.updateMatrixWorld(true);rain?.updateMatrixWorld(true);
 const list=f.root.children.filter(o=>o.visible&&o.isMesh&&(!reflection||o!==f.ground&&o!==f.glow)).sort((a,b)=>(a===f.dome?-1:b===f.dome?1:0)||a.renderOrder-b.renderOrder);
 if(rain?.visible)list.push(rain);
 return list.map(o=>{
  // The atmosphere uses Three's unlit LineBasicMaterial; this is its position,
  // colour, opacity and linear-fog path for the native shader check.
  const line=o.isLineSegments,vertex=line?`varying float fogDepth;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);fogDepth=-mv.z;gl_Position=projectionMatrix*mv;}`:o.material.vertexShader;
  const fragment=line?`uniform vec3 diffuse;uniform float opacity;uniform vec3 fogColour;varying float fogDepth;void main(){gl_FragColor=vec4(mix(diffuse,fogColour,smoothstep(65.0,310.0,fogDepth)),opacity);#include <colorspace_fragment>}`:o.material.fragmentShader;
  const uniforms=line?{diffuse:o.material.color,opacity:o.material.opacity,fogColour:f.uniforms.forestFog.value}:Object.fromEntries(Object.entries(o.material.uniforms).map(([k,u])=>[k,u.value]));
  return {name:o.name,geometry:geometryId(o),points:false,lines:!!line,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:o.material.blending===T.AdditiveBlending,vertex,fragment:T.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v); }\n'+fragment.replace('#include <colorspace_fragment>',T.ShaderChunk.colorspace_fragment),uniforms:{...Object.fromEntries(Object.entries(uniforms).map(([k,v])=>[k,k==='foliageMap'?{texture:'foliage.png',srgb:true,flipY:true}:k==='barkMap'?{texture:'bark.png',srgb:true,flipY:true,repeat:true}:k==='reflectionMap'&&reflectionFile?{texture:reflectionFile,srgb:true,flipY:true}:value(v)])),projectionMatrix:c.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(c.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:c.matrixWorldInverse.elements,cameraPosition:c.position.toArray()}};
 });
}
for(const mobile of [false,true]){
const forest=createForest({mobile}),atmosphere=createAtmosphere({mobile});
for(const [name,date,yaw,wet,pitch] of mobile?[['phone-night','2026-10-12T09:00Z',.22,true,.09]]:[['night','2026-10-12T09:00Z',0,true,.09],['day','2026-10-12T02:00Z',0,true,.09],['reverse','2026-10-12T09:00Z',Math.PI,true,.09],['canopy','2026-10-12T09:00Z',0,false,1.0]]){
const width=mobile?390:1200,height=mobile?844:675,camera=new T.PerspectiveCamera(60,width/height,.1,1800),p=forestCameraPose({...FOREST_VIEW,yaw,pitch});camera.position.fromArray(p.position);camera.lookAt(camera.position.clone().add(new T.Vector3(...p.direction)));camera.updateMatrixWorld();forest.setSky(skyAt(new Date(date)));forest.setRain(wet);forest.update(30,{camera});forest.dome.position.copy(camera.position);atmosphere.update(30,{camera,motion:true,raining:wet,daytime:false});atmosphere.root.updateMatrixWorld(true);
const mirror=camera.clone();mirror.position.y*=-1;const d=camera.getWorldDirection(new T.Vector3());d.y*=-1;mirror.up.set(0,-1,0);mirror.lookAt(mirror.position.clone().add(d));mirror.updateMatrixWorld();forest.uniforms.reflectionReady.value=0;frames.push({name:'reflection-'+name,width:512,height:512,objects:objects(forest,mirror,true,null,atmosphere.rain)});
forest.uniforms.reflectionMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);forest.uniforms.reflectionReady.value=1;frames.push({name,width,height,objects:objects(forest,camera,false,'reflection-'+name+'.png',atmosphere.rain)});
}
}
fs.writeFileSync(`${directory}/frames.json`,JSON.stringify({geometry,frames}));console.log(`Exported ${frames.length} forest render passes.`);
