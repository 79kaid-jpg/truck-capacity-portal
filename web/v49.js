// v3.30: tải phần thay đổi (delta) thay vì toàn bộ · hỏi "có gì mới" nhanh hơn khi đang dùng · ghi lượng dữ liệu + lỗi trình duyệt · Sức khỏe hệ thống
// nút trợ lý không che góc kéo co giãn của lưới đặt hàng (khung lớn) → chuyển sang góc trái
(()=>{const st=document.createElement('style');st.textContent='body:has(.scrim .modal.xl) #chatFab{right:auto;left:18px}';document.head.appendChild(st);})();
// ---------- đo lượng dữ liệu, lỗi ----------
const USG={full:{calls:0,bytes:0},delta:{calls:0,bytes:0},poll:{calls:0,bytes:0},errors:[],last:Date.now()};
const usgAdd=(k,obj)=>{try{USG[k].calls++;USG[k].bytes+=JSON.stringify(obj||'').length;}catch(e){}};
function usgFlush(force){if(!S||!sb)return;const has=USG.full.calls+USG.delta.calls+USG.poll.calls+USG.errors.length;if(!has||(!force&&Date.now()-USG.last<300000))return;
 const p={usage:{},errors:USG.errors.splice(0),ver:window.APP_V||''};['full','delta','poll'].forEach(k=>{if(USG[k].calls){p.usage[k]={...USG[k]};USG[k]={calls:0,bytes:0};}});USG.last=Date.now();
 rpc('log_usage',{p}).catch(()=>{});}
const ERRSEEN=new Set();
function errPush(msg,src){msg=String(msg||'').slice(0,500);if(!msg||ERRSEEN.has(msg)||ERRSEEN.size>30)return;ERRSEEN.add(msg);USG.errors.push({msg,src:String(src||'').slice(0,300)});}
addEventListener('error',e=>errPush(e.message,(e.filename||'').split('/').pop()+':'+e.lineno));
addEventListener('unhandledrejection',e=>{const r=e.reason;const m=r&&r.message||String(r);if(/Failed to fetch|NetworkError|Load failed/i.test(m))return;errPush(m,'promise');});
setInterval(()=>usgFlush(false),60000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)usgFlush(true);});
// ---------- delta ----------
let RAW=null,LAST_FULL=0;
{const a0=adopt;adopt=function(st){RAW=st;return a0(st);};}
const rangeNow=()=>{const[y,m]=V.ym;const ms=iso(y,m,1),me_=iso(y,m,dim(y,m));return [addDays(ms<TODAY?ms:TODAY,-7),addDays(me_>TODAY?me_:TODAY,21)];};
function applyDelta(d){const ch=new Set(d.changed||[]);
 // giữ nguyên thứ tự cũ (đơn sửa thay đúng chỗ) để danh sách không nhảy
 const nb=new Map((d.bookings||[]).map(b=>[b.id,b]));const keep=[];(RAW.bookings||[]).forEach(b=>{if(nb.has(b.id)){keep.push(nb.get(b.id));nb.delete(b.id);}else if(!ch.has(b.id))keep.push(b);});RAW.bookings=keep.concat([...nb.values()]);
 RAW.allocs=(RAW.allocs||[]).filter(a=>!ch.has(a.bk)).concat(d.allocs||[]);
 RAW.audit=(RAW.audit||[]).filter(a=>!ch.has(a.obj)).concat(d.audit||[]).sort((a,b)=>b.at-a.at);
 if(d.reqs)RAW.reqs=d.reqs;if(d.talk)RAW.talk=d.talk;if(d.notifs)RAW.notifs=d.notifs;
 RAW.ver=d.ver;RAW.today=d.today;RAW.now=d.now;VER=d.ver;TODAY=d.today;
 S=adopt(RAW);S.ver=(reload.n=(reload.n||0)+1);V.stats=null;}
{const r0=reload;reload=async function(force){const [from,to]=rangeNow();
 if(reload.forceNext){reload.forceNext=false;force=true;}
 const ok=!force&&RAW&&RAW.me&&RAW.me.role!=='customer'&&!RAW.custView&&VER&&VER.s!=null&&RANGE.from===from&&RANGE.to===to&&Date.now()-LAST_FULL<600000;
 if(ok){try{const d=await rpc('get_delta',{p_since:+VER.d,p_from:from,p_to:to,p_s:+VER.s,p_c:+VER.c,p_m:+VER.m,p_n:+VER.n});
   if(d&&d.full===false){usgAdd('delta',d);applyDelta(d);reload.lastKind='delta';return;}}catch(e){}}
 await r0();LAST_FULL=Date.now();reload.lastKind='full';if(RAW)usgAdd('full',RAW);};}
// xác thực 2 lớp nằm ngoài dữ liệu app → tải đầy đủ
Object.keys(A).filter(k=>/^mfa/.test(k)).forEach(k=>{const f=A[k];A[k]=function(...a){reload.forceNext=true;return f.apply(this,a);};});
// ---------- hỏi "có gì mới" thường hơn khi đang thao tác (10 giây), 30 giây khi để yên ----------
let LAST_ACT=Date.now();['pointerdown','keydown','scroll','touchstart'].forEach(ev=>addEventListener(ev,()=>{LAST_ACT=Date.now();},{passive:true,capture:true}));
setInterval(()=>{if(!S||document.hidden||Date.now()-LAST_ACT>120000)return;usgAdd('poll',{d:1});poll(false);},10000);
// không vẽ lại khi đang kéo thả đơn vào xe
let PTR_DOWN=false;addEventListener('pointerdown',()=>{PTR_DOWN=true;},true);addEventListener('pointerup',()=>{PTR_DOWN=false;},true);addEventListener('pointercancel',()=>{PTR_DOWN=false;},true);
{const p0=poll;poll=async function(t){if(PTR_DOWN||typeof DND!=='undefined'&&DND.drag)return;return p0(t);};}
// ---------- Sức khỏe hệ thống (Bảng thống kê → Hệ thống) ----------
const HL={d:null,busy:false,at:0};
const mb=b=>b/1048576;
function healthHtml(){if(!can('dash.system'))return '';if(!HL.d&&!HL.busy||Date.now()-HL.at>120000&&!HL.busy){HL.busy=true;rpc('sys_health').then(x=>{HL.d=x;HL.at=Date.now();HL.busy=false;render();}).catch(()=>{HL.busy=false;});}
 const X=HL.d;if(!X)return '<div class="dcard"><h3>SỨC KHỎE HỆ THỐNG (GÓI MIỄN PHÍ)</h3><div class="empty">Đang tải…</div></div>';
 const U=X.usage||{},est=b=>mb(b)/8; // JSON nén khi truyền ~8 lần
 const monthEst=est((U.month||{}).bytes||0),d7=est((U.d7||{}).bytes||0),proj=d7/7*30;
 return `<div class="dcard"><h3>SỨC KHỎE HỆ THỐNG (GÓI MIỄN PHÍ)</h3><p class="cap">Băng thông là ước tính từ dữ liệu ứng dụng tải về (đã tính nén). Số chính xác xem ở Supabase → Usage.</p>
  ${meter('Băng thông tháng này (ước tính)',+monthEst.toFixed(1),5120,'MB',`7 ngày qua ${d7.toFixed(1)} MB · cả tháng theo nhịp này ≈ ${proj.toFixed(0)} MB${proj>4096?' – <b style="color:var(--bad)">nguy cơ vượt 5 GB</b>':''}`)}
  ${meter('Dung lượng database',+X.dbMb,500,'MB',(X.tables||[]).slice(0,4).map(t=>esc(t[0])+' '+t[1]+' MB').join(' · ')+(X.files&&X.files.n?` · ảnh Trao đổi: ${X.files.n} ảnh, ${X.files.mb} MB`:''))}
  ${meter('Lượt trợ lý hôm nay',+X.aiToday,+X.aiCap,'lượt','')}
  <div class="small" style="margin-top:8px">Tải dữ liệu 7 ngày: ${Object.entries(X.byKind||{}).map(([k,v])=>`${k==='full'?'toàn bộ':k==='delta'?'phần thay đổi':'hỏi có gì mới'} ${v.calls} lần / ${est(v.bytes).toFixed(1)} MB`).join(' · ')||'chưa có'}${(X.topUsers||[]).length?'<br>Dùng nhiều nhất: '+X.topUsers.map(u=>esc(u[0]||'?')+' '+est(u[1]).toFixed(1)+' MB').join(', '):''}</div>
  <h3 style="margin-top:14px">LỖI NGƯỜI DÙNG GẶP (30 NGÀY)</h3>${(X.errors||[]).length?`<div class="tbl-wrap"><table><thead><tr><th>Lúc</th><th>Người dùng</th><th>Lỗi</th><th>Nơi</th><th class="r">Số lần</th></tr></thead><tbody>${X.errors.map(e=>`<tr><td class="num">${clockStr(e.at)}</td><td>${esc(e.who||'')}</td><td>${esc(e.msg)}</td><td class="small muted">${esc(e.src||'')} ${esc(e.ver||'')}</td><td class="r num">${e.n}</td></tr>`).join('')}</tbody></table></div>`:'<div class="small muted">Chưa ghi nhận lỗi nào. 👍</div>'}</div>`;}
if(typeof dashSystem==='function'){const d0=dashSystem;dashSystem=function(){return healthHtml()+d0();};}
