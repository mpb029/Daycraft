export const AREAS = {work:{name:'Work',color:'#b67747',icon:'briefcase'},health:{name:'Health',color:'#6a885b',icon:'leaf'},life:{name:'Life',color:'#7c83a6',icon:'sun'}};
import {CATALOG,ITEMS,itemFor,collectionComplete,placementError,findOpenSpot,THEMES,ISLAND_COST} from './world-rules.mjs';
import {normaliseSkyLocation} from './sky-location.mjs';
import {normaliseBackground} from './backgrounds.mjs';
export {CATALOG} from './world-rules.mjs';
export const uid = () => globalThis.crypto?.randomUUID?.() || 'id-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
export function dateKey(now=new Date(),zone='Australia/Brisbane') { const p=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(t=>p.find(x=>x.type===t).value).join('-'); }
export function dayOfWeek(day){return new Date(day+'T12:00:00Z').getUTCDay();}
export function shiftDate(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function initialState(){return {version:2,islands:[{id:'outlook',name:'The Meadow',theme:'meadow',order:0,at:'2026-01-01T00:00:00.000Z'}],createdAt:new Date().toISOString(),settings:{name:'Marty',worldName:'The Meadow',zone:'Australia/Brisbane',calm:false,easy:false,breeze:true,rain:false,skyLocation:normaliseSkyLocation(),background:'meadow',waterRide:true},tasks:[],completions:[],starts:[],builds:[],reviews:[],focus:null};}
export function isDone(s,t,day){return s.completions.some(c=>c.taskId===t.id&&(t.repeat==='none'||c.day===day));}
export function isScheduled(t,day){return t.repeat==='daily'||(t.repeat==='weekdays'&&![0,6].includes(dayOfWeek(day)))||(t.repeat==='weekly'&&dayOfWeek(day)===t.weekday)||t.planned===day||t.due===day;}
export function forToday(s,day){return s.tasks.filter(t=>!isDone(s,t,day)&&isScheduled(t,day));}
export function earned(s){return s.completions.reduce((n,c)=>n+(c.credit?1:0),0);}
export function spent(s){return s.builds.reduce((n,b)=>n+(itemFor(b.id)?.cost||0),0)+Math.max(0,s.islands.length-1)*ISLAND_COST;}
export function balance(s){return Math.max(0,earned(s)-spent(s));}
export function completeTask(s,id,day,now=new Date().toISOString()){
 const t=s.tasks.find(t=>t.id===id); if(!t)throw Error('This task is no longer available.');
 if(t.blocked)throw Error('Clear the blocker before completing this task.');
 if(isDone(s,t,day))throw Error('This task is already completed.');
 const credit=s.completions.filter(c=>c.day===day&&c.credit).length<3;
 const event={id:uid(),taskId:id,day,at:now,title:t.title,area:t.area,doneMeans:t.doneMeans,credit};
 s.completions.push(event);if(s.focus?.taskId===id)s.focus=null;return event;
}
function nextOrder(s){return Math.max(0,...s.builds.map(b=>b.order||0),...s.islands.map(i=>i.order||0))+1;}
function reconcileSpending(s){const removed=[];while(spent(s)>earned(s)){
 const b=s.builds.at(-1),i=s.islands.length>1?s.islands.at(-1):null;
 if(i&&(!b||i.order>b.order)){s.islands.pop();for(const x of s.builds)if(x.placement?.islandId===i.id)x.placement=null;removed.push('island');}
 else if(b)removed.push(s.builds.pop().id);else break;
}return removed;}
export function undoCompletion(s,id){const e=s.completions.find(c=>c.id===id);if(!e)return [];s.completions=s.completions.filter(c=>c.id!==id);s.completions.filter(c=>c.day===e.day).sort((a,b)=>a.at.localeCompare(b.at)).forEach((c,i)=>{c.credit=i<3;});return reconcileSpending(s);}
export function build(s,id,now=new Date().toISOString()) {
 const b=itemFor(id);if(!b)throw Error('Choose an available item.');
 if(b.decor&&!collectionComplete(s))throw Error('Collect the twelve original places to open the decoration collection.');
 if(balance(s)<b.cost)throw Error('A few more completed actions will get you there.');
 if(s.builds.length>=5000)throw Error('This save has reached its 5,000-item capacity. You can still rearrange everything you own.');
 const instance={id,instanceId:uid(),at:now,order:nextOrder(s),placement:null};s.builds.push(instance);return {...b,instanceId:instance.instanceId};
}
export function placeItem(s,instanceId,placement){const error=placementError(s,instanceId,placement);if(error)throw Error(error);s.builds.find(b=>b.instanceId===instanceId).placement={...placement};}
export function storeItem(s,instanceId){const b=s.builds.find(x=>x.instanceId===instanceId);if(!b)throw Error('This item is no longer available.');b.placement=null;}
export function addIsland(s,name,theme='meadow',now=new Date().toISOString()){
 if(!collectionComplete(s))throw Error('Collect the twelve original places to open another meadow.');
 if(!Object.hasOwn(THEMES,theme))throw Error('Choose an available landscape.');
 if(balance(s)<ISLAND_COST)throw Error('A new meadow uses eight materials.');
 if(s.islands.length>=200)throw Error('This save has reached its 200-meadow capacity. Your existing places stay yours.');
 const island={id:uid(),name:String(name||'Meadow '+(s.islands.length+1)).trim().slice(0,50)||'New meadow',theme,at:now,order:nextOrder(s)};s.islands.push(island);return island;
}
export function logStart(s,id,day,now=new Date().toISOString()){if(!s.starts.some(x=>x.taskId===id&&x.day===day))s.starts.push({taskId:id,day,at:now});}
const clean=(v,max=500)=>typeof v==='string'?v.slice(0,max):'';
const validDay=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const validTime=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validateState(raw){
 if(!raw||![1,2].includes(raw.version)||!Array.isArray(raw.tasks)||!Array.isArray(raw.completions)||!Array.isArray(raw.builds))throw Error('That file is not a supported Daycraft backup.');
 if(raw.tasks.length>10000||raw.completions.length>100000||raw.builds.length>5000||(raw.islands?.length||0)>200)throw Error('This backup is too large.');
 const s=initialState(),cfg=raw.settings||{};s.createdAt=validTime(raw.createdAt)?raw.createdAt:s.createdAt;
 let zone=clean(cfg.zone,80)||'Australia/Brisbane';try{new Intl.DateTimeFormat('en',{timeZone:zone});}catch{zone='Australia/Brisbane';}
 s.settings={name:clean(cfg.name,40)||'Marty',worldName:cfg.worldName==='The Outlook'?'The Meadow':clean(cfg.worldName,50)||'The Meadow',zone,calm:!!cfg.calm,easy:!!cfg.easy,breeze:cfg.breeze!==false,rain:cfg.rain===true,skyLocation:normaliseSkyLocation(cfg.skyLocation),background:normaliseBackground(cfg.background),waterRide:cfg.waterRide!==false};
 const ids=new Set();s.tasks=raw.tasks.map(t=>{if(!t||!clean(t.id,100)||t.id.length>100||ids.has(t.id)||!clean(t.title,180))throw Error('A task in this backup is invalid.');ids.add(t.id);return {id:clean(t.id,100),title:clean(t.title,180),area:Object.hasOwn(AREAS,t.area)?t.area:'life',step:clean(t.step,250),doneMeans:clean(t.doneMeans,400),reason:clean(t.reason,250),minutes:Math.min(240,Math.max(1,Number(t.minutes)||15)),repeat:['none','daily','weekdays','weekly'].includes(t.repeat)?t.repeat:'none',weekday:Number.isInteger(t.weekday)&&t.weekday>=0&&t.weekday<=6?t.weekday:1,planned:validDay(t.planned)?t.planned:'',due:validDay(t.due)?t.due:'',blocked:clean(t.blocked,250),createdAt:validTime(t.createdAt)?t.createdAt:s.createdAt};});
 const eventIds=new Set(),taskDays=new Set(),perDay={};s.completions=raw.completions.map(c=>{if(!c||!clean(c.id,100)||c.id.length>100||eventIds.has(c.id)||!clean(c.taskId,100)||c.taskId.length>100||!validDay(c.day)||!validTime(c.at))throw Error('A completion record in this backup is invalid.');const key=c.taskId+'|'+c.day;if(taskDays.has(key))throw Error('This backup contains duplicate completions.');taskDays.add(key);eventIds.add(c.id);let credit=!!c.credit&&(perDay[c.day]||0)<3;if(credit)perDay[c.day]=(perDay[c.day]||0)+1;return {id:clean(c.id,100),taskId:clean(c.taskId,100),day:c.day,at:c.at,title:clean(c.title,180),area:Object.hasOwn(AREAS,c.area)?c.area:'life',doneMeans:clean(c.doneMeans,400),credit};});
 for(const t of s.tasks){if(t.repeat==='none'&&s.completions.filter(c=>c.taskId===t.id).length>1)throw Error('A one-off task has more than one completion.');}
 // Stable migration IDs keep server/device copies identical when upgrading v1 backups.
 const islandIds=new Set(['outlook']);
 s.islands=[{id:'outlook',name:'The Meadow',theme:'meadow',order:0,at:'2026-01-01T00:00:00.000Z'}];
 if(raw.version===2){for(const [index,i] of (Array.isArray(raw.islands)?raw.islands:[]).entries()){
  if(!i||i.id==='outlook')continue;if(!clean(i.id,100)||i.id.length>100||islandIds.has(i.id))throw Error('An island in this backup is invalid.');islandIds.add(i.id);
  s.islands.push({id:i.id,name:clean(i.name,50)||'New meadow',theme:Object.hasOwn(THEMES,i.theme)?i.theme:'meadow',order:Number.isSafeInteger(i.order)&&i.order>0?i.order:index+1,at:validTime(i.at)?i.at:s.createdAt});
 }}
 const instanceIds=new Set(),legacyTypes=new Set();
 for(const [index,b] of raw.builds.entries()){
  if(!b||!itemFor(b.id))continue;if(raw.version===1&&legacyTypes.has(b.id))continue;legacyTypes.add(b.id);
  const instanceId=raw.version===1?'legacy-'+b.id:clean(b.instanceId,100);
  if(!instanceId||instanceIds.has(instanceId))throw Error('An item in this backup has an invalid or duplicate identity.');instanceIds.add(instanceId);
  s.builds.push({id:b.id,instanceId,at:validTime(b.at)?b.at:s.createdAt,order:Number.isSafeInteger(b.order)&&b.order>0?b.order:index+1,placement:null});
 }
 s.builds.sort((a,b)=>a.order-b.order);s.islands.sort((a,b)=>a.order-b.order);
 if(raw.version===1){for(const b of s.builds)b.placement=findOpenSpot(s,b.instanceId,'outlook');}
 else {for(const b of s.builds){const original=raw.builds.find(x=>x?.instanceId===b.instanceId);if(original?.placement){const p=original.placement;const spot={islandId:clean(p.islandId,100),x:p.x,z:p.z,rotation:p.rotation};if(!placementError(s,b.instanceId,spot))b.placement=spot;}}}
 reconcileSpending(s);
 s.starts=(Array.isArray(raw.starts)?raw.starts:[]).filter(x=>x&&validDay(x.day)&&typeof x.taskId==='string').slice(-100000).map(x=>({taskId:clean(x.taskId,100),day:x.day,at:validTime(x.at)?x.at:s.createdAt}));
 s.reviews=(Array.isArray(raw.reviews)?raw.reviews:[]).filter(x=>x&&validDay(x.day)&&['easier','same','harder'].includes(x.feeling)&&['okay','too-much'].includes(x.pressure)).slice(-1000).map(x=>({day:x.day,feeling:x.feeling,pressure:x.pressure,note:clean(x.note,500)}));
 const f=raw.focus;if(f&&s.tasks.some(t=>t.id===f.taskId)&&Number.isFinite(f.end)&&Number.isFinite(f.remaining)&&f.remaining>=0&&f.remaining<=14400)s.focus={taskId:f.taskId,end:f.end,remaining:f.remaining,paused:!!f.paused,duration:Math.min(14400,Math.max(120,Number(f.duration)||120))};
 return s;
}
