import * as T from './vendor/three.module.js';
import {makeRandom} from './meadow-terrain.mjs';

// Quiet, repeating passages with long gaps. They never depend on task rewards.
export function balloonPass(seconds, index=0) {
 const duration=165+index*20, period=duration+140, start=12+index*122;
 if(seconds<start)return null;
 const phase=((seconds-start)%period)/duration;
 if(phase>=1)return null;
 return {x:(index%2?1:-1)*(210-phase*420),y:34+index*10+Math.sin(phase*Math.PI*2)*1.7,z:-175-index*45,opacity:Math.min(1,phase*12,(1-phase)*12)};
}
export function leafPass(seconds, index=0) {
 const start=9+(index%8)*.85+Math.floor(index/8)*19, period=79, duration=13;
 if(seconds<start)return null;
 const phase=((seconds-start)%period)/duration;
 return phase<1?phase:null;
}
function balloon(index) {
 const root=new T.Group();root.name='Distant hot-air balloon';
 const profile=[[.2,0],[.46,.4],[.84,.9],[1.12,1.65],[1.18,2.3],[.95,2.94],[.5,3.3],[0,3.43]].map(([x,y])=>new T.Vector2(x,y));
 const geometry=new T.LatheGeometry(profile,48),pos=geometry.attributes.position,colors=new Float32Array(pos.count*3);
 const palette=(index?['#dfd1a3','#78968c']:['#efd9ad','#b77e63']).map(x=>new T.Color(x));
 for(let n=0;n<pos.count;n++){
  const angle=Math.atan2(pos.getX(n),pos.getZ(n))+Math.PI;
  palette[Math.floor(angle/(Math.PI*2)*12)%2].toArray(colors,n*3);
 }
 geometry.setAttribute('color',new T.BufferAttribute(colors,3));
 const envelope=new T.Mesh(geometry,new T.MeshLambertMaterial({vertexColors:true,transparent:true}));root.add(envelope);
 const basket=new T.Mesh(new T.BoxGeometry(.5,.36,.45),new T.MeshLambertMaterial({color:'#88714c',transparent:true}));basket.position.y=-.65;root.add(basket);
 const rigging=new T.BufferGeometry().setFromPoints([new T.Vector3(-.22,-.47,-.18),new T.Vector3(-.26,.04,-.2),new T.Vector3(.22,-.47,-.18),new T.Vector3(.26,.04,-.2),new T.Vector3(-.22,-.47,.18),new T.Vector3(-.26,.04,.2),new T.Vector3(.22,-.47,.18),new T.Vector3(.26,.04,.2)]);
 root.add(new T.LineSegments(rigging,new T.LineBasicMaterial({color:'#6d654f',transparent:true})));
 root.scale.setScalar(index?3.6:4.4);return root;
}
function leafGeometry() {
 const points=[0,0,0,-.13,.19,.015,-.15,.43,0,0,.66,.035,.16,.4,-.015,.12,.16,0,0,.31,.07];
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex([0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0,6]);g.computeVertexNormals();return g;
}
export function createAtmosphere({mobile=false}={}) {
 const root=new T.Group();root.name='Meadow atmosphere';
 const balloons=[balloon(0),balloon(1)];root.add(...balloons);
 const count=mobile?8:16,leaves=new T.InstancedMesh(leafGeometry(),new T.MeshLambertMaterial({color:'#ffffff',side:T.DoubleSide}),count);
 leaves.name='Occasional passing leaves';leaves.frustumCulled=false;leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);
 const random=makeRandom(4401),seeds=Array.from({length:count},()=>({depth:6+random()*12,height:random()*3.3,spin:random()*6,scale:.55+random()*.65}));
 for(let i=0;i<count;i++)leaves.setColorAt(i,new T.Color(['#b99a54','#9d7d48','#789060'][i%3]));
 root.add(leaves);
 const drops=mobile?280:650,rainSeeds=Array.from({length:drops},()=>({x:(random()-.5)*34,y:random()*26,z:(random()-.5)*34,length:.45+random()*.45}));
 const positions=new Float32Array(drops*6),rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));
 const rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#cfdee2',transparent:true,opacity:.45,depthWrite:false}));rain.name='Gentle rain';rain.frustumCulled=false;root.add(rain);
 const direction=new T.Vector3(),right=new T.Vector3(),center=new T.Vector3(),dummy=new T.Object3D();
 function update(seconds,{camera,motion=true,breeze=true,raining=false,editing=false}={}) {
  for(let i=0;i<balloons.length;i++){
   const pass=motion&&!raining&&!editing?balloonPass(seconds,i):null,b=balloons[i];b.visible=!!pass;
   if(pass){b.position.set(pass.x,pass.y,pass.z);b.rotation.z=Math.sin(seconds*.09+i)*.025;b.traverse(o=>{if(o.material)o.material.opacity=pass.opacity;});}
  }
  camera.getWorldDirection(direction);direction.y=0;if(direction.lengthSq()<.001)direction.set(0,0,-1);direction.normalize();right.crossVectors(direction,T.Object3D.DEFAULT_UP).normalize();
  leaves.visible=motion&&breeze&&!editing;
  if(leaves.visible){
   for(let i=0;i<count;i++){
    const phase=leafPass(seconds,i),seed=seeds[i];
    if(phase===null){dummy.scale.setScalar(0);}else{
     dummy.position.copy(camera.position).addScaledVector(direction,seed.depth).addScaledVector(right,-15+30*phase);
     dummy.position.y+=2.5+seed.height-phase*5+Math.sin(seconds*1.1+i)*.35;
     dummy.rotation.set(seconds*.8+seed.spin,seconds*.65+seed.spin,seconds*1.2+i);
     dummy.scale.setScalar(seed.scale*Math.min(1,phase*12,(1-phase)*12));
    }
    dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
   }
   leaves.instanceMatrix.needsUpdate=true;
  }
  rain.visible=raining&&motion&&!editing;
  if(rain.visible){
   center.copy(camera.position).addScaledVector(direction,10);rain.position.copy(center);
   for(let i=0;i<drops;i++){
    const d=rainSeeds[i],y=((d.y-seconds*12)%26+26)%26-9,n=i*6;
    positions.set([d.x,y,d.z,d.x+.12,y-d.length,d.z+.04],n);
   }
   rainGeometry.attributes.position.needsUpdate=true;
  }
 }
 balloons.forEach(x=>x.visible=false);leaves.visible=false;rain.visible=false;
 return {root,balloons,leaves,rain,update};
}
