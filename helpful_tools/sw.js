'use strict';
const CACHE='pokesurvivor-wiki-v6';
const SHELL=['./index.html','./wiki.css','./site.css','./mobile.css','./mobile-ui.js','./site-nav.js','./site-search.js','./search-index.js','./install.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./offline.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pokesurvivor-wiki-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 // Network first keeps published data current; retain only successful responses.
 event.respondWith(fetch(event.request).then(response=>{if(response.ok)event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())));return response;}).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match('./offline.html'):Response.error())));
});
