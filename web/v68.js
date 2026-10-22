// v3.56: Điện thoại (≤ 700px) – giao diện thống nhất kiểu app.
// Thanh trên: nút quay lại + tên màn 1 dòng (+ dòng phụ), Trợ lý thành biểu tượng trên thanh (bỏ nút chat nổi);
// nội dung tràn ngang (bỏ khung trắng lồng); tiêu đề mục chữ thường; 3 cấp nút: chính ở thanh đáy, phụ viền, còn lại vào ⋯;
// danh sách booking / chờ xếp xe dạng dòng; lịch gọn đầu màn, "+ Đặt hàng" cố định ở đáy; phản hồi khi chạm; mục đang chọn
// ở thanh dưới có nền viên thuốc. Máy tính giữ nguyên.
(()=>{const st=document.createElement('style');st.textContent=`
.ttl68,.ast68,.m68btn,.act68,.list68,.menu68{display:none}
@media (max-width:700px){
 .top{gap:2px!important;padding-left:6px!important;padding-right:6px!important}
 .top .logo{display:none!important}
 .top.t68 .ctx{display:none!important}
 .ttl68{display:flex;align-items:center;flex:1 1 auto;min-width:0;gap:2px}
 .ttl68 .tt{display:flex;flex-direction:column;min-width:0;padding-left:8px}
 .ttl68 h1{margin:0;font-size:17px;font-weight:700;line-height:1.2;color:var(--on-navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:var(--f-body);letter-spacing:0;text-transform:none}
 .ttl68 small{font-size:12px;color:color-mix(in srgb,var(--on-navy) 78%,transparent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .ttl68 button,.ast68,.m68btn{flex:none;width:44px;height:44px;border:0;border-radius:22px;background:transparent;color:var(--on-navy);display:inline-grid;place-items:center;font-size:22px;line-height:1;padding:0}
 .ttl68 button svg,.ast68 svg,.m68btn svg{width:22px;height:22px}
 .ast68,.m68btn{display:inline-grid}
 #chatFab{display:none!important}
 .main{padding-left:0!important;padding-right:0!important}
 .main>.panel{border:0!important;border-radius:0!important;box-shadow:none!important;padding:12px 16px!important;background:transparent!important}
 .main .crumb{display:none!important}
 .main .dayhead h2,.main.bk68 .pagehead h2{display:none!important}
 .main h3,.main h4,.main .grp>h3,.main .rgrp h4{text-transform:none!important;letter-spacing:0!important}
 button:active,.btn:active,a.btn:active,.row68:active{filter:brightness(.93);transform:scale(.98)}
 @media (prefers-reduced-motion:reduce){button:active,.btn:active,.row68:active{transform:none}}
 .bnav61{padding-bottom:env(safe-area-inset-bottom)}
 .bnav61 button.on::before{display:none}
 .bnav61 button.on svg{box-sizing:content-box;padding:6px 18px;border-radius:16px;background:var(--mine-bg);color:var(--ink)}
 /* thao tác chính cố định ở đáy, trên thanh menu */
 .act68{display:flex;gap:10px;position:fixed;left:0;right:0;bottom:var(--bn68,56px);z-index:55;padding:10px 16px;background:var(--surface);border-top:1px solid var(--line)}
 .act68 .btn{flex:1;min-height:48px!important;border-radius:24px;font-weight:700;justify-content:center}
 .act68 .btn.p68{flex:2;background:var(--primary);color:var(--on-primary);border-color:var(--primary)}
 .act68 .btn:not(.p68){background:var(--surface);color:var(--ink);border:1px solid var(--line)}
 .main.a68{padding-bottom:calc(var(--bn68,56px) + 96px)!important}
 /* menu ⋯ */
 .menu68{display:flex;flex-direction:column;position:fixed;right:8px;top:52px;z-index:80;min-width:230px;max-width:calc(100vw - 16px);padding:6px;border-radius:12px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)}
 .menu68>*{display:flex!important;align-items:center;gap:10px;width:100%;min-height:44px;margin:0!important;padding:0 10px!important;border:0!important;border-radius:8px!important;background:transparent!important;color:var(--ink)!important;font:inherit!important;font-size:15px!important;font-weight:500!important;text-align:left;text-decoration:none!important;box-shadow:none!important}
 .menu68>*:hover{background:var(--sand)!important}
 .menu68 .ic53 svg{width:20px;height:20px}
 /* danh sách dạng dòng */
 .list68{display:flex;flex-direction:column;border-radius:12px;background:var(--surface);border:1px solid var(--line);overflow:hidden}
 .card61.has68{display:none!important}
 .row68{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-bottom:1px solid var(--line);cursor:pointer;color:var(--ink)}
 .row68:last-child{border-bottom:0}
 .row68 .l1{display:flex;align-items:baseline;gap:8px}.row68 .l1 b:first-child{flex:1;min-width:0;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row68 .l1 b:last-child{font-size:15px;white-space:nowrap}
 .row68 .l2{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}.row68 .l2 .m{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .row68 .l3{display:flex;gap:8px;margin-top:4px}.row68 .l3 .btn{min-height:44px}
 /* lịch */
 .cal68 .calhead .illus{display:none!important}
 .cal68 .calhead{display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:6px;margin-bottom:6px}
 .cal68 .calhead .monthnav{flex:1;min-width:0}
 .cal68 .calhead .monthnav h1{font-size:18px!important;text-transform:none;white-space:nowrap}
 .cal68 .calhead [data-a="newBk"]{display:none!important}
 .cal68 .calhead .whsel>span{display:none}
 .cal68 .calhead .whsel select{max-width:110px}
 .cal68 .cal36bar{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}
 .cal68 .cal36bar::-webkit-scrollbar{display:none}
 .cal68 .cal36bar>*{flex:none}
 .top .gsbtn,.top>[data-a="guide"]{width:44px!important;min-width:44px;height:44px!important;padding:0!important;margin:0!important;border:0!important;border-radius:22px!important;background:transparent!important;color:var(--on-navy)!important;display:inline-grid!important;place-items:center;box-shadow:none!important}
 .top .gsbtn>span,.top .gsbtn kbd{display:none!important}
 .top.sub68 .gsbtn,.top.sub68>[data-a="guide"],.top.sub68 .ast68,.top.sub68 .userbtn{display:none!important}
 .main .pagehead h2{display:none!important}
 .main .qadd{width:44px!important;height:44px!important;min-width:44px;border-radius:10px!important;border:1px solid var(--line)!important;background:var(--surface)!important;color:var(--ink)!important;box-shadow:none!important;font-size:20px!important}
}`;document.head.appendChild(st);})();

const ph68=()=>matchMedia('(max-width:700px)').matches;
const IC68={back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
 ast:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 19l1.6-4.2A7.5 7.5 0 1 1 9 18.5z"/></svg>',
 more:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'};
const T68={calendar:'Lịch',bookings:'Booking',approvals:'Chờ xếp xe',fleet:'Khai báo xe',config:'Cấu hình',users:'Người dùng',notifs:'Thông báo',dash:'Thống kê',
 mywork:'Việc của tôi',talk:'Trao đổi',myorders:'Đơn của tôi',profile:'Tài khoản',perms:'Phân quyền',yard:'Chế độ kho'};
const EMO68=/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]️?\s*/gu;
function title68(){const v=V.view;
 if(v==='day'&&V.day){const w=WHALL.find(x=>x.id===V.wh);return{t:`${WDS[dow(V.day)]} ${dm(V.day)} · ${V.wh}`,s:(w?w.short:'')+(V.day===TODAY?' · hôm nay':''),back:{a:'go',v:'calendar',l:'Về lịch'},day:true};}
 if(v==='booking'&&V.bk){const b=bkById(V.bk);const c=b&&cust(b.customerId);return{t:V.bk,s:c?c.name:'',back:{a:'back',l:'Quay lại'}};}
 const nv=(typeof NAV!=='undefined'?NAV:[]).find(n=>n.v===v);return{t:T68[v]||(nv&&nv.l)||'Đặt Xe'};}
let lv68='';
{const r0=render;render=function(){if(S&&V.view!==lv68){V.m68=false;lv68=V.view;}r0();if(!S)return;const top=document.querySelector('.top');const main=document.querySelector('.main');
 document.querySelectorAll('.act68,.menu68').forEach(x=>x.remove());
 if(!ph68()||!top||!main)return;
 // ---- thanh trên ----
 top.classList.add('t68');const T=title68();top.classList.toggle('sub68',!!T.back);
 if(!top.querySelector('.ttl68')){const d=document.createElement('div');d.className='ttl68';
  d.innerHTML=(T.back?`<button type="button" data-a="${T.back.a}" ${T.back.v?`data-v="${T.back.v}"`:''} aria-label="${T.back.l}">${IC68.back}</button>`:'')+
   `<div class="tt"><h1>${esc(T.t)}</h1>${T.s?`<small>${esc(T.s)}</small>`:''}</div>`+
   (T.day?`<button type="button" data-a="dayNav" data-d="-1" aria-label="Ngày trước">‹</button><button type="button" data-a="dayNav" data-d="1" aria-label="Ngày sau">›</button>`:'');
  const lg=top.querySelector('.logo');(lg&&lg.nextSibling?top.insertBefore(d,lg.nextSibling):top.prepend(d));}
 const fab=document.getElementById('chatFab');const gs=top.querySelector('.gsbtn');
 if(fab&&!top.querySelector('.ast68')){const b=document.createElement('button');b.type='button';b.className='ast68';b.dataset.a='ast68';b.setAttribute('aria-label','Trợ lý');b.innerHTML=IC68.ast;
  const g=top.querySelector('[data-a="guide"]');top.insertBefore(b,g||top.querySelector('.userbtn'));}
 const bn=document.querySelector('.bnav61');if(bn)document.documentElement.style.setProperty('--bn68',bn.getBoundingClientRect().height+'px');
 main.classList.toggle('bk68',V.view==='booking');main.classList.toggle('cal68',V.view==='calendar'&&role()!=='customer');main.classList.remove('a68');
 // ---- chi tiết booking: thao tác chính ở đáy, còn lại vào ⋯ ----
 if(V.view==='booking'){const h=main.querySelector('.pagehead');if(h){
  const pri=[h.querySelector('[data-a="editBk"]'),...h.querySelectorAll('.v9acts button')].filter(Boolean);
  const keep=pri.slice(0,2);const rest=[...h.querySelectorAll('button,a')].filter(x=>!keep.includes(x));
  if(keep.length&&!V.modal){const bar=document.createElement('div');bar.className='act68';keep.forEach((x,i)=>{x.classList.add('btn');if(i===keep.length-1&&keep.length>1||keep.length===1&&x.dataset.a!=='editBk')x.classList.add('p68');
    if(x.dataset.a==='editBk')x.textContent='Sửa';bar.appendChild(x);});document.body.appendChild(bar);main.classList.add('a68');}
  rest.forEach(x=>{x.innerHTML=x.innerHTML.replace(EMO68,'').replace(/^(\s|&nbsp;)+/,'');});
  if(rest.length&&!top.querySelector('.m68btn')){const m=document.createElement('button');m.type='button';m.className='m68btn';m.dataset.a='m68';m.setAttribute('aria-label','Thêm thao tác');m.setAttribute('aria-expanded',V.m68?'true':'false');m.innerHTML=IC68.more;
   top.insertBefore(m,top.querySelector('.ast68')||top.querySelector('.userbtn'));}
  if(V.m68&&rest.length){const menu=document.createElement('div');menu.className='menu68';menu.setAttribute('role','menu');rest.forEach(x=>{x.setAttribute('role','menuitem');menu.appendChild(x);});document.body.appendChild(menu);}
  else rest.forEach(x=>x.style.display='none');}}
 // ---- lịch: kho chỉ hiện mã; "+ Đặt hàng" cố định ở đáy ----
 if(V.view==='calendar')main.querySelectorAll('.calhead .whsel select option').forEach(o=>{if(o.value&&o.value!=='__all')o.textContent=o.value;});
 if(V.view==='calendar'&&role()!=='customer'&&can('booking.create')&&!V.modal){const bar=document.createElement('div');bar.className='act68';
  bar.innerHTML=`<button type="button" class="btn p68" data-a="newBk">+ Đặt hàng</button>`;document.body.appendChild(bar);main.classList.add('a68');}
 // ---- danh sách booking / chờ xếp xe dạng dòng ----
 if(['bookings','approvals'].includes(V.view))main.querySelectorAll('.card61').forEach(w=>{if(w.classList.contains('has68'))return;const rows=[...w.querySelectorAll('tbody tr[data-id]')];if(!rows.length)return;
  const L=document.createElement('div');L.className='list68';
  rows.forEach(tr=>{const g=l=>{const td=tr.querySelector(`td[data-l="${l}"]`);return td?td.textContent.trim():'';};const b=bkById(tr.dataset.id)||((V.blData&&V.blData.rows)||[]).find(x=>x.id===tr.dataset.id);
   const r=document.createElement('div');r.className='row68 click';for(const k in tr.dataset)r.dataset[k]=tr.dataset[k];r.setAttribute('role','button');r.tabIndex=0;
   const cname=g('Khách hàng')||(b?cust(b.customerId).name:'');const tons=g('Tổng tấn')||(b?t2(bkTotal(b)):'');
   const dl=b&&b.delivery?'giao '+dm(b.delivery):'';const ld=b?'bốc '+dm(b.date):g('Ngày bốc');
   const meta=[tr.dataset.id,dl||ld,dl?ld:'',g('Kho')||(b&&b.wh)].filter(Boolean).join(' · ');
   const stTd=tr.querySelector('td[data-l="Trạng thái"]');const act=tr.querySelector('.act61');
   r.innerHTML=`<div class="l1"><b>${esc(cname)}</b><b>${esc(tons)} MT</b></div><div class="l2"><span class="m">${esc(meta)}</span>${stTd?stTd.innerHTML:''}</div>`;
   r.setAttribute('aria-label',`${cname}, ${tons} MT, ${meta}`);
   if(act){const a=document.createElement('div');a.className='l3';[...act.children].forEach(c=>a.appendChild(c));r.appendChild(a);}
   L.appendChild(r);});
  w.classList.add('has68');w.parentNode.insertBefore(L,w);});};}
A.ast68=()=>{const f=document.getElementById('chatFab');if(f)f.click();};
A.m68=()=>{V.m68=!V.m68;render();};
if(typeof NAV_SAFE!=='undefined'){NAV_SAFE.add('m68');NAV_SAFE.add('ast68');}
document.addEventListener('click',e=>{if(V.m68&&!e.target.closest('.m68btn')){if(e.target.closest('.menu68')){setTimeout(()=>{if(V.m68){V.m68=false;render();}},0);return;}V.m68=false;render();}},true);
document.addEventListener('keydown',e=>{const r=e.target.closest&&e.target.closest('.row68');if(r&&(e.key==='Enter'||e.key===' ')){e.preventDefault();r.click();}});
