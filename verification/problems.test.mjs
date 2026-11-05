import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validateState,completeTask,undoCompletion,earned} from '../domain.mjs';
import {saveFrame,saveReasoning,addCheck,recordFinding,planCheck,checkTaskState,resolveProblem,reopenProblem,linkForTask} from '../problems.mjs';
const day='2026-11-05', at='2026-11-05T00:00:00Z';
const fields={observed:'The last two deliveries arrived after the crew.',goal:'Fittings are ready when the crew arrives.',area:'work'};
function started(){const state=initialState(),p=saveFrame(state,'case-1',fields,at);return [state,p];}
test('Older backups open with an empty notebook; framing alone changes neither the task list nor the world',()=>{
  const old=initialState();delete old.problems;old.settings.background='poolrooms';
  for(const v of [1,2]){const upgraded=validateState({...old,version:v});assert.deepEqual(upgraded.problems,[]);assert.equal(upgraded.settings.background,'poolrooms');}
  const [s,p]=started();const baseline=initialState();assert.deepEqual(s.tasks,baseline.tasks);assert.deepEqual(s.builds,baseline.builds);assert.equal(earned(s),0);
  assert.throws(()=>saveFrame(s,p.id,{...fields,goal:'   '}));assert.equal(p.goal,fields.goal);
  assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))).problems,s.problems);
});
test('A check can be inconclusive, revisited or ruled out; evidence and the original prediction survive a revised explanation',()=>{
  const [s,p]=started();saveReasoning(p,{evidence:'Dispatch slips both show Tuesday.',idea:'Orders were sent late.',alternative:'Orders waited after receipt.'},at);
  const one=addCheck(p,'a',{action:'Compare order timestamps.',prediction:'The late deliveries also had late orders.'},at);
  assert.throws(()=>addCheck(p,'another',{action:'Duplicate open check.'},at));
  assert.throws(()=>recordFinding(p,one.id,{finding:'   '},at));assert.equal(one.finding,'');
  recordFinding(p,one.id,{finding:'Orders were in before cutoff.',verdict:'challenges'},at);
  saveReasoning(p,{evidence:'Orders were in before cutoff.',idea:'Dispatch was queued.'},at);
  const two=addCheck(p,'b',{action:'Compare dispatch times.'},at);
  recordFinding(p,two.id,{finding:'One ticket was missing.',verdict:'unclear'},at);
  assert.equal(one.idea,'Orders were sent late.');assert.equal(one.alternative,'Orders waited after receipt.');assert.equal(one.prediction,'The late deliveries also had late orders.');assert.equal(one.verdict,'challenges');
  assert.equal(p.status,'open');assert.equal(earned(s),0);
  assert.throws(()=>resolveProblem(p,{proof:'   '},at));resolveProblem(p,{proof:'The next three starters had all fittings.',keep:'Confirm dispatch the afternoon before.'},at);
  assert.throws(()=>addCheck(p,'c',{action:'After closure'},at));reopenProblem(p,at);
  assert.equal(p.resolutions.length,1);assert.equal(p.checks.length,2);assert.deepEqual(validateState(s).problems,s.problems);
});
test('Scheduling a check is idempotent and uses regular task credit; completing or undoing it never solves the problem',()=>{
  const [s,p]=started(),c=addCheck(p,'one',{action:'Look at the dispatch docket.'},at);
  let n=0;const id=()=>String(++n);
  assert.equal(planCheck(s,p,c.id,day,id,at),'1');assert.equal(planCheck(s,p,c.id,day,id,at),'1');assert.equal(s.tasks.length,1);
  assert.equal(checkTaskState(s,c,day),'today');assert.equal(linkForTask(s,'1').problem,p);
  s.tasks[0].planned='';assert.equal(checkTaskState(s,c,day),'task');planCheck(s,p,c.id,day,id,at);assert.equal(s.tasks.length,1);
  const completion=completeTask(s,'1',day,at);assert.equal(checkTaskState(s,c,day),'done');assert.equal(p.status,'open');assert.equal(c.finding,'');assert.equal(earned(s),1);
  assert.equal(planCheck(s,p,c.id,day,id,at),'1');assert.equal(n,1);
  const restored=validateState(JSON.parse(JSON.stringify(s)));assert.equal(linkForTask(restored,'1').check.id,'one');
  recordFinding(p,c.id,{finding:'Found the missing dispatch time.'},at);resolveProblem(p,{proof:'Two on-time starts.'},at);
  assert.equal(earned(s),1);undoCompletion(s,completion.id);assert.equal(p.status,'solved');assert.equal(earned(s),0);
  assert.deepEqual(validateState(s).problems,s.problems);
});
test('An accidentally deleted task can be replaced; an already-completed one never earns duplicate credit',()=>{
  const [s,p]=started(),c=addCheck(p,'one',{action:'Compare two dockets.'},at);let n=0;const next=()=>String(++n);
  planCheck(s,p,c.id,day,next,at);s.tasks=[];assert.equal(checkTaskState(s,c,day),'removed');planCheck(s,p,c.id,day,next,at);assert.equal(c.taskId,'2');
  completeTask(s,'2',day,at);s.tasks=[];assert.equal(checkTaskState(s,c,day),'done');planCheck(s,p,c.id,day,next,at);assert.equal(n,2);assert.equal(s.tasks.length,0);
});
test('Import rejects malformed or ambiguous notebooks without mutating the original save',()=>{
  const [s,p]=started(),c=addCheck(p,'one',{action:'Review a record.'},at);planCheck(s,p,c.id,day,()=> 'task',at);
  const before=JSON.stringify(s);
  for(const mutate of [x=>{x.problems=null;},x=>{x.problems[0].observed=' ';},x=>{x.problems[0].checks[0].at='yesterday';},
    x=>{x.problems[0].status='solved';},x=>{x.problems.push({...structuredClone(x.problems[0]),id:'different-case'});},x=>{x.problems[0].checks.push({...x.problems[0].checks[0],id:'two'});}]){const bad=JSON.parse(before);mutate(bad);assert.throws(()=>validateState(bad),/problem notebook/);}
  assert.equal(JSON.stringify(s),before);
});
