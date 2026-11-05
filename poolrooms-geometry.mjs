// Metres. Y=0 is the quiet waterline. UVs are laid out in metres as well, so
// the same mosaic wraps around a bend, over a tread and into the side room.
import * as T from './vendor/three.module.js';
const PI=Math.PI, mix=(a,b,t)=>a+(b-a)*t;
const IV='#d7cfb8',JADE='#9bbab0',CREAM='#d7d0bb',PLASTER='#c2c3ad',PANEL='#f3edd0';
export const RAY=Object.freeze({x:-.90,z:-6.16,lipZ:-5.09,lipY:1.025,dropX:-1.10,dropZ:-4.63,width:.80});
export const POOL_STATIONS=Object.freeze({
 bend:{label:'The bend',position:[0,1.10,5.5],yaw:0,pitch:-.045,fov:56},
 spillway:{label:'Spillway',position:[-3.56,1.98,-2.32],yaw:.60,pitch:-.155,fov:60},
 passage:{label:'Under the bridge',position:[-4.92,.83,-8.7],yaw:-.27,pitch:.012,fov:60}
});
export function poolPose(view=POOL_STATIONS.bend,station='bend'){
 const s=POOL_STATIONS[station]||POOL_STATIONS.bend,c=Math.cos(view.pitch);
 return {position:[...s.position],direction:[Math.sin(view.yaw)*c,Math.sin(view.pitch),-Math.cos(view.yaw)*c]};
}
const colors=new Map();
function rgb(hex){if(!colors.has(hex)){const c=parseInt(hex.slice(1),16);colors.set(hex,[(c>>16)/255,((c>>8)&255)/255,(c&255)/255]);}return colors.get(hex);}
class Surfaces{
 constructor(){this.pos=[];this.uv=[];this.ink=[];this.kind=[];this.idx=[];}
 patch(U,V,sample,tex,kind=0,colour=IV){
  const base=this.pos.length/3,tint=rgb(colour);
  for(let v=0;v<=V;v++)for(let u=0;u<=U;u++){const a=u/U,b=v/V,p=sample(a,b);this.pos.push(...p);this.uv.push(...tex(a,b));this.kind.push(kind);this.ink.push(...tint);}
  for(let j=0;j<V;j++)for(let i=0;i<U;i++){const a=base+j*(U+1)+i,b=a+1,c=a+U+1,d=c+1;this.idx.push(a,b,d,a,d,c);}
 }
 quad(a,b,c,d,kind=0,col=IV,uv=null){
  const du=Math.hypot(...b.map((q,i)=>q-a[i])),dv=Math.hypot(...d.map((q,i)=>q-a[i]));
  this.patch(1,1,(u,v)=>a.map((_,i)=>mix(mix(a[i],b[i],u),mix(d[i],c[i],u),v)),uv||((u,v)=>[u*du,v*dv]),kind,col);
 }
 box(x0,x1,y0,y1,z0,z1,k=0,col=IV){
  for(const z of [z0,z1])this.quad([x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z],k,col,(u,v)=>[mix(x0,x1,u),mix(y0,y1,v)]);
  for(const x of [x0,x1])this.quad([x,y0,z0],[x,y0,z1],[x,y1,z1],[x,y1,z0],k,col,(u,v)=>[mix(z0,z1,u),mix(y0,y1,v)]);
  for(const y of [y0,y1])this.quad([x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],k===0?1:k,col,(u,v)=>[mix(x0,x1,u),mix(z0,z1,v)]);
 }
 // Extruded plan; polygon edges may follow a curved wall. A single continuous
 // UV length stops the grid restarting at every facet.
 block(path,bottom,top,k=0,col=IV){
  let s=0;for(let i=0;i<path.length;i++){const a=path[i],b=path[(i+1)%path.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);if(l<.0001)continue;
   this.quad([a[0],bottom,a[1]],[b[0],bottom,b[1]],[b[0],top,b[1]],[a[0],top,a[1]],k,col,(u,v)=>[s+l*u,mix(bottom,top,v)]);s+=l;}
  for(const y of [bottom,top]){const start=this.pos.length/3;for(const [x,z] of path){this.pos.push(x,y,z);this.uv.push(x,z);this.ink.push(...rgb(col));this.kind.push(k===0?1:k);}
   for(const tri of T.ShapeUtils.triangulateShape(path.map(p=>new T.Vector2(...p)),[]))this.idx.push(...tri.map(i=>start+i));}
 }
 // Rounded upper corners and tiled reveals; the opening is genuinely empty.
 portal(x0,x1,cx,width,spring,rad,top,zFront,zBack,col=IV){
  const l=cx-width/2,r=cx+width/2,arch=[];
  for(let i=0;i<=14;i++){const a=PI-PI*.5*i/14;arch.push([l+rad+rad*Math.cos(a),spring+rad*Math.sin(a)]);}
  for(let i=0;i<=14;i++){const a=PI*.5-PI*.5*i/14;arch.push([r-rad+rad*Math.cos(a),spring+rad*Math.sin(a)]);}
  this.box(x0,l,-1.55,top,zBack,zFront,0,col);this.box(r,x1,-1.55,top,zBack,zFront,0,col);
  let edge=0;for(let i=1;i<arch.length;i++){const [a,h]=arch[i-1],[b,j]=arch[i],len=Math.hypot(b-a,j-h);
   for(const z of [zFront,zBack])this.quad([a,h,z],[b,j,z],[b,top,z],[a,top,z],0,col,(u,v)=>[mix(a,b,u),mix(mix(h,j,u),top,v)]);
   this.quad([a,h,zFront],[b,j,zFront],[b,j,zBack],[a,h,zBack],1,col,(u,v)=>[edge+len*u,mix(zFront,zBack,v)]);edge+=len;}
 }
 mesh(mat,name){const g=new T.BufferGeometry();for(const [key,arr,n] of [['position',this.pos,3],['uv',this.uv,2],['ink',this.ink,3],['kind',this.kind,1]])g.setAttribute(key,new T.Float32BufferAttribute(arr,n));g.setIndex(this.idx);g.computeVertexNormals();g.computeBoundingSphere();const m=new T.Mesh(g,mat);m.name=name;return m;}
}
function corner(cx,cz,r,start,end,n=32){return Array.from({length:n+1},(_,i)=>{const a=mix(start,end,i/n);return [cx+r*Math.cos(a),cz+r*Math.sin(a)];});}
function lamp(b,x,y,z,r=.26){
 const ring=(radius,h,s)=>b.patch(32,3,(u,v)=>[x+Math.cos(2*PI*u)*radius*(.7+.3*Math.sin(v*PI/2)),y+h*v,z+Math.sin(2*PI*u)*radius*(.7+.3*Math.sin(v*PI/2))],(u,v)=>[u,v],s,s===3?PANEL:'#8d968a');
 ring(r,.065,5);ring(r*.84,.055,3);
 b.patch(32,5,(u,v)=>[x+Math.cos(u*2*PI)*r*.85*Math.sin(v*PI/2),y-.04*Math.cos(v*PI/2),z+Math.sin(u*2*PI)*r*.85*Math.sin(v*PI/2)],(u,v)=>[u,v],3,PANEL);
}
function flume(b){
 const points=[[1.8,4.42,-12.2],[-1.6,4.23,-12.75],[-4.18,3.72,-11.25],[-5.38,3.27,-8.2],[-6.85,2.95,-7.6],[-7.3,2.62,-9.3]];
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
 for(const [radius,col] of [[.48,'#c79081'],[.52,'#cfa391']])b.patch(64,18,(u,v)=>{const p=curve.getPoint(u),d=curve.getTangent(u),n=new T.Vector3(-d.z,0,d.x).normalize(),ang=PI*(.99*v+.005);return [p.x+radius*Math.cos(ang)*n.x,p.y-radius*Math.sin(ang),p.z+radius*Math.cos(ang)*n.z];},(u,v)=>[u*9,v],4,col);
}
export function buildPoolArchitecture(material){
 const b=new Surfaces();
 b.box(-10.1,11,-1.52,-1.42,-24,9,1,'#c4d4c2');
 // The rounded bulkhead and full-height doorway sit in front of a turquoise side pool.
 b.block([[.96,-10.0],[3.0,-10.0],[3.0,-2.48],...corner(3,-4.52,2.04,PI/2,PI).slice(1)],-1.47,7.6);
 b.portal(3.0,10.8,6.43,1.95,2.75,.37,7.6,-2.48,-3.08);
 b.box(.97,1.4,-1.5,7.58,-13.6,-9.98);b.box(1.35,4.28,-1.5,4.6,-13.63,-13.19);
 // Closed outside envelope, including the areas behind every camera.
 b.box(-10.25,-9.98,-1.5,7.72,-24.1,9.1);b.box(10.8,11.13,-1.5,7.72,-24.1,9.1);
 b.box(-10.1,10.85,-1.5,7.72,8.86,9.16);b.box(-10.1,10.85,-1.5,7.72,-24.15,-23.91);
 b.box(-10.1,10.85,7.58,7.85,-24,9.0,2,PLASTER);
 // Entry bay, low soffit, and tiled shallow steps. The low wall frames the left of the opening.
 b.box(-9.98,-2.61,-1.46,2.81,1.38,8.9);b.box(-9.98,-1.36,2.71,3.00,1.38,8.9,0,IV);
 for(let i=0;i<5;i++){const z=1.40+i*.68,top=-.96+i*.178;b.box(-2.62,10.8,-1.44,top,z,8.85,1,'#d8d8bd');}
 b.box(-2.61,8.6,-1.44,.11,7.19,8.88,1,CREAM);
 // Low footbridge with solid tiled parapets, above a navigable flooded crossing.
 b.box(-10,-2.03,1.54,1.80,-9.7,-7.08,1,IV);
 b.box(-2.42,-1.95,-1.45,1.55,-9.72,-7.09,0,JADE);
 for(const z of [-9.70,-7.23])b.box(-10,-2.03,1.79,2.84,z,z+.15,0,IV);
 b.block([[-2.4,-10.3],[.97,-10.3],[.97,-6.61],...corner(-1.29,-6.61,1.11,PI/2,PI).map(p=>[p[0],p[1]]),[-2.40,-8.97]],-1.48,1.13,0,JADE);
 b.block([[-.76,-13.61],[1.18,-13.61],[1.18,-6.53],...corner(.32,-6.53,.86,PI/2,PI).slice(1),[-.54,-9.16]],1.12,7.59,0,IV);
 // The far wall bends out of view; beyond it the passage forks again.
 b.block([[-3.14,-17.74],[.01,-17.74],[.01,-11.05],...corner(-1.22,-11.05,1.92,PI/2,PI).slice(1)],-1.46,5.36);
 b.portal(-9.99,-3.13,-6.77,2.30,2.25,.40,5.40,-17.60,-18.12);
 b.block([[-8.80,-23.98],[-6.5,-23.98],[-6.5,-20.68],...corner(-7.65,-20.68,1.15,0,PI).slice(1)],-1.46,4.5);
 b.box(-9.97,.97,4.50,4.78,-24,-14.25,2,PLASTER);
 // The right opening leads to a separate, complete chamber and a second off-axis doorway.
 b.box(1.38,10.8,3.51,3.73,-13.21,-3.03,2,'#a5c4b8');
 b.portal(4.28,10.8,8.73,1.56,2.12,.30,4.54,-13.19,-13.64,JADE);
 b.box(1.39,5.02,-1.46,-.32,-12.9,-8.3,1,JADE);
 // Soft, built-in fixtures and a glimpse of the old peach flume. No openings to the sky.
 b.box(-.69,-.64,5.70,5.77,-9.00,-6.22,3,PANEL);b.box(-7.85,-4.89,2.74,2.795,-9.52,-9.47,3,'#ead5a6');
 b.box(-9.89,-9.83,3.36,3.41,-15.5,-11.1,3,PANEL);b.box(-8.71,-8.65,3.07,3.12,-22.9,-19.8,3,'#e7dcb0');
 lamp(b,6.82,3.43,-5.25,.23);lamp(b,8.75,3.43,-10.17,.20);lamp(b,-4.84,4.41,-14.22,.19);lamp(b,2.65,7.47,4.2,.26);
 flume(b);return b.mesh(material,'Tiled chambers, passage and footbridge');
}
export function buildManta(material){
 const b=new Surfaces(),{x,z}=RAY;
 // Paired hand-laid shells: broad swept wings, a flattened lip that feeds the
 // curtain, a humped saddle and upturned wing tips. No detached statue/base.
 function skin(u,v,top){
  const w=u*2-1,a=Math.abs(w),width=1.74,fore=1.09-.20*a-1.10*a*a,back=-.94+.45*a+.38*a*a;
  const yy=1.156-.15*Math.exp(-v*14.)*(1.-a)+.39*Math.pow(a,3)+.225*Math.exp(-w*w*9)*Math.sin(PI*v);
  const thick=.030+.18*Math.sqrt(Math.max(0,1-w*w))*Math.sin(PI*v);
  return [x+w*width,yy+(top?thick:-thick*.41),z+mix(fore,back,v)];
 }
 for(const top of [false,true])b.patch(58,28,(u,v)=>skin(u,v,top),(u,v)=>[u*2,v],4,top?'#919f86':'#d5cbae');
 const ball=(x0,y0,z0,rx,ry,rz,kind,col)=>b.patch(26,14,(u,v)=>{const a=u*2*PI,t=v*PI;return [x0+rx*Math.sin(t)*Math.cos(a),y0+ry*Math.cos(t),z0+rz*Math.sin(t)*Math.sin(a)];},(u,v)=>[u,v],kind,col);
 for(const side of [-1,1]){const u=.5+side*.116,p=skin(u,.245,true);ball(p[0],p[1]-.002,p[2],.112,.062,.118,4,'#95a38a');ball(p[0]+side*.047,p[1]+.042,p[2]+.045,.051,.017,.056,4,'#c8bfa7');ball(p[0]+side*.05,p[1]+.052,p[2]+.052,.033,.014,.040,6,'#292e28');}
 b.patch(32,10,(u,v)=>{const r=.122*(1-u)+.011,an=2*PI*v;return [x+.45*Math.sin(u*2.45)+r*Math.cos(an),1.16+u*.14+r*Math.sin(an),z-.65-u*1.88];},(u,v)=>[u,v],4,'#89977e');
 return b.mesh(material,'Moulded manta-ray spillway');
}
export function buildCurtain(material){
 const {x,lipZ,lipY,width,dropX,dropZ}=RAY,b=new Surfaces();
 b.patch(24,26,(u,v)=>[mix(x,dropX,v)+(u-.5)*width*(1-.05*v+.08*v*v),mix(lipY,-.035,v*v),mix(lipZ,dropZ,v)+.017*Math.sin(u*PI*4)*v],(u,v)=>[u,v],0,IV);
 const m=b.mesh(material,'Falling sheet');m.renderOrder=4;return m;
}
