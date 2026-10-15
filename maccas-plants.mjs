import * as T from './vendor/three.module.js';

export function addMaccasPlants(b){
 const {add,rounded,box,cylinder,tube,at}=b;
 let seed=9017,leaves=0;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const greens=['#315e2d','#416e34','#254b2b','#4d7839','#345b2c'];
 function leaf(points,width,color,segments=9){
  const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),positions=[],colors=[],uv=[],indices=[];
  const tint=new T.Color(color),side=new T.Vector3(),normal=new T.Vector3();
  for(let j=0;j<=segments;j++){
   const t=j/segments,c=curve.getPoint(t),dir=curve.getTangent(t);side.crossVectors(dir,new T.Vector3(0,1,0));if(side.length()<.02)side.set(1,0,0);side.normalize();normal.crossVectors(side,dir).normalize();
   for(let i=0;i<5;i++){
    const s=(i-2)/2,w=width*Math.pow(Math.sin(Math.PI*t),.7),p=c.clone().addScaledVector(side,s*w).addScaledVector(normal,Math.abs(s)*w*.23+Math.sin(t*5)*s*w*.07);
    positions.push(...p.toArray());uv.push((s+1)/2,t);const k=(i===2?1.12:.86+.10*Math.sin(t*3))*(.92+.08*Math.sin(j*1.7));colors.push(tint.r*k,tint.g*k,tint.b*k);
   }
  }
  for(let j=0;j<segments;j++)for(let i=0;i<4;i++){const a=j*5+i;indices.push(a,a+5,a+6,a,a+6,a+1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,'foliage');leaves++;
 }
 function pothos(x,y,z,w=1.8,count=42,clearX=null){
  for(let i=0;i<count;i++){
   const a=random()*Math.PI*2,h=.14+random()*.29,px=x+(random()-.5)*(w-.12),pz=z+(random()-.5)*.22,len=.16+random()*.13;
   const leafWidth=.065+random()*.04;
   // Leave a planted divider's sculpture mount clear of stems and foliage.
   if(clearX!==null&&Math.abs(px-clearX)<.49)continue;
   const origin=[px,y,pz],stem=[px+Math.sin(a)*.09,y+h,pz+Math.cos(a)*.09];
   tube([origin,[px,y+h*.6,pz],stem],.0024,'#415c2e','plain',3);
   leaf([stem,[stem[0]+Math.sin(a)*len*.5,stem[1]+.04,stem[2]+Math.cos(a)*len*.5],[stem[0]+Math.sin(a)*len,stem[1]-.08,stem[2]+Math.cos(a)*len]],leafWidth,greens[i%greens.length],7);
   const other=a+2.4,lower=[px,y+h*.42,pz];leaf([lower,[px+Math.sin(other)*len*.4,lower[1]+.045,pz+Math.cos(other)*len*.4],[px+Math.sin(other)*len*.75,lower[1]-.03,pz+Math.cos(other)*len*.75]],.066,greens[(i+2)%5],6);
  }
  // A few hanging vines spill over the planter ends.
  for(const sign of [-1,1]){
   const px=x+sign*(w/2-.09),end=[px+sign*.07,y-.34,z+.14];tube([[px,y,z],[px+sign*.15,y-.12,z+.13],end],.003,'#365132','plain',10);
   for(let j=0;j<5;j++){const yy=y-j*.065,zz=z+.08+j*.013;leaf([[px,yy,zz],[px+sign*.11,yy+.01,zz+.03],[px+sign*.13,yy-.10,zz+.04]],.065,greens[j%5],7);}
  }
 }
 const planters=[];
 function planter(x,z,w=1.94,top=1.19,count=42){
  rounded(w,.59,.37,.024,x,top-.30,z,'#c6b595','wood');rounded(w+.04,.055,.40,.017,x,top-.02,z,'#d9c7a4','wood');box(w-.06,.015,.30,x,top-.026,z,'#29271a');
  for(const sx of [-1,1])box(.045,.18,.28,x+sx*(w/2-.06),top-.68,z,'#39372b');
  const clearX=x>0&&z===-2.585?1.78:x<0&&z===-5.255?-1.88:null;
  pothos(x,top,z,w,count,clearX);planters.push({x,z,width:w,top});
 }
 for(const z of [.085,-2.585,-5.255,-7.925,-10.595,-13.28])for(const x of [-2.28,2.28])planter(x,z);
 planter(1.92,1.60,1.12,1.05,24);
 function pot(x,z,r=.22,h=.46){cylinder(r,r*.79,h,x,h/2+.02,z,'#a78056','wood',24);cylinder(r*1.06,r*1.06,.047,x,h+.015,z,'#a78056','wood',24);cylinder(r*.91,r*.91,.014,x,h+.041,z,'#302b1f','plain',24);}
 function ficus(x,z,h=2.60){
  pot(x,z,.21,.44);
  tube([[x,.45,z],[x-.045,1.2,z+.03],[x+.035,1.85,z],[x,h-.15,z-.01]],.023,'#66503b','wood',16);
  for(let branch=0;branch<11;branch++){
   const a=branch*2.4,yy=1.14+branch*(h-1.3)/10,reach=.29+random()*.21,bx=x+Math.sin(a)*reach,bz=z+Math.cos(a)*reach;
   tube([[x,yy-.13,z],[x+Math.sin(a)*reach*.6,yy+.12,z+Math.cos(a)*reach*.6],[bx,yy+.15,bz]],.009,'#6b543a','wood',8);
   for(let j=0;j<6;j++){
    const theta=a+(j%2?-.7:.7),t=.2+j*.14,px=x+Math.sin(a)*reach*t,pz=z+Math.cos(a)*reach*t,py=yy+.15*t;
    leaf([[px,py,pz],[px+Math.sin(theta)*.12,py+.11,pz+Math.cos(theta)*.12],[px+Math.sin(theta)*.25,py+.01,pz+Math.cos(theta)*.25]],.063+random()*.02,greens[(j+branch)%5],8);
   }
  }
 }
 for(const [x,z,h] of [[-3.55,-.85,2.65],[3.58,-4.45,2.52],[-3.56,-8.3,2.55],[3.56,-11.1,2.68]])ficus(x,z,h);
 function palm(x,z,h){
  pot(x,z,.29,.57);
  for(let k=0;k<3;k++){
   const a=k*2.2,px=x+Math.sin(a)*.08,pz=z+Math.cos(a)*.08,hh=h-k*.18;
   tube([[px,.57,pz],[px+.06,hh*.6,pz],[px,hh,pz]],.019,'#7c8050','wood',14);
   for(let j=0;j<7;j++){
    const theta=j*Math.PI*2/7+k*.45,len=.65+random()*.16,curve=new T.CatmullRomCurve3([new T.Vector3(px,hh,pz),new T.Vector3(px+Math.sin(theta)*len*.45,hh+.11,pz+Math.cos(theta)*len*.45),new T.Vector3(px+Math.sin(theta)*len,hh-.32,pz+Math.cos(theta)*len)]);
    tube(curve.getPoints(12).map(p=>p.toArray()),.004,'#667b36','plain',12);
    for(let m=1;m<10;m++)for(const sign of [-1,1]){
     const t=m/11,c=curve.getPoint(t),spread=.17*Math.sin(t*Math.PI)+.02,phi=theta+sign*.95;
     leaf([c.toArray(),[c.x+Math.sin(phi)*spread*.7,c.y-.04,c.z+Math.cos(phi)*spread*.7],[c.x+Math.sin(phi)*spread,c.y-.15,c.z+Math.cos(phi)*spread]],.021,greens[(m+j)%5],5);
    }
   }
  }
 }
 palm(-3.45,3.13,2.66);palm(3.55,-14.40,2.80);
 // Suspended greenery stays close to the wall and clear of faces / aisle.
 for(const [side,z] of [[-1,-3.1],[1,-7.3],[-1,-12.2]]){
  const x=side*3.52,y=2.68;cylinder(.18,.105,.15,x,y,z,'#9d8057','wood');cylinder(.19,.19,.022,x,y+.08,z,'#b59867','wood');
  for(const a of [0,2.094,4.189])tube([[x+Math.sin(a)*.17,y+.06,z+Math.cos(a)*.17],[x,3.54,z]],.003,'#474235','chrome',3);
  pothos(x,y+.08,z,.35,18);
 }
 return {planters,tallPlants:6,hangingBaskets:3,leaves};
}
