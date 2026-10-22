/* v3.53 – Khung thống kê Xe: tô màu ô ngày theo %.
   Ngày đầy (đỏ đậm) / gần đầy ≥ 90% (đỏ nhạt); xe non tải 2 mức: < 50% (xanh đậm hơn), 50–69% (xanh rất nhạt).
   Mỗi ô hiện %, sắp theo ngày tăng dần. Ngưỡng 90% chỉ áp dụng cho danh sách này. */
(()=>{const st=document.createElement('style');st.textContent=`
.ts36 .chips button.c65{display:inline-flex;gap:4px;align-items:baseline}
.ts36 .chips button.c65 .p65{font-size:12px;font-weight:700}
.ts36 .chips button.c65-full{background:var(--full-bg);color:var(--full-ink);border-color:var(--full-bg)}
.ts36 .chips button.c65-near{background:var(--bad-bg);color:var(--bad);border-color:var(--bad)}
.ts36 .chips button.c65-ulo{background:var(--ulo-bg);color:var(--ulo-ink);border-color:var(--ulo-bg)}
.ts36 .chips button.c65-umid{background:var(--umid-bg);color:var(--umid-ink);border-color:var(--ulo-bg)}
`;document.head.appendChild(st);})();

const NEAR65=0.9;
{const sp0=statsPanel;statsPanel=function(){const h=sp0();
 if(!S||role()==='customer'||role()==='sales'||V.statMode==='cust')return h;
 const tp=document.createElement('template');tp.innerHTML=h;const box=tp.content.querySelector('.ts36');if(!box)return h;
 const fm=(+S.cfg.fillMin||70)/100;
 const pc=x=>Math.round(x*100)+'%';
 box.querySelectorAll('.chips').forEach(c=>{
  const lb=c.previousElementSibling?c.previousElementSibling.textContent:'';
  const kind=/gần đầy/i.test(lb)?'full':/non tải/i.test(lb)?'under':'';if(!kind)return;
  let bs=[...c.querySelectorAll('button[data-d]')].map(b=>{const w=b.dataset.w,d=b.dataset.d,mm=dayM(w,d);let p=0,cls='';
   if(kind==='full'){p=mm.cap?(mm.loaded+mm.held)/mm.cap:0;cls=mm.status==='full'||p>=0.999?'full':p>=NEAR65?'near':'';}
   else{const ts=mm.trucks.map(t=>[loadOf(t.code),t.cap]).filter(([l,cp])=>l>0.001&&cp&&l/cp<fm);p=ts.length?ts.reduce((s,[l,cp])=>s+l/cp,0)/ts.length:0;cls=p<0.5?'ulo':'umid';}
   return{b,w,d,p,cls};}).filter(x=>x.cls);
  if(!bs.length){c.parentElement.remove();return;}
  bs.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.w<b.w?-1:1);
  c.innerHTML='';bs.forEach(x=>{x.b.classList.add('c65','c65-'+x.cls);x.b.insertAdjacentHTML('beforeend',`<span class="p65 num">${pc(x.p)}</span>`);
   const tt=(kind==='full'?(x.cls==='full'?'Đã đầy':'Gần đầy')+' · '+pc(x.p)+' năng lực':'Tải TB xe non tải '+pc(x.p));
   x.b.title=tt+(x.b.title?' · '+x.b.title:'');x.b.setAttribute('aria-label',dm(x.d)+' '+tt);c.appendChild(x.b);});
  if(kind==='full'){const l=c.previousElementSibling;if(l)l.textContent='Ngày đầy / gần đầy (≥ 90%)';}
 });
 return tp.innerHTML;};}
