/* v3.8 – Admin "Xem như khách hàng" (chỉ xem) + Hướng dẫn sử dụng (khung bên phải, tìm kiếm, theo vai trò, ảnh minh họa). */
(()=>{const st=document.createElement('style');st.textContent=`
.cvbar{position:sticky;top:0;z-index:40;display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:var(--alert);color:#fff;padding:8px 16px;font-size:13.5px}
.cvbar .btn{background:#fff;color:var(--alert);border-color:#fff}
#guide{position:fixed;top:0;right:0;bottom:0;width:min(560px,100vw);background:var(--surface);border-left:1.5px solid var(--ink);box-shadow:var(--shadow);z-index:65;display:flex;flex-direction:column}
#guide .gh{display:flex;gap:8px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line)}
#guide .gb{display:grid;grid-template-columns:230px 1fr;min-height:0;flex:1}
#guide nav{overflow:auto;border-right:1px solid var(--line);background:var(--ground);padding:12px 12px 24px 16px;font-size:13px;line-height:1.35}
#guide nav b{display:block;margin:16px 4px 6px;padding-top:10px;border-top:1px solid var(--line);}#guide nav b:first-child{margin-top:2px;padding-top:0;border-top:0}#guide nav b{font-size:12px;letter-spacing:.06em;color:var(--muted)}
#guide nav a{display:block;padding:6px 12px;margin:1px 0;border-radius:6px;border-left:3px solid transparent;color:inherit;text-decoration:none;cursor:pointer}#guide nav a:hover{background:var(--blue-bg)}#guide nav a.on{background:var(--blue-bg);border-left-color:var(--blue);font-weight:600}
#guide article{overflow:auto;padding:16px 24px 40px;font-size:14px;line-height:1.55}
#guide article h2{font-size:18px;margin:4px 0 8px}#guide article h3{font-size:15px;margin:16px 0 6px}
#guide article img{max-width:100%;border:1px solid var(--line);border-radius:8px;margin:8px 0}
#guide article .tip{background:var(--blue-bg);border-radius:8px;padding:8px 10px;margin:8px 0}
#guide article .warn{background:var(--bad-bg);border-radius:8px;padding:8px 10px;margin:8px 0}
#guide article mark{background:var(--note-bg)}
#guide .grip{position:absolute;left:-5px;top:0;bottom:0;width:10px;cursor:ew-resize;z-index:2}#guide .grip:hover,#guide.drag .grip{background:color-mix(in srgb,var(--blue) 35%,transparent)}
#guide.drag{user-select:none}#guide.max{left:0;width:auto!important;border-left:0}#guide .gsel{display:none;margin:8px 14px 0}
#guide.narrow .gb{grid-template-columns:1fr}#guide.narrow nav{display:none}#guide.narrow .gsel{display:block}
#guide article{font-size:var(--gfs,14px)}#guide article h2{font-size:calc(var(--gfs,14px)*1.3)}#guide article h3{font-size:calc(var(--gfs,14px)*1.08)}
@media (max-width:700px){#guide{width:100vw!important}#guide .gb{grid-template-columns:1fr}#guide nav{display:none}#guide .gsel{display:block}#guide .grip{display:none}}
@media print{body>*:not(#guide){display:none!important}#guide{position:static;width:auto;border:0;box-shadow:none}#guide nav,#guide .gh{display:none}#guide article{overflow:visible}}
`;document.head.appendChild(st);})();

/* ---------- Xem như khách hàng ---------- */
function cvBar(){const cv=S.custView;const left=Math.min(60,Math.max(0,Math.floor(cv.expiresAt/60-S.clock)));
 return `<div class="cvbar" role="status"><span>👁 Đang <b>Xem như khách hàng: ${esc(cv.name)}</b> — chỉ xem, đúng giao diện khách thấy. Mọi thao tác bị khóa.</span><span class="small">Còn ${left} phút</span><span class="grow"></span><button class="btn sm" data-a="cvStop">Thoát xem như khách</button></div>`;}
{const m0=mutate;mutate=async function(fn,args,opts){if(S&&S.custView&&fn!=='cust_view_stop'){toast('Đang ở chế độ Xem như khách (chỉ xem). Bấm "Thoát xem như khách" trước khi thao tác.');return;}return m0(fn,args,opts);};}
Object.assign(A,{
 cvStart:d=>{const c=cust(d.id);mutate('cust_view_start',{p_customer:d.id},{ok:r=>{if(V.guide)guideClose();V.view='calendar';V.modal=null;V.asg=null;V.menu=false;if(typeof GS!=='undefined'&&GS.open)gsClose();render();toast(`Đang xem như khách ${r.name} trong ${r.minutes} phút (chỉ xem)`);}});},
 cvStop:()=>mutate('cust_view_stop',{},{ok:()=>{if(V.guide)guideClose();V.view='users';V.uTab='customers';V.modal=null;render();toast('Đã thoát chế độ xem như khách');}})
});
{const r0=render;render=function(){r0();document.body.classList.toggle('cv',!!(S&&S.custView));};}

/* ---------- Hướng dẫn sử dụng ---------- */
const GD={html:null,loading:false,q:'',cur:''};
try{const o=JSON.parse(localStorage.getItem('guide-ui')||'{}');GD.w=o.w;GD.fs=o.fs;GD.max=!!o.max;}catch(e){}
const gSave=()=>{try{localStorage.setItem('guide-ui',JSON.stringify({w:GD.w,fs:GD.fs,max:GD.max}));}catch(e){}};
function gSize(){const g=document.getElementById('guide');if(!g)return;const w=Math.max(360,Math.min(innerWidth*0.95,GD.w||560));g.style.width=GD.max?'':w+'px';g.classList.toggle('max',!!GD.max);
 g.classList.toggle('narrow',!GD.max&&w<520);g.style.setProperty('--gfs',(GD.fs||14)+'px');}
document.addEventListener('pointerdown',e=>{if(!e.target.classList||!e.target.classList.contains('grip'))return;const g=document.getElementById('guide');if(!g||GD.max)return;e.preventDefault();g.classList.add('drag');
 const mv=ev=>{GD.w=Math.max(360,Math.min(innerWidth*0.95,innerWidth-ev.clientX));gSize();};const up=()=>{g.classList.remove('drag');removeEventListener('pointermove',mv);removeEventListener('pointerup',up);gSave();};
 addEventListener('pointermove',mv);addEventListener('pointerup',up);});
addEventListener('resize',()=>gSize());
function guideOpen(sec){V.guide=true;const src=role()==='customer'?'guide-kh.html':'guide.html';if(GD.src!==src){GD.src=src;GD.html=null;GD.loading=false;GD.cur='';GD.q='';}
 GD.cur=sec||GD.cur||({cs:'cs-day',logistics:'log-day',sales:'sales-read',admin:'start',customer:'kh-lich'}[role()]||'start');
 if(GD.html==null&&!GD.loading){GD.loading=true;fetch(src,{cache:'no-cache'}).then(r=>r.text()).then(t=>{GD.html=t;GD.loading=false;guideRender();}).catch(()=>{GD.loading=false;GD.html='<section id="start" data-t="Hướng dẫn"><h2>Không tải được hướng dẫn</h2><p>Kiểm tra mạng rồi thử lại.</p></section>';guideRender();});}
 guideRender();}
function guideClose(){V.guide=false;const g=document.getElementById('guide');if(g)g.remove();}
function guideRender(){if(!V.guide)return;let g=document.getElementById('guide');if(!g){g=document.createElement('aside');g.id='guide';g.setAttribute('aria-label','Hướng dẫn sử dụng');document.body.appendChild(g);}
 if(GD.html==null){gSize();g.innerHTML='<div class="gh"><b class="grow">HƯỚNG DẪN SỬ DỤNG</b><button class="btn ghost sm" data-gd="x">✕</button></div><div class="empty">Đang tải…</div>';return;}
 const doc=new DOMParser().parseFromString(GD.html,'text/html');const secs=[...doc.querySelectorAll('section[id]')];const q=fold30(GD.q.trim());
 const hit=s=>!q||fold30(s.textContent).includes(q);const groups={};secs.forEach(s=>{const k=s.dataset.g||'Chung';(groups[k]=groups[k]||[]).push(s);});
 if(!secs.some(s=>s.id===GD.cur))GD.cur=secs[0]?secs[0].id:'';
 const list=q?secs.filter(hit):secs.filter(s=>s.id===GD.cur);
 let body=list.map(s=>s.outerHTML).join('<hr>')||'<p class="muted">Không thấy mục nào có từ này.</p>';
 if(q){const re=new RegExp('('+GD.q.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');body=body.replace(/>([^<]+)</g,(m,t)=>'>'+t.replace(re,'<mark>$1</mark>')+'<');}
 g.innerHTML=`<div class="gh"><b>HƯỚNG DẪN</b><input class="inp" style="flex:1" placeholder="Tìm trong hướng dẫn (không dấu cũng được)" value="${esc(GD.q)}" data-gd="q" aria-label="Tìm trong hướng dẫn"><button class="btn ghost sm" data-gd="zo" title="Chữ nhỏ hơn">A−</button><button class="btn ghost sm" data-gd="zi" title="Chữ to hơn">A+</button><button class="btn ghost sm" data-gd="max" title="${GD.max?'Thu nhỏ':'Toàn màn hình'}">${GD.max?'🗗':'⛶'}</button><button class="btn ghost sm" data-gd="print" title="In / PDF">In</button><button class="btn ghost sm" data-gd="x" aria-label="Đóng hướng dẫn">✕</button></div>
 <select class="inp gsel" data-gd="sel" aria-label="Chọn mục hướng dẫn">${secs.map(s=>`<option value="${s.id}" ${s.id===GD.cur?'selected':''}>${esc((s.dataset.g||'')+' · '+(s.dataset.t||s.id))}</option>`).join('')}</select>
 <div class="gb"><nav>${Object.entries(groups).map(([k,l])=>`<b>${esc(k.toUpperCase())}</b>${l.map(s=>`<a class="${s.id===GD.cur&&!q?'on':''} ${hit(s)?'':'muted'}" data-gd="s" data-s="${s.id}">${esc(s.dataset.t||s.id)}</a>`).join('')}`).join('')}</nav><article>${body}</article></div>`;
 gSize();const gr=document.createElement('div');gr.className='grip';gr.title='Kéo để đổi độ rộng';g.appendChild(gr);
 const inp=g.querySelector('[data-gd="q"]');if(inp&&GD.focus){inp.focus();inp.setSelectionRange(GD.q.length,GD.q.length);GD.focus=false;}}
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-gd]');if(!el)return;const k=el.dataset.gd;
 if(k==='x')guideClose();else if(k==='s'){GD.cur=el.dataset.s;GD.q='';guideRender();const a=document.querySelector('#guide article');if(a)a.scrollTop=0;}
 else if(k==='print'){const q=GD.q;GD.q='';const doc=new DOMParser().parseFromString(GD.html,'text/html');const a=document.querySelector('#guide article');if(a){a.innerHTML=[...doc.querySelectorAll('section[id]')].map(s=>s.outerHTML).join('');setTimeout(()=>{window.print();GD.q=q;guideRender();},100);}}
 else if(k==='link'){GD.cur=el.dataset.s;GD.q='';guideRender();}
 else if(k==='zi'||k==='zo'){GD.fs=Math.max(11,Math.min(22,(GD.fs||14)+(k==='zi'?1:-1)));gSave();gSize();}
 else if(k==='max'){GD.max=!GD.max;gSave();guideRender();}});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.gd==='sel'){GD.cur=e.target.value;GD.q='';guideRender();const a=document.querySelector('#guide article');if(a)a.scrollTop=0;}});
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.gd==='q'){GD.q=e.target.value;GD.focus=true;clearTimeout(GD.t);GD.t=setTimeout(guideRender,200);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&V.guide&&!V.modal){guideClose();}});
A.guide=d=>{V.guide&&!d.s?guideClose():guideOpen(d.s);};
// nút ❓ trên thanh trên cùng + link "Hướng dẫn màn này"
const GD_VIEW_KH={calendar:'kh-lich',notifs:'kh-thong-bao',profile:'kh-dang-nhap'};
const GD_VIEW={calendar:'cal',day:'log-xep',booking:'cs-xuly',bookings:'cs-xuly',approvals:'log-xep',fleet:'log-fleet',dash:'dash',config:'admin-cfg',users:'admin-users',profile:'start-login',notifs:'start-rules'};
{const r0=render;render=function(){r0();if(!S)return;const tb=document.querySelector('.top .userbtn');if(tb&&!document.querySelector('.top [data-a="guide"]')){const b=document.createElement('button');b.className='btn ghost sm';b.dataset.a='guide';b.title='Hướng dẫn sử dụng';b.textContent='❓ Hướng dẫn';b.style.marginRight='8px';tb.parentNode.insertBefore(b,tb);}
 const h=document.querySelector('.main .cal36bar')||document.querySelector('.main .pagehead')||document.querySelector('.main .calhead');if(h&&!h.querySelector('[data-a="guide"]')&&(role()==='customer'?GD_VIEW_KH:GD_VIEW)[V.view]){const l=document.createElement('button');l.className='linkbtn small';l.dataset.a='guide';l.dataset.s=(role()==='customer'?GD_VIEW_KH:GD_VIEW)[V.view];l.textContent='Hướng dẫn màn này';l.style.marginLeft='10px';h.appendChild(l);}
 if(V.guide)guideRender();};}
if(typeof SC!=='undefined'){SC.push(['goGuide','global','Mở / đóng Hướng dẫn','G H',()=>A.guide({})]);SC_BY.goGuide=SC[SC.length-1];}
