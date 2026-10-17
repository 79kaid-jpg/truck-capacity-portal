// v3.13: phiên bản mới + PWA (cài lên điện thoại, xem lịch đã tải khi mất mạng)
(()=>{const st=document.createElement('style');st.textContent=`
#updbar,#offbar{position:fixed;left:50%;transform:translateX(-50%);z-index:90;display:flex;gap:10px;align-items:center;padding:9px 14px;border-radius:12px;box-shadow:var(--shadow);font-size:13.5px;max-width:calc(100vw - 24px)}
#updbar{bottom:16px;background:var(--navy);color:var(--on-navy)}#updbar button{border:0;border-radius:8px;padding:5px 12px;font:inherit;font-weight:700;cursor:pointer}
#updbar .go{background:#fff;color:var(--navy)}#updbar .x{background:transparent;color:inherit;opacity:.7}
#offbar{top:70px;background:#fff4e0;color:#7a4a00;border:1px solid #f0c27a}
`;document.head.appendChild(st);})();
const APP_V=window.APP_V||'dev';
// ---------- báo phiên bản mới ----------
let UPD={v:null,hide:null};
async function updCheck(){if(APP_V==='dev'||!navigator.onLine)return;try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
 if(j&&j.v&&j.v!==APP_V){UPD.v=j.v;UPD.note=j.note||'';updShow();}}catch(e){}}
function updShow(){if(!UPD.v||UPD.hide===UPD.v)return;let b=document.getElementById('updbar');if(!b){b=document.createElement('div');b.id='updbar';b.setAttribute('role','status');document.body.appendChild(b);}
 b.innerHTML=`<span>🔄 Đã có phiên bản mới <b>${esc(UPD.v)}</b>${UPD.note?' · '+esc(UPD.note):''}</span><button class="go" id="upd-go">Tải lại</button><button class="x" id="upd-x" title="Để sau">✕</button>`;}
document.addEventListener('click',e=>{if(e.target.id==='upd-go'){if(V.modal&&/grid|bf|rqNew/.test(V.modal.type)&&!confirm30Safe())return;updApply();}
 else if(e.target.id==='upd-x'){UPD.hide=UPD.v;const b=document.getElementById('updbar');if(b)b.remove();}});
const confirm30Safe=()=>{toast('Lưu hoặc đóng cửa sổ đang nhập trước khi tải lại.');return false;};
async function updApply(){try{const r=await navigator.serviceWorker?.getRegistration();if(r){if(r.waiting)r.waiting.postMessage('skip');await r.update().catch(()=>{});}}catch(e){}location.reload();}
setInterval(updCheck,5*60*1000);setTimeout(updCheck,20000);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')updCheck();});
// ---------- service worker ----------
let swTest=false;try{swTest=localStorage.getItem('sw-test')==='1';}catch(e){}
if('serviceWorker' in navigator&&(location.protocol==='https:'||swTest))addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
// ---------- dữ liệu lần tải gần nhất (xem khi mất mạng) ----------
const OFF_KEY='tcp-last';let OFF_RAW=null;
{const r0=rpc;rpc=async function(fn,args){const d=await r0(fn,args);if(fn==='get_state'&&d&&d.me)OFF_RAW=d;return d;};}
{const l0=reload;reload=async function(){
 try{await l0();if(V.offline){V.offline=null;}
  if(OFF_RAW&&S){try{const raw={...OFF_RAW};if(raw.customers==null&&CC&&CC.list)raw.customers=CC.list;const s=JSON.stringify({at:Date.now(),uid:raw.me.id,ym:V.ym,st:raw});if(s.length<3.5e6)localStorage.setItem(OFF_KEY,s);else localStorage.removeItem(OFF_KEY);}catch(e){try{localStorage.removeItem(OFF_KEY);}catch(_){}}OFF_RAW=null;}}
 catch(e){const net=!navigator.onLine||/fetch|network|Load failed|NetworkError/i.test(e.message||'');let o=null;try{o=JSON.parse(localStorage.getItem(OFF_KEY)||'null');}catch(_){}
  if(net&&o&&o.st&&o.st.me){TODAY=o.st.today;S=adopt(o.st);V.me=o.st.me.id;if(o.ym)V.ym=o.ym;V.offline=o.at;return;}throw e;}};}
{const m0=mutate;mutate=async function(fn,args,opts){if(V.offline){toast('Đang mất kết nối: chỉ xem được, chưa thao tác được.');return;}return m0(fn,args,opts);};}
addEventListener('online',()=>{if(V.offline&&S)reload().then(()=>{render();toast('Đã có mạng lại, dữ liệu đã cập nhật.');}).catch(()=>{});});
{const r0=render;render=function(){r0();let b=document.getElementById('offbar');if(!V.offline||!S){if(b)b.remove();return;}
 if(!b){b=document.createElement('div');b.id='offbar';b.setAttribute('role','status');document.body.appendChild(b);}
 const t=new Date(V.offline);b.innerHTML=`📴 Mất kết nối — đang xem dữ liệu lúc <b>${t.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} ${t.toLocaleDateString('vi-VN')}</b> (chỉ xem)`;};}
{const lo=A.logout;A.logout=async()=>{try{localStorage.removeItem(OFF_KEY);}catch(e){}return lo();};}
