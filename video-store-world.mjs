import * as T from './vendor/three.module.js';
import {STORE_TV,FILM_CATALOG} from './video-store-catalog.mjs';
import {createStoreBuilder,FINISH} from './video-store-materials.mjs';

export const STORE_PALETTE=Object.freeze({horizon:'#6ca8ce',fog:'#a4bfd0',fogNear:90,fogFar:160});
export const STORE_POSTERS=Object.freeze(['the-thing','back-to-the-future','beetlejuice','et','jurassic-park','edward-scissorhands','big-trouble','batman','roger-rabbit','toys']);
export function createVideoStore(options={}){
 const b=createStoreBuilder(options),{root,material,add,box,face,cylinder,ellipsoid,rounded,offset}=b;
 let caseCount=0,liveTime=false,skyDaylight=1;
 const rng=(()=>{let seed=82913;return()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);})();
 for(const name of ['logo','new-releases','comedy','horror','adventure','family','membership','returns','tv-standby','terminal','rental-policy','staff-picks','open','after-hours-window'])material(name,{file:`./assets/video-store/${name}.svg`,surface:['logo','open','tv-standby','terminal'].includes(name)?FINISH.glow:0});
 for(const t of FILM_CATALOG){
  if(t.front||t.poster)material(t.id+'-front',{file:'./'+(t.front||t.poster)});
  material(t.id+'-spine',{file:'./'+(t.spine||`assets/video-store/catalog/${t.id}-label.svg`)});
 }
 for(const id of STORE_POSTERS){const t=FILM_CATALOG.find(t=>t.id===id);if(t?.poster)material(id+'-poster',{file:'./'+t.poster});}
 material('leaves',{file:'./assets/forest/foliage.png',surface:FINISH.foliage});

 // A real exterior is visible through the open wall bays, not painted on a panel.
 add(new T.SphereGeometry(88,24,12),'sky',0,0,0,'#fff');
 box(58,.16,70,-18,-.26,5,'#474d4e','asphalt');
 box(2.3,.18,26,-7.7,-.09,1.5,'#b9b7a7');box(.15,.24,26,-8.86,-.04,1.5,'#ded6be');
 for(let z=-11;z<15;z+=1.25)box(2.22,.002,.014,-7.67,.007,z,'#8d8d83');
 for(let z=-9;z<13;z+=2.8){box(4.9,.01,.065,-12.3,-.166,z,'#dfd5aa');box(.19,.13,1.45,-9.75,-.105,z+1.38,'#c6c3ad');}
 for(const z of [-4,7]){box(.55,.014,.72,-9.22,-.154,z,'#202829','metal');for(let i=0;i<8;i++)box(.5,.016,.018,-9.22,-.142,z-.3+i*.084,'#7c8077','metal');}
 box(1.7,.2,31,-21.5,-.13,1,'#493d2b');
 function hedge(x,z,length,alongZ=true){
  box(alongZ?1.1:length,.82,alongZ?length:1.1,x,.38,z,'#203d21');
  const count=Math.ceil(length/.38);
  for(let i=0;i<count;i++){
   const a=(i/(count-1)-.5)*length,xx=x+(alongZ?0:a),zz=z+(alongZ?a:0),yaw=alongZ?Math.PI/2:0;
   for(const side of [-1,1]){
    face(.96+rng()*.31,.94+rng()*.21,xx+(alongZ?side*.58:0),.59+rng()*.16,zz+(alongZ?0:side*.58),'leaves',yaw,'#bfd19c');
    face(.76,.73,xx+(alongZ?side*.65:0),.37,zz+(alongZ?0:side*.65),'leaves',yaw+.12,'#9ab782');
   }
   const top=new T.PlaneGeometry(1.35,1.2);top.rotateX(-Math.PI/2);add(top,'leaves',xx,.89+rng()*.1,zz,'#bdd0a0',rng());
  }
 }
 hedge(-21.5,1,30);hedge(-11,-11.5,20,false);hedge(-9.25,-6.7,4.3);hedge(-9.25,9.3,3.5);
 for(const [x,z] of [[-24,-8],[-26,4],[-27,15],[-14,-16],[-33,-3]]){
  cylinder(.13,.24,3.4,x,1.4,z,'#615240','wood',12);
  for(let i=0;i<60;i++){
   const a=i*2.399,r=1.9*Math.sqrt(rng()),h=2.6+rng()*2.3;
   face(1.75+rng()*.8,1.42+rng()*.8,x+Math.cos(a)*r,h,z+Math.sin(a)*r,'leaves',Math.PI/2+(rng()-.5)*2,'#a4bf89');
  }
 }
 function car(x,z,color){
  const old=offset.clone();offset.set(x,0,z);b.setFrameYaw(Math.PI/2);
  const quad=(points,tint,key='paint')=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,1,2,0,2,3].flatMap(i=>points[i]),3));g.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,0,1,1,0,1],2));g.computeVertexNormals();add(g,key,0,0,0,tint);};
  rounded(1.76,.43,4.25,.10,0,.44,0,color,'paint');
  // Sloping windscreen and rear glass join the lower body to a narrow roof.
  quad([[-.78,.68,.94],[.78,.68,.94],[.68,1.22,.30],[-.68,1.22,.30]],color);
  quad([[.78,.68,-1.32],[-.78,.68,-1.32],[-.68,1.22,-.77],[.68,1.22,-.77]],color);
  quad([[-.68,1.22,.30],[.68,1.22,.30],[.68,1.22,-.77],[-.68,1.22,-.77]],color);
  quad([[-.67,.77,.857],[.67,.77,.857],[.594,1.16,.375],[-.594,1.16,.375]],'#415d65');
  quad([[.66,.77,-1.241],[-.66,.77,-1.241],[-.59,1.16,-.846],[.59,1.16,-.846]],'#3a555e');
  for(const side of [-1,1]){
   const lo=side*.787,hi=side*.687;
   quad([[lo,.7,.91],[lo,.7,-1.3],[hi,1.215,-.77],[hi,1.215,.3]],color);
   quad([[lo+side*.005,.77,.76],[lo+side*.005,.77,-.25],[hi+side*.005,1.16,-.25],[hi+side*.005,1.16,.26]],'#46616a');
   quad([[lo+side*.005,.77,-.33],[lo+side*.005,.77,-1.13],[hi+side*.005,1.16,-.76],[hi+side*.005,1.16,-.33]],'#3d535b');
   box(.035,.017,2.17,side*.80,.715,-.16,'#a1a8a0','metal');box(.055,.036,2.9,side*.895,.44,0,'#252b2a');box(.028,.025,.16,side*.859,.63,-.40,'#c2c2b8','metal');
   rounded(.18,.12,.25,.025,side*.91,.84,.74,color,'paint');
   for(const zw of [-1.35,1.32]){
    const g=new T.CylinderGeometry(.32,.32,.23,20);g.rotateZ(Math.PI/2);add(g,'plain',side*.84,.24,zw,'#151c1c');
    const hub=new T.CylinderGeometry(.19,.19,.242,20);hub.rotateZ(Math.PI/2);add(hub,'metal',side*.85,.24,zw,'#8b918b');
    for(let j=0;j<8;j++){const a=j*Math.PI/4;ellipsoid(.006,.036,.018,side*.977,.24+Math.sin(a)*.135,zw+Math.cos(a)*.135,'#263334','plain',6);}
   }
  }
  for(const end of [-1,1]){box(1.73,.11,.09,0,.29,end*2.12,'#999d97','metal');box(.4,.14,.019,0,.455,end*2.174,'#ddd4b6');for(const side of [-1,1]){box(.4,.17,.025,side*.62,.55,end*2.153,end===1?'#eee0b5':'#8d3034','paint');for(let line=0;line<5;line++)box(.006,.15,.026,side*.62-.14+line*.07,.55,end*2.168,end===1?'#c1c4b0':'#61282b');}}
  for(let i=0;i<7;i++)box(.65,.015,.012,0,.35+i*.028,2.165,'#273435');
  offset.copy(old);b.setFrameYaw(0);
 }
 car(-12.2,-4.8,'#7c2930');car(-12.3,.8,'#9ca99e');car(-12.1,6.4,'#304f70');
 for(const z of [-8,10]){cylinder(.055,.085,5,-18.7,2.4,z,'#414d4c','metal');box(1.05,.08,.08,-18.2,4.94,z,'#515f5a','metal');rounded(.56,.11,.28,.03,-17.8,4.91,z,'#8b9289','metal');}
 for(const [x,z,w,h] of [[-33,-17,13,3.2],[-39,5,15,4.2],[-29,23,17,3.5]]){box(8,h,w,x,h/2-.2,z,'#b6ada0');box(8.4,.16,w+.4,x,h-.15,z,'#797f7c');}

 // Burgundy carpet, off-white plaster and walnut joinery.
 box(12.8,.16,17.8,0,-.09,0,'#5a2437','carpet');box(12.8,.10,17.8,0,3.59,0,'#c8c0a7','ceiling');
 box(12.8,3.55,.16,0,1.775,-8.9,'#d6c9a9');box(.16,3.55,17.8,6.4,1.775,0,'#c9bd9f');box(12.8,3.55,.16,0,1.775,8.9,'#d5c8aa');
 // There is deliberately no wall behind the glass in this opening.
 box(.16,.6,17.8,-6.4,.3,0,'#54402b','wood');box(.16,.35,17.8,-6.4,3.405,0,'#d0c0a0');
 for(let z=-8.52;z<9;z+=2.84){box(.22,2.78,.075,-6.36,1.94,z,'#344844','metal');if(z<8)face(2.76,2.58,-6.4,1.94,z+1.42,'glass',Math.PI/2);}
 for(const y of [.62,3.26])box(.22,.10,17.8,-6.36,y,0,'#384b47','metal');
 box(.40,.085,17.8,-6.22,.59,0,'#6f4c31','wood');box(.09,.1,17.6,6.28,.12,0,'#493322','wood');box(12.7,.1,.09,0,.12,-8.79,'#493322','wood');
 for(const y of [.82,3.19]){box(12.68,.065,.055,0,y,-8.80,'#79573a','wood');box(.055,.065,17.65,6.29,y,0,'#79573a','wood');}
 box(12.7,.22,.08,0,3.4,-8.78,'#234b48');box(.08,.22,17.6,6.29,3.4,0,'#234b48');
 for(const y of [3.275,3.3]){box(12.65,.016,.025,0,y,-8.72,y<3.29?'#66b8ad':'#db7f91','glow');box(.025,.016,17.5,6.24,y,0,y<3.29?'#66b8ad':'#db7f91','glow');}
 face(1.6,.48,-6.27,2.15,5.2,'after-hours-window',Math.PI/2);face(.77,.36,-6.25,2.65,1.5,'open',Math.PI/2);
 for(const x of [-4.5,-.25,4.2])for(const z of [-6.3,-2.3,1.7,6.1]){
  box(.79,.052,1.55,x,3.506,z,'#504f44','metal');box(.69,.033,1.45,x,3.472,z,'#eee4c5','glow');for(let i=0;i<7;i++)box(.7,.015,.014,x,3.449,z-.6+i*.2,'#aaa897');
 }
 for(const z of [-4,4]){box(.68,.025,.65,2.05,3.494,z,'#918f81','metal');for(let i=0;i<10;i++)box(.57,.03,.017,2.05,3.471,z-.25+i*.055,'#454a45');}

 const colors=['#261c1b','#141e29','#c0ac72','#3e2026','#233d39','#25222f'];
 function tape(x,y,z,index,front=true){
  const film=FILM_CATALOG[index%FILM_CATALOG.length],h=.30,w=front?.167:.047,d=front?.045:.178;
  box(w,h,d,x,y+h/2,z,colors[index%colors.length],'paint');
  face(w*.976,h*.98,x,y+h/2,z+d/2+.0018,front&&(film.front||film.poster)?film.id+'-front':film.id+'-spine');
  box(w*.9,.003,d*.87,x,y+h-.001,z,'#a59b84');caseCount++;
 }
 function shelf(x,z,w,label,seed=0,rows=4){
  const pool=FILM_CATALOG.map((film,index)=>({film,index})).filter(({film})=>label==='horror'?film.category==='Horror'||film.director==='John Carpenter':label==='adventure'?['Adventure','Sci-fi','Action'].includes(film.category):label==='family'?['Family','Fantasy'].includes(film.category):label==='comedy'?['Comedy','Fantasy'].includes(film.category):true).map(t=>t.index);
  const h=.12+rows*.345;box(w,h,.08,x,h/2,z-.11,'#34514a');box(w+.05,.06,.56,x,.06,z+.08,'#493824','wood');
  for(const side of [-1,1])box(.055,h+.035,.50,x+side*w/2,h/2+.02,z+.075,'#bdb18f');
  for(let row=0;row<rows;row++){
   const y=.13+row*.345;box(w,.032,.49,x,y,z+.08,'#cebf9c');box(w,.046,.02,x,y,z+.335,'#705039','wood');
   let cursor=-w/2+.06,slot=0;
   while(cursor<w/2-.2){const front=(slot+row)%5===0||(row===rows-1&&slot%2===0),index=pool[(seed*11+row*9+slot)%pool.length],tw=front?.167:.047;tape(x+cursor+tw/2,y+.017,z+.197,index,front);cursor+=tw+.016+(slot%13===12?.055:0);slot++;}
   for(let i=0;i<Math.floor(w);i++)box(.035,.11,.17,x-w/2+.28+i,y+.065,z+.17,'#dbb873');
  }
  box(w+.07,.20,.15,x,h+.13,z-.055,'#28514b');face(Math.min(w-.1,2.85),.155,x,h+.13,z+.025,label);box(w+.08,.03,.5,x,h+.035,z+.07,'#5e452d','wood');
 }
 shelf(-2.45,3.95,2.8,'staff-picks',1,3);shelf(-2.9,-.1,3.2,'adventure',2);shelf(1.15,-.1,3.1,'horror',3);shelf(-2.9,-3.8,3.2,'family',4);shelf(1.15,-3.8,3.1,'comedy',5);shelf(0,-8.51,11.5,'new-releases',7,4);
 for(let z=-6.9;z<2;z+=2.3){
  box(.58,.05,1.9,6.03,.92,z,'#715239','wood');box(.08,.05,1.88,5.76,1.05,z,'#97724b','wood');
  for(let i=0;i<5;i++){const film=FILM_CATALOG[(Math.round((z+7)*7)+i)%FILM_CATALOG.length];box(.045,.30,.167,6.1,1.095,z-.7+i*.31,'#262625');face(.166,.297,6.072,1.095,z-.7+i*.31,film.id+(film.front||film.poster?'-front':'-spine'),-Math.PI/2);caseCount++;}
 }
 function poster(id,x,y,z,yaw=0,w=.91,h=1.33){
  const film=FILM_CATALOG.find(t=>t.id===id);if(!film?.poster)return;
  box(w+.09,h+.09,.055,x,y,z,'#3d3127','wood',yaw);const n=new T.Vector3(Math.sin(yaw),0,Math.cos(yaw));
  face(w+.02,h+.02,x+n.x*.032,y,z+n.z*.032,'plain',yaw,'#ccb894');face(w,h,x+n.x*.035,y,z+n.z*.035,id+'-poster',yaw);
  for(const sy of [-1,1])box(w+.05,.012,.014,x+n.x*.04,y+sy*(h+.035)/2,z+n.z*.04,'#b8a17a','metal',yaw);
 }
 for(const [i,id] of ['the-thing','back-to-the-future','beetlejuice','et','jurassic-park','edward-scissorhands'].entries())poster(id,-5.15+i*2.04,2.47,-8.77,0,.9,1.28);
 for(const [i,id] of ['big-trouble','batman','roger-rabbit','toys'].entries())poster(id,6.27,2.14,-6.8+i*2.45,-Math.PI/2,1.06,1.57);
 // Timber checkout, black laminate top, physical trim, labels and equipment.
 rounded(3.38,1.04,1.17,.06,4.64,.54,4.55,'#67402a','wood');rounded(3.52,.09,1.29,.035,4.64,1.098,4.55,'#302c2a','paint');
 for(let i=0;i<25;i++)box(.047,.88,.027,3.05+i*.13,.53,5.155,'#a67a48','wood');
 box(3.39,.07,.055,4.64,.09,5.18,'#272820');box(3.42,.023,.031,4.64,1.056,5.195,'#b39d67','metal');
 face(.90,.23,3.70,.79,5.202,'returns');box(.77,.11,.018,3.70,.57,5.202,'#131819');face(.88,.41,5.55,.62,5.204,'membership');
 rounded(.50,.37,.46,.035,4.30,1.48,4.40,'#b7ae95');box(.38,.08,.35,4.30,1.25,4.41,'#858475');rounded(.419,.29,.025,.025,4.30,1.49,4.642,'#343d34');face(.35,.224,4.30,1.49,4.667,'terminal');
 rounded(.64,.033,.23,.008,4.30,1.168,4.92,'#b6ac95');for(let row=0;row<4;row++)for(let key=0;key<12;key++)box(.037,.012,.032,4.035+key*.047,1.19,4.84+row*.045,'#d3c8ab');
 rounded(.29,.21,.32,.025,5.0,1.25,4.6,'#b8ae95');box(.21,.018,.12,5.0,1.365,4.60,'#3b413c');box(.18,.003,.22,5.0,1.377,4.75,'#e4dbc3');
 box(.035,.18,.035,3.43,1.25,4.92,'#343d39');rounded(.13,.06,.12,.015,3.43,1.36,4.94,'#394b44');rounded(.29,.07,.22,.02,5.67,1.18,4.83,'#afa58d');rounded(.33,.06,.075,.02,5.67,1.265,4.79,'#d3c5a7');
 for(let i=0;i<3;i++){const t=FILM_CATALOG[i];box(.30,.043,.178,3.35,1.174+i*.047,4.47,'#252423');face(.294,.041,3.35,1.174+i*.047,4.561,t.id+'-spine',0,'#fff',true);}
 cylinder(.11,.09,.15,5.51,1.22,4.48,'#803e42','paint');for(let i=0;i<5;i++)cylinder(.006,.006,.19,5.45+i*.024,1.36,4.48,'#d2ab59');
 rounded(2.81,.68,.09,.035,3.8,2.84,1.8,'#1f3231');face(2.69,.57,3.8,2.84,1.855,'logo');for(const x of [2.71,4.89])cylinder(.009,.009,.4,x,3.34,1.8,'#64695d','metal',6);
 face(.93,.62,6.285,1.89,6.9,'rental-policy',-Math.PI/2);
 cylinder(.29,.21,.43,-5.63,.225,6.9,'#b68151','paint');cylinder(.27,.27,.014,-5.63,.447,6.9,'#3d3627');
 for(let i=0;i<15;i++){const a=i*2.4,x=-5.63+Math.cos(a)*.29,z=6.9+Math.sin(a)*.29;cylinder(.007,.009,.56,x,.71,z,'#516037','plain',6);face(.38,.56,x,.98+Math.sin(i)*.15,z,'leaves',a,'#849265');}
 rounded(.64,.12,.65,.055,4.65,.52,3.50,'#594b43');for(const dx of [-.25,.25])for(const dz of [-.25,.25])cylinder(.014,.019,.49,4.65+dx,.25,3.5+dz,'#4c5450','metal',7);
 // A 3D CRT cabinet surrounds the projected interactive trailer player.
 const [tx,ty,tz]=STORE_TV.position;
 rounded(1.61,1.23,.74,.085,tx,ty,tz-.38,'#373d3b','paint');rounded(1.46,1.11,.05,.035,tx,ty,tz+.002,'#1c2524');face(STORE_TV.width,STORE_TV.height,tx,ty,tz+.04,'tv-standby');
 for(const sx of [-.62,.62])box(.038,.3,.038,tx+sx,3.405,tz-.28,'#414c46','metal');box(1.65,.04,.79,tx,ty-.65,tz-.34,'#2e3832','metal');
 for(let i=0;i<7;i++)box(.012,.045,.007,tx+.46+i*.028,ty-.55,tz+.034,'#111d1b');box(.025,.009,.008,tx+.66,ty-.55,tz+.04,'#90b97c','glow');
 // Shader-driven rain is confined to the outside of the windows.
 const rb=b.batches.get('rain');
 for(let i=0;i<620;i++){const x=-7-rng()*20,z=-14+rng()*33,y=rng()*8;for(const cross of [false,true])for(const [u,v] of [[0,0],[1,0],[1,1],[0,0],[1,1],[0,1]]){rb.positions.push(x+(cross?0:(u-.5)*.013),y+(v-.5)*.24,z+(cross?(u-.5)*.013:0));rb.normals.push(0,y,0);rb.uvs.push(u,v);rb.colors.push(1,1,1);}}
 b.finish({caseCount,filmCount:FILM_CATALOG.length,posterIds:STORE_POSTERS.filter(id=>FILM_CATALOG.find(t=>t.id===id)?.poster),windowBounds:{x:-6.4,bottom:.67,top:3.21,zMin:-8.4,zMax:8.4}});
 const rainMesh=root.children.find(o=>o.userData.finish===FINISH.rain);rainMesh.visible=false;rainMesh.frustumCulled=false;
 function updateDaylight(){for(const m of b.materials)m.uniforms.daylight.value=liveTime?skyDaylight:1;}
 return {root,palette:STORE_PALETTE,dome:null,
  setRain(value){rainMesh.visible=!!value;for(const m of b.materials)m.uniforms.rain.value=value?1:0;},
  setLiveTime(value){liveTime=!!value;updateDaylight();},setSky(sky){skyDaylight=sky.daylight;updateDaylight();},
  update(time){for(const m of b.materials)m.uniforms.time.value=time;},
  screenCorners(){const [x,y,z]=STORE_TV.position,w=STORE_TV.width/2,h=STORE_TV.height/2;return [[x-w,y+h,z+.044],[x+w,y+h,z+.044],[x+w,y-h,z+.044],[x-w,y-h,z+.044]];}
 };
}
