// Native rendering of the same meshes, materials, clock and lens used by the app.
import fs from 'node:fs';
import * as T from '../vendor/three.module.js';
import {createStormwatch,STORM_VIEWS,stormPose,STORM_ART,STORM_MASK} from '../stormwatch-world.mjs';
const dir='stormwatch-graphics-check';fs.mkdirSync(dir,{recursive:true});
const field=createStormwatch({loadArt:false,mobile:process.argv.includes('--mobile')}),all=[],geometry=[],frames=[];
fs.copyFileSync(STORM_ART,dir+'/refuge.webp');fs.copyFileSync(STORM_MASK,dir+'/surfaces.png');
field.root.updateMatrixWorld(true);field.root.traverse(o=>{if(o.isMesh||o.isPoints)all.push(o);});all.sort((a,b)=>a.renderOrder-b.renderOrder);
for(const [i,o] of all.entries()){
 const g=o.geometry,attributes={};for(const [name,a] of Object.entries(g.attributes)){
  const file=i+'-'+name+'.bin';fs.writeFileSync(dir+'/'+file,Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));attributes[name]={file,size:a.itemSize};
 }
 const indices=g.index?i+'-idx.bin':null;if(indices)fs.writeFileSync(dir+'/'+indices,Buffer.from(new Uint32Array(g.index.array).buffer));
 geometry.push({attributes,indices,points:!!o.isPoints,vertices:g.attributes.position.count,count:g.index?.count||g.attributes.position.count});
}
function frame(name,view,w,h,t,settings={}){
 field.configure(settings);field.update(t);
 const pose=stormPose(view,w/h),cam=new T.PerspectiveCamera(pose.fov,w/h,.1,18000);
 cam.position.fromArray(pose.position);cam.lookAt(new T.Vector3(...pose.direction));cam.updateMatrixWorld(true);
 frames.push({name,width:w,height:h,clear:[.19,.16,.12,1],objects:all.map((o,i)=>({name:o.name,geometry:i,depthTest:o.material.depthTest,points:!!o.isPoints,depthWrite:o.material.depthWrite,transparent:o.material.transparent,additive:false,
  vertex:o.material.vertexShader,fragment:o.material.fragmentShader,uniforms:{
   ...Object.fromEntries(Object.entries(o.material.uniforms).map(([k,{value:v}])=>[k,v?.toArray?v.toArray():v])),
   ready:1,photograph:{texture:'refuge.webp',flipY:true,mipmaps:true},surfaces:{texture:'surfaces.png',flipY:true,mipmaps:true},viewportHeight:h,
   projectionMatrix:cam.projectionMatrix.elements,modelViewMatrix:new T.Matrix4().multiplyMatrices(cam.matrixWorldInverse,o.matrixWorld).elements,modelMatrix:o.matrixWorld.elements,viewMatrix:cam.matrixWorldInverse.elements,cameraPosition:cam.position.toArray()
  }}))});
}
if(process.argv.includes('--particles-check')){
 frame('particles-on',STORM_VIEWS.window,1280,720,7,{stormRain:false,stormLightning:false});
 frame('particles-off',STORM_VIEWS.window,1280,720,7,{stormRain:false,stormLightning:false});
 frames.at(-1).objects=frames.at(-1).objects.filter(o=>!['crest-foam-particles','wave-impact-droplets'].includes(o.name));
}else if(process.argv.includes('--wild')){
 for(let i=0;i<288;i++)frame('shot-'+String(i).padStart(4,'0'),i<216?STORM_VIEWS.window:STORM_VIEWS.refuge,960,540,4+i/24,{stormRain:i>=216,stormLightning:false});
}else if(process.argv.includes('--swells')){
 for(let i=0;i<384;i++)frame('shot-'+String(i).padStart(4,'0'),i<288?STORM_VIEWS.window:STORM_VIEWS.refuge,960,540,4+i/24,{stormRain:i>=288,stormLightning:false});
}else if(process.argv.includes('--swell-stills')){
 for(const t of [4,12,24])frame('swells-'+t,STORM_VIEWS.window,1280,720,t,{stormRain:false,stormLightning:false});
 frame('swells-refuge',STORM_VIEWS.refuge,1280,720,7,{stormLightning:false});
}else if(process.argv.includes('--film')){
 let shot=0;
 for(const [view,count,settings] of [[STORM_VIEWS.refuge,144,{}],[STORM_VIEWS.window,144,{stormRain:false}],[STORM_VIEWS.fire,96,{}]]){
  for(let i=0;i<count;i++){frame('shot-'+String(shot).padStart(4,'0'),view,960,540,4+shot/24,settings);shot++;}
 }
}else if(process.argv.includes('--mobile')){
 frame('phone-quality',STORM_VIEWS.refuge,390,844,7);
}else if(process.argv.includes('--detail')){
 frame('window',STORM_VIEWS.window,1280,720,7,{stormRain:false});frame('fire',STORM_VIEWS.fire,1280,720,7);
}else{
 frame('refuge',STORM_VIEWS.refuge,1672,941,4);
 frame('window',STORM_VIEWS.window,1280,720,9.7);
 frame('fire',STORM_VIEWS.fire,1280,720,6);
 frame('phone',STORM_VIEWS.refuge,390,844,4);
 frame('phone-fire',STORM_VIEWS.fire,390,844,6);
 frame('rain-off',STORM_VIEWS.refuge,960,540,4,{stormRain:false});
 frame('refuge-later',STORM_VIEWS.refuge,960,540,12);
 field.ocean.water.material.uniforms.wire.value=1;frame('wave-mesh',STORM_VIEWS.window,1280,720,4,{stormRain:false});field.ocean.water.material.uniforms.wire.value=0;
}
fs.writeFileSync(dir+'/frames.json',JSON.stringify({geometry,frames}));
console.log('Stormwatch:',geometry.reduce((n,g)=>n+(g.points?0:g.count/3),0),'triangles;',all.length,'draw calls;',frames.length,'frames.');
