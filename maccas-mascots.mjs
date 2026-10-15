import * as T from './vendor/three.module.js';
import {mascotGeometry,MACCAS_MODELS} from './maccas-models.mjs';

// The four user-supplied textured models replace the old procedural characters.
// Only the supporting furniture is built here. Positions and heights are metres.
export function addMaccasMascots(b){
 const {at,add,rounded,tube,cylinder}=b;
 b.material('bench-perforated',{finish:13});
 const yellow='#d4a830',red='#a0252d';
 at(-2.55,0,1.48,.22,()=>{
  for(const x of [-.91,.91]){
   tube([[x,.035,-.26],[x,.62,-.26],[x,1.13,-.28],[x,1.19,-.23]],.027,red,'fibreglass',20);
   tube([[x,.62,-.24],[x,.62,.32],[x,.035,.32]],.027,red,'fibreglass',20);
   tube([[x,.90,-.22],[x,.95,.12],[x,.87,.36],[x,.65,.36]],.025,red,'fibreglass',24);
   for(const z of [-.26,.32])cylinder(.047,.047,.018,x,.015,z,'#353330','plain',16);
  }
  // Thin perforated steel panels, with separate rolled edges and frame rails.
  add(new T.PlaneGeometry(1.78,.55),'bench-perforated',0,.625,.025,yellow,[-Math.PI/2,0,0]);
  add(new T.PlaneGeometry(1.78,.49),'bench-perforated',0,.935,-.255,yellow);
  for(const z of [-.255,.305])rounded(1.83,.025,.030,.012,0,.625,z,yellow,'fibreglass');
  for(const y of [.690,1.180])rounded(1.83,.030,.025,.012,0,y,-.255,yellow,'fibreglass');
 });
 // Small timber mounts bring the ornaments above the booth backs. The plants
 // reserve clear patches here, so feet sit visibly on joinery, not in foliage.
 for(const [x,z] of [[1.78,-2.585],[-1.88,-5.255]])rounded(.58,.27,.39,.018,x,1.325,z,'#b99757','wood');
 const settings=[
  {id:'ronald',position:[-2.50,.014,1.67],yaw:.15,height:1.62},
  {id:'grimace',position:[2.95,.44,1.05],yaw:-.24,height:1.46},
  {id:'hamburglar',position:[1.78,1.46,-2.585],yaw:-.34,height:.91},
  {id:'birdie',position:[-1.88,1.46,-5.255],yaw:.25,height:.91}
 ];
 return settings.map(({id,position,yaw,height})=>{
  const source=MACCAS_MODELS[id],texture='./assets/cinema/models/'+id+'-color.png';
  b.material('mascot-'+id,{file:texture,finish:12});
  const g=mascotGeometry(id),matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw),new T.Vector3(height,height,height));
  const bounds=g.boundingBox.clone().applyMatrix4(matrix);
  at(...position,yaw,()=>add(g,'mascot-'+id),height);
  return {id,position,yaw,height,scale:height,vertices:source.vertexCount,triangles:source.indexCount/3,texture,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},kind:'user-supplied textured 3D model'};
 });
}
