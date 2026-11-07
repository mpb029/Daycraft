import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,forToday,isScheduled,completeTask,validateState,undoCompletion,earned,build} from '../domain.mjs';
import {normaliseDrive,prioritise,workload,focusSeconds,mayPrompt,parseTaskList} from '../productivity.mjs';
const day='2026-11-09',now=new Date('2026-11-09T03:00:00Z'); // 13:00 Brisbane
const task=(id,extra={})=>({id,title:'Deliver '+id,area:'work',step:'Review the record',doneMeans:'Checked and issued',reason:'',minutes:30,repeat:'none',weekday:1,planned:day,due:'',blocked:'',blockAction:'',followUp:'',createdAt:'2026-11-08T00:00:00Z',priority:3,mustDo:false,...extra});
test('A full workload stays scheduled; one-off work carries forward while off-day routines do not pile up',()=>{
 const s=initialState();s.tasks=Array.from({length:25},(_,i)=>task('t'+i));assert.equal(forToday(s,day).length,25);
 s.tasks=[task('carried',{planned:'2026-11-06'}),task('late',{planned:'',due:'2026-11-08'}),task('future',{planned:'2026-11-10'}),task('offday',{repeat:'weekly',weekday:2,planned:'2026-11-03'}),task('backlog',{planned:''})];
 assert.deepEqual(forToday(s,day).map(t=>t.id),['late','carried']);assert.equal(isScheduled(s.tasks[4],day),false);
 completeTask(s,'carried',day);assert.deepEqual(forToday(s,'2026-11-10').map(t=>t.id),['late','offday','future']);
});
test('Deadline risk, must-do status and priority determine the next unblocked result',()=>{
 const list=[task('normal'),task('critical',{priority:1}),task('must',{mustDo:true}),task('today',{due:day}),task('late',{due:'2026-11-08'}),task('blocked',{due:'2026-11-01',blocked:'Approval'})];
 assert.deepEqual(prioritise(list,day).map(t=>t.id),['late','today','must','critical','normal','blocked']);assert.equal(list[0].id,'normal');
});
test('A blocker follow-up appears on its due day even when the task was planned for later',()=>{
 const s=initialState();s.tasks=[task('waiting',{planned:'2026-11-20',blocked:'Waiting for approval',blockAction:'Call reviewer',followUp:day})];
 assert.equal(forToday(s,'2026-11-08').length,0);assert.equal(forToday(s,day).length,1);
 const w=workload(s,day,forToday(s,day),now);assert.equal(w.followUps.length,1);assert.equal(w.ready.length,0);
});
test('Reward cap is removed, completed effort is snapshotted, and reload/undo preserve the new ledger',()=>{
 const s=initialState();s.tasks=Array.from({length:12},(_,i)=>task('t'+i));for(const t of s.tasks)completeTask(s,t.id,day);
 s.tasks[0].minutes=240;assert.equal(s.completions[0].estimatedMinutes,30);
 const r=validateState(JSON.parse(JSON.stringify(s)));assert.equal(earned(r),12);assert.equal(r.completions.reduce((n,c)=>n+c.estimatedMinutes,0),360);
 undoCompletion(r,r.completions[4].id);assert.equal(earned(r),11);assert.equal(forToday(r,day).length,1);
});
test('Legacy saves keep earned buildings, old capped credits and task data during migration',()=>{
 const s=initialState();s.version=2;delete s.settings.drive;s.tasks=Array.from({length:5},(_,i)=>task('t'+i));
 for(const [i,t] of s.tasks.entries()){const c=completeTask(s,t.id,day,`2026-11-09T0${i}:00:00Z`);delete c.rewardRule;delete c.estimatedMinutes;c.credit=i<3;}
 build(s,'garden');const r=validateState(s);assert.equal(r.version,3);assert.equal(earned(r),3);assert.deepEqual(r.builds,s.builds);assert.equal(r.tasks.length,5);assert.equal(r.settings.drive.targetMinutes,480);assert.equal(r.completions[4].estimatedMinutes,0);
 r.tasks.push(task('new'));completeTask(r,'new',day);assert.equal(earned(r),4);undoCompletion(r,r.completions[0].id);assert.equal(earned(r),4);assert.equal(r.completions.find(c=>c.taskId==='t3').credit,true);assert.equal(r.completions.find(c=>c.taskId==='new').credit,true);
 assert.deepEqual(validateState(JSON.parse(JSON.stringify(r))),r);
});
test('Workload uses local hours and honest estimates; hitting the target does not clear the remaining queue',()=>{
 const s=initialState();s.tasks=[task('a',{minutes:120}),task('b',{minutes:120}),task('c',{minutes:120}),task('d',{minutes:120}),task('e',{mustDo:true,minutes:60})];
 for(const id of ['a','b','c','d'])completeTask(s,id,day);
 const w=workload(s,day,forToday(s,day),now);assert.equal(w.completedMinutes,480);assert.equal(w.targetMet,true);assert.equal(w.pending.length,1);assert.equal(w.mustDo.length,1);assert.equal(w.availableMinutes,240);assert.equal(w.expectedMinutes,267);
 const end=workload(s,day,forToday(s,day),new Date('2026-11-09T09:00:00Z'));assert.equal(end.afterDay,true);assert.equal(end.availableMinutes,0);assert.equal(end.overloaded,true);
});
test('Focus duration follows the configured block and short jobs; invalid settings cannot break pacing',()=>{
 const s=initialState();assert.equal(focusSeconds(s,task('long',{minutes:120})),1500);assert.equal(focusSeconds(s,task('call',{minutes:5})),300);
 s.settings.drive.focusMinutes=45;assert.equal(focusSeconds(s,task('long',{minutes:120})),2700);
 const cfg=normaliseDrive({startMinutes:1380,targetMinutes:Infinity,focusMinutes:-50});assert.equal(cfg.endMinutes,1410);assert.equal(cfg.targetMinutes,480);assert.equal(cfg.focusMinutes,5);
});
test('Accountability prompts respect the configured window, active focus, open forms and visibility',()=>{
 const s=initialState(),summary=workload(s,day,[task('a')],now),base={now:now.getTime(),lastPrompt:now.getTime()-600001,hidden:false,dialogOpen:false,focus:null,summary};assert.equal(mayPrompt(base),true);
 for(const change of [{hidden:true},{dialogOpen:true},{focus:{taskId:'a'}},{lastPrompt:now.getTime()-30000},{summary:{...summary,inDay:false}},{summary:{...summary,ready:[]}},{summary:{...summary,cfg:{...summary.cfg,nudgeMinutes:0}}}])assert.equal(mayPrompt({...base,...change}),false);
});
test('Bulk capture accepts realistic lists and rejects oversized or empty submissions',()=>{
 assert.deepEqual(parseTaskList('1. Confirm dispatch\n- Submit variation\n\n• Review test results'),['Confirm dispatch','Submit variation','Review test results']);
 assert.equal(parseTaskList(Array.from({length:30},(_,i)=>'Task '+i).join('\n')).length,30);
 assert.throws(()=>parseTaskList('   '));assert.throws(()=>parseTaskList('x'.repeat(181)));assert.throws(()=>parseTaskList(Array(101).fill('task').join('\n')));
});
