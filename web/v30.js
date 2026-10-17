/* =====================================================================
   v3.0 – màn Đặt hàng dạng lưới (thay form đặt 1 đơn và Nhập nhiều dòng),
   Lưu tạm → Gửi Logistics, cấu hình Kho, đổi kho cho đơn thuộc kho ngừng dùng.
   Chạy sau app.js và v29.js.
   ===================================================================== */
(function(){const st=document.createElement('style');st.textContent=`
.g30 table{border-collapse:separate;border-spacing:0;width:100%}
.g30 th{font-size:.82em;letter-spacing:.04em;text-align:left;padding:6px;color:var(--muted);white-space:nowrap}
.g30 td{padding:4px 4px;vertical-align:middle;border-top:1px solid var(--line)}
.g30 .inp{padding:6px 8px;min-height:34px;font-size:1em}
.g30 tr.bad td{background:var(--bad-bg)}
.g30 tr.hol td.c-day input{color:var(--bad);font-weight:700}
.g30 .nm{min-width:150px;font-weight:600}
.g30 .msg{font-size:.8em;color:var(--bad);font-weight:600;white-space:nowrap}
.g30 .ok{font-size:.8em;color:var(--muted);white-space:nowrap}
.g30cap{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-width:280px}
.g30cap .r{display:flex;justify-content:space-between;gap:12px;font-size:.92em;margin-top:4px}
.g30cap .bar{height:5px;background:var(--sand-2);border-radius:3px;overflow:hidden;margin-top:3px}
.g30cap .bar i{display:block;height:100%;background:var(--ok)}
.g30cap .over{color:var(--bad)}.g30cap .over .bar i{background:var(--bad)}
.g30dd{position:fixed;z-index:60;background:var(--surface);border:1px solid var(--line);border-radius:8px;box-shadow:var(--shadow);max-height:280px;overflow:auto;min-width:320px}
.g30dd .h{font-size:11.5px;color:var(--muted);padding:6px 10px;border-bottom:1px solid var(--line)}
.g30dd .o{padding:7px 10px;cursor:pointer;font-size:13px}
.g30dd .o.on,.g30dd .o:hover{background:var(--blue-bg)}
.g30dd .o small{color:var(--muted)}
.g30tabs{display:flex;gap:6px;align-items:center}
.g30tabs button.on{background:var(--primary);color:var(--on-primary)}
.st-dconf{color:var(--ok);background:var(--ok-bg);outline:1px dashed var(--ok)}.st-dconfh{color:var(--pend);background:var(--pend-bg);outline:1px dashed var(--ok)}
.st-latecancel{color:var(--bad);background:var(--bad-bg);outline:1px solid var(--bad)}
`;document.head.appendChild(st);})();

const G30COLS=['wh','day','code','tons','addr','ref','note'];
const fold30=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const LEGACY_WH={PMY:'JM2',HPG:'JD8',CLO:'JD9'};
const whCode30=v=>{v=String(v||'').trim().toUpperCase();v=LEGACY_WH[v]||v;if(WHALL.some(w=>w.id===v))return v;const f=fold30(v);const w=WHALL.find(x=>fold30(x.short)===f||f.includes(fold30(x.short)));return w?w.id:v;};
const custByCode30=code=>S.customers.find(c=>c.code.toLowerCase()===String(code||'').trim().toLowerCase());
const newRow30=(M)=>({wh:M.wh,day:M.day,cid:'',q:'',tons:'',addrId:'',addr:'',ref:'',note:''});

function openGrid30(day){V.modal={type:'grid',wide:true,full:true,wh:V.wh,day:day>=TODAY?day:TODAY,rows:[],tab:'grid',zoom:100,err:'',ask:null};const M=V.modal;for(let i=0;i<3;i++)M.rows.push(newRow30(M));render();}

/* ---------- kiểm tra từng dòng + năng lực theo kho · ngày ---------- */
function gridCheck30(M){const used={};const out=M.rows.map(r=>{const blank=!r.cid&&!r.q.trim()&&!String(r.tons).trim();if(blank)return{blank:true};
  const c=r.cid?cust(r.cid):null;const t=num(r.tons);let err='';const hol=r.day&&isHoliday(r.wh,r.day);let left=null;
  if(!WH.some(w=>w.id===r.wh))err='Kho không hợp lệ';else if(!r.day)err='Thiếu ngày';else if(r.day<TODAY)err='Ngày đã qua';
  else if(!c)err=r.q.trim()?'Không có mã khách':'Chọn khách';else if(c.active===false)err='Khách ngừng dùng';else if(!(t>0))err='Nhập số tấn';
  if(!err&&M.mode!=='draft'){if(!S.fleet[r.wh]||!S.fleet[r.wh][r.day])err=hol?'Ngày nghỉ chưa có xe':'Chưa khai báo xe';
   else{const k=r.wh+'|'+r.day;used[k]=(used[k]||0)+t;left=r2(dayM(r.wh,r.day).avail-used[k]);if(left<-0.001)err='Vượt năng lực';}}
  return{err,hol,left,t:t>0?t:0};});
 const groups={};M.rows.forEach((r,i)=>{const x=out[i];if(x.blank||!r.day||!r.wh)return;const k=r.wh+'|'+r.day;(groups[k]=groups[k]||{wh:r.wh,day:r.day,t:0}).t+=x.t;});
 return{rows:out,groups:Object.values(groups).sort((a,b)=>a.day.localeCompare(b.day)||a.wh.localeCompare(b.wh))};}
function capHtml30(C){if(!C.groups.length)return '<div class="small muted">Chưa có dòng nào.</div>';
 return C.groups.map(g=>{const m=dayM(g.wh,g.day);const ok=S.fleet[g.wh]&&S.fleet[g.wh][g.day];const left=r2(m.avail-g.t);const over=!ok||left<-0.001;const pc=m.cap?Math.min(100,Math.max(0,(m.cap-Math.max(0,left))/m.cap*100)):100;
  return `<div class="${over?'over':''}"><div class="r"><b>${g.wh} · ${WDS[dow(g.day)]} ${dmy(g.day)}${isHoliday(g.wh,g.day)?' ⚠':''}</b><span>${ok?`còn <b>${t2(Math.max(0,left))}</b> / ${t2(m.cap)} t`:'chưa khai báo xe'}</span></div><div class="bar"><i style="width:${pc}%"></i></div></div>`;}).join('');}
function footHtml30(C){const rows=C.rows.filter(x=>!x.blank);const okr=rows.filter(x=>!x.err);
 return `${rows.length} dòng · ${t2(rows.reduce((s,x)=>s+x.t,0))} t · Đặt được ${okr.length} đơn, ${t2(okr.reduce((s,x)=>s+x.t,0))} t`;}

function mGrid30(){const M=V.modal;if(M.ask)return askAddr30(M);const C=gridCheck30(M);
 const whOpt=v=>WH.map(w=>`<option value="${w.id}" ${v===w.id?'selected':''}>${w.id}</option>`).join('')+(v&&!WH.some(w=>w.id===v)?`<option value="${esc(v)}" selected>${esc(v)} (?)</option>`:'');
 const rows=M.rows.map((r,i)=>{const x=C.rows[i];const c=r.cid?cust(r.cid):null;
  return `<tr class="${x.err&&!x.blank?'bad':''} ${x.hol?'hol':''}" data-row="${i}"><td class="muted">${i+1}</td>
  <td><select class="inp" data-g="wh" data-i="${i}" aria-label="Kho dòng ${i+1}">${whOpt(r.wh)}</select></td>
  <td class="c-day"><input type="date" class="inp" min="${TODAY}" value="${r.day}" data-g="day" data-i="${i}" aria-label="Ngày bốc dòng ${i+1}"></td>
  <td><input class="inp" style="width:110px" autocomplete="off" value="${esc(r.q)}" data-g="code" data-i="${i}" placeholder="Mã / tên" aria-label="Mã khách dòng ${i+1}"></td>
  <td class="nm" id="g30n-${i}">${c?esc(c.name):'–'}</td>
  <td><input class="inp num" style="width:80px" inputmode="decimal" value="${esc(r.tons)}" data-g="tons" data-i="${i}" aria-label="Số tấn dòng ${i+1}"></td>
  <td><input class="inp" style="min-width:220px" autocomplete="off" value="${esc(r.addr)}" data-g="addr" data-i="${i}" placeholder="nhập khi xác nhận giao hàng" aria-label="Địa chỉ dòng ${i+1}"></td>
  <td><input class="inp" style="width:110px" value="${esc(r.ref)}" data-g="ref" data-i="${i}" placeholder="không bắt buộc" aria-label="Ref dòng ${i+1}"></td>
  <td><input class="inp" style="width:130px" value="${esc(r.note)}" data-g="note" data-i="${i}" placeholder="ghi chú" aria-label="Ghi chú dòng ${i+1}"></td>
  <td id="g30s-${i}">${x.blank?'':x.err?`<span class="msg">${x.err}</span>`:x.left!=null?`<span class="ok">còn ${t2(x.left)} t</span>`:'<span class="ok">OK</span>'}${x.hol&&!x.blank?' <span class="urg">⚠ '+(dow(r.day)===0?'CN':'Lễ')+'</span>':''}</td>
  <td><button class="btn ghost sm" data-a="g30Del" data-i="${i}" aria-label="Xóa dòng ${i+1}">×</button></td></tr>`;}).join('');
 return `<div class="g30" style="font-size:${M.zoom}%"><div class="mhead"><h2 style="margin:0">ĐẶT HÀNG</h2><div class="g30tabs"><button class="btn ghost sm" data-a="g30Zoom" data-d="-10">A−</button><span class="small">${M.zoom}%</span><button class="btn ghost sm" data-a="g30Zoom" data-d="10">A+</button>
  <button class="btn ghost sm ${M.tab==='grid'?'on':''}" data-a="g30Tab" data-t="grid">Nhập tay nhiều khách</button><button class="btn ghost sm ${M.tab==='file'?'on':''}" data-a="g30Tab" data-t="file">Tải file</button></div></div>
 <div class="row" style="gap:14px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px">
  <div class="field"><label for="g30-wh">Kho mặc định</label><select id="g30-wh" class="inp" data-g="dwh">${WH.map(w=>`<option value="${w.id}" ${M.wh===w.id?'selected':''}>${esc(w.full)}</option>`).join('')}</select></div>
  <div class="field"><label for="g30-d">Ngày bốc mặc định</label><input id="g30-d" type="date" class="inp" min="${TODAY}" value="${M.day}" data-g="dday"></div>
  <button class="linkbtn" style="margin-top:26px" data-a="g30Apply">Áp dụng cho mọi dòng</button><span class="grow"></span>
  <div class="g30cap"><div class="small muted">Năng lực giao theo kho · ngày đang nhập</div><div id="g30cap">${capHtml30(C)}</div></div></div>
 ${M.tab==='file'?`<div class="panel" style="margin-bottom:10px"><div class="row" style="gap:10px;flex-wrap:wrap"><input type="file" class="inp" accept=".xlsx,.xls,.csv" data-g="file" aria-label="Chọn file"><button class="btn ghost sm" data-a="v9BulkTpl">Tải file mẫu</button></div>
  <p class="small muted" style="margin:6px 0 0">Cột theo mẫu: Kho · Ngày bốc · Mã KH · (Tên KH) · Số tấn · Địa chỉ · Ref · Ghi chú. Dữ liệu đọc xong sẽ đưa vào lưới để kiểm tra trước khi đặt.</p></div>`:''}
 <div class="tbl-wrap"><table><thead><tr><th>#</th><th>Kho</th><th>Ngày bốc</th><th>Mã KH</th><th>Tên khách hàng</th><th>Số tấn</th><th>Địa chỉ giao <span style="font-weight:400">(không bắt buộc)</span></th><th>Ref (SO)</th><th>Ghi chú</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost sm" data-a="g30Add" data-n="1">+ Thêm dòng</button><button class="btn ghost sm" data-a="g30Add" data-n="5">+ 5 dòng</button></div>
 <p class="small muted" style="margin:8px 0 0">Gõ mã hoặc tên khách (không dấu cũng được), ↑↓ Enter để chọn; kho tự theo kho mặc định của khách (đổi được). Dán từ Excel: chọn ô bất kỳ rồi Ctrl+V – cột Mã KH · Số tấn · Địa chỉ · Ref · Ghi chú, hoặc như file mẫu: Kho · Ngày · Mã KH · Tên KH · Số tấn · …</p>
 ${M.err?`<div class="err" style="margin-top:8px">${esc(M.err)}</div>`:''}
 <div class="mfoot" style="border-top:1px solid var(--line);padding-top:10px;margin-top:10px"><span class="grow small" id="g30foot" style="align-self:center">${footHtml30(C)}</span><button class="btn ghost" data-a="close">Đóng</button><button class="btn ghost" data-a="g30Go" data-m="draft">Lưu tạm (Nháp)</button><button class="btn" data-a="g30Go" data-m="hold">Đặt &amp; gửi Logistics</button></div></div>`;}

/* cập nhật nhẹ (không vẽ lại cả lưới, giữ con trỏ đang gõ) */
function refresh30(){const M=V.modal;if(!M||M.type!=='grid')return;const C=gridCheck30(M);
 const cap=document.getElementById('g30cap');if(cap)cap.innerHTML=capHtml30(C);const f=document.getElementById('g30foot');if(f)f.textContent=footHtml30(C);
 C.rows.forEach((x,i)=>{const s=document.getElementById('g30s-'+i);if(!s)return;const r=M.rows[i];s.innerHTML=x.blank?'':(x.err?`<span class="msg">${x.err}</span>`:x.left!=null?`<span class="ok">còn ${t2(x.left)} t</span>`:'<span class="ok">OK</span>')+(x.hol&&!x.blank?' <span class="urg">⚠ '+(dow(r.day)===0?'CN':'Lễ')+'</span>':'');
  const tr=s.closest('tr');if(tr){tr.classList.toggle('bad',!!x.err&&!x.blank);tr.classList.toggle('hol',!!x.hol);}});}
function focus30(i,g){setTimeout(()=>{const el=document.querySelector(`[data-g="${g}"][data-i="${i}"]`);if(el){el.focus();if(el.select&&el.type!=='date')el.select();}},0);}

/* ---------- ô gợi ý (khách hàng, địa chỉ) ---------- */
let DD30=null;
function ddClose30(){const d=document.getElementById('g30dd');if(d)d.remove();DD30=null;}
function ddOpen30(el){const M=V.modal;const i=+el.dataset.i,g=el.dataset.g;const r=M.rows[i];const q=fold30(el.value.trim());let items=[],head='';
 if(g==='code'){const all=S.customers.filter(c=>c.active!==false);items=(q?all.filter(c=>fold30(c.code+' '+c.name).includes(q)):all).slice(0,10).map(c=>({v:c.id,html:`<b>${esc(c.code)}</b> · ${esc(c.name)}${c.defWh?` <small>· kho ${esc(c.defWh)}</small>`:''}`}));head=`${items.length} khách khớp · gõ để tìm · ↑↓ Enter chọn`;}
 else{const c=r.cid?cust(r.cid):null;if(!c){ddClose30();return;}const all=c.addresses||[];const m=q?all.filter(a=>fold30(a.label+' '+a.ward+' '+a.province).includes(q)):all;
  items=m.slice(0,10).map(a=>({v:a.id,html:`${esc(a.label)}<small>, ${esc(a.ward)}, ${esc(a.province)}</small>`}));head=`📍 ${all.length} địa chỉ giao của khách · khớp ${items.length}`;if(!items.length)items=[{v:'',html:'<small>Không có địa chỉ khớp – giữ địa chỉ đang gõ.</small>'}];}
 let d=document.getElementById('g30dd');if(!d){d=document.createElement('div');d.id='g30dd';d.className='g30dd';document.body.appendChild(d);}
 const rc=el.getBoundingClientRect();d.style.left=rc.left+'px';d.style.top=(rc.bottom+2)+'px';
 DD30={i,g,items,on:0};d.innerHTML=`<div class="h">${head}</div>`+items.map((x,k)=>`<div class="o ${k===0?'on':''}" data-k="${k}">${x.html}</div>`).join('');}
function ddPick30(k){const M=V.modal;if(!DD30)return;const{i,g,items}=DD30;const it=items[k];ddClose30();if(!it||!it.v)return;const r=M.rows[i];
 if(g==='code'){const c=cust(it.v);r.cid=c.id;r.q=c.code;if(c.defWh&&WH.some(w=>w.id===c.defWh))r.wh=c.defWh;r.addrId='';r.addr='';render();focus30(i,'tons');}
 else{const c=cust(r.cid);const a=c.addresses.find(x=>x.id===it.v);r.addrId=a.id;r.addr=[a.label,a.ward,a.province].filter(Boolean).join(', ');render();focus30(i,'ref');}}
document.addEventListener('mousedown',e=>{const o=e.target.closest('#g30dd .o');if(o){e.preventDefault();ddPick30(+o.dataset.k);return;}if(!e.target.closest('#g30dd'))ddClose30();});

/* ---------- dán từ Excel / đọc file ---------- */
function fillCells30(cells,M,i,col){const r=M.rows[i];if(!r)return;let c=G30COLS.indexOf(col);
 // dán từ cột Kho theo mẫu: có thể kèm cột Tên KH sau Mã KH
 if(col==='wh'&&cells.length>=5&&!(num(cells[3])>0)&&num(cells[4])>0)cells=[cells[0],cells[1],cells[2],...cells.slice(4)];
 for(const v0 of cells){const k=G30COLS[c++];if(!k)break;const v=String(v0??'').trim();
  if(k==='wh'){if(v)r.wh=whCode30(v);}else if(k==='day'){const d=parseDate29(v,r.day);if(d&&!d.startsWith('x:'))r.day=d;}
  else if(k==='code'){r.q=v;const cc=custByCode30(v)||S.customers.find(x=>fold30(x.name)===fold30(v));r.cid=cc?cc.id:'';if(cc){r.q=cc.code;if(cc.defWh&&WH.some(w=>w.id===cc.defWh)&&col!=='wh')r.wh=cc.defWh;}}
  else if(k==='tons')r.tons=v.replace(/\s/g,'');else if(k==='addr'){r.addr=v;r.addrId='';const cc=r.cid&&cust(r.cid);const a=cc&&cc.addresses.find(x=>fold30(x.label)===fold30(v)||fold30([x.label,x.ward,x.province].join(', '))===fold30(v));if(a)r.addrId=a.id;}
  else r[k]=v;}}
function pasteRows30(text,i0,col){const M=V.modal;let rows=splitRows29(text);
 if(rows.length&&rows[0].some(x=>/m[aã]\s*kh|s[oố]\s*t[aấ]n|^kho$/i.test(x)))rows.shift();
 if(col!=='wh'&&rows.length&&(WHALL.some(w=>w.id===whCode30(rows[0][0]))||/^\d{1,2}[\/\-.]\d{1,2}([\/\-.]\d{2,4})?$|^\d{4}-\d{2}-\d{2}$/.test(rows[0][0]||'')))col=WHALL.some(w=>w.id===whCode30(rows[0][0]))?'wh':'day';
 rows.forEach((cells,k)=>{const i=i0+k;while(M.rows.length<=i)M.rows.push(newRow30(M));fillCells30(cells,M,i,col);});
 render();toast(`Đã dán ${rows.length} dòng`);}
document.addEventListener('paste',e=>{const el=e.target;if(!el.dataset||!el.dataset.g||!V.modal||V.modal.type!=='grid'||el.dataset.i==null)return;
 const t=(e.clipboardData||window.clipboardData).getData('text');if(!/[\t\n]/.test(t.trim()))return;e.preventDefault();ddClose30();pasteRows30(t,+el.dataset.i,el.dataset.g);});
async function readFile30(file){const M=V.modal;M.err='';try{let text;
  if(/\.csv$/i.test(file.name))text=await file.text();
  else{if(typeof XLSX==='undefined'){M.err='Chưa tải được thư viện đọc Excel; thử lại sau vài giây hoặc dán dữ liệu.';return render();}
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,dateNF:'dd/mm/yyyy',blankrows:false});
   text=rows.filter(r=>r.some(x=>String(x??'').trim()!=='')).map(r=>r.map(x=>String(x??'').replace(/\t/g,' ')).join('\t')).join('\n');}
  M.rows=M.rows.filter(r=>r.cid||r.q.trim()||String(r.tons).trim());M.tab='grid';pasteRows30(text,M.rows.length,'wh');}catch(err){M.err='Không đọc được file: '+err.message;render();}}

/* ---------- nhập liệu trên lưới ---------- */
document.addEventListener('input',e=>{const el=e.target;const g=el.dataset&&el.dataset.g;if(!g||!V.modal||V.modal.type!=='grid')return;const M=V.modal;const i=+el.dataset.i;const r=M.rows[i];
 if(g==='code'){r.q=el.value;r.cid='';const c=custByCode30(el.value);if(c&&el.value.length>=c.code.length){r.cid=c.id;}const n=document.getElementById('g30n-'+i);if(n)n.textContent=r.cid?cust(r.cid).name:'–';ddOpen30(el);refresh30();return;}
 if(g==='addr'){r.addr=el.value;r.addrId='';ddOpen30(el);return;}
 if(g==='tons'||g==='ref'||g==='note'){r[g]=el.value;if(g==='tons')refresh30();return;}});
document.addEventListener('change',e=>{const el=e.target;const g=el.dataset&&el.dataset.g;if(!g||!V.modal||V.modal.type!=='grid')return;const M=V.modal;const i=+el.dataset.i;
 if(g==='dwh'){M.wh=el.value;return;}if(g==='dday'){M.day=el.value;return;}
 if(g==='wh'||g==='day'){M.rows[i][g]=el.value;render();return;}
 if(g==='file'&&el.files&&el.files[0]){readFile30(el.files[0]);return;}
 if(g==='code'){const r=M.rows[i];if(!r.cid&&r.q.trim()){const c=custByCode30(r.q);if(c){r.cid=c.id;r.q=c.code;if(c.defWh&&WH.some(w=>w.id===c.defWh))r.wh=c.defWh;render();}}}});
document.addEventListener('focusin',e=>{const el=e.target;if(el.dataset&&(el.dataset.g==='code'||el.dataset.g==='addr')&&V.modal&&V.modal.type==='grid')ddOpen30(el);});
document.addEventListener('keydown',e=>{const el=e.target;if(!el.dataset||!el.dataset.g||!V.modal||V.modal.type!=='grid'||el.dataset.i==null)return;const i=+el.dataset.i,g=el.dataset.g;
 if(DD30&&DD30.i===i&&DD30.g===g){const d=document.getElementById('g30dd');
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();DD30.on=Math.max(0,Math.min(DD30.items.length-1,DD30.on+(e.key==='ArrowDown'?1:-1)));d.querySelectorAll('.o').forEach((o,k)=>o.classList.toggle('on',k===DD30.on));return;}
  if(e.key==='Enter'){e.preventDefault();if(DD30.items[DD30.on]&&DD30.items[DD30.on].v)return ddPick30(DD30.on);ddClose30();focus30(i,g==='code'?'tons':'ref');return;}
  if(e.key==='Escape'){e.stopPropagation();ddClose30();return;}}
 if(e.key==='Enter'&&el.tagName==='INPUT'){e.preventDefault();const M=V.modal;if(i===M.rows.length-1){M.rows.push(newRow30(M));render();}focus30(i+1,g);}});

/* ---------- hỏi lưu địa chỉ mới (chỉ lưu khi CS đồng ý) ---------- */
function newAddrs30(M){const seen=new Set();const out=[];
 M.rows.forEach((r,i)=>{if(!r.cid||r.addrId||!r.addr.trim()||!(num(r.tons)>0))return;const c=cust(r.cid);if((c.addresses||[]).some(a=>fold30(a.label)===fold30(r.addr)))return;
  const k=r.cid+'|'+fold30(r.addr);if(seen.has(k))return;seen.add(k);out.push({k,i,cid:r.cid,addr:r.addr.trim(),save:false,province:''});});return out;}
function askAddr30(M){const A=M.ask;
 return `<div class="mhead"><h2 style="margin:0">LƯU ĐỊA CHỈ MỚI?</h2><span class="meta">${A.list.length} địa chỉ chưa có trong hồ sơ khách</span></div>
 <p class="small muted" style="margin:0 0 8px">Tick địa chỉ muốn lưu vào hồ sơ khách để lần sau gợi ý; chọn tỉnh/thành để tự gán khu vực. Không tick: booking vẫn dùng địa chỉ đã gõ nhưng không lưu.</p>
 <div class="tbl-wrap"><table class="v9tbl"><thead><tr><th>Lưu</th><th>Khách hàng</th><th>Địa chỉ</th><th>Tỉnh/Thành</th></tr></thead><tbody>
 ${A.list.map((x,k)=>`<tr><td><input type="checkbox" data-a30="save" data-k="${k}" ${x.save?'checked':''} aria-label="Lưu địa chỉ ${k+1}"></td><td>${esc(cust(x.cid).code)} · ${esc(cust(x.cid).name)}</td><td>${esc(x.addr)}</td>
  <td><select class="inp" data-a30="prov" data-k="${k}" aria-label="Tỉnh/thành địa chỉ ${k+1}"><option value="">Chọn</option>${PROVINCES.map(p=>`<option ${x.province===p?'selected':''}>${p}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
 ${A.err?`<div class="err">${esc(A.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="g30AskBack">Quay lại lưới</button><button class="btn" data-a="g30AskGo">Tiếp tục ${M.mode==='draft'?'lưu tạm':'đặt & gửi Logistics'}</button></div>`;}
document.addEventListener('change',e=>{const el=e.target;const k=el.dataset&&el.dataset.a30;if(!k||!V.modal||!V.modal.ask)return;const x=V.modal.ask.list[+el.dataset.k];
 if(k==='save')x.save=el.checked;if(k==='prov'){x.province=el.value;if(el.value)x.save=true;render();}});

function validate30(M){const C=gridCheck30(M);const idx=M.rows.map((r,i)=>i).filter(i=>!C.rows[i].blank);
 if(!idx.length)return 'Chưa có dòng nào.';if(idx.length>300)return 'Tối đa 300 dòng một lần.';
 const bad=idx.filter(i=>C.rows[i].err&&!['Vượt năng lực','Chưa khai báo xe','Ngày nghỉ chưa có xe'].includes(C.rows[i].err));
 return bad.length?`Dòng ${bad.map(i=>i+1).join(', ')}: ${C.rows[bad[0]].err}. Sửa hoặc xóa dòng rồi gửi lại.`:'';}
function submit30(M){const C=gridCheck30(M);const idx=M.rows.map((r,i)=>i).filter(i=>!C.rows[i].blank);
 const v=validate30(M);if(v){M.err=v;M.ask=null;return render();}
 const saveMap={};(M.ask?M.ask.list:[]).forEach(x=>{if(x.save)saveMap[x.k]=x;});const usedSave=new Set();
 const rows=idx.map(i=>{const r=M.rows[i];const c=cust(r.cid);const k=r.cid+'|'+fold30(r.addr);const sv=!r.addrId&&saveMap[k]&&!usedSave.has(k);if(sv)usedSave.add(k);
  const reg=sv?(()=>{const cand=regionsOf(r.wh).filter(x=>x.newProvince===saveMap[k].province);return cand.length===1?cand[0].id:'';})():'';
  return{wh:r.wh,day:r.day,code:c.code,tons:String(r.tons),address:r.addrId?'':r.addr.trim(),address_id:r.addrId||'',ref:r.ref.trim(),note:r.note.trim(),save_addr:!!sv,province:sv?saveMap[k].province:'',region:reg};});
 const sent=rows.map(x=>({...x}));const mode=M.mode;
 mutate('bulk_create_bookings',{p_rows:rows,p_mode:mode},{err:m=>{M.err=m;M.ask=null;},ok:res=>{V.modal={type:'bulk',wide:true,step:'result',res,sent,mode,grid:M};render();
  toast(`${mode==='draft'?'Đã lưu tạm':'Đã đặt'} ${res.ok} đơn${res.failed?', '+res.failed+' dòng không nhận':''}`);}});}

/* ---------- Đơn: Gửi Logistics, Đổi kho ---------- */
{const _bh=bkHead29;bkHead29=function(b){return _bh(b)+bkHead30(b);};}
function bkHead30(b){if(!internal()||!ownsCust(b.customerId))return '';let h='';const whOk=WH.some(w=>w.id===b.wh);
 if(b.status==='draft'&&b.csId===V.me&&can('booking.create')&&whOk)h+=`<button class="btn" data-a="v30Send" data-id="${b.id}">Gửi Logistics</button>`;
 if(!whOk&&can('booking.edit')&&!['loaded','transit','delivered','cancelled'].includes(b.status))h+=`<span class="row" style="gap:6px"><select class="inp" id="v30-cw" aria-label="Kho mới">${WH.map(w=>`<option value="${w.id}">${esc(w.full)}</option>`).join('')}</select><button class="btn" data-a="v30ChWh" data-id="${b.id}">Đổi kho</button></span>`;
 return h?`<span class="v9acts">${h}</span>`:'';}
{const _bi=bkInfo29;bkInfo29=function(b){const warn=!WH.some(w=>w.id===b.wh)?`<div class="warnlist">Kho <b>${esc(b.wh)}</b> đã ngừng dùng. Chọn kho mới rồi bấm <b>Đổi kho</b>; booking chuyển về Lưu tạm để gửi lại Logistics.</div>`:'';
 const draft=b.status==='draft'?`<div class="hint" style="margin-top:8px">Lưu tạm: chưa trừ năng lực giao, Logistics chưa thấy. Bấm <b>Gửi Logistics</b> để giữ chỗ. Quá mốc chốt xe hệ thống nhắc; quá ngày bốc 2 ngày nháp tự hủy.</div>`:'';
 const early=b.status==='hold'&&+b.coils>0?`<div class="warnlist">Đã có danh sách cuộn – hàng sẵn sàng, Logistics cần xếp xe ngay.</div>`:'';
 return warn+draft+early+_bi(b);};}

/* ---------- Cấu hình → Kho ---------- */
function whCfg30(){const E=V.whE||(V.whE={});const N=V.whN||(V.whN={code:'',name:'',erp:''});
 const n=wh=>S.bookings.filter(b=>b.wh===wh&&!['cancelled','delivered'].includes(b.status)).length;
 return `<p class="small muted" style="margin:10px 0">Mã kho là mã ERP (cột Whs của danh sách cuộn), dùng trong mã booking mới (BK-JM2-…). Ngừng dùng kho: không đặt mới được; đơn còn mở của kho đó hiện nút <b>Đổi kho</b>.</p>
 <div class="tbl-wrap"><table><thead><tr><th>Mã kho</th><th>Tên</th><th>Tên đầy đủ</th><th>Mã ERP</th><th>Đang dùng</th><th class="r">Đơn còn mở (đang tải)</th><th></th></tr></thead><tbody>
 ${WHALL.map(w=>{const e=E[w.id]||{};return `<tr><td><b>${w.id}</b></td><td><input class="inp" data-w30="name" data-c="${w.id}" value="${esc(e.name??w.short)}" aria-label="Tên kho ${w.id}"></td>
  <td><input class="inp" data-w30="full" data-c="${w.id}" value="${esc(e.full??w.fullName??'')}" placeholder="Kho ${esc(w.short)}" aria-label="Tên đầy đủ ${w.id}"></td>
  <td><input class="inp" style="width:90px" data-w30="erp" data-c="${w.id}" value="${esc(e.erp??w.erp)}" aria-label="Mã ERP ${w.id}"></td>
  <td><label class="row"><input type="checkbox" data-w30="active" data-c="${w.id}" ${(e.active??w.active)?'checked':''}> ${w.active?'Đang dùng':'Ngừng dùng'}</label></td>
  <td class="r num">${n(w.id)}</td><td><button class="btn ghost sm" data-a="v30WhSave" data-c="${w.id}">Lưu</button></td></tr>`;}).join('')}
 <tr><td><input class="inp" style="width:80px" data-w30n="code" value="${esc(N.code)}" placeholder="JD7" aria-label="Mã kho mới"></td><td><input class="inp" data-w30n="name" value="${esc(N.name)}" placeholder="Tên kho" aria-label="Tên kho mới"></td><td></td>
  <td><input class="inp" style="width:90px" data-w30n="erp" value="${esc(N.erp)}" placeholder="= mã kho" aria-label="Mã ERP kho mới"></td><td colspan="2"></td><td><button class="btn sm" data-a="v30WhNew">+ Thêm kho</button></td></tr>
 </tbody></table></div>${V.whErr?`<div class="err" style="margin-top:8px">${esc(V.whErr)}</div>`:''}`;}
document.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.w30){const c=el.dataset.c;V.whE=V.whE||{};V.whE[c]={...(V.whE[c]||{}),[el.dataset.w30]:el.type==='checkbox'?el.checked:el.value};}
 if(el.dataset&&el.dataset.w30n){V.whN=V.whN||{};V.whN[el.dataset.w30n]=el.value;}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.w30==='active'){const c=el.dataset.c;V.whE=V.whE||{};V.whE[c]={...(V.whE[c]||{}),active:el.checked};}});

Object.assign(A,{
 bulkNew:()=>openGrid30(addDays(TODAY,1)),
 g30Tab:d=>{V.modal.tab=d.t;render();},
 g30Zoom:d=>{const M=V.modal;M.zoom=Math.max(70,Math.min(150,M.zoom+(+d.d)));render();},
 g30Add:d=>{const M=V.modal;for(let k=0;k<+d.n;k++)M.rows.push(newRow30(M));render();focus30(M.rows.length-+d.n,'code');},
 g30Del:d=>{const M=V.modal;M.rows.splice(+d.i,1);if(!M.rows.length)M.rows.push(newRow30(M));render();},
 g30Apply:()=>{const M=V.modal;M.rows.forEach(r=>{r.wh=M.wh;r.day=M.day;});render();},
 g30Go:d=>{const M=V.modal;M.mode=d.m;M.err=validate30(M);if(M.err)return render();
  const list=newAddrs30(M);if(list.length&&!M.askDone){M.ask={list,err:''};return render();}submit30(M);},
 g30AskBack:()=>{V.modal.ask=null;render();},
 g30AskGo:()=>{const M=V.modal;const miss=M.ask.list.filter(x=>x.save&&!x.province);if(miss.length){M.ask.err='Chọn tỉnh/thành cho các địa chỉ được tick lưu.';return render();}
  const keep=M.ask;M.askDone=true;M.ask=keep;submit30(M);},
 v9BulkFix:()=>{const R=V.modal;const G=R.grid;const bad=R.res.rows.filter(r=>!r.ok);
  if(!G){V.modal=null;return openGrid30(addDays(TODAY,1));}
  G.rows=bad.map(r=>{const s=R.sent[r.row-1]||{};const c=custByCode30(s.code);return{wh:s.wh,day:s.day,cid:c?c.id:'',q:s.code||'',tons:s.tons,addrId:s.address_id||'',addr:s.address_id&&c?(c.addresses.find(a=>a.id===s.address_id)||{}).label||'':s.address||'',ref:s.ref||'',note:s.note||''};});
  G.ask=null;G.askDone=false;G.err='';V.modal=G;render();},
 v9BulkAgain:()=>openGrid30(addDays(TODAY,1)),
 v30Send:d=>mutate('send_to_logistics',{p_ids:[d.id]},{ok:r=>{const x=(r||[])[0];toast(x&&x.ok?'Đã gửi Logistics, đang chờ xếp xe':'Chưa gửi được: '+(x?x.error:''));}}),
 v30SendDrafts:()=>{const ids=S.bookings.filter(b=>b.status==='draft'&&b.csId===V.me&&b.date>=TODAY).map(b=>b.id);if(!ids.length)return toast('Không có nháp nào của bạn từ hôm nay trở đi.');
  mutate('send_to_logistics',{p_ids:ids},{ok:r=>{const ok=r.filter(x=>x.ok).length;const bad=r.filter(x=>!x.ok);toast(`Đã gửi ${ok} nháp${bad.length?'; chưa gửi '+bad.length+': '+bad.slice(0,2).map(x=>x.id+' – '+x.error).join('; '):''}`);}});},
 v30ChWh:d=>{const el=document.getElementById('v30-cw');mutate('change_booking_wh',{p_id:d.id,p_wh:el.value},{ok:()=>toast('Đã đổi kho; booking về Lưu tạm, bấm Gửi Logistics để giữ chỗ')});},
 v30WhSave:d=>{const w=WHALL.find(x=>x.id===d.c);const e=(V.whE||{})[d.c]||{};V.whErr='';
  mutate('save_warehouse',{p:{code:d.c,name:e.name??w.short,full:e.full??'',erp:e.erp??w.erp,active:e.active??w.active}},{err:m=>V.whErr=m,ok:()=>{delete V.whE[d.c];toast('Đã lưu kho '+d.c);}});},
 v30WhNew:()=>{const N=V.whN||{};V.whErr='';mutate('save_warehouse',{p:{new:true,code:N.code,name:N.name,erp:N.erp||N.code}},{err:m=>V.whErr=m,ok:c=>{V.whN={code:'',name:'',erp:''};toast('Đã thêm kho '+c);}});},
});
{const _m=M29.bulk;M29.grid=mGrid30;M29.bulk=function(){const M=V.modal;return M.step==='result'?bulkResult29():_m();};}
gsBookFor=function(custId,date,wh){openGrid30(date||TODAY);const M=V.modal;const r=M.rows[0];if(wh){M.wh=wh;M.rows.forEach(x=>x.wh=wh);}
 if(custId){const c=cust(custId);r.cid=custId;r.q=c?c.code:'';if(c&&c.defWh&&WH.some(w=>w.id===c.defWh))r.wh=c.defWh;}render();focus30(0,custId?'tons':'code');};
if(typeof S!=='undefined'&&S)render();
