import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {MEADOW_ITEMS} from '../world-rules.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const origin='https://mpb029.github.io/Daycraft/';
async function worker(){
 const source=await readFile(path.join(root,'sw.js'),'utf8'),handlers={};
 const context=vm.createContext({URL,Request,Set,Promise,self:{registration:{scope:origin},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn}});
 vm.runInContext(source,context);
 return {handlers,context,...vm.runInContext('({PREFIX,VERSION,FILES})',context)};
}
test('GitHub project URL resolves every page, module, texture and install asset locally',async()=>{
 const {FILES}=await worker(),urls=new Set(FILES.map(file=>new URL(file,origin).href));
 const check=async url=>{assert.ok(url.startsWith(origin),url+' escapes the project');const relative=decodeURIComponent(url.slice(origin.length))||'index.html';assert.ok((await stat(path.join(root,relative))).isFile(),relative);};
 for(const url of urls)await check(url);
 assert.ok((await stat(path.join(root,'.nojekyll'))).isFile());
 const html=await readFile(path.join(root,'index.html'),'utf8');
 for(const m of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)){const url=new URL(m[1],origin).href;assert.ok(urls.has(url),url+' is not cached');await check(url);}
 for(const file of FILES.filter(x=>/\.(?:mjs|js)$/.test(x))){
  const source=await readFile(path.join(root,file),'utf8'),base=new URL(file,origin);
  for(const m of source.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)['"](\.\.?\/[^'"]+)['"]/g)){const url=new URL(m[1],base).href;assert.ok(urls.has(url),url+' is not cached');await check(url);}
 }
 assert.deepEqual(MEADOW_ITEMS.map(x=>x.id),['elephant','snail','goose','moon-cradle']);
 for(const item of MEADOW_ITEMS)for(const file of ['geometry.mjs','texture.jpg','thumbnail.webp'])assert.ok(urls.has(new URL('./assets/'+item.id+'/'+file,origin).href));
 const manifest=JSON.parse(await readFile(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(new URL(manifest.start_url,origin).href,origin);assert.equal(new URL(manifest.scope,origin).href,origin);
 for(const icon of manifest.icons){const url=new URL(icon.src,origin).href;assert.ok(urls.has(url));await check(url);const bytes=await readFile(path.join(root,icon.src)),[w,h]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h);}
});
test('Offline cache stays inside Daycraft and retains other projects and user storage',async()=>{
 const {handlers,context,PREFIX,VERSION,FILES}=await worker(),deleted=[],other='daycraft-pages:/OtherApp/:v1.0';let installed=[],claims=0,network=0;
 context.caches={open:async name=>{assert.equal(name,VERSION);return {addAll:async names=>installed=[...names],match:async key=>key===origin+'app.mjs'?'cached app':undefined};},keys:async()=>[PREFIX+'v1.0',VERSION,other,'unrelated-cache'],delete:async name=>deleted.push(name)};
 context.self.clients.claim=async()=>claims++;
 context.fetch=async request=>{network++;return 'network '+request.url;};
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;assert.deepEqual(installed.map(r=>r.url),[...FILES].map(f=>new URL(f,origin).href));assert.ok(installed.every(r=>r.cache==='reload'),'An update must bypass the browser HTTP cache when preparing its new app files');
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,[PREFIX+'v1.0']);assert.equal(claims,1);
 const get=async(url,method='GET')=>{let response;handlers.fetch({request:{url,method},respondWith:p=>response=p});return response?await response:undefined;};
 assert.equal(await get(origin+'app.mjs?version=1'),'cached app');assert.equal(network,0);
 assert.equal(await get(origin+'styles.css'),'network '+origin+'styles.css');assert.equal(network,1);
 for(const url of ['https://mpb029.github.io/OtherApp/app.mjs','https://mpb029.github.io/DaycraftExtra/app.mjs','https://example.com/Daycraft/app.mjs',origin+'api/state',origin+'private-backup.json'])assert.equal(await get(url),undefined);
 assert.equal(await get(origin+'app.mjs','POST'),undefined);assert.equal(network,1);
});

test('A failed update never activates a partially cached release',async()=>{
 const {handlers,context}=await worker();let skips=0;context.self.skipWaiting=async()=>skips++;context.caches={open:async()=>({addAll:async()=>{throw Error('Missing uploaded asset');}})};let pending;handlers.install({waitUntil:p=>pending=p});await assert.rejects(pending,/Missing uploaded asset/);assert.equal(skips,0);
 context.caches={open:async()=>({addAll:async()=>{}})};handlers.install({waitUntil:p=>pending=p});await pending;assert.equal(skips,1);
});
