import * as T from './vendor/three.module.js';
import {elephantGeometryData} from './assets/elephant/geometry.mjs';
import {modelGeometryData as snailGeometryData} from './assets/snail/geometry.mjs';
import {modelGeometryData as gooseGeometryData} from './assets/goose/geometry.mjs';
import {modelGeometryData as moonCradleGeometryData} from './assets/moon-cradle/geometry.mjs';
const sharedGeometry=new WeakSet(),assetListeners=new Set(),modelGeometries=new Map(),modelTextures=new Map(),textureErrors=new Map();
const importedModels={elephant:elephantGeometryData,snail:snailGeometryData,goose:gooseGeometryData,'moon-cradle':moonCradleGeometryData};
export function onItemAssetsChanged(callback){assetListeners.add(callback);return ()=>assetListeners.delete(callback);}
function importedMesh(id){
 let geometry=modelGeometries.get(id);
 if(!geometry){const a=importedModels[id]();geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(a.positions,3));geometry.setAttribute('normal',new T.BufferAttribute(a.normals,3));geometry.setAttribute('uv',new T.BufferAttribute(a.uvs,2));geometry.setIndex(new T.BufferAttribute(a.indices,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();sharedGeometry.add(geometry);modelGeometries.set(id,geometry);}
 if(!modelTextures.has(id)&&typeof globalThis.Image==='function'){
  const notify=()=>{for(const f of assetListeners)f([...textureErrors.values()].join(' '));};
  const texture=new T.TextureLoader().load(new URL(`./assets/${id}/texture.jpg`,import.meta.url).href,()=>{textureErrors.delete(id);notify();},undefined,()=>{textureErrors.set(id,`The ${id} colours could not load. Refresh the page to try again; your item stays saved.`);notify();});
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;modelTextures.set(id,texture);
 }
 const m=new T.Mesh(geometry,new T.MeshStandardMaterial({map:modelTextures.get(id)||null,color:'#ffffff',roughness:.8,metalness:0,side:T.DoubleSide}));m.castShadow=true;m.receiveShadow=true;return m;
}
const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.88,flatShading:true,...extra});
function mesh(g,geometry,color,x=0,y=0,z=0,extra={}){const m=new T.Mesh(geometry,material(color,extra));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
const box=(g,w,h,d,c,x=0,y=h/2,z=0)=>mesh(g,new T.BoxGeometry(w,h,d),c,x,y,z);
const cylinder=(g,r1,r2,h,c,x=0,y=h/2,z=0,n=12)=>mesh(g,new T.CylinderGeometry(r1,r2,h,n),c,x,y,z);
const sphere=(g,r,c,x=0,y=r,z=0)=>mesh(g,new T.IcosahedronGeometry(r,1),c,x,y,z);
function roof(g,w,d,h,c,y){const a=[-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,w/2,0,d/2,0,h,d/2];const geom=new T.BufferGeometry();geom.setAttribute('position',new T.Float32BufferAttribute(a,3));geom.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);geom.computeVertexNormals();return mesh(g,geom,c,0,y,0);}
function tree(g,x,z,scale=1,color='#698d58',pine=false){const group=new T.Group();group.position.set(x,0,z);group.scale.setScalar(scale);g.add(group);cylinder(group,.13,.21,1.6,'#8e7150');if(pine){cylinder(group,0,.95,1.9,color,0,2.1,0,7);cylinder(group,0,.75,1.5,color,0,2.8,0,7);}else{sphere(group,1,color,0,2.05,0);sphere(group,.6,color,-.6,1.8,.25);sphere(group,.6,color,.5,1.95,.2);}return group;}
function flowers(g,x,z,color='#eed88e'){cylinder(g,.025,.025,.4,'#68906a',x,.2,z,5);sphere(g,.13,color,x,.43,z);}
function window(g,x,y,z,w=.5,h=.55,side=false){const m=box(g,w,h,.05,'#a4c7c4',x,y,z);if(side)m.rotation.y=Math.PI/2;const frame=box(g,w+.1,.07,.09,'#f8ead0',x,y-h/2,z);if(side)frame.rotation.y=Math.PI/2;}
function building(g,w,d,h,wall='#ede3c9',top='#a56854'){
 box(g,w+.22,.18,d+.2,'#c5b99d');box(g,w,h,d,wall,0,h/2+.18);roof(g,w+.42,d+.4,.85,top,h+.18);
 box(g,.55,1.05,.1,'#816445',.45,.7,d/2+.06);sphere(g,.05,'#d8bc77',.62,.73,d/2+.13);window(g,-.58,1.03,d/2+.06);window(g,-w/2-.04,1.13,0,.65,.65,true);window(g,w/2+.04,1.13,0,.65,.65,true);window(g,0,1.12,-d/2-.05);box(g,.6,1.1,.5,'#c3a48b',w*.27,h+.5,-d*.22);
 box(g,1.2,.15,.6,'#c1b695',.25,.08,d/2+.20);
}
export function createItem(id){const g=new T.Group();g.name=id;
 switch(id){
 case 'elephant':case 'snail':case 'goose':case 'moon-cradle':g.add(importedMesh(id));break;
 case 'cabin':building(g,2.65,2.3,1.9);box(g,2.8,.12,.55,'#b7946c',0,.23,1.6);break;
 case 'workshop':building(g,3.1,1.85,1.9,'#c8d0b8','#587a73');box(g,.9,.9,.12,'#8c9e85',.6,.68,1.01);for(const x of [-1.55,-1.36,-1.17]){const m=cylinder(g,.12,.12,1.1,'#a38159',x,.25,.5,8);m.rotation.x=Math.PI/2;}break;
 case 'garden':{
 box(g,2.7,.15,2.7,'#b99a73');for(const x of [-.68,.68]){box(g,.92,.25,2.3,'#9b7654',x,.19);box(g,.76,.07,2.15,'#6d634a',x,.36);for(const z of [-.72,0,.72]){sphere(g,.25,'#749156',x,.51,z);sphere(g,.16,'#a5b46b',x+.14,.57,z+.07);}}break;}
 case 'pond':{const rock=cylinder(g,1.45,1.5,.21,'#b8bbab',0,.12,0,24);rock.scale.x=1.22;const water=cylinder(g,1.32,1.33,.12,'#81b8c1',0,.22,0,32);water.scale.x=1.23;water.material.roughness=.3;for(const [x,z] of [[-1.3,-.5],[1.55,.3],[-.2,1.15],[.7,-1.05]]){const m=sphere(g,.28,'#a7aca0',x,.22,z);m.scale.y=.55;}for(const [x,z] of [[-.55,.45],[.5,-.45]]){cylinder(g,.26,.26,.025,'#749564',x,.3,z,10);flowers(g,x,z,'#f3d3cb');}break;}
 case 'orchard':for(const [x,z,sc] of [[-1.25,-.55,.9],[1.2,-.6,.9],[0,1,.8]]){const t=tree(g,x,z,sc);for(const [xx,yy,zz] of [[.4,2.45,.65],[-.6,1.85,.65],[.75,1.95,.3]])sphere(t,.13,'#cd8966',xx,yy,zz);}box(g,.55,.4,.65,'#b49164',1.5,.2,1.2);break;
 case 'windmill':{
 cylinder(g,.63,.95,2.9,'#e6dfc6',0,1.5,0,8);cylinder(g,0,.91,1.05,'#97775d',0,3.48,0,8);window(g,0,1.45,.84);box(g,.38,.75,.1,'#826d50',0,.42,.91);
 const blades=new T.Group();blades.position.set(0,2.72,1.03);blades.rotation.z=.42;g.add(blades);for(let i=0;i<4;i++){const arm=new T.Group();arm.rotation.z=i*Math.PI/2;blades.add(arm);box(arm,.09,1.4,.11,'#8e7551',0,.7,0);box(arm,.4,.85,.06,'#efead7',.12,.9,.06);for(let j=0;j<3;j++)box(arm,.41,.045,.08,'#b4a281',.12,.6+j*.29,.1);}sphere(g,.2,'#ab8760',0,2.72,1.12);break;}
 case 'bridge':{box(g,3.7,.07,1.75,'#91bbc1');for(let i=0;i<13;i++){const x=-1.7+i*.28,y=.28+.22*Math.sin((i/12)*Math.PI);box(g,.26,.13,1.45,'#b59a71',x,y);}for(const z of [-.65,.65]){for(const x of [-1.65,-.55,.55,1.65])box(g,.1,.9,.1,'#907552',x,.66,z);box(g,3.5,.1,.12,'#9e815c',0,1.05,z);}break;}
 case 'greenhouse':{box(g,3.6,.2,2.5,'#b8b998');const glass=mesh(g,new T.BoxGeometry(3.2,1.85,2.1),'#aacbc0',0,1.13,0,{transparent:true,opacity:.55,depthWrite:false});glass.castShadow=false;const r=roof(g,3.34,2.22,.8,'#b9d9c9',2.05);r.material.transparent=true;r.material.opacity=.65;r.material.depthWrite=false;for(const x of [-1.6,-.8,0,.8,1.6])for(const z of [-1.06,1.06])box(g,.07,1.88,.07,'#e8e7ce',x,1.14,z);for(const z of [-1.08,1.08]){box(g,3.3,.07,.07,'#e8e7ce',0,2.04,z);for(const sign of [-1,1]){const beam=box(g,1.89,.07,.08,'#e8e7ce',sign*.81,2.43,z);beam.rotation.z=-sign*.46;}}box(g,.07,.07,2.2,'#e8e7ce',0,2.84);for(const x of [-1,.9])for(const z of [-.5,.55]){cylinder(g,.22,.16,.3,'#b88a69',x,.33,z);sphere(g,.27,'#638864',x,.65,z);}break;}
 case 'observatory':{cylinder(g,1.4,1.5,1.9,'#dfd4b8',0,1,0,12);mesh(g,new T.SphereGeometry(1.48,16,8,0,Math.PI*2,0,Math.PI/2),'#708f8d',0,1.95,0);box(g,.55,1.05,.1,'#8d765c',0,.65,1.45);const telescope=cylinder(g,.17,.23,1.8,'#c9d0bf',.35,2.8,.9,12);telescope.rotation.x=.8;const lens=cylinder(g,.15,.15,.1,'#506f74',.35,3.4,1.56,12);lens.rotation.x=.8;cylinder(g,.6,.7,.2,'#919f92',0,1.96,0);break;}
 case 'gazebo':{cylinder(g,1.4,1.5,.2,'#c0ab85',0,.12,0,8);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(g,.12,1.9,.12,'#d8c6a3',Math.cos(a)*1.1,1.1,Math.sin(a)*1.1);}cylinder(g,0,1.43,1.0,'#849b86',0,2.52,0,6);box(g,1.4,.14,.4,'#9d815f',0,.52,-.55);break;}
 case 'beacon':{cylinder(g,.55,.92,3.35,'#ede3c8',0,1.72,0,10);cylinder(g,.68,.75,.55,'#bb846a',0,1.85,0,10);cylinder(g,1,1,.14,'#8d9f98',0,3.39,0,10);cylinder(g,.62,.62,.75,'#e9d299',0,3.84,0,8);for(let i=0;i<8;i++){const a=i*Math.PI/4;box(g,.05,.8,.05,'#7c897e',Math.cos(a)*.62,3.84,Math.sin(a)*.62);}cylinder(g,0,.86,.65,'#647e7a',0,4.56,0,8);box(g,.45,.8,.08,'#987b5e',0,.43,.88);break;}
 case 'flowers':{const base=cylinder(g,1.35,1.4,.08,'#9fae7d',0,.05,0,12);for(let i=0;i<21;i++){const a=i*2.4,r=Math.sqrt(i/21)*1.2;flowers(g,Math.cos(a)*r,Math.sin(a)*r,['#ead397','#d7ad9d','#b7aec7'][i%3]);}break;}
 case 'pine':tree(g,0,0,.9,'#688c72',true);break;
 case 'bench':{box(g,1.75,.12,.6,'#b49a76',0,.56);box(g,1.75,.48,.1,'#b49a76',0,.91,-.25);for(const x of [-.6,.6]){box(g,.1,.52,.45,'#6c7c6b',x,.26);box(g,.08,.85,.09,'#6c7c6b',x,.55,-.24);}break;}
 case 'path':for(const [x,z] of [[-.48,-.48],[.49,-.5],[-.5,.49],[.48,.5]]){const p=cylinder(g,.41,.45,.09,'#c6c5b0',x,.055,z,6);p.rotation.y=x;}break;
 case 'lantern':{cylinder(g,.25,.35,.12,'#929f91');cylinder(g,.05,.07,1.45,'#737e70');box(g,.45,.55,.45,'#ead2a0',0,1.65);for(const x of [-.23,.23])for(const z of [-.23,.23])box(g,.035,.6,.035,'#788373',x,1.65,z);cylinder(g,0,.38,.35,'#738475',0,2.1,0,4);break;}
 case 'rocks':for(const [x,z,r] of [[-.5,-.3,.48],[.5,.4,.43],[.4,-.5,.3]]){const rock=sphere(g,r,'#acb3a1',x,r*.6,z);rock.scale.y=.7;}flowers(g,-.5,.65,'#dfd2a5');break;
 case 'fountain':{cylinder(g,1.25,1.35,.36,'#c5c3aa');cylinder(g,1.12,1.12,.06,'#8bb8bd',0,.38);cylinder(g,.2,.4,1.2,'#b2b7a1');cylinder(g,.65,.45,.18,'#c5c3aa',0,1.3);cylinder(g,.53,.53,.035,'#8bb8bd',0,1.41);sphere(g,.13,'#9acbd0',0,1.65,0);break;}
 case 'material':{box(g,1.5,1.25,1.5,'#bc9c72');for(const x of [-.5,.5]){box(g,.15,1.31,1.55,'#90764e',x,.65);box(g,1.55,1.31,.15,'#a2855d',0,.65,x);}box(g,.64,.52,.03,'#e2d5b6',0,.73,.79);const sprout=tree(g,0,0,.35,'#799769');sprout.position.y=1.2;break;}
 default:throw Error('Unknown 3D item: '+id);
 }
 return g;
}
export function createLights(scene,shadows=true){scene.add(new T.HemisphereLight('#fff6df','#8ea8a0',2.3));const sun=new T.DirectionalLight('#fff2d8',3.1);sun.position.set(-14,26,18);sun.castShadow=shadows;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-19,right:19,top:19,bottom:-19,near:1,far:65});sun.shadow.bias=-.0006;sun.shadow.normalBias=.025;scene.add(sun);return sun;}
export function disposeGroup(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!sharedGeometry.has(o.geometry))geometries.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}
