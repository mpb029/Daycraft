// Water uses a stationary, first-person view. Orbiting the meadow's clearing
// would put the eye below the water during a large wave.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function createWaterLook(canvas,{active,draw,initialView={yaw:0,pitch:-.025,fov:58}}){
 let {yaw,pitch,fov}=initialView,pinch=0;const pointers=new Map();
 const distance=()=>{const p=[...pointers.values()];return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;};
 function down(e){if(!active()||e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});pinch=distance();canvas.setPointerCapture?.(e.pointerId);}
 function move(e){if(!active()){pointers.clear();return;}const old=pointers.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){yaw-=dx*.004;pitch=clamp(pitch+dy*.0035,-1.3,1.3);}else{const next=distance();if(pinch>0&&next>0)fov=clamp(fov*pinch/next,35,80);pinch=next;}draw();
 }
 function up(e){pointers.delete(e.pointerId);pinch=distance();}
 function wheel(e){if(!active())return;e.preventDefault();fov=clamp(fov*Math.exp(clamp(e.deltaY,-150,150)*.0015),35,80);draw();}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('wheel',wheel,{passive:false});
 return {
  get view(){return {yaw,pitch,fov};},
  clear(){pointers.clear();pinch=0;},
  setView(next){if(Number.isFinite(next.yaw))yaw=next.yaw;if(Number.isFinite(next.pitch))pitch=clamp(next.pitch,-1.3,1.3);if(Number.isFinite(next.fov))fov=clamp(next.fov,35,80);draw();},
  aim(direction){yaw=Math.atan2(direction[0],-direction[2]);pitch=clamp(Math.asin(clamp(direction[1],-1,1)),-1.3,1.3);draw();},
  action(action){if(['field','reset','wave','stop'].includes(action)){({yaw,pitch,fov}=initialView);}if(action==='sky')pitch=.6;if(action==='left')yaw-=Math.PI/8;if(action==='right')yaw+=Math.PI/8;if(action==='in')fov=clamp(fov*.85,35,80);if(action==='out')fov=clamp(fov/ .85,35,80);draw();}
 };
}
