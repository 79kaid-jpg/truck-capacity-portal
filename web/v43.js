// v3.15: công tắc bắt buộc picking list (Admin), nhắc xác nhận giao, nhóm "Chưa xác nhận giao"
(()=>{const st=document.createElement('style');st.textContent=`
.pkoff{display:inline-flex;align-items:center;gap:4px;margin-right:8px;padding:3px 9px;border-radius:999px;background:#fff4e0;color:#8a5200;border:1px solid #f0c27a;font-size:11.5px;font-weight:700;white-space:nowrap}
.pkcard{border:1.5px solid var(--ink);border-radius:12px;padding:12px 14px;margin:0 0 14px;background:var(--surface)}
.pkcard.off{border-color:#e0861a;background:#fffaf0}.pkcard h4{margin:0 0 6px;font-size:14px}
`;document.head.appendChild(st);})();
const pickOff=()=>!!S&&S.cfg.requirePicking===false;
// Đơn đã load / đang giao chưa xác nhận giao
const shipLate=b=>['loaded','transit'].includes(b.status)&&(b.date<TODAY||(b.eta&&b.eta*60000<Date.now()-(+S.cfg.shipRemindHours||6)*3600000));
if(typeof todo29==='function'){const t0=todo29;todo29=function(b,all){return t0(b,all)||(can('delivery.ship')&&shipLate(b));};}
if(typeof EXC==='object')EXC.ship=['🚚 Chưa xác nhận giao',r=>['loaded','transit'].includes(r.s)&&r.d<TODAY];
{const r0=render;render=function(){r0();if(!S)return;
 // nhãn nhắc trên thanh trên cùng cho Admin / Logistics
 const tb=document.querySelector('.top .userbtn');const has=document.querySelector('.top .pkoff');
 if(pickOff()&&(role()==='admin'||role()==='logistics')){if(tb&&!has){const el=document.createElement('span');el.className='pkoff';el.title='Admin đang tắt bắt buộc CS nhập danh sách cuộn (picking list). Bật lại trong Cấu hình → Chung.';el.textContent='⚠ Tạm bỏ bắt buộc picking list';const g=document.querySelector('.top [data-a="guide"]');tb.parentNode.insertBefore(el,g||tb);}}else if(has)has.remove();
 // Cấu hình → Chung
 if(V.view==='config'&&(V.cfgTab||'general')==='general'){const host=document.querySelector('.main .panel .fgrid');if(host&&!document.querySelector('.pkcard')){
  const C=S.cfg;const isAd=role()==='admin';const off=pickOff();const card=document.createElement('div');card.className='pkcard'+(off?' off':'');
  card.innerHTML=`<h4>Danh sách cuộn (picking list) & xác nhận giao</h4>
   <label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" data-f="cfgb" data-k="requirePicking" ${off?'':'checked'} ${isAd?'':'disabled'}>
    <span><b>CS phải nhập danh sách cuộn trước khi Logistics load hàng</b><br><span class="small muted">${off?'<b style="color:#8a5200">Đang TẮT</b>: Logistics bấm Đã bốc hàng được ngay, không cần CS Xác nhận giao hàng. CS vẫn nhập được nếu có thời gian.':'Đang BẬT: như quy trình chuẩn.'} ${isAd?'':'Chỉ Admin bật/tắt được.'} Mọi lần đổi được ghi nhật ký.</span></span></label>
   <div class="fgrid" style="margin-top:10px">
    <div class="field"><label for="cf-shipRemindHours">Nhắc Logistics xác nhận giao sau giờ dự kiến đến</label><div class="row" style="flex-wrap:nowrap"><input id="cf-shipRemindHours" class="inp num" inputmode="decimal" data-f="cfg" data-k="shipRemindHours" value="${C.shipRemindHours||6}"><span class="muted small">giờ</span></div></div>
    <div class="field"><label for="cf-shipAdminDays">Báo Admin nếu quá ngày bốc mà chưa xác nhận giao</label><div class="row" style="flex-wrap:nowrap"><input id="cf-shipAdminDays" class="inp num" inputmode="decimal" data-f="cfg" data-k="shipAdminDays" value="${C.shipAdminDays||2}"><span class="muted small">ngày</span></div></div></div>
   <p class="small muted" style="margin:6px 0 0">Đơn Đã load / Đang giao quá ngày bốc (hoặc quá giờ dự kiến đến) mà chưa bấm Đã giao / Giao không thành công: hệ thống nhắc Logistics kho đó mỗi ngày một lần (7h–20h).</p>`;
  host.parentNode.insertBefore(card,host);}}};}
