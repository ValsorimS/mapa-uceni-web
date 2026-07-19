"use strict";
const CACHE="mapa-uceni-pwa-v1";
const CORE=["./","index.html","pomoc/","pruvodce/","hledat/","plan/","cermat/","rvp/","o-mape/","audit/","assets/style.css","assets/app.js","assets/search-data.js","assets/favicon.svg","manifest.webmanifest"];
const coreRequests=()=>CORE.map(item=>new Request(new URL(item,self.registration.scope),{cache:"reload"}));
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(coreRequests())).then(()=>self.skipWaiting()));});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",event=>{if(event.request.method!=="GET")return;const url=new URL(event.request.url);if(url.origin!==location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request).then(found=>found||caches.match(new URL("./",self.registration.scope)))));});
