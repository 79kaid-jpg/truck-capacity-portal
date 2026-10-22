// v3.55: Bảng thống kê trên điện thoại (≤ 700px) – đưa số liệu lên màn hình đầu.
// Tiêu đề 1 dòng + nút Bộ lọc (biểu tượng + số lọc đang bật) + nút ⋯ (Excel, In / PDF, Làm mới, Hướng dẫn); tab một hàng vuốt ngang;
// chọn kỳ một dòng (‹ kỳ › + ô chọn loại kỳ); Kho / Segment / Sales vào bảng Bộ lọc mở từ dưới lên;
// cụm điều khiển dính đầu màn khi cuộn; số trong thẻ tự co; nút trợ lý ẩn khi cuộn xuống. Máy tính giữ nguyên.
(()=>{const st=document.createElement('style');st.textContent=`
.dz67top,.dz67btns,.dz67sel{display:none}
@media (max-width:700px){
 .dz67top{display:block;position:sticky;top:var(--hdr60,56px);z-index:6;margin:-4px -2px 0;padding:6px 2px 8px;background:var(--surface);border-bottom:1px solid var(--line)}
 .dz67top .pagehead{display:flex;align-items:center;gap:8px;margin:0 0 6px;flex-wrap:nowrap}
 .dz67top .pagehead h2{font-size:20px;margin:0;white-space:nowrap;flex:1 1 auto;min-width:0;width:auto!important;overflow:hidden;text-overflow:ellipsis}
 .dz67top .pagehead>.grow{display:none}
 .dz67top .pagehead>.row.dz-noprint,.dz67top .pagehead [data-a="guide"]{display:none!important}
 .dz67btns{display:flex;gap:6px;margin-left:auto;position:relative;flex:none}
 .dz67btns button{min-height:44px!important;height:44px;min-width:44px;white-space:nowrap;border-radius:22px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px}
 .dz67btns button svg{width:18px;height:18px}
 .dz67btns [data-a="dzf67"]{padding:0 10px}
 .dz67btns .n{min-width:20px;padding:0 6px;border-radius:999px;background:var(--navy);color:var(--on-navy);font-size:12px;line-height:20px}
 .dz67menu{position:absolute;right:0;top:50px;z-index:20;min-width:200px;padding:6px;border-radius:12px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);display:flex;flex-direction:column}
 .dz67menu button{justify-content:flex-start;border:0;border-radius:8px;width:100%}
 .dz67top .tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent);margin:0 0 6px}
 .dz67top .tabs::-webkit-scrollbar{display:none}
 .dz67top .tabs button{flex:none;white-space:nowrap;min-height:44px!important}
 .dz67top .dz-bar{margin:0;gap:8px;flex-wrap:nowrap;align-items:center}
 .dz67top .dz-bar .dz-per,.dz67top .dz-bar .f67{display:none!important}
 .dz67top .dz-bar>.row{flex:1;min-width:0;flex-wrap:nowrap}
 .dz67top .dz-bar>.row b{flex:1;text-align:center;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .dz67top .dz-bar>.row .btn{min-height:44px!important;min-width:44px}
 .dz67top .dz-bar>.row [data-k="0"].x67{display:none}
 .dz67sel{display:block;flex:none;min-height:44px;border-radius:22px;padding:0 10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600}
 .dz67top .dz-bar.cus{flex-wrap:wrap}.dz67top .dz-bar.cus .field{flex:1 1 120px}
 .dz-tiles .dz-tile .v{font-size:clamp(18px,6vw,24px);overflow-wrap:anywhere}
 .main:has(.dz67top){padding-bottom:110px}
 body.dz67down #chatFab{transform:translateY(160px);transition:transform .2s}
 #chatFab{transition:transform .2s}
 .dzf67 .chips{display:flex;gap:8px;flex-wrap:wrap}
 .dzf67 .chips button{min-height:44px;padding:0 16px;border-radius:22px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:600}
 .dzf67 .chips button.on{background:var(--navy);color:var(--on-navy);border-color:var(--navy)}
 .dzf67 h4{margin:14px 0 6px;font-size:13px;color:var(--muted)}
}
@media (prefers-reduced-motion:reduce){#chatFab{transition:none}}`;document.head.appendChild(st);})();

const dzPhone67=()=>matchMedia('(max-width:700px)').matches;
const IC67={f:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
 m:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
 x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
 p:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/></svg>',
 r:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>',
 g:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17.5h.01"/></svg>'};
const PER67=[['day','Ngày'],['week','Tuần'],['month','Tháng'],['quarter','Quý'],['year','Năm'],['custom','Tùy chọn']];
const nF67=Z=>(Z.wh?1:0)+(Z.seg?1:0)+(Z.sp?1:0);

{const r0=render;render=function(){r0();if(!S||V.view!=='dash'||!dzPhone67())return;const main=document.querySelector('.main .panel');if(!main||main.querySelector('.dz67top'))return;
 const Z=V.dz;if(!Z)return;const head=main.querySelector(':scope > .pagehead'),tabs=main.querySelector(':scope > .tabs'),bar=main.querySelector(':scope > .dz-bar');if(!head||!tabs)return;
 const top=document.createElement('div');top.className='dz67top';head.parentNode.insertBefore(top,head);top.appendChild(head);top.appendChild(tabs);if(bar)top.appendChild(bar);
 const h2=head.querySelector('h2');if(h2)h2.textContent='Thống kê';
 const n=nF67(Z);const btns=document.createElement('div');btns.className='dz67btns';
 btns.innerHTML=(bar?`<button type="button" data-a="dzf67" aria-label="Bộ lọc${n?', '+n+' đang bật':''}">${IC67.f}${n?`<span class="n">${n}</span>`:''}</button>`:'')+
  `<button type="button" data-a="dzm67" aria-label="Thêm: Excel, In / PDF, Làm mới, Hướng dẫn" aria-expanded="${!!V.dzm67}">${IC67.m}</button>`+
  (V.dzm67?`<div class="dz67menu" role="menu">${Z.tab!=='sys'?`<button type="button" role="menuitem" data-a="dzXlsx">${IC67.x}Tải Excel</button><button type="button" role="menuitem" data-a="dzPrint">${IC67.p}In / PDF</button><button type="button" role="menuitem" data-a="dzRefresh">${IC67.r}Làm mới</button>`:''}${head.querySelector('[data-a="guide"]')?`<button type="button" role="menuitem" data-a="dzg67">${IC67.g}Hướng dẫn màn này</button>`:''}</div>`:'');
 head.appendChild(btns);
 const on=tabs.querySelector('button.on');if(on)tabs.scrollLeft=Math.max(0,on.offsetLeft-tabs.clientWidth/2+on.offsetWidth/2);
 if(bar){bar.querySelectorAll(':scope > .field').forEach(f=>{if(f.querySelector('#dz-w,#dz-s,#dz-sp'))f.classList.add('f67');});
  if(Z.per==='custom')bar.classList.add('cus');
  const per=bar.querySelector('.dz-per');if(per){const sel=document.createElement('select');sel.className='dz67sel';sel.setAttribute('aria-label','Loại kỳ');sel.dataset.dz67='per';
   sel.innerHTML=PER67.map(([k,l])=>`<option value="${k}" ${Z.per===k?'selected':''}>${l}</option>`).join('');bar.appendChild(sel);}
  const lb=bar.querySelector(':scope > .row > b');if(lb&&Z.per!=='custom'){try{const[a,b]=dzRange(Z);const[y,m]=a.split('-');lb.title=lb.textContent;
   lb.textContent=Z.per==='month'?`Tháng ${+m}/${y}`:Z.per==='year'?`Năm ${y}`:Z.per==='quarter'?`Quý ${Math.ceil(+m/3)}/${y}`:a===b?`${WDS[dow(a)]} ${dm(a)}`:`${dm(a)} – ${dm(b)}`;}catch(e){}}
  const td=bar.querySelector('[data-a="dzNav"][data-k="0"]');if(td){try{const[a,b]=dzRange(Z);if(TODAY>=a&&TODAY<=b)td.classList.add('x67');}catch(e){}td.setAttribute('aria-label','Về hôm nay');}}
 const hdr=document.querySelector('.top');if(hdr)document.documentElement.style.setProperty('--hdr60',hdr.getBoundingClientRect().height+'px');};}
A.dzm67=()=>{V.dzm67=!V.dzm67;render();};
A.dzg67=()=>{V.dzm67=false;render();const g=document.querySelector('.main .pagehead [data-a="guide"]');if(g)g.click();};
['dzXlsx','dzPrint','dzRefresh'].forEach(k=>{const o=A[k];if(o)A[k]=(d,el,e)=>{if(V.dzm67){V.dzm67=false;render();}return o(d,el,e);};});
document.addEventListener('click',e=>{if(V.dzm67&&!e.target.closest('.dz67btns')){V.dzm67=false;render();}},true);
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.dz67==='per'&&A.dzPer)A.dzPer({k:el.value});});
// ---- bảng Bộ lọc (mở từ dưới lên) ----
A.dzf67=()=>{V.dzm67=false;V.modal={type:'dzf67'};render();};
A.dzf67set=d=>{V.dz[d.k]=d.v||'';render();};
A.dzf67clr=()=>{const Z=V.dz;Z.wh='';Z.seg='';Z.sp='';render();};
M29.dzf67=function(){const Z=V.dz;const chip=(k,v,l)=>`<button type="button" class="${(Z[k]||'')===v?'on':''}" data-a="dzf67set" data-k="${k}" data-v="${v}" aria-pressed="${(Z[k]||'')===v}">${esc(l)}</button>`;
 const sp=typeof dzSalesSel==='function'?dzSalesSel(Z):'';
 return `<div class="dzf67"><div class="mhead"><h2 style="margin:0">BỘ LỌC</h2>${nF67(Z)?'<button class="linkbtn" data-a="dzf67clr">Bỏ lọc</button>':''}</div>
 <h4>Kho</h4><div class="chips">${chip('wh','','Tất cả')}${WH.map(w=>chip('wh',w.id,w.id+' · '+w.short)).join('')}</div>
 <h4>Segment</h4><div class="chips">${chip('seg','','Toàn bộ')}${SEGS.map(g=>chip('seg',g,SEG_LABEL[g])).join('')}</div>
 ${sp?`<div style="margin-top:12px">${sp}</div>`:''}
 <div class="mfoot"><button class="btn" data-a="close">Xem kết quả</button></div></div>`;};
// ---- nút trợ lý: ẩn khi cuộn xuống ở màn Thống kê ----
{let y0=0;addEventListener('scroll',()=>{const y=scrollY;const dn=S&&V.view==='dash'&&dzPhone67()&&y>y0+4&&y>120;const up=y<y0-4||y<120;if(dn)document.body.classList.add('dz67down');else if(up)document.body.classList.remove('dz67down');y0=y;},{passive:true});}
