import {TRAILERS,nextTrailer} from './video-store-catalog.mjs';
const safely=fn=>{try{Promise.resolve(fn()).catch(()=>{});}catch{}};

// Playback state is independent of app rerenders, camera moves and Space.
// An old player's delayed callbacks cannot advance or restart a newer trailer.
export function createTrailerReel({ensureProvider,createPlayer,onChange=()=>{},hidden=()=>false}){
 let index=0,generation=0,player=null,active=false,wanted=false,sound=false,failed=false,status='Press Play trailers to switch on the TV.';
 const snapshot=()=>({index,item:TRAILERS[index],active,wanted,sound,failed,status});
 const notify=message=>{status=message;onChange(snapshot());};
 const pauseAdapter=()=>{if(player)safely(()=>player.pause());};
 function destroy(){++generation;if(player){safely(()=>player.pause());safely(()=>player.destroy());}player=null;}
 function error(message,token){if(token!==generation)return;failed=true;wanted=false;pauseAdapter();notify(message+' Use Next trailer or the source link.');}
 async function load(i){
  if(!active)return;destroy();index=(i+TRAILERS.length)%TRAILERS.length;const token=generation;wanted=true;failed=false;notify('Loading '+TRAILERS[index].title+'…');
  try{
   await ensureProvider(TRAILERS[index].provider);if(token!==generation||!active)return;
   player=createPlayer(TRAILERS[index],{
    ready(){if(token!==generation||!player)return;safely(()=>player.audio(sound));if(wanted&&!hidden())safely(()=>player.play());},
    playing(){if(token!==generation)return;if(!wanted||!active||hidden()){pauseAdapter();return;}notify('Playing '+TRAILERS[index].title+' · '+(sound?'sound on':'muted'));},
    paused(){if(token===generation&&active&&wanted&&!hidden()){wanted=false;notify('Paused · '+TRAILERS[index].title);}},
    ended(){if(token===generation&&wanted&&active&&!hidden())void load(nextTrailer(index));},
    blocked(){if(token===generation)notify('Press Play trailers again, or use the TV player’s play button.');},
    error(message){error(message,token);}
   });
  }catch(e){error(e.message||'The trailer could not load.',token);}
 }
 return {
  get snapshot(){return snapshot();},
  setActive(value){if(active===value)return;active=value;if(!active){wanted=false;destroy();notify('TV off.');}else notify('Press Play trailers to switch on the TV.');},
  play(){if(!active)return;if(!player||failed){void load(index);return;}wanted=true;notify('Starting '+TRAILERS[index].title+'…');if(!hidden())safely(()=>player.play());},
  pause(){wanted=false;pauseAdapter();notify('Paused · '+TRAILERS[index].title);},
  next(){return load(nextTrailer(index));},
  toggleSound(){sound=!sound;if(player)safely(()=>player.audio(sound));if(status.startsWith('Playing '))notify('Playing '+TRAILERS[index].title+' · '+(sound?'sound on':'muted'));else onChange(snapshot());},
  visibilityChanged(){if(hidden()){pauseAdapter();if(wanted)notify('Paused while this tab is hidden.');}else if(active&&wanted){if(player)safely(()=>player.play());}},
  dispose(){active=false;wanted=false;destroy();}
 };
}

// Perspective projection for a 640x480 embedded player on the 3D CRT screen.
export function screenHomography(q,width=640,height=480){
 if(q.length!==4||q.some(p=>p.some(n=>!Number.isFinite(n))))return null;
 const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dy1=y1-y2,dy2=y3-y2,sx=x0-x1+x2-x3,sy=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
 if(Math.abs(den)<1e-6)return null;
 const g=(sx*dy2-dx2*sy)/den,h=(dx1*sy-sx*dy1)/den;
 return [(x1-x0+g*x1)/width,(y1-y0+g*y1)/width,0,g/width,(x3-x0+h*x3)/height,(y3-y0+h*y3)/height,0,h/height,0,0,1,0,x0,y0,0,1];
}
