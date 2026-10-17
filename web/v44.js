// v3.17: Màn chi tiết ngày – kéo thả booking vào xe, gợi ý xe (viền chạy quanh xe), hiệu ứng bay vào xe, hoàn tác
(()=>{const st=document.createElement('style');st.textContent=`
@property --ang{syntax:'<angle>';initial-value:0deg;inherits:false}
@keyframes dndSpin{to{--ang:360deg}}
@keyframes dndBump{0%{transform:scale(1)}35%{transform:scale(1.06)}100%{transform:scale(1)}}
.pitem.dnd{cursor:grab;touch-action:pan-y;transition:opacity .15s}.pitem.dnd:focus{outline:2px solid var(--blue);outline-offset:2px}
.pitem.dnd.dragging{opacity:.35}.pitem.sugg{box-shadow:0 0 0 2px #7a4bd1 inset;background:#f6f0ff}
.pitem .dndh{font-size:11px;color:var(--muted);margin-left:auto}
.tcard{position:relative}
.tcard.sugg::before,.tcard.dnd-ok::before,.tcard.dnd-warn::before,.tcard.dnd-over::before{content:'';position:absolute;inset:-4px;border-radius:13px;padding:3px;pointer-events:none;
 -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
.tcard.sugg::before{background:conic-gradient(from var(--ang),#7a4bd1,#4fb3ff,#2e8b57,#ffd166,#7a4bd1);animation:dndSpin 1.6s linear infinite}
.tcard.dnd-ok::before{background:#2e8b57}.tcard.dnd-warn::before{background:#e0861a}.tcard.dnd-over::before{background:#d33a2c}
.tcard.dnd-no{opacity:.45;filter:grayscale(.6)}
.tcard .dndtag{position:absolute;top:-11px;right:10px;background:#7a4bd1;color:#fff;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:700;white-space:nowrap;z-index:2}
.tcard.dnd-ok .dndtag{background:#2e8b57}.tcard.dnd-warn .dndtag{background:#e0861a}.tcard.dnd-over .dndtag{background:#d33a2c}.tcard.dnd-no .dndtag{background:#6b7280}
.tcard .bar .prev{background:repeating-linear-gradient(45deg,#7a4bd1 0 5px,#b79cf0 5px 10px);opacity:.85}
.tcard.bump{animation:dndBump .45s ease}
#dndGhost{position:fixed;z-index:120;pointer-events:none;left:0;top:0;width:220px;padding:8px 10px;border-radius:10px;background:var(--surface);border:2px solid #7a4bd1;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:12.5px;transform-origin:center;will-change:transform}
#dndGhost b{display:block;font-size:13px}#dndGhost.fly{transition:transform .5s cubic-bezier(.5,-0.2,.6,1),opacity .5s}#dndGhost.back{transition:transform .35s ease,opacity .35s}
#dndSnack{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:110;display:flex;gap:12px;align-items:center;background:var(--navy);color:var(--on-navy);padding:10px 14px;border-radius:12px;box-shadow:var(--shadow);font-size:13.5px;max-width:calc(100vw - 24px)}
#dndSnack button{border:0;border-radius:8px;padding:5px 12px;font:inherit;font-weight:700;cursor:pointer;background:#fff;color:var(--navy)}
.dndbar{display:flex;gap:6px;align-items:center;margin:6px 0 4px;flex-wrap:wrap}
`;document.head.appendChild(st);})();
const DND={sug:null,all:null,drag:null,undo:null};
const dndOn=()=>!!S&&V.view==='day'&&can('alloc.assign')&&V.day>=TODAY&&!(S.custView);
const dndNeed=b=>r2(bkTotal(b)-allocSum(b.id));
const dndPref=b=>bkTotal(b)>S.cfg.split?'DK':'XT';
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// ---------- đánh giá thả 1 booking vào 1 xe ----------
function dndEval(b,t){const need=dndNeed(b);if(need<=0.001)return{k:'no',why:'Booking đã xếp đủ tấn'};
 if(truckLocked(t))return{k:'no',why:t.closed?'Xe đã đóng':'Xe đã chạy'};
 const cur=allocsOf(b.id).filter(a=>a.truck===t.code).reduce((s,a)=>s+a.tons,0);
 const room=r2(t.cap-loadOf(t.code,b.id)-cur);const warns=[];
 if(t.type!==dndPref(b))warns.push('khác loại xe gợi ý ('+dndPref(b)+')');
 const rs=truckRegions(t.code,b.id);if(rs.length&&b.region!=='NONE'&&!rs.some(r=>r===b.region||relation(r,b.region)==='nb'))warns.push('xe đang chở khu vực khác');
 if(!stopsOk(t.code,b))warns.push('vượt số điểm giao');
 if(room<=0.001)return{k:'over',room:0,need,warns,why:'Xe đã đầy'};
 if(need>room+0.001)return{k:'over',room,need,warns,why:`Chỉ còn ${t2(room)} MT, đơn cần ${t2(need)} MT`};
 return{k:warns.length?'warn':'ok',room,need,warns,why:warns.join(', ')};}
// ---------- vẽ: thẻ booking kéo được + nút gợi ý; thẻ xe có viền gợi ý ----------
{const p0=pendItem;pendItem=function(b,past){let h=p0(b,past);if(past||!can('alloc.assign'))return h;const sg=DND.sug&&DND.sug.bk===b.id;
 h=h.replace('<div class="pitem">',`<div class="pitem dnd ${sg?'sugg':''}" data-bk="${b.id}" tabindex="0" title="Kéo thả vào xe · G: gợi ý · Enter: đồng ý">`);
 const btns=sg?`<button class="btn sm" data-a="dndAccept" data-id="${b.id}">✓ Đồng ý</button><button class="btn ghost sm" data-a="dndClear">✕ Bỏ</button>`
  :`<button class="btn ghost sm" data-a="dndSuggest" data-id="${b.id}" title="Hệ thống gợi ý xe">💡 Gợi ý</button>`;
 return h.replace('<div class="row"><button class="btn sm" data-a="openBk"',`<div class="row">${btns}<span class="dndh">⠿ kéo vào xe</span><button class="btn sm ${sg?'ghost':''}" data-a="openBk"`);};}
function dndSugRows(){const r={};if(DND.sug)DND.sug.rows.forEach(x=>{(r[x.code]=r[x.code]||[]).push({bk:DND.sug.bk,tons:x.tons});});
 if(DND.all)DND.all.forEach(s=>s.rows.forEach(x=>(r[x.code]=r[x.code]||[]).push({bk:s.bk,tons:x.tons})));return r;}
{const t0=truckCard;truckCard=function(t,past){let h=t0(t,past);const add=dndSugRows()[t.code];if(!add)return h;const tons=r2(add.reduce((s,x)=>s+x.tons,0));const l=loadOf(t.code);
 const who=add.length===1?cust(bkById(add[0].bk).customerId).name:add.length+' đơn';
 h=h.replace('<div class="tcard ','<div class="tcard sugg ').replace(/(<div class="tc-top">)/,`<span class="dndtag">+${t2(tons)} MT · ${esc(who)} → ${pct((l+tons)/t.cap)}</span>$1`);
 return h.replace(/(<div class="bar">)([\s\S]*?)(<\/div>)/,(m,a,b,c)=>a+b+`<span class="prev" style="width:${Math.min(100,tons/t.cap*100)}%" title="Sẽ thêm ${t2(tons)} MT"></span>`+c);};}
// ---------- gợi ý ----------
A.dndSuggest=d=>{const b=bkById(d.id);if(!b)return;DND.all=null;const s=suggestFor(b);
 if(!s.rows.length){DND.sug=null;render();return dndSnack('Không tìm được xe phù hợp cho '+b.id+'. Kéo tay vào xe hoặc khai báo thêm xe.');}
 DND.sug={bk:b.id,rows:s.rows,left:s.left};render();
 const first=document.querySelector(`.tcard[data-c="${s.rows[0].code}"]`);if(first)first.scrollIntoView({block:'nearest',behavior:reduceMotion()?'auto':'smooth'});
 if(s.left>0.001)dndSnack(`Gợi ý xếp được ${t2(bkTotal(b)-s.left)} MT, còn ${t2(s.left)} MT chưa có xe.`);};
A.dndClear=()=>{DND.sug=null;DND.all=null;render();};
A.dndSuggestAll=()=>{const m=dayM(V.wh,V.day);const hs=m.holds.filter(b=>visibleBk(b)&&dndNeed(b)>0.001).sort((a,b)=>a.heldAt-b.heldAt);const base=S.allocs;const out=[];
 try{for(const b of hs){const s=suggestFor(b);if(s.rows.length&&s.left<=0.001){out.push({bk:b.id,rows:s.rows});S.allocs=S.allocs.filter(a=>a.bk!==b.id).concat(s.rows.map(r=>({bk:b.id,truck:r.code,tons:r.tons})));}}}
 finally{S.allocs=base;}
 DND.sug=null;DND.all=out.length?out:null;render();dndSnack(out.length?`Gợi ý xếp ${out.length}/${hs.length} booking. Bấm "Đồng ý tất cả" để xếp.`:'Không có booking nào xếp đủ được theo gợi ý.');};
A.dndAccept=async d=>{const s=DND.sug&&DND.sug.bk===d.id?DND.sug:null;if(!s)return;DND.sug=null;
 await dndCommit(bkById(d.id),s.rows.map(r=>({truck:r.code,tons:r.tons})),'Theo gợi ý của hệ thống',s.rows[0].code);};
A.dndAcceptAll=async()=>{const all=DND.all||[];DND.all=null;let ok=0,err='';
 for(const s of all){const b=bkById(s.bk);if(!b||b.status!=='hold')continue;try{await rpc('save_allocations',{p_id:b.id,p_rows:s.rows.map(r=>({truck:r.code,tons:r.tons})),p_reason:'Theo gợi ý của hệ thống',p_confirm:true});ok++;}catch(e){err=e.message;}}
 await reload();render();dndSnack(`Đã xếp và xác nhận ${ok}/${all.length} booking.`+(err?' Lỗi: '+err:''));};
// ---------- ghi xuống máy chủ + hoàn tác ----------
async function dndCommit(b,rows,reason,code){const prev=allocsOf(b.id).map(a=>({truck:a.truck,tons:a.tons}));
 const tot=r2(rows.reduce((s,r)=>s+r.tons,0));const full=Math.abs(tot-bkTotal(b))<0.006;
 try{setBusy(true);await rpc('save_allocations',{p_id:b.id,p_rows:rows,p_reason:reason||'',p_confirm:full});await reload();}
 catch(e){setBusy(false);render();return dndSnack('⚠ '+e.message);}
 setBusy(false);render();const card=code&&document.querySelector(`.tcard[data-c="${code}"]`);if(card&&!reduceMotion()){card.classList.add('bump');setTimeout(()=>card.classList.remove('bump'),500);}
 const tk=rows.map(r=>truckByCode(r.truck)?.short||r.truck).join(', ');
 dndSnack(full?`Đã xếp ${b.id} lên ${tk} và xác nhận.`:`Đã xếp ${t2(tot)}/${t2(bkTotal(b))} MT của ${b.id} lên ${tk}.`,{label:'Hoàn tác',fn:async()=>{
  try{await rpc('save_allocations',{p_id:b.id,p_rows:prev,p_reason:'Hoàn tác kéo thả',p_confirm:false});await reload();render();dndSnack('Đã hoàn tác.');}catch(e){dndSnack('⚠ '+e.message);}}});}
function dndSnack(text,act){let el=document.getElementById('dndSnack');if(el)el.remove();clearTimeout(DND.snT);
 el=document.createElement('div');el.id='dndSnack';el.setAttribute('role','status');el.innerHTML=`<span>${esc(text)}</span>${act?`<button>${esc(act.label)}</button>`:''}`;document.body.appendChild(el);
 if(act)el.querySelector('button').onclick=()=>{el.remove();act.fn();};DND.snT=setTimeout(()=>el.remove(),act?7000:4500);}
// ---------- hỏi khi vượt tải / có cảnh báo ----------
M29.dndAsk=function(){const M=V.modal;const b=bkById(M.bk),t=truckByCode(M.code),E=M.e;
 return `<div class="mhead"><h2>${E.k==='over'?'⚠ VƯỢT TẢI TRỌNG':'⚠ CẦN XÁC NHẬN'}</h2><span class="meta">${esc(b.id)} → ${esc(t.short)}</span></div>
 <p>${esc(cust(b.customerId).name)} cần <b class="num">${t2(E.need)} MT</b>. Xe ${esc(t.short)} còn trống <b class="num">${t2(E.room||0)} MT</b> / ${t2(t.cap)} MT.</p>
 ${E.warns.length?`<p class="small" style="color:var(--warn)">Lưu ý: ${esc(E.warns.join(', '))}.</p>`:''}
 <div class="field"><label for="dnd-r">Lý do ${E.k==='over'||E.warns.length?'(bắt buộc khi xếp vượt / khác khuyến nghị)':''}</label><input id="dnd-r" class="inp" data-dndr="1" value="${esc(M.reason||'')}" placeholder="VD: khách gấp, xe này đi cùng tuyến"></div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Hủy</button>
  ${E.k==='over'&&E.room>0.001?`<button class="btn ghost" data-a="dndAskDo" data-m="part">Xếp phần vừa ${t2(E.room)} MT</button>`:''}
  <button class="btn ${E.k==='over'?'danger':''}" data-a="dndAskDo" data-m="all">${E.k==='over'?'Vẫn xếp toàn bộ '+t2(E.need)+' MT':'Xếp vào xe này'}</button></div>`;};
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.dndr&&V.modal&&V.modal.type==='dndAsk')V.modal.reason=e.target.value;});
A.dndAskDo=d=>{const M=V.modal;const b=bkById(M.bk);const E=M.e;const tons=d.m==='part'?E.room:E.need;const needReason=d.m==='all'&&(E.k==='over'||E.warns.length)||d.m==='part'&&E.warns.length;
 if(needReason&&(M.reason||'').trim().length<3){M.err='Ghi lý do để lưu vào nhật ký.';return render();}
 const code=M.code;V.modal=null;dndCommit(b,dndRowsWith(b,code,tons),(M.reason||'').trim(),code);};
function dndRowsWith(b,code,tons){const rows=allocsOf(b.id).map(a=>({truck:a.truck,tons:a.tons}));const ex=rows.find(r=>r.truck===code);if(ex)ex.tons=r2(ex.tons+tons);else rows.push({truck:code,tons:r2(tons)});return rows;}
// ---------- kéo thả (chuột + cảm ứng) ----------
function dndClearHover(){document.querySelectorAll('.tcard.dnd-ok,.tcard.dnd-warn,.tcard.dnd-over,.tcard.dnd-no').forEach(c=>{c.classList.remove('dnd-ok','dnd-warn','dnd-over','dnd-no');const g=c.querySelector('.dndtag.hov');if(g)g.remove();});}
function dndHover(card){const D=DND.drag;if(D.card===card)return;dndClearHover();D.card=card;D.e=null;if(!card)return;const t=truckByCode(card.dataset.c);if(!t)return;
 const E=dndEval(D.b,t);D.e=E;card.classList.add('dnd-'+E.k);const tag=document.createElement('span');tag.className='dndtag hov';
 tag.textContent=E.k==='ok'?`+${t2(E.need)} MT → ${pct((loadOf(t.code)+E.need)/t.cap)}`:E.k==='no'?E.why:E.k==='over'?`Vượt: ${E.why}`:`Lưu ý: ${E.why}`;card.appendChild(tag);}
function dndStart(item,x,y){const b=bkById(item.dataset.bk);if(!b||dndNeed(b)<=0.001)return false;const r=item.getBoundingClientRect();
 const g=document.createElement('div');g.id='dndGhost';g.innerHTML=`<b>${esc(cust(b.customerId).name)}</b>${esc(b.id)} · <b style="display:inline" class="num">${t2(dndNeed(b))} MT</b>`;document.body.appendChild(g);
 DND.drag={b,item,g,ox:r.left,oy:r.top,card:null,e:null};item.classList.add('dragging');document.body.style.userSelect='none';dndMove(x,y);return true;}
function dndMove(x,y){const D=DND.drag;if(!D)return;D.x=x;D.y=y;D.g.style.transform=`translate(${x-110}px,${y-24}px) rotate(-2deg)`;
 D.g.style.visibility='hidden';const el=document.elementFromPoint(x,y);D.g.style.visibility='';dndHover(el&&el.closest?el.closest('.tcard[data-c]'):null);
 if(y<70)scrollBy(0,-12);else if(y>innerHeight-70)scrollBy(0,12);}
function dndEnd(cancel){const D=DND.drag;if(!D)return;DND.drag=null;document.body.style.userSelect='';const{b,g,item,card,e}=D;
 const back=why=>{dndClearHover();if(reduceMotion()){g.remove();item.classList.remove('dragging');}else{g.classList.add('back');g.style.transform=`translate(${D.ox}px,${D.oy}px) scale(.9)`;g.style.opacity='0';setTimeout(()=>{g.remove();item.classList.remove('dragging');},350);}if(why)dndSnack(why);};
 if(cancel||!card||!e)return back();
 const t=truckByCode(card.dataset.c);
 if(e.k==='no')return back('Không xếp được vào '+t.short+': '+e.why+'.');
 dndClearHover();
 if(e.k!=='ok'){g.remove();item.classList.remove('dragging');V.modal={type:'dndAsk',bk:b.id,code:t.code,e,reason:'',err:''};render();setTimeout(()=>{const i=document.getElementById('dnd-r');if(i)i.focus();},40);return;}
 // bay vào xe
 const r=card.getBoundingClientRect();const go=()=>{g.remove();dndCommit(b,dndRowsWith(b,t.code,e.need),'',t.code);};
 if(reduceMotion())return go();
 g.classList.add('fly');requestAnimationFrame(()=>{g.style.transform=`translate(${r.left+r.width/2-110}px,${r.top+r.height/2-24}px) scale(.15) rotate(8deg)`;g.style.opacity='.2';});setTimeout(go,480);}
let dndP=null;
document.addEventListener('pointerdown',e=>{if(!dndOn()||e.button>0)return;const it=e.target.closest&&e.target.closest('.pitem.dnd');if(!it||e.target.closest('button,a,input,select'))return;
 dndP={it,x:e.clientX,y:e.clientY,id:e.pointerId,touch:e.pointerType!=='mouse',t:Date.now(),timer:null};
 if(dndP.touch)dndP.timer=setTimeout(()=>{if(dndP&&!DND.drag){if(navigator.vibrate)navigator.vibrate(15);dndStart(dndP.it,dndP.x,dndP.y);}},300);});
document.addEventListener('pointermove',e=>{if(DND.drag){e.preventDefault();dndMove(e.clientX,e.clientY);return;}if(!dndP)return;const dx=e.clientX-dndP.x,dy=e.clientY-dndP.y;
 if(dndP.touch){if(Math.hypot(dx,dy)>10){clearTimeout(dndP.timer);dndP=null;}return;}
 if(Math.hypot(dx,dy)>6){dndStart(dndP.it,e.clientX,e.clientY);}},{passive:false});
document.addEventListener('touchmove',e=>{if(DND.drag)e.preventDefault();},{passive:false});
document.addEventListener('pointerup',()=>{if(dndP){clearTimeout(dndP.timer);dndP=null;}if(DND.drag)dndEnd(false);});
document.addEventListener('pointercancel',()=>{if(dndP){clearTimeout(dndP.timer);dndP=null;}if(DND.drag)dndEnd(true);});
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.pitem.dragging'))e.stopPropagation();},true);
document.addEventListener('keydown',e=>{if(DND.drag&&e.key==='Escape'){e.preventDefault();dndEnd(true);return;}
 const it=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('.pitem.dnd');if(!it||V.modal||!dndOn())return;
 if(e.key==='g'||e.key==='G'){e.preventDefault();e.stopPropagation();A.dndSuggest({id:it.dataset.bk});}
 else if(e.key==='Enter'&&DND.sug&&DND.sug.bk===it.dataset.bk){e.preventDefault();e.stopPropagation();A.dndAccept({id:it.dataset.bk});}},true);
// thanh công cụ trên danh sách chờ xếp xe; đổi ngày / kho thì bỏ gợi ý
{const r0=render;let key='';render=function(){const k=V.view+'|'+V.day+'|'+V.wh;if(k!==key){key=k;DND.sug=null;DND.all=null;}r0();
 if(!dndOn()||V.dayTab==='merge')return;const tabs=document.querySelector('.main aside .tabs');if(!tabs||document.querySelector('.dndbar'))return;
 const n=document.querySelectorAll('.pitem.dnd').length;if(!n)return;const bar=document.createElement('div');bar.className='dndbar';
 bar.innerHTML=DND.all?`<button class="btn sm" data-a="dndAcceptAll">✓ Đồng ý tất cả (${DND.all.length})</button><button class="btn ghost sm" data-a="dndClear">✕ Bỏ gợi ý</button>`
  :`<button class="btn ghost sm" data-a="dndSuggestAll" title="Gợi ý xe cho mọi booking đang chờ">💡 Gợi ý tất cả</button><span class="small muted">Kéo booking thả vào xe để xếp</span>`;
 tabs.after(bar);};}
