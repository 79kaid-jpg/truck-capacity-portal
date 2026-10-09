/* ===================== helpers ===================== */
let TODAY='2026-10-09';
const pad=n=>String(n).padStart(2,'0');
const iso=(y,m,d)=>`${y}-${pad(m)}-${pad(d)}`;
const parts=s=>s.split('-').map(Number);
const dow=s=>{const[y,m,d]=parts(s);return new Date(Date.UTC(y,m-1,d)).getUTCDay();};
const addDays=(s,n)=>{const[y,m,d]=parts(s);const t=new Date(Date.UTC(y,m-1,d+n));return iso(t.getUTCFullYear(),t.getUTCMonth()+1,t.getUTCDate());};
const dm=s=>{const[,m,d]=parts(s);return `${pad(d)}/${pad(m)}`;};
const dmy=s=>s?`${dm(s)}/${parts(s)[0]}`:'';
const ddmmyy=s=>{const[y,m,d]=parts(s);return `${pad(d)}${pad(m)}${String(y).slice(2)}`;};
const yymmdd=s=>{const[y,m,d]=parts(s);return `${String(y).slice(2)}${pad(m)}${pad(d)}`;};
const dim=(y,m)=>new Date(Date.UTC(y,m,0)).getUTCDate();
const WD=['CHỦ NHẬT','THỨ 2','THỨ 3','THỨ 4','THỨ 5','THỨ 6','THỨ 7'];
const WDS=['CN','T2','T3','T4','T5','T6','T7'];
const r2=n=>Math.round((+n||0)*100)/100;
const t2=n=>r2(n).toLocaleString('vi-VN',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct=n=>Math.round(n*100)+'%';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Math.random().toString(36).slice(2,8);
const VNFMT=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
const clockStr=min=>{if(!min)return '–';const p={};VNFMT.formatToParts(new Date(min*60000)).forEach(x=>p[x.type]=x.value);const ds=`${p.year}-${p.month}-${p.day}`;return (ds===TODAY?'':`${p.day}/${p.month} `)+`${p.hour==='24'?'00':p.hour}:${p.minute}`;};

/* ===================== icons ===================== */
const IC={
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
 user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.3 7.5-5.3s6.3 1.7 7.5 5.3"/></svg>',
 bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/></svg>',
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.8" cy="6" r="1.2"/><circle cx="4.8" cy="12" r="1.2"/><circle cx="4.8" cy="18" r="1.2"/></svg>',
 inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
 truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z"/><circle cx="6.5" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/></svg>',
 chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
 gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
};
const DK_SVG=(cls='')=>`<svg class="${cls}" viewBox="0 0 66 28" aria-hidden="true"><rect x="2" y="16" width="44" height="3.2" rx="1" fill="currentColor"/>${[10,22,34].map(x=>`<circle cx="${x}" cy="9.8" r="5.4" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="${x}" cy="9.8" r="1.5" fill="currentColor"/>`).join('')}<path d="M47 5.5h8.5l7 7.2V19H47z" fill="currentColor"/><path d="M50 8h4.8l4 4.3H50z" fill="var(--surface)"/>${[8,16,41,53].map(x=>`<circle cx="${x}" cy="22.5" r="3.1" fill="currentColor" stroke="var(--surface)" stroke-width="1.2"/>`).join('')}</svg>`;
const CN_SVG=(cls='')=>`<svg class="${cls}" viewBox="0 0 66 28" aria-hidden="true"><rect x="2" y="3" width="40" height="16" rx="1" fill="currentColor"/>${[7,12,17,22,27,32,37].map(x=>`<rect x="${x}" y="5" width="2" height="12" fill="var(--surface)"/>`).join('')}<path d="M43 7.5h9l7 6V19H43z" fill="currentColor"/><path d="M46 9.5h5.2l4.2 3.8H46z" fill="var(--surface)"/>${[9,17,51].map(x=>`<circle cx="${x}" cy="22.5" r="3.1" fill="currentColor" stroke="var(--surface)" stroke-width="1.2"/>`).join('')}</svg>`;
const TICON=t=>t==='DK'?DK_SVG():CN_SVG();

/* ===================== seed data ===================== */
let WH=[{id:'PMY',name:'PHÚ MỸ',full:'Kho Phú Mỹ'},{id:'CLO',name:'CỬA LÒ',full:'Kho Cửa Lò'},{id:'HPG',name:'HẢI PHÒNG',full:'Kho Hải Phòng'}];
const PROVINCES=['TP. Hồ Chí Minh','Đồng Nai','Lâm Đồng','Tây Ninh','Gia Lai','Đắk Lắk','Đà Nẵng','Khánh Hòa','Cần Thơ','Nghệ An','Hà Tĩnh','Thanh Hóa','Quảng Trị','Hải Phòng','Hà Nội','Quảng Ninh','Bắc Ninh','Hưng Yên'];
const ROLE_LABEL={customer:'Khách hàng',sales:'Sales',cs:'CS',logistics:'Logistics',admin:'Admin'};
const SEG_LABEL={DD:'Dân dụng',DA:'Dự án','':'–'};
const ST_LABEL={draft:'Nháp',hold:'Chờ xếp xe',ok:'Đã xác nhận',rejected:'Từ chối',resched:'Đề nghị đổi ngày',cancelled:'Đã hủy'};
const ST_CUST={hold:'Chờ duyệt',ok:'Đã xác nhận',rejected:'Từ chối',resched:'Đề nghị đổi ngày',cancelled:'Đã hủy'};

/* ===================== server data ===================== */
// Dữ liệu được nạp từ Supabase qua hàm get_state (đã lọc theo vai trò ở phía máy chủ)
const vnToday=()=>{const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return `${p.year}-${p.month}-${p.day}`;};
TODAY=vnToday();
const num=v=>parseFloat(String(v??'').replace(',','.'));
const CFG_DEFAULT={near:80,capDK:30,capCN:15,split:15,sla:60,maxStops:3,fillMin:70,suggestOn:true,sundayOff:true,holidays:[]};
function adopt(st){
 const S={};
 S.me=st.me;S.cfg={...CFG_DEFAULT,...(st.cfg||{})};S.perms=st.perms||[];S.permCatalog=st.permCatalog||[];S.roleMatrix=st.roleMatrix||null;
 WH=(st.warehouses||[]).map(w=>({id:w.id,name:String(w.name).toUpperCase(),full:w.full}));
 S.regions=(st.regions||[]).map(r=>({...r,neighbors:r.neighbors||[]}));
 S.products=st.products||[];S.colors=st.colors||[];
 S.thicks=(st.thicks||[]).map(x=>({value:+x.value,active:x.active}));
 S.widths=(st.widths||[]).map(x=>({value:+x.value,active:x.active}));
 S.users=(st.users||[]).map(u=>({...u,phone:u.phone||'',whs:u.whs&&u.whs.length?u.whs:[u.wh]}));
 {const i=S.users.findIndex(u=>u.id===st.me.id);const m={...(S.users[i]||{}),...st.me,phone:st.me.phone||'',active:true};m.whs=m.whs&&m.whs.length?m.whs:[m.wh];if(i>=0)S.users[i]=m;else S.users.push(m);}
 S.customers=(st.customers||[]).map(c=>({...c,addresses:(c.addresses||[]).map(a=>({...a,regions:a.regions||{}}))}));
 S.fleet={};WH.forEach(w=>S.fleet[w.id]={});
 (st.fleet||[]).forEach(f=>{(S.fleet[f.wh]=S.fleet[f.wh]||{})[f.date]={dk:f.dk,cn:f.cn,reason:f.reason||'',by:f.by,at:f.at};});
 S.cal={};(st.calendar||[]).forEach(c=>{S.cal[c.wh+'|'+c.day]=c;});
 S.bookings=(st.bookings||[]).map(b=>({...b,delivery:b.delivery||'',ref:b.ref||'',addrText:b.addrText||'',province:b.province||'',region:b.region||'NONE',
  heldAt:Math.floor(b.heldAt||0),note:b.note||'',rejectReason:b.rejectReason||'',proposedDate:b.proposedDate||'',
  lines:(b.lines||[]).map(l=>({p:l.p||'',c:l.c||'',th:l.th??'',w:l.w??'',t:+l.t}))}));
 S.allocs=(st.allocs||[]).map(a=>({...a,tons:+a.tons,reason:a.reason||''}));
 S.notifs=(st.notifs||[]).map(n=>({...n,to:[st.me.id],at:Math.floor(n.at/60)}));
 S.audit=(st.audit||[]).map(a=>({...a,at:Math.floor(a.at)}));
 S.clock=Math.floor(st.now/60);
 return S;
}


/* ===================== state ===================== */
let S=null;
const V={me:null,wh:'PMY',ym:[2026,10],view:'calendar',day:null,bk:null,modal:null,menu:false,dayTab:'pending',dayFilter:{st:'all',region:'all'},blTab:'all',blF:{wh:'all',region:'all',q:''},cfgTab:'general',uTab:'users',nTab:'list',asg:null,fleetEdit:{},toast:'',hl:null};

/* ===================== domain ===================== */
const me=()=>S.users.find(u=>u.id===V.me);
const role=()=>me().role;
const internal=()=>role()!=='customer';
const can=p=>!!(S&&S.perms&&S.perms.includes(p));
const canAny=pre=>!!(S&&S.perms&&S.perms.some(x=>x.startsWith(pre)));
const myWhs=()=>role()==='logistics'?(me().whs||[me().wh]):WH.map(w=>w.id);
const cust=id=>S.customers.find(c=>c.id===id)||(id?{id,code:'',name:'Khách khác',segment:'',salesId:null,addresses:[]}:undefined);
const user=id=>S.users.find(u=>u.id===id)||{id,name:'–',email:'',phone:'',role:''};
const regionsOf=wh=>S.regions.filter(r=>r.wh===wh&&r.active);
const reg=id=>S.regions.find(r=>r.id===id);
const regName=id=>id==='NONE'||!id?'Chưa phân khu vực':(reg(id)?.name||id);
const relation=(a,b)=>!a||!b||a==='NONE'||b==='NONE'?'other':a===b?'same':(reg(a)?.neighbors.includes(b)?'nb':'other');
const bkTotal=b=>r2(b.lines.reduce((s,l)=>s+(+l.t||0),0));
const bkById=id=>S.bookings.find(b=>b.id===id);
const allocsOf=id=>S.allocs.filter(a=>a.bk===id);
const allocSum=id=>r2(allocsOf(id).reduce((s,a)=>s+a.tons,0));
const isHoliday=(wh,date)=>(S.cfg.sundayOff&&dow(date)===0)||S.cfg.holidays.includes(date);
function trucksOf(wh,date){const f=(S.fleet[wh]||{})[date];if(!f||isHoliday(wh,date))return[];const out=[];const mk=(type,n,cap)=>{for(let i=1;i<=n;i++)out.push({code:`${wh}-${ddmmyy(date)}-${type}-${pad(i)}`,short:`${type}-${pad(i)}`,type,cap,idx:i,wh,date});};mk('DK',f.dk,S.cfg.capDK);mk('CN',f.cn,S.cfg.capCN);return out;}
const truckByCode=code=>{const[wh,dd,type,n]=code.split('-');const date=`20${dd.slice(4)}-${dd.slice(2,4)}-${dd.slice(0,2)}`;return trucksOf(wh,date).find(t=>t.code===code);};
const liveAllocsOnTruck=code=>S.allocs.filter(a=>a.truck===code&&['hold','ok'].includes(bkById(a.bk)?.status));
const loadOf=(code,exceptBk)=>r2(liveAllocsOnTruck(code).filter(a=>a.bk!==exceptBk).reduce((s,a)=>s+a.tons,0));
const truckRegions=(code,exceptBk)=>[...new Set(liveAllocsOnTruck(code).filter(a=>a.bk!==exceptBk).map(a=>bkById(a.bk).region))];
const addrKey=b=>b.customerId+'|'+b.addrText;
const truckStops=(code,exceptBk)=>new Set(liveAllocsOnTruck(code).filter(a=>a.bk!==exceptBk).map(a=>addrKey(bkById(a.bk))));
const stopsOk=(code,b)=>{const s=truckStops(code,b.id);return s.has(addrKey(b))||s.size<S.cfg.maxStops;};
const custColor=id=>`var(--c${(S.customers.findIndex(c=>c.id===id)%6)+1})`;

function visibleBk(b){const u=me();if(b.status==='draft')return b.csId===u.id;
 if(u.role==='customer')return b.customerId===u.customerId;if(u.role==='sales')return cust(b.customerId).salesId===u.id;return true;}
const ownsCust=cid=>role()!=='sales'||cust(cid).salesId===V.me;

function dayM(wh,date){
 if(S.me.role==='customer'){const c=S.cal[wh+'|'+date]||{avail:0,status:isHoliday(wh,date)?'off':'none',declared:false,off:isHoliday(wh,date)};return{trucks:[],cap:0,loaded:0,held:0,free:0,avail:+c.avail,usage:0,status:c.status,uDK:0,uCN:0,nDK:0,nCN:0,holds:[],reason:'',declared:c.declared,off:c.off};}
 const trucks=trucksOf(wh,date);const f=(S.fleet[wh]||{})[date];const off=isHoliday(wh,date);
 let cap=0,loaded=0,free=0,uDK=0,uCN=0,nDK=0,nCN=0;
 for(const t of trucks){const l=loadOf(t.code);cap+=t.cap;loaded+=l;free+=Math.max(0,t.cap-l);if(t.type==='DK'){nDK++;if(l>0.001)uDK++;}else{nCN++;if(l>0.001)uCN++;}}
 const holds=S.bookings.filter(b=>b.wh===wh&&b.date===date&&b.status==='hold');
 let held=0;holds.forEach(b=>held+=Math.max(0,bkTotal(b)-allocSum(b.id)));
 const avail=Math.max(0,r2(free-held));const usage=cap?(loaded+held)/cap:0;
 const status=off?'off':!f?'none':avail<=0.005?'full':usage>=S.cfg.near/100?'near':'ok';
 return{trucks,cap,loaded:r2(loaded),held:r2(held),free:r2(free),avail,usage,status,uDK,uCN,nDK,nCN,holds,reason:f?.reason||'',declared:!!f,off};
}
const PILL={ok:'Còn chỗ',near:'Gần đầy',full:'Đã đầy',none:'Chưa mở lịch',off:'Không bốc'};
const pill=s=>`<span class="pill p-${s}"><i></i>${PILL[s]}</span>`;
const truckState=(t,l)=>l<=0.001?'empty':l>=t.cap-0.001?(l>t.cap+0.001?'over':'full'):'part';
const TS_LABEL={empty:'Trống',part:'Đang xếp',full:'Đầy',over:'Quá tải'};
const tsPill=s=>`<span class="pill ${s==='empty'?'p-ok':s==='part'?'p-near':'p-full'}"><i></i>${TS_LABEL[s]}</span>`;

/* suggestion: assign one booking (BR-04, BR-20, 5.3) */
function suggestFor(b){
 const trucks=trucksOf(b.wh,b.date);let need=bkTotal(b);const pref=need>S.cfg.split?'DK':'CN';
 const free={};trucks.forEach(t=>free[t.code]=r2(t.cap-loadOf(t.code,b.id)));
 const res=[];const used=new Set();
 const partial=t=>loadOf(t.code,b.id)>0.001;
 const relOf=t=>{const rs=truckRegions(t.code,b.id);if(rs.includes(b.region))return'same';if(rs.some(r=>relation(r,b.region)==='nb'))return'nb';return'other';};
 const fit=list=>{const c=list.filter(t=>!used.has(t.code)&&free[t.code]>=need-0.001&&stopsOk(t.code,b)).sort((x,y)=>free[x.code]-free[y.code]);if(c.length){res.push({code:c[0].code,tons:r2(need)});used.add(c[0].code);need=0;return true;}return false;};
 let guard=0;
 while(need>0.001&&guard++<40){
  if(b.region!=='NONE'){
   const p=trucks.filter(t=>t.type===pref&&partial(t));
   if(fit(p.filter(t=>relOf(t)==='same')))break;
   if(fit(p.filter(t=>relOf(t)==='nb')))break;
  }
  const empties=trucks.filter(t=>t.type===pref&&!partial(t)&&!used.has(t.code)).sort((x,y)=>x.idx-y.idx);
  if(empties.length){const t=empties[0];const take=r2(Math.min(need,t.cap));res.push({code:t.code,tons:take});used.add(t.code);need=r2(need-take);continue;}
  const p4=trucks.filter(t=>partial(t)&&!used.has(t.code)&&relOf(t)==='same'&&free[t.code]>0.001&&stopsOk(t.code,b)).sort((x,y)=>free[y.code]-free[x.code]);
  if(p4.length){const t=p4[0];const take=r2(Math.min(need,free[t.code]));res.push({code:t.code,tons:take});used.add(t.code);need=r2(need-take);continue;}
  const other=trucks.filter(t=>t.type!==pref&&!partial(t)&&!used.has(t.code)).sort((x,y)=>x.idx-y.idx);
  if(other.length){const t=other[0];const take=r2(Math.min(need,t.cap));res.push({code:t.code,tons:take});used.add(t.code);need=r2(need-take);continue;}
  break;
 }
 return{rows:res,left:r2(need)};
}

/* merge groups for a day (5.3, BR-20) */
function groupSuggest(wh,date){
 if(!S.cfg.suggestOn)return[];
 const holds=S.bookings.filter(b=>b.wh===wh&&b.date===date&&b.status==='hold'&&b.region!=='NONE').map(b=>({b,need:r2(bkTotal(b)-allocSum(b.id))})).filter(x=>x.need>0.001&&x.need<=S.cfg.split);
 const trucks=trucksOf(wh,date);
 const groups=[];const leftovers=[];
 const byReg={};holds.forEach(x=>(byReg[x.b.region]=byReg[x.b.region]||[]).push(x));
 for(const rid of Object.keys(byReg)){
  const items=byReg[rid].sort((a,b)=>b.need-a.need);
  const bins=trucks.filter(t=>t.type==='CN'&&loadOf(t.code)>0.001&&truckRegions(t.code).includes(rid)&&t.cap-loadOf(t.code)>0.001).map(t=>({truck:t.code,cap:t.cap,base:loadOf(t.code),baseCount:liveAllocsOnTruck(t.code).length,stops:truckStops(t.code),items:[],regions:new Set([rid])})).sort((a,b)=>(a.cap-a.base)-(b.cap-b.base));
  for(const it of items){
   const put=bins.find(bn=>bn.cap-bn.base-bn.items.reduce((s,i)=>s+i.need,0)>=it.need-0.001&&(bn.stops.has(addrKey(it.b))||bn.stops.size<S.cfg.maxStops));
   if(put){put.items.push(it);put.stops.add(addrKey(it.b));}
   else{const nb={truck:null,cap:S.cfg.capCN,base:0,baseCount:0,stops:new Set([addrKey(it.b)]),items:[it],regions:new Set([rid])};bins.push(nb);}
  }
  for(const bn of bins){if(!bn.items.length)continue;if(!bn.truck&&bn.items.length===1){leftovers.push(bn.items[0]);continue;}groups.push(bn);}
 }
 // neighbour pass
 const lo=leftovers.sort((a,b)=>b.need-a.need);const nbins=[];
 for(const it of lo){
  const put=nbins.find(bn=>bn.cap-bn.items.reduce((s,i)=>s+i.need,0)>=it.need-0.001&&[...bn.regions].every(r=>relation(r,it.b.region)!=='other')&&bn.stops.size<S.cfg.maxStops);
  if(put){put.items.push(it);put.regions.add(it.b.region);put.stops.add(addrKey(it.b));}else nbins.push({truck:null,cap:S.cfg.capCN,base:0,baseCount:0,stops:new Set([addrKey(it.b)]),items:[it],regions:new Set([it.b.region])});
 }
 nbins.filter(bn=>bn.items.length>1).forEach(bn=>groups.push(bn));
 return groups.map((bn,i)=>{const tons=r2(bn.base+bn.items.reduce((s,x)=>s+x.need,0));const fill=tons/bn.cap;const count=bn.baseCount+bn.items.length;
  return{key:date+'-'+i+'-'+bn.items.map(x=>x.b.id).join('|'),truck:bn.truck,cap:bn.cap,base:bn.base,items:bn.items,regions:[...bn.regions],nb:bn.regions.size>1,tons,fill,saving:bn.items.length-(bn.truck?0:1),count};})
  .filter(g=>g.count>=2&&g.fill>=S.cfg.fillMin/100&&!(V.skip||[]).includes(g.key));
}

/* ===================== render ===================== */
const app=document.getElementById('app');
function render(){
 if(!S)return;const u=me();if(!u)return;
 app.innerHTML=`${topbar(u)}<div class="shell">${sidebar(u)}<main class="main" id="main">${mainView()}</main></div>${V.modal?`<div class="scrim" data-a="scrim"><div class="modal ${V.modal.wide?'wide':''}" role="dialog" aria-modal="true">${modalView()}</div></div>`:''}${V.toast?`<div class="toast" role="status">${esc(V.toast)}</div>`:''}`;
}
function toast(t){V.toast=t;render();clearTimeout(toast._t);toast._t=setTimeout(()=>{V.toast='';const el=document.querySelector('.toast');if(el)el.remove();},3200);}

function topbar(u){const w=WH.find(x=>x.id===V.wh);
 return `<header class="top"><button class="logo" data-a="go" data-v="calendar"><span class="mark">${IC.truck.replace('<svg','<svg width="16" height="16"')}</span>ĐẶT XE</button>
 <div class="ctx">Lịch Đặt Xe – ${esc(w.full)}</div>
 <button class="userbtn" data-a="menu" aria-haspopup="true"><span class="avatar">${esc(u.name.split(' ').slice(-1)[0][0])}</span><span>${esc(u.name)}</span><span aria-hidden="true">▾</span></button>
 ${V.menu?`<div class="menu"><div class="sub">${esc(u.email)}</div><div class="sub">Vai trò: ${ROLE_LABEL[u.role]}${u.segment?' · Segment '+SEG_LABEL[u.segment]:''}${u.customerId?' · '+esc(cust(u.customerId).name)+' · '+SEG_LABEL[cust(u.customerId).segment]:''}</div><button data-a="go" data-v="profile">Hồ sơ cá nhân</button><button data-a="refresh">Tải lại dữ liệu</button><button data-a="logout">Đăng xuất</button></div>`:''}</header>`;}
const NAV=[
 {v:'calendar',label:'Lịch đặt xe',ic:'cal',ok:()=>true},
 {v:'dash',label:'Dashboard',ic:'chart',ok:()=>canAny('dash.')},
 {v:'users',label:'Setting user account',ic:'user',ok:()=>can('users.manage')||can('customers.manage')||can('perms.manage')},
 {v:'notifs',label:'Thông báo',ic:'bell',ok:()=>true},
 {v:'bookings',label:'Danh sách booking',ic:'list',ok:()=>can('booking.list')},
 {v:'approvals',label:'Approval request',ic:'inbox',ok:()=>can('approvals.view')},
 {v:'fleet',label:'Trucks capacity setting',ic:'truck',ok:()=>can('fleet.manage')},
 {v:'config',label:'Configuration',ic:'gear',ok:()=>canAny('config.')},
];
function sidebar(u){const unread=S.notifs.filter(n=>n.to.includes(u.id)&&!n.read).length;const pend=can('approvals.view')?S.bookings.filter(b=>b.status==='hold'&&myWhs().includes(b.wh)).length:0;
 return `<nav class="side" aria-label="Điều hướng">${NAV.filter(n=>n.ok()).map(n=>{const on=V.view===n.v||(n.v==='calendar'&&V.view==='day')||(n.v==='approvals'&&V.view==='booking'&&can('approvals.view'));const c=n.v==='notifs'&&unread?unread:n.v==='approvals'&&pend?pend:0;
  return `<button class="${on?'on':''}" data-a="go" data-v="${n.v}" title="${n.label}" aria-label="${n.label}">${IC[n.ic]}${c?`<span class="dot">${c}</span>`:''}</button>`;}).join('')}</nav>`;}

function mainView(){const nv=NAV.find(n=>n.v===V.view);if(nv&&!nv.ok())V.view='calendar';if(V.view==='day'&&!can('day.view'))V.view='calendar';switch(V.view){case'day':return vDay();case'bookings':return vBookings();case'approvals':return vApprovals();case'booking':return vBooking();case'fleet':return vFleet();case'config':return vConfig();case'users':return vUsers();case'notifs':return vNotifs();case'profile':return vProfile();case'dash':return vDash();default:return vCalendar();}}

/* ---------- SCR-02 calendar ---------- */
function vCalendar(){
 const[y,m]=V.ym;const n=dim(y,m);const first=dow(iso(y,m,1));const isC=role()==='customer';
 let cells='';for(let i=0;i<first;i++)cells+='<div class="cell pad" aria-hidden="true"></div>';
 for(let d=1;d<=n;d++)cells+=dayCell(iso(y,m,d));
 const tail=(7-((first+n)%7))%7;for(let i=0;i<tail;i++)cells+='<div class="cell pad" aria-hidden="true"></div>';
 return `<div class="panel"><div class="calhead"><div class="illus">${DK_SVG()}</div>
  <div class="monthnav"><button class="navbtn" data-a="month" data-d="-1" aria-label="Tháng trước">‹</button><h1>THÁNG ${pad(m)} ${y}</h1><button class="navbtn" data-a="month" data-d="1" aria-label="Tháng sau">›</button></div>
  <label class="whsel"><span>Kho:</span><select id="whsel" data-a="wh" aria-label="Chọn kho">${WH.map(w=>`<option value="${w.id}" ${w.id===V.wh?'selected':''}>${w.name}</option>`).join('')}</select></label></div>
  <div class="calwrap"><div style="min-width:0"><div class="cal">${WD.map(w=>`<div class="wd">${w}</div>`).join('')}${cells}</div>
  <div class="legend">${pill('ok')} ${pill('near')} ${pill('full')} ${isC?`<span><span class="sw" style="background:var(--blue-bg);border:1px solid var(--blue)"></span>Ngày bạn có đơn đã xác nhận</span><span><span class="sw" style="border:2px dashed var(--blue)"></span>Đơn đang chờ xác nhận</span>`:`<span><span class="sw" style="background:var(--pend-bg)"></span>Booking đang giữ chỗ</span><span>${DK_SVG().replace('<svg','<svg width="30" height="13" style="vertical-align:-2px"')} Đầu kéo · ${CN_SVG().replace('<svg','<svg width="30" height="13" style="vertical-align:-2px"')} Container</span>`}</div></div>
  ${statsPanel()}</div></div>`;
}
function dayCell(date){
 const m=dayM(V.wh,date);const d=parts(date)[2];const past=date<TODAY;const isC=role()==='customer';const today=date===TODAY;
 const head=`<div class="ctop"><span class="dnum ${m.declared&&!m.off?'':'lite'}">${d}</span><span class="wdmobile small muted">${WDS[dow(date)]} · ${dm(date)}</span>${m.declared&&!m.off?(isC&&false?'':pill(m.status)):''}</div>`;
 if(m.off)return `<div class="cell ${past?'past':''} ${today?'today':''}">${head}<div class="kv">Không bốc hàng</div></div>`;
 if(!m.declared)return `<div class="cell ${past?'past':''} ${today?'today':''}">${head}<div class="kv">Chưa mở lịch xe</div>${can('fleet.manage')&&!past?`<div class="cacts"><button class="btn ghost sm" data-a="go" data-v="fleet">Khai báo xe</button></div>`:''}</div>`;
 if(isC){
  const mine=S.bookings.filter(b=>b.wh===V.wh&&b.date===date&&b.customerId===me().customerId);
  const ok=mine.filter(b=>b.status==='ok');const pend=mine.filter(b=>b.status==='hold');
  const cls=ok.length?'mine':pend.length?'mine-pend':'';
  return `<div class="cell ${cls} ${past?'past':''} ${today?'today':''}">${head}
   <div class="bigavail num">${t2(m.avail)} t<small>Có thể đặt</small></div>
   ${ok.length?`<div class="minebox num">Bạn đã đặt: ${t2(ok.reduce((s,b)=>s+bkTotal(b),0))} t</div>`:''}
   ${pend.length?`<div class="small" style="color:var(--blue);font-weight:600">Đang chờ xác nhận: ${t2(pend.reduce((s,b)=>s+bkTotal(b),0))} t</div>`:''}
   ${mine.filter(b=>b.status!=='draft').length?`<div class="cacts"><button class="btn sm" data-a="custDay" data-d="${date}">Chi tiết</button></div>`:''}</div>`;
 }
 const holds=m.holds.filter(b=>ownsCust(b.customerId));const ht=holds.reduce((s,b)=>s+bkTotal(b)-allocSum(b.id),0);
 return `<div class="cell ${past?'past':''} ${today?'today':''}" ${m.reason?`title="${esc(m.reason)}"`:''}>${head}
  <div class="kv num">Đã đặt: <b>${t2(m.loaded)} t</b></div>
  <div class="kv num">Có thể đặt: <b>${t2(m.avail)} t</b></div>
  <div class="tk num"><span>${DK_SVG()}${m.uDK}/${m.nDK}</span><span>${CN_SVG()}${m.uCN}/${m.nCN}</span></div>
  ${holds.length?`<div class="pendbox num">${holds.length} booking giữ chỗ (~${t2(ht)} t)</div>`:''}
  <div class="cacts">${can('day.view')?`<button class="btn sm" data-a="openDay" data-d="${date}">Chi tiết</button>`:''}${can('booking.create')&&!past?`<button class="btn ghost sm" data-a="newBk" data-d="${date}">+ Đặt hàng</button>`:''}</div></div>`;
}
function statsPanel(){
 const[y,m]=V.ym;const n=dim(y,m);let tDK=0,tCN=0,uDK=0,uCN=0,tons=0,cap=0;
 for(let d=1;d<=n;d++){const mm=dayM(V.wh,iso(y,m,d));tDK+=mm.nDK;tCN+=mm.nCN;uDK+=mm.uDK;uCN+=mm.uCN;tons+=mm.loaded;cap+=mm.cap;}
 if(role()==='customer'){const mine=S.bookings.filter(b=>b.wh===V.wh&&b.customerId===me().customerId&&b.date.startsWith(`${y}-${pad(m)}`));const ok=mine.filter(b=>b.status==='ok');
  return `<aside class="stats"><h3>THỐNG KÊ CỦA BẠN</h3><div class="bignum num"><small>TỔNG SỐ TẤN ĐÃ XÁC NHẬN</small>${t2(ok.reduce((s,b)=>s+bkTotal(b),0))}</div>
  <div><div class="lbl">Booking trong tháng</div><div class="line">Đã xác nhận: ${ok.length}</div><div class="line">Đang chờ: ${mine.filter(b=>b.status==='hold').length}</div></div>
  <div><div class="lbl">Sales phụ trách</div><div>${esc(user(cust(me().customerId).salesId).name)}</div><div class="muted small">${esc(user(cust(me().customerId).salesId).phone||'')} · ${esc(user(cust(me().customerId).salesId).email)}</div></div></aside>`;}
 return `<aside class="stats"><h3>THỐNG KÊ</h3>
  <div><div class="lbl">Tổng lượt xe</div><div class="line num">${DK_SVG()} ${tDK}</div><div class="line num">${CN_SVG()} ${tCN}</div></div>
  <div><div class="lbl">Đã dùng</div><div class="line num">${DK_SVG()} ${uDK}/${tDK}</div><div class="line num">${CN_SVG()} ${uCN}/${tCN}</div></div>
  <div class="bignum num"><small>TỔNG SỐ TẤN</small>${Math.round(tons).toLocaleString('vi-VN')}</div>
  <div class="bignum num"><small>% SỬ DỤNG</small>${cap?pct(tons/cap):'0%'}</div></aside>`;
}

/* ---------- SCR-03 day ---------- */
function vDay(){
 const date=V.day;const m=dayM(V.wh,date);const past=date<TODAY;const isLog=can('fleet.manage');
 const regs=[...new Set(S.bookings.filter(b=>b.wh===V.wh&&b.date===date&&['hold','ok'].includes(b.status)).map(b=>b.region))];
 const groups=isLog||role()!=='customer'?groupSuggest(V.wh,date):[];
 const card=t=>truckCard(t,past);
 const filt=t=>{const l=loadOf(t.code);const s=truckState(t,l);const f=V.dayFilter;if(f.st!=='all'&&!(f.st===s||(f.st==='full'&&s==='over')))return false;return true;};
 const dk=m.trucks.filter(t=>t.type==='DK').filter(filt),cn=m.trucks.filter(t=>t.type==='CN').filter(filt);
 const holdsVis=m.holds.filter(b=>visibleBk(b)&&(V.dayFilter.region==='all'||b.region===V.dayFilter.region));
 const byReg={};holdsVis.forEach(b=>(byReg[b.region]=byReg[b.region]||[]).push(b));
 const full=m.trucks.filter(t=>truckState(t,loadOf(t.code))!=='empty'&&truckState(t,loadOf(t.code))!=='part').length;
 const part=m.trucks.filter(t=>truckState(t,loadOf(t.code))==='part').length;
 return `<div class="panel">
 <div class="crumb"><button class="linkbtn" data-a="go" data-v="calendar">← Lịch tháng ${pad(parts(date)[1])}</button><span class="muted">/</span><b>${dmy(date)}</b><span class="grow"></span><button class="navbtn" data-a="dayNav" data-d="-1" aria-label="Ngày trước">‹</button><button class="navbtn" data-a="dayNav" data-d="1" aria-label="Ngày sau">›</button></div>
 <div class="dayhead"><h2>DANH SÁCH ĐỘI XE & TÌNH TRẠNG XẾP HÀNG – ${WH.find(w=>w.id===V.wh).full.toUpperCase()} | Ngày: ${dmy(date)}</h2>${m.declared&&!m.off?pill(m.status):''}</div>
 ${past?`<div class="note">Ngày đã qua: chỉ xem, không thay đổi (BR-12).</div>`:''}
 ${m.reason?`<div class="note"><b>Ghi chú ngày:</b> ${esc(m.reason)}</div>`:''}
 ${!m.declared||m.off?`<div class="empty">${m.off?'Ngày nghỉ – không bốc hàng.':'Chưa khai báo xe cho ngày này.'} ${isLog&&!m.off?'<button class="btn sm" data-a="go" data-v="fleet">Khai báo xe</button>':''}</div>`:`
 <div class="filters"><div class="field"><label for="f-st">Trạng thái xe</label><select id="f-st" class="inp" data-a="dayFilter" data-k="st">${[['all','Tất cả'],['empty','Trống'],['part','Đang xếp'],['full','Đầy']].map(([v,l])=>`<option value="${v}" ${V.dayFilter.st===v?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="field"><label for="f-rg">Khu vực</label><select id="f-rg" class="inp" data-a="dayFilter" data-k="region"><option value="all">Tất cả khu vực</option>${regs.map(r=>`<option value="${r}" ${V.dayFilter.region===r?'selected':''}>${esc(regName(r))}</option>`).join('')}</select></div></div>
 <div class="daygrid"><div style="min-width:0">
  <div class="grp"><h3>${m.nDK} xe đầu kéo (DK)</h3><div class="cards">${dk.map(card).join('')||'<div class="muted small">Không có xe phù hợp bộ lọc.</div>'}</div></div>
  <div class="grp"><h3>${m.nCN} xe container (CN)</h3><div class="cards">${cn.map(card).join('')||'<div class="muted small">Không có xe phù hợp bộ lọc.</div>'}</div></div>
 </div>
 <aside class="panel" style="padding:12px 14px;background:var(--surface)">
  <div class="tabs" role="tablist"><button class="${V.dayTab==='pending'?'on':''}" data-a="dayTab" data-t="pending">BOOKING CHỜ XẾP XE <span class="cnt">${holdsVis.length}</span></button><button class="${V.dayTab==='merge'?'on':''}" data-a="dayTab" data-t="merge">GỢI Ý GỘP XE ${groups.length?`<span class="cnt" style="background:var(--ok)">${groups.length}</span>`:''}</button></div>
  ${V.dayTab==='pending'?(Object.keys(byReg).length?Object.entries(byReg).map(([rid,list])=>`<div class="rgrp"><h4><span>${esc(regName(rid))}</span><span class="num">${list.length} booking · ${t2(list.reduce((s,b)=>s+bkTotal(b),0))} t</span></h4>${list.map(b=>pendItem(b,past)).join('')}</div>`).join(''):'<div class="empty small">Không có booking chờ xếp xe.</div>')
   :(groups.length?groups.map(g=>suggCard(g,past)).join(''):'<div class="empty small">Chưa có nhóm gộp đạt điều kiện (cùng khu vực, ≥ 2 booking, lấp đầy ≥ '+S.cfg.fillMin+'%, tối đa '+S.cfg.maxStops+' điểm giao).</div>')}
 </aside></div>
 <div class="foot num"><span>TỔNG SỐ: ${m.trucks.length} XE</span><span>ĐẦY: ${full}</span><span>ĐANG XẾP: ${part}</span><span>TRỐNG: ${m.trucks.length-full-part}</span><span>· Đã xếp: ${t2(m.loaded)} t</span><span>Đang giữ chỗ: ${t2(m.held)} t</span><span>Có thể đặt: ${t2(m.avail)} t</span><span class="grow"></span>${can('booking.create')&&!past?`<button class="btn" data-a="newBk" data-d="${date}">Đặt hàng mới</button>`:''}</div>`}
 </div>`;
}
function truckCard(t,past){
 const al=liveAllocsOnTruck(t.code);const l=r2(al.reduce((s,a)=>s+a.tons,0));const s=truckState(t,l);const regs=truckRegions(t.code);
 const segs=al.map(a=>{const b=bkById(a.bk);const own=ownsCust(b.customerId);return `<span style="width:${Math.min(100,a.tons/t.cap*100)}%;background:${own?custColor(b.customerId):'var(--mask)'}" title="${own?esc(cust(b.customerId).name):'Khách khác'} ${t2(a.tons)} t"></span>`;}).join('');
 const lines=al.slice(0,2).map(a=>{const b=bkById(a.bk);return `<div>${ownsCust(b.customerId)?esc(cust(b.customerId).name):'Khách khác'} · ${t2(a.tons)} t · ${esc(b.addrText.split(',').pop().trim())}</div>`;}).join('')+(al.length>2?`<div class="muted">+${al.length-2} phần hàng khác</div>`:'');
 const badRegion=regs.length>1&&regs.some((r,i)=>regs.some((q,j)=>j>i&&relation(r,q)==='other'));
 const hl=V.hl&&V.hl.includes(t.code)?'hl':'';const dim=V.dayFilter.region!=='all'&&regs.length&&!regs.includes(V.dayFilter.region)?'dim':'';
 return `<div class="tcard ${s==='full'||s==='over'?'full':''} ${hl} ${dim}" data-a="truck" data-c="${t.code}" tabindex="0" role="button" aria-label="Xe ${t.short}">
  <div class="tc-top">${TICON(t.type)}<span class="grow"></span>${tsPill(s)}</div><div style="min-width:0"><div class="tc-code">${t.short}</div><div class="tc-full muted">${t.code}</div></div>
  <div class="small num">${pct(l/t.cap)} (${t2(l)}/${t.cap} t)</div><div class="bar">${segs}</div>
  ${regs.length?`<div class="row" style="gap:4px">${regs.map(r=>`<span class="rtag ${badRegion?'warn':''}">${esc(regName(r))}</span>`).join('')}${badRegion?'<span class="small" title="Khác khu vực" style="color:var(--bad)">⚠</span>':''}</div>`:''}
  ${al.length?`<div class="tc-lines">${lines}</div>`:''}
  <div class="tc-acts"><button class="btn ghost sm" data-a="truck" data-c="${t.code}">Chi tiết</button>${can('alloc.assign')&&!past&&l<t.cap-0.001?`<button class="btn sm" data-a="place" data-c="${t.code}">Xếp đơn</button>`:''}</div></div>`;
}
function pendItem(b,past){const need=r2(bkTotal(b)-allocSum(b.id));const wait=S.clock-b.heldAt;const pref=bkTotal(b)>S.cfg.split?'DK':'CN';
 return `<div class="pitem"><div class="row"><b class="grow">${esc(cust(b.customerId).name)}</b><span class="chip">${pref}</span></div>
 <div class="small muted">${b.id} · ${esc(b.ref)}</div>
 <div class="small">${b.lines.map(l=>esc(l.p)).join(', ')} · <b class="num">${t2(bkTotal(b))} t</b>${need<bkTotal(b)?` <span class="muted num">(còn ${t2(need)} t chưa gán)</span>`:''}</div>
 <div class="small muted">${esc(b.addrText)} · chờ <span style="color:${wait>S.cfg.sla?'var(--bad)':wait>45?'var(--warn)':'inherit'};font-weight:700">${wait} phút</span></div>
 <div class="row"><button class="btn sm" data-a="openBk" data-id="${b.id}">${can('alloc.assign')&&!past?'Xếp xe':'Xem'}</button></div></div>`;}
function suggCard(g,past){
 const tlabel=g.truck?`ghép vào ${truckByCode(g.truck).short} (đang có ${t2(g.base)} t)`:'1 container mới';
 return `<div class="sugg ${g.nb?'nb':''}" data-a="hlGroup" data-k="${esc(g.key)}">
 <div class="row"><b class="grow">${g.regions.map(regName).map(esc).join(' + ')}</b><span class="chip">${g.nb?'Lân cận':'Cùng khu vực'}</span></div>
 <div class="small">${g.items.map(x=>`${esc(cust(x.b.customerId).name)} <b class="num">${t2(x.need)} t</b>`).join(' + ')}</div>
 <div class="small num">→ ${tlabel}: <b>${t2(g.tons)}/${g.cap} t (${pct(g.fill)})</b>${g.saving>0?` · tiết kiệm ${g.saving} xe`:''}</div>
 ${g.nb?'<div class="small" style="color:var(--warn)">Khác tỉnh nhưng lân cận: Logistics tự quyết định.</div>':''}
 ${can('merge.apply')&&!past?`<div class="row"><button class="btn sm" data-a="applyGroup" data-k="${esc(g.key)}">Áp dụng</button><button class="btn ghost sm" data-a="skipGroup" data-k="${esc(g.key)}">Bỏ qua</button></div>`:''}</div>`;
}

/* ---------- SCR-09 bookings list ---------- */
function vBookings(){
 const tabs=[['all','Tất cả'],['draft','Nháp'],['hold','Chờ xếp xe'],['ok','Đã xác nhận'],['resched','Đề nghị đổi ngày'],['closed','Từ chối / Đã hủy']].filter(t=>t[0]!=='draft'||can('booking.create'));
 const f=V.blF;const q=f.q.trim().toLowerCase();
 let list=S.bookings.filter(visibleBk).filter(b=>V.blTab==='all'?true:V.blTab==='closed'?['rejected','cancelled'].includes(b.status):b.status===V.blTab)
  .filter(b=>f.wh==='all'||b.wh===f.wh).filter(b=>f.region==='all'||b.region===f.region)
  .filter(b=>!q||(b.id+' '+b.ref+' '+cust(b.customerId).name).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 return `<div class="panel"><div class="pagehead"><h2>DANH SÁCH BOOKING</h2>${can('booking.create')?`<button class="btn" data-a="newBk" data-d="${TODAY}">Đặt hàng mới</button>`:''}</div>
 <div class="tabs">${tabs.map(([k,l])=>`<button class="${V.blTab===k?'on':''}" data-a="blTab" data-t="${k}">${l}</button>`).join('')}</div>
 <div class="filters"><div class="field"><label for="bl-wh">Kho</label><select id="bl-wh" class="inp" data-a="blF" data-k="wh"><option value="all">Tất cả kho</option>${WH.map(w=>`<option value="${w.id}" ${f.wh===w.id?'selected':''}>${w.name}</option>`).join('')}</select></div>
 <div class="field"><label for="bl-rg">Khu vực</label><select id="bl-rg" class="inp" data-a="blF" data-k="region"><option value="all">Tất cả</option>${S.regions.filter(r=>f.wh==='all'||r.wh===f.wh).map(r=>`<option value="${r.id}" ${f.region===r.id?'selected':''}>${esc(r.name)} (${r.wh})</option>`).join('')}</select></div>
 <div class="field grow"><label for="bl-q">Tìm mã booking, ref, khách</label><input id="bl-q" class="inp" data-f="blq" value="${esc(f.q)}" placeholder="Ví dụ: Lysaght, SO-45…"></div></div>
 <div class="tbl-wrap"><table><thead><tr><th>Mã booking</th><th>Ngày bốc</th><th>Kho</th><th>Khách hàng</th><th>Segment</th><th>Ref</th><th class="r">Tổng tấn</th><th>Loại gợi ý</th><th>Khu vực</th><th>Xe đã gán</th><th>Trạng thái</th></tr></thead>
 <tbody>${list.map(b=>`<tr class="click" data-a="openBk" data-id="${b.id}"><td>${b.id}</td><td class="num">${dmy(b.date)}</td><td>${b.wh}</td><td>${esc(cust(b.customerId).name)}</td><td>${SEG_LABEL[cust(b.customerId).segment]}</td><td>${esc(b.ref)}</td><td class="r num">${t2(bkTotal(b))}</td><td>${bkTotal(b)>S.cfg.split?'DK':'CN'}</td><td>${esc(regName(b.region))}</td><td class="small">${allocsOf(b.id).map(a=>a.truck.split('-').slice(2).join('-')).join(', ')||'–'}</td><td><span class="st st-${b.status}">${ST_LABEL[b.status]}</span></td></tr>`).join('')||`<tr><td colspan="11" class="empty">Không có booking phù hợp.</td></tr>`}</tbody></table></div></div>`;
}

/* ---------- SCR-10 approvals ---------- */
function vApprovals(){
 const whs=myWhs();
 const list=S.bookings.filter(b=>b.status==='hold'&&whs.includes(b.wh)).sort((a,b)=>a.date.localeCompare(b.date)||a.heldAt-b.heldAt);
 const merge=new Set();[...new Set(list.map(b=>b.wh+'|'+b.date))].forEach(k=>{const[w,d]=k.split('|');groupSuggest(w,d).forEach(g=>g.items.forEach(x=>merge.add(x.b.id)));});
 return `<div class="panel"><div class="pagehead"><h2>APPROVAL REQUEST</h2><span class="muted">${list.length} booking đang giữ chỗ · thời hạn phản hồi ${S.cfg.sla} phút</span></div>
 <div class="tbl-wrap"><table><thead><tr><th>Ngày bốc</th><th>Kho</th><th>Mã booking</th><th>Khách hàng</th><th>Ref</th><th class="r">Tổng tấn</th><th>Loại gợi ý</th><th>Khu vực</th><th>Nơi giao</th><th>CS tạo</th><th>Giữ chỗ lúc</th><th>Chờ</th></tr></thead>
 <tbody>${list.map(b=>{const w=S.clock-b.heldAt;const m=dayM(b.wh,b.date);const short=m.free<bkTotal(b)-allocSum(b.id);
  return `<tr class="click" data-a="openBk" data-id="${b.id}"><td class="num">${dmy(b.date)}</td><td>${b.wh}</td><td>${b.id}</td><td>${esc(cust(b.customerId).name)}</td><td>${esc(b.ref)}</td><td class="r num">${t2(bkTotal(b))}</td><td>${bkTotal(b)>S.cfg.split?'DK':'CN'}</td><td>${esc(regName(b.region))} ${merge.has(b.id)?'<span class="chip" style="color:var(--ok)">Có thể gộp</span>':''}</td><td class="small">${esc(b.addrText)}</td><td>${esc(user(b.csId).name)}</td><td class="num">${clockStr(b.heldAt)}</td><td class="num" style="font-weight:700;color:${w>S.cfg.sla?'var(--bad)':w>45?'var(--warn)':'inherit'}">${w} phút${short?'<div class="err">Không đủ chỗ trên xe</div>':''}</td></tr>`;}).join('')||`<tr><td colspan="12" class="empty">Không có booking chờ xử lý.</td></tr>`}</tbody></table></div></div>`;
}

/* ---------- SCR-11 booking detail & assign ---------- */
function initAsg(id){const rows={};allocsOf(id).forEach(a=>rows[a.truck]=a.tons);V.asg={id,rows,reason:'',edit:bkById(id).status==='hold',panel:'',rej:'',newDate:'',resReason:'',err:''};}
function asgCheck(b){
 const rows=V.asg.rows;const trucks=trucksOf(b.wh,b.date);const sum=r2(Object.values(rows).reduce((s,v)=>s+(num(v)||0),0));const warns=[];const pref=bkTotal(b)>S.cfg.split?'DK':'CN';
 for(const t of trucks){const v=num(rows[t.code])||0;if(v<=0)continue;const ex=loadOf(t.code,b.id);
  if(ex+v>t.cap+0.001)warns.push(`${t.short} vượt tải trọng: ${t2(ex+v)}/${t.cap} t`);
  if(t.type!==pref)warns.push(`${t.short} khác loại xe gợi ý (đơn ${t2(bkTotal(b))} t → ${pref})`);
  const rs=truckRegions(t.code,b.id);if(rs.length&&b.region!=='NONE'&&rs.every(r=>relation(r,b.region)==='other'))warns.push(`${t.short} đang chở hàng khu vực khác (${rs.map(regName).join(', ')})`);
  if(!stopsOk(t.code,b))warns.push(`${t.short} vượt ${S.cfg.maxStops} điểm giao`);}
 return{sum,warns,total:bkTotal(b)};
}
function vBooking(){
 const b=bkById(V.bk);if(!b)return '<div class="panel empty">Không tìm thấy booking.</div>';
 if(!V.asg||V.asg.id!==b.id)initAsg(b.id);
 const isLog=can('alloc.assign');const past=b.date<TODAY;const c=cust(b.customerId);const A=V.asg;const editable=isLog&&ownsCust(b.customerId)&&A.edit&&!past&&['hold','ok'].includes(b.status);
 const trucks=trucksOf(b.wh,b.date);const pref=bkTotal(b)>S.cfg.split?'DK':'CN';
 const relOf=t=>{const rs=truckRegions(t.code,b.id);if(!rs.length)return'';if(rs.includes(b.region))return'same';if(rs.some(r=>relation(r,b.region)==='nb'))return'nb';return'other';};
 const order=r=>({same:0,nb:1,'':2,other:3})[r];
 const sorted=[...trucks].sort((x,y)=>(x.type===pref?0:1)-(y.type===pref?0:1)||order(relOf(x))-order(relOf(y))||x.idx-y.idx);
 const chk=asgCheck(b);
 const hist=S.audit.filter(a=>a.obj===b.id);
 return `<div class="panel"><div class="crumb"><button class="linkbtn" data-a="back">← Quay lại</button><span class="muted">/</span><b>${b.id}</b><span class="st st-${b.status}">${ST_LABEL[b.status]}</span></div>
 <div class="pagehead"><h2>CHI TIẾT BOOKING & GÁN XE</h2>${(b.status==='draft'?b.csId===V.me:can('booking.edit'))&&ownsCust(b.customerId)&&['draft','hold','ok','resched'].includes(b.status)&&!past?`<button class="btn ghost" data-a="editBk" data-id="${b.id}">Sửa booking</button>`:''}</div>
 <div class="bdgrid"><div class="panel" style="background:var(--sand)">
  <dl class="dl"><dt>Kho</dt><dd>${WH.find(w=>w.id===b.wh).full}</dd><dt>Ngày bốc</dt><dd class="num">${dmy(b.date)}</dd><dt>Ngày giao YC</dt><dd>${b.delivery?dmy(b.delivery):'–'}</dd>
  <dt>Khách hàng</dt><dd>${ownsCust(b.customerId)?`${esc(c.name)}<div class="small muted">${SEG_LABEL[c.segment]} · Sales: ${esc(user(c.salesId).name)}</div>`:'–'}</dd><dt>Ref</dt><dd>${esc(b.ref)}</dd><dt>Địa chỉ giao</dt><dd>${esc(b.addrText)}<div class="small muted">${esc(b.province)}</div></dd>
  <dt>Khu vực</dt><dd>${can('booking.region')&&ownsCust(b.customerId)&&!past&&['hold','ok'].includes(b.status)?`<select class="inp" id="bk-region" data-a="bkRegion"><option value="NONE" ${b.region==='NONE'?'selected':''}>Chưa phân khu vực</option>${regionsOf(b.wh).map(r=>`<option value="${r.id}" ${b.region===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select>`:esc(regName(b.region))}</dd>
  <dt>Tổng tấn</dt><dd class="num"><b>${t2(bkTotal(b))} t</b> · gợi ý ${pref}</dd><dt>CS tạo</dt><dd>${esc(user(b.csId).name)}${b.status!=='draft'?` · giữ chỗ ${clockStr(b.heldAt)}`:''}</dd>
  ${b.note?`<dt>Ghi chú</dt><dd>${esc(b.note)}</dd>`:''}${b.rejectReason?`<dt>Lý do</dt><dd>${esc(b.rejectReason)}</dd>`:''}${b.proposedDate?`<dt>Ngày đề xuất</dt><dd>${dmy(b.proposedDate)}</dd>`:''}</dl>
  <ul class="lines">${b.lines.map(l=>`<li>${esc(l.p)} · ${esc(l.c)} · ${l.th}×${l.w} · <b class="num">${t2(l.t)} t</b></li>`).join('')}</ul>
  ${hist.length?`<h4 style="margin:12px 0 4px;font-size:12px">LỊCH SỬ</h4><ul class="hist">${hist.map(h=>`<li>${clockStr(h.at)} · ${esc(h.who)}: ${esc(h.text)}</li>`).join('')}</ul>`:''}
 </div>
 <div style="min-width:0">${!trucks.length?'<div class="empty">Ngày này chưa khai báo xe.</div>':`
  <div class="row" style="margin-bottom:8px"><h3 class="grow" style="font-size:15px">GÁN XE</h3>${editable?`<button class="btn ghost sm" data-a="asgSuggest">Gợi ý xếp xe</button>`:''}${isLog&&!A.edit&&b.status==='ok'&&!past?`<button class="btn ghost sm" data-a="asgEdit">Xếp lại</button>`:''}</div>
  <div class="tbl-wrap"><table><thead><tr><th>Xe</th><th class="r">Đã xếp / Tải trọng</th><th class="r">Còn trống</th><th>Khu vực trên xe</th><th class="r">Số tấn xếp</th></tr></thead><tbody>
  ${sorted.map(t=>{const ex=loadOf(t.code,b.id);const r=relOf(t);const v=A.rows[t.code]||'';
   return `<tr><td><span class="row" style="gap:6px;flex-wrap:nowrap">${TICON(t.type).replace('<svg','<svg width="38" height="16"')}<b>${t.short}</b>${t.type!==pref?'<span class="muted small">khác loại</span>':''}</span></td><td class="r num">${t2(ex)} / ${t.cap}</td><td class="r num">${t2(t.cap-ex)}</td>
   <td>${truckRegions(t.code,b.id).map(x=>esc(regName(x))).join(', ')||'<span class="muted small">Xe trống</span>'} ${r?`<span class="rel rel-${r}">${r==='same'?'Cùng khu vực':r==='nb'?'Lân cận':'Khác khu vực'}</span>`:''}</td>
   <td class="r">${editable?`<input class="inp asg-inp num" inputmode="decimal" data-f="asg" data-c="${t.code}" value="${v}" aria-label="Số tấn xếp lên ${t.short}">`:`<span class="num">${v?t2(v):'–'}</span>`}</td></tr>`;}).join('')}
  </tbody></table></div>
  <div id="asg-live">${asgLive(b,chk,editable)}</div>
  ${editable||can('booking.reject')&&b.status==='hold'&&!past?asgActions(b):''}`}</div></div></div>`;
}
function asgLive(b,chk,editable){
 const ok=Math.abs(chk.sum-chk.total)<0.005;
 return `<div class="sumbar num ${ok?'good':'badd'}">Đã gán ${t2(chk.sum)} / ${t2(chk.total)} tấn ${ok?'· khớp':chk.sum>chk.total?'· thừa '+t2(chk.sum-chk.total)+' t':'· còn thiếu '+t2(chk.total-chk.sum)+' t'}</div>
 ${chk.warns.length?`<div class="warnlist"><b>Cần lý do override (BR-04, BR-06, BR-22):</b><ul style="margin:4px 0 0;padding-left:18px">${chk.warns.map(w=>`<li>${esc(w)}</li>`).join('')}</ul></div>`:''}
 ${editable&&chk.warns.length?`<div class="field" style="margin-bottom:8px"><label for="asg-reason">Lý do override <span class="req">*</span></label><input id="asg-reason" class="inp" data-f="asgReason" value="${esc(V.asg.reason)}" placeholder="Ví dụ: hết container, khách đồng ý đi ghép"></div>`:''}`;
}
function asgActions(b){const A=V.asg;
 return `${A.err?`<div class="err" style="margin:6px 0">${esc(A.err)}</div>`:''}
 ${A.panel==='rej'?`<div class="panel" style="margin:8px 0"><div class="field"><label for="rej">Lý do từ chối <span class="req">*</span></label><input id="rej" class="inp" data-f="rej" value="${esc(A.rej)}"></div><div class="mfoot"><button class="btn ghost sm" data-a="asgPanel" data-p="">Thôi</button><button class="btn danger sm" data-a="asgReject">Xác nhận từ chối</button></div></div>`:''}
 ${A.panel==='res'?`<div class="panel" style="margin:8px 0"><div class="fgrid"><div class="field"><label for="res-d">Ngày đề xuất <span class="req">*</span></label><select id="res-d" class="inp" data-f="resDate"><option value="">Chọn ngày</option>${[...Array(10)].map((_,i)=>addDays(b.date,i+1)).filter(d=>S.fleet[b.wh][d]&&!isHoliday(b.wh,d)).map(d=>`<option value="${d}" ${A.newDate===d?'selected':''}>${WDS[dow(d)]} ${dmy(d)} · có thể đặt ${t2(dayM(b.wh,d).avail)} t</option>`).join('')}</select></div><div class="field"><label for="res-r">Lý do <span class="req">*</span></label><input id="res-r" class="inp" data-f="resReason" value="${esc(A.resReason)}"></div></div><div class="mfoot"><button class="btn ghost sm" data-a="asgPanel" data-p="">Thôi</button><button class="btn sm" data-a="asgResched">Gửi đề nghị đổi ngày</button></div></div>`:''}
 <div class="mfoot">${b.status==='hold'&&can('booking.reject')?`<button class="btn ghost" data-a="asgPanel" data-p="rej">Từ chối</button><button class="btn ghost" data-a="asgPanel" data-p="res">Đề nghị đổi ngày</button>`:''}${A.edit?`<button class="btn ghost" data-a="asgSave">Lưu xếp tạm</button><button class="btn" data-a="asgConfirm">Xác nhận</button>`:''}</div>`;}

/* ---------- SCR-12 fleet ---------- */
function vFleet(){
 const[y,m]=V.ym;const n=dim(y,m);const E=V.fleetEdit;
 let rows='';for(let d=1;d<=n;d++){const ds=iso(y,m,d);const f=S.fleet[V.wh][ds];const off=isHoliday(V.wh,ds);const past=ds<TODAY;const e=E[ds]||{};const mm=dayM(V.wh,ds);
  const busyDK=mm.trucks.filter(t=>t.type==='DK'&&loadOf(t.code)>0.001).length,busyCN=mm.trucks.filter(t=>t.type==='CN'&&loadOf(t.code)>0.001).length;
  const dk=e.dk??f?.dk??'',cn=e.cn??f?.cn??'',reason=e.reason??f?.reason??'';
  rows+=`<tr style="${off?'opacity:.55':''}"><td class="num"><b>${pad(d)}/${pad(m)}</b> <span class="muted">${WDS[dow(ds)]}</span></td>
  ${off?`<td colspan="7" class="muted">Không bốc hàng (ngày nghỉ)</td>`:`<td><input class="inp num" style="width:64px" inputmode="numeric" data-f="fl" data-d="${ds}" data-k="dk" value="${dk}" ${past?'disabled':''} aria-label="Số DK ngày ${d}"></td>
  <td><input class="inp num" style="width:64px" inputmode="numeric" data-f="fl" data-d="${ds}" data-k="cn" value="${cn}" ${past?'disabled':''} aria-label="Số CN ngày ${d}"></td>
  <td class="r num">${(+dk||0)*S.cfg.capDK+(+cn||0)*S.cfg.capCN}</td><td class="r num">${t2(mm.loaded)} / ${t2(mm.held)}</td><td class="num">DK ${busyDK} · CN ${busyCN}</td>
  <td><input class="inp" data-f="fl" data-d="${ds}" data-k="reason" value="${esc(reason)}" ${past?'disabled':''} placeholder="Bắt buộc khi giảm xe" aria-label="Lý do ngày ${d}"></td><td class="small muted">${f?esc(f.by)+' · '+esc(f.at):'Chưa khai báo'}</td>`}</tr>`;}
 const dirty=Object.keys(E).length;
 return `<div class="panel"><div class="pagehead"><h2>TRUCKS CAPACITY SETTING</h2><label class="whsel"><span>Kho:</span><select data-a="wh" aria-label="Chọn kho">${WH.map(w=>`<option value="${w.id}" ${w.id===V.wh?'selected':''}>${w.name}</option>`).join('')}</select></label><div class="monthnav"><button class="navbtn" data-a="month" data-d="-1" aria-label="Tháng trước">‹</button><b>THÁNG ${pad(m)}/${y}</b><button class="navbtn" data-a="month" data-d="1" aria-label="Tháng sau">›</button></div></div>
 <div class="panel" style="background:var(--sand);margin-bottom:12px"><div class="row"><b>Áp dụng hàng loạt</b><span class="small muted">Bỏ qua ngày nghỉ và ngày đã qua</span></div>
 <div class="filters" style="margin:8px 0 0"><div class="field"><label for="bk-from">Từ ngày</label><input id="bk-from" type="date" class="inp" value="${V.bulk?.from||TODAY}" data-f="bulk" data-k="from"></div><div class="field"><label for="bk-to">Đến ngày</label><input id="bk-to" type="date" class="inp" value="${V.bulk?.to||addDays(TODAY,6)}" data-f="bulk" data-k="to"></div>
 <div class="field" style="min-width:90px"><label for="bk-dk">Số DK</label><input id="bk-dk" class="inp" inputmode="numeric" value="${V.bulk?.dk??9}" data-f="bulk" data-k="dk"></div><div class="field" style="min-width:90px"><label for="bk-cn">Số CN</label><input id="bk-cn" class="inp" inputmode="numeric" value="${V.bulk?.cn??4}" data-f="bulk" data-k="cn"></div><button class="btn ghost" data-a="bulkApply">Điền vào bảng</button></div></div>
 <div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th>Số DK</th><th>Số CN</th><th class="r">Capacity (t)</th><th class="r">Đã xếp / Giữ chỗ (t)</th><th>Xe đang có hàng</th><th>Lý do điều chỉnh</th><th>Cập nhật</th></tr></thead><tbody>${rows}</tbody></table></div>
 ${V.fleetErr?`<div class="err" style="margin-top:10px">${V.fleetErr}</div>`:''}
 <div class="mfoot"><span class="muted small grow" style="align-self:center">${dirty?dirty+' ngày đã thay đổi, chưa lưu':'Chưa có thay đổi'}</span><button class="btn ghost" data-a="fleetReset" ${dirty?'':'disabled'}>Hủy thay đổi</button><button class="btn" data-a="fleetSave" ${dirty?'':'disabled'}>Lưu</button></div></div>`;
}

/* ---------- SCR-13 config ---------- */
function vConfig(){const C=S.cfg;
 const tabs=[['general','Ngưỡng & tải trọng','config.general'],['regions','Khu vực giao hàng','config.regions'],['catalog','Sản phẩm, màu, độ dày, khổ','config.catalog'],['holiday','Ngày nghỉ','config.general']].filter(t=>can(t[2]));
 if(!tabs.some(t=>t[0]===V.cfgTab))V.cfgTab=tabs[0]?tabs[0][0]:'general';const T=V.cfgTab;
 let body='';
 if(T==='general'){const f=(k,l,suf)=>`<div class="field"><label for="cf-${k}">${l}</label><div class="row" style="flex-wrap:nowrap"><input id="cf-${k}" class="inp num" inputmode="decimal" data-f="cfg" data-k="${k}" value="${C[k]}"><span class="muted small">${suf}</span></div></div>`;
  body=`<div class="fgrid">${f('near','Ngưỡng GẦN ĐẦY','%')}${f('capDK','Tải trọng mặc định đầu kéo (DK)','tấn')}${f('capCN','Tải trọng mặc định container (CN)','tấn')}${f('split','Ngưỡng phân loại đơn DK / CN','tấn')}${f('sla','Thời hạn phản hồi giữ chỗ','phút')}${f('maxStops','Số điểm giao tối đa / xe','điểm')}${f('fillMin','Lấp đầy tối thiểu để đề xuất nhóm gộp','%')}
  <div class="field"><label>Gợi ý gộp xe</label><label class="row"><input type="checkbox" data-f="cfgb" data-k="suggestOn" ${C.suggestOn?'checked':''}> Bật gợi ý gộp xe theo khu vực</label></div></div>
  <p class="small muted">Đơn trên ${C.split} tấn gợi ý DK, từ ${C.split} tấn trở xuống gợi ý CN. Thay đổi áp dụng ngay cho mọi người dùng.</p>`;}
 if(T==='regions'){const rs=S.regions.filter(r=>r.wh===V.wh);const mapped=new Set(rs.filter(r=>r.active).map(r=>r.newProvince));const unm=PROVINCES.filter(p=>!mapped.has(p));const none=S.bookings.filter(b=>b.wh===V.wh&&b.region==='NONE'&&['hold','ok'].includes(b.status)).length;const NR=V.newReg||{};
  body=`<div class="row" style="margin-bottom:10px"><label class="whsel"><span>Kho:</span><select data-a="wh" aria-label="Chọn kho">${WH.map(w=>`<option value="${w.id}" ${w.id===V.wh?'selected':''}>${w.name}</option>`).join('')}</select></label><span class="muted small">Khu vực = tỉnh, cấu hình theo cặp Kho – Khu vực. Lân cận chỉ dùng để gợi ý.</span></div>
  <div class="tbl-wrap"><table><thead><tr><th>Mã</th><th>Khu vực (tỉnh)</th><th>Tỉnh mới tương ứng</th><th>Khu vực lân cận</th><th class="r">Đi-về (ngày)</th><th class="r">Booking hoạt động</th><th>Trạng thái</th></tr></thead><tbody>
  ${rs.map(r=>{const act=S.bookings.filter(b=>b.region===r.id&&['hold','ok'].includes(b.status)&&b.date>=TODAY).length;return `<tr><td>${r.code}</td><td><b>${esc(r.name)}</b></td><td>${esc(r.newProvince)}</td><td>${r.neighbors.map(x=>`<span class="chip">${esc(regName(x))}</span>`).join(' ')||'–'}</td><td class="r num">${r.days}</td><td class="r num">${act}</td><td>${r.active?`<button class="btn ghost sm" data-a="regToggle" data-id="${r.id}">Ngừng dùng</button>`:`<button class="btn sm" data-a="regToggle" data-id="${r.id}">Bật lại</button>`}</td></tr>`;}).join('')}</tbody></table></div>
  <div class="panel" style="background:var(--sand);margin-top:12px"><b>Thêm khu vực cho ${WH.find(w=>w.id===V.wh).full}</b><div class="fgrid" style="margin-top:8px">
  <div class="field"><label for="nr-n">Tên khu vực (tỉnh) <span class="req">*</span></label><input id="nr-n" class="inp" data-f="newReg" data-k="name" value="${esc(NR.name||'')}" placeholder="Ví dụ: Bình Phước"></div>
  <div class="field"><label for="nr-p">Tỉnh mới tương ứng <span class="req">*</span></label><select id="nr-p" class="inp" data-f="newReg" data-k="np"><option value="">Chọn tỉnh</option>${PROVINCES.map(p=>`<option ${NR.np===p?'selected':''}>${p}</option>`).join('')}</select></div>
  <div class="field"><label for="nr-d">Thời gian đi-về tham khảo (ngày)</label><input id="nr-d" class="inp" inputmode="numeric" data-f="newReg" data-k="days" value="${esc(NR.days||'1')}"></div>
  <div class="field span2"><label>Khu vực lân cận</label><div class="chk">${rs.filter(r=>r.active).map(r=>`<label><input type="checkbox" data-f="newRegNb" value="${r.id}" ${(NR.nb||[]).includes(r.id)?'checked':''}>${esc(r.name)}</label>`).join('')}</div></div></div>
  ${V.regErr?`<div class="err">${esc(V.regErr)}</div>`:''}<div class="mfoot"><button class="btn" data-a="regAdd">Thêm khu vực</button></div></div>
  <div class="hint" style="margin-top:12px"><b>Tỉnh chưa ứng với khu vực nào:</b> ${unm.map(esc).join(', ')||'không có'} · <b>${none}</b> booking đang “Chưa phân khu vực”.</div>`;}
 if(T==='catalog'){body=`<p class="small muted" style="margin-top:0">Mục ngừng dùng bị ẩn khỏi form đặt hàng mới; booking đã có vẫn giữ nguyên giá trị. Giá trị đang được dùng trong booking không sửa được, hãy ngừng dùng và thêm giá trị mới.</p><div class="fgrid">${['products','colors','thicks','widths'].map(catPanel).join('')}</div>`;}
 if(T==='holiday'){body=`<label class="row"><input type="checkbox" data-f="cfgb" data-k="sundayOff" ${C.sundayOff?'checked':''}> Chủ nhật nghỉ mặc định (tất cả kho)</label><p class="small muted">Ngày lễ: chọn ngày để đánh dấu nghỉ.</p><div class="row"><input type="date" id="hol" class="inp" style="width:auto" data-f="hol" value="${V.hol||''}"><button class="btn sm" data-a="holAdd">Thêm ngày nghỉ</button></div><div class="row" style="margin-top:8px">${C.holidays.map(h=>`<span class="chip">${dmy(h)} <button class="linkbtn" data-a="holDel" data-d="${h}" aria-label="Xóa">×</button></span>`).join('')||'<span class="muted small">Chưa có ngày lễ.</span>'}</div>`;}
 return `<div class="panel"><div class="pagehead"><h2>CONFIGURATION</h2></div><div class="tabs">${tabs.map(([k,l])=>`<button class="${T===k?'on':''}" data-a="cfgTab" data-t="${k}">${l}</button>`).join('')}</div>${body}</div>`;
}

/* ---------- SCR-14/15 users & customers ---------- */
function vUsers(){const UT=[['users','Người dùng','users.manage'],['customers','Khách hàng','customers.manage'],['perms','Phân quyền','perms.manage']].filter(t=>can(t[2]));
 if(!UT.some(t=>t[0]===V.uTab))V.uTab=UT[0][0];const T=V.uTab;
 return `<div class="panel"><div class="pagehead"><h2>SETTING USER ACCOUNT</h2>${T==='users'?'<button class="btn" data-a="userNew">Cấp quyền tài khoản</button>':T==='customers'?'<button class="btn" data-a="custNew">Thêm khách hàng</button>':''}</div>
 <div class="tabs">${UT.map(([k,l])=>`<button class="${T===k?'on':''}" data-a="uTab" data-t="${k}">${l}</button>`).join('')}</div>
 ${T==='perms'?vPerms():T==='users'?`<div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Segment</th><th>Kho mặc định</th><th>Công ty</th><th>Trạng thái</th><th></th></tr></thead><tbody>${S.users.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.email)}</td><td>${ROLE_LABEL[u.role]}</td><td>${u.segment?SEG_LABEL[u.segment]:u.customerId?SEG_LABEL[cust(u.customerId).segment]:'–'}</td><td>${u.wh}</td><td>${u.customerId?esc(cust(u.customerId).name):'–'}</td><td>${u.active?'<span class="st st-ok">Hoạt động</span>':'<span class="st st-cancelled">Khóa</span>'}</td><td class="r" style="white-space:nowrap"><button class="btn ghost sm" data-a="userEdit" data-id="${u.id}">Sửa</button> ${u.id!==V.me?`<button class="btn ghost sm" data-a="userToggle" data-id="${u.id}">${u.active?'Khóa':'Mở khóa'}</button>`:''}</td></tr>`).join('')}</tbody></table></div>${V.userErr?`<div class="err" style="margin-top:8px">${esc(V.userErr)}</div>`:''}`
 :`<div class="tbl-wrap"><table><thead><tr><th>Mã KH</th><th>Tên công ty</th><th>Segment</th><th>Sales phụ trách</th><th>Địa chỉ giao · khu vực</th><th class="r">Tài khoản</th></tr></thead><tbody>${S.customers.map(c=>`<tr><td>${c.code}</td><td><b>${esc(c.name)}</b></td><td>${SEG_LABEL[c.segment]}</td><td>${esc(user(c.salesId).name)}</td><td class="small">${c.addresses.map(a=>`${esc(a.label)}, ${esc(a.ward)}, ${esc(a.province)} · <b>${Object.values(a.regions).map(regName).map(esc).join(', ')||'Chưa phân khu vực'}</b>`).join('<br>')}</td><td class="r">${S.users.filter(u=>u.customerId===c.id).length}</td></tr>`).join('')}</tbody></table></div>`}</div>`;
}


/* ---------- Phân quyền vai trò ---------- */
const PROLES=[['logistics','Logistics'],['cs','CS'],['sales','Sales'],['admin','Admin']];
const pmNorm=m=>JSON.stringify(PROLES.map(([r])=>[...(m&&m[r]||[])].sort()));
function vPerms(){
 if(!S.roleMatrix)return '<div class="empty">Không tải được ma trận phân quyền.</div>';
 if(!V.pm)V.pm=JSON.parse(JSON.stringify(S.roleMatrix));
 const M=V.pm;const cat=S.permCatalog;const dirty=pmNorm(M)!==pmNorm(S.roleMatrix);
 const nChange=cat.reduce((n,p)=>n+PROLES.filter(([r])=>(M[r]||[]).includes(p.code)!==(S.roleMatrix[r]||[]).includes(p.code)).length,0);
 let body='',last='';
 for(const p of cat){
  if(p.grp!==last){body+=`<tr class="pgrp"><td colspan="${PROLES.length+1}">${esc(p.grp)}</td></tr>`;last=p.grp;}
  body+=`<tr><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.descr)}</div></td>${PROLES.map(([r,l])=>{const on=(M[r]||[]).includes(p.code);const lock=r==='admin'&&p.code==='perms.manage';const chg=on!==(S.roleMatrix[r]||[]).includes(p.code);const def=(p.def||[]).includes(r);
   return `<td class="c ${chg?'chg':''}"><label class="pmcell" title="${lock?'Admin luôn giữ quyền này':def?'Mặc định: bật':'Mặc định: tắt'}"><input type="checkbox" data-f="pm" data-r="${r}" data-p="${p.code}" ${on?'checked':''} ${lock?'disabled':''} aria-label="${esc(l)} – ${esc(p.name)}"></label></td>`;}).join('')}</tr>`;}
 return `<div class="hint" style="margin-bottom:12px"><b>Quyền tính năng</b> quyết định ai được làm gì; máy chủ kiểm tra mọi thao tác nên tắt quyền là chặn thật, không chỉ ẩn nút.
  <b>Phạm vi dữ liệu cố định theo vai trò</b> để bảo mật: Sales chỉ thấy tên và thao tác trên khách mình phụ trách; Khách hàng chỉ xem số tấn còn đặt được và đơn của mình (không cấu hình). Lịch, Thông báo, Hồ sơ luôn có cho mọi người.</div>
 <div class="tbl-wrap"><table class="pmtbl"><thead><tr><th>Tính năng</th>${PROLES.map(([r,l])=>{const all=cat.every(p=>(M[r]||[]).includes(p.code));return `<th class="c">${l}<div><button class="linkbtn small" data-a="pmAll" data-r="${r}">${all?'Bỏ tất cả':'Chọn tất cả'}</button></div></th>`;}).join('')}</tr></thead><tbody>${body}</tbody></table></div>
 ${V.pmErr?`<div class="err" style="margin-top:8px">${esc(V.pmErr)}</div>`:''}
 <div class="mfoot"><span class="muted small grow" style="align-self:center">${dirty?nChange+' ô đã thay đổi, chưa lưu. Người dùng thấy quyền mới khi tải lại trang.':'Chưa có thay đổi.'}</span>
 ${V.pmReset?`<span class="small" style="align-self:center">Đưa toàn bộ về mặc định?</span><button class="btn ghost" data-a="pmResetOff">Thôi</button><button class="btn danger" data-a="pmResetGo">Khôi phục mặc định</button>`
 :`<button class="btn ghost" data-a="pmResetOn">Khôi phục mặc định</button><button class="btn ghost" data-a="pmUndo" ${dirty?'':'disabled'}>Hủy thay đổi</button><button class="btn" data-a="pmSave" ${dirty?'':'disabled'}>Lưu phân quyền</button>`}</div>`;
}

/* ---------- SCR-16 notifications ---------- */
function vNotifs(){const mine=S.notifs.filter(n=>n.to.includes(V.me)).sort((a,b)=>b.at-a.at);
 return `<div class="panel"><div class="pagehead"><h2>THÔNG BÁO</h2><button class="btn ghost sm" data-a="readAll">Đánh dấu tất cả đã đọc</button></div>
 
 ${(mine.map(n=>`<div class="notif ${n.read?'':'unread'}" data-a="openNotif" data-id="${n.id}"><span class="ntype">${esc(n.type)}</span><span>${esc(n.text)}</span><span class="when">${clockStr(n.at)}</span></div>`).join('')||'<div class="empty">Chưa có thông báo.</div>')}</div>`;}

/* ---------- SCR-18 dashboards ---------- */
const DASH={
 'DB-01':{t:'Điều phối hôm nay',perm:'dash.ops',built:true},
 'DB-02':{t:'Hiệu quả sử dụng xe',perm:'dash.ops',built:true},
 'DB-03':{t:'Chất lượng phục vụ',perm:'dash.service',built:false,d:'Thời gian giữ chỗ → xác nhận (trung vị, P90, % trong 60 phút); tỷ lệ từ chối, đổi ngày, hủy theo mã lý do; nháp quá 2 ngày; số ngày khách đặt trước.'},
 'DB-04':{t:'Gộp xe và khu vực',perm:'dash.ops',built:false,d:'Số xe tiết kiệm nhờ gộp; % nhóm gợi ý được áp dụng; tỷ lệ lấp đầy theo khu vực; nhu cầu tấn theo khu vực × tuần; số xe 2–3 điểm giao.'},
 'DB-05':{t:'Khách hàng và Sales',perm:'dash.sales',built:false,d:'Tấn theo khách, segment, Sales; top 10 khách và mức phụ thuộc; khách bị từ chối / đổi ngày từ 2 lần trong 30 ngày.'},
 'DB-06':{t:'Sức khỏe hệ thống',perm:'dash.system',built:true},
};
function vDash(){const keys=Object.keys(DASH).filter(k=>can(DASH[k].perm));if(!V.dashTab||!keys.includes(V.dashTab))V.dashTab=keys[0];const k=V.dashTab;const D=DASH[k];
 const body=!D.built?`<div class="dcard"><h3>${k} · ${D.t.toUpperCase()}</h3><p class="cap">Theo đặc tả mục 9.1. Dashboard này cần khoảng một tháng dữ liệu (mốc thời gian trạng thái, mã lý do, nhật ký gợi ý gộp) nên chưa dựng trong prototype.</p><p>${D.d}</p></div>`:k==='DB-01'?dashToday():k==='DB-02'?dashUtil():dashSystem();
 return `<div class="panel"><div class="pagehead"><h2>DASHBOARD</h2>${k!=='DB-06'?`<label class="whsel"><span>Kho:</span><select data-a="wh" aria-label="Chọn kho">${WH.map(w=>`<option value="${w.id}" ${w.id===V.wh?'selected':''}>${w.name}</option>`).join('')}</select></label>`:''}<span class="muted small">Cập nhật ${clockStr(S.clock)} · ${dmy(TODAY)}</span></div>
 <div class="tabs">${keys.map(x=>`<button class="${x===k?'on':''}" data-a="dashTab" data-t="${x}">${x} · ${DASH[x].t}${DASH[x].built?'':' (sau)'}</button>`).join('')}</div>${body}</div>`;}
function dayStats(wh,date){const m=dayM(wh,date);let usedCap=0;m.trucks.forEach(t=>{if(loadOf(t.code)>0.001)usedCap+=t.cap;});return Object.assign(m,{usedCap,fill:usedCap?m.loaded/usedCap:0,util:m.cap?m.loaded/m.cap:0});}
function dashToday(){
 const days=[...Array(7)].map((_,i)=>addDays(TODAY,i));
 const holds=S.bookings.filter(b=>b.status==='hold'&&b.wh===V.wh);const waits=holds.map(b=>S.clock-b.heldAt);
 const bk=[waits.filter(w=>w<30).length,waits.filter(w=>w>=30&&w<=S.cfg.sla).length,waits.filter(w=>w>S.cfg.sla).length];
 const groups=groupSuggest(V.wh,TODAY);const save=groups.reduce((s,g)=>s+Math.max(0,g.saving),0);
 const ov=S.allocs.filter(a=>a.override&&a.truck.includes('-'+ddmmyy(TODAY)+'-')&&a.truck.startsWith(V.wh)).length;
 const heat=`<div class="tbl-wrap" style="border:0"><table class="heat"><thead><tr><th class="rh">Kho</th>${days.map(d=>`<th>${WDS[dow(d)]}<br>${dm(d)}</th>`).join('')}</tr></thead><tbody>${WH.map(w=>`<tr><th class="rh">${w.name}</th>${days.map(d=>{const m=dayM(w.id,d);if(m.off||!m.declared)return `<td class="h-${m.off?'off':'none'}" data-tip="${w.full} ${dmy(d)}\n${m.off?'Không bốc hàng':'Chưa khai báo xe'}">${m.off?'Nghỉ':'Chưa mở'}</td>`;
  return `<td class="h-${m.status}" data-a="dashDay" data-w="${w.id}" data-d="${d}" data-tip="${w.full} ${dmy(d)} · ${PILL[m.status]}\nSử dụng ${pct(m.usage)} (đã xếp + giữ chỗ)\nCó thể đặt ${t2(m.avail)} t / capacity ${m.cap} t"><b class="num">${pct(m.usage)}</b><span class="num">còn ${Math.round(m.avail)} t</span><br><span class="small">${PILL[m.status]}</span></td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
 const mx=Math.max(1,...bk);const bars=[['Dưới 30 phút','var(--ok)'],['30–60 phút','var(--warn)'],['Quá 60 phút','var(--bad)']].map(([l,c],i)=>`<div class="hbar" data-tip="${l}: ${bk[i]} booking"><span>${l}</span><div class="trk"><div class="fil" style="width:${bk[i]/mx*100}%;background:${c}"></div></div><b class="num">${bk[i]}</b></div>`).join('');
 const over=holds.filter(b=>S.clock-b.heldAt>S.cfg.sla).sort((a,b)=>a.heldAt-b.heldAt);
 const m=dayStats(V.wh,TODAY);const st=type=>{const ts=m.trucks.filter(t=>t.type===type);const c={empty:0,part:0,full:0};ts.forEach(t=>{const s=truckState(t,loadOf(t.code));c[s==='over'?'full':s]++;});return{c,n:ts.length};};
 const stackRow=(type,label)=>{const{c,n}=st(type);if(!n)return `<div class="small muted">${label}: chưa khai báo</div>`;return `<div style="margin-bottom:10px"><div class="row" style="justify-content:space-between"><b>${label}</b><span class="num small muted">${n} xe</span></div><div class="stack">${[['full','var(--bad)','Đầy'],['part','var(--warn)','Đang xếp'],['empty','var(--ok)','Trống']].filter(x=>c[x[0]]).map(([k,col,l])=>`<span style="width:${c[k]/n*100}%;background:${col}" data-tip="${label} · ${l}: ${c[k]} xe"></span>`).join('')}</div><div class="lgd"><span><i style="background:var(--bad)"></i>Đầy ${c.full}</span><span><i style="background:var(--warn)"></i>Đang xếp ${c.part}</span><span><i style="background:var(--ok)"></i>Trống ${c.empty}</span></div></div>`;};
 return `<div class="kpis"><div class="tile"><span class="lbl">Booking chờ xếp xe</span><span class="val num">${holds.length}</span><span class="sub">${t2(holds.reduce((s,b)=>s+bkTotal(b)-allocSum(b.id),0))} t chưa gán xe</span></div>
 <div class="tile ${bk[2]?'crit':''}"><span class="lbl">Quá hạn ${S.cfg.sla} phút</span><span class="val num">${bk[2]?'⚠ ':''}${bk[2]}</span><span class="sub">${bk[2]?'Cần xử lý ngay':'Không có booking quá hạn'}</span></div>
 <div class="tile"><span class="lbl">Nhóm gộp đang chờ (hôm nay)</span><span class="val num">${groups.length}</span><span class="sub">Tiết kiệm ${save} xe nếu áp dụng</span></div>
 <div class="tile"><span class="lbl">Override hôm nay</span><span class="val num">${ov}</span><span class="sub">Vượt tải, sai loại xe, khác khu vực</span></div></div>
 <div class="dgrid"><div class="dcard span2"><h3>SỨC CHỨA 7 NGÀY TỚI</h3><p class="cap">% sử dụng = (đã xếp + đang giữ chỗ) ÷ capacity. Bấm ô để mở chi tiết ngày.</p>${heat}</div>
 <div class="dcard"><h3>HÀNG CHỜ THEO THỜI GIAN CHỜ</h3><p class="cap">${WH.find(w=>w.id===V.wh).full} · thời hạn phản hồi ${S.cfg.sla} phút</p>${bars}
 ${over.length?`<div style="margin-top:10px">${over.slice(0,5).map(b=>`<div class="row small" style="padding:6px 0;border-top:1px solid var(--line)"><span class="grow"><b>${esc(cust(b.customerId).name)}</b> · ${b.id} · <span class="num">${t2(bkTotal(b))} t</span> · ${dm(b.date)}</span><span class="num" style="color:var(--bad);font-weight:700">⚠ ${S.clock-b.heldAt} phút</span><button class="btn sm" data-a="openBk" data-id="${b.id}">Xử lý</button></div>`).join('')}</div>`:''}</div>
 <div class="dcard"><h3>XE HÔM NAY · ${dm(TODAY)}</h3><p class="cap">${WH.find(w=>w.id===V.wh).full} · tỷ lệ lấp đầy xe đang chạy ${pct(m.fill)}</p>${stackRow('DK','Đầu kéo (DK)')}${stackRow('CN','Container (CN)')}
 <button class="btn ghost sm" data-a="dashDay" data-w="${V.wh}" data-d="${TODAY}">Mở chi tiết ngày</button></div></div>`;}
function lineChart(rows){
 const W=1100,H=300,L=48,R=120,T=14,B=30;const n=rows.length;if(n<2)return '<div class="empty small">Chưa đủ dữ liệu.</div>';
 const X=i=>L+i*(W-L-R)/(n-1),Y=v=>T+(1-v)*(H-T-B);
 const path=k=>{let out='',pen=false;rows.forEach((r,i)=>{if(r[k]===null){pen=false;return;}out+=`${pen?'L':'M'}${X(i).toFixed(1)} ${Y(r[k]).toFixed(1)}`;pen=true;});return out;};
 const last=rows[n-1];const li=rows.map(r=>r.fill!==null).lastIndexOf(true);const lf=li>=0?rows[li].fill:0;const ly1=Y(last.util),ly2=Y(lf);const sep=Math.abs(ly1-ly2)<16?(ly1<ly2?-8:8):0;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tỷ lệ sử dụng capacity và tỷ lệ lấp đầy xe theo ngày">
 ${[0,.25,.5,.75,1].map(v=>`<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${Y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${v*100}%</text>`).join('')}
 ${rows.map((r,i)=>(i%2===0||i===n-1)?`<text x="${X(i)}" y="${H-10}" text-anchor="middle" font-size="11" fill="var(--muted)">${dm(r.d)}</text>`:'').join('')}
 <path d="${path('util')}" fill="none" stroke="var(--s1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
 <path d="${path('fill')}" fill="none" stroke="var(--s2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
 <circle cx="${X(n-1)}" cy="${ly1}" r="4.5" fill="var(--s1)" stroke="var(--surface)" stroke-width="2"/><circle cx="${X(li)}" cy="${ly2}" r="4.5" fill="var(--s2)" stroke="var(--surface)" stroke-width="2"/>
 <text x="${X(n-1)+10}" y="${ly1+4+sep}" font-size="12" font-weight="700" fill="var(--ink)">${pct(last.util)} sử dụng</text><text x="${X(n-1)+10}" y="${ly2+4-sep}" font-size="12" font-weight="700" fill="var(--ink)">${pct(lf)} lấp đầy</text>
 ${rows.map((r,i)=>{const w=(W-L-R)/(n-1);return `<rect class="hit" x="${X(i)-w/2}" y="${T}" width="${w}" height="${H-T-B}" fill="transparent" data-tip="${WDS[dow(r.d)]} ${dmy(r.d)}\nSử dụng capacity ${pct(r.util)}\nLấp đầy xe ${r.fill===null?'– (không có xe chạy)':pct(r.fill)}\nĐã xếp ${t2(r.loaded)} / ${r.cap} t"/>`;}).join('')}</svg>`;}
function dashUtil(){
 const[y,mo]=V.ym;const rows=[];for(let d=1;d<=dim(y,mo);d++){const ds=iso(y,mo,d);if(ds>TODAY)break;const m=dayStats(V.wh,ds);if(m.off||!m.declared)continue;rows.push({d:ds,util:m.util,fill:m.usedCap?m.fill:null,loaded:m.loaded,cap:m.cap,usedCap:m.usedCap});}
 const sum=k=>rows.reduce((s,r)=>s+r[k],0);const U=sum('cap')?sum('loaded')/sum('cap'):0,F=sum('usedCap')?sum('loaded')/sum('usedCap'):0;
 const fut=[...Array(14)].map((_,i)=>addDays(TODAY,i)).map(d=>({d,m:dayM(V.wh,d)})).filter(x=>x.m.declared&&!x.m.off);
 const fullDays=[...Array(dim(y,mo))].map((_,i)=>iso(y,mo,i+1)).filter(d=>dayM(V.wh,d).status==='full').length;
 const cuts=Object.entries(S.fleet[V.wh]).filter(([d,f])=>f.reason&&d.startsWith(`${y}-${pad(mo)}`)).sort();
 const tbl=V.dashTable?`<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Ngày</th><th class="r">Capacity (t)</th><th class="r">Đã xếp (t)</th><th class="r">Sử dụng</th><th class="r">Lấp đầy xe</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="num">${dmy(r.d)}</td><td class="r num">${r.cap}</td><td class="r num">${t2(r.loaded)}</td><td class="r num">${pct(r.util)}</td><td class="r num">${r.fill===null?'–':pct(r.fill)}</td></tr>`).join('')}</tbody></table></div>`:'';
 const maxCap=Math.max(1,...fut.map(x=>x.m.cap));
 return `<div class="kpis"><div class="tile"><span class="lbl">Sử dụng capacity</span><span class="val num">${pct(U)}</span><span class="sub">01/${pad(mo)} – ${dm(TODAY<iso(y,mo,dim(y,mo))?TODAY:iso(y,mo,dim(y,mo)))} · thấp = khai báo dư xe</span></div>
 <div class="tile"><span class="lbl">Lấp đầy xe</span><span class="val num">${pct(F)}</span><span class="sub">Xe có chở hàng · thấp = chạy non tải</span></div>
 <div class="tile"><span class="lbl">Ngày đã đầy (tháng ${mo})</span><span class="val num">${fullDays}</span><span class="sub">Ngày không còn chỗ cho khách</span></div>
 <div class="tile"><span class="lbl">Ngày giảm xe</span><span class="val num">${cuts.length}</span><span class="sub">Do tuyến xa, bảo dưỡng…</span></div></div>
 <div class="dgrid"><div class="dcard span2 chart"><h3>SỬ DỤNG CAPACITY VÀ LẤP ĐẦY XE THEO NGÀY</h3><p class="cap">${WH.find(w=>w.id===V.wh).full} · hai đường cách xa nhau nghĩa là xếp hàng tốt nhưng khai báo dư xe; ngày không có xe chạy để trống đường lấp đầy</p>
 <div class="lgd" style="margin-bottom:6px"><span><i class="ln" style="background:var(--s1)"></i>Sử dụng capacity = đã xếp ÷ mọi xe khai báo</span><span><i class="ln" style="background:var(--s2)"></i>Lấp đầy xe = đã xếp ÷ xe có chở hàng</span></div>
 ${lineChart(rows)}<button class="linkbtn small" data-a="dashTable">${V.dashTable?'Ẩn bảng số liệu':'Xem dạng bảng'}</button>${tbl}</div>
 <div class="dcard"><h3>ĐÃ ĐẶT SO VỚI CAPACITY · 14 NGÀY TỚI</h3><p class="cap">Thanh xám = capacity ngày; phần màu = đã xếp + đang giữ chỗ</p>
 ${fut.map(({d,m})=>`<div class="hbar" data-tip="${dmy(d)} · ${PILL[m.status]}\nĐã đặt ${t2(m.loaded+m.held)} / ${m.cap} t\nCó thể đặt ${t2(m.avail)} t"><span class="num">${WDS[dow(d)]} ${dm(d)}</span><div class="trk" style="width:${m.cap/maxCap*100}%"><div class="fil" style="width:${Math.min(100,m.usage*100)}%;background:var(--s1)"></div></div><b class="num">${pct(m.usage)}</b></div>`).join('')||'<div class="muted small">Chưa khai báo xe cho 14 ngày tới.</div>'}</div>
 <div class="dcard"><h3>NGÀY GIẢM XE VÀ LÝ DO</h3><p class="cap">Từ khai báo xe của Logistics (SCR-12)</p>
 <div class="tbl-wrap"><table><thead><tr><th>Ngày</th><th class="r">DK</th><th class="r">CN</th><th>Lý do</th></tr></thead><tbody>${cuts.map(([d,f])=>`<tr><td class="num">${dmy(d)}</td><td class="r num">${f.dk}</td><td class="r num">${f.cn}</td><td>${esc(f.reason)}</td></tr>`).join('')||'<tr><td colspan="4" class="muted">Không có ngày giảm xe.</td></tr>'}</tbody></table></div></div></div>`;}
function meter(label,used,limit,unit,note){const r=used/limit;const col=r>=.9?'var(--bad)':r>=.7?'var(--warn)':'var(--ok)';const st=r>=.9?'Sắp vượt':r>=.7?'Cần theo dõi':'An toàn';
 return `<div class="meter" data-tip="${label}: ${used.toLocaleString('vi-VN')} / ${limit.toLocaleString('vi-VN')} ${unit}"><div class="row"><b>${label}</b><span class="num">${used.toLocaleString('vi-VN',{maximumFractionDigits:2})} / ${limit.toLocaleString('vi-VN')} ${unit} · <span style="color:${col};font-weight:700">${st}</span></span></div><div class="trk"><div class="fil" style="width:${Math.min(100,r*100)}%;background:${col}"></div></div>${note?`<div class="small muted">${note}</div>`:''}</div>`;}
function dashSystem(){
 if(!V.stats){if(!V.statsLoading){V.statsLoading=true;rpc('admin_stats').then(x=>{V.stats=x;V.statsLoading=false;render();}).catch(e=>{V.statsLoading=false;toast(e.message);});}return '<div class="empty">Đang tải số liệu…</div>';}
 const X=V.stats;const E=X.email||{};const users=S.users.filter(u=>u.active);const recent=users.filter(u=>u.last&&u.last>=addDays(TODAY,-6));
 return `<div class="kpis"><div class="tile"><span class="lbl">Tài khoản được cấp</span><span class="val num">${users.length}</span><span class="sub">${users.filter(u=>u.role==='customer').length} khách hàng · ${users.length-users.filter(u=>u.role==='customer').length} nội bộ</span></div>
 <div class="tile"><span class="lbl">Đăng nhập trong 7 ngày</span><span class="val num">${recent.length}</span><span class="sub">Mức độ chấp nhận ${users.length?pct(recent.length/users.length):'0%'}</span></div>
 <div class="tile"><span class="lbl">Tổng booking</span><span class="val num">${X.bookings}</span><span class="sub">Mọi trạng thái, mọi kho</span></div>
 <div class="tile ${E.failedToday?'crit':''}"><span class="lbl">Email hôm nay</span><span class="val num">${E.sentToday??0}</span><span class="sub">${!E.on?'Email đang tắt':`${E.queued||0} chờ gửi · ${E.failedToday||0} lỗi`} · ${X.notifsToday} thông báo</span></div></div>
 <div class="dgrid"><div class="dcard"><h3>MỨC DÙNG GÓI MIỄN PHÍ</h3><p class="cap">Xanh &lt; 70% · vàng 70–90% · đỏ ≥ 90%</p>
 ${meter('Dung lượng database',X.dbMb,500,'MB','Supabase Free: 500 MB')}
 ${E.on?meter('Email hôm nay',E.sentToday||0,100,'email','Resend Free: 100 email/ngày; hệ thống tự dừng ở '+(E.cap||95)):''}
 ${E.on?meter('Email tháng này',E.sentMonth||0,3000,'email',''):''}
 <p class="small muted">Egress (5 GB/tháng) và số người dùng hoạt động (50.000/tháng) xem tại Supabase → Project → Usage.</p></div>
 <div class="dcard"><h3>EMAIL THÔNG BÁO</h3><p class="cap">Gửi qua Resend cho các loại: giữ chỗ, xác nhận, từ chối, đổi ngày, hủy, sửa phần hàng</p>
 <dl class="dl"><dt>Trạng thái</dt><dd>${E.on?'<span class="st st-ok">Đang bật</span>':'<span class="st st-cancelled">Đang tắt</span>'}</dd>
 <dt>Khóa Resend</dt><dd>${E.hasKey?'Đã có trong Vault':'<span style="color:var(--bad)">Chưa có</span>'}</dd>
 <dt>Gửi từ</dt><dd>${esc(E.from||'–')}</dd><dt>Chờ gửi</dt><dd class="num">${E.queued||0}</dd>
 ${E.lastError?`<dt>Lỗi gần nhất</dt><dd class="small" style="color:var(--bad)">${esc(E.lastError)}</dd>`:''}</dl>
 ${E.on?'<div class="mfoot"><button class="btn ghost sm" data-a="testEmail">Gửi email thử cho tôi</button></div>':'<p class="small muted">Bật email: xem README, mục "Bật email thông báo".</p>'}</div>
 <div class="dcard"><h3>LƯU Ý VẬN HÀNH POV</h3><ul class="small" style="margin:0;padding-left:18px;line-height:1.7">
 <li>Supabase Free tự tạm dừng project sau 7 ngày không ai dùng; vào Supabase bấm <b>Restore</b> để chạy lại.</li>
 <li>Gói Free không có bản sao lưu tự động: mỗi tuần vào Table Editor → schema <b>app</b> → Export CSV các bảng bookings, booking_lines, allocations, daily_fleet.</li>
 <li>Mật khẩu: Admin đặt mật khẩu tạm khi tạo tài khoản; người dùng tự đổi trong Hồ sơ cá nhân, hoặc bấm <b>Quên mật khẩu?</b> ở màn hình đăng nhập (cần cấu hình SMTP, xem README).</li></ul></div>
 <div class="dcard span2"><h3>NGƯỜI DÙNG VÀ LẦN ĐĂNG NHẬP GẦN NHẤT</h3><p class="cap">Tài khoản chưa đăng nhập 7 ngày cần nhắc hoặc hướng dẫn lại</p><div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>Vai trò</th><th>Công ty</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th></tr></thead><tbody>${users.sort((a,b)=>(b.last||'').localeCompare(a.last||'')).map(u=>{const ok=u.last&&u.last>=addDays(TODAY,-6);return `<tr><td>${esc(u.name)}</td><td>${ROLE_LABEL[u.role]}</td><td>${u.customerId?esc(cust(u.customerId).name):'–'}</td><td class="num">${u.last?dmy(u.last):'Chưa đăng nhập'}</td><td>${ok?'<span class="st st-ok">Đang dùng</span>':'<span class="st st-hold">Cần nhắc</span>'}</td></tr>`;}).join('')}</tbody></table></div></div></div>`;}

/* ---------- SCR-17 profile ---------- */
function vProfile(){const u=me();
 return `<div class="panel" style="max-width:640px"><div class="pagehead"><h2>HỒ SƠ CÁ NHÂN</h2></div><div class="fgrid">
 <div class="field"><label for="pf-n">Họ tên hiển thị</label><input id="pf-n" class="inp" data-f="pf" data-k="name" value="${esc(u.name)}"></div>
 <div class="field"><label for="pf-p">Số điện thoại</label><input id="pf-p" class="inp" data-f="pf" data-k="phone" value="${esc(u.phone||'')}"></div>
 <div class="field"><label>Email</label><div>${esc(u.email)}</div></div><div class="field"><label>Vai trò</label><div>${ROLE_LABEL[u.role]}</div></div>
 ${u.segment?`<div class="field"><label>Segment</label><div>${SEG_LABEL[u.segment]}</div></div>`:''}
 ${u.customerId&&cust(u.customerId)?`<div class="field"><label>Công ty</label><div>${esc(cust(u.customerId).name)} · ${SEG_LABEL[cust(u.customerId).segment]}</div></div><div class="field"><label>Sales phụ trách</label><div>${esc(user(cust(u.customerId).salesId).name)}</div></div>`:''}
 <div class="field"><label>Kho mặc định</label><div>${(WH.find(w=>w.id===u.wh)||{full:u.wh}).full}</div></div></div>
 <div class="mfoot"><button class="btn" data-a="pfSave">Lưu</button></div>
 <h3 style="margin-top:18px;font-size:15px">ĐỔI MẬT KHẨU</h3><div class="fgrid"><div class="field"><label for="pw1">Mật khẩu mới</label><input id="pw1" type="password" class="inp" autocomplete="new-password" data-f="pw" data-k="pw" value="${esc(V.pw||'')}"></div><div class="field"><label for="pw2">Nhập lại</label><input id="pw2" type="password" class="inp" autocomplete="new-password" data-f="pw" data-k="pw2" value="${esc(V.pw2||'')}"></div></div>${V.pwErr?`<div class="err">${esc(V.pwErr)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="pwSave">Đổi mật khẩu</button></div></div>`;}

/* ===================== modals ===================== */
function modalView(){const M=V.modal;switch(M.type){case'truck':return mTruck();case'editAl':return mEditAl();case'place':return mPlace();case'bf':return mBF();case'custDay':return mCustDay();case'group':return mGroup();case'userNew':return mUserNew();case'custNew':return mCustNew();}return '';}
function mTruck(){const t=truckByCode(V.modal.code);const al=liveAllocsOnTruck(t.code);const l=r2(al.reduce((s,a)=>s+a.tons,0));const s=truckState(t,l);const past=t.date<TODAY;const isLog=can('alloc.assign');
 const byBk={};al.forEach(a=>{(byBk[a.bk]=byBk[a.bk]||{bk:a.bk,tons:0,ids:[]});byBk[a.bk].tons+=a.tons;byBk[a.bk].ids.push(a.id);});const segs=Object.values(byBk);
 return `<div class="mhead"><span class="meta">${WH.find(w=>w.id===t.wh).full.toUpperCase()}</span><span class="meta">Ngày: ${dmy(t.date)}</span></div>
 <div class="truckbig">${TICON(t.type)}<div><div class="row"><span class="code">${t.short}</span>${tsPill(s)}</div><div class="small muted">${t.code}</div>
 <div style="font-family:var(--f-display);font-weight:800;font-size:24px;margin-top:6px" class="num">${pct(l/t.cap)} (${t2(l)} tấn)</div>
 <div class="small">Loại: ${t.type==='DK'?'Đầu kéo':'Container'} · Tải trọng: ${t.cap} t · Còn trống: ${t2(Math.max(0,t.cap-l))} t${truckRegions(t.code).length?' · Khu vực: '+truckRegions(t.code).map(regName).map(esc).join(', '):''} · Điểm giao: ${truckStops(t.code).size}/${S.cfg.maxStops}</div></div></div>
 <h3 style="margin-top:16px;font-size:15px">CHI TIẾT XẾP HÀNG – XE ${t.short}</h3>
 <div class="floor">${segs.map(g=>{const b=bkById(g.bk);const own=ownsCust(b.customerId);return `<div style="width:${g.tons/Math.max(t.cap,l)*100}%;background:${own?custColor(b.customerId):'var(--mask)'}">${isLog&&!past?`<button class="ed" data-a="editAl" data-id="${g.ids[0]}">Sửa</button>`:''}<span>${own?esc(cust(b.customerId).name):'Khách khác'} – ${t2(g.tons)} t</span><span class="num">(${pct(g.tons/t.cap)})</span></div>`;}).join('')}${l<t.cap?`<div class="free" style="width:${(t.cap-l)/t.cap*100}%"><span>Còn trống – ${t2(t.cap-l)} t</span><span class="num">(${pct((t.cap-l)/t.cap)})</span></div>`:''}</div>
 <div class="orders">${segs.map((g,i)=>{const b=bkById(g.bk);const own=ownsCust(b.customerId);return own?`<div><h4 style="color:${custColor(b.customerId)}">ĐƠN HÀNG ${i+1}: ${esc(cust(b.customerId).name)}</h4><div>${b.id} · ${esc(b.ref)} · <span class="st st-${b.status}">${ST_LABEL[b.status]}</span></div><div class="num">Trên xe này: <b>${t2(g.tons)} t</b> / tổng ${t2(bkTotal(b))} t</div><div>${b.lines.map(x=>`${esc(x.p)} · ${esc(x.c)} · ${x.th}×${x.w} · ${t2(x.t)} t`).join('<br>')}</div><div>Điểm giao: ${esc(b.addrText)}</div><div>Khu vực: ${esc(regName(b.region))}</div></div>`:`<div><h4>ĐƠN HÀNG ${i+1}: Khách khác</h4><div class="num">${t2(g.tons)} t</div><div class="muted small">Không thuộc khách bạn phụ trách.</div></div>`;}).join('')||'<div class="muted">Xe chưa có hàng.</div>'}</div>
 <div class="small" style="margin-top:12px;font-weight:700">TÌNH TRẠNG: ${TS_LABEL[s].toUpperCase()} – ${pct(l/t.cap)} (${t2(l)}/${t.cap} tấn)</div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${isLog&&!past&&l<t.cap-0.001?`<button class="btn" data-a="place" data-c="${t.code}">Xếp đơn</button>`:''}</div>`;}
function mEditAl(){const M=V.modal;const a=S.allocs.find(x=>x.id===M.id);const b=bkById(a.bk);const t=truckByCode(a.truck);const tot=r2(allocsOf(b.id).filter(x=>x.truck===a.truck).reduce((s,x)=>s+x.tons,0));
 const others=trucksOf(t.wh,t.date).filter(x=>x.code!==t.code);
 return `<div class="mhead"><h2>SỬA PHẦN HÀNG – ${t.short}</h2><span class="meta">${dmy(t.date)}</span></div>
 <p><b>${esc(cust(b.customerId).name)}</b> · ${b.id} · đang trên xe: <b class="num">${t2(tot)} t</b> / tổng booking ${t2(bkTotal(b))} t · xe còn trống ${t2(t.cap-loadOf(t.code))} t</p>
 <div style="display:grid;gap:8px">
 <label class="radio"><input type="radio" name="ea" value="adjust" data-f="ea" data-k="mode" ${M.mode==='adjust'?'checked':''}><span><b>Điều chỉnh số tấn trên xe này</b>${M.mode==='adjust'?`<br><input class="inp num" style="width:120px;margin-top:6px" data-f="ea" data-k="tons" value="${esc(M.tons)}" aria-label="Số tấn mới">`:''}</span></label>
 <label class="radio"><input type="radio" name="ea" value="move" data-f="ea" data-k="mode" ${M.mode==='move'?'checked':''}><span><b>Chuyển sang xe khác cùng ngày</b>${M.mode==='move'?`<br><span class="row" style="margin-top:6px"><select class="inp" style="width:auto" data-f="ea" data-k="target" aria-label="Xe đích"><option value="">Chọn xe</option>${others.map(x=>`<option value="${x.code}" ${M.target===x.code?'selected':''}>${x.short} · còn ${t2(x.cap-loadOf(x.code))} t ${truckRegions(x.code).length?'· '+truckRegions(x.code).map(regName).join(', '):''}</option>`).join('')}</select><input class="inp num" style="width:110px" data-f="ea" data-k="mtons" value="${esc(M.mtons)}" aria-label="Số tấn chuyển"></span>`:''}</span></label>
 <label class="radio"><input type="radio" name="ea" value="remove" data-f="ea" data-k="mode" ${M.mode==='remove'?'checked':''}><span><b>Gỡ khỏi xe</b><br><span class="small muted">Phần hàng trở về chưa xếp; booking quay về Chờ xếp xe.</span></span></label></div>
 <div class="field" style="margin-top:10px"><label for="ea-r">Lý do sửa <span class="req">*</span></label><input id="ea-r" class="inp" data-f="ea" data-k="reason" value="${esc(M.reason)}"></div>
 ${M.err?`<div class="err" style="margin-top:6px">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="truck" data-c="${t.code}">Hủy</button><button class="btn" data-a="eaSave">Lưu</button></div>`;}
function mPlace(){const M=V.modal;const t=truckByCode(M.code);const free=r2(t.cap-loadOf(t.code));const regs=truckRegions(t.code);
 const holds=S.bookings.filter(b=>b.wh===t.wh&&b.date===t.date&&b.status==='hold').map(b=>({b,rem:r2(bkTotal(b)-allocSum(b.id))})).filter(x=>x.rem>0.001)
  .map(x=>({...x,rel:!regs.length?'':regs.includes(x.b.region)?'same':regs.some(r=>relation(r,x.b.region)==='nb')?'nb':'other'}))
  .sort((a,b)=>({same:0,nb:1,'':2,other:3})[a.rel]-({same:0,nb:1,'':2,other:3})[b.rel]||((bkTotal(a.b)>S.cfg.split?'DK':'CN')===t.type?-1:1));
 return `<div class="mhead"><h2>XẾP ĐƠN LÊN XE ${t.short}</h2><span class="meta num">Còn trống ${t2(free)} t</span></div>
 ${holds.length?`<div style="display:grid;gap:8px">${holds.map(x=>`<label class="radio"><input type="radio" name="pl" value="${x.b.id}" data-f="pl" ${M.bk===x.b.id?'checked':''}><span class="grow"><b>${esc(cust(x.b.customerId).name)}</b> · ${x.b.id} · gợi ý ${bkTotal(x.b)>S.cfg.split?'DK':'CN'}<br><span class="small">${esc(regName(x.b.region))} ${x.rel?`<span class="rel rel-${x.rel}">${x.rel==='same'?'Cùng khu vực':x.rel==='nb'?'Lân cận':'Khác khu vực'}</span>`:''} · chưa gán <b class="num">${t2(x.rem)} t</b></span></span></label>`).join('')}</div>
 <div class="field" style="margin-top:10px;max-width:200px"><label for="pl-t">Số tấn xếp lên xe này</label><input id="pl-t" class="inp num" data-f="plt" value="${esc(M.tons||'')}"></div>`:'<div class="empty">Không còn booking chờ xếp xe trong ngày.</div>'}
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${holds.length?'<button class="btn" data-a="placeSave">Xếp lên xe</button>':''}</div>`;}
function mCustDay(){const date=V.modal.date;const list=S.bookings.filter(b=>b.wh===V.wh&&b.date===date&&b.customerId===me().customerId&&b.status!=='draft');const c=cust(me().customerId);const s=user(c.salesId);
 return `<div class="mhead"><h2>ĐƠN HÀNG CỦA TÔI</h2><span class="meta">${WH.find(w=>w.id===V.wh).full} · ${dmy(date)}</span></div>
 <div class="tbl-wrap"><table><thead><tr><th>Mã booking</th><th>Ref</th><th>Sản phẩm · Màu · Độ dày × Khổ</th><th class="r">Số tấn</th><th>Nơi giao</th><th>Ngày giao YC</th><th>Trạng thái</th></tr></thead><tbody>
 ${list.map(b=>`<tr><td>${b.id}</td><td>${esc(b.ref)}</td><td class="small">${b.lines.map(l=>`${esc(l.p)} · ${esc(l.c)} · ${l.th} × ${l.w} · ${t2(l.t)} t`).join('<br>')}</td><td class="r num"><b>${t2(bkTotal(b))}</b></td><td class="small">${esc(b.addrText)}</td><td>${b.delivery?dmy(b.delivery):'–'}</td><td><span class="st st-${b.status}">${ST_CUST[b.status]}</span>${b.status==='rejected'||b.status==='resched'?`<div class="small">${esc(b.rejectReason)}${b.proposedDate?' · đề xuất '+dmy(b.proposedDate):''}</div>`:''}</td></tr>`).join('')}</tbody></table></div>
 <p class="small" style="margin-top:12px">Tổng đã xác nhận: <b class="num">${t2(list.filter(b=>b.status==='ok').reduce((s,b)=>s+bkTotal(b),0))} t</b>. Muốn đặt thêm hoặc đổi lịch, liên hệ Sales phụ trách: <b>${esc(s.name)}</b> · ${esc(s.phone||'')} · ${esc(s.email)}</p>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;}
function mGroup(){const ids=V.modal.ids;
 return `<div class="mhead"><h2>NHÓM GỘP ĐÃ ĐIỀN SẴN</h2></div><p class="small">Phần hàng đã được xếp tạm lên xe. Kiểm tra rồi xác nhận cả nhóm, hoặc mở từng booking để chỉnh.</p>
 <div class="tbl-wrap"><table><thead><tr><th>Booking</th><th>Khách</th><th class="r">Đã gán / Tổng</th><th>Xe</th><th></th></tr></thead><tbody>${ids.map(id=>{const b=bkById(id);return `<tr><td>${b.id}</td><td>${esc(cust(b.customerId).name)}</td><td class="r num">${t2(allocSum(id))} / ${t2(bkTotal(b))}</td><td>${allocsOf(id).map(a=>truckByCode(a.truck).short).join(', ')}</td><td><button class="btn ghost sm" data-a="openBk" data-id="${id}">Mở</button></td></tr>`;}).join('')}</tbody></table></div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="groupConfirm">Xác nhận cả nhóm</button></div>`;}

/* booking form SCR-08 */
function bfNew(date,src){const wh=V.wh;return{type:'bf',mode:src?'edit':'new',id:src?.id||null,f:src?{wh:src.wh,date:src.date,delivery:src.delivery,customerId:src.customerId,ref:src.ref,addrId:src.addrId||'new',addrText:src.addrId?src.addrText:src.addrText.split(',').slice(0,-1).join(',').trim()||src.addrText,province:src.province,ward:src.addrId?'':(src.addrText.includes(',')?src.addrText.split(',').pop().trim():''),region:src.region,regionMode:'saved',lines:src.lines.map(l=>({...l})),note:src.note,saveAddr:false}:{wh,date,delivery:'',customerId:'',ref:'',addrId:'',addrText:'',province:'',ward:'',region:'',regionMode:'',lines:[{p:'',c:'',th:'',w:'',t:''}],note:'',saveAddr:true},err:'',cancel:false,cancelReason:'',wide:true};}
function detectRegion(f){const c=cust(f.customerId);
 if(f.addrId&&f.addrId!=='new'&&c){const a=c.addresses.find(x=>x.id===f.addrId);if(a&&a.regions[f.wh])return{region:a.regions[f.wh],mode:'saved'};if(a)f.province=a.province;}
 const cand=regionsOf(f.wh).filter(r=>r.newProvince===f.province);
 if(cand.length===1)return{region:cand[0].id,mode:'auto'};if(cand.length>1)return{region:'',mode:'choose',opts:cand.map(r=>r.id)};return{region:f.province?'NONE':'',mode:f.province?'none':''};}
function bfTotal(f){return r2(f.lines.reduce((s,l)=>s+(num(l.t)||0),0));}
function bfAvail(M){const f=M.f;const m=dayM(f.wh,f.date);let own=0;if(M.id){const b=bkById(M.id);if(b.status==='hold'&&b.wh===f.wh&&b.date===f.date)own=r2(bkTotal(b)-allocSum(b.id));if(b.status==='ok'&&b.wh===f.wh&&b.date===f.date)own=bkTotal(b);}return{m,avail:r2(m.avail+own)};}
function bfComputed(){const M=V.modal;const f=M.f;const tot=bfTotal(f);const{m,avail}=bfAvail(M);const over=tot>avail+0.001;
 const sugg=over?[...Array(21)].map((_,i)=>addDays(f.date,i-7)).filter(d=>d>=TODAY&&d!==f.date&&S.fleet[f.wh][d]&&!isHoliday(f.wh,d)&&dayM(f.wh,d).avail>=tot).sort((a,b)=>Math.abs(parts(a)[2]-parts(f.date)[2])-Math.abs(parts(b)[2]-parts(f.date)[2])).slice(0,3):[];
 const same=f.region&&f.region!=='NONE'?S.bookings.filter(b=>b.id!==M.id&&b.wh===f.wh&&b.date===f.date&&b.region===f.region&&['hold','ok'].includes(b.status)):[];
 const sameTrucks=f.region&&f.region!=='NONE'?m.trucks.filter(t=>truckRegions(t.code).includes(f.region)&&t.cap-loadOf(t.code)>0.001):[];
 return{tot,avail,over,sugg,same,sameTrucks,m};}
function bfCapHtml(){const M=V.modal;const f=M.f;const c=bfComputed();
 if(!f.date)return '';
 if(!c.m.declared||c.m.off)return `<div class="capblock over">${c.m.off?'Ngày nghỉ – không bốc hàng.':'Ngày này chưa khai báo xe: chỉ được Lưu tạm.'}</div>`;
 return `<div class="capblock num ${c.over?'over':''}">SỨC CHỨA CÒN LẠI NGÀY ${dm(f.date)}: ${t2(c.avail)} TẤN → sau booking này: ${t2(c.avail-c.tot)} TẤN</div>
 ${c.over?`<div class="small" style="margin-top:6px">Ngày gợi ý: ${c.sugg.length?c.sugg.map(d=>`<button class="btn ghost sm" data-a="bfDate" data-d="${d}">${dm(d)} (${t2(dayM(f.wh,d).avail)} t)</button>`).join(' '):'không tìm thấy ngày đủ chỗ trong ±7 ngày'}</div>`:''}`;}
function bfHintHtml(){const M=V.modal;const f=M.f;if(!f.region||f.region==='NONE'||!f.date)return '';const c=bfComputed();
 if(!c.same.length)return `<div class="hint">Chưa có booking nào khu vực <b>${esc(regName(f.region))}</b> ngày ${dm(f.date)}.</div>`;
 return `<div class="hint">Ngày ${dm(f.date)} đã có <b>${c.same.length} booking</b> khu vực ${esc(regName(f.region))} (<span class="num">${t2(c.same.reduce((s,b)=>s+bkTotal(b),0))}</span> t)${c.sameTrucks.length?' – '+c.sameTrucks.map(t=>`${t.short} còn trống ${t2(t.cap-loadOf(t.code))} t`).join(', '):''}. Đơn này có khả năng được ghép xe.</div>`;}
function mBF(){const M=V.modal;const f=M.f;const c=cust(f.customerId);const det=f.customerId?detectRegion({...f}):{};const editing=M.mode==='edit';const b=M.id?bkById(M.id):null;
 const regOpts=regionsOf(f.wh);const pref=bfTotal(f)>S.cfg.split?'DK':'CN';
 return `<div class="mhead"><span class="meta">${WH.find(w=>w.id===f.wh).full.toUpperCase()}</span><span class="meta">Ngày: ${f.date?dmy(f.date):'–'}</span></div>
 <h2 style="margin-bottom:12px">${editing?'SỬA BOOKING '+M.id:'ĐẶT HÀNG'}</h2>
 <div class="fgrid">
 <div class="field"><label for="bf-wh">Kho <span class="req">*</span></label><select id="bf-wh" class="inp" data-f="bf" data-k="wh" ${editing?'disabled':''}>${WH.map(w=>`<option value="${w.id}" ${f.wh===w.id?'selected':''}>${w.name}</option>`).join('')}</select></div>
 <div class="field"><label for="bf-date">Ngày bốc <span class="req">*</span></label><input id="bf-date" type="date" class="inp" min="${TODAY}" value="${f.date}" data-f="bf" data-k="date"></div>
 <div class="field"><label for="bf-cust">Khách hàng <span class="req">*</span></label><select id="bf-cust" class="inp" data-f="bf" data-k="customerId" ${editing?'disabled':''}><option value="">Tìm và chọn khách hàng</option>${S.customers.map(x=>`<option value="${x.id}" ${f.customerId===x.id?'selected':''}>${esc(x.name)} · ${x.code}</option>`).join('')}</select>${c?`<span class="small muted">${SEG_LABEL[c.segment]} · Sales: ${esc(user(c.salesId).name)}</span>`:''}</div>
 <div class="field"><label for="bf-ref">Ref đơn hàng (SO) <span class="req">*</span></label><input id="bf-ref" class="inp" maxlength="30" value="${esc(f.ref)}" data-f="bf" data-k="ref" placeholder="SO-4500xxx"></div>
 <div class="field"><label for="bf-del">Ngày giao yêu cầu</label><input id="bf-del" type="date" class="inp" min="${f.date}" value="${f.delivery}" data-f="bf" data-k="delivery"></div>
 <div class="field"><label>Loại xe gợi ý (nội bộ)</label><div id="bf-pref" style="padding-top:6px"><span class="chip">${bfTotal(f)?pref+' · '+(pref==='DK'?'đầu kéo':'container'):'–'}</span></div></div>
 <div class="addrbox span2"><b>Địa chỉ giao hàng <span class="req">*</span></b>
  ${c?`<select class="inp" id="bf-addr" data-f="bf" data-k="addrId">${c.addresses.map(a=>`<option value="${a.id}" ${f.addrId===a.id?'selected':''}>${esc(a.label)}, ${esc(a.ward)}, ${esc(a.province)}</option>`).join('')}<option value="new" ${f.addrId==='new'?'selected':''}>+ Địa chỉ mới</option></select>`:'<span class="small muted">Chọn khách hàng trước.</span>'}
  ${f.addrId==='new'?`<div class="fgrid"><div class="field"><label for="bf-prov">Tỉnh/Thành (địa giới từ 01/07/2025) <span class="req">*</span></label><select id="bf-prov" class="inp" data-f="bf" data-k="province"><option value="">Chọn tỉnh/thành</option>${PROVINCES.map(p=>`<option ${f.province===p?'selected':''}>${p}</option>`).join('')}</select></div><div class="field"><label for="bf-ward">Phường/Xã <span class="req">*</span></label><input id="bf-ward" class="inp" value="${esc(f.ward)}" data-f="bf" data-k="ward"></div><div class="field span2"><label for="bf-street">Số nhà, đường, tên điểm giao <span class="req">*</span></label><input id="bf-street" class="inp" value="${esc(f.addrText)}" data-f="bf" data-k="addrText"></div><label class="row small span2"><input type="checkbox" data-f="bfc" data-k="saveAddr" ${f.saveAddr?'checked':''}> Lưu địa chỉ và khu vực vào hồ sơ khách</label></div>`:''}
 </div>
 <div class="field"><label for="bf-reg">Khu vực <span class="req">*</span> <span class="chip">${f.regionMode==='manual'?'Chọn tay':f.regionMode==='saved'?'Theo hồ sơ khách':f.regionMode==='auto'?'Tự động':f.regionMode==='choose'?'Cần chọn':f.regionMode==='none'?'Không khớp':'–'}</span></label>
  <select id="bf-reg" class="inp" data-f="bf" data-k="region"><option value="">Chọn khu vực</option>${regOpts.map(r=>`<option value="${r.id}" ${f.region===r.id?'selected':''}>${esc(r.name)}${det.opts?.includes(r.id)?' · thuộc '+esc(r.newProvince):''}</option>`).join('')}<option value="NONE" ${f.region==='NONE'?'selected':''}>Chưa phân khu vực</option></select>
  ${f.regionMode==='choose'?`<span class="small" style="color:var(--warn)">Tỉnh ${esc(f.province)} ứng với nhiều khu vực: ${det.opts.map(regName).map(esc).join(', ')}. Chọn một.</span>`:''}${f.region==='NONE'?'<span class="small" style="color:var(--warn)">Booking sẽ không được gợi ý gộp xe; Logistics nhận thông báo bổ sung cấu hình.</span>':''}</div>
 <div id="bf-hint" style="align-self:end">${bfHintHtml()}</div>
 <div class="span2"><b>Dòng sản phẩm <span class="req">*</span></b><div class="tbl-wrap" style="margin-top:6px;background:var(--surface)"><table class="linetbl"><thead><tr><th>Sản phẩm</th><th>Màu</th><th>Độ dày (mm)</th><th>Khổ (mm)</th><th>Số tấn</th><th></th></tr></thead><tbody>
 ${f.lines.map((l,i)=>`<tr><td>${catSelect('products',l.p,i,'p','Sản phẩm')}</td><td>${catSelect('colors',l.c,i,'c','Màu')}</td><td>${catSelect('thicks',l.th,i,'th','Độ dày')}</td><td>${catSelect('widths',l.w,i,'w','Khổ')}</td><td><input class="inp num" style="width:90px" inputmode="decimal" value="${esc(l.t)}" data-f="bfl" data-i="${i}" data-k="t" aria-label="Số tấn dòng ${i+1}"></td><td>${f.lines.length>1?`<button class="btn ghost sm" data-a="bfDel" data-i="${i}" aria-label="Xóa dòng">×</button>`:''}</td></tr>`).join('')}
 </tbody></table></div><div class="row" style="margin-top:6px"><button class="btn ghost sm" data-a="bfAdd">+ Thêm dòng</button><span class="grow"></span><b class="num" id="bf-total">Tổng: ${t2(bfTotal(f))} tấn</b></div></div>
 <div class="field span2"><label for="bf-note">Ghi chú cho Logistics</label><textarea id="bf-note" class="inp" maxlength="500" data-f="bf" data-k="note">${esc(f.note)}</textarea></div>
 <div class="span2" id="bf-cap">${bfCapHtml()}</div></div>
 ${M.err?`<div class="err" style="margin-top:10px">${esc(M.err)}</div>`:''}
 ${M.cancel?`<div class="panel" style="margin-top:10px"><div class="field"><label for="bf-cr">Lý do hủy <span class="req">*</span></label><input id="bf-cr" class="inp" data-f="bfcr" value="${esc(M.cancelReason)}"></div><div class="mfoot"><button class="btn ghost sm" data-a="bfCancelOff">Thôi</button><button class="btn danger sm" data-a="bfCancelGo">Xác nhận hủy booking</button></div></div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${editing&&b.status!=='draft'&&can('booking.cancel')?`<button class="btn danger" data-a="bfCancelOn">Hủy booking</button>`:''}${!editing||b.status==='draft'?'<button class="btn ghost" data-a="bfDraft">Lưu tạm</button>':''}${editing&&b.status!=='draft'&&b.status!=='resched'?'<button class="btn" data-a="bfHold">Lưu thay đổi</button>':'<button class="btn" data-a="bfHold">Giữ chỗ</button>'}</div>`;}
const CAT={products:{label:'Sản phẩm',named:true},colors:{label:'Màu',named:true},thicks:{label:'Độ dày',unit:'mm',min:0.1,max:10},widths:{label:'Khổ rộng',unit:'mm',min:100,max:2000,int:true}};
const LINEKEY={products:'p',colors:'c',thicks:'th',widths:'w'};
const catLabel=(k,x)=>CAT[k].named?x.name:String(x.value).replace('.',',');
const catVal=(k,x)=>CAT[k].named?x.name:String(x.value);
const catUsage=(k,x)=>S.bookings.filter(b=>b.lines.some(l=>String(l[LINEKEY[k]])===catVal(k,x))).length;
function catSelect(k,cur,i,key,lbl){const items=S[k].filter(x=>x.active||catVal(k,x)===String(cur));
 return `<select class="inp" ${CAT[k].named?'':'style="width:92px"'} data-f="bfl" data-i="${i}" data-k="${key}" aria-label="${lbl} dòng ${i+1}"><option value="">Chọn</option>${items.map(x=>`<option value="${esc(catVal(k,x))}" ${catVal(k,x)===String(cur)?'selected':''}>${esc(catLabel(k,x))}${x.active?'':' (ngừng dùng)'}</option>`).join('')}</select>`;}
function catPanel(k){const C=CAT[k];const E=V.catEdit&&V.catEdit.k===k?V.catEdit:null;const N=(V.cat||{})[k]||{};
 const rows=S[k].map((x,i)=>{const used=catUsage(k,x);
  if(E&&E.i===i)return `<tr><td colspan="2"><div class="row" style="flex-wrap:nowrap">${C.named?`<input class="inp" style="width:80px" data-f="catE" data-k="code" value="${esc(E.code)}" aria-label="Mã"><input class="inp" data-f="catE" data-k="name" value="${esc(E.name)}" aria-label="Tên">`:`<input class="inp num" style="width:100px" inputmode="decimal" data-f="catE" data-k="value" value="${esc(E.value)}" aria-label="Giá trị (${C.unit})"><span class="muted small">${C.unit}</span>`}</div>${E.err?`<div class="err">${esc(E.err)}</div>`:''}</td><td></td><td class="r"><span class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn ghost sm" data-a="catEditOff">Hủy</button><button class="btn sm" data-a="catEditSave">Lưu</button></span></td></tr>`;
  return `<tr style="${x.active?'':'opacity:.55'}"><td>${C.named?`<span class="muted small">${esc(x.code)}</span> <b>${esc(x.name)}</b>`:`<b class="num">${esc(catLabel(k,x))}</b> <span class="muted small">${C.unit}</span>`}</td><td class="small muted">${used?used+' booking':'Chưa dùng'}</td><td>${x.active?'<span class="st st-ok">Đang dùng</span>':'<span class="st st-draft">Ngừng dùng</span>'}</td>
  <td class="r"><span class="row" style="flex-wrap:nowrap;justify-content:flex-end"><button class="btn ghost sm" data-a="catEdit" data-k="${k}" data-i="${i}">Sửa</button><button class="btn ghost sm" data-a="catToggle" data-k="${k}" data-i="${i}">${x.active?'Ngừng dùng':'Bật lại'}</button></span></td></tr>`;}).join('');
 return `<div class="panel" style="background:var(--sand);min-width:0"><div class="row" style="margin-bottom:8px"><b class="grow">Danh mục ${C.label.toLowerCase()}</b><span class="small muted">${S[k].filter(x=>x.active).length}/${S[k].length} đang dùng</span></div>
 <div class="tbl-wrap" style="background:var(--surface)"><table><thead><tr><th>${C.named?'Mã · Tên':'Giá trị'}</th><th>Sử dụng</th><th>Trạng thái</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
 <div class="row" style="margin-top:8px;flex-wrap:nowrap">${C.named?`<input class="inp" style="width:90px" data-f="cat" data-k="${k}.code" placeholder="Mã" value="${esc(N.code||'')}" aria-label="Mã mới"><input class="inp grow" data-f="cat" data-k="${k}.name" placeholder="Tên ${C.label.toLowerCase()} mới" value="${esc(N.name||'')}" aria-label="Tên mới">`:`<input class="inp num grow" inputmode="decimal" data-f="cat" data-k="${k}.value" placeholder="Giá trị mới (${C.unit}), ví dụ ${k==='thicks'?'0,48':'1219'}" value="${esc(N.value||'')}" aria-label="Giá trị mới">`}<button class="btn sm" data-a="catAdd" data-k="${k}">Thêm</button></div>
 ${N.err?`<div class="err" style="margin-top:4px">${esc(N.err)}</div>`:''}</div>`;}
function catParse(k,raw){const C=CAT[k];const v=parseFloat(String(raw).replace(',','.'));if(!(v>=C.min&&v<=C.max))return{err:`${C.label} phải trong khoảng ${String(C.min).replace('.',',')}–${C.max} ${C.unit}.`};if(C.int&&!Number.isInteger(v))return{err:`${C.label} phải là số nguyên (mm).`};return{v:r2(v)};}
function mUserNew(){const M=V.modal;const f=M.f;
 return `<div class="mhead"><h2>${M.edit?'SỬA TÀI KHOẢN':'CẤP QUYỀN TÀI KHOẢN'}</h2></div>
 ${M.edit?'':`<div class="hint" style="margin-bottom:10px"><b>Bước 1:</b> tạo tài khoản đăng nhập trong Supabase → Authentication → Users → <b>Add user</b> (tick <i>Auto Confirm User</i>, đặt mật khẩu tạm). <b>Bước 2:</b> nhập đúng email đó ở đây để gán vai trò.</div>`}<div class="fgrid">
 <div class="field"><label for="un-n">Họ tên <span class="req">*</span></label><input id="un-n" class="inp" data-f="un" data-k="name" value="${esc(f.name)}"></div>
 <div class="field"><label for="un-e">Email đăng nhập <span class="req">*</span></label><input id="un-e" class="inp" type="email" data-f="un" data-k="email" value="${esc(f.email)}" ${M.edit?'readonly':''}></div>
 <div class="field"><label for="un-r">Vai trò <span class="req">*</span></label><select id="un-r" class="inp" data-f="un" data-k="role">${Object.entries(ROLE_LABEL).map(([k,l])=>`<option value="${k}" ${f.role===k?'selected':''}>${l}</option>`).join('')}</select></div>
 <div class="field"><label for="un-p">Số điện thoại ${f.role==='sales'?'<span class="req">*</span>':''}</label><input id="un-p" class="inp" data-f="un" data-k="phone" value="${esc(f.phone)}"></div>
 ${f.role==='sales'?`<div class="field"><label for="un-s">Segment <span class="req">*</span></label><select id="un-s" class="inp" data-f="un" data-k="segment"><option value="DD" ${f.segment==='DD'?'selected':''}>Dân dụng</option><option value="DA" ${f.segment==='DA'?'selected':''}>Dự án</option></select></div>`:''}
 ${f.role==='customer'?`<div class="field"><label for="un-c">Công ty khách hàng <span class="req">*</span></label><select id="un-c" class="inp" data-f="un" data-k="customerId"><option value="">Chọn</option>${S.customers.map(c=>`<option value="${c.id}" ${f.customerId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>`:''}
 <div class="field"><label for="un-w">Kho mặc định <span class="req">*</span></label><select id="un-w" class="inp" data-f="un" data-k="wh">${WH.map(w=>`<option value="${w.id}" ${f.wh===w.id?'selected':''}>${w.name}</option>`).join('')}</select></div></div>
 ${M.err?`<div class="err" style="margin-top:8px">${esc(M.err)}</div>`:''}<p class="small muted">Gửi email và mật khẩu tạm cho người dùng; họ tự đổi mật khẩu trong Hồ sơ cá nhân.</p>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="unSave">${M.edit?'Lưu':'Cấp quyền'}</button></div>`;}
function mCustNew(){const M=V.modal;const f=M.f;const sales=S.users.filter(u=>u.role==='sales'&&u.active&&u.segment===f.segment);const cand=S.regions.filter(r=>r.active&&r.newProvince===f.province);
 return `<div class="mhead"><h2>THÊM KHÁCH HÀNG</h2></div><div class="fgrid">
 <div class="field"><label for="cn-c">Mã khách hàng <span class="req">*</span></label><input id="cn-c" class="inp" data-f="cn" data-k="code" value="${esc(f.code)}"></div>
 <div class="field"><label for="cn-n">Tên công ty <span class="req">*</span></label><input id="cn-n" class="inp" data-f="cn" data-k="name" value="${esc(f.name)}"></div>
 <div class="field"><label for="cn-s">Segment <span class="req">*</span></label><select id="cn-s" class="inp" data-f="cn" data-k="segment"><option value="DD" ${f.segment==='DD'?'selected':''}>Dân dụng</option><option value="DA" ${f.segment==='DA'?'selected':''}>Dự án</option></select></div>
 <div class="field"><label for="cn-sl">Sales phụ trách (cùng segment) <span class="req">*</span></label><select id="cn-sl" class="inp" data-f="cn" data-k="salesId"><option value="">Chọn</option>${sales.map(u=>`<option value="${u.id}" ${f.salesId===u.id?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div>
 <div class="field"><label for="cn-l">Tên điểm giao <span class="req">*</span></label><input id="cn-l" class="inp" data-f="cn" data-k="label" value="${esc(f.label)}"></div>
 <div class="field"><label for="cn-p">Tỉnh/Thành <span class="req">*</span></label><select id="cn-p" class="inp" data-f="cn" data-k="province"><option value="">Chọn</option>${PROVINCES.map(p=>`<option ${f.province===p?'selected':''}>${p}</option>`).join('')}</select></div>
 <div class="field"><label for="cn-w">Phường/Xã <span class="req">*</span></label><input id="cn-w" class="inp" data-f="cn" data-k="ward" value="${esc(f.ward)}"></div>
 <div class="field"><label for="cn-r">Khu vực</label><select id="cn-r" class="inp" data-f="cn" data-k="region"><option value="">${cand.length?'Chọn khu vực':'Chưa phân khu vực'}</option>${cand.map(r=>`<option value="${r.id}" ${f.region===r.id?'selected':''}>${esc(r.name)} (${r.wh})</option>`).join('')}</select>${cand.length>1?'<span class="small" style="color:var(--warn)">Tỉnh này ứng với nhiều khu vực, chọn một.</span>':''}</div></div>
 ${M.err?`<div class="err" style="margin-top:8px">${esc(M.err)}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="cnSave">Lưu khách hàng</button></div>`;}

/* ===================== server calls ===================== */
let sb=null;const RANGE={from:'',to:''};
async function rpc(fn,args){const{data,error}=await sb.rpc(fn,args||{});if(error)throw new Error(error.message||'Lỗi máy chủ');return data;}
function setBusy(on){V.busy=on;document.body.classList.toggle('busy',on);}
// Gọi một hàm nghiệp vụ, nạp lại dữ liệu rồi vẽ lại. opts.err(msg): hiển thị lỗi tại chỗ; opts.ok(data): việc làm sau khi thành công
async function mutate(fn,args,opts={}){
 if(V.busy)return;setBusy(true);
 try{const d=await rpc(fn,args);await reload();setBusy(false);if(opts.ok)opts.ok(d);else render();return d;}
 catch(e){setBusy(false);if(opts.err){opts.err(e.message);render();}else toast(e.message);}
}
async function reload(){
 const[y,m]=V.ym;const ms=iso(y,m,1),me_=iso(y,m,dim(y,m));
 const from=addDays(ms<TODAY?ms:TODAY,-7),to=addDays(me_>TODAY?me_:TODAY,21);
 const st=await rpc('get_state',{p_from:from,p_to:to});
 if(!st||!st.me){S=null;V.noProfile=true;return;}
 TODAY=st.today;S=adopt(st);V.me=st.me.id;V.stats=null;RANGE.from=from;RANGE.to=to;
}
function goMonth(date){const[y,m]=parts(date);const changed=y!==V.ym[0]||m!==V.ym[1];V.ym=[y,m];return changed||date<RANGE.from||date>RANGE.to;}
function afterNav(need){if(need){render();reload().then(render).catch(e=>toast(e.message));}else render();}

/* ===================== actions ===================== */
const go=v=>{V.view=v;V.menu=false;V.modal=null;V.hl=null;render();window.scrollTo(0,0);};
function openBooking(id){V.bk=id;V.asg=null;V.prev=V.view==='booking'?V.prev:V.view;V.modal=null;V.view='booking';render();window.scrollTo(0,0);}
const A={
 go:d=>go(d.v),
 menu:()=>{V.menu=!V.menu;render();},
 logout:async()=>{try{await sb.auth.signOut();}catch(e){}location.reload();},
 refresh:()=>{reload().then(()=>{render();toast('Đã cập nhật dữ liệu');}).catch(e=>toast(e.message));},
 close:()=>{V.modal=null;render();},
 scrim:(d,el,e)=>{if(e.target===el){V.modal=null;render();}},
 month:d=>{let[y,m]=V.ym;m+=+d.d;if(m<1){m=12;y--;}if(m>12){m=1;y++;}V.fleetEdit={};afterNav(goMonth(iso(y,m,1)));},
 openDay:d=>{V.day=d.d;V.view='day';V.dayFilter={st:'all',region:'all'};V.hl=null;render();window.scrollTo(0,0);},
 dayNav:d=>{V.day=addDays(V.day,+d.d);V.hl=null;afterNav(goMonth(V.day));},
 dayTab:d=>{V.dayTab=d.t;V.hl=null;render();},
 custDay:d=>{V.modal={type:'custDay',date:d.d,wide:true};render();},
 truck:d=>{V.modal={type:'truck',code:d.c,wide:true};render();},
 place:(d)=>{V.modal={type:'place',code:d.c,bk:'',tons:'',err:''};render();},
 placeSave:()=>{const M=V.modal;const t=truckByCode(M.code);const b=bkById(M.bk);if(!b){M.err='Chọn một booking.';return render();}
  const rem=r2(bkTotal(b)-allocSum(b.id));let tons=num(M.tons);if(!(tons>0))tons=r2(Math.min(rem,t.cap-loadOf(t.code)));
  if(!(tons>0)){M.err='Nhập số tấn lớn hơn 0.';return render();}if(tons>rem+0.001){M.err='Vượt phần chưa gán của booking ('+t2(rem)+' t).';return render();}
  mutate('place_on_truck',{p_id:b.id,p_truck:t.code,p_tons:r2(tons)},{err:m=>M.err=m,ok:full=>{if(full){openBooking(b.id);toast('Booking đã xếp đủ tấn. Kiểm tra rồi bấm Xác nhận.');}else{V.modal=null;toast(`Đã xếp ${t2(tons)} t lên ${t.short}`);}}});},
 editAl:d=>{const a=S.allocs.find(x=>x.id===d.id);const tot=r2(allocsOf(a.bk).filter(x=>x.truck===a.truck).reduce((s,x)=>s+x.tons,0));V.modal={type:'editAl',id:d.id,mode:'adjust',tons:tot,target:'',mtons:tot,reason:'',err:''};render();},
 eaSave:()=>{const M=V.modal;const a=S.allocs.find(x=>x.id===M.id);if(!a){V.modal=null;return render();}const t=truckByCode(a.truck);
  if(!M.reason.trim()){M.err='Nhập lý do sửa.';return render();}
  if(M.mode==='move'&&!M.target){M.err='Chọn xe đích.';return render();}
  const tons=M.mode==='adjust'?num(M.tons):M.mode==='move'?num(M.mtons):null;
  mutate('edit_allocation',{p_id:a.bk,p_truck:a.truck,p_mode:M.mode,p_tons:Number.isFinite(tons)?tons:null,p_target:M.target||null,p_reason:M.reason.trim()},
   {err:m=>M.err=m,ok:()=>{V.modal={type:'truck',code:t.code,wide:true};toast('Đã lưu thay đổi phần hàng');}});},
 hlGroup:(d,el,e)=>{if(e.target.closest('button'))return;const g=groupSuggest(V.wh,V.day).find(x=>x.key===d.k);if(!g)return;const codes=g.truck?[g.truck]:[];V.hl=codes.length?codes:null;render();},
 skipGroup:d=>{const g=groupSuggest(V.wh,V.day).find(x=>x.key===d.k);V.skip=[...(V.skip||[]),d.k];render();toast('Đã bỏ qua nhóm gộp');
  if(g)rpc('skip_group',{p_wh:V.wh,p_day:V.day,p_ids:g.items.map(x=>x.b.id),p_fill:r2(g.fill)}).catch(()=>{});},
 applyGroup:d=>{const g=groupSuggest(V.wh,V.day).find(x=>x.key===d.k);if(!g)return;let code=g.truck;
  if(!code){const t=trucksOf(V.wh,V.day).find(t=>t.type==='CN'&&loadOf(t.code)<=0.001);if(!t)return toast('Không còn container trống để áp dụng nhóm.');code=t.code;}
  const ids=g.items.map(x=>x.b.id);
  mutate('apply_group',{p_ids:ids,p_tons:g.items.map(x=>r2(x.need)),p_truck:code,p_neighbor:g.nb},{ok:()=>{V.modal={type:'group',ids};render();}});},
 groupConfirm:()=>{const ids=V.modal.ids;mutate('confirm_group',{p_ids:ids},{ok:n=>{V.modal=null;toast(`Đã xác nhận ${n} booking${ids.length-n?`, ${ids.length-n} booking chưa gán đủ tấn`:''}`);}});},
 openBk:d=>openBooking(d.id),
 blTab:d=>{V.blTab=d.t;render();},
 back:()=>{V.view=V.prev&&V.prev!=='booking'?V.prev:'calendar';V.asg=null;render();},
 bkRegion:(d,el)=>mutate('set_region',{p_id:V.bk,p_region:el.value},{ok:()=>toast('Đã đổi khu vực')}),
 asgSuggest:()=>{const b=bkById(V.bk);const s=suggestFor(b);V.asg.rows={};s.rows.forEach(r=>V.asg.rows[r.code]=r.tons);V.asg.err=s.left>0?`Không đủ xe để gợi ý hết, còn thiếu ${t2(s.left)} t.`:'';render();},
 asgEdit:()=>{V.asg.edit=true;render();},
 asgPanel:d=>{V.asg.panel=d.p;V.asg.err='';render();},
 asgSave:()=>saveAsg(false),
 asgConfirm:()=>saveAsg(true),
 asgReject:()=>{const b=bkById(V.bk);if(!V.asg.rej.trim()){V.asg.err='Nhập lý do từ chối.';return render();}
  mutate('reject_booking',{p_id:b.id,p_reason:V.asg.rej.trim()},{err:m=>V.asg.err=m,ok:()=>{V.asg=null;toast('Đã từ chối booking');}});},
 asgResched:()=>{const b=bkById(V.bk);const A_=V.asg;if(!A_.newDate||!A_.resReason.trim()){A_.err='Chọn ngày đề xuất và nhập lý do.';return render();}
  mutate('propose_day',{p_id:b.id,p_day:A_.newDate,p_reason:A_.resReason.trim()},{err:m=>V.asg.err=m,ok:()=>{V.asg=null;toast('Đã gửi đề nghị đổi ngày');}});},
 // booking form
 newBk:d=>{V.modal=bfNew(d.d||TODAY);render();},
 editBk:d=>{const b=bkById(d.id);const M=bfNew(b.date,b);if(b.status==='resched'&&b.proposedDate)M.f.date=b.proposedDate;V.modal=M;render();},
 bfAdd:()=>{V.modal.f.lines.push({p:'',c:'',th:'',w:'',t:''});render();},
 bfDel:d=>{V.modal.f.lines.splice(+d.i,1);render();},
 bfDate:d=>{V.modal.f.date=d.d;render();},
 bfCancelOn:()=>{V.modal.cancel=true;render();},bfCancelOff:()=>{V.modal.cancel=false;render();},
 bfCancelGo:()=>{const M=V.modal;if(!M.cancelReason.trim()){M.err='Nhập lý do hủy.';return render();}
  mutate('cancel_booking',{p_id:M.id,p_reason:M.cancelReason.trim()},{err:m=>M.err=m,ok:()=>{V.modal=null;V.asg=null;toast('Đã hủy booking '+M.id);}});},
 bfDraft:()=>saveBF('draft'),
 bfHold:()=>saveBF('hold'),
 // fleet
 bulkApply:()=>{const B=V.bulk||{from:TODAY,to:addDays(TODAY,6),dk:9,cn:4};let d=B.from||TODAY;let n=0;while(d<=(B.to||d)&&n<62){if(d>=TODAY&&!isHoliday(V.wh,d)&&d.startsWith(`${V.ym[0]}-${pad(V.ym[1])}`)){V.fleetEdit[d]={...(V.fleetEdit[d]||{}),dk:String(B.dk??9),cn:String(B.cn??4)};}d=addDays(d,1);n++;}render();toast('Đã điền vào bảng, bấm Lưu để áp dụng');},
 fleetReset:()=>{V.fleetEdit={};V.fleetErr='';render();},
 fleetSave:()=>{const errs=[];const rows=[];
  for(const[ds,e]of Object.entries(V.fleetEdit)){const f=S.fleet[V.wh][ds];const dk=e.dk!==undefined?parseInt(e.dk,10):f?.dk??0,cn=e.cn!==undefined?parseInt(e.cn,10):f?.cn??0;const reason=String(e.reason??f?.reason??'').trim();
   if(!(dk>=0&&dk<=99&&cn>=0&&cn<=99)){errs.push(`${dm(ds)}: số xe phải là số nguyên 0–99.`);continue;}
   if(f&&(dk<f.dk||cn<f.cn)&&!reason)errs.push(`${dm(ds)}: nhập lý do khi giảm số xe.`);
   rows.push({day:ds,dk,cn,reason});}
  if(errs.length){V.fleetErr=errs.join(' ');return render();}
  mutate('upsert_fleet',{p_wh:V.wh,p_rows:rows},{err:m=>V.fleetErr=m,ok:n=>{V.fleetEdit={};V.fleetErr='';toast(`Đã lưu ${n} ngày`);}});},
 // config
 cfgTab:d=>{V.cfgTab=d.t;render();},
 regToggle:d=>mutate('toggle_region',{p_id:d.id},{ok:()=>toast('Đã cập nhật khu vực')}),
 regAdd:()=>{const N=V.newReg||{};V.regErr='';if(!N.name?.trim()||!N.np){V.regErr='Nhập tên khu vực và chọn tỉnh mới tương ứng.';return render();}
  mutate('add_region',{p_wh:V.wh,p_name:N.name.trim(),p_new_province:N.np,p_days:parseInt(N.days,10)||1,p_neighbors:N.nb||[]},{err:m=>V.regErr=m,ok:()=>{V.newReg={};toast('Đã thêm khu vực '+N.name.trim());}});},
 catAdd:d=>{const k=d.k;const C=CAT[k];const N={...((V.cat||{})[k]||{})};N.err='';const setN=x=>{V.cat={...(V.cat||{}),[k]:x};};let args;
  if(C.named){const code=(N.code||'').trim(),name=(N.name||'').trim();if(!code||!name){N.err='Nhập mã và tên.';setN(N);return render();}args={p_kind:k,p_key:null,p_code:code,p_name:name,p_value:null};}
  else{const p=catParse(k,N.value||'');if(p.err){N.err=p.err;setN(N);return render();}args={p_kind:k,p_key:null,p_code:null,p_name:null,p_value:p.v};}
  mutate('catalog_save',args,{err:m=>{N.err=m;setN(N);},ok:()=>{setN({});toast(`Đã thêm ${C.label.toLowerCase()}`);}});},
 catEdit:d=>{const x=S[d.k][+d.i];V.catEdit={k:d.k,i:+d.i,code:x.code||'',name:x.name||'',value:x.value!==undefined?String(x.value).replace('.',','):'',err:''};render();},
 catEditOff:()=>{V.catEdit=null;render();},
 catEditSave:()=>{const E=V.catEdit;const k=E.k;const C=CAT[k];const x=S[k][E.i];E.err='';const key=C.named?x.code:String(x.value);let args;
  if(C.named){const code=E.code.trim(),name=E.name.trim();if(!code||!name){E.err='Nhập mã và tên.';return render();}args={p_kind:k,p_key:key,p_code:code,p_name:name,p_value:null};}
  else{const p=catParse(k,E.value);if(p.err){E.err=p.err;return render();}args={p_kind:k,p_key:key,p_code:null,p_name:null,p_value:p.v};}
  mutate('catalog_save',args,{err:m=>E.err=m,ok:()=>{V.catEdit=null;toast('Đã cập nhật '+C.label.toLowerCase());}});},
 catToggle:d=>{const x=S[d.k][+d.i];const C=CAT[d.k];if(x.active&&S[d.k].filter(y=>y.active).length<=1)return toast(`Cần ít nhất một ${C.label.toLowerCase()} đang dùng.`);
  mutate('catalog_toggle',{p_kind:d.k,p_key:C.named?x.code:String(x.value)},{ok:()=>toast(`${x.active?'Đã ngừng dùng':'Đã bật lại'} ${C.label.toLowerCase()} ${catLabel(d.k,x)}`)});},
 holAdd:()=>{if(!V.hol||S.cfg.holidays.includes(V.hol))return;const h=[...S.cfg.holidays,V.hol].sort();mutate('update_settings',{p:{holidays:h}},{ok:()=>toast('Đã thêm ngày nghỉ')});},
 holDel:d=>{mutate('update_settings',{p:{holidays:S.cfg.holidays.filter(h=>h!==d.d)}},{ok:()=>toast('Đã xóa ngày nghỉ')});},
 // users
 // permissions
 pmAll:d=>{const r=d.r;const cat=S.permCatalog.map(p=>p.code);const all=cat.every(c=>(V.pm[r]||[]).includes(c));V.pm[r]=all?(r==='admin'?['perms.manage']:[]):cat.slice();render();},
 pmUndo:()=>{V.pm=null;V.pmErr='';render();},
 pmSave:()=>mutate('save_role_permissions',{p:V.pm},{err:m=>V.pmErr=m,ok:n=>{V.pm=null;V.pmErr='';toast(n?`Đã lưu phân quyền cho ${n} vai trò`:'Không có thay đổi');}}),
 pmResetOn:()=>{V.pmReset=true;render();},pmResetOff:()=>{V.pmReset=false;render();},
 pmResetGo:()=>mutate('reset_role_permissions',{},{ok:()=>{V.pm=null;V.pmReset=false;toast('Đã khôi phục phân quyền mặc định');}}),
 uTab:d=>{V.uTab=d.t;render();},
 userToggle:d=>{V.userErr='';mutate('admin_toggle_user',{p_user:d.id},{err:m=>V.userErr=m,ok:r=>toast(r==='locked'?'Đã khóa tài khoản':'Đã mở khóa tài khoản')});},
 userNew:()=>{V.modal={type:'userNew',f:{name:'',email:'',role:'cs',phone:'',segment:'DD',customerId:'',wh:'PMY'},err:''};render();},
 userEdit:d=>{const u=user(d.id);V.modal={type:'userNew',edit:true,f:{name:u.name,email:u.email,role:u.role,phone:u.phone||'',segment:u.segment||'DD',customerId:u.customerId||'',wh:u.wh||'PMY'},err:''};render();},
 unSave:()=>{const M=V.modal;const f=M.f;if(!f.name.trim()||!/^\S+@\S+\.\S+$/.test(f.email)){M.err='Nhập họ tên và email hợp lệ.';return render();}
  if(!M.edit&&S.users.some(u=>u.email.toLowerCase()===f.email.trim().toLowerCase())){M.err='Email này đã có vai trò. Bấm Sửa ở dòng tương ứng để đổi.';return render();}
  if(f.role==='sales'&&!f.phone.trim()){M.err='Sales cần số điện thoại (hiển thị cho khách).';return render();}if(f.role==='customer'&&!f.customerId){M.err='Chọn công ty khách hàng.';return render();}
  mutate('admin_upsert_profile',{p:{email:f.email.trim(),name:f.name.trim(),role:f.role,phone:f.phone,segment:f.segment,customer_id:f.customerId,wh:f.wh}},
   {err:m=>M.err=m,ok:()=>{V.modal=null;toast((M.edit?'Đã cập nhật ':'Đã cấp quyền cho ')+f.email.trim());}});},
 custNew:()=>{V.modal={type:'custNew',f:{code:'KH0'+(300+S.customers.length),name:'',segment:'DD',salesId:'',label:'',province:'',ward:'',region:''},err:''};render();},
 cnSave:()=>{const M=V.modal;const f=M.f;if(!f.code.trim()||!f.name.trim()||!f.salesId||!f.label.trim()||!f.province||!f.ward.trim()){M.err='Điền đủ các trường bắt buộc.';return render();}
  mutate('admin_add_customer',{p:{code:f.code.trim(),name:f.name.trim(),segment:f.segment,sales_id:f.salesId,label:f.label.trim(),province:f.province,ward:f.ward.trim(),region:f.region}},
   {err:m=>M.err=m,ok:()=>{V.modal=null;toast('Đã thêm khách hàng '+f.name.trim());}});},
 // notifs
 readAll:()=>mutate('mark_notifs_read',{p_ids:null},{ok:()=>toast('Đã đánh dấu tất cả đã đọc')}),
 openNotif:d=>{const n=S.notifs.find(x=>String(x.id)===String(d.id));if(!n)return;if(!n.read){n.read=true;rpc('mark_notifs_read',{p_ids:[n.id]}).catch(()=>{});}
  const L=n.link||{};if(L.wh)V.wh=L.wh;
  if(L.bk&&internal()){const b=bkById(L.bk);if(b&&visibleBk(b))return openBooking(b.id);}
  if(!internal()&&(L.bk||L.day)){const b=L.bk?bkById(L.bk):null;const day=b?b.date:L.day;if(b)V.wh=b.wh;V.view='calendar';V.modal={type:'custDay',date:day,wide:true};return afterNav(goMonth(day));}
  if(L.day){V.day=L.day;V.view=internal()?'day':'calendar';return afterNav(goMonth(L.day));}render();},
 pfSave:()=>mutate('update_my_profile',{p_name:me().name,p_phone:me().phone||''},{ok:()=>toast('Đã lưu hồ sơ')}),
 pwSave:async()=>{const p=V.pw||'';if(p.length<8){V.pwErr='Mật khẩu tối thiểu 8 ký tự.';return render();}if(p!==V.pw2){V.pwErr='Hai lần nhập không khớp.';return render();}
  setBusy(true);const{error}=await sb.auth.updateUser({password:p});setBusy(false);if(error){V.pwErr=error.message;return render();}V.pw='';V.pw2='';V.pwErr='';toast('Đã đổi mật khẩu');},
 dashTab:d=>{V.dashTab=d.t;render();},
 testEmail:()=>mutate('admin_test_email',{},{ok:to=>toast('Đã xếp hàng email thử tới '+to+', thường đến trong 1–2 phút')}),
 dashTable:()=>{V.dashTable=!V.dashTable;render();},
 dashDay:d=>{V.wh=d.w;V.day=d.d;V.view='day';V.dayFilter={st:'all',region:'all'};afterNav(goMonth(d.d));window.scrollTo(0,0);},
};
function saveAsg(confirm){const b=bkById(V.bk);const chk=asgCheck(b);
 if(chk.sum>chk.total+0.001){V.asg.err='Tổng gán vượt số tấn booking.';return render();}
 if(confirm&&Math.abs(chk.sum-chk.total)>0.005){V.asg.err='Tổng tấn gán phải bằng tổng tấn booking (BR-07).';return render();}
 if(chk.warns.length&&!V.asg.reason.trim()){V.asg.err='Nhập lý do override cho các cảnh báo.';return render();}
 const rows=Object.entries(V.asg.rows).map(([truck,v])=>({truck,tons:r2(num(v))})).filter(r=>r.tons>0);
 mutate('save_allocations',{p_id:b.id,p_rows:rows,p_reason:V.asg.reason.trim(),p_confirm:confirm},{err:m=>V.asg.err=m,ok:()=>{V.asg=null;toast(confirm?'Đã xác nhận '+b.id:'Đã lưu xếp tạm');}});}
function saveBF(kind){const M=V.modal;const f=M.f;M.err='';const tot=bfTotal(f);
 if(!f.customerId||!f.date){M.err='Chọn khách hàng và ngày bốc.';return render();}
 if(f.date<TODAY){M.err='Không đặt cho ngày đã qua.';return render();}
 const isNew=!f.addrId||f.addrId==='new';
 if(kind==='hold'){
  if(isHoliday(f.wh,f.date)||!S.fleet[f.wh][f.date]){M.err='Ngày này chưa khai báo xe hoặc là ngày nghỉ; chỉ được Lưu tạm.';return render();}
  if(!f.ref.trim()){M.err='Nhập Ref đơn hàng.';return render();}
  if(isNew&&(!f.province||!f.ward.trim()||!f.addrText.trim())){M.err='Nhập đủ địa chỉ giao: tỉnh/thành, phường/xã, số nhà/đường.';return render();}
  if(!f.region){M.err='Chọn khu vực (hoặc “Chưa phân khu vực”).';return render();}
  for(const[i,l]of f.lines.entries()){if(!l.p||!l.c||!(num(l.th)>0)||!(num(l.w)>0)||!(num(l.t)>0)){M.err=`Dòng sản phẩm ${i+1}: nhập đủ sản phẩm, màu, độ dày, khổ và số tấn > 0.`;return render();}}
  const{avail}=bfAvail(M);if(tot>avail+0.001){M.err=`Tổng ${t2(tot)} t vượt sức chứa còn lại ${t2(avail)} t của ngày ${dm(f.date)} (BR-09). Chọn ngày gợi ý hoặc Lưu tạm.`;return render();}
 }
 const p={id:M.id||null,mode:kind,wh:f.wh,day:f.date,delivery:f.delivery||'',customer_id:f.customerId,ref:f.ref,address_id:isNew?'new':f.addrId,
  province:f.province,ward:f.ward,street:f.addrText,save_addr:!!f.saveAddr,region:f.region||'',note:f.note||'',
  lines:f.lines.map(l=>({p:l.p,c:l.c,th:String(l.th??'').replace(',','.'),w:String(l.w??''),t:String(l.t??'').replace(',','.')}))};
 mutate('save_booking',{p},{err:m=>M.err=m,ok:id=>{V.modal=null;V.asg=null;toast(kind==='draft'?`Đã lưu nháp ${id}`:M.id?`Đã lưu ${id}`:`Đã giữ chỗ ${id}, trừ tạm ${t2(tot)} t`);}});}

/* ===================== start ===================== */
function screen(title,body,actions=''){return `<div class="login"><div class="panel loginbox"><div class="brand"><span class="mark">${IC.truck.replace('<svg','<svg width="18" height="18"')}</span>ĐẶT XE</div><h1>${title}</h1>${body}${actions}</div></div>`;}
function showLogin(err){
 app.innerHTML=screen('Đăng nhập',`<p class="muted small" style="margin-top:0">Truck Capacity Booking Portal</p>
  <form id="login" class="fgrid" style="grid-template-columns:1fr"><div class="field"><label for="lg-e">Email</label><input id="lg-e" class="inp" type="email" autocomplete="username" required></div>
  <div class="field"><label for="lg-p">Mật khẩu</label><input id="lg-p" class="inp" type="password" autocomplete="current-password" required></div>
  ${err?`<div class="err">${esc(err)}</div>`:''}<button class="btn" type="submit">Đăng nhập</button></form>
  <p class="small"><button class="linkbtn" type="button" id="lg-forgot">Quên mật khẩu?</button></p>
  <p class="small muted">Chưa có tài khoản? Liên hệ Admin.</p>`);
 document.getElementById('lg-forgot').addEventListener('click',()=>showForgot(document.getElementById('lg-e').value.trim()));
 document.getElementById('lg-e').focus();
 document.getElementById('login').addEventListener('submit',async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;btn.textContent='Đang đăng nhập…';
  const{error}=await sb.auth.signInWithPassword({email:document.getElementById('lg-e').value.trim(),password:document.getElementById('lg-p').value});
  if(error)return showLogin(/invalid/i.test(error.message)?'Sai email hoặc mật khẩu.':error.message);startApp();});
}
function showForgot(email,sent){
 app.innerHTML=screen('Quên mật khẩu',sent?`<p>Nếu <b>${esc(sent)}</b> là email đã đăng ký, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút. Kiểm tra cả hộp thư Spam.</p><p class="small muted">Link chỉ dùng được một lần và hết hạn sau 1 giờ.</p>`
  :`<p class="muted small" style="margin-top:0">Nhập email đăng nhập, hệ thống gửi link để bạn đặt mật khẩu mới.</p>
  <form id="fg" class="fgrid" style="grid-template-columns:1fr"><div class="field"><label for="fg-e">Email</label><input id="fg-e" class="inp" type="email" autocomplete="username" required value="${esc(email||'')}"></div>
  <div class="err" id="fg-err" hidden></div><button class="btn" type="submit">Gửi link đặt lại mật khẩu</button></form>`,
  '<p class="small"><button class="linkbtn" type="button" id="fg-back">← Quay lại đăng nhập</button></p>');
 document.getElementById('fg-back').addEventListener('click',()=>showLogin());
 const f=document.getElementById('fg');if(!f)return;document.getElementById('fg-e').focus();
 f.addEventListener('submit',async e=>{e.preventDefault();const btn=f.querySelector('button');btn.disabled=true;btn.textContent='Đang gửi…';const em=document.getElementById('fg-e').value.trim();
  const{error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  if(error&&!/not found|user/i.test(error.message)){const x=document.getElementById('fg-err');x.hidden=false;x.textContent=/rate|seconds/i.test(error.message)?'Bạn vừa yêu cầu gần đây, vui lòng đợi một lát rồi thử lại.':error.message;btn.disabled=false;btn.textContent='Gửi link đặt lại mật khẩu';return;}
  showForgot(em,em);});
}
function showSetPassword(){
 app.innerHTML=screen('Đặt mật khẩu mới',`<form id="sp" class="fgrid" style="grid-template-columns:1fr"><div class="field"><label for="sp1">Mật khẩu mới (tối thiểu 8 ký tự)</label><input id="sp1" class="inp" type="password" autocomplete="new-password" required></div>
  <div class="field"><label for="sp2">Nhập lại mật khẩu mới</label><input id="sp2" class="inp" type="password" autocomplete="new-password" required></div>
  <div class="err" id="sp-err" hidden></div><button class="btn" type="submit">Lưu mật khẩu và vào ứng dụng</button></form>`);
 document.getElementById('sp1').focus();
 document.getElementById('sp').addEventListener('submit',async e=>{e.preventDefault();const p1=document.getElementById('sp1').value,p2=document.getElementById('sp2').value;const x=document.getElementById('sp-err');
  const fail=m=>{x.hidden=false;x.textContent=m;};if(p1.length<8)return fail('Mật khẩu tối thiểu 8 ký tự.');if(p1!==p2)return fail('Hai lần nhập không khớp.');
  const btn=e.target.querySelector('button');btn.disabled=true;const{error}=await sb.auth.updateUser({password:p1});
  if(error){btn.disabled=false;return fail(/same|different/i.test(error.message)?'Mật khẩu mới phải khác mật khẩu cũ.':error.message);}
  startApp();});
}
async function startApp(){
 try{await reload();}catch(e){app.innerHTML=screen('Không tải được dữ liệu',`<p>${esc(e.message)}</p>`,'<button class="btn" data-a="logout">Đăng xuất</button>');return;}
 if(!S){const{data}=await sb.auth.getUser();app.innerHTML=screen('Chưa được cấp quyền',`<p>Tài khoản <b>${esc(data?.user?.email||'')}</b> đã đăng nhập nhưng chưa được Admin gán vai trò, hoặc đã bị khóa.</p><p class="small muted">Nhờ Admin vào Setting user account → Tạo tài khoản, nhập đúng email này.</p>`,'<button class="btn" data-a="logout">Đăng xuất</button>');return;}
 const u=me();V.wh=u.wh||'PMY';const[y,m]=parts(TODAY);if(y!==V.ym[0]||m!==V.ym[1]){V.ym=[y,m];await reload();}
 render();
 if(!startApp._t)startApp._t=setInterval(()=>{if(!S)return;S.clock++;const ae=document.activeElement;
  if(V.busy||V.modal||(ae&&['INPUT','TEXTAREA','SELECT'].includes(ae.tagName)))return;reload().then(render).catch(()=>{});},60000);
}
async function boot(){
 const C=window.APP_CONFIG||{};
 if(!window.supabase){app.innerHTML=screen('Không tải được thư viện','<p>Không tải được supabase-js từ cdn.jsdelivr.net. Kiểm tra mạng rồi tải lại trang.</p>');return;}
 if(!C.SUPABASE_URL||/YOUR|xxxx/i.test(C.SUPABASE_URL)||!C.SUPABASE_ANON_KEY){app.innerHTML=screen('Chưa cấu hình','<p>Mở file <code>web/config.js</code>, điền <b>SUPABASE_URL</b> và <b>SUPABASE_ANON_KEY</b> theo README, rồi deploy lại.</p>');return;}
 const H=new URLSearchParams(location.hash.replace(/^#/,''));const recovery=H.get('type')==='recovery';const linkErr=H.get('error_description');
 const url=String(C.SUPABASE_URL).trim().replace(/\/(rest|auth)\/v1\/?$/,'').replace(/\/+$/,'');
 sb=window.supabase.createClient(url,String(C.SUPABASE_ANON_KEY).trim());
 const{data}=await sb.auth.getSession();
 if(location.hash)history.replaceState(null,'',location.pathname+location.search);
 if(linkErr)return showLogin(/expired|invalid/i.test(linkErr)?'Link đã hết hạn hoặc đã được dùng. Bấm "Quên mật khẩu?" để nhận link mới.':linkErr);
 if(!data.session)return showLogin();
 if(recovery)return showSetPassword();
 startApp();
}


/* ===================== events ===================== */
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]');
 if(V.menu&&!e.target.closest('.menu')&&!e.target.closest('.userbtn')){V.menu=false;if(!el){render();return;}}
 if(!el)return;const a=el.dataset.a;if(V.busy&&a!=='close')return;
 if(el.tagName==='SELECT')return;
 if(a!=='scrim'&&el.closest('.modal')&&a==='scrim')return;
 if(A[a]){e.stopPropagation();A[a](el.dataset,el,e);}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&V.modal){V.modal=null;render();}if((e.key==='Enter'||e.key===' ')&&e.target.classList.contains('tcard')){e.preventDefault();A.truck({c:e.target.dataset.c});}});
document.addEventListener('change',e=>{const el=e.target;const a=el.dataset.a;
 if(a==='wh'){V.wh=el.value;V.fleetEdit={};if(V.view==='day')V.view='calendar';render();return;}
 if(a==='dayFilter'){V.dayFilter[el.dataset.k]=el.value;render();return;}
 if(a==='blF'){V.blF[el.dataset.k]=el.value;if(el.dataset.k==='wh')V.blF.region='all';render();return;}
 if(a==='bkRegion'){A.bkRegion({},el);return;}
 const f=el.dataset.f;
 if(f==='bf'){const M=V.modal,F=M.f,k=el.dataset.k;F[k]=el.value;
  if(k==='customerId'){const c=cust(F.customerId);F.addrId=c&&c.addresses[0]?c.addresses[0].id:'new';F.province=c&&c.addresses[0]?c.addresses[0].province:'';const d=detectRegion(F);F.region=d.region;F.regionMode=d.mode;}
  if(k==='addrId'){if(F.addrId==='new'){F.province='';F.ward='';F.addrText='';F.region='';F.regionMode='';}else{const d=detectRegion(F);F.region=d.region;F.regionMode=d.mode;}}
  if(k==='province'){const d=detectRegion(F);F.region=d.region;F.regionMode=d.mode;}
  if(k==='wh'){const d=detectRegion(F);F.region=d.region;F.regionMode=d.mode;}
  if(k==='region')F.regionMode='manual';
  if(['customerId','addrId','province','wh','region','date'].includes(k))return render();
  return;}
 if(f==='bfl'){const l=V.modal.f.lines[+el.dataset.i];l[el.dataset.k]=el.value;if(el.tagName==='SELECT')return;}
 if(f==='bfc'){V.modal.f[el.dataset.k]=el.checked;return;}
 if(f==='ea'){V.modal[el.dataset.k]=el.value;if(el.dataset.k==='mode'||el.dataset.k==='target')render();return;}
 if(f==='pl'){V.modal.bk=el.value;const t=truckByCode(V.modal.code);const b=bkById(el.value);V.modal.tons=String(r2(Math.min(bkTotal(b)-allocSum(b.id),t.cap-loadOf(t.code))));render();return;}
 if(f==='resDate'){V.asg.newDate=el.value;return;}
 if(f==='cfgb'){mutate('update_settings',{p:{[el.dataset.k]:el.checked}},{ok:()=>toast('Đã lưu cấu hình')});return;}
 if(f==='cfg'){const v=num(el.value);if(v>0)mutate('update_settings',{p:{[el.dataset.k]:v}},{ok:()=>toast('Đã lưu cấu hình')});else toast('Giá trị phải lớn hơn 0.');return;}
 if(f==='newReg'){V.newReg={...(V.newReg||{}),[el.dataset.k]:el.value};return;}
 if(f==='newRegNb'){const N=V.newReg||{};const s=new Set(N.nb||[]);el.checked?s.add(el.value):s.delete(el.value);V.newReg={...N,nb:[...s]};return;}
 if(f==='un'){V.modal.f[el.dataset.k]=el.value;if(el.dataset.k==='role')render();return;}
 if(f==='cn'){V.modal.f[el.dataset.k]=el.value;if(['segment','province'].includes(el.dataset.k)){if(el.dataset.k==='segment')V.modal.f.salesId='';if(el.dataset.k==='province'){const c=S.regions.filter(r=>r.active&&r.newProvince===el.value);V.modal.f.region=c.length===1?c[0].id:'';}render();}return;}
 if(f==='hol'){V.hol=el.value;return;}
 if(f==='pm'){const r=el.dataset.r,p=el.dataset.p;const set=new Set(V.pm[r]||[]);el.checked?set.add(p):set.delete(p);V.pm[r]=[...set];render();return;}
 if(f==='bulk'){V.bulk={from:TODAY,to:addDays(TODAY,6),dk:9,cn:4,...(V.bulk||{}),[el.dataset.k]:el.value};return;}
});
document.addEventListener('input',e=>{const el=e.target;const f=el.dataset.f;if(!f)return;
 if(f==='bf'&&['ref','ward','addrText','note'].includes(el.dataset.k)){V.modal.f[el.dataset.k]=el.value;return;}
 if(f==='bfl'&&el.tagName!=='SELECT'){V.modal.f.lines[+el.dataset.i][el.dataset.k]=el.value;const M=V.modal;const tot=bfTotal(M.f);const x=document.getElementById('bf-total');if(x)x.textContent='Tổng: '+t2(tot)+' tấn';const c=document.getElementById('bf-cap');if(c)c.innerHTML=bfCapHtml();const p=document.getElementById('bf-pref');if(p)p.innerHTML=`<span class="chip">${tot?(tot>S.cfg.split?'DK · đầu kéo':'CN · container'):'–'}</span>`;return;}
 if(f==='bfcr'){V.modal.cancelReason=el.value;return;}
 if(f==='asg'){V.asg.rows[el.dataset.c]=el.value;const b=bkById(V.bk);const live=document.getElementById('asg-live');if(live){const had=!!document.getElementById('asg-reason');const chk=asgCheck(b);if(had===!!chk.warns.length){live.innerHTML=asgLive(b,chk,true);}else{live.innerHTML=asgLive(b,chk,true);}}return;}
 if(f==='asgReason'){V.asg.reason=el.value;return;}
 if(f==='rej'){V.asg.rej=el.value;return;}
 if(f==='resReason'){V.asg.resReason=el.value;return;}
 if(f==='ea'&&el.tagName==='INPUT'&&el.type!=='radio'){V.modal[el.dataset.k]=el.value;return;}
 if(f==='plt'){V.modal.tons=el.value;return;}
 if(f==='blq'){V.blF.q=el.value;clearTimeout(A._q);A._q=setTimeout(()=>{const pos=el.selectionStart;render();const n=document.getElementById('bl-q');if(n){n.focus();n.setSelectionRange(pos,pos);}},250);return;}
 if(f==='fl'){const ds=el.dataset.d;V.fleetEdit[ds]={...(V.fleetEdit[ds]||{}),[el.dataset.k]:el.value};document.querySelectorAll('[data-a="fleetSave"],[data-a="fleetReset"]').forEach(b=>b.disabled=false);return;}
 if(f==='newReg'){V.newReg={...(V.newReg||{}),[el.dataset.k]:el.value};return;}
 if(f==='cat'){const[k,fld]=el.dataset.k.split('.');V.cat={...(V.cat||{}),[k]:{...((V.cat||{})[k]||{}),[fld]:el.value}};return;}
 if(f==='catE'){V.catEdit[el.dataset.k]=el.value;return;}
 if(f==='un'||f==='cn'){V.modal.f[el.dataset.k]=el.value;return;}
 if(f==='pf'){me()[el.dataset.k]=el.value;return;}
 if(f==='pw'){V[el.dataset.k]=el.value;return;}
 if(f==='bulk'){V.bulk={from:TODAY,to:addDays(TODAY,6),dk:9,cn:4,...(V.bulk||{}),[el.dataset.k]:el.value};return;}
});
const tip=document.createElement('div');tip.id='tip';tip.hidden=true;document.body.appendChild(tip);
document.addEventListener('pointerover',e=>{const el=e.target.closest('[data-tip]');if(!el){tip.hidden=true;return;}tip.textContent=el.getAttribute('data-tip');tip.hidden=false;});
document.addEventListener('pointermove',e=>{if(tip.hidden)return;const w=tip.offsetWidth,h=tip.offsetHeight;let x=e.clientX+14,y=e.clientY+14;if(x+w>innerWidth-8)x=e.clientX-w-14;if(y+h>innerHeight-8)y=e.clientY-h-14;tip.style.left=x+'px';tip.style.top=y+'px';});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('[data-tip]'))tip.hidden=true;});
boot();
