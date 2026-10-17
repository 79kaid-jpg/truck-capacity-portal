/* v3.8 – Admin "Xem như khách hàng" (chỉ xem) + Hướng dẫn sử dụng (khung bên phải, tìm kiếm, theo vai trò, ảnh minh họa). */
(()=>{const st=document.createElement('style');st.textContent=`
.cvbar{position:sticky;top:0;z-index:40;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#e0861a;color:#fff;padding:8px 16px;font-size:13.5px}
.cvbar .btn{background:#fff;color:#7a4300;border-color:#fff}
#guide{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:var(--surface);border-left:1.5px solid var(--ink);box-shadow:var(--shadow);z-index:65;display:flex;flex-direction:column}
#guide .gh{display:flex;gap:8px;align-items:center;padding:10px 14px;border-bottom:1px solid var(--line)}
#guide .gb{display:grid;grid-template-columns:170px 1fr;min-height:0;flex:1}
#guide nav{overflow:auto;border-right:1px solid var(--line);padding:8px 6px;font-size:13px}
#guide nav b{display:block;margin:10px 6px 4px;font-size:11px;letter-spacing:.06em;color:var(--muted)}
#guide nav a{display:block;padding:4px 8px;border-radius:6px;color:inherit;text-decoration:none;cursor:pointer}#guide nav a.on,#guide nav a:hover{background:var(--blue-bg)}
#guide article{overflow:auto;padding:14px 18px 40px;font-size:14px;line-height:1.55}
#guide article h2{font-size:18px;margin:4px 0 8px}#guide article h3{font-size:15px;margin:16px 0 6px}
#guide article img{max-width:100%;border:1px solid var(--line);border-radius:8px;margin:8px 0}
#guide article .tip{background:var(--blue-bg);border-radius:8px;padding:8px 10px;margin:8px 0}
#guide article .warn{background:var(--bad-bg);border-radius:8px;padding:8px 10px;margin:8px 0}
#guide article mark{background:#ffe9a8}
@media (max-width:700px){#guide .gb{grid-template-columns:1fr}#guide nav{display:none}}
@media print{body>*:not(#guide){display:none!important}#guide{position:static;width:auto;border:0;box-shadow:none}#guide nav,#guide .gh{display:none}#guide article{overflow:visible}}
`;document.head.appendChild(st);})();

/* ---------- Xem như khách hàng ---------- */
function cvBar(){const cv=S.custView;const left=Math.min(60,Math.max(0,Math.floor(cv.expiresAt/60-S.clock)));
 return `<div class="cvbar" role="status"><span>👁 Đang <b>Xem như khách hàng: ${esc(cv.name)}</b> — chỉ xem, đúng giao diện khách thấy. Mọi thao tác bị khóa.</span><span class="small">Còn ${left} phút</span><span class="grow"></span><button class="btn sm" data-a="cvStop">Thoát xem như khách</button></div>`;}
{const m0=mutate;mutate=async function(fn,args,opts){if(S&&S.custView&&fn!=='cust_view_stop'){toast('Đang ở chế độ Xem như khách (chỉ xem). Bấm "Thoát xem như khách" trước khi thao tác.');return;}return m0(fn,args,opts);};}
Object.assign(A,{
 cvStart:d=>{const c=cust(d.id);mutate('cust_view_start',{p_customer:d.id},{ok:r=>{V.view='calendar';V.modal=null;V.asg=null;V.menu=false;if(typeof GS!=='undefined'&&GS.open)gsClose();render();toast(`Đang xem như khách ${r.name} trong ${r.minutes} phút (chỉ xem)`);}});},
 cvStop:()=>mutate('cust_view_stop',{},{ok:()=>{V.view='users';V.uTab='customers';V.modal=null;render();toast('Đã thoát chế độ xem như khách');}})
});
{const r0=render;render=function(){r0();document.body.classList.toggle('cv',!!(S&&S.custView));};}

/* ---------- Hướng dẫn sử dụng ---------- */
const GD={html:null,loading:false,q:'',cur:''};
function guideOpen(sec){V.guide=true;GD.cur=sec||GD.cur||({cs:'cs-day',logistics:'log-day',sales:'sales-read',admin:'start',customer:'cust-start'}[role()]||'start');
 if(GD.html==null&&!GD.loading){GD.loading=true;fetch('guide.html',{cache:'no-cache'}).then(r=>r.text()).then(t=>{GD.html=t;GD.loading=false;guideRender();}).catch(()=>{GD.loading=false;GD.html='<section id="start" data-t="Hướng dẫn"><h2>Không tải được hướng dẫn</h2><p>Kiểm tra mạng rồi thử lại.</p></section>';guideRender();});}
 guideRender();}
function guideClose(){V.guide=false;const g=document.getElementById('guide');if(g)g.remove();}
function guideRender(){if(!V.guide)return;let g=document.getElementById('guide');if(!g){g=document.createElement('aside');g.id='guide';g.setAttribute('aria-label','Hướng dẫn sử dụng');document.body.appendChild(g);}
 if(GD.html==null){g.innerHTML='<div class="gh"><b class="grow">HƯỚNG DẪN SỬ DỤNG</b><button class="btn ghost sm" data-gd="x">✕</button></div><div class="empty">Đang tải…</div>';return;}
 const doc=new DOMParser().parseFromString(GD.html,'text/html');const secs=[...doc.querySelectorAll('section[id]')];const q=fold30(GD.q.trim());
 const hit=s=>!q||fold30(s.textContent).includes(q);const groups={};secs.forEach(s=>{const k=s.dataset.g||'Chung';(groups[k]=groups[k]||[]).push(s);});
 if(!secs.some(s=>s.id===GD.cur))GD.cur=secs[0]?secs[0].id:'';
 const list=q?secs.filter(hit):secs.filter(s=>s.id===GD.cur);
 let body=list.map(s=>s.outerHTML).join('<hr>')||'<p class="muted">Không thấy mục nào có từ này.</p>';
 if(q){const re=new RegExp('('+GD.q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');body=body.replace(/>([^<]+)</g,(m,t)=>'>'+t.replace(re,'<mark>$1</mark>')+'<');}
 g.innerHTML=`<div class="gh"><b>HƯỚNG DẪN</b><input class="inp" style="flex:1" placeholder="Tìm trong hướng dẫn (không dấu cũng được)" value="${esc(GD.q)}" data-gd="q" aria-label="Tìm trong hướng dẫn"><button class="btn ghost sm" data-gd="print" title="In / PDF">In</button><button class="btn ghost sm" data-gd="x" aria-label="Đóng hướng dẫn">✕</button></div>
 <div class="gb"><nav>${Object.entries(groups).map(([k,l])=>`<b>${esc(k.toUpperCase())}</b>${l.map(s=>`<a class="${s.id===GD.cur&&!q?'on':''} ${hit(s)?'':'muted'}" data-gd="s" data-s="${s.id}">${esc(s.dataset.t||s.id)}</a>`).join('')}`).join('')}</nav><article>${body}</article></div>`;
 const inp=g.querySelector('[data-gd="q"]');if(inp&&GD.focus){inp.focus();inp.setSelectionRange(GD.q.length,GD.q.length);GD.focus=false;}}
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-gd]');if(!el)return;const k=el.dataset.gd;
 if(k==='x')guideClose();else if(k==='s'){GD.cur=el.dataset.s;GD.q='';guideRender();const a=document.querySelector('#guide article');if(a)a.scrollTop=0;}
 else if(k==='print'){const q=GD.q;GD.q='';const doc=new DOMParser().parseFromString(GD.html,'text/html');const a=document.querySelector('#guide article');if(a){a.innerHTML=[...doc.querySelectorAll('section[id]')].map(s=>s.outerHTML).join('');setTimeout(()=>{window.print();GD.q=q;guideRender();},100);}}
 else if(k==='link'){GD.cur=el.dataset.s;GD.q='';guideRender();}});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.gd==='q'){GD.q=e.target.value;GD.focus=true;clearTimeout(GD.t);GD.t=setTimeout(guideRender,200);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&V.guide&&!V.modal){guideClose();}});
A.guide=d=>{V.guide&&!d.s?guideClose():guideOpen(d.s);};
// nút ❓ trên thanh trên cùng + link "Hướng dẫn màn này"
const GD_VIEW={calendar:'cal',day:'log-xep',booking:'cs-xuly',bookings:'cs-xuly',approvals:'log-xep',fleet:'log-fleet',dash:'dash',config:'admin-cfg',users:'admin-users',profile:'start-login',notifs:'start-rules'};
{const r0=render;render=function(){r0();if(!S)return;const tb=document.querySelector('.top .userbtn');if(tb&&!document.querySelector('.top [data-a="guide"]')){const b=document.createElement('button');b.className='btn ghost sm';b.dataset.a='guide';b.title='Hướng dẫn sử dụng';b.textContent='❓ Hướng dẫn';b.style.marginRight='8px';tb.parentNode.insertBefore(b,tb);}
 const h=document.querySelector('.main .cal36bar')||document.querySelector('.main .pagehead')||document.querySelector('.main .calhead');if(h&&!h.querySelector('[data-a="guide"]')&&GD_VIEW[V.view]){const l=document.createElement('button');l.className='linkbtn small';l.dataset.a='guide';l.dataset.s=GD_VIEW[V.view];l.textContent='Hướng dẫn màn này';l.style.marginLeft='10px';h.appendChild(l);}
 if(V.guide)guideRender();};}
if(typeof SC!=='undefined'){SC.push(['goGuide','global','Mở / đóng Hướng dẫn','G H',()=>A.guide({})]);SC_BY.goGuide=SC[SC.length-1];}
