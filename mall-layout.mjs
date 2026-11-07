import * as T from './vendor/three.module.js';

export const MALL_ART='./assets/mall/atrium.webp';
export const MALL_MASK='./assets/mall/surfaces.png';
export const MALL_SIZE=[1672,941];
export const MALL_VIEWS=Object.freeze({
 atrium:{label:'Atrium',yaw:0,pitch:0,fov:54},
 fountain:{label:'Fountain',yaw:.30,pitch:-.12,fov:35},
 shops:{label:'Shopfronts',yaw:-.40,pitch:-.025,fov:32},
 arcade:{label:'Arcade',yaw:.60,pitch:0,fov:26}
});
const RAD=Math.PI/180;
export const MALL_HALF_H=Math.tan(28*RAD),MALL_HALF_W=MALL_HALF_H*1672/941;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// A fixed seat with a bounded, perspective-correct lens. The architecture is
// projected artwork; the fountain is geometry. This is not free walking.
export function mallView(view,aspect=1672/941){
 const fov=clamp(view.fov,22,Math.min(55.5,2*Math.atan(MALL_HALF_W/Math.max(.1,aspect))/RAD-.3));
 const vertical=fov*RAD/2,horizontal=Math.atan(Math.tan(vertical)*aspect);
 const limit=Math.max(0,Math.atan(MALL_HALF_W)-horizontal-.004);
 let yaw=clamp(view.yaw,-limit,limit),pitch=clamp(view.pitch,-.45,.45);
 const fits=(y,p)=>{
  const sy=Math.sin(y),cy=Math.cos(y),sp=Math.sin(p),cp=Math.cos(p);
  for(const x of [-1,1])for(const v of [-1,1]){
   const a=x*Math.tan(horizontal),b=v*Math.tan(vertical);
   const rx=sy*cp+a*cy-b*sy*sp,ry=sp+b*cp,rz=-cy*cp+a*sy+b*cy*sp;
   if(rz>=0||Math.abs(rx/-rz)>MALL_HALF_W-.001||Math.abs(ry/-rz)>MALL_HALF_H-.001)return false;
  }return true;
 };
 if(!fits(yaw,pitch)){let a=0,b=1;for(let i=0;i<14;i++){const m=(a+b)/2;if(fits(yaw*m,pitch*m))a=m;else b=m;}yaw*=a;pitch*=a;}
 return {yaw,pitch,fov};
}
export function mallPose(view,aspect){const v=mallView(view,aspect),c=Math.cos(v.pitch);return {...v,position:[0,0,0],direction:[Math.sin(v.yaw)*c,Math.sin(v.pitch),-Math.cos(v.yaw)*c]};}
export function mallProject(x,y,depth){return new T.Vector3((x/1672*2-1)*MALL_HALF_W*depth,(1-y/941*2)*MALL_HALF_H*depth,-depth);}
export const WATER_Y=-.62;
export function basinPoint(x,y){const depth=WATER_Y/((1-y/941*2)*MALL_HALF_H);return mallProject(x,y,depth);}
export function mallPanel(rect,depth,cols=1,rows=1){
 const g=new T.PlaneGeometry(1,1,cols,rows),p=g.attributes.position,uv=g.attributes.uv;
 for(let i=0;i<p.count;i++){
  const x=rect[0]+uv.getX(i)*(rect[2]-rect[0]),y=rect[3]-uv.getY(i)*(rect[3]-rect[1]);
  const v=mallProject(x,y,typeof depth==='function'?depth(x,y):depth);p.setXYZ(i,v.x,v.y,v.z);uv.setXY(i,x/1672,1-y/941);
 }g.computeVertexNormals();return g;
}
