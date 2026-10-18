// v3.38: màn Lịch – các tuần đã qua gom thành một dải, nhãn "Hôm nay", số tấn gọn (bỏ ",00"),
// nút "+" đủ lớn trên điện thoại, chừa chỗ cho nút trao đổi nổi.
(()=>{const st=document.createElement('style');st.textContent=`
.past54{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:0;border-bottom:1px solid var(--line);background:var(--sand);color:var(--muted);font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.past54:hover{background:var(--sand-2);color:var(--ink)}.past54 svg{width:16px;height:16px;flex:none}
.cal .cell.today .ctop{flex-wrap:wrap;justify-content:flex-start}.cal .cell.today .ctop .wdmobile{margin-left:auto}.today54{margin-left:0;padding:1px 7px;border-radius:999px;background:var(--blue);color:var(--on-primary);font-size:12px;font-weight:700;white-space:nowrap}
.cwl .v{white-space:nowrap}
.ts36 .wkbars{height:84px}.ts36 .wkbars .wkp{display:block;font-size:12px;font-weight:700;color:var(--ink);margin-bottom:2px}
.main{padding-bottom:96px}
@media (max-width:760px){.past54{display:none}.cell .qadd{width:44px;height:44px;font-size:20px}}
`;document.head.appendChild(st);})();
// số gọn: 225 → "225", 88.5 → "88,5", 30.25 → "30,25"
const n54=n=>{const v=Math.round((+n||0)*100)/100;return v.toLocaleString('vi-VN',{minimumFractionDigits:0,maximumFractionDigits:2});};
const mt54=n=>n54(n)+' MT';
const PAST_SVG54='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const HIDE_SVG54='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>';
// Các hàng (tuần) đầu tháng chỉ gồm ngày đã qua → một dải "N tuần đã qua"; bấm để hiện lại (dùng chung cờ với nút trên điện thoại)
function pastRows54(rows,cols){let k=0;while(k<rows.length&&rows[k].every(d=>!d||d<TODAY))k++;
 if(!k||k===rows.length)return {rows,html:''};
 const ds=rows.slice(0,k).flat().filter(Boolean);const lab=`${k} tuần đã qua (${dm(ds[0])} – ${dm(ds[ds.length-1])})`;
 if(V.past52)return {rows,html:`<button type="button" class="past54" data-a="past52" data-n="0" aria-expanded="true">${HIDE_SVG54}Ẩn ${lab}</button>`};
 return {rows:rows.slice(k),html:`<button type="button" class="past54" data-a="past52" data-n="${ds.length}" aria-expanded="false">${PAST_SVG54}Xem ${lab}</button>`};}
{const r0=render;render=function(){r0();if(!S)return;
 document.querySelectorAll('.cal .cell.today .ctop').forEach(t=>{if(!t.querySelector('.today54')){const b=document.createElement('span');b.className='today54';b.textContent='Hôm nay';const n=t.querySelector('.dnum');if(n)n.after(b);else t.prepend(b);}});
};}
