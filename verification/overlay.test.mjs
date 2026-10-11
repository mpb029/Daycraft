import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptsMeadowShortcut,createMeadowOverlay} from '../meadow-overlay.mjs';

test('Space never steals typing, native control activation, modified keys or open dialogs',()=>{
 const doc={querySelector:()=>null};
 const event={key:' ',code:'Space',target:{closest:()=>null}};
 assert.equal(acceptsMeadowShortcut(event,doc),true);
 for(const flag of ['defaultPrevented','repeat','isComposing','ctrlKey','altKey','metaKey','shiftKey'])assert.equal(acceptsMeadowShortcut({...event,[flag]:true},doc),false);
 assert.equal(acceptsMeadowShortcut({...event,target:{isContentEditable:true}},doc),false);
 for(const tag of ['INPUT','TEXTAREA','SELECT','BUTTON','A','SUMMARY']){
  const target={tagName:tag,closest:selector=>selector.split(', ').includes(tag.toLowerCase())?{}:null};
  assert.equal(acceptsMeadowShortcut({...event,target},doc),false);
 }
 assert.equal(acceptsMeadowShortcut(event,{querySelector:()=>({open:true})}),false);
 assert.equal(acceptsMeadowShortcut({...event,key:'a',code:'KeyA'},doc),false);
});
test('Hiding panels preserves the actual form and scroll position, removes hidden controls from focus and restores focus',()=>{
 const events={},panel={hidden:false,inert:false,scrollTop:187,form:{value:'Walk the dog'}},button={innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){focused=this;}},input={isConnected:true,focus(){focused=this;}};
 let focused=input;const doc={activeElement:input,body:{classList:{toggle(){}}},querySelector:s=>s==='#meadow-interface'?panel:s==='#panel-toggle'?button:null,addEventListener:(n,fn)=>events[n]=fn};
 const overlay=createMeadowOverlay(doc);overlay.mount();assert.equal(button.attrs['aria-expanded'],'true');
 let prevented=0;events.keydown({key:' ',code:'Space',target:{closest:()=>null},preventDefault(){prevented++;}});
 assert.equal(prevented,1);assert.equal(overlay.visible,false);assert.equal(panel.hidden,true);assert.equal(panel.inert,true);assert.equal(focused,button);assert.equal(button.attrs['aria-expanded'],'false');
 assert.equal(panel.form.value,'Walk the dog');assert.equal(panel.scrollTop,187);
 overlay.mount();assert.equal(panel.hidden,true,'A task update must not reopen hidden panels');
 events.keydown({key:'Escape',preventDefault(){prevented++;}});assert.equal(overlay.visible,true);assert.equal(panel.hidden,false);assert.equal(panel.inert,false);assert.equal(focused,input);assert.equal(panel.scrollTop,187);
 overlay.toggle();overlay.toggle();assert.equal(panel.hidden,false);assert.equal(panel.form.value,'Walk the dog');
});
