// v3.47: màn chi tiết ngày trên điện thoại – tóm tắt ngày lên đầu, thanh chọn Đơn chờ / Xe / Gợi ý gộp dính trên cùng,
// đơn chờ xếp xe nằm trên danh sách xe, xe trống gom thành một dòng (bấm để mở). Máy tính giữ nguyên.
(()=>{const st=document.createElement('style');st.textContent=`
.dsum60,.dtab60,.empty60{display:none}
@media (max-width:760px){
 .daygrid{display:flex!important;flex-direction:column;gap:12px}
 .daygrid>aside{order:-1;scroll-margin-top:72px}
 .daygrid .grp{scroll-margin-top:72px}
 .panel>.foot{display:none}
 .dsum60{display:flex;flex-direction:column;gap:10px;margin:8px 0 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface)}
 .dsum60 .r1{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
 .dsum60 .lbl{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
 .dsum60 .big{font-size:28px;font-weight:800}
 .dsum60 .r2{display:flex;align-items:center;justify-content:space-between;gap:12px}
 .dsum60 .bar60{height:6px;border-radius:3px;background:var(--line);overflow:hidden}.dsum60 .bar60 span{display:block;height:6px;background:var(--ok)}
 .dsum60 .chips{display:flex;flex-wrap:wrap;gap:6px}.dsum60 .chips span{padding:3px 9px;border-radius:999px;background:var(--sand);font-size:12px}
 .dsum60 .btn{min-height:44px!important}
 .dtab60{display:flex;gap:8px;position:sticky;top:var(--hdr60,56px);z-index:5;margin:10px -2px 0;padding:8px 2px;background:var(--ground)}
 .dtab60 button{flex:1;min-height:44px!important;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600;font-size:13px}
 .dtab60 button.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
 .dtab60 .n{display:inline-block;min-width:18px;margin-left:4px;padding:0 6px;border-radius:999px;background:var(--pend-bg);color:var(--pend);font-size:12px}
 .daygrid .tcard.e60{display:none}.daygrid.show60 .tcard.e60{display:flex}
 .empty60{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:52px;margin-top:8px;padding:0 14px;border:1px dashed var(--line);border-radius:14px;background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
 .empty60 small{color:var(--muted)}
}`;document.head.appendChild(st);})();
const D60={showEmpty:false,tab:'pending'};
A.dtab60=d=>{const t=d.t;D60.tab=t;const g=document.querySelector('.daygrid');if(!g)return;
 if(t==='trucks'){const grp=g.querySelector('.grp');if(grp)grp.scrollIntoView({behavior:'smooth',block:'start'});document.querySelectorAll('.dtab60 button').forEach(b=>b.classList.toggle('on',b.dataset.t===t));return;}
 V.dayTab=t==='merge'?'merge':'pending';render();const a=document.querySelector('.daygrid>aside');if(a)a.scrollIntoView({behavior:'smooth',block:'start'});};
A.empty60=()=>{D60.showEmpty=!D60.showEmpty;render();};
{const r0=render;render=function(){r0();if(!S||V.view!=='day')return;const g=document.querySelector('.daygrid');if(!g||g.dataset.m60)return;g.dataset.m60='1';
 const date=V.day,m=dayM(V.wh,date),past=date<TODAY;
 // xe trống: đánh dấu để gom (chỉ ẩn trên điện thoại bằng CSS)
 let ne=0,nDK=0,nXT=0,capE=0;
 g.querySelectorAll('.tcard[data-c]').forEach(c=>{const t=m.trucks.find(x=>x.code===c.dataset.c);if(!t)return;const l=loadOf(t.code);
  if(truckState(t,l)==='empty'&&!truckLocked(t)&&!tripOf(t.code)){c.classList.add('e60');ne++;t.type==='DK'?nDK++:nXT++;capE+=t.cap;}});
 g.classList.toggle('show60',D60.showEmpty);
 const col=g.firstElementChild;
 if(ne&&col){const b=document.createElement('button');b.type='button';b.className='empty60';b.dataset.a='empty60';b.setAttribute('aria-expanded',D60.showEmpty?'true':'false');
  b.innerHTML=`<span><b>${D60.showEmpty?'Ẩn ':''}${ne} xe trống</b> <small>· ${[nDK?nDK+' DK':'',nXT?nXT+' XT':''].filter(Boolean).join(', ')} · ${t2(capE)} MT</small></span><span aria-hidden="true">${D60.showEmpty?'▴':'▾'}</span>`;col.appendChild(b);}
 // tóm tắt ngày + thanh chọn
 const st=x=>truckState(x,loadOf(x.code));const full=m.trucks.filter(x=>!['empty','part'].includes(st(x))).length,part=m.trucks.filter(x=>st(x)==='part').length;
 const transit=m.trucks.filter(x=>{const tr=tripOf(x.code);return tr&&tr.k==='transit';}).length;
 const holds=m.holds.filter(b=>visibleBk(b)).length;const groups=(typeof groupSuggest==='function'&&role()!=='customer')?groupSuggest(V.wh,date).length:0;
 const capAll=m.cap||m.trucks.reduce((s,x)=>s+x.cap,0);const used=capAll?Math.min(100,Math.round((m.loaded+m.held)/capAll*100)):0;
 const sum=document.createElement('div');sum.className='dsum60';
 sum.innerHTML=`<div class="r1"><span class="lbl">Còn đặt được</span><span class="small muted">Đã xếp ${t2(m.loaded)} MT · giữ chỗ ${t2(m.held)} MT</span></div>
  <div class="r2"><span class="big num">${t2(m.avail)} MT</span>${can('booking.create')&&!past?`<button class="btn" data-a="newBk" data-d="${date}">+ Đặt hàng mới</button>`:''}</div>
  <div class="bar60" aria-hidden="true"><span style="width:${used}%"></span></div>
  <div class="chips"><span>${m.trucks.length} xe</span><span>${full} đầy</span><span>${part} còn chỗ</span>${transit?`<span>${transit} đang giao</span>`:''}<span>${m.trucks.length-full-part} trống</span></div>`;
 const cur=V.dayTab==='merge'?'merge':D60.tab==='trucks'?'trucks':'pending';
 const tab=document.createElement('div');tab.className='dtab60';tab.setAttribute('role','tablist');
 tab.innerHTML=`<button type="button" data-a="dtab60" data-t="pending" class="${cur==='pending'?'on':''}">Đơn chờ${holds?`<span class="n">${holds}</span>`:''}</button><button type="button" data-a="dtab60" data-t="trucks" class="${cur==='trucks'?'on':''}">Xe ${m.trucks.length}</button><button type="button" data-a="dtab60" data-t="merge" class="${cur==='merge'?'on':''}">Gợi ý gộp${groups?' '+groups:''}</button>`;
 const anchor=document.querySelector('.panel .filters')||g;anchor.parentNode.insertBefore(sum,anchor);anchor.parentNode.insertBefore(tab,anchor);
 const hdr=document.querySelector('.top');if(hdr)document.documentElement.style.setProperty('--hdr60',hdr.getBoundingClientRect().height+'px');};}
