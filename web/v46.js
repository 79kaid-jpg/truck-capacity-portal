// v3.19: Chatbot (Cloudflare Workers AI qua /api/chat). Mọi tra cứu / thao tác chạy ở trình duyệt bằng tài khoản người dùng.
(()=>{const st=document.createElement('style');st.textContent=`
#chatFab{position:fixed;right:18px;bottom:18px;z-index:70;width:54px;height:54px;border-radius:50%;border:0;background:var(--navy);color:var(--on-navy);box-shadow:var(--shadow);cursor:pointer;font-size:24px;display:flex;align-items:center;justify-content:center}
#chatFab:hover{transform:scale(1.05)}body.chat-open #chatFab{display:none}
#chatPanel{position:fixed;right:0;top:0;bottom:0;width:min(420px,100vw);z-index:72;background:var(--surface);border-left:1.5px solid var(--ink);box-shadow:var(--shadow);display:flex;flex-direction:column}
#chatPanel .ch{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--line)}#chatPanel .ch b{flex:1;font-size:14px}
#chatPanel .cm{flex:1;overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;font-size:13.5px;line-height:1.5}
.cmsg{max-width:92%;padding:8px 11px;border-radius:12px;white-space:normal;word-wrap:break-word}
.cmsg.u{align-self:flex-end;background:var(--navy);color:var(--on-navy);border-bottom-right-radius:4px}
.cmsg.a{align-self:flex-start;background:var(--ground);border-bottom-left-radius:4px}.cmsg.a a{color:var(--blue);cursor:pointer;text-decoration:underline}
.cmsg.err{background:var(--bad-bg);color:var(--bad)}.cstep{align-self:flex-start;font-size:11.5px;color:var(--muted)}
.cmsg table{border-collapse:collapse;font-size:12px;margin:4px 0}.cmsg td,.cmsg th{border:1px solid var(--line);padding:2px 6px}
#chatPanel .cs{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 8px}#chatPanel .cs button{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
#chatPanel .cf{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--line)}#chatPanel .cf textarea{flex:1;min-height:42px;max-height:120px;resize:vertical}
#chatPanel .cl{font-size:11px;color:var(--muted);padding:0 14px 8px}
.typing i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:var(--muted);animation:chb 1s infinite}.typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
@keyframes chb{0%,80%,100%{opacity:.3}40%{opacity:1}}
@media (max-width:700px){#chatFab{bottom:76px}}
@media (min-width:1100px){body.chat-open{padding-right:min(420px,100vw)}}
`;document.head.appendChild(st);})();
const CHAT={open:false,msgs:[],busy:false,left:null,api:'/api/chat'};
const chatOn=()=>!!S&&!!S.me&&S.me.chat===true&&!S.custView&&!S.imp;
const isInt=()=>role()!=='customer';
// ---------- tiện ích ----------
const fz=s=>fold30(String(s||'')).trim();
function custFind(q){q=fz(q);if(!q)return[];const cs=role()==='customer'?[cust(me().customerId)]:S.customers.filter(c=>ownsCust(c.id));
 const ex=cs.filter(c=>fz(c.code)===q||fz(c.name)===q);if(ex.length)return ex;return cs.filter(c=>fz(c.code+' '+c.name).includes(q)).slice(0,8);}
const dateArg=v=>{if(!v)return null;v=String(v).trim();if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const m=v.match(/^(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?$/);
 if(m){const y=m[3]?(m[3].length===2?'20'+m[3]:m[3]):TODAY.slice(0,4);return `${y}-${pad(+m[2])}-${pad(+m[1])}`;}
 const k=fz(v);if(k==='hom nay'||k==='today')return TODAY;if(k==='ngay mai'||k==='mai'||k==='tomorrow')return addDays(TODAY,1);if(k==='ngay kia'||k==='mot')return addDays(TODAY,2);if(k==='hom qua')return addDays(TODAY,-1);return null;};
const whArg=v=>{if(!v)return null;const k=fz(v);const w=WH.find(w=>fz(w.id)===k||fz(w.short)===k||fz(w.name).includes(k));return w?w.id:null;};
async function ensureRange(d){if(!d)return;if(d<RANGE.from||d>RANGE.to){goMonth(d);await reload();}}
const ST_ALIAS={'cho xep xe':'hold','giu cho':'hold','da xep xe':'ok','da xac nhan':'ok','tu choi':'rejected','doi ngay':'resched','de nghi doi ngay':'resched','huy':'cancelled','da huy':'cancelled','nhap':'draft','luu tam':'draft','da load':'loaded','da boc':'loaded','dang giao':'transit','da giao':'delivered','giao loi':'failed'};
const stArg=v=>{if(!v)return null;const k=fz(v);return ST_ALIAS[k]||(['hold','ok','rejected','resched','cancelled','draft','loaded','transit','delivered','failed'].includes(k)?k:null);};
const bkRow=b=>{const c=b.customerId==='__other'?null:cust(b.customerId);const tr=[...new Set(allocsOf(b.id).map(a=>truckByCode(a.truck)?.short||a.truck))];
 return {id:b.id,ngay:b.date,kho:b.wh,khach:c?c.name:'Khách khác',ma_kh:c?c.code:'',tan:t2(bkTotal(b)),trang_thai:(isInt()?ST_LABEL:ST_CUST)[stKey(b)]||b.status,khu_vuc:b.region&&b.region!=='NONE'?regName(b.region):'',
  dia_chi:b.addrText||'',ref:b.ref||'',xe:tr.join(', '),...(b.status==='hold'?{cho_phut:Math.max(0,S.clock-b.heldAt)}:{}),...(b.urgent?{khan:true}:{})};};
// ---------- công cụ ----------
const TOOLS={
 capacity:{d:'Số MT còn đặt được theo ngày/kho. args: date (YYYY-MM-DD hoặc "ngày mai"), date_to (tùy chọn, tối đa 14 ngày), wh (tùy chọn: JM2/JD8/JD9…)',run:async a=>{const d0=dateArg(a.date)||TODAY;let d1=dateArg(a.date_to)||d0;if(d1<d0)d1=d0;if((new Date(d1)-new Date(d0))/864e5>13)d1=addDays(d0,13);
  await ensureRange(d0);await ensureRange(d1);const ws=a.wh?[whArg(a.wh)].filter(Boolean):WH.map(w=>w.id);const out=[];
  for(let d=d0;d<=d1;d=addDays(d,1))for(const w of ws){const m=dayM(w,d);out.push({ngay:d,kho:w,mo_lich:m.declared,nghi:!!m.off,con_dat_duoc_MT:t2(m.avail),muc:m.status,...(isInt()&&m.declared?{nang_luc:t2(m.cap),da_xep:t2(m.loaded),cho_xep:t2(m.held)}:{})});}
  return out;}},
 find_bookings:{d:'Tìm đơn/booking. args (đều tùy chọn): q (mã booking, SO, địa chỉ…), customer (tên/mã khách), status (chờ xếp xe, đã xếp xe, đang giao, đã giao, từ chối…), date, date_from, date_to, wh, region (tên tỉnh/khu vực), urgent (true), sort ("wait" = chờ lâu nhất), limit',run:async a=>{
  const d=dateArg(a.date),df=dateArg(a.date_from)||d,dt=dateArg(a.date_to)||d;if(df)await ensureRange(df);if(dt)await ensureRange(dt);
  let note='';let cs=a.customer?custFind(a.customer).map(c=>c.id):null;let q=fz(a.q);
  if(cs&&!cs.length){note='Không có công ty khách nào tên "'+a.customer+'": đã tìm theo người liên hệ / ghi chú / Ref / nội dung yêu cầu.';q=fz(a.customer);cs=null;}
  const st=stArg(a.status),w=whArg(a.wh),rg=fz(a.region);
  let l=S.bookings.filter(b=>visibleBk(b)&&b.customerId!=='__other'&&(!st||b.status===st)&&(!w||b.wh===w)&&(!df||b.date>=df)&&(!dt||b.date<=dt)&&(!cs||cs.includes(b.customerId))
   &&(!a.urgent||b.urgent)&&(!rg||fz(regName(b.region)+' '+b.addrText).includes(rg))&&(!q||fz(b.id+' '+b.ref+' '+b.addrText+' '+(b.note||'')+' '+cust(b.customerId).name).includes(q)));
  if(a.sort==='wait')l.sort((x,y)=>x.heldAt-y.heldAt);else l.sort((x,y)=>x.date<y.date?-1:x.date>y.date?1:0);
  if(!l.length&&q){try{const r=await rpc('search',{p_q:a.q});const bs=(r&&r.bookings)||[];return {ghi_chu:'Không có trong dữ liệu đang tải, kết quả từ tìm kiếm toàn hệ thống',ket_qua:bs.slice(0,10)};}catch(e){}}
  const by={};l.forEach(b=>{const k=(isInt()?ST_LABEL:ST_CUST)[stKey(b)]||b.status;by[k]=by[k]||{don:0,MT:0};by[k].don++;by[k].MT+=bkTotal(b);});Object.values(by).forEach(v=>v.MT=t2(v.MT));
  const rq=q?(S.reqs||[]).filter(r=>fz(r.body+' '+(cust(r.customerId)?.name||'')).includes(q)).slice(0,5).map(r=>({yeu_cau:r.id,khach:cust(r.customerId)?.name,ngay:r.date,kho:r.wh,noi_dung:r.body,trang_thai:RQ_ST[r.status]})):[];
  return {ghi_chu:note||undefined,khoang_ngay:(df||dt)?(df||'')+' → '+(dt||''):'dữ liệu đang tải ('+RANGE.from+' → '+RANGE.to+')',tong_so_don:l.length,tong_MT:t2(l.reduce((s,b)=>s+bkTotal(b),0)),theo_trang_thai:by,
   hien_thi:Math.min(l.length,Math.min(+a.limit||15,30)),ket_qua:l.slice(0,Math.min(+a.limit||15,30)).map(bkRow),...(rq.length?{yeu_cau_lien_quan:rq}:{})};}},
 booking_detail:{d:'Chi tiết một booking. args: id',run:async a=>{const b=bkById(String(a.id||'').trim().toUpperCase())||S.bookings.find(x=>fz(x.ref)===fz(a.id));if(!b||!visibleBk(b))return {loi:'Không tìm thấy booking (hoặc ngoài phạm vi của bạn).'};
  return {...bkRow(b),hang:b.lines.map(l=>`${l.p} · ${l.c} · ${l.th}×${l.w} · ${t2(l.t)} MT`),ngay_giao_yc:b.delivery||'',ly_do:b.rejectReason||'',ngay_de_xuat:b.proposedDate||'',ghi_chu:b.note||'',
   phan_xe:allocsOf(b.id).map(x=>({xe:truckByCode(x.truck)?.short||x.truck,tan:t2(x.tons)})),con_chua_gan_MT:b.status==='hold'?t2(bkTotal(b)-allocSum(b.id)):undefined};}},
 requests:{d:'Yêu cầu đặt hàng (💬). args: date (tùy chọn), status ("new" chờ xử lý / "all")',run:async a=>{const d=dateArg(a.date);const l=(S.reqs||[]).filter(r=>(!d||r.date===d)&&(a.status==='all'||r.status==='new'));
  return l.slice(0,20).map(r=>({id:r.id,khach:cust(r.customerId)?.name,kho:r.wh,ngay:r.date,tan:r.tons,noi_dung:r.body,trang_thai:RQ_ST[r.status],nguoi_gui:r.byName}));}},
 guide:{d:'Tìm trong Hướng dẫn sử dụng. args: q (từ khóa câu hỏi)',run:async a=>{const src=role()==='customer'?'guide-kh.html':'guide.html';let html=(typeof GD!=='undefined'&&GD.src===src&&GD.html)||'';
  if(!html){try{html=await (await fetch(src)).text();}catch(e){return {loi:'Không tải được hướng dẫn'};}}
  const doc=new DOMParser().parseFromString(html,'text/html');const ws=fz(a.q).split(/\s+/).filter(w=>w.length>1);
  const secs=[...doc.querySelectorAll('section[id]')].map(s=>{const t=fz(s.textContent);const sc=ws.reduce((n,w)=>n+(t.split(w).length-1)+(fz(s.dataset.t).includes(w)?5:0),0);return {id:s.id,tieu_de:s.dataset.t,sc,noi_dung:s.textContent.replace(/\s+/g,' ').trim().slice(0,1400)};});
  return secs.sort((x,y)=>y.sc-x.sc).slice(0,2).filter(x=>x.sc>0).map(({sc,...x})=>x);}},
 fill_request:{d:'Mở form Yêu cầu đặt hàng điền sẵn (người dùng tự bấm Gửi). args: customer (nội bộ: tên/mã khách), wh, date, tons, body (nội dung: sản phẩm, màu, độ dày, MT, nơi giao…)',ok:()=>rqCanNew(),run:async a=>{
  const d=dateArg(a.date)||addDays(TODAY,1);const w=whArg(a.wh)||(V.whAll?WH[0].id:V.wh);let c=null;
  if(role()!=='customer'){const cs=custFind(a.customer);if(cs.length!==1)return {loi:cs.length?'Có nhiều khách khớp, hỏi lại người dùng chọn: '+cs.map(c=>c.code+' '+c.name).join('; '):'Không tìm thấy khách "'+(a.customer||'')+'" trong phạm vi của bạn.'};c=cs[0];}
  A.rqNew({d,w});const f=V.modal.f;if(c){f.cid=c.id;f.q=c.code+' – '+c.name;}f.day=d;f.wh=w;f.tons=a.tons?String(a.tons):'';f.body=String(a.body||'').slice(0,2000);render();
  return {da_mo_form:true,khach:c?c.name:cust(me().customerId).name,kho:w,ngay:d,ghi_chu:'Người dùng kiểm tra rồi bấm Gửi yêu cầu.'};}},
 open:{d:'Mở màn hình. args: kind ("day" | "booking" | "truck" | "guide" | "calendar"), id, date, wh, code',run:async a=>{chatGo(String(a.kind||'')+':'+(a.id||a.code||a.date||'')+(a.wh?':'+a.wh:''));return {da_mo:true};}},
 find_customer:{d:'Tìm khách hàng theo tên/mã. args: q',ok:isInt,run:async a=>custFind(a.q).slice(0,8).map(c=>({ma:c.code,ten:c.name,segment:c.segment,sales:user(c.salesId)?.name}))},
 find_trucks:{d:'Tìm xe trong ngày. args: date, wh (tùy chọn), min_free (MT trống tối thiểu), state ("empty" trống, "free" còn chỗ, "locked" đã chạy/đóng, "transit" đang giao, "late" đã qua ngày mà chưa xác nhận giao)',ok:isInt,run:async a=>{
  const d=dateArg(a.date)||TODAY;await ensureRange(d);const ws=a.wh?[whArg(a.wh)].filter(Boolean):WH.map(w=>w.id);const out=[];
  for(const w of ws)for(const t of trucksOf(w,d)){const l=loadOf(t.code),free=r2(t.cap-l),lk=truckLocked(t),tr=tripOf(t.code);
   if(a.min_free&&(lk||free<+a.min_free))continue;if(a.state==='empty'&&l>0.001)continue;if(a.state==='free'&&(lk||free<=0.001))continue;if(a.state==='locked'&&!lk)continue;
   if(a.state==='transit'&&!(tr&&tr.k==='transit'))continue;if(a.state==='late'&&!(d<TODAY&&tr&&['loaded','loading','transit'].includes(tr.k)))continue;
   out.push({xe:t.short,ma:t.code,kho:w,loai:t.type,tai_trong:t.cap,da_xep:t2(l),con_trong:t2(Math.max(0,free)),khoa:lk?(t.closed?'đã đóng':'đã chạy'):'',chuyen:tr?tr.l:'',khu_vuc:truckRegions(t.code).map(regName).join(', '),diem_giao:truckStops(t.code).size});}
  return out.slice(0,40);}},
 truck_detail:{d:'Chi tiết một xe. args: code (mã đầy đủ) hoặc short (DK-03) + date + wh',ok:isInt,run:async a=>{let t=a.code?truckByCode(a.code):null;
  if(!t){const d=dateArg(a.date)||TODAY;await ensureRange(d);const w=whArg(a.wh)||V.wh;t=trucksOf(w,d).find(x=>fz(x.short)===fz(a.short||a.code));}
  if(!t)return {loi:'Không tìm thấy xe'};const al=liveAllocsOnTruck(t.code);
  return {xe:t.short,ma:t.code,ngay:t.date,kho:t.wh,tai_trong:t.cap,da_xep:t2(loadOf(t.code)),chuyen:tripOf(t.code)?.l||'Chưa có hàng',khoa:truckLocked(t),bien_so:t.info?.plate||'',tai_xe:t.info?.driver||'',
   don:al.map(x=>{const b=bkById(x.bk);return {id:b.id,khach:ownsCust(b.customerId)?cust(b.customerId).name:'Khách khác',tan:t2(x.tons),trang_thai:ST_LABEL[stKey(b)],dia_chi:b.addrText};})};}},
 suggest_trucks:{d:'Gợi ý xe cho một booking chờ xếp xe, giải thích lý do, và mở màn đội xe với viền gợi ý để Logistics bấm Đồng ý. args: booking_id',ok:()=>isInt()&&can('alloc.assign'),run:async a=>{
  const b=bkById(String(a.booking_id||a.id||'').trim().toUpperCase());if(!b||!visibleBk(b))return {loi:'Không tìm thấy booking.'};if(b.status!=='hold')return {loi:'Booking không ở trạng thái Chờ xếp xe ('+ST_LABEL[stKey(b)]+').'};
  const s=suggestFor(b);if(!s.rows.length)return {loi:'Không có xe phù hợp (hết chỗ hoặc chưa khai báo xe). Gợi ý: khai báo thêm xe hoặc đổi ngày.'};
  const pref=bkTotal(b)>S.cfg.split?'DK':'XT';
  const why=s.rows.map(r=>{const t=truckByCode(r.code);const rs=truckRegions(t.code,b.id);const l0=loadOf(t.code,b.id);const rel=!rs.length?'xe đang trống':rs.includes(b.region)?'cùng khu vực '+regName(b.region):rs.some(x=>relation(x,b.region)==='nb')?'khu vực lân cận ('+rs.map(regName).join(', ')+')':'khác khu vực';
   return {xe:t.short,tan:t2(r.tons),day_sau_khi_xep:pct((l0+r.tons)/t.cap),loai:t.type+(t.type===pref?' (đúng loại)':' (khác loại khuyến nghị '+pref+')'),ly_do:rel+(l0>0.001?', ghép chuyến đang có '+t2(l0)+' MT':'')};});
  V.wh=b.wh;V.whAll=false;V.day=b.date;V.view='day';V.dayTab='pending';V.modal=null;render();if(typeof A.dndSuggest==='function')A.dndSuggest({id:b.id});
  return {booking:b.id,khach:cust(b.customerId).name,can_xep_MT:t2(bkTotal(b)),khu_vuc:regName(b.region),goi_y:why,con_thieu_MT:s.left>0.001?t2(s.left):0,ghi_chu:'Đã mở màn đội xe, xe được gợi ý có viền chạy quanh; bấm ✓ Đồng ý trên booking để xếp, hoặc kéo sang xe khác.'};}},
 suggest_all:{d:'Gợi ý xếp xe cho tất cả booking chờ của một ngày/kho, mở màn đội xe để Logistics Đồng ý tất cả. args: date, wh',ok:()=>isInt()&&can('alloc.assign'),run:async a=>{
  const d=dateArg(a.date)||TODAY;await ensureRange(d);const w=whArg(a.wh)||V.wh;V.wh=w;V.whAll=false;V.day=d;V.view='day';V.dayTab='pending';V.modal=null;render();
  if(typeof A.dndSuggestAll!=='function')return {loi:'Chưa có tính năng gợi ý'};A.dndSuggestAll();const all=(typeof DND!=='undefined'&&DND.all)||[];const holds=dayM(w,d).holds.length;
  return {ngay:d,kho:w,booking_cho:holds,xep_duoc:all.length,chi_tiet:all.map(s=>({booking:s.bk,khach:cust(bkById(s.bk).customerId).name,xe:s.rows.map(r=>truckByCode(r.code).short+' '+t2(r.tons)+' MT').join(' + ')})),ghi_chu:'Bấm "Đồng ý tất cả" trên màn đội xe để xếp.'};}},
 fill_order:{d:'CS: mở lưới Đặt hàng điền sẵn (người dùng tự lưu). args: customer, wh, date, tons, note',ok:()=>isInt()&&can('booking.create'),run:async a=>{
  const cs=custFind(a.customer);if(cs.length!==1)return {loi:cs.length?'Nhiều khách khớp: '+cs.map(c=>c.code+' '+c.name).join('; '):'Không tìm thấy khách.'};const c=cs[0];
  const d=dateArg(a.date)||addDays(TODAY,1);const w=whArg(a.wh)||c.defWh||V.wh;const keep=V.wh;V.wh=w;openGrid30(d);V.wh=keep;const M=V.modal;M.wh=w;M.rows.forEach(r=>{r.wh=w;r.day=d;});
  const r0=M.rows[0];r0.cid=c.id;r0.q=c.code;r0.tons=a.tons?String(a.tons).replace('.',','):'';r0.note=String(a.note||'').slice(0,500);render();
  return {da_mo_luoi:true,khach:c.name,kho:w,ngay:d,ghi_chu:'Người dùng chọn địa chỉ giao, sản phẩm rồi bấm Lưu / Gửi Logistics.'};}},
};
const toolList=()=>Object.entries(TOOLS).filter(([k,t])=>!t.ok||t.ok());
function sysPrompt(){const u=me();const ctx={hom_nay:TODAY,thu:WDS[dow(TODAY)],nguoi_dung:u.name,vai_tro:ROLE_LABEL[u.role]||u.role,kho:WH.map(w=>w.id+' = '+w.short).join(', '),
  dang_xem:V.view+(V.view==='day'?' '+V.day+' '+V.wh:V.view==='calendar'?' tháng '+V.ym.join('-')+(V.whAll?' tất cả kho':' kho '+V.wh):'')};
 return `Bạn là trợ lý của cổng Đặt Xe BlueScope (đặt năng lực giao hàng thép cuộn theo ngày bốc và kho). Trả lời TIẾNG VIỆT, ngắn gọn, chính xác, đơn vị MT (metric tấn).
Bối cảnh: ${JSON.stringify(ctx)}
${role()==='customer'?'Người dùng là KHÁCH HÀNG: chỉ nói về đơn của chính họ, số MT còn đặt được, gửi yêu cầu đặt hàng; không tiết lộ thông tin nội bộ (xe, khách khác).':'Người dùng là nhân viên nội bộ.'}
Công cụ (chỉ dùng dữ liệu công cụ trả về, KHÔNG bịa số liệu):
${toolList().map(([k,t])=>'- '+k+': '+t.d).join('\n')}
CÁCH TRẢ LỜI: mỗi lượt chỉ in ra ĐÚNG MỘT đối tượng JSON, không có chữ nào khác:
- Gọi công cụ: {"tool":"tên","args":{...}}
- Trả lời cuối: {"answer":"nội dung"}
Trong "answer" có thể dùng **đậm**, xuống dòng, gạch đầu dòng "- ", và link: [BK-…](#bk:MÃ), [ngày 25/10 JM2](#day:2026-10-25:JM2), [DK-03](#truck:MÃ_XE_ĐẦY_ĐỦ), [mục hướng dẫn](#guide:ID).
SỐ LIỆU TỔNG HỢP (tổng đã đặt, đã có xe, đã giao, còn phải giao, số đơn, theo khách / Sales / segment / kho trong một kỳ): LUÔN dùng công cụ "stats" – cùng cách tính với Bảng thống kê. TUYỆT ĐỐI KHÔNG tự cộng / đếm từ danh sách đơn; chỉ chép đúng số công cụ trả về, nêu rõ kỳ (từ ngày – đến ngày) và kèm link [Xem trên Bảng thống kê](#dash:...) mà công cụ đưa.
"tháng này" = period "month"; "tuần này" = "week"; "hôm nay" = "day"; quý / năm tương tự. Tên người (vd "anh Ánh") có thể là người liên hệ chứ không phải công ty: nếu không chắc, hỏi lại.
Quy tắc: ngày dạng YYYY-MM-DD; thiếu thông tin bắt buộc (khách, ngày, kho) thì hỏi lại thay vì đoán; với điền form chỉ nói "đã mở form, bạn kiểm tra và bấm Gửi" – không bao giờ nói đã gửi/đã lưu; câu hỏi ngoài phạm vi công việc thì lịch sự từ chối.`;}
// ---------- vòng hỏi – công cụ – trả lời ----------
function parseReply(t){if(t&&typeof t==='object')return normReply(t);t=String(t||'').trim();const i=t.indexOf('{'),j=t.lastIndexOf('}');
 if(i>=0&&j>i){try{return normReply(JSON.parse(t.slice(i,j+1)));}catch(e){}}return {answer:t};}
// chuẩn hóa: args có thể là chuỗi JSON; answer có thể là object / mảng → chuyển thành chữ
function normReply(R){if(!R||typeof R!=='object')return {answer:String(R||'')};
 if(R.tool&&typeof R.args==='string'){try{R.args=JSON.parse(R.args);}catch(e){R.args={};}}
 if(!R.tool&&R.answer==null&&(R.name||R.function)){const f=R.function||R;return {tool:f.name,args:typeof f.arguments==='string'?(()=>{try{return JSON.parse(f.arguments);}catch(e){return {};}})():(f.arguments||f.parameters||{})};}
 if(R.answer!=null&&typeof R.answer!=='string')R.answer=Array.isArray(R.answer)?R.answer.map(x=>typeof x==='string'?x:JSON.stringify(x)).join('\n'):JSON.stringify(R.answer);
 if(!R.tool&&R.answer==null)R.answer=R.text||R.response||JSON.stringify(R);return R;}
async function callAI(msgs,tools){const {data}=await sb.auth.getSession();const tok=data&&data.session&&data.session.access_token;
 const r=await fetch(CHAT.api,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify({messages:msgs,tools})});
 const j=await r.json().catch(()=>({error:'Máy chủ chatbot không phản hồi ('+r.status+').'}));if(!r.ok||j.error)throw new Error(j.error||('Lỗi '+r.status));if(j.left!=null)CHAT.left=j.left;return j.text;}
async function chatAsk(q){if(CHAT.busy||!q.trim())return;CHAT.busy=true;CHAT.msgs.push({role:'user',content:q.trim()});chatRender();
 const base=[{role:'system',content:sysPrompt()},...CHAT.msgs.filter(m=>m.role==='user'||m.role==='assistant').slice(-10).map(m=>({role:m.role,content:m.raw||m.content}))];
 const work=base.slice();const used=[];
 try{for(let round=0;round<6;round++){const txt=await callAI(work,used);const R=parseReply(txt);
   if(R.tool&&TOOLS[R.tool]&&(!TOOLS[R.tool].ok||TOOLS[R.tool].ok())){used.push(R.tool);CHAT.msgs.push({role:'step',content:stepLabel(R.tool,R.args)});chatRender();
    let res;try{res=await TOOLS[R.tool].run(R.args||{});}catch(e){res={loi:e.message};}
    work.push({role:'assistant',content:JSON.stringify({tool:R.tool,args:R.args||{}})},{role:'user',content:'KẾT QUẢ CÔNG CỤ '+R.tool+': '+JSON.stringify(res).slice(0,7000)+'\nTiếp tục: gọi công cụ khác hoặc trả lời cuối bằng {"answer":"..."}'});continue;}
   if(R.tool){work.push({role:'assistant',content:txt},{role:'user',content:'Công cụ "'+R.tool+'" không tồn tại hoặc bạn không có quyền. Trả lời bằng {"answer":"..."}'});continue;}
   const ans=typeof R.answer==='string'&&R.answer?R.answer:(typeof txt==='string'?txt:JSON.stringify(txt));CHAT.msgs.push({role:'assistant',content:ans,raw:JSON.stringify({answer:ans})});break;}}
 catch(e){CHAT.msgs.push({role:'err',content:e.message});}
 CHAT.busy=false;chatRender();}
const STEP={capacity:'Xem năng lực còn đặt được',find_bookings:'Tìm đơn',booking_detail:'Xem chi tiết booking',requests:'Xem yêu cầu đặt hàng',guide:'Tra hướng dẫn',fill_request:'Mở form yêu cầu đặt hàng',open:'Mở màn hình',find_customer:'Tìm khách hàng',find_trucks:'Tìm xe',truck_detail:'Xem chi tiết xe',suggest_trucks:'Gợi ý xe',suggest_all:'Gợi ý xếp cả ngày',fill_order:'Mở lưới đặt hàng'};
const stepLabel=(t,a)=>'🔎 '+(STEP[t]||t)+(a&&(a.date||a.q||a.customer||a.booking_id||a.id)?' · '+(a.booking_id||a.id||a.customer||a.q||a.date):'')+'…';
// ---------- hiển thị ----------
function mdLite(s){let h=esc(s);h=h.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\[([^\]]+)\]\(#([a-z]+:[^)\s]+)\)/g,(m,t,k)=>`<a data-a="chatGo" data-k="${k}">${t}</a>`);
 return h.split('\n').map(l=>/^\s*[-•]\s+/.test(l)?'• '+l.replace(/^\s*[-•]\s+/,''):l).join('<br>');}
function chatGo(k){const [kind,id,wh]=String(k).split(':');
 if(kind==='bk'){const b=bkById(id);if(!b)return;if(isInt())openBooking(b.id);else{V.view='calendar';V.modal={type:'custDay',date:b.date,w:b.wh,wide:true};render();}}
 else if(kind==='day'){const d=dateArg(id);if(!d)return;if(wh)V.wh=whArg(wh)||V.wh;V.whAll=false;if(isInt()&&can('day.view')){V.day=d;V.view='day';afterNav(goMonth(d));}else{V.view='calendar';afterNav(goMonth(d));}}
 else if(kind==='truck'){const t=truckByCode(id);if(!t)return;V.wh=t.wh;V.whAll=false;V.day=t.date;V.view='day';V.modal={type:'truck',code:t.code};afterNav(goMonth(t.date));}
 else if(kind==='guide'){if(typeof A.guide==='function')A.guide({s:id});}
 else if(kind==='calendar'){V.view='calendar';render();}}
A.chatGo=d=>chatGo(d.k);
const SUGG=()=>role()==='customer'?['Tuần này kho nào còn chỗ?','Đơn của tôi tuần này','Gửi yêu cầu đặt hàng']
 :role()==='logistics'?['Hôm nay còn bao nhiêu đơn chờ xếp xe?','Xe nào ngày mai còn trống trên 10 MT?','Gợi ý xếp xe tất cả đơn ngày mai','Xe nào đang giao chưa xác nhận?']
 :role()==='sales'?['Còn chỗ ngày mai không?','Đơn chờ xếp xe của khách tôi','Ghi yêu cầu đặt hàng cho khách']
 :['Đơn chờ xếp xe lâu nhất','Còn chỗ 3 ngày tới?','Đơn bị từ chối tuần này','Cách xác nhận giao hàng?'];
function chatRender(){let fab=document.getElementById('chatFab');
 if(!chatOn()){if(fab)fab.remove();const p=document.getElementById('chatPanel');if(p)p.remove();document.body.classList.remove('chat-open');return;}
 if(!fab){fab=document.createElement('button');fab.id='chatFab';fab.title='Trợ lý Đặt Xe (G Q)';fab.setAttribute('aria-label','Mở trợ lý');fab.textContent='💬';fab.onclick=()=>chatToggle(true);document.body.appendChild(fab);}
 let p=document.getElementById('chatPanel');document.body.classList.toggle('chat-open',CHAT.open);if(!CHAT.open){if(p)p.remove();return;}
 const keep=p&&p.querySelector('textarea')?p.querySelector('textarea').value:'';
 if(!p){p=document.createElement('aside');p.id='chatPanel';p.setAttribute('aria-label','Trợ lý Đặt Xe');document.body.appendChild(p);}
 p.innerHTML=`<div class="ch"><b>💬 Trợ lý Đặt Xe</b><button class="btn ghost sm" data-chat="clear" title="Cuộc trò chuyện mới">Mới</button><button class="btn ghost sm" data-chat="x" aria-label="Đóng">✕</button></div>
 <div class="cm">${CHAT.msgs.length?'':`<div class="cmsg a">Xin chào ${esc(me().name)}! Mình tra cứu được lịch còn chỗ, đơn hàng${isInt()?', xe':''}, hướng dẫn sử dụng${rqCanNew()?', điền sẵn yêu cầu đặt hàng':''}${isInt()&&can('alloc.assign')?' và gợi ý xếp xe':''}. Bạn hỏi gì cứ gõ nhé.</div>`}
  ${CHAT.msgs.map(m=>m.role==='user'?`<div class="cmsg u">${esc(m.content)}</div>`:m.role==='step'?`<div class="cstep">${esc(m.content)}</div>`:m.role==='err'?`<div class="cmsg err">⚠ ${esc(m.content)}</div>`:`<div class="cmsg a">${mdLite(m.content)}</div>`).join('')}
  ${CHAT.busy?'<div class="cmsg a typing"><i></i><i></i><i></i></div>':''}</div>
 ${CHAT.msgs.length?'':`<div class="cs">${SUGG().map(s=>`<button data-chat="s">${esc(s)}</button>`).join('')}</div>`}
 <div class="cf"><textarea class="inp" placeholder="Hỏi về lịch, đơn, xe… (Enter để gửi)" ${CHAT.busy?'disabled':''}>${esc(keep)}</textarea><button class="btn" data-chat="send" ${CHAT.busy?'disabled':''}>Gửi</button></div>
 <div class="cl">${CHAT.left!=null?'Còn '+CHAT.left+' lượt hôm nay · ':''}Trợ lý có thể sai, hãy kiểm tra trước khi thao tác.</div>`;
 const cm=p.querySelector('.cm');cm.scrollTop=cm.scrollHeight;const ta=p.querySelector('textarea');if(!CHAT.busy)ta.focus();}
function chatToggle(on){CHAT.open=on==null?!CHAT.open:on;chatRender();}
A.chatOpen=()=>chatOn()&&chatToggle(true);
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-chat]');if(!b)return;const k=b.dataset.chat;
 if(k==='x')chatToggle(false);else if(k==='clear'){CHAT.msgs=[];chatRender();}else if(k==='s')chatAsk(b.textContent);
 else if(k==='send'){const ta=document.querySelector('#chatPanel textarea');const v=ta.value;ta.value='';chatAsk(v);}});
document.addEventListener('keydown',e=>{const ta=e.target.closest&&e.target.closest('#chatPanel textarea');if(ta&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();const v=ta.value;ta.value='';chatAsk(v);}
 else if(e.key==='Escape'&&CHAT.open&&e.target.closest&&e.target.closest('#chatPanel')){chatToggle(false);}},true);
{const r0=render;render=function(){r0();chatRender();};}
// ---------- cấu hình (Admin) + bật cho từng khách ----------
const CHAT_ROLES=[['cs','CS'],['sales','Sales'],['logistics','Logistics'],['admin','Admin'],['customer','Khách hàng']];
const chatLim=k=>{const R=S.cfg.chatDailyRole||{};return R[k]!=null?R[k]:(k==='customer'?30:(S.cfg.chatDaily||150));};
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.chatlim;if(!k)return;const v=Math.round(num(e.target.value));if(!(v>=0)){toast('Nhập số từ 0 trở lên.');return;}
 const R={};CHAT_ROLES.forEach(([r])=>R[r]=+chatLim(r));R[k]=v;mutate('update_settings',{p:{chatDailyRole:R}},{ok:()=>toast('Đã lưu hạn mức trợ lý')});});
{const r0=render;render=function(){r0();if(!S||V.view!=='config'||(V.cfgTab||'general')!=='general'||!can('config.general'))return;const host=document.querySelector('.main .panel .fgrid');if(!host||document.querySelector('.chatcfg'))return;
 const C=S.cfg;const roles=Array.isArray(C.chatRoles)?C.chatRoles:['cs','sales','logistics','admin'];const card=document.createElement('div');card.className='pkcard chatcfg';
 card.innerHTML=`<h4>💬 Trợ lý (chatbot)</h4><label class="row" style="gap:8px"><input type="checkbox" data-f="cfgb" data-k="chatOn" ${C.chatOn===false?'':'checked'}> Bật trợ lý</label>
  <div class="row" style="gap:12px;margin:6px 0;flex-wrap:wrap"><span class="small">Vai trò được dùng:</span>${[['cs','CS'],['sales','Sales'],['logistics','Logistics'],['admin','Admin']].map(([k,l])=>`<label class="row" style="gap:4px"><input type="checkbox" data-chatrole="${k}" ${roles.includes(k)?'checked':''}> ${l}</label>`).join('')}<span class="small muted">Khách hàng: bật từng công ty ở Người dùng → Khách hàng.</span></div>
  <div class="small" style="margin:8px 0 4px;font-weight:700">Số lượt tối đa mỗi người / ngày (1 câu hỏi ≈ 2–4 lượt; 0 = không cho dùng)</div>
  <div class="fgrid">${CHAT_ROLES.map(([k,l])=>`<div class="field"><label for="cl-${k}">${l}</label><input id="cl-${k}" class="inp num" inputmode="numeric" data-chatlim="${k}" value="${chatLim(k)}"></div>`).join('')}
  <div class="field"><label for="cf-chatDailyTotal">Chặn tổng toàn hệ thống / ngày</label><div class="row" style="flex-wrap:nowrap"><input id="cf-chatDailyTotal" class="inp num" data-f="cfg" data-k="chatDailyTotal" value="${C.chatDailyTotal||2000}"><span class="muted small">lượt · Admin được báo khi dùng 80%</span></div></div>
  <div class="field"><label>Mức dùng</label><div class="small" id="chatStat">Đang tải…</div></div></div>`;
 const pk=document.querySelector('.pkcard');(pk||host).parentNode.insertBefore(card,pk?pk.nextSibling:host);
 rpc('chat_stats').then(s=>{const el=document.getElementById('chatStat');if(!el)return;const R=s.roles||{};
  el.innerHTML=`Hôm nay: <b>${s.today}</b>/${s.total} lượt (chặn tổng)<br>${CHAT_ROLES.filter(([k])=>R[k]).map(([k,l])=>`${l}: hôm nay ${R[k][0]} · 7 ngày ${R[k][1]}`).join('<br>')||'Chưa có lượt nào 7 ngày qua'}${s.top.length?'<br>Dùng nhiều (7 ngày): '+s.top.map(t=>esc(t[0])+' '+t[1]).join(', '):''}`;}).catch(()=>{});};}
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.chatrole;if(!k)return;const cur=new Set(Array.isArray(S.cfg.chatRoles)?S.cfg.chatRoles:['cs','sales','logistics','admin']);e.target.checked?cur.add(k):cur.delete(k);
 mutate('update_settings',{p:{chatRoles:[...cur]}},{ok:()=>toast('Đã lưu vai trò dùng trợ lý')});});
{const r0=render;render=function(){r0();if(!S||V.view!=='users'||V.uTab!=='customers'||!can('customers.manage'))return;
 document.querySelectorAll('.main [data-a="custEdit"]').forEach(b=>{if(b.parentNode.querySelector('[data-a="custChat"]'))return;const c=cust(b.dataset.id);if(!c)return;
  const x=document.createElement('button');x.className='btn ghost sm';x.dataset.a='custChat';x.dataset.id=c.id;x.title='Cho tài khoản của khách này dùng trợ lý';x.textContent=c.chatOn?'💬 Đang bật':'💬 Bật trợ lý';if(c.chatOn)x.style.borderColor='var(--ok)';b.parentNode.insertBefore(x,b);b.parentNode.insertBefore(document.createTextNode(' '),b);});};}
A.custChat=d=>{const c=cust(d.id);mutate('set_customer_chat',{p_customer:c.id,p_on:!c.chatOn},{ok:()=>toast((!c.chatOn?'Đã bật':'Đã tắt')+' trợ lý cho '+c.name)});};

// ---------- v3.21: Thống kê – cùng nguồn (dash_data) và cách tính với Bảng thống kê ----------
const ST_DZ_OK=['ok','loaded','transit','delivered','failed'],ST_DZ_BOOK=[...ST_DZ_OK,'hold','resched','draft'];
const stGrp=s=>ST_DZ_OK.includes(s.s)?'ok':s.s==='cancelled'?(s.late?'late':'canc'):s.s==='rejected'?'rej':s.s;
function stPeriod(a){const d=dateArg(a.date)||TODAY;const[y,m]=parts(d);const per=String(a.period||'month');
 if(a.date_from||a.date_to){const f=dateArg(a.date_from)||d,t=dateArg(a.date_to)||f;return [f<=t?f:t,f<=t?t:f,'custom'];}
 switch(per){case'day':return[d,d,per];case'week':{const k=(dow(d)+6)%7;const f=addDays(d,-k);return[f,addDays(f,6),per];}
  case'quarter':{const q=Math.floor((m-1)/3)*3+1;return[iso(y,q,1),iso(y,q+2,dim(y,q+2)),per];}case'year':return[iso(y,1,1),iso(y,12,31),per];
  default:return[iso(y,m,1),iso(y,m,dim(y,m)),'month'];}}
async function stRows(f,t){
 if(isInt()){try{const D=await rpc('dash_data',{p_from:f,p_to:t});return (D.b||[]).map(a=>{const c=D.c[a[3]]||['','Khách khác','DD',null];return{id:a[0],d:a[1],w:a[2],cid:a[3],s:a[4],t:+a[5]||0,x:!!a[6],late:!!a[7],name:c[1],code:c[0],g:c[2],sales:c[3],salesName:(D.u||{})[c[3]]||''};});}catch(e){}}
 await ensureRange(f);await ensureRange(t);
 return S.bookings.filter(b=>visibleBk(b)&&b.customerId!=='__other'&&b.status!=='draft'||role()!=='customer'&&b.status==='draft'&&b.csId===V.me).map(b=>{const c=cust(b.customerId);return{id:b.id,d:b.date,w:b.wh,cid:b.customerId,s:b.status,t:bkTotal(b),x:!!b.urgent,late:!!b.lateCancel,name:c?c.name:'',code:c?c.code:'',g:c?c.segment:'',sales:c?c.salesId:null,salesName:c?user(c.salesId)?.name:''};});}
const mt1=n=>(Math.round(n*10)/10).toLocaleString('vi-VN',{maximumFractionDigits:1})+' MT';
TOOLS.stats={d:'SỐ LIỆU TỔNG HỢP giống Bảng thống kê (dùng cho mọi câu hỏi "bao nhiêu", "tổng", "đã giao", "còn phải giao"). args: period ("day"|"week"|"month"|"quarter"|"year", mặc định month), date (ngày trong kỳ, mặc định hôm nay) hoặc date_from + date_to; lọc tùy chọn: wh, segment (DD/DA/EX), sales (tên Sales), customer (tên/mã khách)',
 run:async a=>{const[f,t,per]=stPeriod(a);let L=(await stRows(f,t)).filter(r=>r.d>=f&&r.d<=t);const loc=[];
  const w=whArg(a.wh);if(a.wh){if(!w)return {loi:'Không có kho '+a.wh};L=L.filter(r=>r.w===w);loc.push('kho '+w);}
  if(a.segment){const g=String(a.segment).toUpperCase().slice(0,2);L=L.filter(r=>r.g===g);loc.push('segment '+g);}
  let sp='';if(a.sales&&isInt()){const k=fz(a.sales);const us=S.users.filter(u=>u.role==='sales'&&fz(u.name).includes(k));if(us.length!==1)return {loi:us.length?'Nhiều Sales khớp: '+us.map(u=>u.name).join(', '):'Không có Sales tên "'+a.sales+'"'};sp=us[0].id;L=L.filter(r=>r.sales===sp);loc.push('Sales '+us[0].name);}
  let cid='';if(a.customer){const cs=custFind(a.customer);if(cs.length!==1)return {loi:cs.length?'Nhiều khách khớp: '+cs.map(c=>c.code+' '+c.name).join('; '):'Không có công ty khách tên "'+a.customer+'" (có thể là người liên hệ: dùng find_bookings với q).'};cid=cs[0].id;L=L.filter(r=>r.cid===cid);loc.push('khách '+cs[0].name);}
  const sum=fn=>{const l=L.filter(fn);return {don:l.length,MT:mt1(l.reduce((s,r)=>s+r.t,0))};};
  const B=L.filter(r=>ST_DZ_BOOK.includes(r.s));const top={};B.forEach(r=>{top[r.name]=(top[r.name]||0)+r.t;});
  const link='#dash:'+(isInt()?'sales':'')+':'+f+':'+t+':'+(w||'')+':'+(a.segment?String(a.segment).toUpperCase().slice(0,2):'')+':'+sp;
  return {ky:dmy(f)+' – '+dmy(t),loai_ky:per,loc:loc.join(', ')||'tất cả',
   tong_da_dat:sum(r=>ST_DZ_BOOK.includes(r.s)),da_co_xe:sum(r=>stGrp(r)==='ok'),cho_xep_xe:sum(r=>r.s==='hold'),de_nghi_doi_ngay:sum(r=>r.s==='resched'),luu_tam:sum(r=>r.s==='draft'),
   da_giao:sum(r=>r.s==='delivered'),dang_giao_hoac_da_load:sum(r=>r.s==='transit'||r.s==='loaded'),giao_loi:sum(r=>r.s==='failed'),
   con_phai_giao:{...sum(r=>['ok','loaded','transit'].includes(r.s)),dinh_nghia:'đơn đã có xe nhưng chưa giao (Đã xếp xe / Đã load / Đang giao)'},
   bi_tu_choi:sum(r=>stGrp(r)==='rej'),huy_can_ngay:sum(r=>stGrp(r)==='late'),huy_truoc_moc:sum(r=>stGrp(r)==='canc'),don_khan:sum(r=>r.x&&ST_DZ_BOOK.includes(r.s)),
   khach_co_dat:new Set(B.map(r=>r.cid)).size,top_khach:Object.entries(top).sort((x,y)=>y[1]-x[1]).slice(0,5).map(([n,v])=>n+': '+mt1(v)),
   ...(isInt()?{link_bang_thong_ke:link}:{}),ghi_chu:'Tính theo ngày bốc trong kỳ; Tổng đã đặt = Đã có xe + Chờ xếp xe + Đổi ngày + Lưu tạm (không gồm hủy, từ chối).'};}};
STEP.stats='Lấy số liệu thống kê';
// link mở Bảng thống kê đúng kỳ + bộ lọc
{const g0=chatGo;chatGo=function(k){const p=String(k).split(':');if(p[0]!=='dash')return g0(k);if(!isInt()||!canAny('dash.'))return;
 const Z=dzInit();Z.tab=p[1]&&p[1]!==''?p[1]:Z.tab;Z.per='custom';Z.from=p[2];Z.to=p[3];Z.anchor=p[2];Z.wh=p[4]||'';Z.seg=p[5]||'';Z.sp=p[6]||'';Z.key='';go('dash');};}
