import * as T from './vendor/three.module.js';
import {makeRandom} from './meadow-terrain.mjs';

export const FOREST_EYE=Object.freeze([0,1.2,4]);
export const FOREST_LAMP=Object.freeze([3.65,4.65,-3]);
export const FOREST_SIGN=Object.freeze([3.9,2.95,-2.6]);
export const FOREST_VIEW=Object.freeze({yaw:0,pitch:.09,fov:60});
export const forestInitialView=mobile=>({...FOREST_VIEW,yaw:mobile?.40:FOREST_VIEW.yaw});
export const forestRoadX=z=>-15/(1+Math.exp((z+30)/8))+3/(1+Math.exp(-(z-70)/20));
export function forestHeight(x,z){const edge=Math.max(0,Math.abs(x-forestRoadX(z))-3.5);return .009*Math.sin(x*1.1)*Math.sin(z*.7)+Math.min(2.6,edge*.14)*(.8+.2*Math.sin(z*.06));}

// Solid, deterministic geometry: the canopy, trunks and roadside plants have
// real depth at every heading. Shared batches bound draw calls and allocation.
export function makeForestGeometry({mobile=false}={}){
 const random=makeRandom(17101988),batches=Array.from({length:4},()=>({p:[],n:[],uv:[],tint:[],kind:[]}));
 const colour=new T.Color(),dummy=new T.Object3D();
 function add(g,batch,hex,kind,m=null){if(!g.attributes.normal)g.computeVertexNormals();if(m)g.applyMatrix4(m);const flat=g.index?g.toNonIndexed():g,p=flat.attributes.position,u=flat.attributes.uv,n=flat.attributes.normal,b=batches[batch];colour.set(hex);for(let i=0;i<p.count;i++){b.p.push(p.getX(i),p.getY(i),p.getZ(i));b.n.push(n.getX(i),n.getY(i),n.getZ(i));b.uv.push(u?u.getX(i):0,u?u.getY(i):0);b.tint.push(colour.r,colour.g,colour.b);b.kind.push(kind);}if(flat!==g)flat.dispose();g.dispose();}
 function spray(p,width,height,yaw,tilt=0){if(p[2]>-28&&p[2]<3&&p[1]>8&&Math.abs(p[0]-forestRoadX(p[2]))<1.35)return;dummy.position.set(...p);dummy.rotation.set(tilt,yaw,(random()-.5)*.8);dummy.scale.set(1,1,1);dummy.updateMatrix();add(new T.PlaneGeometry(width,height),3,['#b6c5a1','#98b291','#aabf9d'][Math.floor(random()*3)],7,dummy.matrix);}
 function primitive(g,pos,scale,hex,kind,rotation=[0,0,0]){dummy.position.set(...pos);dummy.rotation.set(...rotation);dummy.scale.set(...scale);dummy.updateMatrix();add(g,2,hex,kind,dummy.matrix);}
 function tube(points,radii,hex,kind=0,sides=10,batch=0){
  const control=points.map(p=>new T.Vector3(...p)),curve=new T.CatmullRomCurve3(control,false,'centripetal');
  const smooth=points.length>2&&((kind===0&&radii[0]>.35&&Math.hypot(points[0][0],points[0][2]-4)<20)||kind===3);
  const segments=(points.length-1)*(smooth?2:1),frames=curve.computeFrenetFrames(segments,false),pts=smooth?curve.getPoints(segments):control,p=[],uv=[],ix=[];let along=0;
  for(let j=0;j<=segments;j++){
   if(j)along+=pts[j].distanceTo(pts[j-1]);const t=j/segments,source=t*(radii.length-1),k=Math.min(radii.length-2,Math.floor(source)),q=source-k,radius=radii[k]+(radii[k+1]-radii[k])*q;
   const right=frames.normals[j],forward=frames.binormals[j];
   for(let i=0;i<=sides;i++){const angle=i/sides*Math.PI*2,flute=kind===0?1+.12*Math.sin(angle*5+t*1.5)+.05*Math.cos(angle*9-t):1;const v=pts[j].clone().addScaledVector(right,Math.cos(angle)*radius*flute).addScaledVector(forward,Math.sin(angle)*radius*flute);p.push(v.x,v.y,v.z);uv.push(i/sides,along);if(j<segments&&i<sides){const a=j*(sides+1)+i,c=a+sides+1;ix.push(a,a+1,c,a+1,c+1,c);}}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);add(g,batch,hex,kind);
 }
 function leaf(center,length,width,angle,tilt,hex){
  // A folded, pointed leaf catches light on two distinct faces.
  const c=Math.cos(angle),s=Math.sin(angle),ct=Math.cos(tilt),st=Math.sin(tilt),v=[[-width,0,length*.42],[0,width*.16,length*.5],[0,0,0],[width,0,length*.42],[0,0,length]];
  const verts=v.map(([x,y,z])=>[center[0]+c*x+s*z*ct,center[1]+y+z*st,center[2]-s*x+c*z*ct]),indices=[2,0,1,0,4,1,4,3,1,3,2,1],uvs=[[0,.42],[.5,.5],[.5,0],[1,.42],[.5,1]],b=batches[1];colour.set(hex);
  for(const i of indices){b.p.push(...verts[i]);b.uv.push(...uvs[i]);b.tint.push(colour.r,colour.g,colour.b);b.kind.push(1);}
 }
 const trees=[{x:6,z:-4,r:1.55,h:29},{x:-6.5,z:-4,r:1.45,h:27},{x:-5.8,z:12,r:1.2,h:25},{x:7,z:12,r:1.4,h:30},{x:5.6,z:-14,r:.95,h:23},{x:-6.8,z:-16,r:.85,h:26}];
 for(let side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<25;i++){
  const z=-155+i*9+(random()-.5)*8,x=forestRoadX(z)+side*(5.5+row*7+random()*6);
  if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<4))continue;
  trees.push({x,z,r:.42+random()*.75,h:15+random()*19});
 }
 const crowns=[];
 for(const [index,t] of trees.entries()){
  const {x,z,r,h}=t,y=forestHeight(x,z)-.15,lean=(random()-.5)*7,leanZ=(random()-.5)*5,far=mobile&&Math.hypot(x,z-8)>55,sides=index<6?28:mobile?(far?6:8):10;
  tube([[x,y,z],[x+.07,y+.65,z],[x+lean*.05,y+2.4,z+leanZ*.08],[x+lean*.2,y+h*.35,z+leanZ*.2],[x+lean*.6,y+h*.7,z+leanZ*.6],[x+lean,y+h,z+leanZ]],[r*1.5,r*1.12,r*.84,r*.61,r*.32,.028],index%2?'#4d4c39':'#545747',0,sides);
  if(Math.hypot(x,z-8)<65)for(let k=0;k<(index<6?9:5);k++){
   const a=k/7*Math.PI*2+random(),len=r*(2.4+random()*1.9),dx=Math.cos(a),dz=Math.sin(a);
   tube([[x,y+r*.7,z],[x+dx*r*.8,y+.32,z+dz*r*.8],[x+dx*len*.65,forestHeight(x+dx*len*.65,z+dz*len*.65)+.10,z+dz*len*.65],[x+dx*len,forestHeight(x+dx*len,z+dz*len)-.09,z+dz*len]],[r*.32,r*.27,r*.10,.012],'#50523b',0,mobile&&index>=6?5:8);
  }
  for(let j=0;j<4;j++){
   const a=random()*Math.PI*2,bh=h*(.24+random()*.40),len=3.5+random()*5,dx=Math.cos(a),dz=Math.sin(a),tip=[x+dx*len,y+bh+2+random()*2,z+dz*len];
   tube([[x+lean*.3,y+bh,z],[x+dx*len*.43,y+bh+1.1,z+dz*len*.43],tip],[r*.31,r*.16,.028],'#4d5140',0,far?4:7);
   crowns.push({p:tip,r:3+random()*2});
   const inner=[tip[0]-dx*1.5,tip[1]-1.2,tip[2]-dz*1.5];
   tube([inner,[tip[0]+dz*1.6,tip[1]+1.3,tip[2]-dx*1.6]],[r*.1,.01],'#424735',0,far?3:5);
  }
  crowns.push({p:[x+lean,y+h-1,z+leanZ],r:4});
 }
 for(const crown of crowns)for(let k=0;k<(mobile?8:13);k++){const a=random()*Math.PI*2,r=random()*crown.r,p=[crown.p[0]+Math.cos(a)*r,crown.p[1]+(random()-.5)*2,crown.p[2]+Math.sin(a)*r];spray(p,1.7+random()*2.0,1.4+random()*1.8,random()*Math.PI*2,(random()-.5)*1.4);}
 const leafBudget=mobile?1200:2200;
 for(let i=0;i<leafBudget;i++){
  const crown=crowns[i%crowns.length],a=random()*Math.PI*2,r=Math.sqrt(random())*crown.r,h=(random()-.5)*2.7,p=[crown.p[0]+Math.cos(a)*r,crown.p[1]+h,crown.p[2]+Math.sin(a)*r];
  leaf(p,.16+random()*.22,.045+random()*.075,random()*Math.PI*2,(random()-.5)*1.5,['#465a38','#3c5535','#516641','#334c32'][i%4]);
 }
 // Curving boughs frame the road without making a regular ceiling.
 for(const side of [-1,1])for(let j=0;j<4;j++){
  const z=-8-j*13,x=forestRoadX(z)+side*(5.8+j*.2),height=7.8+j*1.1;
  const branch=[[x,forestHeight(x,z)-.18,z],[x-side*.3,height*.66,z+.1],[x-side*1.3,height,z-1.1],[x-side*3.0,height+1.5,z-3.2],[x-side*4.6,height+1.7,z-5.0]];
  tube(branch,[.46,.34,.22,.11,.014],'#4d5140',0,mobile?8:12);
  for(let k=0;k<(mobile?28:45);k++){const t=random(),p=[x-side*(1.0+t*4.2)+(random()-.5)*2,height+1.0+random()*2.0,z-t*5+(random()-.5)*3];spray(p,1.1+random()*1.6,1.2+random()*1.5,random()*6.28,(random()-.5)*1.8);}
 }
 // Uneven mid-height growth closes the open bands between trunks and canopy.
 for(let i=0;i<(mobile?450:780);i++){
  const z=-110+random()*158,side=i%2?1:-1,x=forestRoadX(z)+side*(5.7+random()*16),y=forestHeight(x,z)+1.4+random()*5.0;
  spray([x,y,z],1.3+random()*2.1,1.4+random()*2.0,random()*6.28,(random()-.5)*.65);
 }
 // Small climbing leaves catch lamplight on the foreground trunks.
 for(const [x,z,r] of [[6,-4,1.55],[-6.5,-4,1.45]])for(let j=0;j<40;j++){
  const y=.4+random()*7.0,a=Math.PI*.16+random()*Math.PI*.60;
  spray([x+Math.cos(a)*r,y,z+Math.sin(a)*r],.30+random()*.42,.38+random()*.50,(random()-.5)*.5,-.2);
 }
 // Layer broad leaves and fern fronds along both verges, away from the road.
 const plants=mobile?250:510;
 for(let i=0;i<plants;i++){
  const z=-95+random()*137,side=i%2?1:-1,x=forestRoadX(z)+side*(3.85+random()*11),y=forestHeight(x,z);
  if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.r*.85))continue;
  const height=.22+random()*.72;
  for(let k=0;k<3;k++)spray([x+(random()-.5)*.6,y+.6+random()*.4,z+(random()-.5)*.6],1.2+random()*.8,1.1+random()*.65,k*Math.PI/3+random(),-.15);
  if(i%3===0){
   const fronds=mobile?3:5,leaflets=mobile?5:7;
   for(let f=0;f<fronds;f++){const a=f/fronds*Math.PI*2+random()*.6,dx=Math.cos(a),dz=Math.sin(a),len=.7+random()*.8;
    for(let k=1;k<=leaflets;k++){const q=k/(leaflets+1),p=[x+dx*len*q,y+height*Math.sin(q*Math.PI*.85),z+dz*len*q],l=len*.26*Math.sin(q*Math.PI),stemAngle=Math.atan2(dx,dz);leaf(p,l,l*.21,stemAngle+.9,.18,'#567047');leaf(p,l,l*.21,stemAngle-.9,.18,'#4a673e');}
   }
  }else for(let k=0;k<(mobile?10:14);k++){const a=random()*Math.PI*2,spread=random()*.65;leaf([x+Math.sin(a)*spread,y+height*random(),z+Math.cos(a)*spread],.3+random()*.4,.14+random()*.15,a,.2+random()*.5,['#3b613c','#4b6c43','#557341'][k%3]);}
 }
 // Dense foreground plants soften the roots and catch the warm light.
 for(let i=0;i<(mobile?110:180);i++){
  const side=i%2?1:-1,z=-10+random()*15,x=forestRoadX(z)+side*(3.5+random()*4.5);
  if(Math.hypot(x-3.9,z+2.6)<1.0||trees.some(t=>Math.hypot(t.x-x,t.z-z)<t.r*.83))continue;
  const y=forestHeight(x,z),size=.5+random()*.8;
  for(let k=0;k<2;k++)spray([x+(random()-.5)*.25,y+size*.38,z],size,size*.85,k*1.5+random()*.6,-.15);
  for(let k=0;k<5;k++)leaf([x+(random()-.5)*.3,y,z+(random()-.5)*.3],.3+random()*.5,.014+random()*.023,random()*6.28,.85+random()*.45,'#657d44');
 }
 // Foreground fern fans break up the exposed root silhouettes.
 for(const [x,z] of [[-4.4,-4.2],[-5.1,-2.8],[-4.5,-.9],[4.2,-4.8],[5.2,-.8]]){
  const y=forestHeight(x,z);
  for(let f=0;f<6;f++){const a=f/6*Math.PI*2+.2,len=1.05+random()*.45;
   for(let j=1;j<=6;j++){const q=j/7,p=[x+Math.sin(a)*len*q,y+.82*Math.sin(q*2.7),z+Math.cos(a)*len*q],l=len*.27*Math.sin(q*Math.PI);leaf(p,l,l*.24,a+.95,.18,'#647e48');leaf(p,l,l*.24,a-.95,.18,'#536d3f');}
  }
 }
 // Mossy stones, sparse utility poles and a pair of sagging wires in the mist.
 for(let i=0;i<50;i++){const z=-110+random()*145,x=forestRoadX(z)+(i%2?1:-1)*(3.7+random()*5);primitive(new T.IcosahedronGeometry(1,1),[x,forestHeight(x,z),z],[.12+random()*.36,.08+random()*.22,.14+random()*.4],'#555a46',2,[random(),random()*3,0]);}
 for(let i=0;i<5;i++){const z=-25-i*26,x=forestRoadX(z)-5.3; tube([[x,forestHeight(x,z),z],[x+.18,11,z]],[.16,.1],'#4b4941',2,8,2);tube([[x-1.1,9.7,z],[x+1.2,9.7,z]],[.07,.07],'#4b4941',2,6,2);if(i<4)for(const offset of [-.8,.8]){const nextZ=z-26,nextX=forestRoadX(nextZ)-5.3;tube([[x+offset,9.8,z],[(x+nextX)*.5+offset,8.8,z-13],[nextX+offset,9.8,nextZ]],[.014,.014,.014],'#2e3633',2,4,2);}}
 // Hero props are genuine meshes: sign, pole, timetable, concrete foot, lamp.
 primitive(new T.BoxGeometry(.85,.32,.62),[3.9,.16,-2.6],[1,1,1],'#a2a18c',2);
 tube([[3.9,.22,-2.6],[3.9,3.16,-2.6]],[.034,.034],'#a5ada6',3,12,2);
 primitive(new T.CylinderGeometry(.46,.46,.045,48),FOREST_SIGN,[1,1,1],'#747f80',3,[Math.PI/2,0,0]);
 primitive(new T.CircleGeometry(.45,48),[3.9,2.95,-2.574],[1,1,1],'#e9e5cd',5);
 primitive(new T.BoxGeometry(.22,.45,.065),[3.9,1.68,-2.56],[1,1,1],'#abae9f',3);
 primitive(new T.PlaneGeometry(.186,.402),[3.9,1.68,-2.522],[1,1,1],'#e1decb',6);
 tube([[5.2,0,-3],[5.2,4.8,-3],[5.05,5.08,-3],[4.6,5.18,-3],[3.8,4.94,-3],[3.65,4.8,-3]],[.06,.06,.055,.05,.05,.05],'#5c6358',3,12,2);
 primitive(new T.CylinderGeometry(.13,.30,.18,32),[3.65,4.75,-3],[1,1,1],'#565e50',3);
 primitive(new T.SphereGeometry(.12,20,12),FOREST_LAMP,[1,.72,1],'#fff0bc',4);
 primitive(new T.CircleGeometry(.22,32),[3.65,4.649,-3],[1,1,1],'#ffefb0',4,[-Math.PI/2,0,0]);
 const geometries=batches.map(b=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(b.p,3));g.setAttribute('uv',new T.Float32BufferAttribute(b.uv,2));g.setAttribute('tint',new T.Float32BufferAttribute(b.tint,3));g.setAttribute('surfaceKind',new T.Float32BufferAttribute(b.kind,1));if(b.n.length===b.p.length)g.setAttribute('normal',new T.Float32BufferAttribute(b.n,3));else g.computeVertexNormals();g.computeBoundingSphere();return g;});
 const ground=new T.PlaneGeometry(370,370,mobile?100:160,mobile?100:160);ground.rotateX(-Math.PI/2);const gp=ground.attributes.position;for(let i=0;i<gp.count;i++){const x=Math.sign(gp.getX(i))*Math.pow(Math.abs(gp.getX(i))/185,1.4)*185,z=Math.sign(gp.getZ(i))*Math.pow(Math.abs(gp.getZ(i))/185,1.4)*185;gp.setXYZ(i,x,forestHeight(x,z),z);}ground.computeVertexNormals();
 return {geometries,ground,treeCount:trees.length,leafBudget};
}

// A tiny local texture paints the period bus-stop sign. No web fonts, image
// downloads or user data are needed. The glyphs below are hand-drawn strokes.
export function makeForestSignTexture(){
 const size=256,data=new Uint8Array(size*size*4),blue=[128,156,172],cream=[223,218,190],ink=[47,57,62];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){const edge=Math.hypot(x-128,y-128)>121,n=((x*17+y*31)%19)/19*7,c=edge?ink:y>94&&y<166?cream:blue,i=(y*size+x)*4;data.set([c[0]-n,c[1]-n,c[2]-n,255],i);}
 function line(x1,y1,x2,y2,w=2){const steps=Math.ceil(Math.hypot(x2-x1,y2-y1)*2);for(let i=0;i<=steps;i++){const x=Math.round(x1+(x2-x1)*i/steps),y=Math.round(y1+(y2-y1)*i/steps);for(let dy=-w;dy<=w;dy++)for(let dx=-w;dx<=w;dx++)if(x+dx>=0&&x+dx<size&&y+dy>=0&&y+dy<size)data.set([...ink,255],((y+dy)*size+x+dx)*4);}}
 const glyphs={
  '七':[[10,45,90,30],[43,8,43,77],[43,77,55,88],[55,88,91,83]],
  '国':[[8,8,90,8],[8,8,8,92],[8,92,90,92],[90,8,90,92],[24,27,77,27],[49,27,49,73],[24,51,76,51],[22,75,79,75],[64,60,70,66]],
  '山':[[9,34,9,86],[9,86,89,86],[89,34,89,86],[49,7,49,85]],
  '行':[[30,9,10,30],[32,33,7,61],[21,50,21,91],[46,16,86,16],[40,43,96,43],[78,44,78,89],[78,89,60,85]],
  '稲':[[8,21,35,11],[6,37,36,37],[23,18,23,91],[22,39,6,70],[23,46,39,60],[44,13,88,6],[48,23,54,35],[67,21,72,32],[89,18,82,36],[46,45,46,91],[46,45,64,48],[65,44,89,44],[65,44,65,90],[89,44,89,90],[65,66,89,66],[65,87,89,87]],
  '荷':[[7,18,94,18],[31,7,31,29],[69,7,69,29],[28,34,7,62],[19,48,19,94],[35,41,93,41],[82,41,82,91],[82,91,67,87],[38,54,65,54],[38,54,38,77],[65,54,65,77],[38,77,65,77]],
  '前':[[25,6,34,18],[73,6,65,18],[6,25,95,25],[15,39,51,39],[15,39,15,92],[51,39,51,93],[15,55,51,55],[15,72,51,72],[51,93,38,87],[67,40,67,76],[86,35,86,94],[86,94,72,87]]
 };
 function text(s,x,y,height,gap){for(const char of s){for(const [a,b,c,d] of glyphs[char]||[])line(x+a*height/100,y+b*height/100,x+c*height/100,y+d*height/100,Math.max(1,Math.round(height/27)));x+=height+gap;}}
 text('七国山行',44,49,36,8);text('稲荷前',38,103,53,9);text('山行',88,181,32,12);
 const texture=new T.DataTexture(data,size,size,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.flipY=true;texture.needsUpdate=true;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearFilter;return texture;
}
