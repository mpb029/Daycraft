import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,build,completeTask,shiftDate,balance,validateState} from '../domain.mjs';
import {CATALOG,placementError} from '../world-rules.mjs';
// Exercise the actual world event handlers without a browser or GPU.
test('Inventory → draft → rotate → place → cancel move → store → expand → transfer',async()=>{
 const listeners={},messages=[];globalThis.document={addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),querySelector:()=>({scrollIntoView(){}})};
 const {mountWorldViews,worldPageHTML,worldBackdropHTML}=await import('../world-view.mjs');
 const s=initialState();s.tasks=[{id:'daily',title:'Done well',repeat:'daily',area:'work',doneMeans:'Checked result'}];for(let i=0;i<100;i++)completeTask(s,'daily',shiftDate('2026-01-01',i));
 let html='',commits=0;const render=()=>{html=worldPageHTML(s);mountWorldViews({state:s,render,commit:()=>{commits++;render();},toast:t=>messages.push(t)});};render();
 const act=(world,data={})=>{const el={dataset:{world,...data}};for(const f of listeners.click||[])f({target:{closest:()=>el}});};
 const change=(id,value)=>{for(const f of listeners.change||[])f({target:{id,value}});};
 assert.doesNotMatch(html,/data-world-scene/);assert.match(worldBackdropHTML(s,true),/data-editable="true"/);act('breeze');assert.equal(s.settings.breeze,false);act('breeze');assert.equal(s.settings.breeze,true);act('earn',{id:'garden'});assert.equal(s.builds.length,1);assert.equal(s.builds[0].placement,null);assert.match(html,/Choose its place/);const cost=balance(s);const id=s.builds[0].instanceId;
 change('place-x','7');change('place-z','-4');act('rotate');act('place');assert.deepEqual(s.builds[0].placement,{islandId:'outlook',x:7,z:-4,rotation:90});assert.equal(balance(s),cost);assert.doesNotMatch(html,/data-world-editing="true"/);
 s.settings.background='water';render();assert.match(worldBackdropHTML(s,true),/data-editable="false"/);assert.match(html,/Your collection stays in the meadow/);
 act('select',{id});assert.equal(s.settings.background,'meadow');change('place-x','-7');act('cancel');assert.equal(s.builds[0].placement.x,7,'Cancelling must keep the saved position');
 act('store',{id});assert.equal(s.builds[0].placement,null);assert.equal(balance(s),cost);act('select',{id});change('place-x','13');change('place-z','13');act('place');assert.equal(s.builds[0].placement,null);assert.ok(messages.some(x=>x.includes('central arrangement area')));act('find-spot');act('place');assert.equal(placementError(s,id,s.builds[0].placement),'');
 for(const [type,label,x,z] of [['elephant','Meadow elephant',7,6],['snail','Mechanical snail',-7,6],['goose','Clockwork goose',7,-6],['moon-cradle','Moon cradle',-7,-6]]){const before=balance(s);assert.ok(html.includes(label));assert.ok(html.includes('assets/'+type+'/thumbnail.webp'));act('earn',{id:type});const item=s.builds.find(b=>b.id===type);assert.ok(item);assert.equal(balance(s),before-3);change('place-x',String(x));change('place-z',String(z));act('rotate');act('place');assert.deepEqual(item.placement,{islandId:'outlook',x,z,rotation:90});assert.equal(placementError(s,item.instanceId,item.placement),'');assert.deepEqual(validateState(JSON.parse(JSON.stringify(s))).builds,s.builds);}
 for(const b of CATALOG.slice(1))build(s,b.id);render();assert.match(html,/First collection complete/);assert.match(html,/island-form/);
 const realFD=globalThis.FormData;globalThis.FormData=class {get(k){return k==='name'?'Quiet coast':'coast';}};
 try{for(const f of listeners.submit||[])f({preventDefault(){},target:{id:'island-form'}});}finally{globalThis.FormData=realFD;}
 assert.equal(s.islands.length,2);assert.equal(s.islands[1].theme,'coast');assert.equal(s.builds[0].placement.islandId,'outlook');act('select',{id});act('place');assert.equal(s.builds[0].placement.islandId,s.islands[1].id);assert.ok(commits>=6);assert.match(html,/Quiet coast/);
});
