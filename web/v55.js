// v3.42: Kiểm thử trợ lý – bộ câu hỏi chuẩn chạy qua đúng đường đi thật của chatbot (mô hình thật, dữ liệu thật),
// so câu trả lời với đáp án tính trực tiếp từ dữ liệu, chấm điểm, lưu lịch sử để so trước/sau khi đổi mô hình.
(()=>{const st=document.createElement('style');st.textContent=`
#ev55{position:fixed;inset:0;z-index:300;background:rgba(15,20,30,.45);display:flex;align-items:flex-start;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px 16px;overflow:auto}
#ev55 .box{background:var(--surface);color:var(--ink);border-radius:14px;width:min(1180px,100%);padding:18px 20px;display:grid;gap:12px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
#ev55 .hd{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
#ev55 h2{margin:0;font-size:20px}#ev55 .sum{display:flex;flex-wrap:wrap;gap:10px}
#ev55 .k{border:1px solid var(--line);border-radius:10px;padding:8px 12px;min-width:120px}#ev55 .k b{display:block;font-size:22px;font-variant-numeric:tabular-nums}#ev55 .k span{font-size:12px;color:var(--muted)}
#ev55 table{width:100%;border-collapse:collapse;font-size:13px}#ev55 th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);padding:6px 8px;border-bottom:1px solid var(--line)}
#ev55 td{padding:7px 8px;border-bottom:1px solid var(--line);vertical-align:top}#ev55 .tw{overflow-x:auto;max-height:60vh}
#ev55 .p{font-weight:700;white-space:nowrap}#ev55 .p.ok{color:var(--ok,#1e7b45)}#ev55 .p.bad{color:var(--bad,#b3261e)}#ev55 .p.skip{color:var(--muted)}
#ev55 .ans{max-width:420px;white-space:pre-wrap;word-break:break-word}#ev55 .why{color:var(--bad,#b3261e);font-size:12px}
#ev55 .row55{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
`;document.head.appendChild(st);})();

const EV55={run:false,stop:false,res:[],hist:[]};
try{EV55.hist=JSON.parse(localStorage.getItem('ev55-hist')||'[]');}catch(e){}
// ---- tiện ích chấm điểm ----
const ev55Nums=s=>(String(s||'').replace(/\*\*/g,'').match(/\d[\d.,]*/g)||[]).map(x=>{x=x.replace(/[.,]$/,'');
  if(/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(x))x=x.replace(/\./g,'').replace(',','.');else x=x.replace(',','.');return parseFloat(x);}).filter(n=>!isNaN(n));
const ev55Num=v=>{if(typeof v==='number')return v;const m=String(v||'').match(/[\d.,]+/);return m?ev55Nums(m[0])[0]:NaN;};
const ev55HasNum=(ans,t)=>t===0?(/\b0\b/.test(ans)||/kh[oô]ng c[oó]|ch[uư]a c[oó]|kh[oô]ng th[aấ]y/i.test(ans)):ev55Nums(ans).some(n=>Math.abs(n-t)<=Math.max(0.051,Math.abs(t)*0.01));
const ev55Has=(ans,list)=>list.some(x=>fz(ans).includes(fz(x)));
const ev55Day=n=>{let d=addDays(TODAY,n);if(dow(d)===0)d=addDays(d,1);return d;};
// ---- bộ câu hỏi: q (chuỗi hoặc mảng nhiều lượt), tools (một trong các công cụ phải được gọi), truth() → {num} | {text:[…]} | {none:true} | null (bỏ qua) ----
var EV55_SET=()=>{const S0=a=>TOOLS.stats.run(a);
 const top=async()=>{const s=await S0({period:'month'});const t=(s.top_khach||[])[0];return t?t.split(':')[0].trim():null;};
 const anyBk=()=>(S.bookings||[]).filter(b=>visibleBk(b)&&b.status!=='draft'&&b.customerId!=='__other').sort((a,b)=>b.date<a.date?-1:1)[0];
 const lastMonth=()=>{const [y,m]=TODAY.split('-').map(Number);return iso(m===1?y-1:y,m===1?12:m-1,15);};
 return [
 {g:'Tình trạng',q:'Có mấy xe đang giao?',tools:['stats','find_trucks','find_bookings'],truth:async()=>{const h=(await S0({period:'day'})).hien_tai;return {num:h?h.dang_giao.don:(await S0({period:'month'})).dang_giao.don};}},
 {g:'Tình trạng',q:'Có đơn nào đã bốc mà chưa xuất phát không?',tools:['stats','find_bookings'],truth:async()=>{const h=(await S0({period:'day'})).hien_tai;return {num:h?h.da_boc_chua_xuat_phat.don:(await S0({period:'month'})).da_boc_chua_xuat_phat.don};}},
 {g:'Tình trạng',q:'Hôm nay có bao nhiêu đơn đang chờ xếp xe?',tools:['stats','find_bookings'],truth:async()=>({num:(await S0({period:'day'})).cho_xep_xe.don})},
 {g:'Tình trạng',q:'Còn bao nhiêu đơn đã có xe nhưng chưa giao trong tháng này?',tools:['stats'],truth:async()=>({num:(await S0({period:'month'})).con_phai_giao.don})},
 {g:'Tình trạng',q:'Xe nào đã qua ngày bốc mà chưa xác nhận giao?',tools:['find_trucks','find_bookings'],truth:async()=>({num:(await TOOLS.find_trucks.run({state:'late'})).length})},
 {g:'Thống kê',q:'Tháng này có bao nhiêu đơn đã đặt?',tools:['stats'],truth:async()=>({num:(await S0({period:'month'})).tong_da_dat.don})},
 {g:'Thống kê',q:'Tháng này tổng bao nhiêu tấn đã đặt?',tools:['stats'],truth:async()=>({num:ev55Num((await S0({period:'month'})).tong_da_dat.MT)})},
 {g:'Thống kê',q:'Tuần này đã giao xong bao nhiêu đơn?',tools:['stats'],truth:async()=>({num:(await S0({period:'week'})).da_giao.don})},
 {g:'Thống kê',q:'Tháng trước tổng đã đặt bao nhiêu tấn?',tools:['stats'],truth:async()=>({num:ev55Num((await S0({period:'month',date:lastMonth()})).tong_da_dat.MT)})},
 {g:'Thống kê',q:'Kho JD9 tháng này có bao nhiêu đơn?',tools:['stats','find_bookings'],truth:async()=>({num:(await S0({period:'month',wh:'JD9'})).tong_da_dat.don})},
 {g:'Thống kê',q:'Segment Dân dụng tháng này đặt bao nhiêu tấn?',tools:['stats'],truth:async()=>({num:ev55Num((await S0({period:'month',segment:'DD'})).tong_da_dat.MT)})},
 {g:'Thống kê',q:'Tháng này có đơn nào bị từ chối không?',tools:['stats','find_bookings'],truth:async()=>({num:(await S0({period:'month'})).bi_tu_choi.don})},
 {g:'Thống kê',q:'Tháng này có bao nhiêu đơn khẩn?',tools:['stats','find_bookings'],truth:async()=>({num:(await S0({period:'month'})).don_khan.don})},
 {g:'Thống kê',q:'Khách nào đặt nhiều nhất tháng này?',tools:['stats'],truth:async()=>{const t=await top();return t?{text:[t]}:null;}},
 {g:'Khách hàng',q:async()=>{const t=await top();return t?`Khách ${t} tháng này đặt bao nhiêu tấn?`:null;},tools:['stats','find_bookings'],truth:async()=>{const t=await top();return t?{num:ev55Num((await S0({period:'month',customer:t})).tong_da_dat.MT)}:null;}},
 {g:'Khách hàng',q:async()=>{const t=await top();return t?[`Khách ${t} tháng này đặt bao nhiêu đơn?`,'Còn tháng trước thì sao?']:null;},tools:['stats','find_bookings'],truth:async()=>{const t=await top();return t?{num:(await S0({period:'month',date:lastMonth(),customer:t})).tong_da_dat.don}:null;}},
 {g:'Khách hàng',q:async()=>{const t=await top();return t?`Mã khách của ${t} là gì?`:null;},tools:['find_customer','find_bookings','stats'],truth:async()=>{const t=await top();const c=t&&custFind(t)[0];return c?{text:[c.code]}:null;}},
 {g:'Đơn hàng',q:()=>{const b=anyBk();return b?`Đơn ${b.id} đang ở trạng thái gì?`:null;},tools:['booking_detail','find_bookings'],truth:()=>{const b=anyBk();return b?{text:[ST_LABEL[stKey(b)]]}:null;}},
 {g:'Đơn hàng',q:()=>{const b=anyBk();return b?`Đơn ${b.id} giao cho khách nào, bao nhiêu tấn?`:null;},tools:['booking_detail','find_bookings'],truth:()=>{const b=anyBk();return b?{num:Math.round(bkTotal(b)*100)/100,text:[cust(b.customerId)?.name||'']}:null;}},
 {g:'Đơn hàng',q:'Có yêu cầu đặt hàng nào đang chờ xử lý không?',tools:['requests'],truth:()=>({num:(S.reqs||[]).filter(r=>r.status==='new').length})},
 {g:'Năng lực',q:'Ngày mai kho JM2 còn đặt được bao nhiêu tấn?',tools:['capacity'],truth:async()=>{const r=(await TOOLS.capacity.run({date:addDays(TODAY,1),wh:'JM2'}))[0];return r?{num:ev55Num(r.con_dat_duoc_MT)}:null;}},
 {g:'Năng lực',q:()=>`Ngày ${dm(ev55Day(3))} kho JM2 còn chỗ không?`,tools:['capacity'],truth:async()=>{const r=(await TOOLS.capacity.run({date:ev55Day(3),wh:'JM2'}))[0];return r?{num:ev55Num(r.con_dat_duoc_MT)}:null;}},
 {g:'Năng lực',q:'Ngày mai JM2 còn xe nào trống không?',tools:['find_trucks','capacity'],truth:async()=>({num:(await TOOLS.find_trucks.run({date:addDays(TODAY,1),wh:'JM2',state:'empty'})).length})},
 {g:'Hướng dẫn',q:'Làm sao để đổi ngày bốc của một đơn?',tools:['guide'],truth:()=>({text:['đổi ngày','ngày bốc']})},
 {g:'Hướng dẫn',q:'Ngưỡng gần đầy nghĩa là gì?',tools:['guide'],truth:()=>({text:['gần đầy','%']})},
 {g:'Hướng dẫn',q:'Đơn khẩn được tính thế nào?',tools:['guide'],truth:()=>({text:['khẩn']})},
 {g:'Thao tác',q:async()=>{const t=await top();return t?`Tạo đơn cho khách ${t} 30 tấn bốc ngày ${dm(ev55Day(2))} ở JM2`:null;},tools:['fill_order','fill_request'],act:true,truth:()=>({text:['form','lưới','kiểm tra']})},
 {g:'Thao tác',q:'Gợi ý xếp xe cho các đơn chờ ngày mai ở JM2',tools:['suggest_all','suggest_trucks'],act:true,truth:()=>null},
 {g:'Thao tác',q:'Mở lịch ngày mai kho JM2',tools:['open'],act:true,truth:()=>null},
 {g:'Ngoài phạm vi',q:'Thời tiết Vũng Tàu hôm nay thế nào?',tools:[],truth:()=>({none:true})},
];};
// công cụ có thao tác (mở màn, điền form) → chỉ ghi lại khi kiểm thử, không chuyển màn
const EV55_ACT=['open','fill_request','fill_order','suggest_trucks','suggest_all'];
async function ev55One(it){
 const qs=typeof it.q==='function'?await it.q():it.q;if(!qs)return {g:it.g,q:'(thiếu dữ liệu để đặt câu hỏi)',st:'skip'};
 const turns=Array.isArray(qs)?qs:[qs];let truth=null;try{truth=await it.truth();}catch(e){truth=null;}
 const used=[];const saved={};for(const k of Object.keys(TOOLS)){saved[k]=TOOLS[k].run;const r0=TOOLS[k].run;
  TOOLS[k].run=async a=>{used.push(k+(a&&Object.keys(a).length?' '+JSON.stringify(a):''));return EV55_ACT.includes(k)?{da_mo:true,ghi_chu:'Đã mở cho người dùng kiểm tra.'}:r0(a);};}
 const keep=CHAT.msgs;CHAT.msgs=[];const t0=Date.now();let ans='',err='';
 try{for(const q of turns){await chatAsk(q);while(CHAT.busy)await new Promise(r=>setTimeout(r,200));}
  const a=[...CHAT.msgs].reverse().find(m=>m.role==='assistant');ans=a?a.content:'';const e=CHAT.msgs.find(m=>m.role==='err');err=e?e.content:'';}
 finally{for(const k of Object.keys(saved))TOOLS[k].run=saved[k];CHAT.msgs=keep;}
 const names=used.map(u=>u.split(' ')[0]);const why=[];
 if(err)why.push('Lỗi: '+err);if(!ans&&!err)why.push('Không có câu trả lời');
 if(/^\s*\{|"answer"\s*:|"tool"\s*:/.test(ans))why.push('Hiện nguyên JSON');
 if(it.tools.length&&!names.some(n=>it.tools.includes(n)))why.push('Không gọi đúng công cụ ('+it.tools.join(' / ')+')');
 if(!it.tools.length&&names.length)why.push('Gọi công cụ khi không cần');
 if(truth&&ans){if(truth.num!=null&&!ev55HasNum(ans,truth.num))why.push('Sai số liệu (đúng: '+truth.num+')');
  if(truth.text&&!it.act&&!ev55Has(ans,truth.text))why.push('Thiếu ý chính ('+truth.text.join(' / ')+')');}
 return {g:it.g,q:turns.join(' → '),ans,tools:used,why,st:why.length?'bad':'ok',ms:Date.now()-t0};}
async function ev55Run(){if(EV55.run)return;EV55.run=true;EV55.stop=false;EV55.res=[];ev55Draw();
 const set=EV55_SET();for(const it of set){if(EV55.stop)break;EV55.res.push({g:it.g,q:'…',st:'run'});ev55Draw();
  let r;try{r=await ev55One(it);}catch(e){r={g:it.g,q:String(it.q),ans:'',tools:[],why:['Lỗi kiểm thử: '+e.message],st:'bad'};}
  EV55.res[EV55.res.length-1]=r;ev55Draw();}
 const sc=ev55Score();EV55.hist.unshift({at:new Date().toISOString(),ok:sc.ok,n:sc.n,model:EV55.model||''});EV55.hist=EV55.hist.slice(0,10);
 try{localStorage.setItem('ev55-hist',JSON.stringify(EV55.hist));}catch(e){}
 EV55.run=false;ev55Draw();chatRender&&chatRender();}
const ev55Score=()=>{const d=EV55.res.filter(r=>r.st==='ok'||r.st==='bad');return {ok:d.filter(r=>r.st==='ok').length,n:d.length,skip:EV55.res.filter(r=>r.st==='skip').length};};
function ev55Tsv(){return ['Nhóm\tCâu hỏi\tKết quả\tLý do\tCông cụ đã gọi\tCâu trả lời\tThời gian (s)',...EV55.res.map(r=>[r.g,r.q,r.st==='ok'?'ĐẠT':r.st==='skip'?'BỎ QUA':'TRƯỢT',(r.why||[]).join('; '),(r.tools||[]).join(' | '),String(r.ans||'').replace(/\s+/g,' '),r.ms?(r.ms/1000).toFixed(1):''].join('\t'))].join('\n');}
function ev55Draw(){let el=document.getElementById('ev55');if(!EV55.open){if(el)el.remove();return;}
 if(!el){el=document.createElement('div');el.id='ev55';el.addEventListener('click',ev55Click);document.body.appendChild(el);}
 const sc=ev55Score();const n=EV55_SET().length;const last=EV55.hist[EV55.run?0:1];
 el.innerHTML=`<div class="box" role="dialog" aria-label="Kiểm thử trợ lý"><div class="hd"><h2>Kiểm thử trợ lý</h2><div class="row55">
  ${EV55.run?`<button class="btn ghost sm" data-e="stop">Dừng</button>`:`<button class="btn sm" data-e="run">Chạy ${n} câu hỏi</button>`}
  <button class="btn ghost sm" data-e="copy" ${EV55.res.length?'':'disabled'}>Copy kết quả</button><button class="btn ghost sm" data-e="close" aria-label="Đóng">✕</button></div></div>
  <p class="small muted" style="margin:0">Chạy bộ câu hỏi chuẩn qua đúng chatbot đang dùng (cùng mô hình AI, cùng dữ liệu, bằng tài khoản của bạn). Đáp án đúng được tính trực tiếp từ dữ liệu. Các thao tác mở màn / điền form chỉ được ghi lại, không thực hiện. Mỗi câu dùng 1 lượt trợ lý (câu nhiều lượt dùng nhiều hơn).</p>
  <div class="sum"><div class="k"><b>${sc.n?Math.round(sc.ok*100/sc.n)+'%':'–'}</b><span>Đạt ${sc.ok}/${sc.n}${sc.skip?' · bỏ qua '+sc.skip:''}${EV55.model?' · '+esc(EV55.model):''}</span></div>
   ${last?`<div class="k"><b>${Math.round(last.ok*100/Math.max(1,last.n))}%</b><span>Lần trước · ${new Date(last.at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}${last.model?' · '+esc(last.model):''}</span></div>`:''}
   ${EV55.run?`<div class="k"><b>${EV55.res.length}/${n}</b><span>Đang chạy…</span></div>`:''}</div>
  <div class="tw"><table><thead><tr><th>#</th><th>Nhóm</th><th>Câu hỏi</th><th>Kết quả</th><th>Câu trả lời của trợ lý</th><th>Công cụ đã gọi</th></tr></thead><tbody>
  ${EV55.res.map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.g)}</td><td>${esc(r.q)}</td><td><span class="p ${r.st}">${r.st==='ok'?'Đạt':r.st==='skip'?'Bỏ qua':r.st==='run'?'Đang chạy…':'Trượt'}</span>${(r.why||[]).map(w=>`<div class="why">${esc(w)}</div>`).join('')}</td><td class="ans">${esc(r.ans||'')}</td><td class="small muted">${(r.tools||[]).map(esc).join('<br>')}</td></tr>`).join('')||`<tr><td colspan="6" class="muted">Bấm "Chạy" để bắt đầu. Kết quả hiện dần từng câu.</td></tr>`}
  </tbody></table></div></div>`;}
async function ev55Click(e){const b=e.target.closest('[data-e]');if(e.target.id==='ev55'&&!EV55.run){EV55.open=false;return ev55Draw();}if(!b)return;const k=b.dataset.e;
 if(k==='close'){if(EV55.run)EV55.stop=true;EV55.open=false;ev55Draw();}
 else if(k==='run')ev55Run();else if(k==='stop')EV55.stop=true;
 else if(k==='copy'){const t=ev55Tsv();try{await navigator.clipboard.writeText(t);toast('Đã copy '+EV55.res.length+' dòng kết quả');}catch(err){toast('Trình duyệt chặn copy');}}}
A.ev55Open=()=>{EV55.open=true;ev55Draw();};
// nút mở trong khung cấu hình Trợ lý (Admin)
{const r0=render;render=function(){r0();if(!S||role()!=='admin')return;const card=document.querySelector('.chatcfg');if(!card||card.querySelector('[data-a="ev55Open"]'))return;
 const b=document.createElement('button');b.type='button';b.className='btn ghost sm';b.dataset.a='ev55Open';b.textContent='Kiểm thử trợ lý';b.style.marginTop='8px';card.appendChild(b);};}
