import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey} from '../domain.mjs';
// Event-and-render harness. This is not a browser or a visual layout test.
test('Task → focus → complete → build → undo works through app event handlers',async()=>{
 const listeners={},elements=new Map(),storage=new Map();
 function el(){return {innerHTML:'',textContent:'',open:false,dataset:{},classList:{add(){},remove(){}},addEventListener(){},setAttribute(){},querySelector:selector=>get(selector),showModal(){this.open=true;},close(){this.open=false;},getBoundingClientRect(){return {left:0,right:1000,top:0,bottom:1000}},focus(){},setSelectionRange(){},remove(){},click(){}};}
 function get(id){if(!elements.has(id))elements.set(id,el());return elements.get(id);}
 globalThis.document={querySelector:get,addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},body:{appendChild(){}},hidden:false,createElement:el};
 globalThis.window={addEventListener(){},dispatchEvent(){},scrollTo(){}};
 globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
 const realFormData=globalThis.FormData,realInterval=globalThis.setInterval,realTimeout=globalThis.setTimeout;
 globalThis.FormData=class{constructor(f){this.d=f.fields;}get(k){return this.d[k]??'';}has(k){return k in this.d;}};
 globalThis.setInterval=()=>0;globalThis.setTimeout=()=>0;
 try{
  await import('../app.mjs?integration=1');
  assert.match(get('#app').innerHTML,/Choose my first task/);
  assert.equal((get('#app').innerHTML.match(/data-world-scene/g)||[]).length,1);
  assert.match(get('#app').innerHTML,/id="meadow-interface"/);
  const act=async(action,data={})=>{const button={dataset:{action,...data}};for(const f of listeners.click||[])f({target:{closest:()=>button}});await Promise.resolve();};
  const submit=(id,fields,data={})=>{for(const f of listeners.submit||[])f({preventDefault(){},target:{id,fields,dataset:data}});};
  const state=()=>JSON.parse(storage.get('daycraft.v1'));
  const beforePanels=get('#app').innerHTML;
  await act('panels');assert.equal(get('#meadow-interface').hidden,true);assert.equal(get('#app').innerHTML,beforePanels,'Hiding panels must not recreate the meadow or task forms');
  await act('panels');assert.equal(get('#meadow-interface').hidden,false);
  await act('rain');assert.equal(state().settings.rain,true);assert.match(get('#app').innerHTML,/Rain on/);
  await act('rain');assert.equal(state().settings.rain,false);
  await act('background',{background:'water'});assert.equal(state().settings.background,'water');assert.match(get('#app').innerHTML,/data-background="water"/);assert.match(get('#app').innerHTML,/Try a wave/);assert.equal((get('#app').innerHTML.match(/data-world-scene/g)||[]).length,1);
  await act('water-ride');assert.equal(state().settings.waterRide,false);await act('water-ride');assert.equal(state().settings.waterRide,true);
  const waterBeforePanels=get('#app').innerHTML;await act('panels');assert.equal(get('#app').innerHTML,waterBeforePanels);await act('panels');
  await act('nav',{view:'settings'});assert.equal(state().settings.background,'water');assert.match(get('#app').innerHTML,/Let the wave carry you/);
  for(const f of listeners.change||[])await f({target:{id:'background-select',value:'meadow'}});assert.equal(state().settings.background,'meadow');await act('nav',{view:'today'});
  submit('task-form',{title:'<img src=x onerror=alert(1)>',area:'work',step:'Open the drawing',doneMeans:'A checked result',minutes:'15',repeat:'none',planned:'on',due:'',reason:''},{id:''});
  assert.equal(state().tasks.length,1);assert.ok(get('#app').innerHTML.includes('&lt;img'));assert.ok(!get('#app').innerHTML.includes('<img src=x'));
  const id=state().tasks[0].id;
  await act('start',{id});assert.equal(state().focus.taskId,id);assert.equal(state().starts.length,1);assert.equal(state().completions.length,0);assert.equal(get('#modal').open,true);
  await act('pause');assert.equal(state().focus.paused,true);
  await act('pause');assert.equal(state().focus.paused,false);
  await act('confirm-finish',{id});assert.equal(state().completions.length,1);assert.equal(state().focus,null);assert.equal(state().completions[0].credit,true);
  const completed=state();
  await act('background',{background:'forest'});assert.equal(state().settings.background,'forest');assert.match(get('#app').innerHTML,/Forest bus stop/);assert.match(get('#app').innerHTML,/Face bus stop/);assert.match(get('#app').innerHTML,/Rain on/);assert.doesNotMatch(get('#app').innerHTML,/Try a wave/);
  assert.equal((get('#app').innerHTML.match(/data-world-scene/g)||[]).length,1);
  await act('rain');assert.equal(state().settings.forestRain,false);assert.equal(state().settings.rain,false);
  await act('background',{background:'water'});await act('rain');assert.equal(state().settings.rain,true);
  await act('background',{background:'forest'});assert.match(get('#app').innerHTML,/Rain off/);assert.equal(state().settings.rain,true);
  const forestBeforePanels=get('#app').innerHTML;await act('panels');assert.equal(get('#app').innerHTML,forestBeforePanels);await act('panels');
  assert.deepEqual(state().tasks,completed.tasks);assert.deepEqual(state().completions,completed.completions);
  await act('nav',{view:'settings'});assert.match(get('#app').innerHTML,/A quiet stop in the forest/);assert.match(get('#app').innerHTML,/Daycraft 1\.15\.0/);
  await act('background',{background:'cinema'});assert.equal(state().settings.background,'cinema');assert.match(get('#app').innerHTML,/90s Macca’s/);assert.match(get('#app').innerHTML,/cinema-ronald/);assert.doesNotMatch(get('#app').innerHTML,/data-action="(?:rain|breeze)"/);
  await act('background',{background:'video-store'});assert.equal(state().settings.background,'video-store');assert.match(get('#app').innerHTML,/Play trailers/);assert.match(get('#app').innerHTML,/Browse films/);assert.match(get('#app').innerHTML,/data-action="rain"/);assert.doesNotMatch(get('#app').innerHTML,/data-action="breeze"/);
  await act('rain');assert.equal(state().settings.storeRain,true);assert.equal(state().settings.rain,true);await act('rain');assert.equal(state().settings.storeRain,false);await act('store-time');assert.equal(state().settings.storeLiveTime,true);assert.match(get('#app').innerHTML,/Local time/);await act('store-time');assert.equal(state().settings.storeLiveTime,false);
  const storeBeforePanels=get('#app').innerHTML;await act('panels');assert.equal(get('#app').innerHTML,storeBeforePanels);await act('panels');assert.deepEqual(state().tasks,completed.tasks);assert.deepEqual(state().completions,completed.completions);
  await act('store-inspect');assert.equal(get('#modal').open,true);assert.match(get('#modal').innerHTML,/gremlins-front.jpg/);assert.doesNotMatch(get('#modal').innerHTML,/src="https:\/\/vhscollector/);await act('store-film',{film:'gremlins'});assert.match(get('#modal').innerHTML,/Original VHS spine/);assert.match(get('#modal').innerHTML,/vhscollector/);await act('close');
  await act('background',{background:'meadow'});
  await act('world-after-win');assert.match(get('#app').innerHTML,/Kitchen garden/);
  await act('build',{id:'garden'});assert.equal(state().builds.length,1);
  await act('confirm-undo',{id:state().completions[0].id});assert.equal(state().completions.length,0);assert.equal(state().builds.length,0);
  await act('nav',{view:'settings'});assert.match(get('#app').innerHTML,/not synced between devices/);
  assert.equal((get('#app').innerHTML.match(/data-world-scene/g)||[]).length,1,'Settings still overlays one meadow');
  submit('settings-form',{name:'Marty',worldName:'My place',zone:'Australia/Brisbane',calm:'on'});assert.equal(state().settings.calm,true);
  assert.match(get('#app').innerHTML,/Sky & location/);assert.match(get('#app').innerHTML,/Daycraft 1\.15\.0/);
  const beforeLocation=state();submit('sky-location-form',{latitude:'',longitude:'0',label:'Invalid'});assert.deepEqual(state(),beforeLocation);
  submit('sky-location-form',{latitude:'51.5',longitude:'-.1',label:'<b>London</b>'});assert.equal(state().settings.skyLocation.latitude,51.5);assert.equal(state().settings.skyLocation.longitude,-.1);assert.match(get('#app').innerHTML,/&lt;b&gt;London&lt;\/b&gt;/);assert.deepEqual(state().tasks,beforeLocation.tasks);
  submit('settings-form',{name:'Marty',worldName:'My place',zone:'Australia/Brisbane',calm:'on'});assert.equal(state().settings.skyLocation.latitude,51.5);
  await act('sky-location-reset');assert.equal(state().settings.skyLocation.source,'default');assert.equal(state().settings.skyLocation.latitude,-26.2);
  await act('nav',{view:'progress'});submit('review-form',{feeling:'easier',pressure:'okay',note:'The small step helped.'});assert.equal(state().reviews[0].day,dateKey());
  await act('nav',{view:'tasks'});assert.match(get('#app').innerHTML,/A place for everything/);
 }finally{globalThis.FormData=realFormData;globalThis.setInterval=realInterval;globalThis.setTimeout=realTimeout;}
});
