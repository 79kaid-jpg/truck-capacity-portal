/* =====================================================================
   v2.9 – tính năng mang từ bản Google Sheets (SRS mục 14)
   Nhập nhiều dòng, ngày bốc gốc + lý do đổi ngày, đơn khẩn, giao ngày nghỉ,
   xác nhận giao hàng + danh sách cuộn, load / đang giao / đã giao / giao lỗi,
   tách đơn, đóng xe, mức nhận email.
   File này chạy sau app.js và dùng chung trạng thái S, V, các hàm render, mutate, rpc…
   ===================================================================== */

/* ---------- giao diện ---------- */
(function(){const st=document.createElement('style');st.textContent=`
.st-loaded{color:var(--blue);background:var(--blue-bg)}
.st-transit{color:var(--blue);background:var(--blue-bg);outline:1px dashed var(--blue)}
.st-delivered{color:var(--ok);background:var(--ok-bg);outline:1px solid var(--ok)}
.st-failed{color:var(--bad);background:var(--bad-bg);outline:1px solid var(--bad)}
.urg{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.04em;color:var(--bad);background:var(--bad-bg);border-radius:4px;padding:1px 6px;vertical-align:1px}
.holwarn{font-size:11px;font-weight:700;color:var(--bad);background:var(--bad-bg);border-radius:4px;padding:1px 6px;margin:2px 0;display:inline-block}
.holbanner{background:var(--bad-bg);color:var(--bad);border:1px solid var(--bad);border-radius:8px;padding:8px 12px;font-weight:700;font-size:12.5px;margin-bottom:8px}
.offrow{background:var(--bad-bg)}
.c29{display:flex;flex-wrap:wrap;gap:4px;margin-top:3px}
.c29 span{font-size:10.5px;font-weight:700;border-radius:4px;padding:1px 5px;white-space:nowrap}
.c29 .u{color:var(--bad);background:var(--bad-bg)}.c29 .t{color:var(--blue);background:var(--blue-bg)}
.c29 .d{color:var(--ok);background:var(--ok-bg)}.c29 .f{color:var(--bad);background:var(--surface);border:1px solid var(--bad)}
.v9tbl td,.v9tbl th{padding:4px 6px;font-size:12.5px}
.v9tbl tr.bad td{background:var(--bad-bg)}
.v9tbl tr.hol td.dcol{color:var(--bad);font-weight:700}
.v9area{width:100%;min-height:150px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;white-space:pre}
.v9kpi{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:10px 0}
.v9kpi div{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.v9kpi b{display:block;font-family:var(--f-display);font-size:26px;font-weight:900}
.v9cap{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.v9cap span{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:3px 8px;font-size:12px}
.v9cap span.over{border-color:var(--bad);color:var(--bad);background:var(--bad-bg)}
.dlv{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}
.dlv h4{margin:0 0 6px;font-size:12px;letter-spacing:.04em}
.v9acts{display:flex;flex-wrap:wrap;gap:6px}
@media (max-width:640px){.v9kpi{grid-template-columns:1fr}}
`;document.head.appendChild(st);})();

/* giữ danh mục lý do từ get_state */
{const _adopt=adopt;adopt=function(st){const X=_adopt(st);X.reasons=st.reasons||[];return X;};}
const R29=kind=>(S.reasons||[]).filter(r=>r.kind===kind);
const rOpts29=(kind,v)=>`<option value="">Chọn lý do</option>${R29(kind).map(r=>`<option value="${r.code}" ${v===r.code?'selected':''}>${esc(r.name)}</option>`).join('')}`;
const tolOf29=t=>Math.max(t*(+S.cfg.coilPct||3)/100,+S.cfg.coilTons||0.5);
const hm29=min=>{if(!min)return '–';const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',hour12:false}).formatToParts(new Date(min*60000)).forEach(x=>p[x.type]=x.value);return `${p.hour==='24'?'00':p.hour}:${p.minute} ${p.day}/${p.month}`;};
const localDT29=(d=new Date())=>{const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(d).forEach(x=>p[x.type]=x.value);return `${p.year}-${p.month}-${p.day}T${p.hour==='24'?'00':p.hour}:${p.minute}`;};
const dtToIso29=v=>v?new Date(v+':00+07:00').toISOString():null;
async function rpcH29(fn,args){const{data,error}=await sb.rpc(fn,args||{});if(error){const e=new Error(error.message||'Lỗi máy chủ');e.hint=error.hint||'';throw e;}return data;}
function downloadCsv29(name,rows){const csv='\ufeff'+rows.map(r=>r.map(x=>{const s=String(x??'');return /[",;\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}).join(',')).join('\r\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);}

/* ---------- ô lịch: đơn khẩn, đang giao, đã giao, giao lỗi ---------- */
function cellExtra29(wh,date){if(!internal())return '';
 const bs=S.bookings.filter(b=>b.wh===wh&&b.date===date&&ownsCust(b.customerId));
 const u=bs.filter(b=>b.urgent&&['hold','ok'].includes(b.status)).length,t=bs.filter(b=>['loaded','transit'].includes(b.status)).length,
  d=bs.filter(b=>b.status==='delivered').length,f=bs.filter(b=>b.status==='failed').length;
 if(!u&&!t&&!d&&!f)return '';
 return `<div class="c29">${u?`<span class="u">${u} khẩn</span>`:''}${t?`<span class="t">${t} đang giao</span>`:''}${d?`<span class="d">${d} đã giao</span>`:''}${f?`<span class="f">${f} giao lỗi</span>`:''}</div>`;}

/* ---------- Danh sách booking: Cần xử lý thêm load thiếu, giao lỗi, phần còn lại chờ hẹn ---------- */
function todo29(b,all){return(b.status==='failed'||(+b.shortTons||0)>0||b.status==='draft'&&!!b.parent&&b.csId===V.me)&&(all||b.status==='draft'||myCsCust(cust(b.customerId)));}

/* ---------- Form đặt hàng: lý do đổi ngày (BR-40) ---------- */
function bfChangeNeeded29(M){if(!M.id)return false;const b=bkById(M.id);return !!(b&&b.origDate&&b.status!=='draft'&&M.f.date&&M.f.date!==b.date);}
function bfChange29(M){if(!bfChangeNeeded29(M))return '';const f=M.f;const b=bkById(M.id);
 return `<div class="panel span2" style="background:var(--warn-bg)"><b>Đổi ngày bốc ${dm(b.date)} → ${dm(f.date)}</b> <span class="small muted">· ngày booking gốc ${dmy(b.origDate)} được giữ để thống kê${b.changes?', đã đổi '+b.changes+' lần':''}</span>
 <div class="fgrid" style="margin-top:6px"><div class="field"><label for="bf-cr2">Lý do đổi ngày <span class="req">*</span></label><select id="bf-cr2" class="inp" data-f="bf" data-k="chgReason">${rOpts29('change',f.chgReason)}</select></div>
 <div class="field"><label for="bf-cb">Bên yêu cầu đổi <span class="req">*</span></label><select id="bf-cb" class="inp" data-f="bf" data-k="chgBy"><option value="">Chọn</option>${[['customer','Khách hàng'],['cs','CS'],['logistics','Logistics']].map(([k,l])=>`<option value="${k}" ${f.chgBy===k?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="field span2"><label for="bf-cn">Ghi chú</label><input id="bf-cn" class="inp" data-f="bf" data-k="chgNote" value="${esc(f.chgNote||'')}"></div></div></div>`;}

/* ---------- Chi tiết booking: nút thao tác + khối giao hàng ---------- */
function bkHead29(b){if(!internal()||!ownsCust(b.customerId))return '';const out=[];
 if(can('delivery.confirm')&&['hold','ok'].includes(b.status))out.push(`<button class="btn ghost" data-a="v9Deliv" data-id="${b.id}">${b.coils?'Sửa chi tiết giao hàng':'Xác nhận giao hàng'}</button>`);
 if(can('delivery.confirm')&&(+b.shortTons||0)>0)out.push(`<button class="btn" data-a="v9Short" data-id="${b.id}">Xử lý load thiếu</button>`);
 if(can('booking.edit')&&b.status==='failed')out.push(`<button class="btn" data-a="v9Redeliver" data-id="${b.id}">Giao lại</button>`);
 if(can('booking.cancel')&&b.status==='failed')out.push(`<button class="btn danger" data-a="v9CancelFailed" data-id="${b.id}">Hủy</button>`);
 if(can('delivery.ship')){
  if(b.status==='ok'&&b.coils)out.push(`<button class="btn" data-a="v9Ship" data-k="load" data-id="${b.id}">Đã bốc hàng</button>`);
  if(b.status==='loaded')out.push(`<button class="btn ghost" data-a="v9Ship" data-k="transit" data-id="${b.id}">Đang giao</button>`);
  if(['loaded','transit'].includes(b.status))out.push(`<button class="btn" data-a="v9Ship" data-k="delivered" data-id="${b.id}">Đã giao</button><button class="btn danger" data-a="v9Ship" data-k="failed" data-id="${b.id}">Giao không thành công</button>`);
 }
 if(can('booking.urgent')&&['hold','ok','resched'].includes(b.status))out.push(`<button class="btn ghost" data-a="v9Urgent" data-id="${b.id}">Cờ khẩn</button>`);
 return out.length?`<span class="v9acts">${out.join('')}</span>`:'';}

function bkInfo29(b){const rows=[];const root=b.parent||b.id;
 const kids=S.bookings.filter(x=>x.parent===root&&x.id!==b.id);
 if(b.urgent)rows.push(['Đơn khẩn',`<span class="urg">KHẨN</span> ${b.urgentSet!=null?'Admin đặt'+(b.urgentNote?': '+esc(b.urgentNote):''):'đặt / đổi sau mốc chốt xe '+esc(S.cfg.cutoff||'16:00')+' hôm trước'}`]);
 if(b.lateCancel)rows.push(['Hủy','<span class="urg">HỦY QUÁ CẬN NGÀY GIAO</span>']);
 if(b.requested&&Math.abs(+b.requested-bkTotal(b))>0.005)rows.push(['Tấn khách yêu cầu',`<span class="num">${t2(+b.requested)} MT</span>`]);
 if(b.parent)rows.push(['Đơn gốc',`<button class="linkbtn" data-a="openBk" data-id="${b.parent}">${b.parent}</button>`]);
 if(kids.length)rows.push([b.parent?'Đơn tách khác':'Đơn tách',kids.map(k=>`<button class="linkbtn" data-a="openBk" data-id="${k.id}">${k.id}</button> <span class="st st-${stKey(k)}">${ST_LABEL[stKey(k)]}</span> <span class="num">${t2(bkTotal(k))} MT</span>`).join('<br>')]);
 if(b.coils)rows.push(['Danh sách cuộn',`<span class="num">${b.coils} cuộn · ${t2(+b.coilTons||0)} MT</span> · có lúc ${hm29(b.deliveryAt)} <button class="linkbtn" data-a="v9Coils" data-id="${b.id}">Xem</button>`]);
 else if(['hold','ok'].includes(b.status))rows.push(['Danh sách cuộn','<span class="muted">Chưa có – CS bấm <b>Xác nhận giao hàng</b> khi có file cuộn</span>']);
 if(b.loadedAt)rows.push(['Bốc xong',`${hm29(b.loadedAt)}${b.loadNote?' · '+esc(b.loadNote):''}`]);
 if((+b.shortTons||0)>0)rows.push(['Load thiếu',`<span class="err">${t2(+b.shortTons)} MT – chờ CS tách đơn hoặc không giao</span>`]);
 if(b.eta)rows.push(['Dự kiến tới',hm29(b.eta)]);
 if(b.deliveredAt)rows.push(['Tới nơi lúc',hm29(b.deliveredAt)]);
 if(b.status==='failed')rows.push(['Giao không thành công',`<span class="err">${esc(b.failNote)}</span>`]);
 if(+b.undelivered>0)rows.push(['Không giao',`<span class="num">${t2(+b.undelivered)} MT</span> · ${esc(b.undeliveredNote)}`]);
 if(!rows.length)return '';
 return `<div class="dlv"><h4>GIAO HÀNG</h4><dl class="dl">${rows.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></div>`;}

/* ---------- Popup xe: đóng / mở xe (BR-47) ---------- */
function truckClose29(t,l,past){if(past||!(can('fleet.manage')||can('alloc.assign')))return '';const M=V.modal;M.cl=M.cl&&M.cl.code===t.code?M.cl:{code:t.code,reason:'',note:'',cap:''};const C=M.cl;
 if(t.closed)return `<div class="panel tinfo"><div class="row"><b class="grow">Xe đã đóng ở ${t2(t.cap)} MT</b><span class="small muted">Không xếp thêm, không gợi ý</span></div>
  <div class="row" style="margin-top:8px;gap:8px;align-items:end"><div class="field"><label for="cl-cap">Tải trọng khi mở lại (tấn)</label><input id="cl-cap" class="inp num" style="width:110px" inputmode="decimal" data-f="v9c" data-k="cap" value="${esc(C.cap)}" placeholder="${t.defCap} (chuẩn)"></div><button class="btn sm" data-a="v9TruckOpen" data-c="${t.code}">🔓 Mở lại xe</button></div>${C.err?`<div class="err">${esc(C.err)}</div>`:''}</div>`;
 return `<div class="panel tinfo"><div class="row"><b class="grow">Đóng xe</b><span class="small muted">Tải trọng = số đã xếp (${t2(l)} MT), sức chứa ngày giảm ${t2(Math.max(0,t.cap-l))} MT</span></div>
  <div class="row" style="margin-top:8px;gap:8px;align-items:end;flex-wrap:wrap"><div class="field"><label for="cl-r">Lý do <span class="req">*</span></label><select id="cl-r" class="inp" data-f="v9c" data-k="reason">${rOpts29('close',C.reason)}</select></div>
  <div class="field grow"><label for="cl-n">Ghi chú</label><input id="cl-n" class="inp" data-f="v9c" data-k="note" value="${esc(C.note)}"></div><button class="btn ghost sm" data-a="v9TruckClose" data-c="${t.code}">🔒 Đóng xe</button></div>${C.err?`<div class="err">${esc(C.err)}</div>`:''}</div>`;}

/* ---------- Hồ sơ: mức nhận email (BR-49) ---------- */
function emailPrefs29(u){if(S.imp)return '';V.ep=V.ep||{level:S.me.emailLevel||'all',alt:S.me.altEmail||''};const E=V.ep;
 return `<h3 style="margin-top:18px;font-size:15px">EMAIL THÔNG BÁO</h3><p class="small muted" style="margin:4px 0 8px">Việc gấp (đơn khẩn, hủy cận ngày, load thiếu, giao lỗi, giao ngày nghỉ) gửi ngay. Các cập nhật khác gom vào email tóm tắt lúc ${(S.cfg.digestTimes||['07:00','16:00']).join(' và ')} ngày làm việc. Thông báo trong ứng dụng luôn đủ.</p>
 <div class="fgrid"><div class="field"><label for="ep-l">Mức nhận email</label><select id="ep-l" class="inp" data-f="v9e" data-k="level">${[['all','Tất cả (việc gấp + tóm tắt)'],['urgent','Chỉ việc gấp'],['none','Không nhận email']].map(([k,l])=>`<option value="${k}" ${E.level===k?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="field"><label for="ep-a">Email nhận riêng (ví dụ Outlook)</label><input id="ep-a" class="inp" type="email" data-f="v9e" data-k="alt" value="${esc(E.alt)}" placeholder="Để trống = ${esc(u.email)}"></div></div>
 ${E.err?`<div class="err">${esc(E.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="v9EmailSave">Lưu cài đặt email</button></div>`;}

/* =====================================================================
   NHẬP NHIỀU DÒNG (BR-36)
   ===================================================================== */
const BULK_HEAD=['Kho','Ngày bốc','Mã KH','Số tấn','Địa chỉ giao','Ref (SO)','Ghi chú'];
function parseDate29(v,fallback){v=String(v??'').trim();if(!v)return fallback;
 if(/^\d{4}-\d{2}-\d{2}/.test(v))return v.slice(0,10);
 if(/^\d{5}(\.\d+)?$/.test(v)){const d=new Date(Date.UTC(1899,11,30)+Math.floor(+v)*864e5);return d.toISOString().slice(0,10);}
 const m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);if(m){let y=m[3]?+m[3]:+TODAY.slice(0,4);if(y<100)y+=2000;return iso(y,+m[2],+m[1]);}
 return 'x:'+v;}
function splitRows29(text){const lines=String(text||'').replace(/\r/g,'').split('\n').filter(l=>l.trim()!=='');
 const sep=lines.some(l=>l.includes('\t'))?'\t':lines.some(l=>l.includes(';'))?';':',';
 return lines.map(l=>l.split(sep).map(x=>x.trim().replace(/^"|"$/g,'')));}
function bulkParse29(M){const raw=splitRows29(M.text);const whs=WH.map(w=>w.id);
 const rows=[];for(const r of raw){const low=r.join(' ').toLowerCase();if(/m[aã]\s*kh|s[oố]\s*t[aấ]n|kho/.test(low)&&!r.some(x=>/^\d+([.,]\d+)?$/.test(x)))continue;
  const fmtA=whs.includes(String(r[0]||'').toUpperCase())||/^\d{1,4}[\/\-.]\d{1,2}/.test(r[0]||'')||/^\d{5}$/.test(r[0]||'');
  const o=fmtA?{wh:(r[0]||'').toUpperCase()||M.wh,day:parseDate29(r[1],M.day),code:r[2]||'',tons:r[3]||'',address:r[4]||'',ref:r[5]||'',note:r[6]||''}
             :{wh:M.wh,day:M.day,code:r[0]||'',tons:r[1]||'',address:r[2]||'',ref:r[3]||'',note:r[4]||''};
  if(fmtA&&!whs.includes(o.wh)&&/^\d/.test(r[0]||'')){o.wh=M.wh;o.day=parseDate29(r[0],M.day);o.code=r[1]||'';o.tons=r[2]||'';o.address=r[3]||'';o.ref=r[4]||'';o.note=r[5]||'';}
  rows.push(o);}
 // kiểm tra phía trình duyệt: cộng dồn theo kho · ngày
 const used={};
 rows.forEach(o=>{const c=S.customers.find(x=>x.code.toLowerCase()===o.code.toLowerCase());o.cust=c||null;o.t=num(o.tons);o.err='';o.hol=false;
  if(!whs.includes(o.wh))o.err='Kho không hợp lệ';
  else if(!o.day||o.day.startsWith('x:'))o.err='Ngày không hợp lệ';
  else if(o.day<TODAY)o.err='Ngày đã qua';
  else if(!c)o.err='Không có mã khách';
  else if(c.active===false)o.err='Khách ngừng dùng';
  else if(!(o.t>0))o.err='Số tấn phải > 0';
  if(o.err)return;
  o.hol=isHoliday(o.wh,o.day);
  if(M.mode==='hold'){const k=o.wh+'|'+o.day;if(!S.fleet[o.wh]||!S.fleet[o.wh][o.day]){o.err=o.hol?'Ngày nghỉ chưa có xe':'Chưa khai báo xe';return;}
   const av=dayM(o.wh,o.day).avail;used[k]=(used[k]||0)+o.t;o.left=r2(av-used[k]);if(o.left<-0.001)o.err='Vượt sức chứa';}
 });
 const groups={};rows.forEach(o=>{if(!o.wh||!o.day||o.day.startsWith('x:'))return;const k=o.wh+'|'+o.day;groups[k]=groups[k]||{wh:o.wh,day:o.day,t:0};groups[k].t+=(o.t>0?o.t:0);});
 return{rows,groups:Object.values(groups).sort((a,b)=>a.day.localeCompare(b.day)||a.wh.localeCompare(b.wh))};}
function bulkPreview29(){const M=V.modal;const P=bulkParse29(M);const bad=P.rows.filter(o=>o.err).length;
 if(!P.rows.length)return '<div class="muted small" style="margin-top:8px">Chưa có dòng nào.</div>';
 return `<div class="v9cap">${P.groups.map(g=>{const m=dayM(g.wh,g.day);const ok=S.fleet[g.wh]&&S.fleet[g.wh][g.day];return `<span class="${M.mode==='hold'&&(!ok||g.t>m.avail+0.001)?'over':''}"><b>${g.wh} · ${dm(g.day)}</b>${isHoliday(g.wh,g.day)?' ⚠':''}: ${ok?`còn ${t2(m.avail)} MT`:'chưa khai báo xe'} · đang nhập ${t2(g.t)} MT</span>`;}).join('')}</div>
 <div class="small" style="margin:4px 0">${P.rows.length} dòng · <b class="num">${t2(P.rows.reduce((s,o)=>s+(o.t>0?o.t:0),0))}</b> t${bad?` · <span class="err">${bad} dòng sẽ không được nhận</span>`:''}</div>
 <div class="tbl-wrap" style="max-height:260px"><table class="v9tbl"><thead><tr><th>#</th><th>Kho</th><th>Ngày bốc</th><th>Mã KH</th><th>Khách hàng</th><th class="r">Tấn</th><th>Địa chỉ</th><th>Ref</th><th>Kiểm tra</th></tr></thead><tbody>
 ${P.rows.map((o,i)=>`<tr class="${o.err?'bad':''} ${o.hol?'hol':''}"><td>${i+1}</td><td>${esc(o.wh)}</td><td class="dcol num">${o.day&&!o.day.startsWith('x:')?dmy(o.day)+(o.hol?' ⚠ '+(dow(o.day)===0?'CN':'Lễ'):''):esc(o.day||'')}</td><td>${esc(o.code)}</td><td>${o.cust?esc(o.cust.name):''}</td><td class="r num">${esc(o.tons)}</td><td>${esc(o.address)||'<span class="muted small">mặc định</span>'}</td><td>${esc(o.ref)}</td><td>${o.err?`<span class="err">${o.err}</span>`:M.mode==='hold'?`<span class="small muted">còn ${t2(o.left)} MT</span>`:'<span class="small muted">OK</span>'}</td></tr>`).join('')}
 </tbody></table></div>`;}
function mBulk29(){const M=V.modal;
 if(M.step==='result')return bulkResult29();
 return `<div class="mhead"><span class="meta">NHẬP NHIỀU DÒNG</span><span class="meta">Tối đa 300 dòng</span></div>
 <h2 style="margin-bottom:8px">ĐẶT HÀNG NHIỀU KHÁCH</h2>
 <p class="small muted" style="margin:0 0 10px">Dán từ Excel hoặc tải file .xlsx / .csv theo mẫu. Cột: <b>${BULK_HEAD.join(' · ')}</b>. Có thể bỏ 2 cột đầu (Kho, Ngày): khi đó dùng kho và ngày mặc định. Không nhập địa chỉ: dùng địa chỉ mặc định của khách. Mỗi dòng thành một booking; dòng lỗi không chặn dòng khác.</p>
 <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">
  <div class="field"><label for="bu-wh">Kho mặc định</label><select id="bu-wh" class="inp" data-f="v9" data-k="wh" data-r="1">${WH.map(w=>`<option value="${w.id}" ${M.wh===w.id?'selected':''}>${w.name}</option>`).join('')}</select></div>
  <div class="field"><label for="bu-d">Ngày bốc mặc định</label><input id="bu-d" type="date" class="inp" min="${TODAY}" value="${M.day}" data-f="v9" data-k="day" data-r="1"></div>
  <div class="field"><label for="bu-f">Tải file</label><input id="bu-f" type="file" class="inp" accept=".xlsx,.xls,.csv" data-f="v9file"></div>
  <div class="field"><label>&nbsp;</label><button class="btn ghost" data-a="v9BulkTpl">Tải file mẫu</button></div></div>
 <div class="field" style="margin-top:8px"><label for="bu-t">Dữ liệu (dán từ Excel)</label><textarea id="bu-t" class="inp v9area" data-f="v9" data-k="text" placeholder="JM2&#9;20/10/2026&#9;KH0101&#9;12,5&#9;KCN Phú Mỹ 1&#9;SO-7788&#9;">${esc(M.text)}</textarea></div>
 <div id="v9-prev">${bulkPreview29()}</div>
 ${M.err?`<div class="err" style="margin-top:8px">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn ghost" data-a="v9BulkGo" data-m="draft">Lưu tạm cả lô</button><button class="btn" data-a="v9BulkGo" data-m="hold">Đặt &amp; gửi Logistics</button></div>`;}
function bulkResult29(){const M=V.modal;const R=M.res;const bad=R.rows.filter(r=>!r.ok);const good=R.rows.filter(r=>r.ok);
 return `<div class="mhead"><span class="meta">KẾT QUẢ NHẬP NHIỀU DÒNG</span><span class="meta">${M.mode==='hold'?'Đặt & gửi Logistics':'Lưu tạm'}</span></div>
 <div class="v9kpi"><div><span class="small muted">Đã nhận</span><b class="num" style="color:var(--ok)">${R.ok}</b></div><div><span class="small muted">Không nhận</span><b class="num" style="color:${R.failed?'var(--bad)':'inherit'}">${R.failed}</b></div><div><span class="small muted">Tấn đã nhận</span><b class="num">${t2(good.reduce((s,r)=>s+(+r.tons||0),0))}</b></div></div>
 ${bad.length?`<h3 style="font-size:15px;margin:8px 0">DÒNG KHÔNG NHẬN</h3><div class="tbl-wrap"><table class="v9tbl"><thead><tr><th>#</th><th>Kho</th><th>Ngày</th><th>Mã KH</th><th class="r">Tấn</th><th>Lý do</th><th>Ngày còn chỗ</th></tr></thead><tbody>
  ${bad.map(r=>`<tr><td>${r.row}</td><td>${esc(r.wh||'')}</td><td class="num">${r.day?dmy(r.day):''}</td><td>${esc(r.code||'')}</td><td class="r num">${esc(r.tons||'')}</td><td class="err">${esc(r.error)}</td><td>${(r.suggest||[]).map(s=>`<button class="btn ghost sm" data-a="v9BulkMove" data-r="${r.row}" data-d="${s.day}">${dm(s.day)} (${t2(+s.avail)} MT)</button>`).join(' ')||'<span class="muted small">–</span>'}</td></tr>`).join('')}
 </tbody></table></div><div class="row" style="margin-top:8px;gap:8px"><button class="btn ghost sm" data-a="v9BulkErrCsv">Tải file dòng lỗi</button><button class="btn sm" data-a="v9BulkFix">Sửa các dòng lỗi trong form</button><span class="small muted">Bấm ngày còn chỗ để chuyển dòng đó sang ngày gợi ý rồi gửi lại.</span></div>`:''}
 ${good.length?`<h3 style="font-size:15px;margin:14px 0 8px">BOOKING ĐÃ TẠO</h3><div class="tbl-wrap" style="max-height:220px"><table class="v9tbl"><thead><tr><th>Mã booking</th><th>Ngày</th><th>Khách hàng</th><th class="r">Tấn</th><th></th></tr></thead><tbody>
  ${good.map(r=>`<tr><td><button class="linkbtn" data-a="openBk" data-id="${r.id}">${r.id}</button></td><td class="num">${dmy(r.day)}${r.holiday?' <span class="urg">⚠ NGÀY NGHỈ</span>':''}</td><td>${esc(r.name||r.code)}</td><td class="r num">${t2(+r.tons)}</td><td>${bkById(r.id)?.urgent?'<span class="urg">KHẨN</span>':''}</td></tr>`).join('')}</tbody></table></div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="v9BulkAgain">Nhập lô mới</button><button class="btn" data-a="close">Xong</button></div>`;}

/* =====================================================================
   XÁC NHẬN GIAO HÀNG (BR-43, BR-44)
   ===================================================================== */
const COIL_COLS=[['whs',/^whs$|kho/],['order_no',/order/],['ln',/^ln$|line/],['itmno',/itm|item/],['name',/^name$|t[eê]n/],['lot',/lot/],['qty',/qty|allocated|t[aấ]n|s[oố] l/],['attr',/attr/],['customer',/cust|kh[aá]ch/]];
function parseCoils29(text){const raw=splitRows29(text);if(!raw.length)return{coils:[],err:''};
 let map=null;const h=raw[0].map(x=>x.toLowerCase());
 if(h.some(x=>/lot/.test(x))){map={};COIL_COLS.forEach(([k,re])=>{const i=h.findIndex(x=>re.test(x));if(i>=0)map[k]=i;});raw.shift();}
 else map={whs:0,order_no:1,ln:2,itmno:3,name:4,lot:5,qty:6,attr:7,customer:8};
 if(map.lot==null||map.qty==null)return{coils:[],err:'Không tìm thấy cột Lot number hoặc Allocated qty trong dòng tiêu đề.'};
 const coils=raw.map(r=>{const o={};for(const[k,i]of Object.entries(map))o[k]=r[i]??'';o.qty=String(o.qty).replace(/\s/g,'');return o;}).filter(o=>o.lot||o.qty);
 return{coils,err:''};}
function delivState29(){const M=V.modal;const b=bkById(M.id);const P=parseCoils29(M.text);const tot=r2(P.coils.reduce((s,c)=>s+(num(c.qty)||0),0));const T=bkTotal(b);const tol=tolOf29(T);
 const dup=[...new Set(P.coils.map(c=>c.lot).filter((l,i,a)=>l&&a.indexOf(l)!==i))];const custs=[...new Set(P.coils.map(c=>c.customer).filter(Boolean))];
 const kind=!P.coils.length?'none':T-tot>tol?'short':tot-T>tol?'excess':'ok';return{b,P,tot,T,tol,dup,custs,kind};}
function mDeliv29(){const M=V.modal;const D=delivState29();const b=D.b;const c=cust(b.customerId);const wh=WHALL.find(w=>w.id===b.wh);
 const msg=D.kind==='none'?'':D.kind==='ok'?`<div class="capblock num">Tổng cuộn ${t2(D.tot)} MT · booking ${t2(D.T)} MT · lệch ${t2(D.tot-D.T)} MT – khớp (ngưỡng ±${t2(D.tol)} MT)</div>`
  :D.kind==='short'?`<div class="capblock over num">Tổng cuộn ${t2(D.tot)} MT THIẾU ${t2(D.T-D.tot)} MT so với booking ${t2(D.T)} MT</div>`
  :`<div class="capblock over num">Tổng cuộn ${t2(D.tot)} MT DƯ ${t2(D.tot-D.T)} MT so với booking ${t2(D.T)} MT</div>`;
 const restDays=[...Array(14)].map((_,i)=>addDays(b.date<TODAY?TODAY:b.date,i)).filter(d=>d>=TODAY&&S.fleet[b.wh][d]);
 return `<div class="mhead"><span class="meta">${b.id} · ${esc(c.name)}</span><span class="meta">Ngày bốc ${dmy(b.date)} · ${t2(D.T)} MT</span></div>
 <h2 style="margin-bottom:10px">XÁC NHẬN GIAO HÀNG</h2>
 ${b.date<TODAY?`<div class="addrbox" style="margin-bottom:10px"><b>Ngày bốc ${dmy(b.date)} đã qua – nhập ngày giao thực tế <span class="req">*</span></b>
  <div class="row" style="gap:10px;margin-top:6px;flex-wrap:wrap"><input type="date" id="dv-ad" class="inp" style="max-width:190px" min="${TODAY}" value="${M.actualDay||''}" data-f="v9" data-k="actualDay" data-r="1">
  ${M.actualDay&&S.fleet[b.wh]&&S.fleet[b.wh][M.actualDay]?`<span class="small muted">Còn đặt được ${t2(dayM(b.wh,M.actualDay).avail)} MT${isHoliday(b.wh,M.actualDay)?' · ⚠ ngày nghỉ':''}</span>`:M.actualDay?'<span class="small muted">Ngày này chưa khai báo xe</span>':''}</div>
  <span class="small muted">Đơn chuyển sang ngày này, gỡ xe đã gán ngày ${dmy(b.date)}; trạng thái Đã xác nhận giao hàng · Chờ xếp xe, Logistics được báo xếp xe gấp.</span></div>`:''}
 <div class="addrbox"><b>Địa chỉ giao <span class="req">*</span></b>
  <select class="inp" data-f="v9" data-k="addrId" data-r="1">${c.addresses.map(a=>`<option value="${a.id}" ${M.addrId===a.id?'selected':''}>${esc(a.label)}, ${esc(a.ward)}, ${esc(a.province)}</option>`).join('')}<option value="new" ${M.addrId==='new'?'selected':''}>+ Địa chỉ khác</option></select>
  ${M.addrId==='new'?`<div class="fgrid" style="margin-top:6px"><div class="field span2"><label for="dv-a">Địa chỉ</label><input id="dv-a" class="inp" data-f="v9" data-k="address" value="${esc(M.address)}" placeholder="Số nhà, đường, phường/xã"></div><div class="field"><label for="dv-p">Tỉnh/Thành</label><select id="dv-p" class="inp" data-f="v9" data-k="province"><option value="">Chọn</option>${PROVINCES.map(p=>`<option ${M.province===p?'selected':''}>${p}</option>`).join('')}</select></div></div>`:''}</div>
 <div class="field" style="margin-top:10px"><label for="dv-t">Danh sách cuộn (dán từ Excel, có dòng tiêu đề)</label><textarea id="dv-t" class="inp v9area" data-f="v9" data-k="text" placeholder="Whs&#9;Order no&#9;Ln&#9;Itmno&#9;Name&#9;Lot number&#9;Allocated qty&#9;Attr value&#9;Customer">${esc(M.text)}</textarea>
 <span class="small muted">Mã kho ERP của ${esc(wh.name)}: ${esc(wh.erp||'–')}${c.erp?' · Mã KH ERP: '+esc(c.erp):''} · tối đa 300 cuộn</span></div>
 <div id="v9-prev">${delivPrev29(D)}</div>
 ${D.kind==='short'?`<div class="panel" style="margin-top:8px"><b>Phần còn lại ${t2(D.T-D.tot)} MT</b>
  <div class="row" style="gap:16px;margin:6px 0"><label class="row"><input type="radio" name="rm" data-f="v9" data-k="restMode" data-r="1" value="split" ${M.restMode==='split'?'checked':''}> Tách đơn (${b.parent||b.id}-N)</label><label class="row"><input type="radio" name="rm" data-f="v9" data-k="restMode" data-r="1" value="drop" ${M.restMode==='drop'?'checked':''}> Không giao phần còn lại</label></div>
  ${M.restMode==='split'?`<div class="field"><label for="dv-rd">Ngày giao phần còn lại</label><select id="dv-rd" class="inp" data-f="v9" data-k="restDay"><option value="">Chưa hẹn (Lưu tạm, không trừ sức chứa)</option>${restDays.map(d=>`<option value="${d}" ${M.restDay===d?'selected':''}>${WDS[dow(d)]} ${dmy(d)} · còn ${t2(dayM(b.wh,d).avail)} MT${isHoliday(b.wh,d)?' · ⚠ ngày nghỉ':''}</option>`).join('')}</select></div>`:''}
  ${M.restMode==='drop'?`<div class="fgrid"><div class="field"><label for="dv-rr">Lý do không giao <span class="req">*</span></label><select id="dv-rr" class="inp" data-f="v9" data-k="restReason">${rOpts29('nodeliver',M.restReason)}</select></div><div class="field"><label for="dv-rn">Ghi chú</label><input id="dv-rn" class="inp" data-f="v9" data-k="restNote" value="${esc(M.restNote)}"></div></div>`:''}</div>`:''}
 ${D.kind==='excess'?`<label class="row small" style="margin-top:8px"><input type="checkbox" data-f="v9" data-k="updTons" ${M.updTons?'checked':''}> Cập nhật số tấn booking theo cuộn (${t2(D.T)} → ${t2(D.tot)} MT; kiểm tra sức chứa ngày)</label>`:''}
 ${M.warn?`<div class="warnlist"><b>Cần kiểm tra:</b> ${esc(M.warn)}</div>`:''}
 ${M.err?`<div class="err" style="margin-top:8px">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${M.warn?'<button class="btn" data-a="v9DelivSave" data-force="1">Đã kiểm tra – vẫn lưu</button>':'<button class="btn" data-a="v9DelivSave">Lưu &amp; báo Logistics</button>'}</div>`;}
function delivPrev29(D){if(D.P.err)return `<div class="err">${esc(D.P.err)}</div>`;if(!D.P.coils.length)return '';
 return `<div class="small" style="margin:6px 0">${D.P.coils.length} cuộn${D.dup.length?` · <span class="err">Lot trùng: ${esc(D.dup.join(', '))}</span>`:''}${D.custs.length>1?` · <span class="err">Nhiều khách: ${esc(D.custs.join(', '))}</span>`:''}</div>
 <div class="tbl-wrap" style="max-height:200px"><table class="v9tbl"><thead><tr><th>Whs</th><th>Order no</th><th>Name</th><th>Lot number</th><th class="r">Qty (t)</th><th>Customer</th></tr></thead><tbody>
 ${D.P.coils.slice(0,8).map(c=>`<tr class="${D.dup.includes(c.lot)||!(num(c.qty)>0)?'bad':''}"><td>${esc(c.whs)}</td><td>${esc(c.order_no)}</td><td>${esc(c.name)}</td><td>${esc(c.lot)}</td><td class="r num">${esc(c.qty)}</td><td>${esc(c.customer)}</td></tr>`).join('')}
 ${D.P.coils.length>8?`<tr><td colspan="6" class="muted small">… và ${D.P.coils.length-8} cuộn khác</td></tr>`:''}</tbody></table></div>
 <div style="margin-top:6px">${D.kind==='ok'?`<div class="capblock num">Tổng cuộn ${t2(D.tot)} MT · booking ${t2(D.T)} MT – khớp (ngưỡng ±${t2(D.tol)} MT)</div>`:D.kind==='short'?`<div class="capblock over num">Tổng cuộn ${t2(D.tot)} MT – THIẾU ${t2(D.T-D.tot)} MT so với booking ${t2(D.T)} MT</div>`:`<div class="capblock over num">Tổng cuộn ${t2(D.tot)} MT – DƯ ${t2(D.tot-D.T)} MT so với booking ${t2(D.T)} MT</div>`}</div>`;}

/* ---------- Logistics: load / đang giao / đã giao / giao lỗi ---------- */
function mShip29(){const M=V.modal;const b=bkById(M.id);const c=cust(b.customerId);
 const head=`<div class="mhead"><span class="meta">${b.id} · ${esc(c.name)}</span><span class="meta">${ST_LABEL[stKey(b)]}</span></div>`;
 if(M.kind==='load'){const cs=M.coils;const off=cs?cs.filter(x=>M.off.includes(x.lot)):[];const sh=r2(off.reduce((s,x)=>s+(+x.qty),0));const T=bkTotal(b);
  return `${head}<h2 style="margin-bottom:8px">ĐÃ BỐC HÀNG</h2><p class="small muted" style="margin:0 0 8px">Bỏ tick cuộn không lên xe. Thiếu quá ±${t2(tolOf29(T))} MT thì CS nhận thông báo để tách đơn hoặc không giao phần còn lại.</p>
  ${!cs?'<div class="muted">Đang tải danh sách cuộn…</div>':`<div class="tbl-wrap" style="max-height:300px"><table class="v9tbl"><thead><tr><th>Lên xe</th><th>Lot number</th><th>Name</th><th class="r">Qty (t)</th></tr></thead><tbody>
   ${cs.map(x=>`<tr class="${M.off.includes(x.lot)?'bad':''}"><td><input type="checkbox" data-f="v9off" value="${esc(x.lot)}" ${M.off.includes(x.lot)?'':'checked'} aria-label="Cuộn ${esc(x.lot)} lên xe"></td><td>${esc(x.lot)}</td><td>${esc(x.name)}</td><td class="r num">${t2(+x.qty)}</td></tr>`).join('')}</tbody></table></div>
   <div class="capblock num ${sh>tolOf29(T)?'over':''}" style="margin-top:8px">Lên xe ${t2(r2(cs.reduce((s,x)=>s+(+x.qty),0))-sh)} MT · không lên xe ${t2(sh)} MT (${off.length} cuộn)</div>
   ${off.length?`<div class="field" style="margin-top:8px"><label for="ld-n">Ghi chú cuộn không lên xe <span class="req">*</span></label><input id="ld-n" class="inp" data-f="v9" data-k="note" value="${esc(M.note)}"></div>`:''}`}
  ${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="v9ShipSave" ${cs?'':'disabled'}>Xác nhận đã bốc hàng</button></div>`;}
 if(M.kind==='transit')return `${head}<h2 style="margin-bottom:8px">ĐANG GIAO</h2><div class="field"><label for="tr-e">Dự kiến tới</label><input id="tr-e" type="datetime-local" class="inp" data-f="v9" data-k="at" value="${esc(M.at)}"></div>${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="v9ShipSave">Xác nhận đang giao</button></div>`;
 if(M.kind==='delivered')return `${head}<h2 style="margin-bottom:8px">ĐÃ GIAO</h2><div class="field"><label for="dl-e">Tới nơi lúc</label><input id="dl-e" type="datetime-local" class="inp" data-f="v9" data-k="at" value="${esc(M.at)}" max="${localDT29()}"></div><p class="small muted">Sau khi xác nhận, đơn đóng lại; CS không đổi ngày, số tấn hay hủy được nữa.</p>${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="v9ShipSave">Xác nhận đã giao</button></div>`;
 return `${head}<h2 style="margin-bottom:8px">GIAO KHÔNG THÀNH CÔNG</h2><div class="fgrid"><div class="field"><label for="fl-r">Lý do <span class="req">*</span></label><select id="fl-r" class="inp" data-f="v9" data-k="code">${rOpts29('fail',M.code)}</select></div><div class="field"><label for="fl-n">Mô tả <span class="req">*</span></label><input id="fl-n" class="inp" data-f="v9" data-k="note" value="${esc(M.note)}"></div></div>
 <p class="small muted">CS và Sales nhận email ngay; hàng được gỡ khỏi xe; CS chọn ngày giao lại (giữ danh sách cuộn) hoặc hủy.</p>${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn danger" data-a="v9ShipSave">Xác nhận giao không thành công</button></div>`;}

/* ---------- CS: xử lý load thiếu ---------- */
function mShort29(){const M=V.modal;const b=bkById(M.id);const days=[...Array(14)].map((_,i)=>addDays(TODAY,i)).filter(d=>S.fleet[b.wh][d]);
 return `<div class="mhead"><span class="meta">${b.id} · ${esc(cust(b.customerId).name)}</span><span class="meta">Load thiếu ${t2(+b.shortTons)} MT</span></div><h2 style="margin-bottom:8px">XỬ LÝ LOAD THIẾU</h2>
 ${b.loadNote?`<div class="hint" style="margin-bottom:8px">Ghi chú Logistics: ${esc(b.loadNote)}</div>`:''}
 <div class="row" style="gap:16px;margin:6px 0"><label class="row"><input type="radio" name="sm" data-f="v9" data-k="mode" data-r="1" value="split" ${M.mode==='split'?'checked':''}> Tách đơn phần còn lại</label><label class="row"><input type="radio" name="sm" data-f="v9" data-k="mode" data-r="1" value="drop" ${M.mode==='drop'?'checked':''}> Không giao phần còn lại</label></div>
 ${M.mode==='split'?`<div class="field"><label for="sh-d">Ngày giao phần còn lại</label><select id="sh-d" class="inp" data-f="v9" data-k="day"><option value="">Chưa hẹn (Lưu tạm)</option>${days.map(d=>`<option value="${d}" ${M.day===d?'selected':''}>${WDS[dow(d)]} ${dmy(d)} · còn ${t2(dayM(b.wh,d).avail)} MT</option>`).join('')}</select></div>`:''}
 ${M.mode==='drop'?`<div class="fgrid"><div class="field"><label for="sh-r">Lý do <span class="req">*</span></label><select id="sh-r" class="inp" data-f="v9" data-k="reason">${rOpts29('nodeliver',M.reason)}</select></div><div class="field"><label for="sh-n">Ghi chú</label><input id="sh-n" class="inp" data-f="v9" data-k="note" value="${esc(M.note)}"></div></div>`:''}
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="v9ShortSave">Lưu</button></div>`;}

function mUrgent29(){const M=V.modal;const b=bkById(M.id);
 return `<div class="mhead"><span class="meta">${b.id}</span><span class="meta">${b.urgent?'Đang KHẨN':'Không khẩn'}${b.urgentSet!=null?' · Admin đặt':' · tự tính'}</span></div><h2 style="margin-bottom:8px">CỜ ĐƠN KHẨN</h2>
 <div class="fgrid"><div class="field"><label for="ug-m">Cờ</label><select id="ug-m" class="inp" data-f="v9" data-k="mode" data-r="1">${[['on','Khẩn'],['off','Không khẩn'],['auto','Tự tính theo mốc chốt xe']].map(([k,l])=>`<option value="${k}" ${M.mode===k?'selected':''}>${l}</option>`).join('')}</select></div>
 ${M.mode!=='auto'?`<div class="field"><label for="ug-n">Lý do <span class="req">*</span></label><input id="ug-n" class="inp" data-f="v9" data-k="note" value="${esc(M.note)}"></div>`:''}</div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="v9UrgentSave">Lưu</button></div>`;}

function mCoils29(){const M=V.modal;const b=bkById(M.id)||{id:M.id};const cs=M.coils;
 return `<div class="mhead"><span class="meta">${b.id}</span><span class="meta">${cs?cs.length+' cuộn · '+t2(r2(cs.reduce((s,x)=>s+(+x.qty),0)))+' MT':''}</span></div><h2 style="margin-bottom:8px">DANH SÁCH CUỘN</h2>
 ${!cs?'<div class="muted">Đang tải…</div>':`<div class="tbl-wrap" style="max-height:420px"><table class="v9tbl"><thead><tr><th>#</th><th>Whs</th><th>Order no</th><th>Ln</th><th>Itmno</th><th>Name</th><th>Lot number</th><th class="r">Qty (t)</th><th>Attr</th><th>Customer</th><th>Lên xe</th></tr></thead><tbody>
 ${cs.map(x=>`<tr class="${x.loaded?'':'bad'}"><td>${x.seq}</td><td>${esc(x.whs)}</td><td>${esc(x.order_no)}</td><td>${esc(x.ln)}</td><td>${esc(x.itmno)}</td><td>${esc(x.name)}</td><td>${esc(x.lot)}</td><td class="r num">${t2(+x.qty)}</td><td>${esc(x.attr)}</td><td>${esc(x.customer)}</td><td>${b.loadedAt||['loaded','transit','delivered'].includes(b.status)?(x.loaded?'Có':'<b class="err">Không</b>'):'–'}</td></tr>`).join('')}</tbody></table></div>`}
 <div class="mfoot">${cs&&cs.length?'<button class="btn ghost" data-a="v9CoilsCsv">Tải CSV</button>':''}<button class="btn" data-a="close">Đóng</button></div>`;}

const M29={bulk:mBulk29,deliv:mDeliv29,ship:mShip29,short:mShort29,urgent:mUrgent29,coils:mCoils29};

/* ---------- thao tác ---------- */
Object.assign(A,{
 bulkNew:()=>{V.modal={type:'bulk',wide:true,step:'input',wh:V.wh,day:addDays(TODAY,1),text:'',mode:'hold',err:''};render();},
 v9BulkTpl:()=>downloadCsv29('mau-dat-hang-nhieu-dong.csv',[BULK_HEAD,['JM2',dmy(addDays(TODAY,2)),S.customers[0]?.code||'KH0101','12,5','','SO-0001','']]),
 v9BulkGo:d=>{const M=V.modal;M.mode=d.m;const P=bulkParse29(M);M.err='';
  if(!P.rows.length){M.err='Chưa có dòng nào.';return render();}if(P.rows.length>300){M.err='Tối đa 300 dòng một lần.';return render();}
  const rows=P.rows.map(o=>({wh:o.wh,day:o.day&&!o.day.startsWith('x:')?o.day:String(o.day||'').slice(2),code:o.code,tons:String(o.tons),address:o.address,ref:o.ref,note:o.note}));
  M.sent=rows;mutate('bulk_create_bookings',{p_rows:rows,p_mode:d.m},{err:m=>M.err=m,ok:res=>{M.res=res;M.step='result';render();
   if(res.failed&&d.m==='hold'){const lines=res.rows.filter(r=>!r.ok).map(r=>[r.row,r.wh,r.day,r.code,r.tons,r.error].join(' | '));console.info('[Nhập nhiều dòng] dòng lỗi:\n'+lines.join('\n'));}
   toast(`Đã nhận ${res.ok} dòng${res.failed?', '+res.failed+' dòng không nhận':''}`);}});},
 v9BulkErrCsv:()=>{const M=V.modal;const bad=M.res.rows.filter(r=>!r.ok);downloadCsv29('dong-loi.csv',[[...BULK_HEAD,'Lý do không nhận','Ngày gợi ý'],...bad.map(r=>{const s=M.sent[r.row-1]||{};return[s.wh,s.day?dmy(s.day):'',s.code,s.tons,s.address,s.ref,s.note,r.error,(r.suggest||[]).map(x=>dm(x.day)).join(' ')];})]);},
 v9BulkFix:()=>{const M=V.modal;const bad=M.res.rows.filter(r=>!r.ok);M.text=bad.map(r=>{const s=M.sent[r.row-1]||{};return[s.wh,s.day?dmy(s.day):'',s.code,s.tons,s.address,s.ref,s.note].join('\t');}).join('\n');M.step='input';M.res=null;M.err='';render();},
 v9BulkMove:d=>{const M=V.modal;const s=M.sent[+d.r-1];if(s)s.day=d.d;const r=M.res.rows.find(x=>x.row===+d.r);if(r){r.day=d.d;r.error='Đã chuyển sang '+dm(d.d)+' – bấm “Sửa các dòng lỗi trong form” để gửi lại';r.suggest=[];}render();},
 v9BulkAgain:()=>A.bulkNew(),
 v9Deliv:d=>{const b=bkById(d.id);const c=cust(b.customerId);const addr=b.addrId&&c.addresses.some(a=>a.id===b.addrId)?b.addrId:(b.addrText?'new':(c.addresses[0]?.id||'new'));
  V.modal={type:'deliv',wide:true,id:b.id,addrId:addr,address:addr==='new'?b.addrText:'',province:b.province||'',text:'',restMode:'split',restDay:'',restReason:'',restNote:'',updTons:false,warn:'',err:'',actualDay:b.date<TODAY?TODAY:''};render();
  if(b.coils)rpc('get_coils',{p_id:b.id}).then(cs=>{if(V.modal&&V.modal.type==='deliv'&&V.modal.id===b.id&&!V.modal.text){V.modal.text=['Whs\tOrder no\tLn\tItmno\tName\tLot number\tAllocated qty\tAttr value\tCustomer',...cs.map(x=>[x.whs,x.order_no,x.ln,x.itmno,x.name,x.lot,x.qty,x.attr,x.customer].join('\t'))].join('\n');render();}}).catch(()=>{});},
 v9DelivSave:async(d)=>{const M=V.modal;const D=delivState29();M.err='';
  if(M.addrId==='new'&&!String(M.address||'').trim()){M.err='Nhập địa chỉ giao (bắt buộc khi xác nhận giao hàng).';return render();}
  if(D.P.err||!D.P.coils.length){M.err=D.P.err||'Dán danh sách cuộn (có dòng tiêu đề).';return render();}
  if(D.dup.length){M.err='Lot number bị trùng: '+D.dup.join(', ');return render();}
  if(D.custs.length>1){M.err='Danh sách cuộn có nhiều khách; mỗi đơn chỉ giao cho một khách.';return render();}
  if(D.kind==='short'&&M.restMode==='drop'&&!M.restReason){M.err='Chọn lý do không giao phần còn lại.';return render();}
  if(D.kind==='excess'&&!M.updTons){M.err='Tổng cuộn nhiều hơn booking: tick “Cập nhật số tấn booking theo cuộn” để lưu.';return render();}
  if(D.b.date<TODAY&&!(M.actualDay>=TODAY)){M.err='Ngày bốc '+dmy(D.b.date)+' đã qua: chọn ngày giao thực tế từ hôm nay trở đi.';return render();}
  const p={id:M.id,coils:D.P.coils,force:!!d.force||!!M.forced,update_tons:!!M.updTons};if(D.b.date<TODAY)p.actual_day=M.actualDay;
  if(M.addrId==='new'){p.address=M.address;p.province=M.province;}else p.address_id=M.addrId;
  if(D.kind==='short'){p.rest_mode=M.restMode;p.rest_day=M.restMode==='split'?M.restDay||'':'';p.rest_reason=M.restReason;p.rest_note=M.restNote;}
  if(V.busy)return;setBusy(true);
  try{const r=await rpcH29('confirm_delivery',{p});await reload();setBusy(false);V.modal=null;V.asg=null;
   toast(`Đã lưu ${r.coils} cuộn (${t2(+r.tons)} MT), Logistics đã được báo${r.child?'. Phần còn lại: '+r.child:''}`);render();}
  catch(e){setBusy(false);if(e.hint==='warn'){M.warn=e.message.replace(/^Cần kiểm tra:\s*/,'');M.forced=false;}else{M.err=e.message;}render();}},
 v9Coils:d=>{V.modal={type:'coils',wide:true,id:d.id,coils:null};render();rpc('get_coils',{p_id:d.id}).then(cs=>{if(V.modal&&V.modal.type==='coils'){V.modal.coils=cs;render();}}).catch(e=>toast(e.message));},
 v9CoilsCsv:()=>{const M=V.modal;downloadCsv29(M.id+'-cuon.csv',[['Whs','Order no','Ln','Itmno','Name','Lot number','Allocated qty','Attr value','Customer','Lên xe'],...M.coils.map(x=>[x.whs,x.order_no,x.ln,x.itmno,x.name,x.lot,x.qty,x.attr,x.customer,x.loaded?'Có':'Không'])]);},
 v9Ship:d=>{V.modal={type:'ship',kind:d.k,id:d.id,off:[],note:'',code:'',at:d.k==='delivered'?localDT29():d.k==='transit'?localDT29(new Date(Date.now()+3*3600e3)):'',coils:null,err:''};render();
  if(d.k==='load')rpc('get_coils',{p_id:d.id}).then(cs=>{if(V.modal&&V.modal.type==='ship'){V.modal.coils=cs;render();}}).catch(e=>{V.modal.err=e.message;render();});},
 v9ShipSave:()=>{const M=V.modal;M.err='';const done=t=>({err:m=>M.err=m,ok:r=>{V.modal=null;V.asg=null;toast(t(r));}});
  if(M.kind==='load'){if(M.off.length&&!String(M.note).trim()){M.err='Nhập ghi chú cho các cuộn không lên xe.';return render();}
   return mutate('mark_loaded',{p_id:M.id,p_unloaded:M.off,p_note:M.note||''},done(r=>r&&r.needAction?`Đã bốc hàng. Bốc thiếu ${t2(+r.short)} MT – CS đã được báo`:'Đã bốc hàng'));}
  if(M.kind==='transit')return mutate('mark_transit',{p_id:M.id,p_eta:dtToIso29(M.at)},done(()=>'Đã chuyển Đang giao'));
  if(M.kind==='delivered')return mutate('mark_delivered',{p_id:M.id,p_at:dtToIso29(M.at)},done(()=>'Đã giao'));
  if(!M.code||!String(M.note).trim()){M.err='Chọn lý do và nhập mô tả.';return render();}
  return mutate('mark_failed',{p_id:M.id,p_reason:M.note,p_reason_code:M.code},done(()=>'Đã báo giao không thành công; CS và Sales được báo ngay'));},
 v9Short:d=>{V.modal={type:'short',id:d.id,mode:'split',day:'',reason:'',note:'',err:''};render();},
 v9ShortSave:()=>{const M=V.modal;M.err='';if(M.mode==='drop'&&!M.reason){M.err='Chọn lý do không giao.';return render();}
  mutate('resolve_short',{p_id:M.id,p_mode:M.mode,p_day:M.mode==='split'&&M.day?M.day:null,p_reason:M.reason||'',p_note:M.note||''},{err:m=>M.err=m,ok:child=>{V.modal=null;toast(child?'Đã tách phần còn lại sang '+child:'Đã ghi nhận không giao phần còn lại');}});},
 v9Redeliver:d=>{const b=bkById(d.id);const M=bfNew(b.date,b);M.rebook=true;M.f.date='';M.info='Giao không thành công'+(b.failNote?' ('+b.failNote+')':'')+'. Chọn ngày giao lại còn đủ chỗ, chọn lý do đổi ngày rồi bấm Đặt lại; danh sách cuộn được giữ.';V.modal=M;render();},
 v9CancelFailed:d=>{const b=bkById(d.id);const M=bfNew(b.date,b);M.cancel=true;V.modal=M;render();},
 v9Urgent:d=>{const b=bkById(d.id);V.modal={type:'urgent',id:d.id,mode:b.urgentSet==null?(b.urgent?'off':'on'):'auto',note:'',err:''};render();},
 v9UrgentSave:()=>{const M=V.modal;M.err='';if(M.mode!=='auto'&&!String(M.note).trim()){M.err='Nhập lý do.';return render();}
  mutate('set_urgent',{p_id:M.id,p_mode:M.mode,p_note:M.note||''},{err:m=>M.err=m,ok:()=>{V.modal=null;toast('Đã cập nhật cờ khẩn');}});},
 v9TruckClose:d=>{const C=V.modal.cl;C.err='';if(!C.reason){C.err='Chọn lý do đóng xe.';return render();}
  const name=R29('close').find(r=>r.code===C.reason)?.name||C.reason;
  mutate('close_truck',{p_code:d.c,p_close:true,p_reason:name+(C.note?': '+C.note:''),p_cap:null},{err:m=>C.err=m,ok:()=>{C.reason='';C.note='';toast('Đã đóng xe');render();}});},
 v9TruckOpen:d=>{const C=V.modal.cl;C.err='';const cap=String(C.cap||'').trim()===''?null:num(C.cap);if(cap!==null&&!(cap>0)){C.err='Tải trọng không hợp lệ.';return render();}
  mutate('close_truck',{p_code:d.c,p_close:false,p_reason:'Mở lại xe',p_cap:cap},{err:m=>C.err=m,ok:()=>{C.cap='';toast('Đã mở lại xe');render();}});},
 v9EmailSave:()=>{const E=V.ep;E.err='';mutate('set_email_prefs',{p_level:E.level,p_alt:E.alt||''},{err:m=>E.err=m,ok:()=>{V.ep=null;toast('Đã lưu cài đặt email');}});},
});

/* ---------- nhập liệu cho các màn hình trên ---------- */
let prevT29=null;
function onInput29(e){const el=e.target;const f=el.dataset&&el.dataset.f;if(!f)return;
 if(f==='v9'&&V.modal){const k=el.dataset.k;V.modal[k]=el.type==='checkbox'?el.checked:el.value;
  if(e.type==='change'&&el.dataset.r)return render();
  if(k==='text'){clearTimeout(prevT29);prevT29=setTimeout(()=>{const x=document.getElementById('v9-prev');if(!x)return;
   if(V.modal.type==='bulk')x.innerHTML=bulkPreview29();else if(V.modal.type==='deliv'){const was=delivState29().kind;x.innerHTML=delivPrev29(delivState29());if(e.type==='change'||V.modal._k!==was){V.modal._k=was;render();const t=document.getElementById(V.modal.type==='deliv'?'dv-t':'bu-t');if(t&&e.type!=='change'){t.focus();t.setSelectionRange(t.value.length,t.value.length);}}}},250);}
  if(e.type==='change'&&k==='updTons')render();
  return;}
 if(f==='v9c'&&V.modal&&V.modal.cl){V.modal.cl[el.dataset.k]=el.value;return;}
 if(f==='v9e'&&V.ep){V.ep[el.dataset.k]=el.value;return;}
 if(f==='v9off'&&V.modal&&e.type==='change'){const s=new Set(V.modal.off);el.checked?s.delete(el.value):s.add(el.value);V.modal.off=[...s];render();return;}
 if(f==='v9file'&&e.type==='change'&&el.files&&el.files[0])readFile29(el.files[0]);}
document.addEventListener('input',onInput29);document.addEventListener('change',onInput29);

async function readFile29(file){const M=V.modal;M.err='';
 try{if(/\.csv$/i.test(file.name)){M.text=await file.text();}
  else{if(typeof XLSX==='undefined'){M.err='Chưa tải được thư viện đọc Excel; thử lại sau vài giây hoặc dán dữ liệu.';return render();}
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(ws,{header:1,raw:false,dateNF:'dd/mm/yyyy',blankrows:false});
   M.text=rows.filter(r=>r.some(x=>String(x??'').trim()!=='')).map(r=>r.map(x=>String(x??'').replace(/\t/g,' ')).join('\t')).join('\n');}
  render();toast('Đã đọc '+file.name);}catch(err){M.err='Không đọc được file: '+err.message;render();}}

if(typeof S!=='undefined'&&S)render();
