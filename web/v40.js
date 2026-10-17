// v3.11: Lịch của khách hàng — nút chọn kho, "Tất cả kho", khung "Đơn của tôi" mọi kho
(()=>{const st=document.createElement('style');st.textContent=`
.cwh{display:flex;gap:6px;align-items:center;flex-wrap:nowrap;overflow-x:auto;padding:2px 0;scrollbar-width:thin}
.cwh button{white-space:nowrap;border:1.5px solid var(--ink);background:var(--surface);color:inherit;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;font-weight:700;letter-spacing:.02em;cursor:pointer}
.cwh button.on{background:var(--navy);color:var(--on-navy);border-color:var(--navy)}
.cwh button small{font-weight:600;opacity:.75;margin-left:4px}
.cal36bar.cbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.cal36bar.cbar .cwh{flex:1;min-width:0}
.cell.call{cursor:pointer}.cwl{display:grid;grid-template-columns:auto 1fr;gap:2px 6px;font-size:11.5px;margin-top:4px;align-items:center}
.cwl b{font-size:11px}.cwl .v{text-align:right}.cwl .full{color:var(--muted);text-decoration:line-through}
.cwl .dot{display:none;width:8px;height:8px;border-radius:50%}
.cbadge{display:block;margin-top:4px;padding:2px 6px;border-radius:6px;font-size:11px;font-weight:600}
.cbadge.ok{background:var(--ok-bg);color:var(--ok)}.cbadge.hold{background:var(--blue-bg);color:var(--blue)}.cbadge.bad{background:var(--bad-bg);color:var(--bad)}.cbadge.warn{background:var(--warn-bg);color:var(--warn)}
.cmy .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.cmy .kpi div{border:1px solid var(--line);border-radius:8px;padding:6px;text-align:center}
.cmy .kpi b{display:block;font-size:18px}.cmy .kpi span{display:block;font-size:9.5px;line-height:1.2;color:var(--muted);letter-spacing:0;white-space:nowrap}
.cmy .cbk{grid-template-columns:38px 1fr auto;white-space:nowrap;gap:6px}.cmy .cbk .st{font-size:10.5px;padding:1px 5px}
@media (max-width:700px){.cal36bar.cbar .cwh{flex-basis:100%}.cwl{grid-template-columns:auto auto;justify-content:start;column-gap:14px}}
`;document.head.appendChild(st);})();
const CV_KEY='c-wh';
const cMine=()=>S.bookings.filter(b=>b.customerId===me().customerId&&b.status!=='draft');
const cBadgeCls=b=>{const k=stKey(b);return ['rejected','failed','latecancel'].includes(k)?'bad':k==='resched'?'warn':k==='hold'||k==='dconfh'?'hold':'ok';};
function cWhInit(){if(V.cWhInit)return;V.cWhInit=true;let s=null;try{s=localStorage.getItem(CV_KEY);}catch(_){}
 if(s&&s!=='__all'&&WH.some(w=>w.id===s)){V.whAll=false;V.wh=s;}else V.whAll=true;}
function cWhChips(){const[y,m]=V.ym;const ym=`${y}-${pad(m)}`;const mine=cMine();
 const cnt=w=>mine.filter(b=>b.wh===w&&b.date.startsWith(ym)).length;const ever=w=>mine.filter(b=>b.wh===w).length;
 const ws=WH.slice().sort((a,b)=>ever(b.id)-ever(a.id));
 return `<div class="cwh" role="group" aria-label="Chọn kho"><button class="${V.whAll?'on':''}" data-a="cWh" data-w="__all">Tất cả kho</button>${ws.map(w=>{const n=cnt(w.id);return `<button class="${!V.whAll&&V.wh===w.id?'on':''}" data-a="cWh" data-w="${w.id}" title="${esc(w.name)}">${esc(w.name)}${n?`<small>· ${n}</small>`:''}</button>`;}).join('')}</div>`;}
A.cWh=d=>{if(d.w==='__all')V.whAll=true;else{V.whAll=false;V.wh=d.w;}try{localStorage.setItem(CV_KEY,d.w);}catch(_){}render();};
function cAllCell(date){const d=+date.slice(8);const past=date<TODAY;const today=date===TODAY;
 const per=WH.map(w=>({w:w.id,m:dayM(w.id,date)})).filter(x=>x.m.declared);
 const mine=cMine().filter(b=>b.date===date&&b.status!=='cancelled');
 const byWh={};mine.forEach(b=>{(byWh[b.wh]=byWh[b.wh]||[]).push(b);});
 const lines=per.map(({w,m})=>{const full=m.avail<=0||m.status==='full';const col=full?'var(--muted)':CAP_COL[m.status]||'var(--ok)';
  return `<b>${w}</b><span class="v num ${full?'full':''}">${full?'Đã đầy':'còn '+t2(m.avail)+' MT'}</span><i class="dot" style="background:${col}" title="${w}: ${full?'Đã đầy':'còn '+t2(m.avail)+' MT'}"></i>`;}).join('');
 const badges=Object.entries(byWh).map(([w,l])=>{const worst=l.map(cBadgeCls).sort((a,b)=>['bad','warn','hold','ok'].indexOf(a)-['bad','warn','hold','ok'].indexOf(b))[0];
  return `<span class="cbadge ${worst}">📦 ${w} · ${l.length} đơn · ${t2(l.reduce((s,b)=>s+bkTotal(b),0))} MT</span>`;}).join('');
 const off=!per.length;const allOff=WH.every(w=>dayM(w.id,date).off);
 return `<div class="cell call ${mine.length?'mine':''} ${past?'past':''} ${today?'today':''} ${off?'undecl':''}" data-a="custDay" data-d="${date}" tabindex="0" role="button" aria-label="Ngày ${dmy(date)}">
  <div class="ctop"><span class="dnum ${off?'lite':''}">${d}</span><span class="wdmobile small muted">${WDS[dow(date)]} · ${dm(date)}</span></div>
  ${off?`<div class="kv">${allOff?'Không bốc hàng':'Chưa mở lịch xe'}</div>`:`<div class="cwl">${lines}</div>`}${badges}</div>`;}
function cSidePanel(){const[y,m]=V.ym;const ym=`${y}-${pad(m)}`;const mine=cMine().filter(b=>V.whAll||b.wh===V.wh);
 const month=mine.filter(b=>b.date.startsWith(ym)&&!['cancelled'].includes(b.status));
 const holdN=month.filter(b=>b.status==='hold').length;const okN=month.filter(b=>DONE_ST.includes(b.status)).length;
 const tons=month.filter(b=>!['rejected','latecancel'].includes(b.status)).reduce((s,b)=>s+bkTotal(b),0);
 const end=addDays(TODAY,13);const up=mine.filter(b=>b.date>=TODAY&&b.date<=end&&!['cancelled'].includes(b.status)).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.wh<b.wh?-1:1);
 const sp=user(cust(me().customerId).salesId);
 return `<aside class="stats cmy"><h3>ĐƠN CỦA TÔI${V.whAll?' · TẤT CẢ KHO':' · '+esc(V.wh)}</h3>
  <div class="kpi num"><div><b>${holdN}</b><span>CHỜ XẾP XE</span></div><div><b>${okN}</b><span>ĐÃ XẾP XE</span></div><div><b>${k1(tons)}</b><span>MT THÁNG ${pad(m)}</span></div></div>
  <div><div class="lbl">14 ngày tới (${dm(TODAY)} – ${dm(end)})</div>${up.length?`<div class="cbklist">${up.map(b=>`<button type="button" class="cbk" data-a="custDay" data-d="${b.date}" data-w="${b.wh}" title="Xem đơn ngày ${dmy(b.date)} kho ${b.wh}"><span class="num">${dm(b.date)}</span><span class="num"><b>${b.wh}</b> · ${t2(bkTotal(b))}</span><span class="st st-${stKey(b)}">${ST_CUST[stKey(b)]}</span></button>`).join('')}</div>`:'<div class="muted small">Chưa có đơn nào trong 14 ngày tới.</div>'}</div>
  <div><div class="lbl">Sales phụ trách</div><div>${esc(sp.name)}</div><div class="muted small">${esc(sp.phone||'')} · ${esc(sp.email)}</div><div class="muted small" style="margin-top:4px">Muốn đặt thêm hoặc đổi lịch, liên hệ Sales.</div></div></aside>`;}
{const vc0=vCalendar;vCalendar=function(){if(role()!=='customer')return vc0();cWhInit();
 const[y,m]=V.ym;const rows=gridDays(iso(y,m,1),dim(y,m));
 const cell=d=>d?(V.whAll?cAllCell(d):dayCell(d)):'<div class="cell pad" aria-hidden="true"></div>';
 return `<div class="panel"><div class="calhead v36"><div class="illus">${DK_SVG()}</div>
  <div class="monthnav"><button class="navbtn" data-a="month" data-d="-1" aria-label="Tháng trước">‹</button><h1>THÁNG ${pad(m)} ${y}</h1><button class="navbtn" data-a="month" data-d="1" aria-label="Tháng sau">›</button></div><span></span></div>
  <div class="cal36bar cbar">${cWhChips()}</div>
  <div class="calwrap"><div style="min-width:0"><div class="cal">${WD.map((w,i)=>`<div class="wd">${i===0?'CN':w}</div>`).join('')}${rows.map(r=>r.map(cell).join('')).join('')}</div>
  <div class="legend"><span><span class="sw" style="background:var(--ok)"></span>Còn chỗ</span><span><span class="sw" style="background:#e0861a"></span>Sắp đầy</span><span><span class="sw" style="background:var(--muted)"></span>Đã đầy</span><span>📦 Đơn của bạn (xanh: đã xếp xe · lam: chờ xếp xe · đỏ: từ chối)</span><span class="muted">Đơn vị: MT (metric tấn)</span></div></div>${cSidePanel()}</div></div>`;};}
// Chi tiết ngày của khách: mọi kho khi đang xem Tất cả kho
{const mc0=mCustDay;mCustDay=function(){const M=V.modal;const one=M.w||(!V.whAll&&V.wh);
 if(one){const keep=V.wh;V.wh=one;try{return mc0();}finally{V.wh=keep;}}
 const date=M.date;const list=cMine().filter(b=>b.date===date).sort((a,b)=>a.wh<b.wh?-1:1);const s=user(cust(me().customerId).salesId);
 const per=WH.map(w=>({w,m:dayM(w.id,date)})).filter(x=>x.m.declared);
 return `<div class="mhead"><h2>ĐƠN HÀNG CỦA TÔI</h2><span class="meta">Tất cả kho · ${dmy(date)}</span></div>
 ${per.length?`<div class="row small" style="gap:12px;flex-wrap:wrap;margin-bottom:8px">${per.map(({w,m})=>`<span><b>${esc(w.name)}</b>: ${m.avail<=0?'đã đầy':'còn '+t2(m.avail)+' MT'}</span>`).join('')}</div>`:'<p class="muted small">Ngày này chưa mở lịch xe ở kho nào.</p>'}
 ${list.length?`<div class="tbl-wrap"><table><thead><tr><th>Kho</th><th>Mã booking</th><th>Ref</th><th>Sản phẩm · Màu · Độ dày × Khổ</th><th class="r">Số tấn</th><th>Nơi giao</th><th>Ngày giao YC</th><th>Trạng thái</th></tr></thead><tbody>
 ${list.map(b=>`<tr><td><b>${b.wh}</b></td><td>${b.id}</td><td>${esc(b.ref)}</td><td class="small">${b.lines.map(l=>`${esc(l.p)} · ${esc(l.c)} · ${l.th} × ${l.w} · ${t2(l.t)} MT`).join('<br>')}</td><td class="r num"><b>${t2(bkTotal(b))}</b></td><td class="small">${esc(b.addrText)}</td><td>${b.delivery?dmy(b.delivery):'–'}</td><td><span class="st st-${stKey(b)}">${ST_CUST[stKey(b)]}</span>${b.status==='rejected'||b.status==='resched'?`<div class="small">${esc(b.rejectReason)}${b.proposedDate?' · đề xuất '+dmy(b.proposedDate):''}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Bạn chưa có đơn nào trong ngày này.</p>'}
 <p class="small" style="margin-top:12px">Muốn đặt thêm hoặc đổi lịch, liên hệ Sales phụ trách: <b>${esc(s.name)}</b> · ${esc(s.phone||'')} · ${esc(s.email)}</p>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;};}
{const cd0=A.custDay;A.custDay=d=>{V.modal={type:'custDay',date:d.d,w:d.w||null,wide:true};render();};}
