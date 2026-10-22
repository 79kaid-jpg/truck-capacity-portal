/* v3.54 – Điện thoại: thanh menu dưới không che nút chân cửa sổ (Đặt hàng: Lưu tạm / Đặt & gửi Logistics…).
   Lưới Đặt hàng khi đặt theo ngày giao: thẻ điện thoại ghi "Ngày giao", địa chỉ giao bắt buộc (bỏ "không bắt buộc"). */
(()=>{const st=document.createElement('style');st.textContent=`
body:has(.scrim) .bnav61{display:none!important}
@media (max-width:760px){
 .g30.d66 tbody td:nth-child(3)::before{content:"Ngày giao"}
 .g30.d66 tbody td:nth-child(7)::before{content:"Địa chỉ giao *"}
}`;document.head.appendChild(st);})();

function deco66(){if(!S||!V.modal||V.modal.type!=='grid'||typeof DELIV63!=='function'||!DELIV63())return;
 const g=document.querySelector('.g30');if(!g)return;g.classList.add('d66');
 g.querySelectorAll('input[data-g="addr"]').forEach(i=>{if(i.placeholder==='nhập khi xác nhận giao hàng')i.placeholder='bắt buộc – để tính khu vực, ngày bốc';});
 g.querySelectorAll('thead th span').forEach(s=>{if(s.textContent==='(không bắt buộc)')s.textContent='*';});}
{const r0=render;render=function(){r0();deco66();};}
{const f0=refresh30;refresh30=function(){f0();deco66();};}
