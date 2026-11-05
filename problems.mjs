// Problems are investigations. Only the ordinary task completion path awards materials.
export const PROBLEM_LIMITS = Object.freeze({observed:240, goal:320, evidence:600, idea:350, alternative:350, action:180, prediction:350, finding:650, proof:600, keep:350});
export const CHECK_STARTERS = Object.freeze({
  observe:{label:'Observe once', action:'Write down what happens next time, when it happens, and what came just before it.'},
  compare:{label:'Compare two cases', action:'Find one time it went well and one time it went wrong. Write down the first difference.'},
  ask:{label:'Ask someone', action:'Ask someone who saw it: “What did you notice just before it happened?” Write down their answer.'},
  change:{label:'Try one change', action:'Choose one small, reversible change. Try it once and compare the outcome with a usual day.'}
});
export const VERDICTS = Object.freeze({unclear:'Still unclear',supports:'Supports my idea',challenges:'Points elsewhere'});
const MAX_PROBLEMS=2000, MAX_CHECKS=250, MAX_CLOSURES=100;
const now=()=>new Date().toISOString();
const clean=(v,k)=>typeof v==='string'?v.trim().slice(0,PROBLEM_LIMITS[k]):'';
const required=(v,k,msg)=>{const value=clean(v,k);if(!value)throw Error(msg);return value;};
const identity=v=>typeof v==='string'&&v.length>0&&v.length<=100&&v.trim()===v;
// Only ordinary, parseable timestamps are displayed or sorted as dates.
const timestamp=v=>typeof v==='string'&&v.length<=45&&Number.isFinite(Date.parse(v));
const area=v=>['work','health','life'].includes(v)?v:'life';
const checkVerdict=v=>Object.hasOwn(VERDICTS,v)?v:'unclear';
const openOnly=p=>{if(!p||p.status!=='open')throw Error('Reopen this problem before changing its investigation.');};
export function currentCheck(p){return p?.checks.at(-1)?.finding?null:p?.checks.at(-1)||null;}
export function saveFrame(state,id,fields,at=now()){
  const observed=required(fields.observed,'observed','Describe one thing that actually happened.');
  const goal=required(fields.goal,'goal','Describe what you would see if this were going well.');
  const p=state.problems.find(x=>x.id===id);
  if(p){openOnly(p);Object.assign(p,{observed,goal,area:area(fields.area),updatedAt:at});return p;}
  if(state.problems.length>=MAX_PROBLEMS)throw Error('This notebook has reached its problem limit.');
  const fresh={id,observed,goal,area:area(fields.area),evidence:'',idea:'',alternative:'',checks:[],resolutions:[],status:'open',createdAt:at,updatedAt:at};
  state.problems.push(fresh);return fresh;
}
export function saveReasoning(p,fields,at=now()){
  openOnly(p);Object.assign(p,{evidence:clean(fields.evidence,'evidence'),idea:clean(fields.idea,'idea'),alternative:clean(fields.alternative,'alternative'),updatedAt:at});
}
export function addCheck(p,id,fields,at=now()){
  openOnly(p);if(currentCheck(p))throw Error('Record what you found in the current check before starting another.');
  if(p.checks.length>=MAX_CHECKS)throw Error('This problem has reached its check limit.');
  const action=required(fields.action,'action','Choose one thing you can do to learn more.');
  const c={id,action,prediction:clean(fields.prediction,'prediction'),idea:p.idea,alternative:p.alternative,at,taskId:'',finding:'',foundAt:'',verdict:'unclear'};
  p.checks.push(c);p.updatedAt=at;return c;
}
export function editCheck(p,id,fields,at=now()){
  openOnly(p);const c=currentCheck(p);
  if(!c||c.id!==id||c.taskId)throw Error('Only an unplanned, open check can be edited.');
  c.action=required(fields.action,'action','Choose one thing you can do to learn more.');c.prediction=clean(fields.prediction,'prediction');c.idea=p.idea;c.alternative=p.alternative;p.updatedAt=at;
}
export function recordFinding(p,id,fields,at=now()){
  openOnly(p);const c=currentCheck(p);if(!c||c.id!==id)throw Error('That check already has a finding or is no longer open.');
  c.finding=required(fields.finding,'finding','Write what you actually found, even if the result was inconclusive.');
  c.verdict=checkVerdict(fields.verdict);c.foundAt=at;p.updatedAt=at;
}
export function resolveProblem(p,fields,at=now()){
  openOnly(p);if(p.resolutions.length>=MAX_CLOSURES)throw Error('This problem has reached its resolution history limit.');
  p.resolutions.push({proof:required(fields.proof,'proof','What showed you that the outcome you wanted was reached?'),keep:clean(fields.keep,'keep'),at});
  p.status='solved';p.updatedAt=at;
}
export function reopenProblem(p,at=now()){
  if(p?.status!=='solved')return;p.status='open';p.updatedAt=at;
}
export function linkForTask(state,id){
  if(!id)return null;
  for(const problem of state.problems){const check=problem.checks.find(c=>c.taskId===id);if(check)return {problem,check};}
  return null;
}
export function checkTaskState(state,c,day){
  if(!c?.taskId)return 'none';
  if(state.completions.some(x=>x.taskId===c.taskId))return 'done';
  const t=state.tasks.find(x=>x.id===c.taskId);
  return !t?'removed':t.planned===day?'today':'task';
}
export function planCheck(state,p,id,day,makeId,at=now()){
  openOnly(p);const c=currentCheck(p);
  if(!c||c.id!==id)throw Error('Only the current check can be added to Today.');
  const status=checkTaskState(state,c,day);
  if(status==='done'||status==='today')return c.taskId;
  if(status==='task'){state.tasks.find(t=>t.id===c.taskId).planned=day;p.updatedAt=at;return c.taskId;}
  if(state.tasks.length>=10000)throw Error('Your task list has reached its limit.');
  const task={id:makeId(),title:c.action,area:p.area,step:c.action,doneMeans:'I made the check and can describe what I found.',reason:('Understand: '+p.observed).slice(0,250),minutes:5,repeat:'none',weekday:new Date(day+'T12:00:00Z').getUTCDay(),planned:day,due:'',blocked:'',createdAt:at};
  state.tasks.push(task);c.taskId=task.id;p.updatedAt=at;return task.id;
}

// An additive extension to the existing backup: old saves simply have no notebook.
export function readProblems(raw){
  if(raw===undefined)return [];
  const bad=()=>{throw Error('This backup contains an invalid problem notebook.');};
  if(!Array.isArray(raw)||raw.length>MAX_PROBLEMS)bad();
  const ids=new Set(),taskIds=new Set();
  const unique=(v,set)=>{if(!identity(v)||set.has(v))bad();set.add(v);return v;};
  const field=(o,k,needed=false)=>{if(o[k]!==undefined&&(typeof o[k]!=='string'||o[k].length>PROBLEM_LIMITS[k]))bad();let v=clean(o[k],k);if(needed&&!v)bad();return v;};
  const time=v=>{if(!timestamp(v))bad();return v;};
  return raw.map(p=>{
    if(!p||!['open','solved'].includes(p.status)||!Array.isArray(p.checks)||p.checks.length>MAX_CHECKS||!Array.isArray(p.resolutions)||p.resolutions.length>MAX_CLOSURES)bad();
    const id=unique(p.id,ids),checkIds=new Set();
    const checks=p.checks.map((c,index)=>{
      if(!c)bad();const finding=field(c,'finding');if(!finding&&index!==p.checks.length-1)bad();
      const taskId=c.taskId===''||c.taskId===undefined?'':unique(c.taskId,taskIds);
      return {id:unique(c.id,checkIds),action:field(c,'action',true),prediction:field(c,'prediction'),idea:field(c,'idea'),alternative:field(c,'alternative'),at:time(c.at),taskId,finding,foundAt:finding?time(c.foundAt):'',verdict:checkVerdict(c.verdict)};
    });
    const resolutions=p.resolutions.map(r=>{if(!r)bad();return {proof:field(r,'proof',true),keep:field(r,'keep'),at:time(r.at)};});
    if(p.status==='solved'&&!resolutions.length)bad();
    return {id,observed:field(p,'observed',true),goal:field(p,'goal',true),area:area(p.area),evidence:field(p,'evidence'),idea:field(p,'idea'),alternative:field(p,'alternative'),checks,resolutions,status:p.status,createdAt:time(p.createdAt),updatedAt:time(p.updatedAt)};
  });
}
