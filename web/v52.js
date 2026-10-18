// v3.35: điện thoại – header một dòng, nút bấm ≥ 40px, bộ lọc lịch gom vào nút "Lọc",
// lịch mở từ hôm nay (ngày đã qua gom vào một nút), lưới Đặt hàng thành thẻ từng dòng.
(()=>{const st=document.createElement('style');st.textContent=`
@media (max-width:760px){
 .top{gap:6px;padding:6px 10px}
 .top .logo{font-size:0;gap:0}.top .logo .mark{width:34px;height:34px}
 .top .gsbtn,.top .h52,.top .userbtn{min-width:44px;min-height:44px;justify-content:center}
 .top .h52{display:inline-grid;place-items:center;padding:0;width:44px;height:44px;border-radius:10px;margin-right:0!important;border:0;background:rgba(255,255,255,.08);color:var(--on-navy)}
 .top .h52 svg{width:20px;height:20px}
 .main .btn.sm,.modal .btn.sm{min-height:40px;padding-inline:14px;font-size:12px}
 .main button:not(.cell button):not(.qadd){min-height:40px}
 .main .linkbtn{display:inline-flex;align-items:center}
 .top .logo{min-width:44px;min-height:44px;justify-content:center}
 .navbtn{width:44px;height:44px}
 .cal36bar [data-a="calF"],.cal36bar [data-a="scHelp"]{display:none}
 .cal36bar.fopen [data-a="calF"]{display:inline-flex}
 .cal36bar .f52{display:inline-flex;align-items:center;gap:6px}
 .cal36bar .f52 b{min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--blue);color:var(--on-primary);display:inline-grid;place-items:center;font-size:12px}
 .cal:not(.showpast) .cell.past{display:none!important}
 .cal.showpast .cell.past{display:flex!important}
 .past52{display:flex;width:100%;min-height:44px;align-items:center;justify-content:center;gap:6px;margin:0 0 8px;border:1px dashed var(--inp-line);border-radius:10px;background:var(--sand);color:var(--muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
}
@media (min-width:761px){.cal36bar .f52,.past52{display:none}}
/* Lưới Đặt hàng trên điện thoại: toàn màn hình, mỗi dòng là một thẻ */
@media (max-width:700px){
 .scrim:has(.modal.xl){padding:0}
 .modal.xl{width:100vw!important;height:100dvh!important;max-height:100dvh;min-width:0;min-height:0;border-radius:0;resize:none;overflow:auto;display:block;padding:12px}
 .modal.xl>.g30{display:block}
 .modal.xl .g30>.tbl-wrap{overflow:visible;border:0;background:none}
 .g30 .mhead{position:sticky;top:-12px;z-index:3;background:var(--sand);margin:-12px -12px 8px;padding:10px 12px;flex-wrap:wrap;gap:8px}
 .g30 .g30tabs{display:flex;gap:8px;overflow-x:auto;flex-wrap:nowrap;width:100%}
 .g30 [data-a="g30Zoom"],.g30 [data-a="g30Max"],.g30 .g30tabs>.small{display:none}
 .g30>.row:first-of-type{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}
 .g30>.row:first-of-type .grow{display:none}
 .g30>.row:first-of-type .linkbtn{margin-top:0!important;justify-self:start;min-height:40px}
 .g30>.row:first-of-type .g30cap{grid-column:1/-1}
 .g30 .inp{min-height:44px;font-size:16px}
 .g30 table,.g30 tbody{display:block;width:100%}
 .g30 thead{display:none}
 .g30 tbody tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 10px;padding:12px;margin:0 0 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);position:relative}
 .g30 tbody tr.bad{border:2px solid var(--bad)}.g30 tbody tr.bad td{background:none}
 .g30 tbody td{display:flex;flex-direction:column;gap:4px;padding:0;border:0;min-width:0;white-space:normal}
 .g30 tbody td::before{font-size:12px;font-weight:600;color:var(--muted)}
 .g30 tbody td:nth-child(1){grid-column:1/-1;flex-direction:row;font-size:12px;font-weight:700;color:var(--muted)}
 .g30 tbody td:nth-child(1)::before{content:"DÒNG"}
 .g30 tbody td:nth-child(2)::before{content:"Kho"}
 .g30 tbody td:nth-child(3)::before{content:"Ngày bốc"}
 .g30 tbody td:nth-child(4){grid-column:1/-1}.g30 tbody td:nth-child(4)::before{content:"Khách hàng (mã hoặc tên)"}
 .g30 tbody td:nth-child(5){grid-column:1/-1;font-weight:700;margin-top:-4px}
 .g30 tbody td:nth-child(6)::before{content:"Số tấn (MT)"}
 .g30 tbody td:nth-child(7){grid-column:1/-1}.g30 tbody td:nth-child(7)::before{content:"Địa chỉ giao (không bắt buộc)"}
 .g30 tbody td:nth-child(8)::before{content:"Ref (SO)"}
 .g30 tbody td:nth-child(9){grid-column:1/-1}.g30 tbody td:nth-child(9)::before{content:"Ghi chú"}
 .g30 tbody td:nth-child(10){grid-column:1/-1}.g30 tbody td:nth-child(10):empty{display:none}
 .g30 tbody td:nth-child(11){position:absolute;top:6px;right:6px}
 .g30 tbody td:nth-child(11) .btn{min-width:44px;min-height:44px;padding:0;border:0;background:none;font-size:20px}
 .g30 tbody td .inp{width:100%!important;min-width:0!important}
 .g30>p.small.muted{display:none}
 .g30 .mfoot{position:sticky;bottom:-12px;z-index:3;margin:10px -12px -12px!important;padding:10px 12px calc(12px + env(safe-area-inset-bottom))!important;background:var(--surface);display:grid!important;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr);gap:8px}
 .g30 .mfoot #g30foot{grid-column:1/-1;font-size:13px}
 .g30 .mfoot .btn{min-height:48px;padding-inline:10px;white-space:normal;line-height:1.2}
}
`;document.head.appendChild(st);})();
const HELP_SVG52='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.4M12 17h.01"/></svg>';
const FILTER_SVG52='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>';
const UP_SVG52='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
A.f52=()=>{V.f52=!V.f52;render();};
A.past52=()=>{V.past52=!V.past52;render();};
{const r0=render;render=function(){r0();if(!S)return;
 // Header: nút Hướng dẫn có nhãn cho trình đọc màn hình và biểu tượng riêng cho điện thoại
 const hb=document.querySelector('.top [data-a="guide"]');
 if(hb&&!hb.classList.contains('h52')){hb.classList.add('h52');hb.setAttribute('aria-label','Hướng dẫn sử dụng');hb.dataset.t=hb.textContent.trim();}
 if(hb){const mob=matchMedia('(max-width:760px)').matches;const want=mob?HELP_SVG52:esc(hb.dataset.t||'Hướng dẫn');if(hb.innerHTML!==want)hb.innerHTML=want;}
 const lg=document.querySelector('.top .logo');if(lg&&!lg.getAttribute('aria-label'))lg.setAttribute('aria-label','Đặt Xe – về Lịch');
 // Lịch CS / Logistics: các nút lọc gom vào "Lọc"
 const bar=document.querySelector('.cal36bar');
 if(bar&&bar.querySelector('[data-a="calF"]')&&!bar.querySelector('.f52')){
  const on=bar.querySelector('[data-a="calF"].on');const cur=on&&on.dataset.v!=='all'?on.textContent.trim():'';
  const b=document.createElement('button');b.className='btn ghost sm f52';b.dataset.a='f52';b.setAttribute('aria-expanded',V.f52?'true':'false');
  b.innerHTML=FILTER_SVG52+(cur?`Lọc: ${esc(cur)}`:'Lọc')+(cur?'<b>1</b>':'');
  const g=bar.querySelector('.grow');bar.insertBefore(b,g?g.nextSibling:null);bar.classList.toggle('fopen',!!V.f52);}
 // Lịch: ngày đã qua gom vào một nút (chỉ hiện trên điện thoại)
 const cal=document.querySelector('.cal');
 if(cal){const n=cal.querySelectorAll('.cell.past:not(.pad):not(.wk)').length;cal.classList.toggle('showpast',!!V.past52);
  if(n&&!cal.parentElement.querySelector(':scope>.past52')){const b=document.createElement('button');b.type='button';b.className='past52';b.dataset.a='past52';
   b.setAttribute('aria-expanded',V.past52?'true':'false');b.innerHTML=(V.past52?UP_SVG52+'Ẩn ':'')+(V.past52?`${n} ngày đã qua`:`Xem ${n} ngày đã qua`);cal.parentElement.insertBefore(b,cal);}}
};}
