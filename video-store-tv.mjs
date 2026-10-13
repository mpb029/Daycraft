import * as T from './vendor/three.module.js';
import {TRAILERS,FILM_CATALOG} from './video-store-catalog.mjs';
import {createTrailerReel,screenHomography} from './video-store-reel.mjs';
let reel=null,layer=null,screen=null,youtubePromise=null,vimeoPromise=null,active=false;
const loaderTimeout=20000;
function ensureYouTube(){
 if(globalThis.YT?.Player)return Promise.resolve();if(youtubePromise)return youtubePromise;
 youtubePromise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('YouTube did not load. Check your connection.')),loaderTimeout);
  globalThis.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve();};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timer);reject(Error('YouTube could not load.'));};document.head.appendChild(script);
 }).catch(e=>{youtubePromise=null;throw e;});return youtubePromise;
}
function ensureVimeo(){
 if(globalThis.Vimeo?.Player)return Promise.resolve();if(vimeoPromise)return vimeoPromise;
 vimeoPromise=new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Vimeo did not load. Check your connection.')),loaderTimeout);
  const script=document.createElement('script');script.src='https://player.vimeo.com/api/player.js';script.onload=()=>{clearTimeout(timer);resolve();};script.onerror=()=>{clearTimeout(timer);reject(Error('Vimeo could not load.'));};document.head.appendChild(script);
 }).catch(e=>{vimeoPromise=null;throw e;});return vimeoPromise;
}
function createPlayer(item,events){
 screen.replaceChildren();const mount=document.createElement('div');screen.appendChild(mount);
 if(item.provider==='youtube'){
  let ready=false;
  const p=new globalThis.YT.Player(mount,{width:640,height:480,videoId:item.id,host:'https://www.youtube.com',playerVars:{autoplay:0,playsinline:1,controls:1,rel:0,origin:location.origin},events:{
   onReady:e=>{ready=true;e.target.mute();events.ready();},
   onStateChange:e=>{if(e.data===1)events.playing();if(e.data===2)events.paused();if(e.data===0)events.ended();},onAutoplayBlocked:events.blocked,
   onError:e=>events.error(({100:'This trailer is unavailable.',101:'This trailer cannot be embedded.',150:'This trailer cannot be embedded.',153:'Open Daycraft from its website URL to play trailers.'})[e.data]||'YouTube reported a playback error.')
  }});
  return {play(){if(ready)p.playVideo();},pause(){if(ready)p.pauseVideo();},audio(on){if(!ready)return;if(on){p.unMute();p.setVolume(25);}else p.mute();},destroy(){p.destroy();mount.remove();}};
 }
 const p=new globalThis.Vimeo.Player(mount,{id:item.id,width:640,height:480,autoplay:false,autopause:false,muted:true,loop:false,controls:true,dnt:true,playsinline:true});
 p.on('playing',events.playing);p.on('pause',events.paused);p.on('ended',events.ended);p.on('error',()=>events.error('Vimeo could not play this trailer here.'));
 p.ready().then(events.ready).catch(()=>events.error('Vimeo could not load this trailer.'));
 return {play:()=>p.play().catch(events.blocked),pause:()=>p.pause(),audio:async on=>{await p.setMuted(!on);if(on)await p.setVolume(.25);},destroy:()=>p.destroy().finally(()=>mount.remove())};
}
function ensureReel(){
 if(reel)return reel;
 layer=document.createElement('div');layer.id='store-tv-layer';layer.hidden=true;layer.setAttribute('aria-label','Video store television');
 screen=document.createElement('div');screen.className='store-tv-screen';layer.appendChild(screen);document.body.appendChild(layer);
 reel=createTrailerReel({ensureProvider:p=>p==='youtube'?ensureYouTube():ensureVimeo(),createPlayer,onChange:()=>{refreshTrailerControls();window.dispatchEvent(new Event('daycraft:tv-changed'));},hidden:()=>document.hidden});
 document.addEventListener('visibilitychange',()=>reel.visibilityChanged());window.addEventListener('pagehide',()=>reel.dispose());
 return reel;
}
export function setStoreTVActive(value){
 active=!!value;if(value)ensureReel().setActive(true);else if(reel)reel.setActive(false);
 if(layer&&!active)layer.hidden=true;
}
export function trailerAction(action){
 if(!active)return;const r=ensureReel();({play:()=>r.play(),pause:()=>r.pause(),next:()=>r.next(),sound:()=>r.toggleSound()})[action]?.();
}
export function refreshTrailerControls(){
 const s=reel?.snapshot||{index:0,sound:false,status:'Press Play trailers to switch on the TV.'},item=TRAILERS[s.index];
 const status=document.querySelector('#trailer-status'),link=document.querySelector('#trailer-source'),sound=document.querySelector('[data-action="store-sound"]');
 if(status)status.textContent=s.status;if(link){link.href=item.url;link.textContent='Open '+item.title+' source';}
 if(sound){sound.textContent=s.sound?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(s.sound));}
}
const local=new T.Vector3(),projected=new T.Vector3(),ray=new T.Raycaster(),direction=new T.Vector3(),target=new T.Vector3();
export function positionStoreTV(camera,corners,root,width,height){
 if(!active||!layer||!screen)return;
 camera.updateMatrixWorld();
 if(!screen.children.length){layer.hidden=true;return;}
 // The screen faces +Z. Don't mirror it through the back of the cabinet.
 if(camera.position.z<=corners[0][2]){layer.hidden=true;return;}
 const quad=[];
 for(const p of corners){local.fromArray(p).applyMatrix4(camera.matrixWorldInverse);if(local.z>-.11){layer.hidden=true;return;}projected.fromArray(p).project(camera);quad.push([(projected.x+1)*width/2,(1-projected.y)*height/2]);}
 if(quad.every(p=>p[0]<0)||quad.every(p=>p[0]>width)||quad.every(p=>p[1]<0)||quad.every(p=>p[1]>height)){layer.hidden=true;return;}
 // Hide when shelves/counter obscure the centre; never float through a wall.
 target.fromArray(corners[0]).add(new T.Vector3(...corners[2])).multiplyScalar(.5);direction.copy(target).sub(camera.position);const distance=direction.length();ray.set(camera.position,direction.normalize());ray.near=.1;ray.far=distance-.025;root.updateMatrixWorld(true);
 if(ray.intersectObjects(root.userData.tvOccluders||root.children,true).length){layer.hidden=true;return;}
 const matrix=screenHomography(quad);layer.hidden=!matrix;if(matrix)screen.style.transform='matrix3d('+matrix.join(',')+')';
}
export function vhsInspectorHTML(escape){
 return `<p>36 films from the 80s and 90s. Choose one to inspect its original VHS scans and theatrical poster.</p><div class="film-library">${FILM_CATALOG.map(t=>`<button class="film-card" data-action="store-film" data-film="${escape(t.id)}"><img loading="lazy" src="./${t.front||t.poster}" alt=""><strong>${escape(t.title)}</strong><span>${t.year} · ${escape(t.director)}</span></button>`).join('')}</div>`;
}
export function vhsFilmHTML(id,escape){
 const t=FILM_CATALOG.find(t=>t.id===id);if(!t)return '';
 const edition=t.edition?Object.values(t.edition).join(' · '):'',images=[['front',t.fullResolutionFront||t.front,'Original VHS front'],['spine',t.fullResolutionSpine||t.spine,'Original VHS spine'],['poster',t.poster,'Theatrical poster']].filter(([,src])=>src);
 return `<p>${escape(t.title)} (${t.year}) · Directed by ${escape(t.director)}</p><p class="small-text">${escape(edition||'Theatrical poster art with an After Hours title label on the shelf.')} ${t.front||t.spine?'Original collector scans; wear and watermarks are retained.':''}</p><div class="vhs-scan-pair">${images.map(([kind,src,label])=>`<a class="vhs-${kind}" href="${escape(src.startsWith('http')?src:'./'+src)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" src="${escape(src.startsWith('http')?src:'./'+src)}" alt="${escape(t.title+' · '+label)}"><span>${label}</span></a>`).join('')}</div><p class="small-text">Full-size scans load from the archive when you open a film and need an internet connection.</p><a href="${escape(t.sourceUrls[0])}" target="_blank" rel="noopener noreferrer">Artwork source and edition details</a><div class="dialog-actions"><button class="btn" data-action="store-inspect">Back to films</button><button class="btn" data-action="close">Close</button></div>`;
}
