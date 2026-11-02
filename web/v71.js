// v3.60: Tự cập nhật + hướng dẫn cài app lên màn hình chính.
// Cập nhật: có bản mới thì tự tải lại khi an toàn (vừa mở lại app, hoặc 30 giây không thao tác, không có cửa sổ / bảng đang nhập),
//   giữ nguyên màn đang xem, báo "Đã cập nhật". Đang nhập dở thì vẫn hiện dải nhắc như cũ.
//   Bản bắt buộc ("force": true trong version.json): đếm ngược 60 giây, không có nút Để sau; đang nhập dở thì chờ lưu xong.
//   Menu tên → "Có gì mới" đọc web/changelog.json.
// Cài app: hướng dẫn theo đúng trình duyệt (Safari / Chrome iPhone / Chrome Android / Samsung Internet / Zalo, Facebook / máy tính),
//   hình minh họa từng bước, mã QR trên máy tính, link ở màn đăng nhập.
(()=>{const st=document.createElement('style');st.textContent=`
#ov71{position:fixed;inset:0;z-index:95;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,15,22,.5)}
#ov71 .box{background:var(--surface);color:var(--ink);border-radius:14px;box-shadow:var(--shadow);width:min(520px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:18px 20px;display:flex;flex-direction:column;gap:12px}
#ov71 .hd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
#ov71 h2{margin:0;font-family:var(--f-display);font-size:19px}
#ov71 .x{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:8px;min-width:40px;min-height:40px;font:inherit;cursor:pointer}
#ov71 p{margin:0}
.st71{list-style:none;margin:0;padding:0;display:grid;gap:10px;counter-reset:s}
.st71 li{display:grid;grid-template-columns:28px 56px 1fr;gap:10px;align-items:center;counter-increment:s}
.st71 li::before{content:counter(s);width:28px;height:28px;border-radius:50%;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;font-weight:700;font-size:13px}
.st71 .pic{width:56px;height:56px;border-radius:12px;border:1px solid var(--line);background:var(--sand);display:grid;place-items:center;color:var(--ink)}
.st71 .pic.app{background:var(--primary);color:var(--on-primary);border-color:var(--primary)}
.qr71{display:flex;gap:14px;align-items:center;flex-wrap:wrap;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--sand)}
.qr71 .q{width:132px;height:132px;background:#fff;border-radius:8px;display:grid;place-items:center;padding:6px;flex:none}
.qr71 .q img,.qr71 .q svg{width:120px;height:120px;image-rendering:pixelated}
.cp71{display:flex;gap:6px}.cp71 input{flex:1;min-width:0}
.ft71{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.log71{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.log71 li{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;padding:8px 10px;border-radius:8px;background:var(--sand)}
.log71 b{font-family:var(--f-display)}.log71 .d{color:var(--muted);font-size:12px;grid-column:2}
.log71 li.cur{outline:2px solid var(--primary)}
.inst71-login{margin-top:12px;display:flex;justify-content:center}
#updbar .cd71{font-variant-numeric:tabular-nums;font-weight:700}
`;document.head.appendChild(st);})();

// ---------- hộp thoại riêng (dùng được cả khi chưa đăng nhập) ----------
let OV71_back=null;
function ov71(html){ov71Close();OV71_back=document.activeElement;const o=document.createElement('div');o.id='ov71';
 o.innerHTML=`<div class="box" role="dialog" aria-modal="true" aria-labelledby="ov71-h">${html}</div>`;document.body.appendChild(o);
 o.addEventListener('click',e=>{if(e.target===o||e.target.closest('[data-ov71="x"]'))ov71Close();});
 const f=o.querySelector('.x');if(f)f.focus();}
function ov71Close(){const o=document.getElementById('ov71');if(o){o.remove();if(OV71_back&&OV71_back.focus)try{OV71_back.focus();}catch(e){}}}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('ov71')){e.stopPropagation();ov71Close();}},true);
const hd71=t=>`<div class="hd"><h2 id="ov71-h">${t}</h2><button class="x" data-ov71="x" aria-label="Đóng">✕</button></div>`;

// ================= TỰ CẬP NHẬT =================
const U71={last:Date.now(),resumed:Date.now(),force:false,cd:0,t:null,note:''};
const U71_IDLE=30000,U71_FORCE=60,U71_KEY='tcp-upd71';
['pointerdown','keydown','input','wheel','touchstart'].forEach(ev=>addEventListener(ev,()=>{U71.last=Date.now();},{capture:true,passive:true}));
// Có đang nhập / thao tác dở không?
function busy71(){if(!S)return true;if(V.modal||V.busy||V.offline)return true;
 if(typeof dirty62==='function'&&dirty62())return true;
 const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!a.closest('#updbar'))return true;
 if(document.getElementById('ov71')||(typeof M61!=='undefined'&&M61.more)||V.m68)return true;
 if(typeof LX!=='undefined'&&(LX.pick||LX.drag||LX.sheet))return true;
 return false;}
// Kiểm tra version.json (thay hàm cũ: thêm cờ force)
updCheck=async function(){if(APP_V==='dev'||!navigator.onLine)return;try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
 if(j&&j.v&&j.v!==APP_V){UPD.v=j.v;UPD.note=j.note||'';U71.force=!!j.force;updShow();}}catch(e){}};
{const s0=updShow;updShow=function(){if(!UPD.v)return;if(U71.force){u71ForceBar();return;}s0();};}
function u71Save(){try{sessionStorage.setItem(U71_KEY,JSON.stringify({ts:Date.now(),from:APP_V,to:UPD.v,note:UPD.note,view:V.view,wh:V.wh,ym:V.ym,day:V.day,bk:V.bk,y:scrollY}));}catch(e){}}
function u71Apply(){if(U71.applying)return;U71.applying=true;u71Save();updApply();}
function u71ForceBar(){let b=document.getElementById('updbar');if(!b){b=document.createElement('div');b.id='updbar';b.setAttribute('role','status');document.body.appendChild(b);}
 if(U71.cd==null)U71.cd=U71_FORCE;
 b.innerHTML=busy71()&&U71.cd<=0?`<span>Bản cập nhật bắt buộc <b>${esc(UPD.v)}</b>: lưu hoặc đóng phần đang nhập, ứng dụng sẽ tự tải lại.</span><button class="go" id="upd71-go">Tải lại ngay</button>`
  :`<span>Bản cập nhật bắt buộc <b>${esc(UPD.v)}</b>${UPD.note?' · '+esc(UPD.note):''}. Tự tải lại sau <span class="cd71">${Math.max(0,U71.cd)}</span> giây.</span><button class="go" id="upd71-go">Tải lại ngay</button>`;}
document.addEventListener('click',e=>{if(e.target.id==='upd71-go'){if(busy71()&&V.modal&&/grid|bf|rqNew/.test(V.modal.type)){toast('Lưu hoặc đóng cửa sổ đang nhập trước khi tải lại.');return;}u71Apply();}});
// Mỗi giây: tự áp dụng khi an toàn
setInterval(()=>{if(!UPD.v||UPD.v===APP_V||U71.applying)return;
 const now=Date.now(),busy=busy71();
 if(U71.force){U71.cd=Math.max(0,(U71.cd==null?U71_FORCE:U71.cd)-1);if(U71.cd<=0&&!busy)return u71Apply();u71ForceBar();return;}
 if(busy)return;
 if(now-U71.resumed<15000||now-U71.last>=U71_IDLE)u71Apply();},1000);
// Mở lại app (chuyển tab / mở từ màn hình chính) → kiểm tra ngay
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){U71.resumed=Date.now();updCheck();}});
addEventListener('pageshow',()=>{U71.resumed=Date.now();});
setInterval(()=>updCheck(),2*60*1000);
// Sau khi tải lại: trả về đúng màn đang xem + báo đã cập nhật
let U71_restore=null;try{U71_restore=JSON.parse(sessionStorage.getItem(U71_KEY)||'null');sessionStorage.removeItem(U71_KEY);}catch(e){}
if(U71_restore&&Date.now()-U71_restore.ts>5*60*1000)U71_restore=null;
{const r0=render;render=function(){r0();if(!S||!U71_restore)return;const o=U71_restore;U71_restore=null;
 if(o.wh)V.wh=o.wh;if(o.day)V.day=o.day;if(o.bk)V.bk=o.bk;if(o.view&&o.view!=='booking'||o.bk)V.view=o.view;
 const msg=`Đã cập nhật lên bản ${APP_V}${o.note&&o.to===APP_V?' · '+o.note:''}`;
 const done=()=>{render();try{scrollTo(0,o.y||0);}catch(e){}toast(msg);};
 if(Array.isArray(o.ym)&&(o.ym[0]!==V.ym[0]||o.ym[1]!==V.ym[1])){V.ym=o.ym;reload().then(done).catch(()=>done());}else setTimeout(done,0);};}

// ---------- Có gì mới ----------
A.log71=async()=>{V.menu=false;render();ov71(hd71('Có gì mới')+'<p class="muted small">Đang tải…</p>');
 let log=[];try{const r=await fetch('changelog.json?t='+Date.now(),{cache:'no-store'});if(r.ok)log=await r.json();}catch(e){}
 const box=document.querySelector('#ov71 .box');if(!box)return;
 box.innerHTML=hd71('Có gì mới')+`<p class="small muted">Bạn đang dùng bản <b>${esc(APP_V)}</b>. Ứng dụng tự cập nhật khi có bản mới.</p>`
  +(log.length?`<ul class="log71">${log.slice(0,12).map(x=>`<li class="${x.v===APP_V?'cur':''}"><b class="num">${esc(x.v)}</b><span>${esc(x.note||'')}</span>${x.date?`<span class="d num">${esc(x.date.split('-').reverse().join('/'))}</span>`:''}</li>`).join('')}</ul>`:'<p class="muted">Chưa có danh sách thay đổi.</p>')
  +'<div class="ft71"><button class="btn sm" data-ov71="x">Đóng</button></div>';};

// ================= HƯỚNG DẪN CÀI APP =================
const ua71=()=>navigator.userAgent||'';
const inApp71=()=>/Zalo|FBAN|FBAV|FB_IAB|Instagram|Line\/|Messenger|MicroMessenger|TikTok/i.test(ua71())||(/Android/i.test(ua71())&&/; wv\)/.test(ua71()));
function br71(){const u=ua71();
 if(instStandalone())return 'done';
 if(inApp71())return 'inapp';
 if(instIOS())return /CriOS|EdgiOS|FxiOS/i.test(u)?'iosother':'ios';
 if(/Android/i.test(u))return /SamsungBrowser/i.test(u)?'samsung':'android';
 return 'desktop';}
const svg71=(p,w=28)=>`<svg viewBox="0 0 24 24" width="${w}" height="${w}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const P71={
 share:'<path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M8 10H5v11h14V10h-3"/>',
 plus:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
 kebab:'<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
 burger:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 dots:'<circle cx="5" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="19" cy="12" r="1.4" fill="currentColor"/>',
 install:'<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M12 7v7M9 11l3 3 3-3"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'};
const appPic71=()=>`<span class="pic app">${typeof IC!=='undefined'&&IC.truck?IC.truck.replace('<svg','<svg width="30" height="30"'):svg71(P71.check)}</span>`;
const step71=(pic,txt)=>`<li>${pic.startsWith('<span')?pic:`<span class="pic">${svg71(P71[pic])}</span>`}<span>${txt}</span></li>`;
const url71=()=>location.origin+location.pathname;
const copy71=()=>`<div class="cp71"><input class="inp" id="inst71-url" readonly value="${esc(url71())}" aria-label="Link ứng dụng"><button class="btn sm" data-inst71="copy">Sao chép link</button></div>`;
function body71(){const b=br71();
 if(b==='done')return `<p>Bạn đang dùng Đặt Xe ở dạng ứng dụng rồi. Lần sau mở từ biểu tượng <b>Đặt Xe</b> trên màn hình chính.</p>`;
 if(b==='inapp')return `<p>Bạn đang mở link trong <b>Zalo / Facebook / Messenger</b>. Trình duyệt trong các ứng dụng này không cài được. Hãy mở bằng trình duyệt của máy:</p>
  <ol class="st71">${step71('dots','Bấm <b>⋯</b> (hoặc <b>⋮</b>) ở góc trên bên phải.')}${step71('globe',`Chọn <b>Mở bằng trình duyệt</b> (${instIOS()?'Safari':'Chrome'}).`)}${step71('install','Trong trình duyệt, bấm lại <b>Cài app lên điện thoại</b> và làm theo hướng dẫn.')}</ol>
  <p class="small muted">Không thấy mục đó: sao chép link rồi dán vào ${instIOS()?'Safari':'Chrome'}.</p>${copy71()}`;
 if(b==='ios')return `<ol class="st71">${step71('share','Bấm nút <b>Chia sẻ</b> ở thanh dưới của Safari (iPad: góc trên bên phải).')}${step71('plus','Kéo xuống, chọn <b>Thêm vào MH chính</b>.')}${step71(appPic71(),'Bấm <b>Thêm</b>. Biểu tượng <b>Đặt Xe</b> xuất hiện trên màn hình chính, mở từ đó như ứng dụng.')}</ol>`;
 if(b==='iosother')return `<ol class="st71">${step71('share','Bấm nút <b>Chia sẻ</b> cạnh ô địa chỉ (Chrome: góc trên bên phải).')}${step71('plus','Chọn <b>Thêm vào MH chính</b>.')}${step71(appPic71(),'Bấm <b>Thêm</b>. Biểu tượng <b>Đặt Xe</b> xuất hiện trên màn hình chính.')}</ol>
  <p class="small muted">Không thấy mục <b>Thêm vào MH chính</b> (iOS cũ hơn 16.4): mở link bằng <b>Safari</b> rồi làm lại.</p>${copy71()}`;
 if(b==='samsung')return `<ol class="st71">${step71('burger','Bấm <b>☰</b> ở thanh dưới của Samsung Internet.')}${step71('plus','Chọn <b>Thêm trang vào</b> → <b>Màn hình chờ</b>.')}${step71(appPic71(),'Bấm <b>Thêm</b>. Biểu tượng <b>Đặt Xe</b> xuất hiện trên màn hình chính.')}</ol>`;
 if(b==='android')return (INST.ev?`<p>Bấm <b>Cài ngay</b> rồi chọn <b>Cài đặt</b>.</p>`:'')+`<ol class="st71">${step71('kebab','Bấm <b>⋮</b> ở góc trên bên phải của Chrome.')}${step71('install','Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>).')}${step71(appPic71(),'Bấm <b>Cài đặt</b>. Biểu tượng <b>Đặt Xe</b> xuất hiện trên màn hình chính.')}</ol>`;
 return `<div class="qr71"><span class="q" id="qr71" aria-label="Mã QR link ứng dụng"></span><span style="flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px"><b>Cài lên điện thoại</b><span class="small">Mở camera điện thoại, quét mã này để mở Đặt Xe, rồi bấm <b>Cài app lên điện thoại</b> trên điện thoại.</span></span></div>
  <p><b>Cài trên máy tính</b> (Chrome, Edge): ${INST.ev?'bấm <b>Cài trên máy tính</b> bên dưới.':'bấm biểu tượng <b>Cài đặt</b> '+svg71(P71.install,18)+' ở cuối ô địa chỉ, hoặc menu <b>⋮</b> → <b>Cài đặt Đặt Xe</b>.'}</p>${copy71()}`;}
function inst71Open(){const b=br71();
 const go=INST.ev&&b!=='done'?`<button class="btn sm" data-inst71="prompt">${b==='desktop'?'Cài trên máy tính':'Cài ngay'}</button>`:'';
 ov71(hd71('Cài Đặt Xe lên màn hình chính')+`<p class="small muted">Mở nhanh từ biểu tượng, toàn màn hình như ứng dụng, không cần tải từ kho ứng dụng, tự cập nhật bản mới.</p>${body71()}<div class="ft71">${go}<button class="btn ghost sm" data-ov71="x">Đã hiểu</button></div>`);
 if(b==='desktop')qr71();}
// Mã QR: thư viện qrcode-generator (jsDelivr), tải khi cần; không tải được thì chỉ còn link
let QR71=null;
function qr71(){const el=document.getElementById('qr71');if(!el)return;
 const draw=()=>{try{const q=qrcode(0,'M');q.addData(url71());q.make();el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true});}catch(e){el.textContent='';}};
 if(typeof qrcode==='function')return draw();
 if(!QR71)QR71=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s);});
 QR71.then(()=>{if(typeof qrcode==='function')draw();}).catch(()=>{});}
document.addEventListener('click',async e=>{const t=e.target.closest('[data-inst71]');if(!t)return;const k=t.dataset.inst71;
 if(k==='copy'){const i=document.getElementById('inst71-url');try{await navigator.clipboard.writeText(i.value);}catch(_){i.select();try{document.execCommand('copy');}catch(__){}}t.textContent='Đã sao chép';}
 else if(k==='prompt'&&INST.ev){const ev=INST.ev;INST.ev=null;ov71Close();try{await ev.prompt();const r=await ev.userChoice;if(r&&r.outcome==='accepted')INST.done=true;}catch(_){}if(S)render();}
 else if(k==='open')inst71Open();});
// Nút cài cũ (menu tên, dải nhắc) → hộp hướng dẫn mới
A.instGo=async()=>{if(typeof instBarHide==='function')instBarHide();instLS('tcp-inst-nag',String(Date.now()));V.menu=false;if(S)render();inst71Open();};
// Màn đăng nhập: link cài app (chưa cài)
function login71(){if(instStandalone())return;const f=document.getElementById('login');if(f&&!document.querySelector('.inst71-login')){const d=document.createElement('div');d.className='inst71-login';d.innerHTML='<button type="button" class="linkbtn" data-inst71="open">Cài app lên điện thoại</button>';f.after(d);}}
{const sl=showLogin;showLogin=function(...a){sl.apply(this,a);login71();};}
// boot() có thể đã vẽ màn đăng nhập trước khi file này nạp
login71();addEventListener('load',login71);setTimeout(login71,500);
// Menu tên: Có gì mới + số phiên bản
{const r0=render;render=function(){r0();if(!S)return;const m=document.querySelector('.top .menu');
 if(m&&!m.querySelector('.log71b')){const a=document.createElement('button');a.className='log71b';a.dataset.a='log71';a.textContent=`Có gì mới · bản ${APP_V}`;
  a.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:0;color:inherit;font:inherit;cursor:pointer';
  const lo=m.querySelector('[data-a="logout"]');m.insertBefore(a,lo||null);}
 if(m&&!instStandalone()&&!INST.done&&!m.querySelector('.instlink')){const a=document.createElement('button');a.className='instlink';a.dataset.a='instGo';a.textContent='Cài app lên điện thoại';
  a.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:0;color:inherit;font:inherit;font-weight:600;cursor:pointer';
  m.insertBefore(a,m.querySelector('.log71b'));}};}
