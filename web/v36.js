/* v3.6 – Lịch đặt xe dễ nhìn hơn: cột Chủ nhật hẹp, ngày đã qua thu gọn, thanh năng lực + "Còn đặt được" nổi bật, chỉ gắn nhãn khi gần đầy / đầy,
   bấm cả ô để xem chi tiết, ＋ đặt hàng khi rê chuột, rê chuột xem nhanh, cột Tuần, lọc nhanh, Tất cả kho, xem 2 tuần, phím tắt,
   khung thống kê bấm được + thu gọn, thống kê Xe đầy đủ hơn. Đơn vị MT (metric tấn). */
(()=>{const st=document.createElement('style');st.textContent=`
.calhead.v36{padding-bottom:8px;margin-bottom:10px}.calhead.v36 .illus{width:84px}.calhead.v36 .monthnav h1{font-size:clamp(22px,2.6vw,34px)}
.cal.v36{grid-template-columns:minmax(64px,.42fr) repeat(6,minmax(0,1fr)) minmax(96px,.62fr)}
.cal.v36>div:nth-child(7n){border-right:1px solid var(--line)}.cal.v36>div:nth-child(8n){border-right:0}
.cal.v36 .cell{min-height:118px;padding:6px 7px;gap:3px}
.cal.v36 .cell.sun{background:var(--sand);padding:6px 4px}.cal.v36 .cell.sun .kv{font-size:12px}
.cal.v36 .cell.past{opacity:.62;min-height:0}.cal.v36 .cell.undecl{min-height:0}
.cal.v36 .cell.c36{cursor:pointer}.cal.v36 .cell.c36:focus-visible{outline:3px solid var(--blue);outline-offset:-3px}
.cal.v36 .cell.dim{opacity:.28}
.c36 .avail{font-size:12px;color:var(--muted);line-height:1.1}.c36 .avail b{display:block;font-family:var(--f-display);font-size:19px;color:var(--ink);font-weight:900}
.capbar{height:6px;border-radius:3px;background:var(--sand-2);overflow:hidden}.capbar i{display:block;height:100%}
.c36 .sub{font-size:12px;color:var(--muted)}
.c36 .tk{gap:8px;font-size:12px}.c36 .tk svg{width:28px}
.c36 .qadd{position:absolute;right:6px;bottom:6px;width:26px;height:26px;border-radius:50%;border:0;background:var(--navy);color:var(--on-navy);font-size:17px;line-height:1;cursor:pointer;opacity:0;transition:opacity .12s}
.c36:hover .qadd,.c36:focus-within .qadd{opacity:1}@media (hover:none){.c36 .qadd{opacity:1}}
.c36 .whl{display:grid;grid-template-columns:34px 1fr auto;gap:4px;align-items:center;font-size:12px;padding:1px 2px;border-radius:4px}.c36 .whl:hover{background:var(--blue-bg)}
.c36 .bl{font-size:12px;display:flex;gap:4px;align-items:baseline;min-width:0}.c36 .bl span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.cell.wk{background:var(--sand);font-size:12px;cursor:default}.cell.wk b{font-size:14px}.cell.wk .lbl{font-weight:700;color:var(--muted);font-size:12px;letter-spacing:.05em}
.cal36bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 10px}.cal36bar button.on{background:var(--navy);color:var(--on-navy)}
.seg36{display:inline-flex;border:1.5px solid var(--ink);border-radius:999px;overflow:hidden;background:var(--surface)}.seg36 button{display:inline-flex;align-items:center;gap:5px;border:0;border-radius:0;background:transparent;color:var(--ink);padding:5px 11px;font:700 12px var(--f-body);cursor:pointer;min-height:34px;white-space:nowrap}.seg36 button+button{border-left:1px solid var(--line)}
.seg36 button svg,.icbtn svg,.rqbtn svg.rqic{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}.seg36 .cnt{font:700 12px var(--f-body);background:var(--blue-bg);color:var(--blue);border-radius:999px;padding:0 6px;min-width:18px;text-align:center}.seg36 button.on .cnt{background:#fff;color:var(--navy)}
.icbtn{display:inline-flex;align-items:center;gap:5px}
@media (max-width:700px){.cal36bar{gap:6px}.seg36 button{padding:5px 9px}.seg36 button .t:not(.keep){display:none}.seg36 button[data-a="calV"] .t{display:inline}.cal36bar .kbbtn .t{display:none}.cal36bar>[data-a="guide"]{display:none}.cal36bar .seg36[aria-label="Lọc lịch"]{order:3}}
@media (hover:none) and (pointer:coarse){.cal36bar .kbbtn{display:none}}
#calTip{position:fixed;z-index:70;background:var(--surface);border:1px solid var(--line);border-radius:10px;box-shadow:var(--shadow);padding:10px 12px;font-size:12.5px;max-width:340px;pointer-events:none}
#calTip h4{margin:0 0 6px;font-size:13px}#calTip .r{display:flex;gap:8px;justify-content:space-between}#calTip .m{color:var(--muted)}
.cal36bar+.calwrap .legend svg,.calwrap .legend svg{width:34px;height:auto;vertical-align:middle}
.calwrap.side-off{grid-template-columns:minmax(0,1fr) 34px}
.sidebtn{writing-mode:vertical-rl;border:1px solid var(--line);background:var(--surface);border-radius:8px;cursor:pointer;font-weight:700;font-size:12px;padding:10px 4px}
.stats .clk{cursor:pointer;border-radius:6px}.stats .clk:hover{background:var(--blue-bg)}
.ts36 .bar2{height:7px;border-radius:4px;background:var(--sand-2);overflow:hidden;margin-top:3px}.ts36 .bar2 i{display:block;height:100%}
.ts36 .kpi{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.ts36 .kpi b{font-family:var(--f-display);font-size:20px}
.ts36 .chips{display:flex;flex-wrap:wrap;gap:4px}.ts36 .chips button{font-size:12px;padding:2px 7px;border-radius:10px;border:1px solid var(--line);background:var(--surface);cursor:pointer}
.ts36 .wkbars{display:flex;gap:6px;align-items:flex-end;height:64px}.ts36 .wkbars div{flex:1;text-align:center;font-size:12px;color:var(--muted)}.ts36 .wkbars i{display:block;border-radius:3px 3px 0 0;margin:0 auto 2px;width:70%}
@media (max-width:760px){.cal.v36{grid-template-columns:1fr}.cal.v36 .cell.wk{display:none}.cal.v36 .cell.past{display:none}}
`;document.head.appendChild(st);})();

const MT=n=>t2(n)+' MT';const k1=n=>(Math.round(n*10)/10).toLocaleString('vi-VN');
const CAP_COL={ok:'var(--ok)',near:'#e0861a',full:'var(--bad)'};
// chỉ số gộp nhiều kho (chế độ Tất cả kho)
function dayAll(date){const ms=WH.map(w=>({w:w.id,m:dayM(w.id,date)}));const z={cap:0,loaded:0,held:0,free:0,avail:0,uDK:0,uCN:0,nDK:0,nCN:0,holds:[],declared:false,off:true,holiday:false,reason:'',per:ms};
 ms.forEach(({m})=>{['cap','loaded','held','free','avail','uDK','uCN','nDK','nCN'].forEach(k=>z[k]+=m[k]||0);z.holds=z.holds.concat(m.holds);z.declared=z.declared||m.declared;z.off=z.off&&m.off;z.holiday=z.holiday||(m.holiday&&m.declared);});
 z.usage=z.cap?(z.loaded+z.held)/z.cap:0;z.status=!z.declared?(z.off?'off':'none'):z.avail<=0.005?'full':z.usage>=S.cfg.near/100?'near':'ok';z.avail=r2(z.avail);return z;}
const dayX=date=>V.whAll?dayAll(date):dayM(V.wh,date);
const bkOfDay=date=>S.bookings.filter(b=>(V.whAll?WH.some(w=>w.id===b.wh):b.wh===V.wh)&&b.date===date&&['ok','loaded','transit','delivered','hold','resched','draft'].includes(b.status)&&(b.status!=='draft'||b.csId===V.me)&&ownsCust(b.customerId));
function cellMatch(date,m){const f=V.calF||'all';if(f==='all')return true;const l=bkOfDay(date);
 if(f==='hold')return m.holds.some(b=>ownsCust(b.customerId));if(f==='urg')return l.some(b=>b.urgent);if(f==='mine')return l.some(b=>b.csId===V.me);return true;}

const dayCellOld=dayCell;
dayCell=function(date){const isC=role()==='customer';const d=+date.slice(8);const past=date<TODAY;const today=date===TODAY;const sun=dow(date)===0;
 const m=dayX(date);
 if(isC||!m.declared){let h=V.whAll&&!isC?`<div class="cell ${past?'past':''} ${today?'today':''} undecl ${sun?'sun':''}"><div class="ctop"><span class="dnum lite">${d}</span><span class="wdmobile small muted">${WDS[dow(date)]} · ${dm(date)}</span></div><div class="kv">${m.off?'Không bốc hàng':'Chưa mở lịch xe'}</div></div>`:dayCellOld(date);
  return h.replace('class="cell ','class="cell '+(sun?'sun ':'')+(m.declared?'':'undecl ')+((V.calF||'all')!=='all'&&!isC?'dim ':''));}
 const pend=m.holds.filter(b=>ownsCust(b.customerId));const ht=pend.reduce((s,b)=>s+bkTotal(b)-allocSum(b.id),0);
 const used=m.cap?Math.min(1,(m.loaded+m.held)/m.cap):0;const flag=m.status==='near'||m.status==='full'?pill(m.status):'';
 const mine=(V.calF==='mine')?bkOfDay(date).filter(b=>b.csId===V.me):[];
 const body=V.whAll?m.per.filter(x=>x.m.declared).map(({w,m:mm})=>`<div class="whl" data-a="openDayWh" data-w="${w}" data-d="${date}" title="Mở ngày ${dmy(date)} kho ${w}"><b>${w}</b><span class="capbar"><i style="width:${(mm.cap?Math.min(1,(mm.loaded+mm.held)/mm.cap):0)*100}%;background:${CAP_COL[mm.status]||'var(--muted)'}"></i></span><span class="num">còn ${Math.round(mm.avail)}</span></div>`).join('')
  :`<div class="tk num"><span>${DK_SVG()}${m.uDK}/${m.nDK}</span><span>${CN_SVG()}${m.uCN}/${m.nCN}</span></div>`;
 return `<div class="cell c36 ${past?'past':''} ${today?'today':''} ${sun?'sun':''} ${cellMatch(date,m)?'':'dim'}" ${V.whAll?'':`data-a="openDay" data-d="${date}"`} data-tip="${date}" tabindex="0" role="button" aria-label="Ngày ${dmy(date)}: còn đặt được ${t2(m.avail)} MT">
  <div class="ctop"><span class="dnum">${d}</span><span class="wdmobile small muted">${WDS[dow(date)]} · ${dm(date)}</span>${flag}</div>
  ${m.holiday?`<div class="holwarn">⚠ ${sun?'CN':'Lễ'} · giao ngày nghỉ</div>`:''}
  <div class="avail num">Còn đặt được<b>${MT(m.avail)}</b></div>
  <div class="capbar" title="Đã dùng ${pct(used)} năng lực"><i style="width:${used*100}%;background:${CAP_COL[m.status]||'var(--muted)'}"></i></div>
  <div class="sub num">Đã xếp ${k1(m.loaded)}${m.held?` + chờ ${k1(m.held)}`:''} / ${k1(m.cap)} MT</div>
  ${body}
  ${pend.length?`<div class="pendbox num">⏳ ${pend.length} đơn chờ xếp xe · ${MT(ht)}</div>`:''}
  ${mine.length?`<div class="minebox num">Đơn của tôi: ${mine.length} · ${MT(mine.reduce((s,b)=>s+bkTotal(b),0))}</div>`:''}
  ${!V.whAll&&typeof cellExtra29==='function'?cellExtra29(V.wh,date):''}${V.whAll?'':draftLine(V.wh,date)}
  ${can('booking.create')&&!past?`<button class="qadd" data-a="newBk" data-d="${date}" title="Đặt hàng ngày ${dmy(date)}" aria-label="Đặt hàng ngày ${dmy(date)}">＋</button>`:''}</div>`;};

function weekCell(days){const ds=days.filter(Boolean);if(role()==='customer'||!ds.length)return '<div class="cell wk"></div>';
 let cap=0,ld=0,hd=0,av=0;ds.forEach(d=>{const m=dayX(d);if(m.declared){cap+=m.cap;ld+=m.loaded;hd+=m.held;av+=m.avail;}});
 if(!cap)return `<div class="cell wk"><div class="lbl">TUẦN ${dm(ds[0])}–${dm(ds[ds.length-1])}</div><div class="muted">Chưa có xe</div></div>`;
 return `<div class="cell wk"><div class="lbl">TUẦN ${dm(ds[0])}–${dm(ds[ds.length-1])}</div><div>Còn đặt được</div><b class="num">${MT(av)}</b>
  <div class="capbar"><i style="width:${cap?Math.min(1,(ld+hd)/cap)*100:0}%;background:var(--ok)"></i></div><div class="muted num">Đã xếp ${k1(ld)}${hd?` · chờ ${k1(hd)}`:''} / ${k1(cap)}</div></div>`;}

// lưới: Chủ nhật → Thứ 7 + cột Tuần
function gridDays(start,n){const out=[];let row=[];const first=dow(start);for(let i=0;i<first;i++)row.push(null);
 for(let i=0;i<n;i++){row.push(addDays(start,i));if(row.length===7){out.push(row);row=[];}}if(row.length){while(row.length<7)row.push(null);out.push(row);}return out;}
function w2Cell(date){const c=dayCell(date);const l=bkOfDay(date).sort((a,b)=>bkTotal(b)-bkTotal(a));if(!l.length||role()==='customer')return c;
 const lines=l.slice(0,7).map(b=>`<div class="bl"><span>${esc(cust(b.customerId).name)}</span><b class="num">${t2(bkTotal(b))}</b><span class="st st-${stKey(b)}" style="font-size:12px;padding:0 4px">${(ST_LABEL[stKey(b)]||'').split(' ')[0]}</span></div>`).join('')+(l.length>7?`<div class="small muted">+${l.length-7} đơn</div>`:'');
 const i=c.lastIndexOf('<button class="qadd"');return i>0?c.slice(0,i)+lines+c.slice(i):c.replace(/<\/div>$/,lines+'</div>');}

vCalendar=function(){const[y,m]=V.ym;const isC=role()==='customer';const w2=!isC&&V.calV==='w2';
 let start,n;if(w2){start=V.w2s||addDays(TODAY,-dow(TODAY));n=14;}else{start=iso(y,m,1);n=dim(y,m);}
 const rows=gridDays(start,n);const cell=d=>d?(w2?w2Cell(d):dayCell(d)):'<div class="cell pad" aria-hidden="true"></div>';
 const cells=rows.map(r=>r.map(cell).join('')+(isC?'':weekCell(r))).join('');
 const title=w2?`${dm(start)} – ${dm(addDays(start,13))}/${addDays(start,13).slice(0,4)}`:`THÁNG ${pad(m)} ${y}`;
 const whSel=`<label class="whsel"><span>Kho:</span><select data-a36="wh" aria-label="Chọn kho">${isC?'':`<option value="__all" ${V.whAll?'selected':''}>Tất cả kho</option>`}${WH.map(w=>`<option value="${w.id}" ${!V.whAll&&w.id===V.wh?'selected':''}>${w.name}</option>`).join('')}</select></label>`;
 const IC={m:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3"/></svg>',w2:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="4" width="12" height="3.5" rx="1"/><rect x="2" y="9" width="12" height="3.5" rx="1"/></svg>',
 all:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>',
 hold:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></svg>',
 urg:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 14.5 13h-13z"/><path d="M8 6v3.2M8 11.2v.1"/></svg>',
 mine:'<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.8"/><path d="M2.5 14c.6-3 2.8-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/></svg>',
 key:'<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4 7h.1M6.5 7h.1M9 7h.1M11.5 7h.1M5 9.5h6"/></svg>'};
const F=[['all','Tất cả','Tất cả ngày'],['hold','Chờ xếp xe','Ngày có đơn chờ xếp xe'],['urg','Khẩn','Ngày có đơn khẩn'],...(role()==='cs'||role()==='admin'?[['mine','Của tôi','Ngày có đơn của tôi']]:[])];
const calCnt=k=>{if(k==='all'||isC)return 0;const f0=V.calF;V.calF=k;let n=0;try{rows.forEach(r=>r.forEach(d=>{if(d&&cellMatch(d,dayX(d))&&dayX(d).declared)n++;}));}catch(e){}V.calF=f0;return n;};
const cf=V.calF||'all';
const bar=isC?'':`<div class="cal36bar"><span class="seg36" role="group" aria-label="Kiểu xem lịch"><button class="${w2?'':'on'}" data-a="calV" data-v="m" title="Xem cả tháng" aria-pressed="${!w2}">${IC.m}<span class="t">Tháng</span></button><button class="${w2?'on':''}" data-a="calV" data-v="w2" title="Xem 2 tuần" aria-pressed="${w2}">${IC.w2}<span class="t">2 tuần</span></button></span>
  <span class="seg36" role="group" aria-label="Lọc lịch">${F.map(([k,l,tt])=>{const n=calCnt(k);return `<button class="${cf===k?'on':''}" data-a="calF" data-v="${k}" title="${tt}" aria-label="${tt}${n?' ('+n+')':''}" aria-pressed="${cf===k}">${IC[k]}<span class="t${k==='all'?' keep':''}">${l}</span>${n?`<b class="cnt">${n}</b>`:''}</button>`;}).join('')}</span>
  <span class="grow"></span><button class="btn ghost sm icbtn kbbtn" data-a="scHelp" title="Bảng phím tắt (?)" aria-label="Bảng phím tắt">${IC.key}<span class="t">Phím tắt</span></button></div>`;
 const side=V.sideOff?`<button class="sidebtn" data-a="sideT" title="Mở khung thống kê">« THỐNG KÊ</button>`:statsPanel();
 return `<div class="panel"><div class="calhead v36"><div class="illus">${DK_SVG()}</div>
  <div class="monthnav"><button class="navbtn" data-a="${w2?'w2nav':'month'}" data-d="-1" aria-label="Kỳ trước">‹</button><h1>${title}</h1><button class="navbtn" data-a="${w2?'w2nav':'month'}" data-d="1" aria-label="Kỳ sau">›</button></div>
  <span class="row" style="gap:8px">${!isC&&can('booking.create')?'<button class="btn sm" data-a="newBk">+ Đặt hàng</button>':''}${whSel}</span></div>${bar}
  <div class="calwrap ${V.sideOff?'side-off':''}"><div style="min-width:0"><div class="cal ${isC?'':'v36'}">${WD.map((w,i)=>`<div class="wd">${i===0?'CN':w}</div>`).join('')}${isC?'':'<div class="wd">TUẦN</div>'}${cells}</div>
  <div class="legend">${isC?'':`<span><span class="sw" style="background:var(--ok)"></span>Còn chỗ</span><span><span class="sw" style="background:#e0861a"></span>Gần đầy (≥ ${S.cfg.near}%)</span><span><span class="sw" style="background:var(--bad)"></span>Đã đầy</span><span>⏳ Đơn chờ xếp xe</span><span>${DK_SVG()} Đầu kéo · ${CN_SVG()} Xe thùng</span><span class="muted">Đơn vị: MT (metric tấn)</span>`}</div></div>${side}</div></div>`;};

/* ---------- rê chuột xem nhanh ---------- */
function tipHtml(date){const m=dayX(date);const l=bkOfDay(date);const by={};l.forEach(b=>{const k=cust(b.customerId).name;(by[k]=by[k]||{t:0,s:new Set()});by[k].t+=bkTotal(b);by[k].s.add(ST_LABEL[stKey(b)]);});
 const rows=Object.entries(by).sort((a,b)=>b[1].t-a[1].t);
 return `<h4>${WDS[dow(date)]} ${dmy(date)}${V.whAll?' · tất cả kho':' · '+V.wh}</h4><div class="r"><span>Còn đặt được</span><b>${MT(m.avail)}</b></div><div class="r m"><span>Đã xếp / chờ / năng lực</span><span>${t2(m.loaded)} / ${t2(m.held)} / ${t2(m.cap)}</span></div>
 <div class="r m"><span>Xe trống</span><span>DK ${m.nDK-m.uDK}/${m.nDK} · XT ${m.nCN-m.uCN}/${m.nCN}</span></div>
 ${rows.length?`<div style="margin-top:6px;border-top:1px solid var(--line);padding-top:6px">${rows.slice(0,10).map(([n,v])=>`<div class="r"><span>${esc(n)}</span><span class="num">${t2(v.t)} <span class="m">· ${[...v.s].join(', ')}</span></span></div>`).join('')}${rows.length>10?`<div class="m">+${rows.length-10} khách</div>`:''}</div>`:'<div class="m" style="margin-top:6px">Chưa có đơn.</div>'}
 ${m.reason?`<div class="m" style="margin-top:4px">Ghi chú xe: ${esc(m.reason)}</div>`:''}`;}
(()=>{let tm,cur;const hide=()=>{clearTimeout(tm);cur=null;const t=document.getElementById('calTip');if(t)t.remove();};
 document.addEventListener('mouseover',e=>{const c=e.target.closest&&e.target.closest('[data-tip]');if(!c||V.view!=='calendar'||matchMedia('(hover:none)').matches){if(!c)hide();return;}
  if(cur===c)return;hide();cur=c;tm=setTimeout(()=>{if(!S||cur!==c||!document.body.contains(c))return;const t=document.createElement('div');t.id='calTip';t.innerHTML=tipHtml(c.dataset.tip);document.body.appendChild(t);
   const r=c.getBoundingClientRect();const w=t.offsetWidth,h=t.offsetHeight;let x=r.right+8,y=r.top;if(x+w>innerWidth-8)x=r.left-w-8;if(x<8)x=8;if(y+h>innerHeight-8)y=innerHeight-h-8;t.style.left=x+'px';t.style.top=Math.max(8,y)+'px';},350);});
 document.addEventListener('click',hide,true);document.addEventListener('scroll',hide,true);})();

/* ---------- thống kê Xe (khung bên phải) ---------- */
const statsPanelOld=statsPanel;
statsPanel=function(){if(role()==='customer'||role()==='sales'||V.statMode==='cust'){const h=statsPanelOld();return h.replace(/<aside class="([^"]*)">/,'<aside class="$1"><button class="linkbtn small" data-a="sideT" style="align-self:flex-end">Thu gọn »</button>');}
 const[y,m]=V.ym;const ds=[...Array(dim(y,m))].map((_,i)=>iso(y,m,i+1));const whs=V.whAll?WH.map(w=>w.id):[V.wh];
 let nDK=0,nXT=0,uDK=0,uXT=0,cap=0,ld=0,hd=0,usedCap=0,under=[],dayL=[],near=[],full=[],cut=[];const fm=(+S.cfg.fillMin||70)/100;
 ds.forEach(d=>{let dl=0;whs.forEach(w=>{const mm=dayM(w,d);if(!mm.declared)return;nDK+=mm.nDK;nXT+=mm.nCN;uDK+=mm.uDK;uXT+=mm.uCN;cap+=mm.cap;ld+=mm.loaded;hd+=mm.held;dl+=mm.loaded;
  if(mm.status==='near')near.push([w,d]);if(mm.status==='full')full.push([w,d]);if(mm.reason)cut.push([w,d,mm.reason]);
  mm.trucks.forEach(t=>{const l=loadOf(t.code);if(l>0.001){usedCap+=t.cap;if(l/t.cap<fm)under.push([w,d,t.short,l,t.cap]);}});});dayL.push([d,dl]);});
 const peak=dayL.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,3);
 const hold=S.bookings.filter(b=>whs.includes(b.wh)&&b.status==='hold'&&b.date.startsWith(`${y}-${pad(m)}`)&&ownsCust(b.customerId));const holdT=hold.reduce((s,b)=>s+bkTotal(b)-allocSum(b.id),0);
 const bar=(v,c)=>`<div class="bar2"><i style="width:${Math.min(1,v)*100}%;background:${c}"></i></div>`;
 const chip=(w,d,extra)=>`<button data-a="openDayWh" data-w="${w}" data-d="${d}" title="${esc(extra||'')}">${dm(d)}${V.whAll?' '+w:''}</button>`;
 const wk=gridDays(iso(y,m,1),ds.length).map(r=>r.filter(Boolean)).map(r=>{let c=0,u=0;r.forEach(d=>whs.forEach(w=>{const mm=dayM(w,d);if(mm.declared){c+=mm.cap;u+=mm.loaded;}}));return{lb:dm(r[0]),p:c?u/c:0};});
 const td=[TODAY,addDays(TODAY,1)].map(d=>{let a=0,n=0,u=0;whs.forEach(w=>{const mm=dayM(w,d);a+=mm.avail;n+=mm.nDK+mm.nCN;u+=mm.uDK+mm.uCN;});return{d,a,n,u};});
 return `<aside class="stats ts36">${statModeHead()}<div class="row"><h3 class="grow" style="margin:0">THỐNG KÊ XE · T${m}</h3><button class="linkbtn small" data-a="sideT">Thu gọn »</button></div>
  <div class="bignum num"><small>ĐÃ XẾP XE THÁNG ${pad(m)}</small>${t2(ld)}<small style="display:inline;margin-left:4px">MT</small></div>
  <div><div class="kpi"><span class="lbl">% sử dụng năng lực</span><b>${cap?pct((ld+hd)/cap):'–'}</b></div>${bar(cap?(ld+hd)/cap:0,'var(--ok)')}<div class="small muted num">Xếp ${t2(ld)} + chờ ${t2(hd)} / ${MT(cap)}</div></div>
  <div><div class="kpi"><span class="lbl">Lấp đầy xe đang chạy</span><b>${usedCap?pct(ld/usedCap):'–'}</b></div>${bar(usedCap?ld/usedCap:0,'#2f6db5')}<div class="small muted">MT trên xe ÷ tải trọng các xe có hàng</div></div>
  <div><div class="lbl">Lượt xe đã dùng / khai báo</div><div class="line num">${DK_SVG()} <span class="grow">${uDK}/${nDK}</span><b>${nDK?pct(uDK/nDK):'–'}</b></div>${bar(nDK?uDK/nDK:0,'#2346b0')}<div class="line num" style="margin-top:6px">${CN_SVG()} <span class="grow">${uXT}/${nXT}</span><b>${nXT?pct(uXT/nXT):'–'}</b></div>${bar(nXT?uXT/nXT:0,'#5f84a8')}</div>
  <div><div class="lbl">Theo tuần (% đã xếp)</div><div class="wkbars">${wk.map(x=>`<div title="Tuần từ ${x.lb}: ${pct(x.p)}"><i style="height:${Math.max(2,x.p*48)}px;background:${x.p>=S.cfg.near/100?'#e0861a':'var(--ok)'}"></i>${x.lb}</div>`).join('')}</div></div>
  <div><div class="lbl">Hôm nay & ngày mai</div>${td.map(x=>`<div class="kpi clk" data-a="openDayWh" data-w="${whs[0]}" data-d="${x.d}"><span>${WDS[dow(x.d)]} ${dm(x.d)} · xe ${x.u}/${x.n}</span><span class="num">còn <b style="font-size:15px">${t2(x.a)}</b> MT</span></div>`).join('')}</div>
  <div class="clk" data-a="calF" data-v="hold"><div class="kpi"><span class="lbl">⏳ Chờ xếp xe trong tháng</span><b>${hold.length}</b></div><div class="small muted num">${MT(holdT)} · bấm để lọc lịch</div></div>
  ${peak.length?`<div><div class="lbl">Ngày cao điểm</div>${peak.map(([d,v])=>`<div class="kpi clk" data-a="openDayWh" data-w="${whs[0]}" data-d="${d}"><span>${WDS[dow(d)]} ${dm(d)}</span><span class="num">${MT(v)}</span></div>`).join('')}</div>`:''}
  ${full.length||near.length?`<div><div class="lbl">Ngày đầy / gần đầy</div><div class="chips">${full.map(([w,d])=>chip(w,d,'Đã đầy')).join('')}${near.map(([w,d])=>chip(w,d,'Gần đầy')).join('')}</div></div>`:''}
  ${under.length?`<div><div class="lbl">Xe chạy non tải (&lt; ${Math.round(fm*100)}%) · ${under.length} lượt</div><div class="chips">${[...new Map(under.map(u=>[u[0]+u[1],u])).values()].slice(0,12).map(u=>chip(u[0],u[1],under.filter(x=>x[0]===u[0]&&x[1]===u[1]).map(x=>`${x[2]} ${t2(x[3])}/${x[4]}`).join(', '))).join('')}</div><div class="small muted">Gợi ý: ghép đơn cùng khu vực để đầy xe</div></div>`:''}
  ${cut.length?`<div><div class="lbl">Ngày có ghi chú giảm xe · ${cut.length}</div><div class="chips">${cut.slice(0,10).map(([w,d,r])=>chip(w,d,r)).join('')}</div></div>`:''}
  ${can('dash.ops')?`<button class="linkbtn small" data-a="goDashLog">Xem ở Bảng thống kê › Logistics →</button>`:''}</aside>`;};

/* ---------- thao tác ---------- */
function sideSave(){try{localStorage.setItem('cal-side-off',V.sideOff?'1':'');}catch(e){}}
try{V.sideOff=localStorage.getItem('cal-side-off')==='1';}catch(e){}
Object.assign(A,{
 calV:d=>{V.calV=d.v==='w2'?'w2':'m';if(V.calV==='w2'&&!V.w2s){const s=addDays(TODAY,-dow(TODAY));V.w2s=s;}render();},
 w2nav:d=>{V.w2s=addDays(V.w2s||addDays(TODAY,-dow(TODAY)),14*(+d.d));afterNav(goMonth(V.w2s)||goMonth(addDays(V.w2s,13)));},
 calF:d=>{V.calF=V.calF===d.v&&d.v!=='all'?'all':d.v;if(V.view!=='calendar')go('calendar');else render();},
 sideT:()=>{V.sideOff=!V.sideOff;sideSave();render();},
 openDayWh:d=>{if(V.whAll){V.whAll=false;}V.wh=d.w;A.openDay({d:d.d});},
 goDashLog:()=>{if(typeof dzInit==='function'){dzInit();V.dz.tab='log';}go('dash');},
 calDrill:d=>{if(typeof dzInit!=='function')return;const Z=dzInit();const[y,m]=V.ym;Z.tab='ov';Z.per='month';Z.anchor=iso(y,m,1);Z.wh=d.w==='all'?'':d.w||'';Z.seg=d.g&&d.g!=='all'?d.g:'';Z.pend={k:d.k,title:d.t};go('dash');},
 calNoBk:()=>{V.modal={type:'noBk',wide:true};render();}
});
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset||el.dataset.a36!=='wh')return;if(el.value==='__all'){V.whAll=true;}else{V.whAll=false;V.wh=el.value;V.fleetEdit={};}render();});

/* drill từ khung Khách: mở Bảng thống kê đúng tháng / kho / segment rồi mở danh sách đơn */
const DRILL36={ok:r=>r.grp==='ok',hold:r=>r.grp==='hold',resched:r=>r.grp==='resched',draft:r=>r.grp==='draft',rej:r=>r.grp==='rej',
 h1:r=>isBook(r)&&+r.d.slice(8)<=15,h2:r=>isBook(r)&&+r.d.slice(8)>15,okPast:r=>r.grp==='ok'&&r.d<TODAY,all:r=>isBook(r)};
if(typeof vDash==='function'){const vd=vDash;vDash=function(){const Z=dzInit();const h=vd();
 const[pf,pt]=dzRange(Z);if(Z.pend&&Z.D&&!Z.busy&&Z.key===pf+'|'+pt){const p=Z.pend;Z.pend=null;const from=pf,to=pt;const S_=dzScope(Z,from,to);const f=p.k.startsWith('c:')?(r=>r.cid===p.k.slice(2)&&isBook(r)):DRILL36[p.k]||DRILL36.all;
  setTimeout(()=>dzDrill(p.title,S_.list.filter(f)),0);}return h;};}
M29.noBk=function(){const d=V.cs&&V.cs.data;if(!d)return '<div class="empty">Đang tải…</div>';const[y,m]=V.ym;const scope=d.scope||'all';const seg=csSeg(scope);
 const R=csCompute(d,{seg,wh:V.ssAll!==false?'all':V.wh,from:iso(y,m,1),to:iso(y,m,dim(y,m))});const L=R.noBk.slice().sort((a,b)=>(a.salesName||'').localeCompare(b.salesName||'')||a.name.localeCompare(b.name));
 return `<div class="mhead"><span class="meta">${L.length}/${R.custCount} khách · tháng ${pad(m)}/${y}</span></div><h2 style="margin-bottom:8px">KHÁCH CHƯA ĐẶT THÁNG NÀY</h2>
 <div class="tbl-wrap" style="max-height:60vh;overflow:auto"><table><thead><tr><th>Mã KH</th><th>Khách hàng</th><th>Segment</th><th>Sales phụ trách</th></tr></thead><tbody>${L.map(c=>`<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${SEG_LABEL[c.segment]||''}</td><td>${esc(c.salesName||'(chưa gán)')}</td></tr>`).join('')}</tbody></table></div>
 <div class="mfoot"><button class="btn" data-a="close">Đóng</button></div>`;};
