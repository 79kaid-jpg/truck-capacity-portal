// v3.31: Việc của tôi · Chế độ kho · Link tài xế + ảnh giao hàng · Copy tin cho khách · Tổng quan khách
(()=>{const st=document.createElement('style');st.textContent=`
.mw{display:grid;gap:8px}.mwrow{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-left:4px solid var(--line);border-radius:10px;background:var(--surface);cursor:pointer}
.mwrow:hover{border-color:var(--ink)}.mwrow.late{border-left-color:var(--bad)}.mwrow.soon{border-left-color:#e59a00}.mwrow.ok{border-left-color:var(--ok)}
.mwrow .ic{font-size:18px;line-height:1.2;flex:none}.mwrow .grow{min-width:0}.mwrow .l{font-size:13px;color:var(--muted)}.mwrow .age{font-size:12px;font-weight:700;white-space:nowrap}
.mwrow.late .age{color:var(--bad)}.mwrow.soon .age{color:#9a5b00}
.mwsum{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}.mwsum button{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 12px;cursor:pointer}.mwsum button.on{background:var(--navy);color:var(--on-navy);border-color:var(--navy)}
.yard{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.ycard{border:1.5px solid var(--line);border-left:6px solid var(--tc,var(--line));border-radius:14px;background:var(--surface);padding:14px;display:grid;gap:8px}
.ycard h3{margin:0;font:900 26px/1 var(--f-display);display:flex;gap:8px;align-items:center}.ycard .meta{font-size:13px;color:var(--muted)}
.ycard .stops{font-size:14px;display:grid;gap:4px}.ycard .stops div{display:flex;gap:6px;align-items:baseline}
.ycard .acts{display:grid;gap:8px}.ycard .acts .btn{font-size:16px;padding:12px 14px;min-height:48px;justify-content:center;width:100%}
.yhead{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px}.yhead .btn{min-height:40px}
.ovgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:8px 0}.ovgrid .tile{padding:10px;border:1px solid var(--line);border-radius:10px}
.ovbars{display:grid;gap:4px;margin:6px 0}.ovbars .r{display:grid;grid-template-columns:62px 1fr 92px;gap:8px;align-items:center;font-size:12.5px}
.ovbars .t{height:12px;background:var(--line);border-radius:6px;overflow:hidden;display:flex}.ovbars .t i{display:block;height:100%}
.podimg{max-width:100%;max-height:60vh;border-radius:8px;display:block;margin:6px auto}
@media (max-width:700px){.top .pkoff{font-size:0;padding:4px 7px;white-space:nowrap}.top .pkoff::first-letter{font-size:14px}.top .userbtn>span:nth-child(2),.top .userbtn>span:nth-child(3){display:none}.top .userbtn{padding:2px;flex:0 0 auto}}@media (min-width:701px){.top .menu .mname{display:none}.top{min-width:0;max-width:100vw}}
`;document.head.appendChild(st);})();
IC.work='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9l2 2 4-4M8 15h8"/></svg>';
IC.yard='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20V9l9-5 9 5v11"/><path d="M7 20v-7h10v7M7 16h10"/></svg>';
const isLogR=()=>can('delivery.ship')&&!S.custView;
const ageMin=m=>Math.max(0,S.clock-m);
const ageTxt=m=>{const a=ageMin(m);return a<60?a+' phút':a<1440?Math.floor(a/60)+' giờ':Math.floor(a/1440)+' ngày';};
// ---------- Việc của tôi ----------
const MW={f:'all'};
function mwItems(){const out=[];const r=role();const push=(k,ic,title,sub,at,sla,go)=>out.push({k,ic,title,sub,at,sla,go});
 // yêu cầu đặt hàng chờ CS
 if(typeof rqCanHandle==='function'&&rqCanHandle())(S.reqs||[]).filter(r=>r.status==='new').forEach(q=>push('req','💬',`Yêu cầu · ${rqCustName(q.customerId)} · giao ${dm(q.deliver||q.date)}`,(q.tons?t2(q.tons)+' MT · ':'')+q.body,q.at,120,{a:'rqList',d:q.date,w:q.wh}));
 // câu hỏi Trao đổi đang chờ mình
 if(typeof tkList==='function')tkList().filter(tkNeed).forEach(t=>push('talk','❓',`Trao đổi · ${tkTitle(t)}`,(t.lastBy||'')+': '+(t.lastText||''),t.askedAt||t.lastAt,+S.cfg.talkRemindHours*60||120,{a:'tkOpen',k:t.k,r:t.ref}));
 // đơn cần CS xử lý (giống tab Cần xử lý)
 if(can('booking.create')||can('booking.edit'))S.bookings.filter(b=>visibleBk(b)&&(b.status==='draft'&&b.csId===V.me||(b.status==='resched'||b.status==='hold'&&b.date<TODAY||b.status==='rejected'&&b.date>=addDays(TODAY,-7))&&myCsCust(cust(b.customerId))||todo29(b,false)))
  .forEach(b=>{const why=(+b.shortTons||0)>0?`Load thiếu ${t2(b.shortTons)} MT`:b.status==='failed'?'Giao không thành công':b.status==='resched'?'Đề nghị đổi ngày'+(b.proposedDate?' → '+dm(b.proposedDate):''):b.status==='rejected'?'Bị từ chối':b.status==='hold'?'Chờ xếp xe đã qua ngày bốc':'Nháp chưa gửi';
   push('bk',(+b.shortTons||0)>0?'⚖️':b.status==='failed'?'⛔':b.status==='rejected'?'✗':'📦',`${why} · ${cust(b.customerId)?.name||''}`,`${b.id} · ngày bốc ${dm(b.date)} · ${t2(bkTotal(b))} MT`,b.heldAt,b.status==='draft'?1440:240,{a:'openBk',id:b.id});});
 // Logistics: chờ xếp xe + chưa xác nhận giao
 if(can('alloc.assign'))S.bookings.filter(b=>b.status==='hold'&&myWhs().includes(b.wh)&&b.date>=TODAY&&visibleBk(b)).forEach(b=>push('hold','🚚',`Chờ xếp xe · ${cust(b.customerId)?.name||'Khách khác'}`,`${b.id} · ${b.wh} ${dm(b.date)} · ${t2(bkTotal(b))} MT`,b.heldAt,+S.cfg.sla||60,{a:'openBk',id:b.id}));
 if(isLogR()&&typeof shipLate==='function')S.bookings.filter(b=>shipLate(b)&&myWhs().includes(b.wh)).forEach(b=>push('ship','⏰',`Chưa xác nhận giao · ${cust(b.customerId)?.name||''}`,`${b.id} · ${ST_LABEL[stKey(b)]} từ ${dm(b.date)}`,b.loadedAt||b.heldAt,0,{a:'openBk',id:b.id}));
 return out.map(x=>{const a=ageMin(x.at||S.clock);x.st=x.sla===0||a>x.sla?'late':a>x.sla*0.7?'soon':'ok';return x;}).sort((a,b)=>({late:0,soon:1,ok:2})[a.st]-({late:0,soon:1,ok:2})[b.st]||(a.at||0)-(b.at||0));}
const MW_K={all:'Tất cả',req:'Yêu cầu',talk:'Câu hỏi',bk:'Đơn cần xử lý',hold:'Chờ xếp xe',ship:'Chưa xác nhận giao'};
function vMyWork(){const all=mwItems();const ks=Object.keys(MW_K).filter(k=>k==='all'||all.some(x=>x.k===k));const l=MW.f==='all'?all:all.filter(x=>x.k===MW.f);
 return `<div class="panel"><div class="pagehead"><h2>✅ VIỆC CỦA TÔI</h2><span class="muted small">${all.length} việc · ${all.filter(x=>x.st==='late').length} quá hạn</span></div>
 <p class="small muted" style="margin:0 0 8px">Gom mọi thứ đang chờ bạn: yêu cầu đặt hàng, câu hỏi Trao đổi, đơn cần xử lý, đơn chờ xếp xe, đơn chưa xác nhận giao. Viền đỏ = quá hạn, cam = sắp quá hạn. Phím tắt <b>G V</b>.</p>
 <div class="mwsum">${ks.map(k=>`<button class="${MW.f===k?'on':''}" data-a="mwF" data-v="${k}">${MW_K[k]} ${k==='all'?all.length:all.filter(x=>x.k===k).length}</button>`).join('')}</div>
 <div class="mw">${l.map((x,i)=>`<div class="mwrow ${x.st}" data-a="mwGo" data-i="${all.indexOf(x)}" role="button" tabindex="0"><span class="ic">${x.ic}</span><div class="grow"><b>${esc(x.title)}</b><div class="l">${esc(x.sub)}</div></div><span class="age" title="Đã chờ">${x.at?ageTxt(x.at):''}</span></div>`).join('')||'<div class="empty">Không có việc nào đang chờ bạn. 🎉</div>'}</div></div>`;}
A.mwF=d=>{MW.f=d.v;render();};
A.mwGo=d=>{const x=mwItems()[+d.i];if(!x)return;const g=x.go;if(g.a==='openBk')return openBooking(g.id);if(g.a==='tkOpen')return A.tkOpen({k:g.k,r:g.r});if(g.a==='rqList'){V.view='calendar';A.rqList({d:g.d,w:g.w});}};
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('mwrow')){e.preventDefault();A.mwGo({i:e.target.dataset.i});}});
// ---------- Chế độ kho (Logistics, điện thoại / máy tính bảng) ----------
const YD={day:null};
function vYard(){const d=YD.day||TODAY;const ws=WH.filter(w=>myWhs().includes(w.id));const w=ws.find(x=>x.id===V.wh)?V.wh:(ws[0]||{}).id;
 const trucks=w?trucksOf(w,d).filter(t=>liveAllocsOnTruck(t.code).length):[];
 const card=t=>{const L=trkBks(t.code);const ok=L.filter(x=>x.b.status==='ok').length,ld=L.filter(x=>x.b.status==='loaded').length,tr=L.filter(x=>x.b.status==='transit').length,dl=L.filter(x=>x.b.status==='delivered').length;
  const l=loadOf(t.code);const trip=tripOf(t.code);
  return `<div class="ycard" style="--tc:${TCOL[tLoadState(l,t.cap,truckLocked(t))]}"><h3>${t.short} ${trip?tripPill(t.code):''}</h3><div class="meta">${t2(l)}/${t.cap} MT · ${L.length} đơn${t.info&&t.info.plate?' · '+esc(t.info.plate):''}${t.info&&t.info.driver?' · '+esc(t.info.driver):''}</div>
   <div class="stops">${L.map(x=>`<div><span class="st st-${stKey(x.b)}">${ST_LABEL[stKey(x.b)]}</span><span>${esc(cust(x.b.customerId)?.name||'Khách khác')} · ${t2(x.tons)} MT</span></div>`).join('')}</div>
   <div class="acts">${ok?`<button class="btn" data-a="ydGo" data-c="${t.code}" data-k="load">✓ Bốc xong (${ok} đơn)</button>`:''}${ld?`<button class="btn" data-a="ydGo" data-c="${t.code}" data-k="go">🚚 Xe xuất phát (${ld} đơn)</button>`:''}
    ${tr?`<button class="btn ghost" data-a="ydGo" data-c="${t.code}" data-k="">✓ Đã giao từng điểm (${tr} đang giao)</button>`:''}${!ok&&!ld&&!tr?`<span class="small muted">${dl?'Đã giao xong '+dl+' đơn':'Chưa có đơn sẵn sàng bốc'}</span>`:''}
    <button class="btn ghost sm" data-a="drvLink" data-c="${t.code}">📱 Link cho tài xế</button></div></div>`;};
 return `<div class="panel"><div class="pagehead"><h2>🏭 CHẾ ĐỘ KHO</h2></div>
 <div class="yhead">${ws.map(x=>`<button class="btn ${x.id===w?'':'ghost'} sm" data-a="ydWh" data-v="${x.id}">${esc(x.id)}</button>`).join('')}<span class="grow"></span>
  <button class="btn ${d===TODAY?'':'ghost'} sm" data-a="ydDay" data-v="${TODAY}">Hôm nay</button><button class="btn ${d===addDays(TODAY,1)?'':'ghost'} sm" data-a="ydDay" data-v="${addDays(TODAY,1)}">Ngày mai</button></div>
 <p class="small muted" style="margin:0 0 10px">${WDS[dow(d)]} ${dmy(d)} · chỉ các xe có hàng. Nút to cho điện thoại; mỗi bước vẫn đi qua danh sách kiểm tra như hộp xe.</p>
 <div class="yard">${trucks.map(card).join('')||'<div class="empty">Không có xe nào có hàng ngày này.</div>'}</div></div>`;}
A.ydWh=d=>{V.wh=d.v;V.whAll=false;render();};
A.ydDay=d=>{YD.day=d.v;afterNav(goMonth(d.v));};
A.ydGo=d=>{V.modal={type:'truck',code:d.c};render();if(d.k)A.trkStart({k:d.k,c:d.c});setTimeout(()=>{const el=document.querySelector('.modal .trk');if(el)el.scrollIntoView({block:'center'});},50);};
// ---------- Link cho tài xế ----------
A.drvLink=async d=>{try{const r=await rpc('driver_link_create',{p_truck:d.c});const url=location.origin+location.pathname.replace(/[^/]*$/,'')+'driver.html#'+r.token;const t=truckByCode(d.c);
 V.modal={type:'drv',code:d.c,url,exp:r.expiresAt};render();}catch(e){toast(e.message);}};
M29.drv=function(){const M=V.modal;const t=truckByCode(M.code);
 return `<div class="mhead"><h2>📱 LINK CHO TÀI XẾ · ${t?t.short:''}</h2></div><p class="small">Gửi link này cho tài xế qua Zalo / SMS. Tài xế <b>không cần tài khoản</b>: mở link, bấm <b>Bắt đầu chạy</b>, rồi <b>Đã giao</b> (chụp ảnh biên nhận) hoặc <b>Không giao được</b> ở từng điểm. CS, Sales, khách nhận thông báo ngay.</p>
 <div class="row" style="gap:6px;flex-wrap:nowrap"><input class="inp grow" id="drv-url" readonly value="${esc(M.url)}"><button class="btn sm" data-a="drvCopy">Sao chép</button></div>
 <p class="small muted">Hết hạn ${clockStr(Math.floor(M.exp/60))}. Ai có link đều xác nhận được giao hàng cho xe này – chỉ gửi cho đúng tài xế.</p>
 <div class="mfoot"><button class="btn ghost danger" data-a="drvRevoke" data-c="${M.code}">Thu hồi link</button><span class="grow"></span><button class="btn ghost" data-a="close">Đóng</button></div>`;};
A.drvCopy=async()=>{const i=document.getElementById('drv-url');try{await navigator.clipboard.writeText(i.value);toast('Đã sao chép link');}catch(e){i.select();toast('Nhấn Ctrl+C để sao chép');}};
A.drvRevoke=d=>mutate('driver_link_revoke',{p_truck:d.c},{ok:()=>{V.modal=null;toast('Đã thu hồi link – tài xế không dùng được nữa');}});
{const m0=mTruck;mTruck=function(){const h=m0();const t=V.modal&&truckByCode(V.modal.code);if(!t||!isLogR()||!liveAllocsOnTruck(t.code).length)return h;
 return h.replace('<h4>BỐC / GIAO THEO XE</h4>',`<h4 class="row" style="justify-content:space-between">BỐC / GIAO THEO XE <button class="btn ghost sm" data-a="drvLink" data-c="${t.code}">📱 Link cho tài xế</button></h4>`);};}
// ---------- Ảnh giao hàng + Copy tin cho khách + Tổng quan khách (chi tiết booking) ----------
function shareText(b){const c=cust(b.customerId);const al=allocsOf(b.id).map(a=>truckByCode(a.truck)).filter(Boolean);const tk=al[0];
 const lines=b.lines.map(l=>`${l.p||''} ${l.c||''} ${l.th?l.th+'mm':''}`.replace(/\s+/g,' ').trim()+` – ${t2(l.t)} MT`).join('; ');
 const st={hold:'đang chờ xếp xe',ok:'đã xếp xe',loaded:'đã bốc lên xe',transit:'đang trên đường giao',delivered:'đã giao xong',failed:'giao chưa thành công',resched:'đang đề nghị đổi ngày',rejected:'chưa xếp được xe',draft:'đang chuẩn bị',cancelled:'đã hủy'}[b.status]||ST_LABEL[stKey(b)];
 return `Đặt Xe BlueScope – cập nhật đơn ${b.ref||b.id}${c?' của '+c.name:''}:\n• Hàng: ${lines}\n• Ngày bốc tại kho ${b.wh}: ${dmy(b.date)}\n• Trạng thái: ${st}`
  +(tk&&['ok','loaded','transit'].includes(b.status)?`\n• Xe: ${tk.short}${tk.info&&tk.info.plate?' – biển số '+tk.info.plate:''}${tk.info&&tk.info.driver?' – tài xế '+tk.info.driver+(tk.info.phone?' ('+tk.info.phone+')':''):''}`:'')
  +(b.status==='transit'&&b.eta?`\n• Dự kiến tới: ${clockStr(b.eta)}`:'')+(b.status==='delivered'&&b.deliveredAt?`\n• Giao lúc: ${clockStr(b.deliveredAt)}`:'')+(b.addrText?`\n• Giao đến: ${b.addrText}`:'');}
A.bkShare=async d=>{const b=bkById(d.id);if(!b)return;const t=shareText(b);try{await navigator.clipboard.writeText(t);toast('Đã sao chép – dán vào Zalo / SMS cho khách');}catch(e){V.modal={type:'shareTxt',t};render();}};
M29.shareTxt=function(){return `<div class="mhead"><h2>TIN CHO KHÁCH</h2></div><textarea class="inp" id="share-t" style="width:100%;min-height:160px">${esc(V.modal.t)}</textarea><div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;};
A.bkPod=async d=>{try{const l=await rpc('pod_list',{p_booking:d.id});V.modal={type:'pod',id:d.id,l};render();}catch(e){toast(e.message);}};
M29.pod=function(){const M=V.modal;return `<div class="mhead"><h2>📷 ẢNH GIAO HÀNG · ${esc(M.id)}</h2></div>${M.l.map(p=>`<div class="small muted">${clockStr(p.at)} · ${esc(p.note||'')}</div><img class="podimg" alt="Ảnh giao hàng" src="data:image/jpeg;base64,${p.b64}">`).join('')||'<div class="empty">Chưa có ảnh.</div>'}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;};
A.custOv=async d=>{const c=cust(d.id);if(!c)return;V.modal={type:'custOv',id:c.id,d:null,wide:true};render();try{V.modal.d=await rpc('cust_overview',{p_customer:c.id});render();}catch(e){V.modal=null;toast(e.message);}};
M29.custOv=function(){const M=V.modal;const c=cust(M.id);const D=M.d;
 if(!D)return `<div class="mhead"><h2>${esc(c.name)}</h2></div><div class="empty">Đang tải…</div>`;
 const mx=Math.max(1,...D.months.map(m=>+m.booked||0));const sales=user(c.salesId);
 return `<div class="mhead"><h2>👤 ${esc(c.name)}</h2><span class="meta">${esc(c.code)} · ${SEG_LABEL[c.segment]||''}${sales?' · Sales '+esc(sales.name):''}</span></div>
 <div class="ovgrid"><div class="tile"><span class="lbl small muted">Đơn gần nhất</span><div><b>${D.lastOrder?dmy(D.lastOrder):'–'}</b></div></div><div class="tile"><span class="lbl small muted">Yêu cầu chờ CS</span><div><b>${D.openReqs}</b></div></div><div class="tile"><span class="lbl small muted">Câu hỏi nội bộ đang chờ</span><div><b>${D.talks}</b></div></div></div>
 <h4 style="margin:10px 0 4px;font-size:12px">6 THÁNG GẦN NHẤT (MT)</h4><div class="ovbars">${D.months.map(m=>`<div class="r"><span class="num">${m.m.slice(5)}/${m.m.slice(2,4)}</span><span class="t" title="Đặt ${t2(+m.booked||0)} · giao ${t2(+m.delivered||0)} · từ chối ${t2(+m.rejected||0)}"><i style="width:${(+m.delivered||0)/mx*100}%;background:var(--ok)"></i><i style="width:${((+m.booked||0)-(+m.delivered||0))/mx*100}%;background:var(--blue)"></i><i style="width:${(+m.rejected||0)/mx*100}%;background:var(--bad)"></i></span><span class="num small">${t2(+m.booked||0)} · ${m.n} đơn</span></div>`).join('')||'<div class="small muted">Chưa có đơn trong 6 tháng.</div>'}</div>
 <div class="small muted">Xanh lá: đã giao · xanh dương: đặt chưa giao · đỏ: bị từ chối</div>
 ${D.reasons.length?`<h4 style="margin:10px 0 4px;font-size:12px">LÝ DO BỊ TỪ CHỐI (6 THÁNG)</h4><div class="small">${D.reasons.map(r=>esc(r.r)+' ×'+r.n).join(' · ')}</div>`:''}
 <h4 style="margin:10px 0 4px;font-size:12px">ĐƠN GẦN ĐÂY</h4><div class="tbl-wrap"><table><thead><tr><th>Mã</th><th>Ngày bốc</th><th class="r">MT</th><th>Trạng thái</th></tr></thead><tbody>${D.recent.map(b=>`<tr class="click" data-a="openBk" data-id="${b.id}"><td>${esc(b.ref||b.id)}</td><td class="num">${dmy(b.day)}</td><td class="r num">${t2(+b.tons)}</td><td>${ST_LABEL[b.status]||b.status}</td></tr>`).join('')}</tbody></table></div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;};
{const r0=render;render=function(){r0();if(!S||V.view!=='booking'||!V.bk||role()==='customer'||S.custView)return;const b=bkById(V.bk);const h=document.querySelector('.main .pagehead');if(!b||!h||h.querySelector('[data-a="bkShare"]'))return;
 const add=(a,t,ti)=>{const x=document.createElement('button');x.className='btn ghost';x.dataset.a=a;x.dataset.id=a==='custOv'?b.customerId:b.id;x.textContent=t;x.title=ti;h.appendChild(x);};
 add('bkShare','📋 Copy tin cho khách','Tạo sẵn đoạn tình trạng đơn để dán vào Zalo / SMS');
 if(ownsCust(b.customerId))add('custOv','👤 Tổng quan khách','Lịch sử 6 tháng, lý do từ chối, đơn gần đây');
 if(['delivered','transit','loaded','failed'].includes(b.status))add('bkPod','📷 Ảnh giao hàng','Ảnh biên nhận tài xế gửi');};}
// ---------- điều hướng ----------
NAV.splice(1,0,{v:'mywork',label:'Việc của tôi',ic:'work',ok:()=>!!S&&role()!=='customer'&&!S.custView});
NAV.splice(2,0,{v:'yard',label:'Chế độ kho',ic:'yard',ok:()=>!!S&&isLogR()});
{const m0=mainView;mainView=function(){if(V.view==='mywork'&&role()!=='customer')return vMyWork();if(V.view==='yard'&&isLogR())return vYard();return m0();};}
{const r0=render;render=function(){r0();if(!S||role()==='customer')return;const sb=document.querySelector('.side [data-v="mywork"]');if(!sb)return;
 const n=mwItems().filter(x=>x.st==='late').length;let dt=sb.querySelector('.dot');if(n){if(!dt){dt=document.createElement('span');dt.className='dot';sb.appendChild(dt);}dt.textContent=n;}else if(dt)dt.remove();};}
if(typeof SC!=='undefined'){const x=['goWork','global','Mở Việc của tôi','G V',()=>role()!=='customer'&&go('mywork')];SC.push(x);if(typeof SC_BY!=='undefined')SC_BY.goWork=x;}
