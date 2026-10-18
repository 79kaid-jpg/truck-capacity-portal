// v3.26: thẻ xe không tràn chữ ở màn hình nhỏ · thao tác theo xe: Bốc xong cả xe / Xe xuất phát / Đã giao từng điểm (vẫn qua từng đơn, đủ kiểm tra)
(()=>{const st=document.createElement('style');st.textContent=`
.tcard{container-type:inline-size}.tc-top{flex-wrap:wrap;row-gap:4px;min-width:0}.tc-top .grow{min-width:0}
.tcard .pill{white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}.tc-acts{flex-wrap:wrap}
@container (max-width:250px){.tc-top svg{width:88px}.tcard .tc-code{font-size:17px}.tcard .pill{font-size:10px;padding:2px 6px}.tc-acts .btn{padding:4px 8px;font-size:11px}}
@container (max-width:200px){.tc-top svg{width:72px}}
.trk{margin:12px 0;padding:12px 14px;border:1.5px solid var(--ink);border-radius:12px;background:var(--surface)}
.trk h4{margin:0 0 8px;font-size:13px;letter-spacing:.04em}.trk .row{gap:8px;flex-wrap:wrap;align-items:center}
.trk table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.trk td{padding:5px 6px;border-top:1px solid var(--line);vertical-align:middle}
.trk .warn{color:#9a5b00;font-size:12px}.trk .bad{color:var(--bad);font-size:12px}
.trkres{margin-top:8px;font-size:12.5px}.trkres div{padding:2px 0}
`;document.head.appendChild(st);})();
const trkCan=()=>!!S&&!S.custView&&can('delivery.ship');
// các đơn trên xe (mỗi đơn một lần) + phần hàng của đơn trên xe khác
function trkBks(code){const seen=new Set();const out=[];liveAllocsOnTruck(code).forEach(a=>{if(seen.has(a.bk))return;seen.add(a.bk);const b=bkById(a.bk);if(!b)return;
 const others=allocsOf(b.id).filter(x=>x.truck!==code);out.push({b,tons:liveAllocsOnTruck(code).filter(x=>x.bk===b.id).reduce((s,x)=>s+x.tons,0),others});});return out;}
const trkOther=o=>o.others.map(x=>{const t=truckByCode(x.truck);return `${t?t.short:x.truck} ${t2(x.tons)} MT`;}).join(', ');
const trkNeedPick=b=>!pickOff()&&!b.deliveryAt&&!(+b.coils>0);
function trkBlock(t){if(!trkCan())return '';const L=trkBks(t.code);if(!L.length)return '';const M=V.modal;const T=M.trk&&M.trk.code===t.code?M.trk:null;
 const ok=L.filter(x=>x.b.status==='ok'),ld=L.filter(x=>x.b.status==='loaded'),tr=L.filter(x=>['loaded','transit'].includes(x.b.status));
 const st=b=>`<span class="st st-${stKey(b)}">${ST_LABEL[stKey(b)]}</span>`;
 let body='';
 if(T&&T.k==='load'){body=`<div class="small">Chọn các đơn <b>đã lên xe đủ hàng</b>. Đơn bốc thiếu: bỏ chọn rồi bấm <b>Bốc từng đơn</b> để tick cuộn không lên xe.</div>
  <table>${ok.map(x=>{const np=trkNeedPick(x.b);const sp=x.others.length;return `<tr><td style="width:28px"><input type="checkbox" data-trk="${x.b.id}" ${T.sel.includes(x.b.id)?'checked':''} ${np?'disabled':''} aria-label="Chọn ${x.b.id}"></td>
   <td><b>${esc(cust(x.b.customerId).name)}</b> <span class="muted small">${x.b.id}</span><br><span class="num">${t2(x.tons)} MT trên xe này</span>
   ${sp?`<div class="warn">⚠ Đơn còn ${trkOther(x)} trên xe khác – chỉ chọn khi các xe đó cũng đã bốc xong.</div>`:''}${np?`<div class="bad">⛔ Chưa có danh sách cuộn – CS cần Xác nhận giao hàng trước.</div>`:''}</td>
   <td style="text-align:right"><button class="btn ghost sm" data-a="trkOne" data-k="load" data-id="${x.b.id}">Bốc từng đơn</button></td></tr>`;}).join('')}</table>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-a="trkRun" ${T.sel.length&&!T.busy?'':'disabled'}>${T.busy?'Đang xử lý…':`✓ Xác nhận đã bốc ${T.sel.length} đơn`}</button><button class="btn ghost sm" data-a="trkCancel">Thôi</button></div>`;}
 else if(T&&T.k==='go'){body=`<div class="small">Chuyển các đơn đã bốc trên xe sang <b>Đang giao</b>. Khách, CS và Sales được báo.</div>
  <table>${ld.map(x=>`<tr><td style="width:28px"><input type="checkbox" data-trk="${x.b.id}" ${T.sel.includes(x.b.id)?'checked':''} aria-label="Chọn ${x.b.id}"></td><td><b>${esc(cust(x.b.customerId).name)}</b> <span class="muted small">${x.b.id}</span> · <span class="num">${t2(x.tons)} MT</span>${x.others.length?`<div class="warn">⚠ Còn ${trkOther(x)} trên xe khác</div>`:''}</td></tr>`).join('')}</table>
  <div class="row" style="margin-top:8px"><div class="field"><label for="trk-eta">Dự kiến tới (không bắt buộc)</label><input id="trk-eta" type="datetime-local" class="inp" data-trketa="1" value="${esc(T.eta||'')}"></div>
   <button class="btn sm" data-a="trkRun" ${T.sel.length&&!T.busy?'':'disabled'}>${T.busy?'Đang xử lý…':`🚚 Xuất phát ${T.sel.length} đơn`}</button><button class="btn ghost sm" data-a="trkCancel">Thôi</button></div>`;}
 else{body=`<div class="row">${ok.length?`<button class="btn sm" data-a="trkStart" data-k="load" data-c="${t.code}">✓ Bốc xong cả xe (${ok.length} đơn)</button>`:''}${ld.length?`<button class="btn sm" data-a="trkStart" data-k="go" data-c="${t.code}">🚚 Xe xuất phát (${ld.length} đơn)</button>`:''}
   ${!ok.length&&!ld.length&&!tr.length?'<span class="small muted">Các đơn trên xe chưa tới bước bốc / giao, hoặc đã giao xong.</span>':''}</div>
  ${tr.length?`<table>${tr.map(x=>`<tr><td><b>${esc(cust(x.b.customerId).name)}</b> <span class="muted small">${x.b.id}</span> ${st(x.b)}<div class="small muted">${esc(x.b.addrText||'')}</div></td>
   <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-a="trkOne" data-k="delivered" data-id="${x.b.id}">✓ Đã giao</button> <button class="btn ghost sm" data-a="trkOne" data-k="failed" data-id="${x.b.id}">✗ Không thành công</button></td></tr>`).join('')}</table>`:''}`;}
 const res=M.trkRes&&M.trkRes.code===t.code?`<div class="trkres">${M.trkRes.lines.map(l=>`<div class="${l.ok?'':'bad'}">${l.ok?'✓':'✗'} ${esc(l.t)}</div>`).join('')}</div>`:'';
 return `<div class="trk"><h4>BỐC / GIAO THEO XE</h4>${body}${res}</div>`;}
{const m0=mTruck;mTruck=function(){let h=m0();const t=V.modal&&truckByCode(V.modal.code);if(!t)return h;
 if(t.closed){const l=loadOf(t.code);const p=tsPill(truckState(t,l),t.cap-l);h=h.replace(p,'');}
 const blk=trkBlock(t);if(!blk)return h;const i=h.indexOf('TÌNH TRẠNG:');if(i<0)return h+blk;const j=h.lastIndexOf('<',i);return h.slice(0,j)+blk+h.slice(j);};}
A.trkStart=d=>{const t=truckByCode(d.c);if(!t)return;const L=trkBks(t.code);
 const sel=d.k==='load'?L.filter(x=>x.b.status==='ok'&&!trkNeedPick(x.b)&&!x.others.length).map(x=>x.b.id):L.filter(x=>x.b.status==='loaded').map(x=>x.b.id);
 V.modal.trk={code:t.code,k:d.k,sel,eta:d.k==='go'?localDT29(new Date(Date.now()+3*3600e3)):'',busy:false};V.modal.trkRes=null;render();};
A.trkCancel=()=>{V.modal.trk=null;render();};
document.addEventListener('change',e=>{const id=e.target.dataset&&e.target.dataset.trk;const T=V.modal&&V.modal.trk;if(T&&id){T.sel=e.target.checked?[...new Set([...T.sel,id])]:T.sel.filter(x=>x!==id);render();}
 if(T&&e.target.dataset&&e.target.dataset.trketa)T.eta=e.target.value;});
A.trkRun=async()=>{const M=V.modal,T=M&&M.trk;if(!T||T.busy||!T.sel.length)return;T.busy=true;render();const lines=[];
 for(const id of T.sel){const b=bkById(id);const nm=(b?cust(b.customerId).name+' · ':'')+id;
  try{if(T.k==='load'){const r=await rpc('mark_loaded',{p_id:id,p_unloaded:[],p_note:''});lines.push({ok:true,t:nm+': đã bốc'+(r&&r.needAction?` (thiếu ${t2(+r.short)} MT – CS đã được báo)`:'')});}
   else{await rpc('mark_transit',{p_id:id,p_eta:T.eta?dtToIso29(T.eta):null});lines.push({ok:true,t:nm+': đang giao'});}}
  catch(e){lines.push({ok:false,t:nm+': '+e.message});}}
 try{await reload();}catch(e){}
 if(V.modal&&V.modal.type==='truck'){V.modal.trk=null;V.modal.trkRes={code:T.code,lines};}
 const n=lines.filter(l=>l.ok).length;toast(`${T.k==='load'?'Đã bốc':'Xuất phát'} ${n}/${lines.length} đơn${n<lines.length?' – xem lỗi trong hộp xe':''}`);render();};
// làm từng đơn bằng hộp thoại sẵn có rồi quay lại đúng xe
A.trkOne=d=>{const code=V.modal&&V.modal.code;V.trkBack=code;A.v9Ship({k:d.k==='delivered'?'delivered':d.k==='failed'?'failed':'load',id:d.id});};
{const r0=render;render=function(){if(V.trkBack&&!V.modal&&S){const c=V.trkBack;V.trkBack=null;if(truckByCode(c))V.modal={type:'truck',code:c};}
 else if(V.trkBack&&V.modal&&!['ship','truck'].includes(V.modal.type))V.trkBack=null;r0();};}
// ---------- v3.27: Mở lại đơn Đã load (xe chưa xuất phát); xe đã chạy: khóa sửa / tải trọng / chốt ----------
const trkGone=code=>truckDeparted(code);
const canReopen=b=>trkCan()&&b&&b.status==='loaded'&&!allocsOf(b.id).some(a=>trkGone(a.truck));
{const m1=mTruck;mTruck=function(){let h=m1();const t=V.modal&&truckByCode(V.modal.code);if(!t)return h;const gone=trkGone(t.code);
 // nút Sửa trên phần hàng: chỉ đơn Chờ xếp / Đã xếp; đơn Đã load (xe chưa chạy) → ↩ Mở lại
 h=h.replace(/<button class="ed" data-a="editAl" data-id="([^"]+)">Sửa<\/button>/g,(m,id)=>{const a=S.allocs.find(x=>String(x.id)===id);const b=a&&bkById(a.bk);if(!b)return m;
  if(['hold','ok'].includes(b.status))return m;if(canReopen(b))return `<button class="ed" data-a="trkReopen" data-id="${b.id}" title="Đã load: mở lại để điều chỉnh">↩ Mở lại</button>`;return '';});
 if(gone){const l=loadOf(t.code);const s=truckState(t,l);const p=tsPill(s,t.cap-l);const free=r2(t.cap-l);
  h=h.replace(p,free>0.004?`<span class="pill" style="background:var(--ground);color:var(--muted)" title="Xe đã chạy: phần trống không nhận thêm"><i></i>Trống ${tnum(free)} MT · không nhận thêm</span>`:'');
  h=h.replace('id="ti-c" class="inp num"','id="ti-c" disabled title="Xe đã chạy: không đổi tải trọng" class="inp num"');}
 return h;};}
if(typeof truckClose29==='function'){const c0=truckClose29;truckClose29=function(t,l,past){if(!t.closed&&trkGone(t.code))return '';return c0(t,l,past);};}
// khung Bốc / giao theo xe: thêm Mở lại cả xe + hộp lý do
{const b0=trkBlock;trkBlock=function(t){const T=V.modal.trk&&V.modal.trk.code===t.code?V.modal.trk:null;
 if(T&&T.k==='reopen'){const L=trkBks(t.code).filter(x=>canReopen(x.b));
  return `<div class="trk"><h4>↩ MỞ LẠI ĐỂ ĐIỀU CHỈNH</h4><div class="small">Đơn về <b>Đã xếp xe</b> để sửa / chuyển xe, rồi bốc lại. Ghi nhật ký, báo CS + Sales; <b>không báo khách</b>.</div>
   <table>${L.map(x=>`<tr><td style="width:28px"><input type="checkbox" data-trk="${x.b.id}" ${T.sel.includes(x.b.id)?'checked':''} aria-label="Chọn ${x.b.id}"></td><td><b>${esc(cust(x.b.customerId).name)}</b> <span class="muted small">${x.b.id}</span> · <span class="num">${t2(x.tons)} MT</span></td></tr>`).join('')}</table>
   <div class="row" style="margin-top:8px"><div class="field grow"><label for="trk-rs">Lý do <span class="req">*</span></label><input id="trk-rs" class="inp" data-trkrs="1" value="${esc(T.reason||'')}" placeholder="VD: xếp lại hàng cho cân xe, đổi sang xe khác"></div>
    <button class="btn sm" data-a="trkRun" ${T.sel.length&&!T.busy?'':'disabled'}>${T.busy?'Đang xử lý…':`↩ Mở lại ${T.sel.length} đơn`}</button><button class="btn ghost sm" data-a="trkCancel">Thôi</button></div>${T.err?`<div class="err small">${esc(T.err)}</div>`:''}</div>`;}
 let h=b0(t);if(T||!trkCan())return h;const n=trkBks(t.code).filter(x=>canReopen(x.b)).length;
 if(n&&h)h=h.replace('<div class="row">',`<div class="row"><button class="btn ghost sm" data-a="trkStart" data-k="reopen" data-c="${t.code}" title="Xe chưa xuất phát: đưa đơn đã bốc về Đã xếp xe để điều chỉnh">↩ Mở lại cả xe (${n} đơn)</button>`);
 return h;};}
{const s0=A.trkStart;A.trkStart=d=>{if(d.k!=='reopen')return s0(d);const t=truckByCode(d.c);if(!t)return;
 V.modal.trk={code:t.code,k:'reopen',sel:trkBks(t.code).filter(x=>canReopen(x.b)).map(x=>x.b.id),reason:'',busy:false,err:''};V.modal.trkRes=null;render();};}
A.trkReopen=d=>{const code=V.modal&&V.modal.code;if(!code)return;V.modal.trk={code,k:'reopen',sel:[d.id],reason:'',busy:false,err:''};V.modal.trkRes=null;render();setTimeout(()=>{const i=document.getElementById('trk-rs');if(i)i.focus();},30);};
document.addEventListener('input',e=>{const T=V.modal&&V.modal.trk;if(T&&e.target.dataset&&e.target.dataset.trkrs){T.reason=e.target.value;if(T.err){T.err='';}}});
{const r0=A.trkRun;A.trkRun=async()=>{const M=V.modal,T=M&&M.trk;if(!T||T.k!=='reopen')return r0();if(T.busy||!T.sel.length)return;
 if((T.reason||'').trim().length<3){T.err='Nhập lý do mở lại.';return render();}T.busy=true;render();const lines=[];
 for(const id of T.sel){const b=bkById(id);const nm=(b?cust(b.customerId).name+' · ':'')+id;try{await rpc('unload_booking',{p_id:id,p_reason:T.reason.trim()});lines.push({ok:true,t:nm+': đã mở lại, về Đã xếp xe'});}catch(e){lines.push({ok:false,t:nm+': '+e.message});}}
 try{await reload();}catch(e){}if(V.modal&&V.modal.type==='truck'){V.modal.trk=null;V.modal.trkRes={code:T.code,lines};}
 const n=lines.filter(l=>l.ok).length;toast(`Đã mở lại ${n}/${lines.length} đơn – sửa / chuyển xe rồi bốc lại`);render();};}
// chi tiết booking: nút Mở lại cho đơn Đã load
{const r0=render;render=function(){r0();if(!S||V.view!=='booking'||!V.bk)return;const b=bkById(V.bk);if(!canReopen(b))return;const h=document.querySelector('.main .pagehead');if(!h||h.querySelector('[data-a="bkReopen"]'))return;
 const x=document.createElement('button');x.className='btn ghost';x.dataset.a='bkReopen';x.dataset.id=b.id;x.title='Xe chưa xuất phát: đưa đơn về Đã xếp xe để điều chỉnh';x.textContent='↩ Mở lại để điều chỉnh';h.appendChild(x);};}
A.bkReopen=d=>{const b=bkById(d.id);const a=b&&allocsOf(b.id)[0];if(!a)return;V.modal={type:'truck',code:a.truck};render();A.trkReopen({id:b.id});};
