// v3.14: Bấm 1 lần vào ô ngày → menu nhanh; bấm đúp → mở chi tiết ngày (đội xe); phím Y → yêu cầu đặt hàng
(()=>{const st=document.createElement('style');st.textContent=`
#cellMenu{position:fixed;z-index:80;min-width:230px;max-width:300px;background:var(--surface);border:1.5px solid var(--ink);border-radius:12px;box-shadow:var(--shadow);padding:6px;font-size:13.5px}
#cellMenu .cmh{padding:6px 10px 4px;font-size:11.5px;font-weight:700;letter-spacing:.04em;color:var(--muted);text-transform:uppercase}
#cellMenu button{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:0;background:transparent;border-radius:8px;padding:8px 10px;font:inherit;color:inherit;cursor:pointer}
#cellMenu button:hover,#cellMenu button:focus{background:var(--blue-bg);outline:none}
#cellMenu .ic{width:18px;text-align:center;flex:none}#cellMenu kbd{margin-left:auto;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:4px;padding:0 4px}
#cellMenu hr{border:0;border-top:1px solid var(--line);margin:4px 2px}
.cal .cell[data-cd]{cursor:pointer}
`;document.head.appendChild(st);})();
// gắn ngày vào mọi ô lịch để menu biết ô nào
{const d0=dayCell;dayCell=function(date){return d0(date).replace('<div class="cell','<div data-cd="'+date+'" class="cell');};}
if(typeof cAllCell==='function'){const c0=cAllCell;cAllCell=function(date){return c0(date).replace('<div class="cell','<div data-cd="'+date+'" class="cell');};}
const isCust42=()=>role()==='customer';
function cmClose(){const m=document.getElementById('cellMenu');if(m)m.remove();}
function cmItems(date,wh){const past=date<TODAY;const it=[];const whs=wh?[wh]:(V.whAll||isCust42()&&V.whAll?WH.map(w=>w.id):[V.wh]);const one=wh||(!V.whAll?V.wh:null);
 if(!past&&rqCanNew())it.push({ic:RQ_IC,l:'Yêu cầu đặt hàng ngày này',a:'rqNew',d:{d:date,w:one||''},k:'Y'});
 if(!past&&!isCust42()&&can('booking.create')&&!(S&&S.custView))it.push({ic:'＋',l:'Đặt hàng'+(one?' · '+one:''),a:'cmNewBk',d:{d:date,w:one||''},k:'N'});
 const nr=rqOf(date,one).length;if(nr)it.push({ic:RQ_IC,l:`Xem yêu cầu (${nr})`,a:'rqList',d:{d:date,w:one||''}});
 if(isCust42()){const mine=cMine().filter(b=>b.date===date&&(!one||b.wh===one));if(mine.length)it.push({ic:'📦',l:`Xem đơn của tôi (${mine.length})`,a:'custDay',d:{d:date,w:one||''}});}
 else if(can('day.view')){if(one)it.push({ic:'🚚',l:'Mở chi tiết ngày / đội xe'+(V.whAll?' · '+one:''),a:'openDayWh',d:{d:date,w:one},k:'Enter',sep:true});
  else WH.forEach((w,i)=>{if(dayM(w.id,date).declared||S.bookings.some(b=>b.wh===w.id&&b.date===date))it.push({ic:'🚚',l:'Chi tiết ngày · '+w.id,a:'openDayWh',d:{d:date,w:w.id},sep:i===0});});}
 return it;}
function cmRun(x){cmClose();const fn=A[x.a];if(fn)fn(x.d);}
A.cmNewBk=d=>{if(d.w){V.wh=d.w;}A.newBk({d:d.d});};
if(!A.openDayWh)A.openDayWh=d=>{V.whAll=false;V.wh=d.w;A.openDay({d:d.d});};
function cmOpen(date,wh,x,y){cmClose();const it=cmItems(date,wh);if(!it.length)return;
 if(it.length===1){cmRun(it[0]);return;}
 const m=document.createElement('div');m.id='cellMenu';m.setAttribute('role','menu');
 m.innerHTML=`<div class="cmh">${WDS[dow(date)]} ${dmy(date)}${wh?' · '+esc(wh):''}</div>`+it.map((x,i)=>`${x.sep&&i?'<hr>':''}<button role="menuitem" data-cm="${i}"><span class="ic">${x.ic}</span><span>${esc(x.l)}</span>${x.k?`<kbd>${x.k}</kbd>`:''}</button>`).join('');
 m._it=it;cmY=scrollY;document.body.appendChild(m);const r=m.getBoundingClientRect();
 m.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x))+'px';m.style.top=Math.max(8,Math.min(innerHeight-r.height-8,y))+'px';
 const b=m.querySelector('button');if(b)b.focus({preventScroll:true});}
// bấm 1 lần
document.addEventListener('click',e=>{const m=document.getElementById('cellMenu');
 if(m&&m.contains(e.target)){const b=e.target.closest('[data-cm]');if(b){e.preventDefault();e.stopPropagation();cmRun(m._it[+b.dataset.cm]);}return;}
 if(m)cmClose();
 if(!S||V.view!=='calendar'||V.modal||e.detail===0||e.detail>1)return; // Enter (detail 0) giữ hành vi cũ; lần bấm thứ 2 của bấm đúp bỏ qua
 const cell=e.target.closest&&e.target.closest('.cal .cell[data-cd]');if(!cell)return;
 const inner=e.target.closest('[data-a]');if(inner&&inner!==cell&&!inner.classList.contains('whl'))return; // nút trong ô (chip 💬, Chi tiết…) giữ nguyên
 const row=e.target.closest('.whl');e.preventDefault();e.stopPropagation();
 cmOpen(cell.dataset.cd,row?row.dataset.w:null,e.clientX+4,e.clientY+4);},true);
// bấm đúp → mở chi tiết ngày
document.addEventListener('dblclick',e=>{if(!S||V.view!=='calendar'||V.modal)return;const cell=e.target.closest&&e.target.closest('.cal .cell[data-cd]');if(!cell)return;
 const inner=e.target.closest('[data-a]');if(inner&&inner!==cell&&!inner.classList.contains('whl'))return;
 cmClose();const date=cell.dataset.cd;const row=e.target.closest('.whl');e.preventDefault();
 if(isCust42()){if(typeof getSelection==='function')getSelection().removeAllRanges();return A.custDay({d:date,w:row?row.dataset.w:(V.whAll?'':V.wh)});}
 if(!can('day.view'))return;if(typeof getSelection==='function')getSelection().removeAllRanges();
 if(row)return A.openDayWh({d:date,w:row.dataset.w});if(V.whAll){const w=WH.find(w=>dayM(w.id,date).declared)||WH[0];return A.openDayWh({d:date,w:w.id});}A.openDay({d:date});},true);
document.addEventListener('keydown',e=>{const m=document.getElementById('cellMenu');if(!m)return;
 if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cmClose();return;}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();const bs=[...m.querySelectorAll('button')];const i=bs.indexOf(document.activeElement);bs[(i+(e.key==='ArrowDown'?1:-1)+bs.length)%bs.length].focus();}},true);
let cmY=0;addEventListener('scroll',()=>{if(document.getElementById('cellMenu')&&Math.abs(scrollY-cmY)>40)cmClose();});addEventListener('resize',cmClose);
// phím Y: yêu cầu đặt hàng cho ô đang chọn
A.cellReq=()=>{if(!rqCanNew())return;const c=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.cal .cell[data-cd],.cal .cell[data-tip]');
 const d=c?(c.dataset.cd||c.dataset.tip):null;A.rqNew({d:d&&d>=TODAY?d:'',w:V.whAll?'':V.wh});};
{const r0=render;render=function(){cmClose();r0();};}
