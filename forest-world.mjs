import * as T from './vendor/three.module.js';
import {createSkyDome,makeRandom} from './meadow-terrain.mjs';
import {makeForestGeometry,makeForestSignTexture,FOREST_EYE,FOREST_LAMP} from './forest-geometry.mjs';
import {createForestMaterials} from './forest-materials.mjs';

export const FOREST_PALETTE=Object.freeze({sky:'#657c83',horizon:'#9baaa5',fog:'#809691',fogNear:25,fogFar:170});
export function forestCameraPose(view){const {yaw,pitch}=view;return {position:[...FOREST_EYE],direction:[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch)]};}
export function createForest({mobile=false,onReady=()=>{}}={}){
 const root=new T.Group();root.name='Forest bus stop';
 let seconds=0,lastReflection=-Infinity,lastSky=null,disposed=false;
 const ready=()=>{if(disposed)return;lastReflection=-Infinity;onReady();};
 function texture(path,fallback){let tex;if(typeof document!=='undefined'&&typeof document.createElementNS==='function')tex=new T.TextureLoader().load(path,ready);else{tex=new T.DataTexture(new Uint8Array([...fallback,255]),1,1);tex.needsUpdate=true;}tex.colorSpace=T.SRGBColorSpace;return tex;}
 const foliageTexture=texture('./assets/forest/foliage.png',[72,103,49]),barkTexture=texture('./assets/forest/bark.png',[86,82,68]);barkTexture.wrapS=barkTexture.wrapT=T.RepeatWrapping;
 const data=makeForestGeometry({mobile}),signTexture=makeForestSignTexture(),materials=createForestMaterials(signTexture,foliageTexture,barkTexture),u=materials.uniforms;
 const dome=createSkyDome('forest',FOREST_PALETTE);dome.name='Forest sky';dome.material.uniforms.nightTop.value.set('#09172a');dome.material.uniforms.nightHorizon.value.set('#233b55');root.add(dome);
 const names=['Ancient trees and spreading roots','Canopy, broad leaves and ferns','Bus stop, lamp and roadside details','Layered camphor foliage'];
 data.geometries.forEach((g,i)=>{const mesh=new T.Mesh(g,materials.solid);mesh.name=names[i];root.add(mesh);});
 const ground=new T.Mesh(data.ground,materials.ground);ground.name='Wet road and reflective puddles';root.add(ground);
 const glow=new T.Mesh(new T.PlaneGeometry(2.25,2.25),materials.glow);glow.position.set(...FOREST_LAMP);glow.name='Warm lamplight in the rain';glow.renderOrder=5;root.add(glow);
 const beam=new T.Mesh(new T.ConeGeometry(2.14,4.65,32,1,false),materials.beam);beam.position.set(FOREST_LAMP[0],FOREST_LAMP[1]-2.325,FOREST_LAMP[2]);beam.name='Soft lamplight through the rain';beam.renderOrder=4;root.add(beam);
 for(const z of [-18,-35,-58,32]){const mist=new T.Mesh(new T.PlaneGeometry(110,6),materials.mist);mist.position.set(0,2.8,z);mist.name='Low drifting woodland mist';mist.renderOrder=2;root.add(mist);}
 const random=makeRandom(331079),rainCount=mobile?420:880,rainPositions=[],rainUV=[];
 for(let i=0;i<rainCount;i++){const x=(random()-.5)*34,y=random()*22,z=-29+random()*48;rainPositions.push(x,y,z,x,y,z);rainUV.push(0,0,0,1);}
 const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.Float32BufferAttribute(rainPositions,3));rainGeometry.setAttribute('uv',new T.Float32BufferAttribute(rainUV,2));
 const rain=new T.LineSegments(rainGeometry,materials.rain);rain.name='Rain catching the lamplight';rain.frustumCulled=false;rain.renderOrder=3;rain.visible=false;root.add(rain);
 const reflection=new T.WebGLRenderTarget(mobile?384:768,mobile?384:768,{depthBuffer:true});reflection.texture.colorSpace=T.LinearSRGBColorSpace;
 const mirror=new T.PerspectiveCamera(),target=new T.Vector3(),direction=new T.Vector3(),lastCamera=new T.Matrix4(),lastProjection=new T.Matrix4();
 root.userData={treeCount:data.treeCount,leafBudget:data.leafBudget,reflectionSize:reflection.width,characters:0};
 // Textures and the offscreen target are owned by this scene and released
 // alongside its geometries when switching backgrounds.
 materials.solid.addEventListener('dispose',()=>{if(disposed)return;disposed=true;signTexture.dispose();foliageTexture.dispose();barkTexture.dispose();reflection.dispose();});
 return {root,dome,ground,glow,beam,rain,palette:FOREST_PALETTE,uniforms:u,
  setRain(value){u.wetness.value=value?1:0;dome.material.uniforms.rainMood.value=value?.22:0;lastReflection=-Infinity;},
  setSky(info){if(lastSky===info)return;lastSky=info;u.daylight.value=info.daylight;u.lampOn.value=1-T.MathUtils.smoothstep(info.daylight,.08,.8);u.forestFog.value.set('#233b55').lerp(new T.Color(FOREST_PALETTE.fog),info.daylight);const d=dome.material.uniforms;d.daylight.value=info.daylight;d.dusk.value=0;d.sunDirection.value.fromArray(info.sun.direction);lastReflection=-Infinity;},
  update(time,{camera,motion=true,breeze=true}={}){seconds=time;u.forestTime.value=time;u.breeze.value=motion&&breeze?1:0;rain.visible=motion&&u.wetness.value>.5;if(camera)glow.quaternion.copy(camera.quaternion);},
  beforeRender(renderer,scene,camera){
   if(disposed)return;camera.updateMatrixWorld();const moved=!lastCamera.equals(camera.matrixWorld)||!lastProjection.equals(camera.projectionMatrix);
   if(!moved&&seconds-lastReflection<(mobile?.2:.12))return;
   mirror.copy(camera,false);mirror.position.copy(camera.position);mirror.position.y*=-1;camera.getWorldDirection(direction);direction.y*=-1;target.copy(mirror.position).add(direction);mirror.up.set(0,-1,0);mirror.lookAt(target);mirror.updateMatrixWorld();
   u.reflectionMatrix.value.multiplyMatrices(mirror.projectionMatrix,mirror.matrixWorldInverse);
   const old=renderer.getRenderTarget(),groundVisible=ground.visible,glowVisible=glow.visible;ground.visible=false;glow.visible=false;
   try{renderer.setRenderTarget(reflection);renderer.render(scene,mirror);u.reflectionMap.value=reflection.texture;u.reflectionReady.value=1;}finally{ground.visible=groundVisible;glow.visible=glowVisible;renderer.setRenderTarget(old);}
   lastReflection=seconds;lastCamera.copy(camera.matrixWorld);lastProjection.copy(camera.projectionMatrix);
  }
 };
}
