import * as T from './vendor/three.module.js';
import {STORE_TV,VHS_EDITIONS} from './video-store-catalog.mjs';

export const STORE_PALETTE=Object.freeze({horizon:'#171e35',fog:'#212840',fogNear:90,fogFar:160});
const VERTEX=`varying vec3 vWorld;varying vec3 vNormal;varying vec3 vTint;varying vec2 vUV;
void main(){vUV=uv;vTint=color;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const FRAGMENT=`uniform sampler2D artwork;uniform float hasArtwork;uniform float surface;uniform float daylight;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vTint;varying vec2 vUV;
float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec3 n=normalize(vNormal);vec3 base=vTint;
 if(hasArtwork>.5){vec4 a=texture2D(artwork,vUV);if(a.a<.1)discard;base*=a.rgb;}
 float up=max(n.y,0.),side=max(dot(n,normalize(vec3(-.45,.9,.4))),0.);
 float light=.67+.22*up+.15*side;
 float low=.77+.23*smoothstep(0.,1.45,vWorld.y);
 light*=low;
 if(surface>1.5&&surface<2.5){
   vec2 tile=fract(vWorld.xz/1.22);float seam=step(.016,tile.x)*step(.016,tile.y);
   base*=mix(.58,1.,seam)*( .955+.07*noise(floor(vWorld.xz*220.)) );
 }
 if(surface>.5&&surface<1.5){
   float grain=noise(floor(vWorld.xz*520.));float weave=sin(vWorld.x*430.)*sin(vWorld.z*190.);
   base*=.77+.32*grain+.05*weave;
   float fleck=step(.993,noise(floor(vWorld.xz*160.)));base+=vec3(.06,.035,.008)*fleck;
   float rowShadow=exp(-pow((vWorld.z-1.35)/.48,2.))+exp(-pow((vWorld.z+2.1)/.48,2.))+exp(-pow((vWorld.z+5.5)/.48,2.));
   base*=1.-.26*min(rowShadow,1.)*(1.-smoothstep(5.8,7.,abs(vWorld.x)));
 }
 if(surface>2.5&&surface<3.5){base=mix(vec3(.018,.04,.105),vec3(.27,.46,.59),daylight);base+=vec3(.3,.21,.08)*pow(max(0.,sin(vUV.x*31.4)),110.);light=1.;}
 if(surface>3.5){light=1.;}
 gl_FragColor=vec4(base*light,1.);
 #include <colorspace_fragment>
}`;

// Geometry is batched by surface/scan, so hundreds of cases don't become
// hundreds of draw calls. Artwork stays in separate high-resolution textures.
export function createVideoStore({onReady=()=>{},onError=()=>{}}={}){
 const root=new T.Group();root.name='1980s Blockbuster video store';
 const batches=new Map(),textures=[],materials=[],sourceFiles=new Map();let disposed=false;
 const offset=new T.Vector3();
 function material(key,{file=null,surface=0}={}){
  if(batches.has(key))return key;
  let texture=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
  if(file&&typeof document!=='undefined'&&typeof document.createElementNS==='function'){
   texture.dispose();texture=new T.TextureLoader().load(file,()=>{if(!disposed)onReady();},undefined,()=>{if(!disposed)onError('A video-store texture could not load. Check that the assets/video-store folder was uploaded.');});
  }
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);if(file)sourceFiles.set(texture,file);
  const mat=new T.ShaderMaterial({uniforms:{artwork:{value:texture},hasArtwork:{value:file?1:0},surface:{value:surface},daylight:{value:1}},vertexShader:VERTEX,fragmentShader:FRAGMENT,vertexColors:true,side:T.DoubleSide});
  materials.push(mat);batches.set(key,{mat,positions:[],normals:[],uvs:[],colors:[],file});return key;
 }
 material('solid');material('carpet',{surface:1});material('ceiling',{surface:2});material('window',{surface:3});material('light',{surface:4});
 for(const f of ['logo','new-releases','comedy','horror','adventure','family','membership','returns','tv-standby','terminal','rental-policy'])material(f,{file:`./assets/video-store/${f}.svg`,surface:f==='tv-standby'?4:0});
 for(const edition of VHS_EDITIONS)for(const face of ['front','spine'])if(edition[face])material(edition.id+'-'+face,{file:edition[face]});
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3(1,1,1);
 function add(geometry,key,x,y,z,color='#ffffff',yaw=0){
  const b=batches.get(key),tint=new T.Color(color);rotation.setFromAxisAngle(T.Object3D.DEFAULT_UP,yaw);matrix.compose(new T.Vector3(x,y,z).add(offset),rotation,scale);
  const g=(geometry.index?geometry.toNonIndexed():geometry).clone();g.applyMatrix4(matrix);
  const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
  for(let i=0;i<p.count;i++){b.positions.push(p.getX(i),p.getY(i),p.getZ(i));b.normals.push(n.getX(i),n.getY(i),n.getZ(i));b.uvs.push(uv?.getX(i)||0,uv?.getY(i)||0);b.colors.push(tint.r,tint.g,tint.b);}
  g.dispose();geometry.dispose();
 }
 function box(w,h,d,x,y,z,color,key='solid',yaw=0){add(new T.BoxGeometry(w,h,d),key,x,y,z,color,yaw);}
 function face(w,h,x,y,z,key,yaw=0,color='#ffffff',turn=false){const geometry=new T.PlaneGeometry(w,h);if(turn){const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++){const u=uv.getX(i),v=uv.getY(i);uv.setXY(i,v,1-u);}}add(geometry,key,x,y,z,color,yaw);}
 // Low-pile blue carpet, acoustic ceiling, and the continuous blue/yellow fascia.
 box(16,.16,23,0,-.09,0,'#204e87','carpet');box(16,.12,23,0,4.03,0,'#ddd5c0','ceiling');
 box(16,4,.18,0,2,-11.45,'#dfd3b7');box(.18,4,23,7.98,2,0,'#ddd0af');box(.18,4,23,-7.98,2,0,'#d8ccb2');box(16,4,.18,0,2,11.45,'#cfc3a9');
 for(const side of [-1,1]){box(.025,.75,23,side*7.876,2.66,0,'#063d89');box(.03,.055,23,side*7.86,3.063,0,'#ffd23c');box(.025,.055,23,side*7.86,2.25,0,'#f7ca33');}
 box(15.9,.75,.03,0,2.66,-11.344,'#063d89');box(15.9,.055,.04,0,3.063,-11.32,'#ffd23c');
 face(8.4,.52,0,2.67,-11.31,'new-releases');
 for(let x=-6.5;x<8;x+=3.25)for(let z=-9;z<11;z+=3.7){
  box(1.25,.055,.62,x,3.932,z,'#faf2d4','light');box(1.34,.08,.71,x,3.96,z,'#b6ad9c');
  box(1.28,.016,.02,x,3.895,z,'#cdc7b5');
 }
 // Windows along the left side. Mullions and the entrance remain real geometry.
 for(let z=-8.6;z<10.6;z+=2.15){
  face(1.98,2.34,-7.866,2.34,z,'window',Math.PI/2);
  box(.15,2.52,.085,-7.81,2.34,z+1.04,'#273039');box(.14,.09,2.1,-7.81,1.13,z,'#252e35');box(.14,.09,2.1,-7.81,3.55,z,'#252e35');
 }
 for(const x of [-1.1,1.1]){face(2.08,3.25,x,1.74,11.32,'window',Math.PI);box(.1,3.5,.18,x+1.05,1.76,11.28,'#293b47');box(.7,.035,.1,x,1.4,11.15,'#c6c6b9');}
 // Shelves run across the view, with clear aisles between them.
 let caseCount=0;
 function tape(x,y,z,index,front){
  const edition=VHS_EDITIONS[index%VHS_EDITIONS.length],h=.348,w=front?.194:.048,d=front?.052:.198;
  box(w,h,d,x,y+h/2,z,'#171e28');
  if(front&&edition.front)face(w*.97,h*.98,x,y+h/2,z+d/2+.0015,edition.id+'-front');
  else face(w*.97,h*.98,x,y+h/2,z+d/2+.0015,edition.id+'-spine');
  // White paper edges show that these are cardboard VHS sleeves.
  box(w*.91,.005,d*.93,x,y+h-.001,z,'#c3b998');caseCount++;
 }
 function shelf(x,z,w,label,seed=0){
  const h=1.72;box(w,h,.18,x,h/2,z-.05,'#06418e');box(w+.07,.08,.53,x,.075,z+.045,'#292e33');
  for(const sx of [-w/2,w/2])box(.055,h+.08,.48,x+sx,h/2+.035,z+.1,'#e5dcc3');
  for(let row=0;row<4;row++){
   const y=.16+row*.387;box(w,.038,.48,x,y,z+.1,'#e7dec8');box(w,.032,.034,x,y+.017,z+.351,'#c1b393');
   let offset=-w/2+.09,slot=0;
   while(offset<w/2-.19){
    let front=(slot+row)%8===0;
    const edition=label==='comedy'?0:label==='adventure'?2:label==='horror'?(seed+row+slot)%2:front?(seed+row+Math.floor(slot/8))%2:(seed+row+slot)%3;
    if(!VHS_EDITIONS[edition].front)front=false;
    const tw=front?.194:.048;tape(x+offset+tw/2,y+.021,z+.205,edition,front);offset+=tw+.012;slot++;
   }
  }
  box(w,.30,.16,x,1.86,z-.015,'#e4d9bd');face(Math.min(w-.08,3.2),.24,x,1.86,z+.07,label);
 }
 shelf(-2.76,5.55,3.24,'new-releases',0);
 for(const [x,label] of [[-4.8,'comedy'],[-.2,'adventure'],[4.4,'horror']])for(const [i,z] of [1.2,-2.4,-6.0].entries())shelf(x,z,3.7,label,i);
 shelf(0,-10.98,14.8,'new-releases',1);
 // Broad blue laminate checkout with yellow edging and a tape return slot.
 offset.set(-1.1,0,-2);
 box(4.28,1.08,1.32,5.25,.56,5.50,'#07408b');box(4.45,.10,1.49,5.25,1.145,5.50,'#ffd046');box(4.38,.025,1.42,5.25,1.207,5.50,'#143f7a');
 for(const x of [3.25,5.3,7.25])box(.022,1.02,.012,x,.54,6.167,'#0a2044');
 face(1.53,.30,6.08,.79,6.175,'membership');face(1.05,.27,4.08,.8,6.175,'returns');box(.95,.17,.025,4.08,.53,6.18,'#151b20');box(.88,.12,.029,4.08,.53,6.2,'#020608');
 // Beige CRT terminals, mechanical keyboards, handset, barcode scanner.
 for(const x of [4.55,6.5]){
  box(.55,.08,.46,x,1.263,5.55,'#bfb59a');box(.48,.35,.50,x,1.48,5.42,'#d5ccb2');box(.49,.35,.055,x,1.48,5.697,'#e0d4b5');
  face(.382,.243,x,1.49,5.728,'terminal');box(.65,.044,.22,x,1.25,5.91,'#c9bfa5');
  for(let row=0;row<4;row++)for(let key=0;key<12;key++)box(.039,.015,.035,x-.265+key*.048,1.278,5.845+row*.044,'#e4dbc0');
  for(let line=0;line<7;line++)box(.26,.008,.008,x,1.37+line*.019,5.729,'#9b927e');
 }
 box(.28,.12,.36,7.04,1.275,5.93,'#bdb49c');box(.35,.065,.09,7.04,1.372,5.86,'#ece1c0');
 box(.16,.03,.17,3.67,1.243,5.87,'#26353d');box(.045,.20,.045,3.67,1.34,5.86,'#3a454c');box(.15,.075,.14,3.67,1.453,5.90,'#222e39');
 for(let i=0;i<3;i++){box(.36,.052,.22,3.78,1.25+i*.056,5.48,'#0c1830');face(.35,.05,3.78,1.25+i*.056,5.591,i%2?'thing-spine':'bttf-spine',0,'#ffffff',true);}
 offset.set(0,0,0);
 // Large ticket identity and small original, readable store signs.
 face(3.13,1.43,3.5,3.10,1.70,'logo');box(.035,.31,.035,2.53,3.83,1.70,'#242d35');box(.035,.31,.035,4.47,3.83,1.70,'#242d35');
 face(1.25,.80,7.86,1.98,6.9,'rental-policy',-Math.PI/2);
 // Ceiling-mounted CRT. Its front screen plane is also the DOM player anchor.
 const [tx,ty,tz]=STORE_TV.position;
 box(1.88,1.48,.92,tx,ty,tz-.49,'#20252d');box(1.81,1.40,.075,tx,ty,tz-.025,'#343d44');box(1.64,1.25,.035,tx,ty,tz+.018,'#0c131b');
 face(STORE_TV.width,STORE_TV.height,tx,ty,tz+.04,'tv-standby');
 box(.055,.38,.055,tx-.69,3.69,tz-.45,'#202a32');box(.055,.38,.055,tx+.69,3.69,tz-.45,'#202a32');box(1.92,.055,.98,tx,ty-.772,tz-.44,'#141c23');
 for(let i=0;i<8;i++)box(.012,.075,.005,tx+.59+i*.024,ty-.646,tz+.018,'#0a141c');box(.025,.013,.006,tx+.82,ty-.65,tz+.03,'#5ba96c','light');
 for(const [key,b] of batches){if(!b.positions.length)continue;
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(b.positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(b.normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(b.uvs,2));geometry.setAttribute('color',new T.Float32BufferAttribute(b.colors,3));geometry.computeBoundingSphere();
  const mesh=new T.Mesh(geometry,b.mat);mesh.name='Video store · '+key;root.add(mesh);
 }
 root.userData={caseCount,sourceFiles,indoor:true};
 materials[0].addEventListener('dispose',()=>{if(disposed)return;disposed=true;for(const texture of textures)texture.dispose();});
 return {root,palette:STORE_PALETTE,dome:null,
  setRain(){},setSky(sky){for(const m of materials)m.uniforms.daylight.value=sky.daylight;},update(){},
  screenCorners(){const [x,y,z]=STORE_TV.position,w=STORE_TV.width/2,h=STORE_TV.height/2;return [[x-w,y+h,z+.044],[x+w,y+h,z+.044],[x+w,y-h,z+.044],[x-w,y-h,z+.044]];}
 };
}
