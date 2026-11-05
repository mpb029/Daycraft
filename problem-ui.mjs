import {CHECK_STARTERS,VERDICTS,PROBLEM_LIMITS as L,currentCheck,saveFrame,saveReasoning,addCheck,editCheck,recordFinding,planCheck,checkTaskState,resolveProblem,reopenProblem} from './problems.mjs';

const EXAMPLES={
  work:{observed:'The crew waited for fittings on two of our last three starts.',goal:'The right fittings are at the workfront before the crew arrives.',check:'Compare the order and dispatch times for one late delivery and one on-time delivery.',prediction:'If ordering is the delay, the late delivery will also have a later order time.'},
  health:{observed:'I planned three lunchtime walks and missed both on meeting days.',goal:'I can take a ten-minute walk on a meeting day.',check:'Compare the calendars for a day I walked and a day I missed.',prediction:'If meeting overruns are the issue, my usual walking time will overlap a meeting.'},
  life:{observed:'Twice this week I left home late looking for my keys.',goal:'My keys are ready to pick up when I leave.',check:'Tomorrow, note where I find my keys and where I last put my bag.',prediction:'If I leave my keys with my bag, I will find them in the same place.'}
};
const areaNames={work:'Work',health:'Health',life:'Life'};
export function createProblemBook({state,day,uid,e,icon,areaTag,openDialog,closeDialog,enter,render,commit,toast}){
  let selected='',tab='open';
  const S=()=>state(), get=id=>S().problems.find(p=>p.id===id);
  const button=(label,action,attrs='',style='')=>`<button type="button" class="btn ${style}" data-action="${action}" ${attrs}>${label}</button>`;
  const pid=p=>`data-id="${e(p.id)}"`;
  const ref=(p,c)=>`${pid(p)} data-check="${e(c.id)}"`;
  const isoLabel=at=>new Intl.DateTimeFormat('en-AU',{day:'numeric',month:'short',year:'numeric',timeZone:S().settings.zone}).format(new Date(at));
  const badge=(s,soft=false)=>`<span class="pb-badge${soft?' pb-quiet':''}">${e(s)}</span>`;
  const row=(label,value)=>value?`<div class="pb-evidence"><dt>${label}</dt><dd>${e(value)}</dd></div>`:'';
  const textField=(name,label,value='',options={})=>{
    const {hint='',placeholder='',required=false,lines=2,auto=false}=options;
    return `<div class="field pb-field"><label for="pb-${name}">${label}</label><textarea id="pb-${name}" name="${name}" rows="${lines}" maxlength="${L[name]}" ${hint?`aria-describedby="pb-h-${name}"`:''} ${required?'required':''} ${auto?'autofocus':''} placeholder="${e(placeholder)}">${e(value)}</textarea>${hint?`<small id="pb-h-${name}">${hint}</small>`:''}</div>`;
  };
  function position(id='',scroll=true){
    selected=id;enter();if(scroll){const panel=document.querySelector('#main');if(panel)panel.scrollTop=0;}
  }
  function focusPanel(){const panel=document.querySelector('#main');if(panel){panel.scrollTop=0;panel.focus?.({preventScroll:true});}}
  function reveal(p,write=false){if(p)tab=p.status;position(p?.id||'');if(write)commit();else render();focusPanel();}
  function listView(){selected='';tab='open';}
  function showExample(key){
    const x=EXAMPLES[key]||EXAMPLES.work;
    return `<dl class="pb-facts">${row('What happened',x.observed)}${row('What better looks like',x.goal)}${row('First check',x.check)}${row('What I’d expect',x.prediction)}</dl>`;
  }
  function list(){
    const all=S().problems, list=all.filter(x=>x.status===tab).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    const tabs=['open','solved'].map(k=>`<button type="button" data-action="pb-filter" data-value="${k}" aria-pressed="${tab===k}" class="${tab===k?'active':''}">${k==='open'?'Open':'Solved'} <span>${all.filter(p=>p.status===k).length}</span></button>`).join('');
    return `<div class="pb-book"><header class="pb-heading"><p class="eyebrow">Field notebook</p><h1>Problems</h1><p>Start with what happened. Leave with one useful thing to check.</p></header><div class="pb-list-tools"><div class="tabs pb-filters" role="group" aria-label="Problems by status">${tabs}</div></div>${list.length?`<div class="pb-list">${list.map(p=>{
      const c=currentCheck(p),hasFindings=p.checks.some(c=>c.finding);
      return `<button type="button" class="pb-entry" data-action="pb-open" ${pid(p)}><span class="pb-entry-meta">${areaTag(p.area)}<span>${isoLabel(p.updatedAt)}</span></span><strong>${e(p.observed)}</strong><span class="pb-entry-next">${p.status==='solved'?icon('check')+' Verified: '+e(p.resolutions.at(-1).proof):c?icon('arrow')+' Next: '+e(c.action):hasFindings?'Choose another check or verify the outcome.':'Choose a first check.'}</span></button>`;
    }).join('')}</div>`:tab==='open'?`<section class="pb-empty"><p class="eyebrow">A place to start</p><h2>What keeps getting in the way?</h2><p>Think of the last time it happened. One example is enough to begin.</p>${button(icon('plus')+' Add a problem','pb-new','','primary')}</section><details class="pb-detail"><summary>See a worked example</summary>${showExample('work')}</details>`:'<section class="pb-empty"><h2>No solved problems yet.</h2><p>When you can say what changed and how you checked it, your record will appear here.</p></section>'}</div>`;
  }
  function detail(p){
    const c=currentCheck(p),open=p.status==='open',past=p.checks.filter(c=>c.finding).slice().reverse();
    const status=c?checkTaskState(S(),c,day()):'none',hasTask=c&&S().tasks.some(t=>t.id===c.taskId);
    const checkBox=c&&open?`<section class="pb-next"><p class="eyebrow">Next check</p><h2>${e(c.action)}</h2>${c.prediction?`<p><b>Look for:</b> ${e(c.prediction)}</p>`:''}${status==='done'?badge('Task completed · finding still open'):status==='today'?badge('In today’s plan'):status==='task'?badge('Linked task',true):''}<div class="pb-actions">${button('Record a finding','pb-result',ref(p,c),'primary')}${!['today','done'].includes(status)?button(status==='removed'?'Add a replacement task':'Add to Today','pb-plan',ref(p,c),'soft'):''}${!c.taskId?button('Edit check','pb-check',ref(p,c),'text small'):hasTask&&status!=='done'?button('Task options','task-menu',`data-id="${e(c.taskId)}"`,'text small'):''}</div></section>`:open?`<section class="pb-next"><p class="eyebrow">Next check</p><h2>${past.length?'What would you try next?':'What could you learn first?'}</h2><p>${past.length?'Use what you learned to narrow the question or try another approach.':'Compare two cases, observe it once, or ask someone who saw it.'}</p>${button(past.length?'Choose another check':'Choose a first check','pb-check',pid(p),'primary')}</section>`:'';
    const journal=past.length?`<section class="pb-section"><h2>What you’ve learned</h2><ol class="pb-log">${past.map(c=>`<li><small>${isoLabel(c.foundAt)} · ${c.idea||c.prediction?e(VERDICTS[c.verdict]):'Finding'}</small><strong>${e(c.finding)}</strong><details><summary>See the check</summary><dl class="pb-facts">${row('Action',c.action)}${row('Idea at the time',c.idea)}${row('Other possibility',c.alternative)}${row('Expected to see',c.prediction)}</dl></details>${c.taskId&&S().tasks.some(t=>t.id===c.taskId)&&!S().completions.some(x=>x.taskId===c.taskId)?button('Finish linked task','finish',`data-id="${e(c.taskId)}"`,'text small'):''}</li>`).join('')}</ol></section>`:'';
    const resolution=p.resolutions.length?`<section class="pb-section"><h2>${open?'Previous resolution':'How you verified it'}</h2>${p.resolutions.slice().reverse().map((r,i)=>`<div class="pb-resolution"><small>${isoLabel(r.at)}${i>0?' · Earlier resolution':''}</small><p>${e(r.proof)}</p>${r.keep?`<p><b>Keep doing:</b> ${e(r.keep)}</p>`:''}</div>`).join('')}</section>`:'';
    return `<div class="pb-book">${button('‹ All problems','pb-all','','text small pb-back')}<header class="pb-heading pb-case"><div class="pb-entry-meta">${areaTag(p.area)} ${badge(open?'Open':'Solved',open)}</div><h1>${e(p.observed)}</h1><p class="pb-target"><b>What better looks like</b>${e(p.goal)}</p>${open?button('Edit problem','pb-edit',pid(p),'text small'):''}</header>${checkBox}<details class="pb-detail" ${open&&!c&&!past.length?'open':''}><summary>Clues and possible explanations</summary><dl class="pb-facts">${row('What I know',p.evidence)}${row('One possible explanation',p.idea)}${row('Another possibility',p.alternative)}</dl>${!p.evidence&&!p.idea&&!p.alternative?'<p>A fact is something you saw or can check. An explanation is an idea you can test.</p>':''}${open?button('Edit clues and ideas','pb-reason',pid(p),'soft small'):''}</details>${journal}${resolution}<div class="pb-bottom">${open?button('Mark solved…','pb-solve',pid(p),'soft'):button('Reopen problem','pb-reopen',pid(p),'soft')}${button('Delete problem…','pb-delete',pid(p),'text small')}</div></div>`;
  }
  function page(){const p=get(selected);return p?detail(p):list();}
  function progress(){
    const all=S().problems;if(!all.length)return '';
    const solved=all.filter(p=>p.status==='solved').length, latest=all.flatMap(p=>p.checks.filter(c=>c.finding).map(c=>({p,c}))).sort((a,b)=>b.c.foundAt.localeCompare(a.c.foundAt))[0];
    return `<section class="card padded pb-progress"><p class="eyebrow">Problem notebook</p><h2>What you’re working through</h2><p>${all.length-solved} open · ${solved} solved</p>${latest?`<div class="pb-brief"><b>Latest finding</b>${e(latest.c.finding)}</div>${button('Open this problem','pb-open',pid(latest.p),'soft small')}`:button('Open problems','nav','data-view="problems"','soft small')}</section>`;
  }
  function frame(p){
    const a=p?.area||'work',x=EXAMPLES[a];
    openDialog(p?'Edit the problem':'What’s getting in the way?',p?'Update the gap as your understanding improves.':'Step 1 of 2 · Describe the gap. You don’t need to know the cause.',`<form class="pb-form" id="pb-frame-form" data-id="${e(p?.id||'')}"><div class="field"><label for="pb-area">Part of life</label><select id="pb-area" name="area">${Object.entries(areaNames).map(([key,label])=>`<option value="${key}" ${key===a?'selected':''}>${label}</option>`).join('')}</select></div>${textField('observed','What actually happened?',p?.observed,{required:true,placeholder:x.observed,hint:'Describe one occasion. When or where did you notice it?',auto:true})}${textField('goal','What would better look like?',p?.goal,{required:true,placeholder:x.goal,hint:'Choose an outcome you could recognise for yourself.'})}<details class="pb-detail"><summary>Show an example</summary><div id="pb-example">${showExample(a)}</div></details><div class="dialog-actions">${button('Cancel','close')}<button class="btn primary" type="submit">${p?'Save changes':'Save & choose a first check'}</button></div></form>`,'problem');
  }
  const reasoning=p=>textField('evidence','What have you actually seen or measured?',p.evidence,{placeholder:'A date, measurement, record or first-hand observation.'})+textField('idea','What might explain it?',p.idea,{placeholder:'One possible cause, even if you are unsure.'})+textField('alternative','What else could explain the same facts?',p.alternative,{placeholder:'What would you check before settling on your first idea?'});
  function checkForm(p,editing=null,first=false){
    const a=EXAMPLES[p.area]||EXAMPLES.work;
    openDialog(editing?'Edit your check':first?'Choose a first check':'Choose your next check',first?'Step 2 of 2 · Your problem is saved. Pick something small enough to start today.':'What is the smallest check that would help you decide what to do?',`<form id="pb-check-form" class="pb-form" ${pid(p)} data-check="${e(editing?.id||'')}"><div class="pb-brief"><b>You want to see</b>${e(p.goal)}</div><div class="pb-starters"><span>Need a starting point? Pick one to adapt.</span><div>${Object.entries(CHECK_STARTERS).map(([k,x])=>button(x.label,'pb-starter',`data-value="${k}"`,'small')).join('')}</div></div>${textField('action','What will you do to learn more?',editing?.action,{required:true,placeholder:a.check,auto:true})}${textField('prediction','What result would tell you something?',editing?.prediction,{placeholder:a.prediction,hint:'Optional. If your idea is right, what will you see? What might point elsewhere?'})}<details class="pb-detail"><summary>Separate the facts from possible causes <span>Optional</span></summary>${reasoning(p)}</details><div class="dialog-actions">${button(editing?'Cancel':'Decide later','pb-later')}<button type="submit" class="btn primary">${editing?'Save changes':'Save check'}</button></div></form>`,'problem');
    // Replacing an already-open dialog does not rerun the browser’s initial focus algorithm.
    if(first)document.querySelector('#pb-action')?.focus?.();
  }
  function reasoningForm(p){
    openDialog('Clues and explanations','Keep what you know separate from what you think might be happening.',`<form class="pb-form" id="pb-reason-form" ${pid(p)}>${reasoning(p)}<div class="dialog-actions">${button('Cancel','close')}<button type="submit" class="btn primary">Save notes</button></div></form>`,'problem');
  }
  function findingForm(p,c){
    openDialog('What did you find?','An unexpected result is useful too.',`<form class="pb-form" id="pb-result-form" ${ref(p,c)}><div class="pb-brief"><b>Your check</b>${e(c.action)}${c.prediction?`<b>You expected</b>${e(c.prediction)}`:''}</div>${textField('finding','What actually happened?', '',{required:true,auto:true,hint:'Write down what you observed, including a result that ruled an idea out.'})}${c.idea||c.prediction?`<div class="field"><label for="pb-verdict">What does that suggest?</label><select id="pb-verdict" name="verdict">${Object.entries(VERDICTS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>`:''}<div class="dialog-actions">${button('Cancel','close')}<button type="submit" class="btn primary">Save finding</button></div></form>`,'problem');
  }
  function solveForm(p){
    openDialog('Did you get the outcome you wanted?','Compare what is happening now with your original goal.',`<form class="pb-form" id="pb-solve-form" ${pid(p)}><div class="pb-brief"><b>What better looks like</b>${e(p.goal)}</div>${textField('proof','What shows the problem is solved?','',{required:true,auto:true,placeholder:'What changed, and how did you check?'})}${textField('keep','What will help it stay solved?','',{hint:'Optional. A small habit, a handover change, or something to check again.'})}<div class="dialog-actions">${button('Keep open','close')}<button type="submit" class="btn primary">Mark solved</button></div></form>`,'problem');
  }
  function action(name,el){
    const p=get(el.dataset.id),c=p&&currentCheck(p);
    switch(name){
      case 'pb-new':frame(null);break;
      case 'pb-later':closeDialog();focusPanel();break;
      case 'pb-open':if(p){if(document.querySelector('#modal')?.open)closeDialog();reveal(p);}break;
      case 'pb-all':selected='';position();render();focusPanel();break;
      case 'pb-filter':tab=el.dataset.value==='solved'?'solved':'open';selected='';render();document.querySelector(`[data-action="pb-filter"][data-value="${tab}"]`)?.focus?.({preventScroll:true});break;
      case 'pb-edit':if(p?.status==='open')frame(p);break;
      case 'pb-reason':if(p?.status==='open')reasoningForm(p);break;
      case 'pb-check':if(p?.status==='open'&&(!c||c.id===el.dataset.check&&!c.taskId))checkForm(p,c);break;
      case 'pb-starter':{const x=CHECK_STARTERS[el.dataset.value],input=document.querySelector('#pb-action');if(x&&input){input.value=x.action;input.focus?.();}break;}
      case 'pb-plan':if(p){planCheck(S(),p,el.dataset.check,day(),uid);commit();toast('Your check is in Today. Come back here to record what you find.');}break;
      case 'pb-result':if(p?.status==='open'&&c&&c.id===el.dataset.check)findingForm(p,c);break;
      case 'pb-solve':if(p?.status==='open')solveForm(p);break;
      case 'pb-reopen':if(p){reopenProblem(p);reveal(p,true);toast('Problem reopened. Your earlier findings are still here.');}break;
      case 'pb-delete':if(p)openDialog('Delete this problem?',e(p.observed),`<p>Its notes and findings will be removed. Any linked tasks and earned materials will stay.</p><div class="dialog-actions">${button('Keep problem','close')}${button('Delete problem','pb-confirm-delete',pid(p),'danger')}</div>`,'problem');break;
      case 'pb-confirm-delete':if(p){S().problems=S().problems.filter(x=>x!==p);closeDialog();reveal(null,true);toast('Problem removed.');}break;
      default:return false;
    }
    return true;
  }
  function submit(form,f){
    const val=k=>f.get(k)||'',pick=(...keys)=>Object.fromEntries(keys.map(k=>[k,val(k)]));
    let p=get(form.dataset.id);
    if(form.id==='pb-frame-form'){
      if(form.dataset.id&&!p)throw Error('That problem is no longer available.');
      const editing=!!p;p=saveFrame(S(),p?.id||uid(),pick('observed','goal','area'));
      if(editing){closeDialog();reveal(p,true);toast('Problem updated.');}
      else{reveal(p,true);checkForm(p,null,true);}return;
    }
    if(!p)throw Error('That problem is no longer available.');
    if(form.id==='pb-reason-form')saveReasoning(p,pick('evidence','idea','alternative'));
    else if(form.id==='pb-check-form'){
      const data=pick('action','prediction'), id=form.dataset.check;
      let check;if(id){editCheck(p,id,data);check=currentCheck(p);}else check=addCheck(p,uid(),data);
      saveReasoning(p,pick('evidence','idea','alternative'));check.idea=p.idea;check.alternative=p.alternative;
    }else if(form.id==='pb-result-form')recordFinding(p,form.dataset.check,pick('finding','verdict'));
    else if(form.id==='pb-solve-form')resolveProblem(p,pick('proof','keep'));
    else return;
    closeDialog();reveal(p,true);toast(form.id==='pb-result-form'?'Finding saved. Decide what to try next.':form.id==='pb-solve-form'?'Problem marked solved. Your notes are here if it comes back.':form.id==='pb-check-form'?'Check saved. Add it to Today when you’re ready.':'Notes saved.');
  }
  function change(el){if(el.id==='pb-area'&&Object.hasOwn(EXAMPLES,el.value)){const x=EXAMPLES[el.value];document.querySelector('#pb-observed').placeholder=x.observed;document.querySelector('#pb-goal').placeholder=x.goal;document.querySelector('#pb-example').innerHTML=showExample(el.value);}}
  return {page,progress,listView,action,submit,change};
}
