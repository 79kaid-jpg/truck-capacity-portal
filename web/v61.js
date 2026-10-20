// v3.48: UI/UX theo vai trò (rà soát 20/10/2026)
// P1: menu tiếng Việt có chữ; điện thoại: thanh điều hướng dưới ≤ 4 mục theo vai trò + "Thêm"; bảng Chờ xếp xe / Danh sách booking thành thẻ;
//     nút Gợi ý xe / Chi tiết ngay trên dòng Chờ xếp xe
// P2: trang chủ theo vai trò; "Đơn của tôi" cho khách; tách rõ hai nút Yêu cầu; bộ lọc điện thoại thu vào nút "Bộ lọc (n)"
// P3: header điện thoại gọn, dải chọn kho xuống dòng, bảng thống kê cuộn trong khung, tiêu đề bớt in hoa
(()=>{const st=document.createElement('style');st.textContent=`
.bnav61,.more61{display:none}
@media (min-width:761px){
 .side{width:88px}
 .side button{width:80px;height:auto;min-height:56px;padding:6px 2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
 .side .lb61{font-size:12px;line-height:1.15;font-weight:600;text-align:center;max-width:76px;overflow-wrap:anywhere}
 .side .dot{top:2px;right:10px}
}
@media (max-width:760px){
 .shell>nav.side{display:none}
 .bnav61{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--surface);border-top:1px solid var(--line);
  padding:4px max(4px,env(safe-area-inset-left,0px)) calc(4px + env(safe-area-inset-bottom,0px)) max(4px,env(safe-area-inset-right,0px))}
 .bnav61 button{flex:1;min-width:0;min-height:56px;border:0;background:none;color:var(--muted);font:inherit;font-size:12px;font-weight:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;position:relative;border-radius:10px}
 .bnav61 button svg{width:22px;height:22px}
 .bnav61 button.on{color:var(--ink)}.bnav61 button.on svg{color:var(--navy)}
 .bnav61 button.on::before{content:"";position:absolute;top:0;left:30%;right:30%;height:3px;border-radius:0 0 3px 3px;background:var(--navy)}
 .bnav61 .dot{position:absolute;top:4px;left:calc(50% + 6px);min-width:16px;height:16px;padding:0 4px;border-radius:8px;background:var(--bad);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
 .bnav61 .lb61{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 .more61{display:flex;flex-direction:column;position:fixed;left:8px;right:8px;bottom:calc(72px + env(safe-area-inset-bottom,0px));z-index:61;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:6px}
 .more61[hidden]{display:none}
 .more61 button{display:flex;align-items:center;gap:12px;min-height:48px;padding:0 12px;border:0;border-radius:10px;background:none;color:var(--ink);font:inherit;font-size:15px;text-align:left;position:relative}
 .more61 button.on{background:var(--sand)}.more61 svg{width:22px;height:22px}
 .more61 .dot{margin-left:auto;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--bad);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
 .main{padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))!important}
 #chatFab{bottom:calc(80px + env(safe-area-inset-bottom,0px))!important}
 /* bảng → thẻ */
 .tbl-wrap.card61{overflow:visible;border:0;background:none}
 .card61 table,.card61 tbody{display:block;width:100%}
 .card61 thead{display:none}
 .card61 tbody tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 12px;margin:0 0 10px;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
 .card61 tbody td{display:flex;flex-direction:column;gap:2px;padding:0;border:0;min-width:0;text-align:left!important;white-space:normal;overflow-wrap:anywhere}
 .card61 tbody td::before{content:attr(data-l);font-size:12px;font-weight:600;color:var(--muted)}
 .card61 tbody td[data-l=""]::before{display:none}
 .card61 tbody td.w61{grid-column:1/-1}
 .card61 tbody td.act61{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;gap:8px}
 .card61 tbody td.act61 .btn{min-height:44px}
 /* bộ lọc thu gọn, tab cuộn ngang */
 .flt61{display:inline-flex;align-items:center;gap:6px;min-height:44px;margin:4px 0 8px}
 .main .bk61tabs{flex-wrap:nowrap!important;overflow-x:auto;scrollbar-width:none}.main .bk61tabs>*{flex:none}
 /* P3 */
 .top [data-a="guide"]{font-size:0!important;gap:0!important}.top [data-a="guide"] svg{width:20px;height:20px}
 .cal36bar.cbar .cwh{flex-wrap:wrap;overflow:visible}
 .cal36bar .rqbtn .t{display:inline!important}.cal36bar .rqbtn{width:auto!important;padding:0 12px!important}
}
.act61 .btn{white-space:nowrap}
.rqbtn[data-a="rqList"]{border-color:var(--line)!important;background:var(--surface)!important;color:var(--ink)!important}
.dz-p{min-width:0}.dz-p .tbl-wrap,.dz-p table{max-width:100%}.dz-p .scr61{overflow-x:auto}
`;document.head.appendChild(st);})();

// ---- P1: nhãn tiếng Việt ----
const LBL61={dash:'Thống kê',users:'Người dùng',approvals:'Chờ xếp xe',fleet:'Khai báo xe',config:'Cấu hình',talk:'Trao đổi'};
NAV.forEach(n=>{if(LBL61[n.v])n.label=LBL61[n.v];});
// ---- P2: Đơn của tôi (khách hàng) ----
NAV.splice(1,0,{v:'myorders',label:'Đơn của tôi',ic:'list',ok:()=>role()==='customer'});
const ST61=['hold','ok','loaded','transit','resched','delivered','failed','rejected','cancelled'];
function vMyOrders61(){const F=V.mo61||(V.mo61={per:'up'});const from=F.per==='up'?TODAY:addDays(TODAY,-30),to=F.per==='up'?addDays(TODAY,60):addDays(TODAY,-1);
 if(typeof ensureRange==='function'&&!F.loaded){F.loaded=1;Promise.all([ensureRange(from),ensureRange(to)]).then(()=>render()).catch(()=>{});}
 const L=S.bookings.filter(b=>visibleBk(b)&&b.customerId!=='__other'&&b.status!=='draft'&&b.date>=from&&b.date<=to).sort((a,b)=>F.per==='up'?a.date.localeCompare(b.date):b.date.localeCompare(a.date));
 return `<div class="panel"><div class="pagehead"><h2>Đơn của tôi</h2><span class="muted">${L.length} đơn · ${t2(L.reduce((s,b)=>s+bkTotal(b),0))} MT</span></div>
 <div class="row" style="gap:8px;margin:0 0 10px" role="group" aria-label="Khoảng thời gian"><button class="btn ${F.per==='up'?'':'ghost'} sm" data-a="mo61" data-v="up" aria-pressed="${F.per==='up'}">Sắp tới</button><button class="btn ${F.per==='past'?'':'ghost'} sm" data-a="mo61" data-v="past" aria-pressed="${F.per==='past'}">30 ngày qua</button></div>
 <div class="tbl-wrap"><table><thead><tr><th>Ngày bốc</th><th>Kho</th><th>Mã đơn</th><th class="r">Số tấn</th><th>Nơi giao</th><th>Trạng thái</th></tr></thead><tbody>
 ${L.map(b=>`<tr class="click" data-a="openBk" data-id="${b.id}"><td class="num">${dmy(b.date)}</td><td>${b.wh}</td><td>${b.id}</td><td class="r num">${t2(bkTotal(b))}</td><td class="small">${esc(b.addrText||'')}</td><td><span class="st st-${stKey(b)}">${ST_LABEL[stKey(b)]}</span></td></tr>`).join('')||`<tr><td colspan="6" class="muted">${F.per==='up'?'Chưa có đơn sắp tới.':'Không có đơn trong 30 ngày qua.'}</td></tr>`}
 </tbody></table></div></div>`;}
A.mo61=d=>{V.mo61={per:d.v};render();};
{const m0=mainView;mainView=function(){if(V.view==='myorders')return role()==='customer'?vMyOrders61():(V.view='calendar',m0());return m0();};}
// ---- P2: trang chủ theo vai trò (một lần sau đăng nhập, không áp khi đang chạy test tự động trừ khi bật cờ) ----
const HOME61={sales:'dash',cs:'mywork',logistics:'approvals'};
// ---- thanh điều hướng dưới (điện thoại) ----
const PRI61={customer:['calendar','myorders','notifs'],sales:['dash','calendar','bookings','mywork'],cs:['mywork','calendar','bookings','notifs'],
 logistics:['approvals','calendar','mywork','notifs'],admin:['calendar','approvals','users','mywork']};
const M61={more:false};
A.more61=()=>{M61.more=!M61.more;render();};
document.addEventListener('click',e=>{if(M61.more&&!e.target.closest('.more61,.bnav61 [data-a="more61"]')){M61.more=false;const m=document.querySelector('.more61');if(m)m.hidden=true;const b=document.querySelector('.bnav61 [data-a="more61"]');if(b)b.setAttribute('aria-expanded','false');}},true);
const TH61={approvals:{'Mã booking':'w61','Khách hàng':'w61','Nơi giao':'w61'},bookings:{}};
{const r0=render;render=function(){
 if(S&&!V.home61){V.home61=1;const h=HOME61[role()];const auto=!navigator.webdriver||window.__home61;
  if(auto&&h&&V.view==='calendar'&&!location.hash){const n=NAV.find(x=>x.v===h);if(n&&n.ok())V.view=h;}}
 r0();if(!S)return;
 const side=document.querySelector('.shell>nav.side');
 if(side){side.querySelectorAll('button[data-v]').forEach(b=>{if(!b.querySelector('.lb61')){const s=document.createElement('span');s.className='lb61';s.textContent=b.getAttribute('aria-label')||'';b.appendChild(s);}});
  // điện thoại: thanh dưới
  const all=[...side.querySelectorAll('button[data-v]')];const pri=(PRI61[role()]||['calendar']).map(v=>all.find(b=>b.dataset.v===v)).filter(Boolean);
  for(const b of all){if(pri.length>=4)break;if(!pri.includes(b))pri.push(b);}
  const rest=all.filter(b=>!pri.includes(b));const show=rest.length?pri.slice(0,4):pri.slice(0,5);const rest2=all.filter(b=>!show.includes(b));
  const item=(b,cls)=>{const d=b.querySelector('.dot');return `<button class="${b.classList.contains('on')?'on':''}" data-a="go" data-v="${b.dataset.v}" aria-label="${esc(b.getAttribute('aria-label')||'')}"${b.classList.contains('on')?' aria-current="page"':''}>${(b.querySelector('svg')||{}).outerHTML||''}<span class="lb61">${esc(b.getAttribute('aria-label')||'')}</span>${d?`<span class="dot">${d.textContent}</span>`:''}</button>`;};
  const moreOn=rest2.some(b=>b.classList.contains('on'));const moreDot=rest2.reduce((s,b)=>s+(+((b.querySelector('.dot')||{}).textContent||0)),0);
  const nav=document.createElement('nav');nav.className='bnav61';nav.setAttribute('aria-label','Điều hướng chính');
  nav.innerHTML=show.map(b=>item(b)).join('')+(rest2.length?`<button class="${moreOn?'on':''}" data-a="more61" aria-expanded="${M61.more}" aria-label="Thêm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span class="lb61">Thêm</span>${moreDot?`<span class="dot">${moreDot}</span>`:''}</button>`:'');
  document.body.querySelectorAll('.bnav61,.more61').forEach(x=>x.remove());document.body.appendChild(nav);
  if(rest2.length){const mo=document.createElement('div');mo.className='more61';mo.hidden=!M61.more;mo.setAttribute('role','menu');
   mo.innerHTML=rest2.map(b=>{const d=b.querySelector('.dot');return `<button role="menuitem" class="${b.classList.contains('on')?'on':''}" data-a="go" data-v="${b.dataset.v}">${(b.querySelector('svg')||{}).outerHTML||''}<span>${esc(b.getAttribute('aria-label')||'')}</span>${d?`<span class="dot">${d.textContent}</span>`:''}</button>`;}).join('');document.body.appendChild(mo);}}
 // P1: Chờ xếp xe – nút trên từng dòng + tiêu đề tiếng Việt
 if(V.view==='approvals'){const h=document.querySelector('.main .pagehead h2');if(h&&/APPROVAL/.test(h.textContent))h.textContent='Đơn chờ xếp xe';
  const t=document.querySelector('.main .tbl-wrap table');if(t&&!t.dataset.a61){t.dataset.a61='1';const hr=t.querySelector('thead tr');if(hr){const th=document.createElement('th');th.textContent='';th.setAttribute('aria-label','Thao tác');hr.appendChild(th);}
   t.querySelectorAll('tbody tr[data-id]').forEach(tr=>{const td=document.createElement('td');td.className='act61';const can1=can('alloc.assign')&&typeof A.dndSuggest==='function';
    td.innerHTML=`${can1?`<button class="btn sm" data-a="sug61" data-id="${tr.dataset.id}">Gợi ý xe</button>`:''}<button class="btn ghost sm" data-a="openBk" data-id="${tr.dataset.id}">Chi tiết</button>`;tr.appendChild(td);});}}
 // P1: bảng → thẻ (điện thoại)
 if(['approvals','bookings','myorders'].includes(V.view)){const w=document.querySelector('.main .tbl-wrap');const t=w&&w.querySelector('table');
  if(t){w.classList.add('card61');const hs=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());const W=TH61[V.view]||{};
   t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(td.colSpan>1){td.classList.add('w61');td.dataset.l='';return;}if(td.dataset.l==null)td.dataset.l=hs[i]||'';if(W[hs[i]])td.classList.add(W[hs[i]]);if(/Nơi giao|Địa chỉ|Khách/.test(hs[i]||''))td.classList.add('w61');}));}}
 // P2: Danh sách booking – bộ lọc thu gọn trên điện thoại, tab cuộn ngang
 if(V.view==='bookings'){const tb=document.querySelector('.main .tabs');if(tb)tb.classList.add('bk61tabs');
  const f=document.querySelector('.main .filters');if(f&&matchMedia('(max-width:760px)').matches&&!document.querySelector('.flt61')){
   const n=[...f.querySelectorAll('select')].filter(s=>s.selectedIndex>0).length+[...f.querySelectorAll('input')].filter(i=>i.value.trim()).length;
   f.hidden=!V.f61;const b=document.createElement('button');b.type='button';b.className='btn ghost sm flt61';b.dataset.a='flt61';b.setAttribute('aria-expanded',V.f61?'true':'false');
   b.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>${V.f61?'Ẩn bộ lọc':'Bộ lọc'}${n?` (${n})`:''}`;f.parentNode.insertBefore(b,f);}}
 // P2: hai nút Yêu cầu rõ nghĩa
 const rl=document.querySelector('.main .rqbtn[data-a="rqList"] .t');if(rl&&rl.textContent==='Yêu cầu')rl.textContent='Danh sách yêu cầu';
 const rn=document.querySelector('.main .rqbtn[data-a="rqNew"] .t');if(rn&&rn.textContent==='Yêu cầu đặt hàng')rn.textContent='Tạo yêu cầu';
 // P3: bảng trong Bảng thống kê cuộn trong khung
 if(V.view==='dash')document.querySelectorAll('.main .dz-p table').forEach(t=>{if(!t.parentElement.classList.contains('scr61')&&!t.parentElement.classList.contains('tbl-wrap')){const s=document.createElement('div');s.className='scr61';t.parentNode.insertBefore(s,t);s.appendChild(t);}});
 // P3: tiêu đề bớt in hoa
 const H61={'DANH SÁCH BOOKING':'Danh sách booking','BẢNG THỐNG KÊ ĐẶT XE':'Bảng thống kê đặt xe','CONFIGURATION':'Cấu hình','THÔNG BÁO':'Thông báo'};
 const ph=document.querySelector('.main .pagehead h2');if(ph&&H61[ph.textContent.trim()])ph.textContent=H61[ph.textContent.trim()];
};}
A.flt61=()=>{V.f61=!V.f61;render();};
// Gợi ý xe từ dòng Chờ xếp xe: mở ngày của đơn rồi hiện gợi ý (giống trợ lý)
A.sug61=d=>{const b=bkById(d.id);if(!b)return;V.wh=b.wh;V.whAll=false;V.day=b.date;V.view='day';V.dayTab='pending';V.modal=null;render();if(typeof A.dndSuggest==='function')A.dndSuggest({id:b.id});};
