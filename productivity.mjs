// Execution rules shared by the workload view, task forms, and saved-state import.
export const PRIORITIES={1:'Critical',2:'High',3:'Normal',4:'Low'};
export const DRIVE_DEFAULTS=Object.freeze({targetMinutes:480,focusMinutes:25,startMinutes:480,endMinutes:1020,nudgeMinutes:10});
const bounded=(value,fallback,low,high)=>Number.isFinite(Number(value))&&value!==''&&value!=null?Math.max(low,Math.min(high,Math.round(Number(value)))):fallback;
export const normalisePriority=value=>bounded(value,3,1,4);
export function normaliseDrive(raw={}){
 const r=raw&&typeof raw==='object'?raw:{};
 const startMinutes=bounded(r.startMinutes,480,0,1380),endMinutes=bounded(r.endMinutes,Math.max(1020,startMinutes+30),startMinutes+30,1440);
 return {targetMinutes:bounded(r.targetMinutes,480,15,1440),focusMinutes:bounded(r.focusMinutes,25,5,120),startMinutes,endMinutes,nudgeMinutes:bounded(r.nudgeMinutes,10,0,60)};
}
export const isOverdue=(t,day)=>t.repeat==='none'&&!!t.due&&t.due<day;
export const isCarried=(t,day)=>t.repeat==='none'&&!!t.planned&&t.planned<day;
export function urgency(t,day){return isOverdue(t,day)?0:t.due===day?1:t.mustDo?2:3;}
export function prioritise(tasks,day){return [...tasks].sort((a,b)=>Number(!!a.blocked)-Number(!!b.blocked)||(a.blocked&&b.blocked?(a.followUp||'9999').localeCompare(b.followUp||'9999'):0)||urgency(a,day)-urgency(b,day)||normalisePriority(a.priority)-normalisePriority(b.priority)||(a.due||'9999').localeCompare(b.due||'9999')||(a.planned||'9999').localeCompare(b.planned||'9999')||(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id));}
export function clockMinutes(now,zone){const p=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);return Number(p.find(x=>x.type==='hour').value)*60+Number(p.find(x=>x.type==='minute').value);}
export function workload(s,day,pending,now=new Date()){
 const cfg=normaliseDrive(s.settings.drive),done=s.completions.filter(c=>c.day===day),completedMinutes=done.reduce((n,c)=>n+(c.estimatedMinutes||0),0),remainingMinutes=pending.reduce((n,t)=>n+(Number(t.minutes)||15),0),minute=clockMinutes(now,s.settings.zone);
 const elapsed=Math.max(0,Math.min(1,(minute-cfg.startMinutes)/(cfg.endMinutes-cfg.startMinutes))),expectedMinutes=Math.round(cfg.targetMinutes*elapsed),gap=Math.max(0,expectedMinutes-completedMinutes),availableMinutes=Math.max(0,cfg.endMinutes-Math.max(cfg.startMinutes,minute));
 return {cfg,done,pending,completedMinutes,remainingMinutes,plannedMinutes:completedMinutes+remainingMinutes,expectedMinutes,gap,availableMinutes,overdue:pending.filter(t=>isOverdue(t,day)),mustDo:pending.filter(t=>t.mustDo),blocked:pending.filter(t=>t.blocked),followUps:pending.filter(t=>t.blocked&&t.followUp&&t.followUp<=day),ready:pending.filter(t=>!t.blocked),beforeDay:minute<cfg.startMinutes,afterDay:minute>=cfg.endMinutes,inDay:minute>=cfg.startMinutes&&minute<cfg.endMinutes,targetMet:completedMinutes>=cfg.targetMinutes,overloaded:remainingMinutes>availableMinutes};
}
export function focusSeconds(s,t){return Math.max(60,Math.min(Number(t.minutes)||25,normaliseDrive(s.settings.drive).focusMinutes)*60);}
export function mayPrompt({now,lastPrompt,hidden,dialogOpen,focus,summary}){return !hidden&&!dialogOpen&&!focus&&summary.inDay&&summary.ready.length>0&&summary.cfg.nudgeMinutes>0&&now-lastPrompt>=summary.cfg.nudgeMinutes*60000;}
export function parseTaskList(text){const lines=String(text||'').split(/\r?\n/).map(x=>x.trim().replace(/^(?:[-*•]\s+|\d+[.)]\s+)/,'')).filter(Boolean);if(!lines.length)throw Error('Enter at least one task.');if(lines.length>100)throw Error('Add up to 100 tasks at a time.');if(lines.some(x=>x.length>180))throw Error('Keep each task title under 180 characters.');return lines;}
export const minutesLabel=value=>value>=60?`${Math.floor(value/60)}h${value%60?' '+value%60+'m':''}`:`${value}m`;
export const timeInput=value=>`${Math.floor(value/60).toString().padStart(2,'0')}:${(value%60).toString().padStart(2,'0')}`;
export function readTime(value){if(typeof value!=='string'||!/^\d{2}:\d{2}$/.test(value))return NaN;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:NaN;}
