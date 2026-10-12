const PREFIX='daycraft-pages:'+new URL(self.registration.scope).pathname+':';
const VERSION=PREFIX+'v1.10.1';
const FILES=["./","./app.mjs","./backgrounds.mjs","./forest-geometry.mjs","./forest-materials.mjs","./forest-world.mjs","./assets/forest/foliage.png","./assets/forest/bark.png","./water-cycle.mjs","./water-controls.mjs","./water-world.mjs","./water-lighting.mjs","./astronomy-engine.mjs","./sky-location.mjs","./sky-time.mjs","./meadow-night.mjs","./assets/elephant/geometry.mjs","./assets/elephant/texture.jpg","./assets/elephant/thumbnail.webp","./assets/goose/geometry.mjs","./assets/goose/texture.jpg","./assets/goose/thumbnail.webp","./assets/moon-cradle/geometry.mjs","./assets/moon-cradle/texture.jpg","./assets/moon-cradle/thumbnail.webp","./assets/snail/geometry.mjs","./assets/snail/texture.jpg","./assets/snail/thumbnail.webp","./boot.mjs","./domain.mjs","./icon.svg","./icons/icon-192.png","./icons/icon-512.png","./icons/maskable-512.png","./index.html","./manifest.webmanifest","./meadow-terrain.mjs","./meadow-atmosphere.mjs","./meadow-overlay.mjs","./meadow-layout.css","./styles.css","./vendor/OrbitControls.js","./vendor/three.core.js","./vendor/three.module.js","./world-models.mjs","./world-renderer.mjs","./world-rules.mjs","./world-view.mjs"];
const SCOPE=new URL(self.registration.scope),ALLOWED=new Set(FILES.map(file=>new URL(file,SCOPE).href));
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(FILES.map(file=>new Request(new URL(file,SCOPE),{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith(PREFIX)&&name!==VERSION).map(name=>caches.delete(name)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const key=new URL(url);key.search='';
 if(!ALLOWED.has(key.href))return;
 event.respondWith(caches.open(VERSION).then(async cache=>(await cache.match(key.href))||fetch(event.request)));
});
