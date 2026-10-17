// Service worker: giao diện chạy được khi mất mạng; luôn ưu tiên bản mới trên mạng
const CACHE='tcp-shell-3.15.0';
const SHELL=['./','index.html','app.js','v29.js','v30.js','v31.js','v35.js','v36.js','v37.js','v38.js','v39.js','v40.js','v41.js','v42.js','v43.js','pwa.js','config.js','manifest.webmanifest','favicon.svg','icon-192.png'];
const CDN=/cdn\.jsdelivr\.net\/npm\/(@supabase\/supabase-js|xlsx)@/;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{}))))); self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('message',e=>{if(e.data==='skip')self.skipWaiting();});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 if(u.origin===location.origin){if(u.pathname.endsWith('version.json'))return;
  // mạng trước, lưu bản mới; mất mạng thì dùng bản đã lưu (bỏ ?v=… khi tra)
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(stripV(r),cp));}return res;})
   .catch(()=>caches.match(stripV(r)).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):Response.error()))));return;}
 if(CDN.test(r.url))e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;})));
});
function stripV(r){const u=new URL(r.url);u.searchParams.delete('v');return new Request(u.toString());}
