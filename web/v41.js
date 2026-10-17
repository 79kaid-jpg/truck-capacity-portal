// v3.13: Yêu cầu đặt hàng — khách / Sales ghi nhanh "20 MT HC 0.5 xanh dương…", CS xử lý thành đơn
(()=>{const st=document.createElement('style');st.textContent=`
.rqchip{display:inline-flex;align-items:center;gap:3px;margin-top:4px;padding:1px 7px;border-radius:999px;border:1.5px solid #7a4bd1;background:#f1eaff;color:#5b2fb0;font:inherit;font-size:11px;font-weight:700;cursor:pointer}
.rqchip.done{border-color:var(--line);background:var(--surface);color:var(--muted);font-weight:600}
.rqbtn{border-color:#7a4bd1!important;color:#5b2fb0!important}.rqbtn b{background:#7a4bd1;color:#fff;border-radius:999px;padding:0 6px;margin-left:4px;font-size:11px}
.rq{border:1px solid var(--line);border-left:4px solid #7a4bd1;border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--surface)}
.rq.st-done{border-left-color:var(--ok)}.rq.st-declined{border-left-color:var(--bad)}.rq.st-cancelled{border-left-color:var(--muted);opacity:.75}
.rq .rqh{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}.rq .rqh b{font-size:14px}.rq .rqb{white-space:pre-wrap;margin:6px 0;font-size:14px;background:var(--ground);border-radius:8px;padding:6px 9px}
.rq .rqm{font-size:12px;color:var(--muted)}.rq .rqa{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.rq .rqr{font-size:12.5px;margin-top:4px}
.rqtag{font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 6px;background:var(--blue-bg);color:var(--blue)}.rqtag.k{background:#f1eaff;color:#5b2fb0}
.rqform{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rqform .span2{grid-column:span 2}.rqform textarea{min-height:110px}
@media (max-width:700px){.rqform{grid-template-columns:1fr}.rqform .span2{grid-column:auto}}
.g30req{margin:6px 0 8px;padding:8px 10px;border-radius:8px;background:#f1eaff;border:1px solid #c9b3f3;font-size:13px;white-space:pre-wrap}
`;document.head.appendChild(st);})();
{const a0=adopt;adopt=function(st){const s=a0(st);s.reqs=(st.reqs||[]).map(r=>({...r,at:Math.floor(r.at/60),handledAt:r.handledAt?Math.floor(r.handledAt/60):null}));return s;};}
const RQ_ST={new:'Chờ CS xử lý',done:'Đã tạo đơn',declined:'Không nhận',cancelled:'Đã hủy'};
const rqCanNew=()=>!!S&&!S.custView&&(role()==='customer'||can('req.create'));
const rqCanHandle=()=>!!S&&!S.custView&&role()!=='customer'&&can('req.handle');
const rqOpen=()=>(S&&S.reqs||[]).filter(r=>r.status==='new');
const rqOf=(date,wh)=>(S&&S.reqs||[]).filter(r=>r.date===date&&(!wh||r.wh===wh)&&r.status!=='cancelled');
const rqCustName=id=>{const c=cust(id);return c?c.name:'?';};
function rqChip(date,wh){const l=rqOf(date,wh);if(!l.length)return '';const open=l.filter(r=>r.status==='new');
 const t=l.reduce((s,r)=>s+(+r.tons||0),0);
 return `<button type="button" class="rqchip ${open.length?'':'done'}" data-a="rqList" data-d="${date}" ${wh?`data-w="${wh}"`:''} title="${open.length?open.length+' yêu cầu đặt hàng chờ xử lý':'Yêu cầu đã xử lý'}">💬 ${open.length||l.length}${t?` · ${k1(t)} MT`:''}</button>`;}
const rqInject=(h,chip)=>chip?h.replace(/<\/div>\s*$/,chip+'</div>'):h;
{const d0=dayCell;dayCell=function(date){const h=d0(date);return rqInject(h,rqChip(date,V.whAll?null:V.wh));};}
if(typeof cAllCell==='function'){const c0=cAllCell;cAllCell=function(date){return rqInject(c0(date),rqChip(date,null));};}
// ---------- tạo yêu cầu ----------
function rqCusts(){if(role()==='customer')return [cust(me().customerId)];return S.customers.filter(c=>ownsCust(c.id)&&c.active!==false).sort((a,b)=>a.code<b.code?-1:1);}
A.rqNew=d=>{const cs=rqCusts();const day=d.d&&d.d>=TODAY?d.d:(V.day&&V.day>=TODAY?V.day:addDays(TODAY,1));
 V.modal={type:'rqNew',f:{cid:role()==='customer'?me().customerId:(d.c||''),q:'',wh:d.w||(V.whAll?(WH[0]||{}).id:V.wh),day,tons:'',body:''},err:''};
 if(role()!=='customer'&&cs.length===1){V.modal.f.cid=cs[0].id;}render();setTimeout(()=>{const el=document.getElementById(role()==='customer'?'rq-body':'rq-cust');if(el)el.focus();},50);};
function rqCap(f){const m=f.wh&&f.day?dayM(f.wh,f.day):null;if(!m)return '';if(!m.declared)return `<span class="muted small">${m.off?'Kho không bốc hàng ngày này':'Kho chưa mở lịch xe ngày này'} — CS sẽ báo lại.</span>`;
 return `<span class="small">Kho còn nhận được <b class="num">${t2(m.avail)} MT</b> ngày ${dm(f.day)}.</span>`;}
M29.rqNew=function(){const M=V.modal,f=M.f;const isC=role()==='customer';const cs=rqCusts();const c=f.cid?cust(f.cid):null;
 return `<div class="mhead"><h2>💬 YÊU CẦU ĐẶT HÀNG</h2><span class="meta">${isC?esc(c.name):'Ghi nhanh để CS tạo đơn'}</span></div>
 <div class="rqform">
  ${isC?'':`<div class="field span2"><label for="rq-cust">Khách hàng <span class="req">*</span></label><input id="rq-cust" class="inp" list="rq-cl" data-rq="q" value="${esc(c?c.code+' – '+c.name:f.q)}" placeholder="Gõ mã hoặc tên khách" autocomplete="off"><datalist id="rq-cl">${cs.map(x=>`<option value="${esc(x.code+' – '+x.name)}">`).join('')}</datalist></div>`}
  <div class="field"><label for="rq-wh">Kho <span class="req">*</span></label><select id="rq-wh" class="inp" data-rq="wh">${WH.map(w=>`<option value="${w.id}" ${w.id===f.wh?'selected':''}>${esc(w.name)}</option>`).join('')}</select></div>
  <div class="field"><label for="rq-day">Ngày bốc <span class="req">*</span></label><input id="rq-day" type="date" class="inp" min="${TODAY}" data-rq="day" value="${f.day}"></div>
  <div class="span2" id="rq-cap">${rqCap(f)}</div>
  <div class="field span2"><label for="rq-body">Nội dung <span class="req">*</span></label><textarea id="rq-body" class="inp" maxlength="2000" data-rq="body" placeholder="VD: Anh Ánh đặt 20 MT HC 0.5 Xanh dương, 30 MT Titan 0.45 Trắng sứ. Giao Bình Dương.">${esc(f.body)}</textarea>
   <span class="small muted">Ghi tự nhiên như nhắn tin: sản phẩm, màu, độ dày, khổ, số MT, nơi giao, người liên hệ.</span></div>
  <div class="field"><label for="rq-t">Tổng MT (nếu biết)</label><input id="rq-t" class="inp num" inputmode="decimal" data-rq="tons" value="${esc(f.tons)}" placeholder="VD: 50"></div>
 </div>
 ${M.err?`<div class="err" style="margin-top:10px">${esc(M.err)}</div>`:''}
 <p class="small muted" style="margin-top:8px">Yêu cầu chưa giữ chỗ trên lịch. CS ${isC?'và Sales phụ trách ':''}nhận thông báo, tạo đơn rồi báo lại cho bạn.</p>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="rqSend">Gửi yêu cầu</button></div>`;};
const rqNum=v=>{const n=parseFloat(String(v||'').replace(/\s/g,'').replace(',','.'));return isFinite(n)?n:null;};
function rqFindCust(q){q=fold30(q||'').trim();if(!q)return null;const cs=rqCusts();return cs.find(c=>fold30(c.code+' – '+c.name)===q)||cs.find(c=>fold30(c.code)===q)||(cs.filter(c=>fold30(c.code+' '+c.name).includes(q)).length===1?cs.find(c=>fold30(c.code+' '+c.name).includes(q)):null);}
document.addEventListener('input',e=>{const el=e.target;const k=el.dataset&&el.dataset.rq;if(!k||!V.modal||V.modal.type!=='rqNew')return;const f=V.modal.f;
 if(V.modal.err){V.modal.err='';const er=document.querySelector('.modal .err');if(er)er.remove();}
 if(k==='q'){f.q=el.value;const c=rqFindCust(el.value);f.cid=c?c.id:'';}else f[k]=el.value;
 if(k==='wh'||k==='day'){const cap=document.getElementById('rq-cap');if(cap)cap.innerHTML=rqCap(f);}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.rq&&V.modal&&V.modal.type==='rqNew'){V.modal.f[el.dataset.rq==='q'?'q':el.dataset.rq]=el.value;if(el.dataset.rq==='q'){const c=rqFindCust(el.value);V.modal.f.cid=c?c.id:'';}const cap=document.getElementById('rq-cap');if(cap)cap.innerHTML=rqCap(V.modal.f);}});
A.rqSend=()=>{const M=V.modal,f=M.f;M.err='';
 if(!f.cid){M.err='Chọn khách hàng trong danh sách gợi ý.';return render();}
 if(!f.day||f.day<TODAY){M.err='Chọn ngày bốc từ hôm nay trở đi.';return render();}
 if((f.body||'').trim().length<3){M.err='Ghi nội dung yêu cầu.';return render();}
 const t=rqNum(f.tons);if(f.tons&&(t==null||t<=0)){M.err='Tổng MT không hợp lệ.';return render();}
 const day=f.day,wh=f.wh;
 mutate('req_create',{p:{customerId:f.cid,wh,day,tons:t,body:f.body.trim()}},{ok:()=>{V.modal=null;render();toast('Đã gửi yêu cầu. CS sẽ xử lý và báo lại.');},err:m=>{if(V.modal)V.modal.err=m;}});};
// ---------- danh sách yêu cầu ----------
A.rqList=d=>{V.modal={type:'rqList',date:d.d||null,wh:d.w||null,act:null,reply:'',bk:'',err:'',all:!d.d};render();};
function rqCard(r,M){const b=cust(r.customerId);const mine=r.by===V.me;const act=M.act&&M.act.id===r.id?M.act.k:null;
 const acts=[];
 if(r.status==='new'){
  if(rqCanHandle()){acts.push(`<button class="btn sm" data-a="rqMake" data-id="${r.id}">Tạo đơn từ yêu cầu</button>`,`<button class="btn ghost sm" data-a="rqAct" data-id="${r.id}" data-k="done">Đã tạo đơn</button>`,`<button class="btn ghost sm" data-a="rqAct" data-id="${r.id}" data-k="declined">Không nhận</button>`);}
  if((mine||rqCanHandle())&&!S.custView)acts.push(`<button class="btn ghost sm" data-a="rqAct" data-id="${r.id}" data-k="cancelled">Hủy yêu cầu</button>`);}
 const form=act?`<div class="rqr"><div class="row" style="gap:6px;flex-wrap:wrap">${act==='done'?`<input class="inp" style="max-width:220px" placeholder="Mã booking (nếu có)" data-rqa="bk" value="${esc(M.bk)}">`:''}
   <input class="inp" style="flex:1;min-width:200px" placeholder="${act==='declined'?'Lý do không nhận (bắt buộc)':'Ghi chú cho người gửi (không bắt buộc)'}" data-rqa="reply" value="${esc(M.reply)}">
   <button class="btn sm ${act==='declined'||act==='cancelled'?'danger':''}" data-a="rqDo" data-id="${r.id}" data-k="${act}">${act==='done'?'Xác nhận đã tạo đơn':act==='declined'?'Báo không nhận':'Xác nhận hủy'}</button><button class="btn ghost sm" data-a="rqAct" data-id="">Thôi</button></div>${M.err?`<div class="err small">${esc(M.err)}</div>`:''}</div>`:'';
 return `<div class="rq st-${r.status}"><div class="rqh"><b>${esc(b?b.name:'?')}</b>${b&&role()!=='customer'?`<span class="muted small">${esc(b.code)}</span>`:''}<span class="num">${esc(r.wh)} · ${WDS[dow(r.date)]} ${dmy(r.date)}</span>${r.tons?`<b class="num">${t2(r.tons)} MT</b>`:''}<span class="grow"></span><span class="st st-${r.status==='new'?'hold':r.status==='done'?'ok':r.status==='declined'?'rejected':'cancelled'}">${RQ_ST[r.status]}</span></div>
  <div class="rqb">${esc(r.body)}</div>
  <div class="rqm">Gửi bởi ${esc(r.byName||'?')} ${r.byCust?'<span class="rqtag k">Khách</span>':'<span class="rqtag">BlueScope</span>'} · ${clockStr(r.at)}${r.handledBy?` · ${r.status==='cancelled'?'Hủy':'Xử lý'} bởi ${esc(r.handledBy)} ${clockStr(r.handledAt)}`:''}${r.bookingId?` · booking <b>${esc(r.bookingId)}</b>`:''}</div>
  ${r.reply?`<div class="rqr">↳ ${esc(r.reply)}</div>`:''}
  ${acts.length&&!act?`<div class="rqa">${acts.join('')}</div>`:''}${form}</div>`;}
M29.rqList=function(){const M=V.modal;let l=(S.reqs||[]).slice();
 if(M.date)l=l.filter(r=>r.date===M.date&&(!M.wh||r.wh===M.wh));else l=l.filter(r=>M.showAll||r.status==='new');
 l.sort((a,b)=>(a.status==='new'?0:1)-(b.status==='new'?0:1)||(a.date<b.date?-1:a.date>b.date?1:a.id-b.id));
 const title=M.date?`${M.wh?M.wh+' · ':''}${WDS[dow(M.date)]} ${dmy(M.date)}`:(M.showAll?'Tất cả yêu cầu gần đây':'Đang chờ xử lý');
 return `<div class="mhead"><h2>💬 YÊU CẦU ĐẶT HÀNG</h2><span class="meta">${title}</span></div>
 ${M.date?'':`<div class="row" style="gap:8px;margin-bottom:6px"><button class="btn ghost sm ${M.showAll?'':'on'}" data-a="rqShow" data-v="">Chờ xử lý</button><button class="btn ghost sm ${M.showAll?'on':''}" data-a="rqShow" data-v="1">Tất cả gần đây</button></div>`}
 ${l.map(r=>rqCard(r,M)).join('')||'<div class="empty">Chưa có yêu cầu nào.</div>'}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${rqCanNew()?`<button class="btn" data-a="rqNew" ${M.date?`data-d="${M.date}"`:''} ${M.wh?`data-w="${M.wh}"`:''}>+ Yêu cầu mới</button>`:''}</div>`;};
A.rqShow=d=>{V.modal.showAll=!!d.v;render();};
A.rqAct=d=>{const M=V.modal;M.act=d.id?{id:+d.id,k:d.k}:null;M.reply='';M.bk='';M.err='';render();setTimeout(()=>{const el=document.querySelector('[data-rqa="'+(d.k==='done'?'bk':'reply')+'"]');if(el)el.focus();},30);};
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.rqa;if(k&&V.modal&&V.modal.type==='rqList')V.modal[k]=e.target.value;});
A.rqDo=d=>{const M=V.modal;M.err='';if(d.k==='declined'&&(M.reply||'').trim().length<3){M.err='Ghi lý do để báo lại người gửi.';return render();}
 mutate('req_update',{p_id:+d.id,p_status:d.k,p_reply:(M.reply||'').trim()||null,p_booking:(M.bk||'').trim()||null},{ok:()=>{if(V.modal&&V.modal.type==='rqList'){V.modal.act=null;}render();toast(d.k==='done'?'Đã đánh dấu tạo đơn, người gửi được báo.':d.k==='declined'?'Đã báo không nhận.':'Đã hủy yêu cầu.');},err:m=>{if(V.modal)V.modal.err=m;}});};
// Tạo đơn: mở lưới đặt hàng điền sẵn khách / kho / ngày / MT / ghi chú; đóng lưới thì hỏi đánh dấu đã tạo đơn
A.rqMake=d=>{const r=S.reqs.find(x=>x.id===+d.id);if(!r)return;if(typeof openGrid30!=='function')return;
 const back={date:V.modal.date,wh:V.modal.wh};const keep=V.wh;V.wh=r.wh;openGrid30(r.date);V.wh=keep;const M=V.modal;M.wh=r.wh;M.req=r;M.reqBack=back;
 const c=cust(r.customerId);M.rows.forEach(x=>{x.wh=r.wh;x.day=r.date;});const r0=M.rows[0];r0.cid=r.customerId;r0.q=c?c.code:'';r0.tons=r.tons?String(r.tons).replace('.',','):'';r0.note=r.body.slice(0,500);
 V.rqPending={id:r.id,back,n:S.bookings.length};render();};
{const r0=render;render=function(){
 if(V.rqPending&&!V.modal&&S){const p=V.rqPending;V.rqPending=null;const r=(S.reqs||[]).find(x=>x.id===p.id);
  if(r&&r.status==='new'){const nb=S.bookings.filter(b=>b.customerId===r.customerId&&b.date===r.date&&b.wh===r.wh).map(b=>b.id).sort().pop()||'';
   V.modal={type:'rqList',date:p.back.date||r.date,wh:p.back.wh,act:{id:r.id,k:'done'},reply:'',bk:S.bookings.length>p.n?nb:'',err:''};}}
 r0();
 const g=document.querySelector('.modal .g30');const M=V.modal;
 if(g&&M&&M.type==='grid'&&M.req&&!g.querySelector('.g30req')){const el=document.createElement('div');el.className='g30req';el.textContent='💬 Yêu cầu của '+rqCustName(M.req.customerId)+' ('+(M.req.byName||'')+'): '+M.req.body;const h=g.querySelector('.mhead');if(h)h.after(el);}
 if(!S||V.view!=='calendar')return;const bar=document.querySelector('.main .cal36bar');if(!bar||bar.querySelector('[data-a="rqList"]'))return;
 const n=rqOpen().length;const wrap=document.createElement('span');wrap.className='row';wrap.style.gap='6px';
 wrap.innerHTML=`${rqCanNew()?`<button class="btn ghost sm rqbtn" data-a="rqNew" title="Ghi nhanh yêu cầu để CS tạo đơn">+ Yêu cầu đặt hàng</button>`:''}<button class="btn ghost sm rqbtn" data-a="rqList" title="Yêu cầu đặt hàng">💬 Yêu cầu${n?`<b>${n}</b>`:''}</button>`;
 const kb=bar.querySelector('[data-a="scHelp"]');if(kb)bar.insertBefore(wrap,kb);else{const gd=bar.querySelector('[data-a="guide"]');if(gd)bar.insertBefore(wrap,gd);else bar.appendChild(wrap);}};}
// Thông báo yêu cầu: mở thẳng danh sách yêu cầu của ngày
{const o0=A.openNotif;A.openNotif=d=>{const n=S.notifs.find(x=>String(x.id)===String(d.id));const L=n&&n.link||{};if(!L.req)return o0(d);
 if(!n.read){n.read=true;rpc('mark_notifs_read',{p_ids:[n.id]}).catch(()=>{});}
 V.view='calendar';if(L.wh&&!V.whAll)V.wh=L.wh;V.modal={type:'rqList',date:L.day,wh:null,act:null,reply:'',bk:'',err:''};afterNav(goMonth(L.day));};}
