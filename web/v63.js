// v3.50: Đặt hàng theo NGÀY GIAO. CS / Sales / khách chọn ngày hàng tới tay khách; hệ thống tính ngày bốc cho Logistics
// = ngày giao − số ngày xe chạy (theo Zone của khu vực, hoặc số ngày riêng của khu vực), rơi vào ngày nghỉ chưa khai báo xe thì lùi tiếp.
// Máy chủ (save_booking, bulk_create_bookings) là nơi quyết định; ở đây chỉ tính lại để hiển thị.
// Gồm: Cấu hình › Vận chuyển (Zone, Vùng giao, nạp / xuất Excel, đơn lệch), form + lưới Đặt hàng theo ngày giao,
// lịch xem theo Ngày giao / Ngày bốc, cột Ngày giao, Logistics đổi ngày bốc sớm hơn.
(()=>{const st=document.createElement('style');st.textContent=`
.ld63{display:block;margin-top:4px;font-size:12px;color:var(--muted)}.ld63 b{color:var(--ink)}
.ld63.late{color:var(--bad)}
.urg63{display:flex;align-items:center;gap:6px;margin-top:6px;padding:6px 8px;border-radius:8px;background:var(--note-bg);border:1px solid var(--note-line);font-size:13px}
.g30 .g63{display:block;font-size:12px;color:var(--muted);white-space:nowrap}
.g30 .g63u{margin-left:4px;min-height:28px;padding:2px 8px}
.g30 .g63u[aria-pressed="true"]{background:var(--bad);color:var(--surface);border-color:var(--bad)}
.calmode63{display:inline-flex;align-items:center;gap:6px}
.calmode63 select{min-height:34px}
.tr63 h3{margin:18px 0 6px;font-size:14px;letter-spacing:.04em}
.tr63 .inp.sm{min-height:34px;padding:4px 8px}
.tr63 td .inp{width:100%}
.tr63 .ztag{display:inline-block;padding:1px 8px;border-radius:999px;background:var(--sand);font-size:12px}
.tr63 .drift li{margin:4px 0}
.pitem .dl63{font-weight:700;color:var(--ink)}
`;document.head.appendChild(st);})();

const DELIV63=()=>!!(S&&S.cfg&&(S.cfg.deliveryMode===true||S.cfg.deliveryMode==='true'));
const isLog63=()=>['logistics','admin'].includes(role());
{const a0=adopt;adopt=function(st){const s=a0(st);s.zones=(st.zones||[]).map(z=>({...z,days:+z.days}));return s;};}
const zonesOf63=wh=>(S.zones||[]).filter(z=>z.wh===wh);
const zone63=(wh,code)=>(S.zones||[]).find(z=>z.wh===wh&&z.code===code);
const rgDays63=id=>{const r=id&&id!=='NONE'?reg(id):null;return r?+r.days:null;};
const dmw63=d=>d?`${WDS[dow(d)]} ${dm(d)}`:'–';
// ngày bốc gợi ý (giống app.calc_load_day ở máy chủ)
function ld63(wh,rid,dl,days){if(!dl)return '';const n=days!=null?days:rgDays63(rid);if(n==null)return '';let d=addDays(dl,-n),k=0;
 while(k<14&&isHoliday(wh,d)&&!(S.fleet[wh]||{})[d]){d=addDays(d,-1);k++;}return d;}
// đoán khu vực từ địa chỉ (giống app.guess_region)
const RGN63=s=>' '+fold30(String(s||'')).replace(/\b(tp\.?\s*hcm|tphcm|hcm|sai gon)\b/g,'ho chi minh').replace(/\b(thanh pho|tinh|tp)\.?\s+/g,'').replace(/[.,;:\/()–—_-]/g,' ').replace(/\s+/g,' ').trim()+' ';
function guess63(wh,text,prov){
 for(const t of [text,prov]){if(!t||!String(t).trim())continue;const a=RGN63(t);let best=null,bl=0;
  for(const r of regionsOf(wh))for(const k of [r.name,...String(r.aliases||'').split(';')]){const n=RGN63(k);if(n.trim().length>=2&&a.includes(n)&&n.length>bl){best=r.id;bl=n.length;}}
  if(best)return best;}
 const c=regionsOf(wh).filter(r=>RGN63(r.newProvince)===RGN63(prov));return c.length===1?c[0].id:null;}
// khu vực của một địa chỉ khách (đã lưu → đoán); không có địa chỉ thì lấy địa chỉ đầu tiên của khách
function rgAddr63(wh,a){if(!a)return null;return (a.regions&&a.regions[wh])||guess63(wh,[a.label,a.ward].filter(Boolean).join(', '),a.province);}
function rgCust63(wh,cid,addrId,text){const c=cid?cust(cid):null;if(!c)return null;
 if(addrId&&addrId!=='new'){const a=c.addresses.find(x=>x.id===addrId);if(a)return rgAddr63(wh,a);}
 if(text&&String(text).trim())return guess63(wh,text,'');
 return rgAddr63(wh,c.addresses[0]);}
function rgInfo63(wh,rid){const r=rid?reg(rid):null;if(!r)return '';const z=zone63(wh,r.zone);return `${esc(r.name)}${z?' · '+esc(z.name):''} · đi ${r.days} ngày`;}

/* ===================== Form Đặt / Sửa booking ===================== */
// f.delivery = ngày giao người dùng chọn; f.date = ngày bốc (tự tính; Logistics / Admin được chọn sớm hơn)
function bfSync63(M){const f=M.f;
 if(M._d0===undefined){M._d0=f.delivery||'';M._r0=f.region||'';M._day0=f.date||'';}
 const rid=f.region&&f.region!=='NONE'?f.region:(f.addrId==='new'?guess63(f.wh,[f.addrText,f.ward].filter(Boolean).join(', '),f.province):rgCust63(f.wh,f.customerId,f.addrId,''));
 const calc=f.delivery&&rid?ld63(f.wh,rid,f.delivery):'';
 M.l63={rid,calc,late:!!calc&&calc<TODAY};
 const same=M.id&&f.delivery===M._d0&&(f.region||'')===M._r0&&M._day0>=TODAY;
 const touched=isLog63()&&f.date&&M._set!==undefined&&f.date!==M._set;
 if(same&&!touched){f.date=M._day0;}
 else if(touched&&calc&&f.date<=calc&&f.date>=TODAY){/* Logistics chọn ngày bốc sớm hơn */}
 else if(!calc){f.date='';}
 else f.date=M.l63.late?(f.urg63?TODAY:calc):calc;
 M._set=f.date;}
{const m0=mBF;mBF=function(){const M=V.modal;if(!DELIV63())return m0();const f=M.f;bfSync63(M);const L=M.l63;
 let h=m0();
 const info=!f.delivery?'Chọn ngày hàng tới tay khách.':!L.rid?'<span class="late">Chưa xác định được khu vực của địa chỉ giao: chọn địa chỉ hoặc khu vực để tính ngày bốc.</span>':
  L.late?`Theo lịch thường phải bốc <b>${dmw63(L.calc)}</b> (đã qua). Sớm nhất giao được <b>${dmw63(addDays(TODAY,rgDays63(L.rid)||0))}</b>.`:
  `Kho bốc <b>${dmw63(f.date)}</b>${f.date!==L.calc?` (gợi ý ${dmw63(L.calc)})`:''} · ${rgInfo63(f.wh,L.rid)}`;
 const dl=`<div class="field"><label for="bf-del">Ngày giao <span class="req">*</span></label><input id="bf-del" type="date" class="inp" min="${TODAY}" value="${f.delivery||''}" data-f="bf" data-k="delivery"><span class="ld63 ${L.late?'late':''}">${info}</span>
  ${L.late?`<label class="urg63"><input type="checkbox" data-f="bfc" data-k="urg63" ${f.urg63?'checked':''}> Đơn khẩn: bốc ngay hôm nay</label>`:''}</div>`;
 const ld=isLog63()&&L.calc&&!L.late?`<div class="field"><label for="bf-date">Ngày bốc <span class="small muted">(chỉ chọn sớm hơn gợi ý)</span></label><input id="bf-date" type="date" class="inp" min="${TODAY}" max="${L.calc}" value="${f.date}" data-f="bf" data-k="date"></div>`:'';
 h=h.replace(/<div class="field"><label for="bf-date">[\s\S]*?<\/div>/,dl).replace(/<div class="field"><label for="bf-del">Ngày giao yêu cầu<\/label>[\s\S]*?<\/div>/,ld)
  .replace(/<span class="meta">Ngày: [^<]*<\/span>/,`<span class="meta">Giao: ${f.delivery?dmy(f.delivery):'–'}${f.date?' · bốc '+dmy(f.date):''}</span>`)
  .replace('SỨC CHỨA CÒN LẠI NGÀY','SỨC CHỨA CÒN LẠI NGÀY BỐC');
 return h;};}
// ô Ngày giao đổi → vẽ lại để tính ngày bốc (bộ xử lý chung chỉ vẽ lại với một số ô)
document.addEventListener('change',e=>{const el=e.target;if(!el.dataset||!V.modal||V.modal.type!=='bf'||!DELIV63())return;
 if(el.dataset.f==='bf'&&el.dataset.k==='delivery'){V.modal.f.delivery=el.value;render();}
 if(el.dataset.f==='bfc'&&el.dataset.k==='urg63'){V.modal.f.urg63=el.checked;render();}});
{const s0=saveBF;saveBF=function(kind){const M=V.modal;if(!DELIV63()||!M||M.type!=='bf')return s0(kind);const f=M.f;bfSync63(M);const L=M.l63;
 if(!f.customerId||!f.delivery){M.err='Chọn khách hàng và ngày giao.';return render();}
 if(f.delivery<TODAY){M.err='Ngày giao đã qua.';return render();}
 if(!L.rid&&kind==='hold'){M.err='Chưa xác định được khu vực (Zone) của địa chỉ giao nên chưa tính được ngày bốc. Chọn địa chỉ giao hoặc khu vực.';return render();}
 if(L.late&&!f.urg63){M.err=`Không kịp giao ngày ${dm(f.delivery)}: phải bốc ${dm(L.calc)} (đã qua). Chọn ngày giao từ ${dm(addDays(TODAY,rgDays63(L.rid)||0))} hoặc tích Đơn khẩn.`;return render();}
 if(!f.date)f.date=f.delivery; // nháp chưa có khu vực
 const sendDay=isLog63()&&f.date!==L.calc&&!(L.late&&f.urg63);const mu=mutate;
 mutate=function(fn,args,opts){mutate=mu;if(fn==='save_booking'&&args&&args.p){args.p.urgent=!!(L.late&&f.urg63);if(!sendDay)delete args.p.day;}return mu(fn,args,opts);};
 try{return s0(kind);}finally{mutate=mu;}};}
// form mới mở từ một ngày trên lịch: ngày đó là ngày giao
{const b0=bfNew;bfNew=function(date,src){const M=b0(date,src);if(DELIV63()&&!src){M.f.delivery=date&&date>=TODAY?date:'';M.f.date='';}return M;};}
// đề nghị đổi ngày (ngày bốc mới) → ngày giao mới = ngày bốc + số ngày đi; đặt lại / giao lại: chọn ngày giao mới
{const e0=A.editBk;A.editBk=d=>{e0(d);const M=V.modal;if(!DELIV63()||!M||M.type!=='bf')return;const b=bkById(d.id);
 if(b.status==='resched'&&b.proposedDate){M._d0=b.delivery;M._r0=M.f.region||'';M._day0=b.date;const n=rgDays63(b.region)||0;M.f.delivery=addDays(b.proposedDate,n);render();}};}
['rebookBk','v9Redeliver'].forEach(k=>{const o=A[k];if(!o)return;A[k]=d=>{o(d);const M=V.modal;if(DELIV63()&&M&&M.type==='bf'){M.f.delivery='';M._d0=null;render();}};});
{const o=A.bfDate;A.bfDate=d=>{const M=V.modal;if(!DELIV63()||!M||!M.l63||!M.l63.rid)return o(d);M.f.delivery=addDays(d.d,rgDays63(M.l63.rid)||0);render();};}

/* ===================== Lưới Đặt hàng ===================== */
// r.day trong lưới = NGÀY GIAO; tính ngày bốc từng dòng rồi mới kiểm tra năng lực
function gridLd63(M,r){const c=r.cid?cust(r.cid):null;if(!c||!r.day)return null;
 const rid=r.addrId?rgCust63(r.wh,r.cid,r.addrId,''):rgCust63(r.wh,r.cid,'',r.addr);const calc=rid?ld63(r.wh,rid,r.day):'';
 const late=!!calc&&calc<TODAY;return{rid,calc,late,day:late?(r.urg?TODAY:''):calc};}
{const g0=gridCheck30;gridCheck30=function(M){if(!DELIV63())return g0(M);
 const L=M.rows.map(r=>gridLd63(M,r));
 const C=g0({...M,rows:M.rows.map((r,i)=>L[i]&&L[i].day?{...r,day:L[i].day}:(L[i]&&!L[i].rid&&M.mode==='draft'?r:{...r,day:L[i]?'':r.day}))});
 C.rows.forEach((x,i)=>{if(x.blank)return;const r=M.rows[i],l=L[i];x.l63=l;
  if(r.day&&r.day<TODAY){x.err='Ngày giao đã qua';return;}
  if(!r.day){x.err='Thiếu ngày giao';return;}
  if(l&&l.late&&!r.urg){x.err='Không kịp giao';return;}
  if(l&&!l.rid&&M.mode!=='draft')x.err='Chưa rõ khu vực – nhập địa chỉ';
  if(l&&l.late&&!r.urg)x.err='Không kịp giao';
 });
 return C;};}
function gridDecor63(){const M=V.modal;if(!DELIV63()||!M||M.type!=='grid'||M.ask)return;const C=gridCheck30(M);
 C.rows.forEach((x,i)=>{const s=document.getElementById('g30s-'+i);if(!s||x.blank||!x.l63)return;const l=x.l63,r=M.rows[i];
  if(l.calc&&!s.querySelector('.g63')){const sp=document.createElement('span');sp.className='g63';sp.textContent=l.late?(r.urg?'bốc hôm nay (khẩn)':`phải bốc ${dm(l.calc)} – sớm nhất giao ${dm(addDays(TODAY,rgDays63(l.rid)||0))}`):`bốc ${dmw63(l.day)}`;s.appendChild(sp);}
  if(l.late&&!s.querySelector('.g63u')){const b=document.createElement('button');b.type='button';b.className='btn ghost sm g63u';b.dataset.a='g63urg';b.dataset.i=i;b.setAttribute('aria-pressed',r.urg?'true':'false');b.textContent='Khẩn';b.title='Đơn khẩn: bốc ngay hôm nay';s.appendChild(b);}});
 const cap=document.querySelector('.g30cap .small.muted');if(cap)cap.textContent='Năng lực theo kho · ngày BỐC (tính từ ngày giao)';}
{const m0=mGrid30;mGrid30=function(){const h=m0();return DELIV63()?h.replace(/Ngày bốc/g,'Ngày giao'):h;};if(M29.grid===m0)M29.grid=mGrid30;}
{const f0=refresh30;refresh30=function(){f0();gridDecor63();};}
{const r0=render;render=function(){r0();if(S&&V.modal&&V.modal.type==='grid')gridDecor63();};}
A.g63urg=d=>{const M=V.modal;const r=M&&M.rows[+d.i];if(!r)return;r.urg=!r.urg;refresh30();};
{const s0=submit30;submit30=function(M){if(!DELIV63())return s0(M);const mu=mutate;
 mutate=function(fn,args,opts){mutate=mu;if(fn==='bulk_create_bookings'&&args&&Array.isArray(args.p_rows)){
   const idx=M.rows.map((r,i)=>i).filter(i=>{const r=M.rows[i];return !(!r.cid&&!r.q.trim()&&!String(r.tons).trim());});
   args.p_rows=args.p_rows.map((x,k)=>{const r=M.rows[idx[k]]||{};const y={...x,delivery:x.day,urgent:!!r.urg};delete y.day;return y;});}
  return mu(fn,args,opts);};
 try{return s0(M);}finally{mutate=mu;}};}

/* ===================== Yêu cầu đặt hàng: ngày bốc dự kiến theo Zone ===================== */
{const q0=rqCap;rqCap=function(f){if(!DELIV63()||!f.wh||!f.day||!f.cid)return q0(f);const rid=rgCust63(f.wh,f.cid,'','');if(!rid)return q0(f);
 let ld=ld63(f.wh,rid,f.day);if(ld<TODAY)ld=TODAY;const m=dayM(f.wh,ld);
 const head=`<span class="small">Kho bốc dự kiến <b>${dmw63(ld)}</b> (${rgInfo63(f.wh,rid)}). </span>`;
 if(!m||!m.declared)return head+`<span class="muted small">${m&&m.off?'Kho không bốc hàng ngày này':'Kho chưa mở lịch xe ngày này'} — CS sẽ chọn ngày bốc phù hợp.</span>`;
 return head+`<span class="small">Ngày đó kho còn nhận được <b class="num">${t2(m.avail)} MT</b>.</span>`;};}

/* ===================== Lịch: xem theo Ngày giao / Ngày bốc ===================== */
// Ngày giao: mỗi ô là ngày hàng tới khách; năng lực hiển thị = năng lực của ngày bốc tương ứng với Zone đang chọn
const calDeliv63=()=>DELIV63()&&(role()==='customer'||(V.cal63||(isLog63()?'boc':'giao'))==='giao');
function zoneSel63(wh){const zs=zonesOf63(wh).filter(z=>z.active!==false);V.z63=V.z63||{};
 if(!zs.some(z=>z.code===V.z63[wh]))V.z63[wh]=(zs.slice().sort((a,b)=>a.days-b.days)[0]||{}).code;return zone63(wh,V.z63[wh]);}
function custZone63(wh){const c=cust(me().customerId);const rid=c?rgAddr63(wh,c.addresses[0]):null;const r=rid?reg(rid):null;return r?{days:+r.days,code:r.zone}:null;}
function calLd63(wh,date){if(role()==='customer'){const z=custZone63(wh);return z?ld63(wh,null,date,z.days):date;}const z=zoneSel63(wh);return z?ld63(wh,null,date,z.days):date;}
{const vc0=vCalendar;vCalendar=function(){if(!calDeliv63())return vc0();
 const real=S.bookings,dm0=dayM;
 S.bookings=real.map(b=>b.delivery&&b.delivery!==b.date?{...b,date:b.delivery,_ld63:b.date}:b);
 dayM=function(wh,date){const sv=S.bookings;S.bookings=real;try{return dm0(wh,calLd63(wh,date));}finally{S.bookings=sv;}};
 try{return vc0();}finally{S.bookings=real;dayM=dm0;}};}
// bấm ô ngày ở chế độ Ngày giao → Chi tiết ngày mở ngày bốc tương ứng
['openDay','openDayWh'].forEach(k=>{const o=A[k];if(!o)return;A[k]=(d,el,e)=>{if(V.view==='calendar'&&calDeliv63()&&d&&d.d&&role()!=='customer'){const wh=d.w||V.wh;const ld=calLd63(wh,d.d);
  if(ld&&ld!==d.d){const z=zoneSel63(wh);toast(`Giao ${dm(d.d)}${z?' ('+z.name+')':''} → ngày bốc ${dmw63(ld)}`);return o({...d,d:ld},el,e);}}return o(d,el,e);};});
A.cal63=d=>{V.cal63=d.m;render();};
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.a63==='zone'){V.z63=V.z63||{};V.z63[V.whAll?'__':V.wh]=el.value;if(!V.whAll)V.z63[V.wh]=el.value;else WH.forEach(w=>{if(zonesOf63(w.id).some(z=>z.code===el.value))V.z63[w.id]=el.value;});render();}});
{const r0=render;render=function(){r0();if(!S||V.view!=='calendar'||!DELIV63()||role()==='customer'||V.modal)return;const bar=document.querySelector('.cal36bar');if(!bar||bar.querySelector('.calmode63'))return;
 const mode=V.cal63||(isLog63()?'boc':'giao');const wh=V.whAll?(WH[0]||{}).id:V.wh;const z=mode==='giao'?zoneSel63(wh):null;
 const box=document.createElement('span');box.className='calmode63';
 box.innerHTML=`<span class="seg36" role="group" aria-label="Xem lịch theo"><button type="button" data-a="cal63" data-m="giao" class="${mode==='giao'?'on':''}" aria-pressed="${mode==='giao'}" title="Ô lịch là ngày hàng tới khách">Ngày giao</button><button type="button" data-a="cal63" data-m="boc" class="${mode==='boc'?'on':''}" aria-pressed="${mode==='boc'}" title="Ô lịch là ngày kho bốc hàng">Ngày bốc</button></span>`+
  (mode==='giao'?`<select class="inp" data-a63="zone" aria-label="Năng lực theo Zone" title="Năng lực của ô = năng lực ngày bốc của Zone này">${zonesOf63(wh).filter(x=>x.active!==false).map(x=>`<option value="${esc(x.code)}" ${z&&z.code===x.code?'selected':''}>${esc(x.name)} · ${x.days} ngày</option>`).join('')}</select>`:'');
 bar.insertBefore(box,bar.firstChild);};}
// NAV_SAFE: đổi chế độ xem chỉ là điều hướng
if(typeof NAV_SAFE!=='undefined')NAV_SAFE.add('cal63');

/* ===================== Danh sách: cột Ngày giao ===================== */
const dlOf63=id=>{const b=bkById(id)||((V.blData&&V.blData.rows)||[]).find(x=>x.id===id);return b&&b.delivery?dmy(b.delivery):'–';};
{const v0=vBookings;vBookings=function(){const h=v0();if(!DELIV63())return h;
 return h.replace('<th>Mã booking</th><th>Ngày bốc</th>','<th>Mã booking</th><th>Ngày giao</th><th>Ngày bốc</th>')
  .replace(/(data-a="openBkAny" data-id="([^"]+)"[^>]*><td>[^<]*<\/td>)/g,(m0,a,id)=>a+`<td class="num">${dlOf63(id)}</td>`).replace(/colspan="11"/g,'colspan="12"');};}
{const v0=vApprovals;vApprovals=function(){const h=v0();if(!DELIV63())return h;
 return h.replace('<th>Ngày bốc</th><th>Kho</th>','<th>Ngày bốc</th><th>Giao</th><th>Kho</th>')
  .replace(/(data-a="openBk" data-id="([^"]+)"><td class="num">[^<]*<\/td>)/g,(m0,a,id)=>a+`<td class="num">${dlOf63(id)}</td>`);};}
// Chi tiết ngày: đơn chờ ghi ngày giao + nút đổi ngày bốc sớm hơn
{const p0=pendItem;pendItem=function(b,past){let h=p0(b,past);if(!DELIV63()||!b.delivery)return h;
 h=h.replace(`<div class="small muted">${b.id} · `,`<div class="small muted">${b.id} · <span class="dl63">Giao ${dmw63(b.delivery)}</span> · `);
 if(!past&&can('alloc.assign')&&b.status==='hold')h=h.replace(/<\/div>\s*$/,`<div class="row" style="gap:6px;margin-top:4px"><button type="button" class="linkbtn small" data-a="ld63Open" data-id="${b.id}">Đổi ngày bốc</button></div></div>`);
 return h;};}
// Chi tiết booking: "Ngày giao YC" → "Ngày giao", thêm ngày bốc gợi ý; Logistics đổi ngày bốc sớm hơn
{const r0=render;render=function(){r0();if(!S||!DELIV63()||V.view!=='booking'||!V.bk)return;const b=bkById(V.bk);if(!b)return;
 document.querySelectorAll('.main dl.dl dt').forEach(dt=>{if(dt.textContent==='Ngày giao YC'){dt.textContent='Ngày giao';const dd=dt.nextElementSibling;const calc=ld63(b.wh,b.region,b.delivery);
  if(dd&&calc&&calc!==b.date&&!dd.querySelector('.ld63'))dd.insertAdjacentHTML('beforeend',` <span class="ld63" style="display:inline">· ngày bốc gợi ý ${dmy(calc)}</span>`);}});
 const h=document.querySelector('.main .pagehead');if(h&&b.status==='hold'&&can('alloc.assign')&&b.date>=TODAY&&!h.querySelector('[data-a="ld63Open"]')){const x=document.createElement('button');x.className='btn ghost';x.dataset.a='ld63Open';x.dataset.id=b.id;x.textContent='Đổi ngày bốc';h.appendChild(x);}};}
A.ld63Open=d=>{const b=bkById(d.id);if(!b)return;const calc=ld63(b.wh,b.region,b.delivery)||b.date;V.modal={type:'ld63',id:b.id,day:b.date<calc?b.date:calc,calc,note:'',err:''};render();};
M29.ld63=function(){const M=V.modal,b=bkById(M.id);if(!b)return '';
 const days=[...Array(8)].map((_,i)=>addDays(M.calc,-i)).filter(d=>d>=TODAY);
 return `<div class="mhead"><h2>ĐỔI NGÀY BỐC ${esc(b.id)}</h2><span class="meta">${esc(cust(b.customerId).name)} · giao ${dmw63(b.delivery)}</span></div>
 <p class="small muted" style="margin-top:0">Ngày giao giữ nguyên. Chỉ chọn được từ hôm nay đến ngày gợi ý <b>${dmw63(M.calc)}</b>; muốn dời muộn hơn thì dùng Đề nghị đổi ngày.</p>
 <div class="tbl-wrap"><table><thead><tr><th>Ngày bốc</th><th class="r">Còn đặt được</th><th></th></tr></thead><tbody>
 ${days.map(d=>{const m=dayM(b.wh,d);const own=d===b.date?r2(bkTotal(b)-allocSum(b.id)):0;return `<tr><td>${dmw63(d)}${d===M.calc?' <span class="chip">gợi ý</span>':''}${d===b.date?' <span class="chip">hiện tại</span>':''}</td><td class="r num">${m.declared?t2(m.avail+own)+' MT':'chưa khai báo xe'}</td><td>${d!==b.date&&m.declared?`<button class="btn sm ${M.day===d?'':'ghost'}" data-a="ld63Pick" data-d="${d}" aria-pressed="${M.day===d}">Chọn</button>`:''}</td></tr>`;}).join('')}
 </tbody></table></div>
 <div class="field" style="margin-top:8px"><label for="ld63-n">Ghi chú</label><input id="ld63-n" class="inp" data-ld63n="1" value="${esc(M.note)}" placeholder="vd. còn xe trống"></div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="ld63Save" ${M.day===b.date?'disabled':''}>Đổi sang ${dmw63(M.day)}</button></div>`;};
A.ld63Pick=d=>{V.modal.day=d.d;render();};
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.ld63n&&V.modal)V.modal.note=e.target.value;});
A.ld63Save=()=>{const M=V.modal;mutate('set_load_day',{p_id:M.id,p_day:M.day,p_note:M.note||''},{err:m=>{M.err=m;render();},ok:()=>{V.modal=null;toast(`Đã đổi ngày bốc ${M.id} sang ${dm(M.day)}`);}});};

/* ===================== Cấu hình › Vận chuyển ===================== */
{const vc0=vConfig;vConfig=function(){const ok=can('config.transport');
 if(V.cfgTab!=='tr63'||!ok){const h=vc0();if(!ok)return h;return h.replace(/(<div class="tabs">[\s\S]*?)(<\/div>)/,(m0,a,b)=>a+`<button class="" data-a="cfgTab" data-t="tr63">Vận chuyển</button>`+b);}
 V.cfgTab='general';let h;try{h=vc0();}finally{V.cfgTab='tr63';}
 const ti=h.indexOf('<div class="tabs">');const te=h.indexOf('</div>',ti)+6;
 const tabs=h.slice(ti,te).replace(/class="on"/g,'class=""').replace(/<\/div>$/,`<button class="on" data-a="cfgTab" data-t="tr63">Vận chuyển</button></div>`);
 return h.slice(0,ti)+tabs+trBody63()+'</div>';};}
function trBody63(){const wh=V.wh;const zs=zonesOf63(wh);const rs=S.regions.filter(r=>r.wh===wh).sort((a,b)=>(a.zone||'~').localeCompare(b.zone||'~')||a.name.localeCompare(b.name,'vi'));
 const zName=c=>{const z=zone63(wh,c);return z?z.name:'';};
 const zOpts=cur=>`<option value="">— chưa gắn —</option>`+zs.map(z=>`<option value="${esc(z.code)}" ${cur===z.code?'selected':''}>${esc(z.name)} (${z.days} ngày)</option>`).join('');
 const D=V.dr63;
 return `<div class="tr63">
 <div class="row" style="margin-bottom:6px;gap:10px;flex-wrap:wrap"><label class="whsel"><span>Kho:</span><select data-a="wh" aria-label="Chọn kho">${WH.map(w=>`<option value="${w.id}" ${w.id===wh?'selected':''}>${w.name}</option>`).join('')}</select></label>
  <span class="grow"></span><button class="btn ghost sm" data-a="tr63Export">Tải Excel</button><label class="btn ghost sm" style="cursor:pointer">Nạp Excel<input type="file" accept=".xlsx,.xls" data-tr63file="1" hidden></label></div>
 ${role()==='admin'?`<label class="row small"><input type="checkbox" data-f="cfgb" data-k="deliveryMode" ${DELIV63()?'checked':''}> CS, Sales, khách đặt theo <b>ngày giao</b>; hệ thống tính ngày bốc cho Logistics</label>`:''}
 <p class="small muted">Ngày bốc gợi ý = ngày giao − số ngày đi (tính cả Chủ nhật). Rơi vào ngày kho nghỉ chưa khai báo xe thì lùi thêm. Sửa ở đây áp dụng cho đơn mới; đơn đã có giữ nguyên ngày bốc.</p>
 <h3>NGÀY VẬN CHUYỂN (ZONE)</h3>
 <div class="tbl-wrap"><table><thead><tr><th>Zone</th><th class="r" style="width:120px">Số ngày đi</th><th class="r">Khu vực</th><th>Trạng thái</th><th></th></tr></thead><tbody>
 ${zs.map(z=>`<tr><td><input class="inp sm" data-z63n="${esc(z.code)}" value="${esc(z.name)}" aria-label="Tên Zone ${esc(z.name)}"></td><td><input class="inp sm num" inputmode="numeric" data-z63d="${esc(z.code)}" value="${z.days}" aria-label="Số ngày đi ${esc(z.name)}"></td>
  <td class="r num">${rs.filter(r=>r.zone===z.code&&r.active).length}</td><td>${z.active!==false?'Đang dùng':'<span class="muted">Ngừng dùng</span>'}</td>
  <td style="white-space:nowrap"><button class="btn sm" data-a="z63Save" data-c="${esc(z.code)}">Lưu</button> <button class="btn ghost sm" data-a="z63Toggle" data-c="${esc(z.code)}">${z.active!==false?'Ngừng dùng':'Dùng lại'}</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Kho chưa có Zone.</td></tr>'}
 <tr><td><input class="inp sm" data-z63n="__new" placeholder="Zone mới, vd. Highland" aria-label="Tên Zone mới"></td><td><input class="inp sm num" inputmode="numeric" data-z63d="__new" placeholder="1" aria-label="Số ngày đi Zone mới"></td><td colspan="2"></td><td><button class="btn ghost sm" data-a="z63Save" data-c="__new">Thêm Zone</button></td></tr>
 </tbody></table></div>
 <h3>VÙNG GIAO (KHU VỰC → ZONE)</h3>
 <p class="small muted" style="margin:0 0 6px">Số ngày riêng: để trống = theo Zone; chỉ điền cho tỉnh ngoại lệ (vd. Hà Giang 2 ngày). Tên gọi khác: cách nhau dấu ; (tên tỉnh cũ, thành phố, viết tắt có trong địa chỉ).</p>
 <div class="tbl-wrap"><table><thead><tr><th>Khu vực (tỉnh)</th><th>Tỉnh mới</th><th>Zone</th><th class="r" style="width:110px">Số ngày riêng</th><th class="r">Đi (ngày)</th><th>Tên gọi khác</th><th></th></tr></thead><tbody>
 ${rs.map(r=>`<tr class="${r.active?'':'muted'}"><td><b>${esc(r.name)}</b>${r.active?'':' <span class="small">(ngừng dùng)</span>'}</td><td>${esc(r.newProvince)}</td>
  <td><select class="inp sm" data-r63z="${r.id}" aria-label="Zone của ${esc(r.name)}">${zOpts(r.zone||'')}</select></td>
  <td><input class="inp sm num" inputmode="numeric" data-r63d="${r.id}" value="${r.daysOwn!=null?r.daysOwn:''}" placeholder="${r.zone&&zone63(wh,r.zone)?zone63(wh,r.zone).days:''}" aria-label="Số ngày riêng ${esc(r.name)}"></td>
  <td class="r num"><b>${r.days}</b></td>
  <td><input class="inp sm" data-r63a="${r.id}" value="${esc(r.aliases||'')}" aria-label="Tên gọi khác ${esc(r.name)}"></td>
  <td><button class="btn sm" data-a="r63Save" data-id="${r.id}">Lưu</button></td></tr>`).join('')}
 </tbody></table></div>
 ${rs.filter(r=>r.active&&!r.zone).length?`<div class="hint" style="margin-top:8px"><b>${rs.filter(r=>r.active&&!r.zone).length} khu vực chưa gắn Zone:</b> ${rs.filter(r=>r.active&&!r.zone).map(r=>esc(r.name)).join(', ')}. Đơn tới các khu vực này dùng số ngày đi riêng của khu vực.</div>`:''}
 <h3>ĐƠN BỐC MUỘN HƠN NGÀY GỢI Ý</h3>
 <p class="small muted" style="margin:0 0 6px">Sau khi tăng số ngày đi, các đơn đã đặt có thể bốc quá muộn để kịp ngày giao. Hệ thống chỉ liệt kê, không tự đổi.</p>
 <button class="btn ghost sm" data-a="tr63Drift">Kiểm tra</button>
 ${D?D.err?`<div class="err">${esc(D.err)}</div>`:D.list.length?`<ul class="drift small">${D.list.map(x=>`<li><button class="linkbtn" data-a="openBk" data-id="${esc(x.id)}">${esc(x.id)}</button> · ${esc(x.cust)} · ${esc(x.wh)} · ${esc(x.region)} · giao ${dmw63(x.delivery)}: đang bốc <b>${dmw63(x.day)}</b>, gợi ý <b>${dmw63(x.calc)}</b></li>`).join('')}</ul>`:'<p class="small">Không có đơn nào bốc muộn hơn ngày gợi ý.</p>':''}
 </div>`;}
const val63=sel=>{const el=document.querySelector(sel);return el?el.value:'';};
A.z63Save=d=>{const c=d.c,wh=V.wh;const name=val63(`[data-z63n="${c}"]`).trim();const days=Math.round(num(val63(`[data-z63d="${c}"]`)));
 if(!name)return toast('Nhập tên Zone.');if(!(days>=0&&days<=30))return toast('Số ngày đi từ 0 đến 30.');
 mutate('save_zone',{p_wh:wh,p_code:c==='__new'?null:c,p_name:name,p_days:days,p_active:null},{ok:()=>toast(c==='__new'?'Đã thêm Zone '+name:'Đã lưu Zone '+name)});};
A.z63Toggle=d=>{const z=zone63(V.wh,d.c);if(!z)return;mutate('save_zone',{p_wh:V.wh,p_code:z.code,p_name:z.name,p_days:z.days,p_active:z.active===false},{ok:()=>toast(z.active===false?'Đã dùng lại '+z.name:'Đã ngừng dùng '+z.name)});};
A.r63Save=d=>{const id=d.id;const dv=val63(`[data-r63d="${id}"]`).trim();const days=dv===''?null:Math.round(num(dv));
 if(days!=null&&!(days>=0&&days<=30))return toast('Số ngày riêng từ 0 đến 30 (để trống = theo Zone).');
 mutate('save_region_transport',{p_id:id,p_zone:val63(`[data-r63z="${id}"]`)||null,p_days_own:days,p_aliases:val63(`[data-r63a="${id}"]`)},{ok:()=>toast('Đã lưu '+regName(id))});};
A.tr63Drift=()=>{rpc('transport_drift',{}).then(list=>{V.dr63={list:list||[]};render();}).catch(e=>{V.dr63={err:e.message||String(e),list:[]};render();});};
// ---- Excel ----
const TR63_H={zones:['Kho','Zone','Số ngày vận chuyển'],regions:['Kho','Khu vực (tỉnh)','Zone','Số ngày riêng (trống = theo Zone)','Tên gọi khác (cách nhau ;)','Tỉnh mới']};
A.tr63Export=()=>{if(typeof XLSX==='undefined')return toast('Chưa tải được thư viện Excel, thử lại sau vài giây.');const wb=XLSX.utils.book_new();
 const zr=[TR63_H.zones,...(S.zones||[]).map(z=>[z.wh,z.name,z.days])];
 const rr=[TR63_H.regions,...S.regions.filter(r=>r.active).sort((a,b)=>a.wh.localeCompare(b.wh)||a.name.localeCompare(b.name,'vi')).map(r=>[r.wh,r.name,(zone63(r.wh,r.zone)||{}).name||'',r.daysOwn!=null?r.daysOwn:'',r.aliases||'',r.newProvince])];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(zr),'Ngày vận chuyển');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rr),'Vùng giao');
 XLSX.writeFile(wb,'van-chuyen-'+TODAY+'.xlsx');};
// đọc một sheet thành dòng {wh, zone, days, name, aliases, province} theo tên cột
function trRows63(aoa){if(!aoa.length)return null;const H=aoa[0].map(h=>fold30(String(h||'')));const col=t=>H.findIndex(t);
 const cWh=col(h=>h==='kho'||h.startsWith('kho ')),cZone=col(h=>h.startsWith('zone')),cOwn=col(h=>h.includes('ngay rieng')||h.includes('ngoai le')),
  cDays=col(h=>h.includes('so ngay')&&!h.includes('rieng')&&!h.includes('ngoai le')),cName=col(h=>h.startsWith('khu vuc')||h.startsWith('tinh /')||h==='tinh'||h.startsWith('tinh (')),
  cKw=col(h=>h.includes('tu khoa')),cAl=col(h=>h.includes('ten goi khac')),cProv=col(h=>h.startsWith('tinh moi'));
 if(cWh<0||cZone<0)return null;const kind=cName>=0||cKw>=0?'regions':'zones';
 const rows=aoa.slice(1).filter(r=>r.some(x=>String(x||'').trim())).map(r=>{const g=i=>i>=0?String(r[i]??'').trim():'';
  if(kind==='zones')return{wh:g(cWh),zone:g(cZone),days:g(cDays)};
  let name=g(cName),al=g(cAl);if(cKw>=0&&(cName<0||cName===cKw)){const p=g(cKw).split(';').map(s=>s.trim()).filter(Boolean);name=p[0]||'';al=[al,...p.slice(1)].filter(Boolean).join('; ');}
  const o={wh:g(cWh),name,zone:g(cZone),days:g(cOwn>=0?cOwn:cDays),province:g(cProv)};if(cAl>=0||cKw>=0)o.aliases=al;return o;});
 return{kind,rows};}
document.addEventListener('change',async e=>{const el=e.target;if(!el.dataset||!el.dataset.tr63file||!el.files||!el.files[0])return;const file=el.files[0];el.value='';
 if(typeof XLSX==='undefined')return toast('Chưa tải được thư viện Excel, thử lại sau vài giây.');
 try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const parts={};
  wb.SheetNames.forEach(n=>{const t=trRows63(XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}));if(t&&t.rows.length&&!parts[t.kind])parts[t.kind]={sheet:n,rows:t.rows};});
  if(!parts.zones&&!parts.regions)return toast('Không thấy sheet có cột Kho + Zone (Ngày vận chuyển / Vùng giao).');
  const prev={};for(const k of ['zones','regions'])if(parts[k])prev[k]=await rpc('import_transport',{p_kind:k,p_rows:parts[k].rows,p_apply:false});
  V.modal={type:'tr63imp',parts,prev,err:'',wide:true};render();}
 catch(err){toast('Không đọc được file: '+(err.message||err));}});
M29.tr63imp=function(){const M=V.modal;const L={zones:'Ngày vận chuyển',regions:'Vùng giao'};const anyErr=Object.values(M.prev).some(p=>p.errors.length);
 const sec=k=>{const p=M.prev[k];if(!p)return '';const ch=p.rows.filter(x=>x.act!=='same');
  return `<h3 style="margin:12px 0 4px">${L[k]} <span class="small muted">· sheet "${esc(M.parts[k].sheet)}" · ${p.rows.length} dòng: ${ch.filter(x=>x.act==='add').length} thêm, ${ch.filter(x=>x.act==='upd').length} sửa, ${p.rows.length-ch.length} giữ nguyên${p.errors.length?`, <b style="color:var(--bad)">${p.errors.length} lỗi</b>`:''}</span></h3>
  ${p.errors.length?`<ul class="small" style="color:var(--bad)">${p.errors.map(x=>`<li>Dòng ${x.row+1}: ${esc(x.error)}</li>`).join('')}</ul>`:''}
  ${ch.length?`<ul class="small">${ch.map(x=>`<li><span class="ztag">${x.act==='add'?'Thêm':'Sửa'}</span> ${esc(x.text)}</li>`).join('')}</ul>`:'<p class="small muted">Không có thay đổi.</p>'}`;};
 return `<div class="mhead"><h2>NẠP EXCEL VẬN CHUYỂN</h2><span class="meta">Kiểm tra trước khi ghi</span></div>${sec('zones')}${sec('regions')}
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="tr63Apply" ${anyErr?'disabled title="Sửa các dòng lỗi trong file rồi nạp lại"':''}>Ghi thay đổi</button></div>`;};
A.tr63Apply=async()=>{const M=V.modal;M.err='';V.busy=true;render();
 try{for(const k of ['zones','regions'])if(M.parts[k])await rpc('import_transport',{p_kind:k,p_rows:M.parts[k].rows,p_apply:true});
  V.busy=false;V.modal=null;await reload();render();toast('Đã nạp Excel vận chuyển');}
 catch(e){V.busy=false;M.err=e.message||String(e);render();}};
// v3.50: Logo mới (xe đầu kéo chở 3 cuộn coil) ở đầu trang + màn đăng nhập; biểu tượng menu "Khai báo xe" vẽ lại.
// Logo dùng đúng favicon.svg để icon màn hình chính, tab trình duyệt và logo trong app là một hình.
// Menu dùng hình nét (currentColor) cùng kiểu các biểu tượng khác, tự đổi màu khi chọn / dark mode.
(()=>{
  const st=document.createElement('style');
  st.textContent=`
.logo .mark.m63,.loginbox .brand .mark.m63{width:32px;height:32px;border:1px solid color-mix(in srgb,var(--on-navy) 35%,transparent);border-radius:8px;background:none;padding:0;overflow:hidden;display:inline-grid;place-items:center}
.mark.m63 img{width:100%;height:100%;display:block}
@media (max-width:700px){.top .logo .mark.m63{width:34px;height:34px}}`;
  document.head.appendChild(st);

  const LOGO63=`<img src="favicon.svg?v=${window.APP_V||''}" alt="" width="32" height="32">`;
  // Rơ-moóc chở 3 cuộn coil, bánh xe có trục (24×24, nét theo màu chữ)
  IC.coil63='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.6" cy="12" r="1.9"/><circle cx="8.6" cy="12" r="1.9"/><circle cx="12.6" cy="12" r="1.9"/><path d="M2 14.6h13"/><path d="M15.5 15.5V9.6c0-.6.4-1 1-1h2.2l3 3.6v3.3z"/><path d="M17.2 10.2h1.2l1.6 2h-2.8z"/><circle cx="5" cy="17.4" r="1.7"/><circle cx="11.6" cy="17.4" r="1.7"/><circle cx="18.6" cy="17.4" r="1.7"/><circle cx="5" cy="17.4" r=".3" fill="currentColor"/><circle cx="11.6" cy="17.4" r=".3" fill="currentColor"/><circle cx="18.6" cy="17.4" r=".3" fill="currentColor"/></svg>';
  const nf=NAV.find(n=>n.v==='fleet');if(nf)nf.ic='coil63';

  const fix63=root=>{(root||document).querySelectorAll('.top .logo .mark:not(.m63),.loginbox .brand .mark:not(.m63)').forEach(m=>{m.classList.add('m63');m.innerHTML=LOGO63;});};
  {const r0=render;render=function(){r0();fix63();};}
  {const s0=screen;screen=function(...a){return s0(...a).replace(/<span class="mark">[\s\S]*?<\/svg><\/span>/,`<span class="mark m63">${LOGO63}</span>`);};}
  fix63();
  new MutationObserver(()=>fix63()).observe(document.getElementById('app')||document.body,{childList:true});
})();
