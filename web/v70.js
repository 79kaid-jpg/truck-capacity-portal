// v3.59: Lịch đội xe – màn riêng cho Logistics (và Admin) xem trạng thái xe theo ngày bốc trong tháng.
// Ô ngày: số xe theo loại (Đầu kéo / Xe thùng) × trạng thái, đơn chờ xếp xe, "Còn đặt được" (ngày tới) hoặc Đã chở / Còn lại (ngày đã qua).
// Cột "Cả tuần"; tuần đã qua gom lại. Bấm ngày → khung chi tiết: xe theo nhóm trạng thái (mở / thu gọn), đơn chờ xếp kéo thả vào xe.
// Điện thoại: xem theo tuần, bấm ngày mở bảng trượt. "Đang quay về" là ước tính: giờ báo Đã giao + (Đã giao − Bốc xong).
(()=>{const st=document.createElement('style');st.textContent=`
.lx{display:flex;flex-direction:column;gap:14px}
.lx-head{display:flex;flex-wrap:wrap;gap:10px 20px;align-items:flex-end;justify-content:space-between}
.lx-head h2{margin:0}
.lx-tools{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.lx-legend{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;padding:8px 12px;background:var(--surface);border:1px solid var(--line);border-radius:10px;font-size:13px}
.lx-legend span{display:inline-flex;align-items:center;gap:6px}
.lx-legend .sep{width:1px;height:18px;background:var(--line)}
.lx-sq{display:inline-block;width:11px;height:11px;border-radius:3px;flex:none}
.lx-s-trong{background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--inp-line)}
.lx-s-cho{background:var(--pend-bg);box-shadow:inset 0 0 0 1.5px var(--pend)}
.lx-s-day{background:var(--primary)}
.lx-s-boc{background:var(--warn)}
.lx-s-giao{background:var(--blue)}
.lx-s-xong{background:var(--ok)}
.lx-s-loi{background:var(--bad)}
.lx-k{font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;white-space:nowrap}
.lx-k-trong{background:var(--sand);color:var(--muted)}
.lx-k-cho{background:var(--pend-bg);color:var(--pend)}
.lx-k-day{background:var(--mine-bg);color:var(--primary)}
.lx-k-boc{background:var(--warn-bg);color:var(--warn)}
.lx-k-giao{background:var(--blue-bg);color:var(--blue)}
.lx-k-xong{background:var(--ok-bg);color:var(--ok)}
.lx-k-loi{background:var(--bad-bg);color:var(--bad)}
.lx-nb{display:inline-flex;align-items:center;gap:4px;font-size:13px;font-weight:700;padding:2px 7px;border-radius:6px;line-height:1.3}
.lx-nb .lx-sq{width:8px;height:8px;border-radius:2px}
.lx-tic{flex:none;fill:none;stroke:var(--ink);stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.lx-tic.lx-c-trong{stroke:var(--muted)}.lx-tic.lx-c-cho{stroke:var(--pend)}.lx-tic.lx-c-day{stroke:var(--primary)}.lx-tic.lx-c-boc{stroke:var(--warn)}.lx-tic.lx-c-giao{stroke:var(--blue)}.lx-tic.lx-c-xong{stroke:var(--ok)}.lx-tic.lx-c-loi{stroke:var(--bad)}
.lx-body{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}
.lx-calw{flex:999 1 760px;min-width:0;overflow-x:auto}
.lx-cal{min-width:760px;display:flex;flex-direction:column;gap:6px}
.lx-row{display:grid;grid-template-columns:repeat(7,minmax(0,1fr)) 130px;gap:6px}
.lx-dow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:0 4px}
.lx-cell{display:flex;flex-direction:column;gap:7px;text-align:left;min-height:168px;padding:10px 11px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;min-width:0}
.lx-cell:hover{border-color:var(--inp-line)}
.lx-cell.out{opacity:.45}.lx-cell.off{background:var(--sand)}
.lx-cell.today{box-shadow:inset 0 0 0 2px var(--blue)}
.lx-cell.sel{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary)}
.lx-cell .lx-top{display:flex;align-items:baseline;justify-content:space-between;gap:4px}
.lx-cell .dn{font-family:var(--f-display);font-size:18px;font-weight:700}
.lx-cell .tg{font-size:12px;color:var(--muted);white-space:nowrap}
.lx-tr{display:flex;align-items:center;gap:5px}
.lx-tr .nbs{display:flex;flex-wrap:wrap;gap:4px}
.lx-foot{margin-top:auto;display:flex;flex-direction:column;gap:3px;font-size:12px}
.lx-foot .ln{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0 4px}
.lx-foot .ln span{color:var(--muted)}
.lx-big{font-family:var(--f-display);font-size:17px}
.lx-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;background:var(--sand-2)}
.lx-bar i{display:block;height:100%}
.lx-cap-ok{color:var(--ok)}.lx-cap-near{color:var(--warn)}.lx-cap-full{color:var(--bad)}
.lx-wk{display:flex;flex-direction:column;gap:5px;padding:10px 11px;border-radius:8px;background:var(--sand);border:1px solid var(--line);min-width:0;font-size:12px}
.lx-wk .ln{display:flex;justify-content:space-between;gap:6px}.lx-wk .ln span{color:var(--muted)}
.lx-past{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;min-height:44px;padding:8px 14px;border:1px dashed var(--inp-line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:13px;text-align:left;cursor:pointer}
.lx-chev{display:inline-flex;transition:transform .15s}.lx-chev.open{transform:rotate(90deg)}
.lx-panel{flex:1 1 380px;min-width:0;max-width:100%;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:12px;box-sizing:border-box}
.lx-ph{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.lx-ph h3{margin:0;font-family:var(--f-display);font-size:20px}
.lx-eyebrow{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.lx-kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.lx-kpi{display:flex;flex-direction:column;gap:2px;padding:8px 10px;background:var(--sand);border-radius:8px;min-width:0}
.lx-kpi span{font-size:12px;color:var(--muted);white-space:nowrap}.lx-kpi b{font-family:var(--f-display);font-size:18px}
.lx-chips{display:flex;flex-wrap:wrap;gap:6px}
.lx-chip{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer}
.lx-chip[aria-pressed="true"]{border-color:var(--primary);background:var(--primary);color:var(--on-primary)}
.lx-grp{display:flex;align-items:center;gap:8px;width:100%;min-height:40px;padding:6px 10px;border:0;border-radius:8px;background:var(--sand);color:var(--ink);font:inherit;font-size:14px;font-weight:700;text-align:left;cursor:pointer}
.lx-grp .sub{color:var(--muted);font-weight:600}
.lx-grp .rt{margin-left:auto;font-size:13px;color:var(--muted);font-weight:600}
.lx-list{display:flex;flex-direction:column;gap:6px;padding-left:6px}
.lx-card{border:1px solid var(--line);border-radius:10px;background:var(--surface)}
.lx-card.tgt-fit{box-shadow:0 0 0 2px var(--ok);border-color:var(--ok)}
.lx-card.tgt-over{box-shadow:0 0 0 2px var(--warn);border-color:var(--warn)}
.lx-card.tgt-no{opacity:.5}
.lx-ch{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:8px 10px;border:0;background:none;color:var(--ink);font:inherit;text-align:left;cursor:pointer}
.lx-ch b{font-family:var(--f-display);font-size:15px;white-space:nowrap}
.lx-mini{flex:1;min-width:40px;height:6px;background:var(--sand-2);border-radius:3px;overflow:hidden}
.lx-mini i{display:block;height:100%}
.lx-det{padding:0 10px 10px;display:flex;flex-direction:column;gap:6px;font-size:13px}
.lx-det .mut{color:var(--muted)}
.lx-ord{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 8px;background:var(--ground);border-radius:6px}
.lx-pend{border:1.5px solid var(--warn);background:var(--warn-bg);border-radius:10px;display:flex;flex-direction:column}
.lx-pend .lx-grp{background:none;color:var(--warn)}
.lx-pl{display:flex;flex-direction:column;gap:6px;padding:0 10px 10px}
.lx-po{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px;padding:6px 8px;background:var(--surface);border-radius:6px;cursor:grab}
.lx-po.on{outline:2px solid var(--primary)}
.lx-msg{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;border-radius:8px;font-size:13px;background:var(--blue-bg)}
.lx-msg span{flex:1;min-width:0}
.lx-lnk{border:0;background:none;padding:0 4px;min-height:32px;font:inherit;font-size:13px;font-weight:600;color:var(--blue);text-decoration:underline;cursor:pointer}
.lx-wkl{display:none}
.lx-x{display:none}
@media (max-width:700px){
 .lx-calw,.lx-legend .lx-st,.lx-pend .lx-st{display:none}
 .lx-wkl{display:flex;flex-direction:column;gap:8px}
 .lx-wnav{display:flex;align-items:center;gap:6px}.lx-wnav b{flex:1;text-align:center;font-family:var(--f-display)}
 .lx-wsum{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
 .lx-drow{display:flex;align-items:center;gap:10px;width:100%;min-height:64px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);font:inherit;text-align:left;cursor:pointer}
 .lx-drow.today{box-shadow:inset 0 0 0 2px var(--blue)}.lx-drow.off{background:var(--sand)}
 .lx-drow .dd{display:flex;flex-direction:column;align-items:center;width:44px;flex:none}
 .lx-drow .mid{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
 .lx-drow .rt{display:flex;flex-direction:column;align-items:flex-end;flex:none;font-size:12px}
 .lx-panel{display:none}
 .lx-panel.sheet{display:flex;position:fixed;left:0;right:0;bottom:0;top:auto;z-index:62;max-height:84vh;overflow:auto;border-radius:16px 16px 0 0;border:0;padding:6px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -8px 30px rgba(0,0,0,.25);touch-action:pan-y;animation:up69 .22s cubic-bezier(.2,.8,.2,1)}
 .lx-panel.sheet::before{content:"";display:block;flex:none;width:40px;height:5px;margin:4px auto 2px;border-radius:3px;background:var(--line)}
 .lx-x{display:inline-flex}
 .lx-po{cursor:default}
}
@media (prefers-reduced-motion:reduce){.lx-chev{transition:none}.lx-panel.sheet{animation:none}}
`;document.head.appendChild(st);})();

const LX={sel:null,f:'all',ty:'all',past:false,pick:null,drag:null,gOpen:{},cOpen:{},expAll:false,pendOpen:true,sheet:false,wk:null,msg:'',undo:null};
const lxCan=()=>!!S&&!S.custView&&role()!=='customer'&&(can('alloc.assign')||can('fleet.manage'));
const LX_ST={trong:'Trống',cho:'Còn chỗ',day:'Đầy',boc:'Đang bốc',giao:'Đang giao',xong:'Đã giao xong',loi:'Giao lỗi'};
const LX_SUB={trong:'chưa có đơn',cho:'đã xếp một phần',day:'chờ bốc',boc:'',giao:'',xong:'đang quay về / đã về (ước tính)',loi:''};
const LX_ORDER=['trong','cho','day','boc','giao','xong','loi'];
const LX_PRIO=['boc','giao','loi','cho','day','trong','xong'];
const LX_TYN={DK:'Đầu kéo',XT:'Xe thùng'};
const LX_DOW=['CN','T2','T3','T4','T5','T6','T7'];
const LX_DOWN=['Chủ nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];
const lxIc=(ty,w,h,cls,lbl)=>{const a=lbl?`role="img" aria-label="${lbl}"`:'aria-hidden="true"';
 return ty==='DK'?`<svg class="lx-tic ${cls||''}" viewBox="0 0 32 18" width="${w}" height="${h}" ${a}><path d="M2 6h5.5l2.5 3v4H2z"/><path d="M10 12.5h20"/><circle cx="15.5" cy="8.5" r="3"/><circle cx="23.5" cy="8.5" r="3"/><circle cx="5" cy="15" r="1.6"/><circle cx="14" cy="15" r="1.6"/><circle cx="26" cy="15" r="1.6"/></svg>`
 :`<svg class="lx-tic ${cls||''}" viewBox="0 0 32 18" width="${w}" height="${h}" ${a}><path d="M2 3h17v10H2z"/><path d="M19 6.5h5l4.5 4.5v2H19z"/><circle cx="7" cy="15" r="1.6"/><circle cx="23" cy="15" r="1.6"/></svg>`;};
const lxChev=open=>`<span class="lx-chev${open?' open':''}" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></span>`;
const lxMT=v=>t2(v)+' MT';
const lxDur=m=>{m=Math.max(0,Math.round(m));return m<60?m+' phút':Math.floor(m/60)+' giờ'+(m%60?' '+(m%60)+' phút':'');};

// Trạng thái xe: theo chuyến (tripOf) nếu đã có đơn đi; chưa đi thì theo mức tải.
function lxTruck(t){
 const tr=tripOf(t.code);const load=loadOf(t.code);
 const bs=[...new Set(truckAllocs(t.code).map(a=>a.bk))].map(bkById).filter(b=>b&&LIVE_ST.concat(['failed']).includes(b.status));
 let k;
 if(tr&&tr.k==='fail')k='loi';else if(tr&&tr.k==='done')k='xong';else if(tr&&tr.k==='transit')k='giao';else if(tr&&(tr.k==='loading'||tr.k==='loaded'))k='boc';
 else k=load<=0.001?'trong':load>=t.cap-0.001?'day':'cho';
 const now=Date.now()/60000;let sub='',back=false,label=LX_ST[k];
 if(k==='boc')sub=tr.l;
 else if(k==='giao'){const eta=bs.map(b=>+b.eta||0).filter(Boolean);sub=(tr.l!=='Đang giao'?tr.l+' · ':'')+(eta.length?'Dự kiến tới '+hm29(Math.min(...eta)):'Chưa nhập giờ dự kiến tới');}
 else if(k==='xong'||k==='loi'){
  const del=Math.max(0,...bs.map(b=>+b.deliveredAt||0)),ld=bs.map(b=>+b.loadedAt||0).filter(Boolean);
  if(k==='loi'){const f=bs.find(b=>b.status==='failed');sub='Giao không thành công'+(f&&f.failNote?': '+f.failNote:'')+' · CS cần đặt lại đơn';}
  else if(del){const est=ld.length?del+(del-Math.min(...ld)):0;
   sub='Báo Đã giao lúc '+hm29(del)+' · cách đây '+lxDur(now-del)+(est?(now<est?' · đang quay về, ước về kho ~'+hm29(est):' · ước đã về kho lúc '+hm29(est)):'');
   back=!!est&&now<est;if(back)label='Đang quay về';}
  else sub='Đã giao';}
 else if(k==='cho')sub='Còn '+lxMT(t.cap-load)+' · chờ bốc';
 else if(k==='day')sub='Đủ tải · chờ bốc';
 else sub='Chưa xếp đơn nào';
 const orders=truckAllocs(t.code).map(a=>({a,b:bkById(a.bk)})).filter(x=>x.b&&LIVE_ST.concat(['failed']).includes(x.b.status));
 return{t,k,load,label,sub,back,orders,locked:truckLocked(t)};}

function lxDay(wh,date){
 const m=dayM(wh,date);const off=m.off||(!m.declared&&isHoliday(wh,date));
 const trucks=m.trucks.map(lxTruck);
 const pend=(m.holds||[]).filter(b=>dndNeed(b)>0.001);
 const pendT=r2(pend.reduce((s,b)=>s+dndNeed(b),0));
 const diff=date<TODAY?-1:date===TODAY?0:1;
 return{m,off,declared:m.declared,trucks,pend,pendT,cap:m.cap,used:m.loaded,avail:m.avail,diff,fut:m.declared&&diff>=0,past:m.declared&&diff<0};}

const lxFit=(x,b)=>!b?'':x.locked||['boc','giao','xong','loi'].includes(x.k)?'no':(x.t.cap-x.load+0.001>=dndNeed(b)?'fit':'over');
const lxLvl=d=>!d.fut?'':d.avail<=0.005?'full':d.m.usage>=S.cfg.near/100?'near':'ok';
const lxMon=s=>addDays(s,-((dow(s)+6)%7));

function lxCell(wh,ds,ym,sel){
 const d=lxDay(wh,ds);const inM=ds.slice(0,7)===ym;
 let cls='lx-cell';if(!inM)cls+=' out';if(d.off||!d.declared)cls+=' off';if(ds===TODAY)cls+=' today';if(ds===sel)cls+=' sel';
 const tag=d.off?'Nghỉ':!d.declared?'':ds===TODAY?'Hôm nay':d.trucks.length+' xe';
 const rows=!d.declared?(d.off?'':'<span style="font-size:12px;color:var(--muted)">Chưa khai báo xe</span>'):['DK','XT'].map(ty=>{const c=LX_ORDER.map(k=>[k,d.trucks.filter(x=>x.t.type===ty&&x.k===k).length]).filter(x=>x[1]);
  return c.length?`<span class="lx-tr">${lxIc(ty,22,13,'',LX_TYN[ty])}<span class="nbs">${c.map(([k,n])=>`<span class="lx-nb lx-k-${k} num" title="${LX_TYN[ty]}: ${LX_ST[k]}"><i class="lx-sq lx-s-${k}"></i>${n}</span>`).join('')}</span></span>`:'';}).join('');
 const pend=d.fut&&d.pend.length?`<span class="lx-nb lx-k-boc" style="align-self:flex-start;font-size:12px">${d.pend.length} đơn chờ xếp · ${lxMT(d.pendT)}${d.pend.some(b=>b.urgent)?' · khẩn':''}</span>`:'';
 let foot='';
 if(d.fut){const pU=d.cap?Math.min(100,d.used/d.cap*100):0,pP=d.cap?Math.min(100-pU,d.m.held/d.cap*100):0;
  foot=`<span class="lx-foot"><span class="ln"><span>Còn đặt được</span><b class="lx-big num lx-cap-${lxLvl(d)}">${d.avail<=0.005?'Đã đầy':lxMT(d.avail)}</b></span><span class="lx-bar" title="Đã xếp xe ${lxMT(d.used)} · Chờ xếp xe ${lxMT(d.m.held)} · Năng lực ${lxMT(d.cap)}"><i style="background:var(--primary);width:${pU}%"></i><i style="background:var(--warn);width:${pP}%"></i></span></span>`;}
 else if(d.past)foot=`<span class="lx-foot num"><span class="ln"><span>Đã chở</span><b>${lxMT(d.used)}</b></span><span class="ln"><span>Còn lại</span><b>${lxMT(Math.max(0,d.cap-d.used))}</b></span></span>`;
 const aria=`${LX_DOWN[dow(ds)]} ${dm(ds)}, ${tag}`+(d.fut?`, còn đặt được ${t2(d.avail)} MT`:d.past?`, đã chở ${t2(d.used)} MT`:'');
 return{html:`<button class="${cls}" data-a="lxDay" data-d="${ds}" aria-label="${esc(aria)}"><span class="lx-top"><b class="dn num">${+ds.slice(8)}</b><span class="tg">${tag}</span></span>${rows}${pend}${foot}</button>`,d};}

function lxWeekSum(ds){const w={cap:0,used:0,held:0,avail:0,fcap:0,fail:0,fut:false};
 for(const x of ds){if(!x.declared)continue;w.cap+=x.cap;w.used+=x.used;w.fail+=x.trucks.filter(t=>t.k==='loi').length;if(x.fut){w.fut=true;w.held+=x.m.held;w.avail+=x.avail;w.fcap+=x.cap;}}
 return w;}

function vFleetCal(){
 const wh=V.wh,[y,mo]=V.ym,ym=`${y}-${pad(mo)}`;
 if(!LX.sel||LX.sel.slice(0,7)!==ym&&!(LX.sel>=addDays(iso(y,mo,1),-7)&&LX.sel<=addDays(iso(y,mo,dim(y,mo)),7)))LX.sel=ym===TODAY.slice(0,7)?TODAY:iso(y,mo,1);
 if(!LX.wk)LX.wk=lxMon(LX.sel);
 const isCur=ym===TODAY.slice(0,7);
 // Tháng: các tuần từ thứ Hai
 let cur=lxMon(iso(y,mo,1));const last=iso(y,mo,dim(y,mo));const weeks=[];let pw=0,pTons=0,pCap=0,pFail=0;
 while(cur<=last){const days=[];for(let i=0;i<7;i++){days.push(lxCell(wh,cur,ym,LX.sel));cur=addDays(cur,1);}
  const to=addDays(cur,-1);const w=lxWeekSum(days.map(x=>x.d));const past=to<TODAY;
  if(isCur&&past){pw++;pTons+=w.used;pCap+=w.cap;pFail+=w.fail;}
  let wk;const fu=w.fcap?Math.round((w.fcap-w.avail)/w.fcap*100):0;
  if(w.fut)wk=`<span class="lx-eyebrow" style="letter-spacing:0;text-transform:none">Tuần ${dm(addDays(cur,-7))}–${dm(to)}</span><span class="mut" style="color:var(--muted)">Còn đặt được</span><b class="lx-big num lx-cap-${w.avail<=0.005?'full':fu>=S.cfg.near?'near':'ok'}" style="font-size:20px">${lxMT(w.avail)}</b><span class="ln num"><span>Đã xếp / năng lực</span><b>${fu}%</b></span><span class="ln num"><span>Chờ xếp xe</span><b>${lxMT(w.held)}</b></span>`;
  else wk=`<span class="lx-eyebrow" style="letter-spacing:0;text-transform:none">Tuần ${dm(addDays(cur,-7))}–${dm(to)}</span><span style="color:var(--muted)">Đã chở</span><b class="lx-big num" style="font-size:20px">${lxMT(w.used)}</b><span class="ln num"><span>Còn lại</span><b>${lxMT(Math.max(0,w.cap-w.used))}</b></span><span class="ln num"><span>Lấp đầy xe</span><b>${w.cap?Math.round(w.used/w.cap*100):0}%</b></span><span class="ln num"><span>Giao lỗi</span><b>${w.fail}</b></span>`;
  weeks.push({show:!(isCur&&past)||LX.past,html:`<div class="lx-row">${days.map(x=>x.html).join('')}<div class="lx-wk">${wk}</div></div>`});}
 const pastBar=pw?`<button class="lx-past" data-a="lxPast" aria-expanded="${LX.past}"><span style="display:flex;align-items:center;gap:8px">${lxChev(LX.past)}<b>${LX.past?'Ẩn':'Xem'} ${pw} tuần đã qua</b></span><span class="num" style="color:var(--muted)">Đã chở ${lxMT(pTons)} · còn lại ${lxMT(Math.max(0,pCap-pTons))} · giao lỗi ${pFail} xe</span></button>`:'';
 const cal=`<div class="lx-calw"><div class="lx-cal"><div class="lx-row">${['T2','T3','T4','T5','T6','T7','CN','Cả tuần'].map(x=>`<span class="lx-dow">${x}</span>`).join('')}</div>${pastBar}${weeks.filter(w=>w.show).map(w=>w.html).join('')}</div></div>`;
 // Điện thoại: theo tuần
 const wdays=[];for(let i=0;i<7;i++){const ds=addDays(LX.wk,i);wdays.push([ds,lxDay(wh,ds)]);}
 const ws=lxWeekSum(wdays.map(x=>x[1]));const wfu=ws.fcap?Math.round((ws.fcap-ws.avail)/ws.fcap*100):0;
 const wsum=ws.fut?[['Còn đặt được',lxMT(ws.avail),ws.avail<=0.005?'full':wfu>=S.cfg.near?'near':'ok'],['Chờ xếp xe',lxMT(ws.held),''],['Đã xếp',wfu+'%','']]
  :[['Đã chở',lxMT(ws.used),''],['Còn lại',lxMT(Math.max(0,ws.cap-ws.used)),''],['Lấp đầy',(ws.cap?Math.round(ws.used/ws.cap*100):0)+'%','']];
 const wl=`<div class="lx-wkl"><div class="lx-wnav"><button class="btn ghost sm" data-a="lxWeek" data-n="-1" aria-label="Tuần trước">‹</button><b class="num">${dm(LX.wk)} – ${dm(addDays(LX.wk,6))}</b><button class="btn ghost sm" data-a="lxWeek" data-n="1" aria-label="Tuần sau">›</button><button class="btn ghost sm" data-a="lxWeek" data-n="0">Tuần này</button></div>
  <div class="lx-wsum">${wsum.map(([l,v,c])=>`<div class="lx-kpi"><span>${l}</span><b class="num ${c?'lx-cap-'+c:''}" style="font-size:16px">${v}</b></div>`).join('')}</div>
  ${wdays.map(([ds,d])=>{const rows=d.declared?['DK','XT'].map(ty=>{const c=LX_ORDER.map(k=>[k,d.trucks.filter(x=>x.t.type===ty&&x.k===k).length]).filter(x=>x[1]);return c.length?`<span class="lx-tr">${lxIc(ty,20,12,'',LX_TYN[ty])}<span class="nbs">${c.map(([k,n])=>`<span class="lx-nb lx-k-${k} num"><i class="lx-sq lx-s-${k}"></i>${n}</span>`).join('')}</span></span>`:'';}).join(''):`<span style="font-size:13px;color:var(--muted)">${d.off?'Nghỉ':'Chưa khai báo xe'}</span>`;
   const rt=d.fut?`<span style="color:var(--muted)">Còn đặt</span><b class="lx-big num lx-cap-${lxLvl(d)}" style="font-size:16px">${d.avail<=0.005?'Đầy':lxMT(d.avail)}</b>`:d.past?`<span style="color:var(--muted)">Đã chở</span><b class="lx-big num" style="font-size:16px">${lxMT(d.used)}</b><span class="num" style="color:var(--muted)">Còn lại ${lxMT(Math.max(0,d.cap-d.used))}</span>`:'';
   return `<button class="lx-drow${ds===TODAY?' today':''}${d.off||!d.declared?' off':''}" data-a="lxDay" data-d="${ds}" aria-label="${LX_DOWN[dow(ds)]} ${dm(ds)}"><span class="dd"><span style="font-size:12px;font-weight:700;color:var(--muted)">${LX_DOW[dow(ds)]}</span><b class="num" style="font-family:var(--f-display);font-size:20px">${dm(ds)}</b></span><span class="mid">${rows}${d.fut&&d.pend.length?`<span class="lx-nb lx-k-boc" style="align-self:flex-start;font-size:12px">${d.pend.length} đơn chờ xếp · ${lxMT(d.pendT)}</span>`:''}</span><span class="rt">${rt}</span></button>`;}).join('')}</div>`;
 const legend=`<div class="lx-legend"><span>${lxIc('DK',30,17)}<b>Đầu kéo (DK)</b></span><span>${lxIc('XT',30,17)}<b>Xe thùng (XT)</b></span><span class="sep" aria-hidden="true"></span>${LX_ORDER.map(k=>`<span><i class="lx-sq lx-s-${k}"></i><b>${LX_ST[k]}</b><span class="lx-st" style="color:var(--muted)">${LX_SUB[k]}</span></span>`).join('')}</div>`;
 const head=`<div class="lx-head"><div><h2>LỊCH ĐỘI XE</h2><span class="muted small">Trạng thái xe theo ngày bốc · bấm một ngày để xem chi tiết</span></div><div class="lx-tools"><label class="whsel"><span>Kho:</span><select data-a="wh" aria-label="Chọn kho">${WH.filter(w=>myWhs().includes(w.id)).map(w=>`<option value="${w.id}" ${w.id===wh?'selected':''}>${w.name}</option>`).join('')}</select></label><div class="monthnav"><button class="btn ghost sm" data-a="month" data-d="-1" aria-label="Tháng trước">‹</button><b class="num">Tháng ${mo}/${y}</b><button class="btn ghost sm" data-a="month" data-d="1" aria-label="Tháng sau">›</button></div><button class="btn ghost sm" data-a="lxToday">Hôm nay</button></div></div>`;
 return `<div class="panel lx">${head}${legend}<div class="lx-body">${cal}${wl}${lxPanel(wh)}</div></div>${LX.sheet?'<div class="dim69" data-a="lxClose"></div>':''}`;}

function lxPanel(wh){
 const ds=LX.sel;const d=lxDay(wh,ds);
 const rel=ds===TODAY?'Hôm nay':ds===addDays(TODAY,1)?'Ngày mai':ds<TODAY?'Đã qua':'Sắp tới';
 let h=`<div class="lx-ph"><div><span class="lx-eyebrow">${wh} · ${rel}</span><h3>${LX_DOWN[dow(ds)]}, ${dm(ds)}/${ds.slice(0,4)}</h3></div><span class="row" style="gap:6px">${can('day.view')?`<button class="btn ghost sm" data-a="openDay" data-d="${ds}">Mở Chi tiết ngày</button>`:''}<button class="btn ghost sm lx-x" data-a="lxClose" aria-label="Đóng">✕</button></span></div>`;
 if(!d.declared){return `<section class="lx-panel${LX.sheet?' sheet':''}" aria-label="Chi tiết ngày">${h}<p class="muted" style="margin:0;padding:14px;background:var(--sand);border-radius:8px">${d.off?'Ngày nghỉ, chưa khai báo xe.':'Chưa khai báo xe cho ngày này.'}${can('fleet.manage')?' Khai báo ở màn Khai báo xe.':''}</p></section>`;}
 const k4=d.past?[['Đã chở',lxMT(d.used)],['Còn lại',lxMT(Math.max(0,d.cap-d.used))],['Xe chạy',d.trucks.filter(x=>x.k!=='trong').length+'/'+d.trucks.length],['Giao lỗi',String(d.trucks.filter(x=>x.k==='loi').length)]]
  :[['Năng lực',lxMT(d.cap)],['Đã xếp xe',lxMT(d.used)],['Chờ xếp xe',lxMT(d.m.held)],['Còn đặt được',lxMT(d.avail)]];
 h+=`<div class="lx-kpis">${k4.map(([l,v])=>`<div class="lx-kpi"><span>${l}</span><b class="num">${v}</b></div>`).join('')}</div>`;
 if(LX.msg)h+=`<div class="lx-msg" role="status"><span>${esc(LX.msg)}</span>${LX.undo?'<button class="lx-lnk" data-a="lxUndo">Hoàn tác</button>':''}<button class="lx-lnk" data-a="lxMsgX">Đóng</button></div>`;
 const act=LX.pick||LX.drag;const actB=act?bkById(act):null;
 const canA=can('alloc.assign')&&d.fut;
 if(d.fut&&d.pend.length){
  h+=`<div class="lx-pend"><button class="lx-grp" data-a="lxPendT" aria-expanded="${LX.pendOpen}">${lxChev(LX.pendOpen)}<span style="flex:1">Chờ xếp xe · ${d.pend.length} đơn · ${lxMT(d.pendT)}</span>${canA?'<span class="small lx-st" style="font-weight:600">Kéo đơn thả vào xe</span>':''}</button>`;
  if(LX.pendOpen)h+=`<div class="lx-pl">${d.pend.sort((a,b)=>(b.urgent?1:0)-(a.urgent?1:0)||a.heldAt-b.heldAt).map(b=>`<div class="lx-po${act===b.id?' on':''}" ${canA?`draggable="true" data-lxdrag="${b.id}"`:''}><b class="num">${b.id}</b><span>${esc(cust(b.customerId).name)}</span><span class="muted">${esc(regName(b.region))}</span>${b.urgent?'<span class="st st-failed">Khẩn</span>':''}<span class="num" style="margin-left:auto;font-weight:600">${lxMT(dndNeed(b))}</span>${canA?`<button class="btn ghost sm" data-a="lxPick" data-id="${b.id}" aria-pressed="${LX.pick===b.id}">${LX.pick===b.id?'Bỏ chọn':'Chọn để xếp'}</button>`:''}<button class="btn ghost sm" data-a="openBk" data-id="${b.id}">Mở</button></div>`).join('')}</div>`;
  h+='</div>';}
 const cnt={};LX_ORDER.forEach(k=>cnt[k]=d.trucks.filter(x=>x.k===k).length);
 h+=`<div class="lx-chips" role="group" aria-label="Lọc theo loại xe">${[['all','Mọi loại',d.trucks.length],['DK','Đầu kéo',d.trucks.filter(x=>x.t.type==='DK').length],['XT','Xe thùng',d.trucks.filter(x=>x.t.type==='XT').length]].map(([id,l,n])=>`<button class="lx-chip" data-a="lxTy" data-v="${id}" aria-pressed="${LX.ty===id}">${id!=='all'?lxIc(id,24,14):''}${l} <b class="num">${n}</b></button>`).join('')}</div>`;
 h+=`<div class="lx-chips" role="group" aria-label="Lọc theo trạng thái xe">${[['all','Tất cả',d.trucks.length]].concat(LX_PRIO.filter(k=>cnt[k]).map(k=>[k,LX_ST[k],cnt[k]])).map(([k,l,n])=>`<button class="lx-chip" data-a="lxF" data-v="${k}" aria-pressed="${LX.f===k}">${k!=='all'?`<i class="lx-sq lx-s-${k}"></i>`:''}${l} <b class="num">${n}</b></button>`).join('')}</div>`;
 const shown=d.trucks.filter(x=>(LX.f==='all'||x.k===LX.f)&&(LX.ty==='all'||x.t.type===LX.ty));
 h+=`<div class="row" style="justify-content:space-between;gap:8px"><span class="small muted">Đang xem ${shown.length}/${d.trucks.length} xe</span><span><button class="lx-lnk" data-a="lxAll" data-v="1">Mở tất cả</button><button class="lx-lnk" data-a="lxAll" data-v="0">Thu gọn tất cả</button></span></div>`;
 h+=LX_PRIO.map(k=>{const ts=shown.filter(x=>x.k===k);if(!ts.length)return '';
  const open=actB?true:LX.gOpen[k]!==undefined?LX.gOpen[k]:k!=='xong';
  const gl=k==='xong'&&ts.some(x=>x.back)?'Đã giao xong · có xe đang quay về':LX_ST[k];
  return `<div style="display:flex;flex-direction:column;gap:6px"><button class="lx-grp" data-a="lxG" data-v="${k}" aria-expanded="${open}">${lxChev(open)}<i class="lx-sq lx-s-${k}"></i><span>${gl} <span class="sub num">· ${ts.length} xe</span></span><span class="rt num">${t2(ts.reduce((s,x)=>s+x.load,0))} / ${lxMT(ts.reduce((s,x)=>s+x.t.cap,0))}</span></button>${open?`<div class="lx-list">${ts.map(x=>lxCard(x,actB)).join('')}</div>`:''}</div>`;}).join('');
 return `<section class="lx-panel${LX.sheet?' sheet':''}" aria-label="Chi tiết ngày">${h}</section>`;}

function lxCard(x,actB){const t=x.t;const o=LX.cOpen[t.code]!==undefined?LX.cOpen[t.code]:LX.expAll;
 const fit=lxFit(x,actB);const pct=Math.min(100,Math.round(x.load/t.cap*100));const inf=t.info||{};
 return `<article class="lx-card${fit?' tgt-'+fit:''}" data-lxdrop="${t.code}"><button class="lx-ch" data-a="lxC" data-v="${t.code}" aria-expanded="${o}">${lxIc(t.type,30,17,'lx-c-'+x.k,LX_TYN[t.type])}<b>${t.short}</b><span class="lx-mini"><i class="lx-s-${x.k}" style="width:${pct}%"></i></span><span class="num small" style="font-weight:600;white-space:nowrap">${t2(x.load)}/${t2(t.cap)}</span><span class="lx-k lx-k-${x.k}">${x.label}</span>${lxChev(o)}</button>`
 +(LX.pick&&fit==='fit'?`<div style="padding:0 10px 10px"><button class="btn sm" data-a="lxDrop" data-v="${t.code}">Xếp ${LX.pick} vào xe này (còn ${lxMT(t.cap-x.load)})</button></div>`:'')
 +(o?`<div class="lx-det"><span class="mut">${LX_TYN[t.type]}${inf.plate?' · '+esc(inf.plate):''}${inf.driver?' · '+esc(inf.driver):''}${inf.phone?' · '+esc(inf.phone):''}</span><span class="mut">${esc(x.sub)}</span>${x.orders.map(({a,b})=>`<div class="lx-ord"><button class="linkbtn num" data-a="openBk" data-id="${b.id}">${b.id}</button><span>${esc(cust(b.customerId).name)}</span><span class="mut">${esc(regName(b.region))}</span><span class="num" style="margin-left:auto;font-weight:600">${lxMT(a.tons)}</span><span class="st st-${stKey(b)}">${ST_LABEL[stKey(b)]}</span></div>`).join('')}</div>`:'')+'</article>';}

// ---------- thao tác ----------
function lxAssign(id,code){const b=bkById(id);const d=lxDay(V.wh,LX.sel);const x=d.trucks.find(y=>y.t.code===code);LX.drag=null;
 if(!b||!x){LX.pick=null;return render();}
 const fit=lxFit(x,b);
 if(fit==='no'){LX.pick=null;LX.msg=`${x.t.short} đã bốc, đã chạy hoặc đã chốt: không xếp thêm được.`;LX.undo=null;return render();}
 if(fit==='over'){LX.pick=null;LX.msg=`Không đủ chỗ: ${x.t.short} còn ${lxMT(x.t.cap-x.load)}, đơn cần ${lxMT(dndNeed(b))}. Mở đơn để Xếp phần vừa hoặc xếp vượt tải kèm lý do.`;LX.undo=null;return render();}
 const prev=allocsOf(b.id).map(a=>({truck:a.truck,tons:a.tons}));
 const rows=prev.filter(r=>r.truck!==code).concat([{truck:code,tons:r2((prev.find(r=>r.truck===code)?.tons||0)+dndNeed(b))}]);
 LX.pick=null;dndCommit(b,rows,'Xếp từ Lịch đội xe',code).then(()=>{LX.msg='';LX.undo=null;render();});}
A.lxDay=d=>{const ds=d.d;LX.sel=ds;LX.f='all';LX.pick=null;LX.drag=null;LX.msg='';LX.cOpen={};LX.gOpen={};
 LX.sheet=matchMedia('(max-width:700px)').matches;if(ds.slice(0,7)!==`${V.ym[0]}-${pad(V.ym[1])}`&&(ds<RANGE.from||ds>RANGE.to))return afterNav(goMonth(ds));render();};
A.lxClose=()=>{LX.sheet=false;render();};
A.lxPast=()=>{LX.past=!LX.past;render();};
A.lxToday=()=>{LX.sel=TODAY;LX.wk=lxMon(TODAY);LX.f='all';afterNav(goMonth(TODAY));};
A.lxWeek=d=>{const n=+d.n;LX.wk=n===0?lxMon(TODAY):addDays(LX.wk,7*n);const end=addDays(LX.wk,6);
 if(LX.wk<RANGE.from||end>RANGE.to)return afterNav(goMonth(LX.wk));render();};
A.lxF=d=>{LX.f=d.v;render();};A.lxTy=d=>{LX.ty=d.v;render();};
A.lxG=d=>{const cur=LX.gOpen[d.v]!==undefined?LX.gOpen[d.v]:d.v!=='xong';LX.gOpen={...LX.gOpen,[d.v]:!cur};render();};
A.lxC=d=>{const cur=LX.cOpen[d.v]!==undefined?LX.cOpen[d.v]:LX.expAll;LX.cOpen={...LX.cOpen,[d.v]:!cur};render();};
A.lxAll=d=>{const on=d.v==='1';LX.expAll=on;LX.cOpen={};LX.gOpen={};LX_PRIO.forEach(k=>LX.gOpen[k]=on);render();};
A.lxPendT=()=>{LX.pendOpen=!LX.pendOpen;render();};
A.lxPick=d=>{LX.pick=LX.pick===d.id?null:d.id;LX.msg=LX.pick?`Đang chọn ${d.id}: bấm "Xếp vào xe này" trên xe viền xanh.`:'';LX.undo=null;render();};
A.lxDrop=d=>{if(LX.pick)lxAssign(LX.pick,d.v);};
A.lxMsgX=()=>{LX.msg='';LX.pick=null;render();};
A.lxUndo=()=>{LX.msg='';LX.undo=null;render();};
// Kéo thả đơn chờ vào thẻ xe (chuột); điện thoại dùng nút Chọn để xếp.
// Không vẽ lại khi bắt đầu kéo (vẽ lại sẽ xóa phần tử đang kéo): chỉ tô viền thẻ xe trực tiếp.
const lxMark=on=>{document.querySelectorAll('.lx-card[data-lxdrop]').forEach(el=>{el.classList.remove('tgt-fit','tgt-over','tgt-no');});
 if(!on)return;const b=bkById(on);const d=lxDay(V.wh,LX.sel);document.querySelectorAll('.lx-card[data-lxdrop]').forEach(el=>{const x=d.trucks.find(y=>y.t.code===el.dataset.lxdrop);const f=x&&lxFit(x,b);if(f)el.classList.add('tgt-'+f);});};
document.addEventListener('dragstart',e=>{const el=e.target.closest&&e.target.closest('[data-lxdrag]');if(!el)return;LX.drag=el.dataset.lxdrag;LX.pick=null;try{e.dataTransfer.setData('text/plain',LX.drag);e.dataTransfer.effectAllowed='move';}catch(_){}
 el.classList.add('on');lxMark(LX.drag);});
document.addEventListener('dragend',e=>{if(!LX.drag)return;if(e.target.closest&&e.target.closest('[data-lxdrag]')){e.target.closest('[data-lxdrag]').classList.remove('on');LX.drag=null;lxMark(null);}});
document.addEventListener('dragover',e=>{if(LX.drag&&e.target.closest&&e.target.closest('[data-lxdrop]'))e.preventDefault();});
document.addEventListener('drop',e=>{const c=LX.drag&&e.target.closest&&e.target.closest('[data-lxdrop]');if(!c)return;e.preventDefault();lxAssign(LX.drag,c.dataset.lxdrop);});

// Menu: sau "Chế độ kho" (hoặc sau Lịch đặt xe)
{const i=NAV.findIndex(n=>n.v==='yard');NAV.splice(i>=0?i+1:1,0,{v:'fleetcal',label:'Lịch đội xe',ic:'truck',ok:lxCan});}
{const m0=mainView;mainView=function(){if(V.view==='fleetcal'){if(lxCan())return vFleetCal();V.view='calendar';}return m0();};}
{const r0=render;render=function(){r0();if(!S||V.view!=='fleetcal')return;if(LX.sheet){const el=document.querySelector('.lx-panel.sheet');if(el&&typeof drag69==='function')drag69(el,()=>{LX.sheet=false;render();});}};}
