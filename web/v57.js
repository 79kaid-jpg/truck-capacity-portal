// v3.44: trợ lý chính xác hơn (dùng cho cả mô hình miễn phí và Claude):
// - mỗi công cụ chỉ nhận tham số có thật; tham số lạ bị bỏ và báo lại cho mô hình
// - phân biệt rõ "tạo đơn theo NGÀY BỐC" (lưới Đặt hàng) và "yêu cầu theo NGÀY GIAO"
// - tra Hướng dẫn: ưu tiên từ hiếm, tiêu đề, cụm từ đúng nguyên văn
const ARGS57={stats:['period','date','date_from','date_to','wh','segment','sales','customer'],
 find_bookings:['q','customer','status','date','date_from','date_to','wh','region','urgent','sort','limit','period'],
 capacity:['date','date_to','wh'],booking_detail:['id'],requests:['date','status'],guide:['q'],
 fill_request:['customer','wh','date','deliver','tons','body'],open:['kind','id','date','wh','code'],find_customer:['q'],
 find_trucks:['date','wh','min_free','state'],truck_detail:['code','short','date','wh'],suggest_trucks:['booking_id'],
 suggest_all:['date','wh'],fill_order:['customer','wh','date','tons','note']};
for(const[k,keys]of Object.entries(ARGS57)){const t=TOOLS[k];if(!t)continue;const r0=t.run;t.args=keys;
 t.run=async a=>{a=a&&typeof a==='object'?a:{};const bad=Object.keys(a).filter(x=>!keys.includes(x));const ok={};keys.forEach(x=>{if(a[x]!=null&&a[x]!=='')ok[x]=a[x];});
  const res=await r0(ok);if(!bad.length)return res;
  const note='Đã bỏ qua tham số không hỗ trợ: '+bad.join(', ')+'. Công cụ này chỉ nhận: '+keys.join(', ')+'.';
  return Array.isArray(res)?{ket_qua:res,canh_bao:note}:{...res,canh_bao:note};};}
// tạo đơn theo ngày bốc → lưới Đặt hàng; yêu cầu theo ngày giao → form Yêu cầu
if(TOOLS.fill_order)TOOLS.fill_order.d='NỘI BỘ: "tạo đơn", "đặt hàng", "đặt xe", "giữ chỗ" … theo NGÀY BỐC → mở lưới Đặt hàng điền sẵn (người dùng tự lưu). args: customer, wh, date (= NGÀY BỐC), tons, note';
if(TOOLS.fill_request){TOOLS.fill_request.d='Mở form Yêu cầu đặt hàng theo NGÀY GIAO (hàng đến khách) – dùng khi người dùng nói "yêu cầu", "giao ngày …", hoặc khi không có lưới Đặt hàng (khách hàng, Sales). KHÔNG dùng khi người dùng nói "bốc ngày …" mà có công cụ fill_order. args: customer (nội bộ: tên/mã khách), wh, date (NGÀY GIAO), tons, body (CHÉP NGUYÊN VĂN câu người dùng)';
 const r1=TOOLS.fill_request.run;TOOLS.fill_request.run=async a=>{const lastU=[...CHAT.msgs].reverse().find(m=>m.role==='user');
  const u=lastU?' '+fz(lastU.content)+' ':'';
  if(/\sboc\s/.test(u)&&!/\sgiao\s/.test(u)&&TOOLS.fill_order&&(!TOOLS.fill_order.ok||TOOLS.fill_order.ok()))
   return {loi:'Người dùng nói NGÀY BỐC → dùng công cụ fill_order (lưới Đặt hàng) với date = ngày bốc, không dùng form Yêu cầu (tính theo ngày giao).'};
  return r1(a);};}
// tra Hướng dẫn: điểm = Σ (số lần xuất hiện × độ hiếm của từ) + thưởng tiêu đề + thưởng cụm từ nguyên văn
if(TOOLS.guide){TOOLS.guide.run=async a=>{const src=role()==='customer'?'guide-kh.html':'guide.html';let html=(typeof GD!=='undefined'&&GD.src===src&&GD.html)||'';
 if(!html){try{html=await (await fetch(src)).text();}catch(e){return {loi:'Không tải được hướng dẫn'};}}
 const doc=new DOMParser().parseFromString(html,'text/html');const q=fz(a.q||'');const ws=[...new Set(q.split(/\s+/).filter(w=>w.length>1))];
 const S0=[...doc.querySelectorAll('section[id]')].filter(s=>s.id).map(s=>({id:s.id,tieu_de:s.dataset.t||'',t:fz(s.textContent),tt:fz((s.dataset.t||'')+' | '+(s.dataset.k||'')),raw:s.textContent.replace(/\s+/g,' ').trim(),bold:[...s.querySelectorAll('b,strong')].map(b=>fz(b.textContent)).join(' | ')}));
 const N=S0.length||1;const idf=w=>Math.log(1+N/(1+S0.filter(s=>s.t.includes(w)).length));
 const bi=ws.slice(0,-1).map((w,i)=>w+' '+ws[i+1]);
 const sc=S0.map(s=>{let n=0;for(const w of ws){const c=s.t.split(w).length-1;n+=Math.min(c,5)*idf(w);if(s.tt.includes(w))n+=3*idf(w);}
  for(const b of bi){if(s.t.includes(b))n+=4;if(s.bold.includes(b))n+=12;}for(const w of ws)if(s.bold.split(' | ').includes(w))n+=6*idf(w);if(q.length>3&&s.t.includes(q))n+=8;if(q.length>3&&s.tt.includes(q))n+=25;return {s,n};}).filter(x=>x.n>0).sort((x,y)=>y.n-x.n).slice(0,3);
 // nội dung: lấy đoạn quanh chỗ khớp đầu tiên để mô hình đọc đúng phần cần
 return sc.map(({s})=>{const at=Math.max(0,[q,...bi,...ws].map(w=>s.t.indexOf(w)).filter(i=>i>=0).sort((x,y)=>x-y)[0]||0);const st=Math.max(0,at-300);
  return {id:s.id,tieu_de:s.tieu_de,noi_dung:(st?'…':'')+s.raw.slice(st,st+1400)};});};}
// lời nhắc hệ thống: thêm quy tắc chống tự thêm bộ lọc
{const p0=sysPrompt;sysPrompt=function(){return p0.apply(this,arguments)+`
QUY TẮC BỘ LỌC: chỉ truyền wh / segment / sales / customer / region khi người hỏi NÊU RÕ (tên kho, "dân dụng", "dự án", tên Sales, tên khách…). Không tự thêm bộ lọc từ vai trò hay màn đang xem. Chỉ dùng tham số có trong mô tả công cụ.
SỐ LIỆU: chép đúng số và đơn vị công cụ trả về (đã định dạng kiểu Việt Nam, ví dụ "980,6 MT"); không tự đổi sang "980.60".`;};}
