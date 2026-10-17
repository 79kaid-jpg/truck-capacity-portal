/* v3.5 – Bảng thống kê (như bản Google Sheets): tab Tổng quan · CS · Logistics · Sales · Ngoại lệ · Lịch đơn · Mục tiêu · Hệ thống.
   Một lần gọi dash_data theo kỳ; lọc kho / segment tính ở trình duyệt. Bấm cột / thanh / ô số / dòng → danh sách đơn đúng phần đó → bấm đơn mở chi tiết,
   "← Quay lại" về đúng tab, bộ lọc và danh sách. */
(()=>{const st=document.createElement('style');st.textContent=`
.dz-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 12px}
.dz-bar .field{margin:0}.dz-bar .inp{min-height:34px}
.dz-per{display:flex;gap:4px;flex-wrap:wrap}.dz-per button.on{background:var(--navy);color:var(--on-navy)}
.dz-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px}
.dz-tile{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;cursor:pointer;min-width:0}
.dz-tile:hover{outline:2px solid var(--blue)}.dz-tile.plain{cursor:default}.dz-tile.plain:hover{outline:none}
.dz-tile .l{font-size:12px;color:var(--muted);font-weight:600}.dz-tile .v{font-size:24px;font-weight:800;line-height:1.2;margin-top:2px}
.dz-tile .s{font-size:12px;color:var(--muted)}.dz-tile .mini{display:flex;height:5px;border-radius:3px;overflow:hidden;margin-top:6px;background:var(--sand-2)}
.dz-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:12px}
.dz-p{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px;min-width:0}
.dz-p h3{font-size:14px;margin:0;letter-spacing:.02em;text-transform:uppercase}.dz-p .cap{font-size:12px;color:var(--muted);margin:2px 0 8px}
.dz-svg{width:100%;height:auto;display:block}.dz-svg [data-a]{cursor:pointer}.dz-svg [data-a]:hover{opacity:.75}
.dz-hb{display:grid;grid-template-columns:minmax(90px,34%) 1fr auto;gap:6px 8px;align-items:center;font-size:13px}
.dz-hb .lb{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dz-hb .tr{display:flex;height:16px;border-radius:4px;overflow:hidden;background:var(--sand-2)}
.dz-hb .tr span{display:block;height:100%;cursor:pointer}.dz-hb .tr span:hover{opacity:.7}.dz-hb .vv{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
.dz-leg{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:12px;color:var(--muted);margin-bottom:6px}.dz-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}
.dz-tbl td.c{cursor:pointer}.dz-tbl td.c:hover{background:var(--blue-bg)}.dz-tbl tr.c{cursor:pointer}.dz-tbl tr.c:hover td{background:var(--blue-bg)}
.dz-up{color:var(--ok);font-weight:700}.dz-down{color:var(--bad);font-weight:700}
.dz-cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.dz-cal .h{font-size:11px;color:var(--muted);text-align:center;font-weight:700}
.dz-cal .d{border:1px solid var(--line);border-radius:8px;padding:6px;min-height:78px;font-size:12px;cursor:pointer;background:var(--surface)}
.dz-cal .d:hover{outline:2px solid var(--blue)}.dz-cal .d.x{visibility:hidden}.dz-cal .d b{font-size:14px}.dz-cal .d.off{background:var(--sand-2)}
.dz-sub{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px}.dz-sub button.on{background:var(--navy);color:var(--on-navy)}
@media print{.top,.side,.dz-bar,.tabs,.dz-noprint{display:none!important}.main{padding:0!important}.dz-p,.dz-tile{break-inside:avoid}}
`;document.head.appendChild(st);})();

const DZ_OK=['ok','loaded','transit','delivered','failed'],DZ_BOOK=[...DZ_OK,'hold','resched','draft'];
const GCOL={DD:'#2f6db5',DA:'#e08a1e',EX:'#7a4fb0'};
const SCOL={ok:'#2e8b57',hold:'#e0a31a',resched:'#7a8ca8',draft:'#b8c0cc',rej:'#d33a2c',late:'#8e1b12',canc:'#9aa3ae'};
const SNAME={ok:'Đã có xe',hold:'Chờ xếp xe',resched:'Đổi ngày',draft:'Lưu tạm',rej:'Bị từ chối',late:'Hủy cận ngày',canc:'Hủy trước mốc'};
const SEGS=['DD','DA','EX'],PIPE=['ok','hold','resched','draft'];
const dzT=n=>(Math.round(n*10)/10).toLocaleString('vi-VN',{maximumFractionDigits:1});
const dzTT=n=>dzT(n)+' MT';
const dzSum=l=>l.reduce((s,r)=>s+r.t,0);
const dzGrp=r=>DZ_OK.includes(r.s)?'ok':r.s==='cancelled'?(r.late?'late':'canc'):r.s==='rejected'?'rej':r.s;
const isBook=r=>DZ_BOOK.includes(r.s);
let PK={},pkN=0;const pick=f=>{const id='p'+(++pkN);PK[id]=f;return id;};
const pa=(pid,i,j)=>`data-a="dzPick" data-p="${pid}" data-i="${i}"${j!=null?` data-j="${j}"`:''}`;

function dzInit(){if(V.dz)return V.dz;const r=role();
 V.dz={tab:r==='cs'?'cs':r==='logistics'?'log':r==='sales'?'sales':'ov',per:'month',anchor:TODAY,from:'',to:'',wh:'',seg:'',D:null,key:'',busy:false,exc:'urg',excM:'t'};return V.dz;}
function dzRange(Z){const[y,m]=parts(Z.anchor);const d=Z.anchor;
 if(Z.tab==='cal'||Z.tab==='tgt')return[iso(y,m,1),iso(y,m,dim(y,m))];
 switch(Z.per){case'day':return[d,d];case'week':{const k=(dow(d)+6)%7;const a=addDays(d,-k);return[a,addDays(a,6)];}
  case'quarter':{const q=Math.floor((m-1)/3)*3+1;return[iso(y,q,1),iso(y,q+2,dim(y,q+2))];}
  case'year':return[iso(y,1,1),iso(y,12,31)];case'custom':return[Z.from||d,Z.to||d];default:return[iso(y,m,1),iso(y,m,dim(y,m))];}}
function dzShift(Z,k){const[y,m]=parts(Z.anchor);const mv=(dy,dm)=>{let ny=y,nm=m+dm;while(nm<1){nm+=12;ny--;}while(nm>12){nm-=12;ny++;}Z.anchor=iso(ny+dy,nm,1);};
 if(Z.tab==='cal'||Z.tab==='tgt')return mv(0,k);
 switch(Z.per){case'day':Z.anchor=addDays(Z.anchor,k);break;case'week':Z.anchor=addDays(Z.anchor,7*k);break;case'quarter':mv(0,3*k);break;case'year':mv(k,0);break;default:mv(0,k);}}
const ndays=(a,b)=>Math.round((Date.parse(b)-Date.parse(a))/864e5)+1;

function dzLoad(Z,from,to){const key=from+'|'+to;if(Z.key===key||Z.busy===key)return;Z.busy=key;
 rpc('dash_data',{p_from:from,p_to:to}).then(D=>{if(Z.busy!==key)return;Z.busy=false;Z.key=key;
  D.rows=(D.b||[]).map(a=>{const c=D.c[a[3]]||['','Khách khác','DD',null,'',''];return{id:a[0],d:a[1],w:a[2],cid:a[3],s:a[4],t:+a[5]||0,x:!!a[6],late:!!a[7],held:a[8],conf:a[9],rc:a[10],cr:a[11],cs:a[12],pd:a[13],
   code:c[0],name:c[1],g:c[2],sales:c[3],area:c[4]||'(chưa có Area)',aread:c[5]||''};});
  D.rows.forEach(r=>r.grp=dzGrp(r));Z.D=D;render();}).catch(e=>{Z.busy=false;toast(e.message);});}

/* ---------- lọc ---------- */
function dzScope(Z,from,to){const D=Z.D;const f=r=>(!Z.wh||r.w===Z.wh)&&(!Z.seg||r.g===Z.seg)&&(!Z.sp||r.sales===Z.sp);
 return{all:D.rows.filter(f),list:D.rows.filter(r=>f(r)&&r.d>=from&&r.d<=to),prev:D.rows.filter(r=>f(r)&&r.d>=D.pfrom&&r.d<from)};}
function dzBuckets(from,to){const n=ndays(from,to);const B=[];
 if(n<=31){for(let d=from;d<=to;d=addDays(d,1))B.push({from:d,to:d,lb:dm(d),tip:WDS[dow(d)]+' '+dmy(d)});}
 else if(n<=124){let a=addDays(from,-((dow(from)+6)%7));while(a<=to){const b=addDays(a,6);B.push({from:a<from?from:a,to:b>to?to:b,lb:dm(a<from?from:a),tip:'Tuần '+dmy(a<from?from:a)+' – '+dmy(b>to?to:b)});a=addDays(a,7);}}
 else{let[y,m]=parts(from);for(;;){const a=iso(y,m,1),b=iso(y,m,dim(y,m));if(a>to)break;B.push({from:a<from?from:a,to:b>to?to:b,lb:'T'+m,tip:'Tháng '+m+'/'+y});m++;if(m>12){m=1;y++;}}}
 return B;}

/* ---------- thành phần vẽ ---------- */
function dzTile(label,list,opt={}){const t=dzSum(list);const pid=pick(()=>({title:label,list}));
 const segs=SEGS.map(g=>[g,dzSum(list.filter(r=>r.g===g))]).filter(x=>x[1]>0);
 let delta='';if(opt.prev){const p=dzSum(opt.prev);if(p>0){const ch=(t-p)/p;delta=` · <span class="${ch>=0?'dz-up':'dz-down'}">${ch>=0?'▲':'▼'} ${pct(Math.abs(ch))}</span> so kỳ trước`;}}
 return `<div class="dz-tile" ${pa(pid,0)} role="button" tabindex="0" title="Bấm để xem danh sách đơn"><div class="l">${label}</div><div class="v" style="${opt.color?'color:'+opt.color:''}">${dzTT(t)}</div>
 <div class="s">${list.length.toLocaleString('vi-VN')} đơn${delta}${opt.meta?' · '+opt.meta:''}</div>${t>0?`<div class="mini">${segs.map(([g,v])=>`<i style="width:${v/t*100}%;background:${GCOL[g]}" title="${SEG_LABEL[g]} ${dzTT(v)}"></i>`).join('')}</div>`:''}</div>`;}
const dzPlain=(label,big,meta)=>`<div class="dz-tile plain"><div class="l">${label}</div><div class="v">${big}</div><div class="s">${meta||''}</div></div>`;
const dzPanel=(t,cap,body,cls='')=>`<div class="dz-p ${cls}"><h3>${t}</h3>${cap?`<p class="cap">${cap}</p>`:''}${body}</div>`;
const dzLeg=items=>`<div class="dz-leg">${items.map(([n,c])=>`<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>`;
/* cột đứng xếp chồng: cats=[{lb,tip}], series=[{n,c,v:[]}], line={n,c,v:[]} (đường năng lực) */
function dzVbars(cats,series,pid,line){const W=680,H=220,L=44,R=8,T=10,Bm=26;const n=cats.length||1;const bw=(W-L-R)/n;
 const tot=cats.map((_,i)=>series.reduce((s,x)=>s+(x.v[i]||0),0));let mx=Math.max(1,...tot,...(line?line.v:[0]));const st=Math.pow(10,Math.floor(Math.log10(mx)));mx=Math.ceil(mx/st)*st;
 const y=v=>T+(H-T-Bm)*(1-v/mx);let s='';
 for(let k=0;k<=4;k++){const v=mx*k/4;s+=`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e7ec"/><text x="${L-6}" y="${y(v)+4}" font-size="10" text-anchor="end" fill="#6b7380">${dzT(v)}</text>`;}
 const every=Math.ceil(n/16);
 cats.forEach((c,i)=>{let acc=0;const x=L+i*bw+bw*.12,w=bw*.76;
  series.forEach((sr,j)=>{const v=sr.v[i]||0;if(v<=0)return;const y1=y(acc+v),y0=y(acc);acc+=v;
   s+=`<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(.5,y0-y1)}" fill="${sr.c}" ${pa(pid,i,j)}><title>${c.tip} · ${sr.n}: ${dzTT(v)}</title></rect>`;});
  if(acc>0)s+=`<rect x="${L+i*bw}" y="${T}" width="${bw}" height="${y(acc)-T}" fill="transparent" ${pa(pid,i)}><title>${c.tip} · tổng ${dzTT(acc)}</title></rect>`;
  if(i%every===0)s+=`<text x="${L+i*bw+bw/2}" y="${H-8}" font-size="10" text-anchor="middle" fill="#6b7380">${c.lb}</text>`;});
 if(line){const pts=line.v.map((v,i)=>`${L+i*bw+bw/2},${y(v)}`).join(' ');s+=`<polyline points="${pts}" fill="none" stroke="${line.c}" stroke-width="2" stroke-dasharray="5 3"/>`;}
 return `<svg class="dz-svg" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;}
/* thanh ngang: rows=[{lb,parts:[[name,val,color]]}] */
function dzHbars(rows,pid,opt={}){if(!rows.length)return '<div class="muted small">Không có dữ liệu.</div>';const mx=Math.max(1,...rows.map(r=>r.parts.reduce((s,p)=>s+p[1],0)));
 return `<div class="dz-hb">${rows.map((r,i)=>{const t=r.parts.reduce((s,p)=>s+p[1],0);
  return `<div class="lb" title="${esc(r.lb)}">${esc(r.lb)}</div><div class="tr" style="width:${Math.max(2,t/mx*100)}%">${r.parts.map((p,j)=>p[1]>0?`<span style="width:${p[1]/t*100}%;background:${p[2]}" ${pa(pid,i,j)} title="${esc(r.lb)} · ${p[0]}: ${dzTT(p[1])}"></span>`:'').join('')}</div><div class="vv" ${pa(pid,i)} style="cursor:pointer">${opt.n?r.n+' đơn · ':''}${dzTT(t)}</div>`;}).join('')}</div>`;}
function dzGauge(p,label,col){const a=Math.PI*Math.min(1.2,Math.max(0,p))/1.2;const R=70,cx=90,cy=86;const x=cx-R*Math.cos(a),y=cy-R*Math.sin(a);
 return `<svg class="dz-svg" viewBox="0 0 180 104" style="max-width:260px"><path d="M20 86 A70 70 0 0 1 160 86" fill="none" stroke="#e3e7ec" stroke-width="14"/>${p>0?`<path d="M20 86 A70 70 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${col}" stroke-width="14"/>`:''}
 <line x1="${(cx-R*Math.cos(Math.PI/1.2)).toFixed(1)}" y1="${(cy-R*Math.sin(Math.PI/1.2)).toFixed(1)}" x2="${(cx-(R-18)*Math.cos(Math.PI/1.2)).toFixed(1)}" y2="${(cy-(R-18)*Math.sin(Math.PI/1.2)).toFixed(1)}" stroke="#1f2630" stroke-width="2"/>
 <text x="90" y="80" font-size="24" font-weight="800" text-anchor="middle">${pct(p)}</text><text x="90" y="100" font-size="11" text-anchor="middle" fill="#6b7380">${label}</text></svg>`;}
const byGrp=(list,keys)=>keys.map(k=>[SNAME[k],dzSum(list.filter(r=>r.grp===k)),SCOL[k]]);
const bySeg=list=>SEGS.map(g=>[SEG_LABEL[g],dzSum(list.filter(r=>r.g===g)),GCOL[g]]);
function groupRows(list,keyFn,lbFn,partsFn,top){const m=new Map();list.forEach(r=>{const k=keyFn(r);if(!m.has(k))m.set(k,[]);m.get(k).push(r);});
 let rows=[...m.entries()].map(([k,l])=>({k,lb:lbFn(k,l),l,n:l.length,parts:partsFn(l)}));rows.sort((a,b)=>dzSum(b.l)-dzSum(a.l));return top?rows.slice(0,top):rows;}
function hbPick(title,rows,keys,filt){return pick((i,j)=>{const r=rows[i];if(!r)return null;let l=r.l;if(j>=0&&keys)l=l.filter(x=>filt(x,keys[j]));return{title:title+' · '+r.lb+(j>=0&&keys?' · '+(SNAME[keys[j]]||SEG_LABEL[keys[j]]||keys[j]):''),list:l};});}
const medMin=l=>{const a=l.filter(r=>r.held&&r.conf&&r.conf>=r.held).map(r=>r.conf-r.held).sort((x,y)=>x-y);return a.length?{m:a[Math.floor((a.length-1)/2)],n:a.length}:null;};
const fmtMin=m=>m<60?m+' phút':(Math.round(m/6)/10).toLocaleString('vi-VN')+' giờ';
function dzRowsTbl(list,max=15){if(!list.length)return '<div class="muted small">Không có đơn.</div>';
 return `<div class="tbl-wrap"><table class="dz-tbl"><thead><tr><th>Mã</th><th>Ngày bốc</th><th>Khách</th><th>Trạng thái</th><th class="r">Tấn</th></tr></thead><tbody>${list.slice(0,max).map(r=>`<tr class="c" data-a="dzBk" data-id="${r.id}"><td>${r.id}</td><td class="num">${dmy(r.d)}</td><td>${esc(r.name)}</td><td>${esc(ST_LABEL[r.s]||r.s)}</td><td class="r num">${t2(r.t)}</td></tr>`).join('')}</tbody></table></div>${list.length>max?`<p class="small muted">… và ${list.length-max} đơn khác</p>`:''}`;}
function areaPanels(list){const L=list.filter(isBook);const ar=groupRows(L,r=>r.area,k=>k,bySeg);const ad=groupRows(L.filter(r=>r.aread),r=>r.aread,k=>k,bySeg,12);
 return `<div class="dz-grid" style="margin-top:12px">${dzPanel('Sản lượng theo Area','Tổng đã đặt trong kỳ, tách segment',dzLeg(SEGS.map(g=>[SEG_LABEL[g],GCOL[g]]))+dzHbars(ar,hbPick('Area',ar,SEGS,(x,g)=>x.g===g)))}
 ${dzPanel('Area chi tiết','Top 12',dzHbars(ad,hbPick('Area chi tiết',ad,SEGS,(x,g)=>x.g===g)))}</div>`;}
function trendPanel(list,from,to,title){const B=dzBuckets(from,to);const L=list.filter(isBook);
 const series=PIPE.map(k=>({n:SNAME[k],c:SCOL[k],v:B.map(b=>dzSum(L.filter(r=>r.grp===k&&r.d>=b.from&&r.d<=b.to)))}));
 const pid=pick((i,j)=>{const b=B[i];let l=L.filter(r=>r.d>=b.from&&r.d<=b.to);if(j>=0)l=l.filter(r=>r.grp===PIPE[j]);return{title:title+' · '+b.tip+(j>=0?' · '+SNAME[PIPE[j]]:''),list:l};});
 return dzPanel(title,'Gom theo '+(ndays(from,to)<=31?'ngày':ndays(from,to)<=124?'tuần':'tháng')+' · bấm cột để xem đơn',dzLeg(PIPE.map(k=>[SNAME[k],SCOL[k]]))+dzVbars(B,series,pid));}
function segTable(list,prev){const row=g=>{const l=list.filter(r=>!g||r.g===g),p=prev.filter(r=>!g||r.g===g);const bk=dzSum(l.filter(isBook)),pb=dzSum(p.filter(isBook)),ok=dzSum(l.filter(r=>r.grp==='ok'));
  const ch=pb>0?(bk-pb)/pb:null;const c=(f,v,tt)=>`<td class="r num c" data-a="dzPick" data-p="${pick(()=>({title:(g?SEG_LABEL[g]:'Tổng')+' · '+tt,list:l.filter(f)}))}" data-i="0">${v}</td>`;
  return `<tr class="${g?'':'total'}"><td>${g?`<i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${GCOL[g]};margin-right:6px"></i><b>${SEG_LABEL[g]}</b>`:'<b>Tổng</b>'}</td>${c(isBook,dzTT(bk),'Tổng đã đặt')}
  <td class="r">${ch==null?'<span class="muted">–</span>':`<span class="${ch>=0?'dz-up':'dz-down'}">${ch>=0?'▲':'▼'} ${pct(Math.abs(ch))}</span>`}</td>${c(r=>r.grp==='ok',dzTT(ok),'Đã có xe')}<td class="r">${bk>0?pct(ok/bk):'–'}</td>
  ${c(r=>r.x&&isBook(r),dzTT(dzSum(l.filter(r=>r.x&&isBook(r)))),'Đơn khẩn')}${c(r=>r.grp==='rej',dzTT(dzSum(l.filter(r=>r.grp==='rej'))),'Nhu cầu bị mất')}${c(r=>r.grp==='late',dzTT(dzSum(l.filter(r=>r.grp==='late'))),'Hủy cận ngày')}
  <td class="r num">${new Set(l.filter(isBook).map(r=>r.cid)).size}</td></tr>`;};
 return `<div class="tbl-wrap"><table class="dz-tbl"><thead><tr><th>Segment</th><th class="r">Tổng đã đặt</th><th class="r">So kỳ trước</th><th class="r">Đã có xe</th><th class="r">% đã xếp</th><th class="r">🚨 Khẩn</th><th class="r">Nhu cầu bị mất</th><th class="r">Hủy cận ngày</th><th class="r">Số khách</th></tr></thead><tbody>${SEGS.map(row).join('')}${row('')}</tbody></table></div>`;}
function capRows(Z,from,to){return(Z.D.cap||[]).filter(c=>c[1]>=from&&c[1]<=to&&(!Z.wh||c[0]===Z.wh));}

/* ---------- các tab ---------- */
function tabOv(Z,S_,from,to){const{list,prev}=S_;const cp=capRows(Z,from,to).filter(c=>!c[5]&&c[6]);const capT=cp.reduce((s,c)=>s+c[2],0),used=cp.reduce((s,c)=>s+c[3]+c[4],0);
 const med=medMin(list);const whs=WH.filter(w=>!Z.wh||w.id===Z.wh);const wr=whs.map(w=>{const l=list.filter(r=>r.w===w.id&&isBook(r));return{lb:w.full,l,n:l.length,parts:bySeg(l)};});
 return `<div class="dz-tiles">${dzTile('Tổng đã đặt',list.filter(isBook),{prev:prev.filter(isBook)})}${dzTile('Đã có xe',list.filter(r=>r.grp==='ok'),{color:SCOL.ok})}${dzTile('Nhu cầu bị mất',list.filter(r=>r.grp==='rej'),{meta:'đơn bị từ chối'})}
 ${dzPlain('Lấp đầy năng lực giao',capT>0?pct(used/capT):'–',dzTT(used)+' / '+dzTT(capT))}${dzPlain('Thời gian xác nhận',med?fmtMin(med.m):'–',med?'trung vị · '+med.n+' lần':'')}</div>
 ${dzPanel('Theo segment','Trong kỳ đang chọn · bấm số để xem đơn',segTable(list,prev))}
 <div class="dz-grid" style="margin-top:12px">${trendPanel(list,from,to,'Tấn đã đặt theo thời gian')}${dzPanel('Theo kho','Tổng đã đặt trong kỳ, tách segment',dzLeg(SEGS.map(g=>[SEG_LABEL[g],GCOL[g]]))+dzHbars(wr,hbPick('Kho',wr,SEGS,(x,g)=>x.g===g)))}</div>${areaPanels(list)}`;}
function tabCs(Z,S_,from,to){const{list,all}=S_;const T=TODAY;
 const mtx=`<div class="tbl-wrap"><table class="dz-tbl"><thead><tr><th>Trạng thái</th>${SEGS.map(g=>`<th class="r">${SEG_LABEL[g]}</th>`).join('')}<th class="r">Tổng</th></tr></thead><tbody>${[...PIPE,'rej','late','canc'].map(k=>`<tr><td><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${SCOL[k]};margin-right:6px"></i>${SNAME[k]}</td>${[...SEGS,''].map(g=>{const l=list.filter(r=>r.grp===k&&(!g||r.g===g));return `<td class="r num c" data-a="dzPick" data-p="${pick(()=>({title:SNAME[k]+(g?' · '+SEG_LABEL[g]:''),list:l}))}" data-i="0">${l.length?dzT(dzSum(l))+' t · '+l.length:'–'}</td>`;}).join('')}</tr>`).join('')}</tbody></table></div>`;
 const top=groupRows(list.filter(isBook),r=>r.cid,(k,l)=>l[0].name,l=>byGrp(l,PIPE),10);
 const whr=WH.filter(w=>!Z.wh||w.id===Z.wh).map(w=>{const l=list.filter(r=>r.w===w.id&&isBook(r));return{lb:w.full,l,n:l.length,parts:byGrp(l,PIPE)};});
 const res=all.filter(r=>r.s==='resched').sort((a,b)=>a.d<b.d?-1:1),past=all.filter(r=>r.d<T&&['hold','resched','draft'].includes(r.s)).sort((a,b)=>a.d<b.d?-1:1),dr=all.filter(r=>r.s==='draft'&&r.d>=T&&r.d<=addDays(T,3)).sort((a,b)=>a.d<b.d?-1:1);
 return `<div class="dz-tiles">${dzTile('Tổng đã đặt',list.filter(isBook))}${['ok','hold','resched','draft'].map(k=>dzTile(SNAME[k],list.filter(r=>r.grp===k),{color:SCOL[k]})).join('')}${dzTile('🚨 Đơn khẩn',list.filter(r=>r.x&&isBook(r)))}${dzTile('Hủy cận ngày',list.filter(r=>r.grp==='late'),{color:SCOL.late})}</div>
 <div class="dz-grid">${trendPanel(list,from,to,'Tấn theo ngày bốc')}${dzPanel('Theo trạng thái và segment','Tấn · số đơn trong kỳ · bấm ô để xem đơn',mtx)}
 ${dzPanel('Top 10 khách hàng','Tổng đã đặt trong kỳ, tách trạng thái',dzLeg(PIPE.map(k=>[SNAME[k],SCOL[k]]))+dzHbars(top,hbPick('Khách',top,PIPE,(x,k)=>x.grp===k),{n:1}))}
 ${dzPanel('Theo kho','Tổng đã đặt trong kỳ, tách trạng thái',dzHbars(whr,hbPick('Kho',whr,PIPE,(x,k)=>x.grp===k)))}
 ${dzPanel('Cần đổi ngày – chờ khách trả lời',res.length+' đơn (mọi ngày)',dzRowsTbl(res))}${dzPanel('Ngày bốc đã qua nhưng chưa chốt',past.length+' đơn Chờ xếp xe / Đổi ngày / Lưu tạm',dzRowsTbl(past))}
 ${dzPanel('Lưu tạm sắp đến ngày (≤ 3 ngày)','Cần Gửi Logistics hoặc hủy · '+dr.length+' đơn',dzRowsTbl(dr))}</div>`;}
function tabLog(Z,S_,from,to){const{list,all}=S_;const cp=capRows(Z,from,to).filter(c=>!c[5]&&c[6]);const capT=cp.reduce((s,c)=>s+c[2],0),ld=cp.reduce((s,c)=>s+c[3],0),hd=cp.reduce((s,c)=>s+c[4],0);
 const hold=all.filter(r=>r.s==='hold').sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:(a.held||0)-(b.held||0));const med=medMin(list);
 const D14=[...Array(14)].map((_,i)=>addDays(TODAY,i));const c14=D14.map(d=>capRows(Z,d,d));
 const s14=[{n:'Đã có xe',c:SCOL.ok,v:c14.map(a=>a.reduce((s,c)=>s+c[3],0))},{n:'Chờ xếp xe',c:SCOL.hold,v:c14.map(a=>a.reduce((s,c)=>s+c[4],0))}];
 const p14=pick((i,j)=>({title:'Ngày '+dmy(D14[i])+(j>=0?' · '+(j?'Chờ xếp xe':'Đã có xe'):''),list:all.filter(r=>r.d===D14[i]&&(j<0?isBook(r):j?r.grp==='hold':r.grp==='ok'))}));
 const B=dzBuckets(from,to);const sB=[{n:'Đã có xe',c:SCOL.ok,v:B.map(b=>capRows(Z,b.from,b.to).reduce((s,c)=>s+c[3],0))},{n:'Chờ xếp xe',c:SCOL.hold,v:B.map(b=>capRows(Z,b.from,b.to).reduce((s,c)=>s+c[4],0))}];
 const pB=pick((i,j)=>({title:'Năng lực · '+B[i].tip+(j>=0?' · '+(j?'Chờ xếp xe':'Đã có xe'):''),list:list.filter(r=>r.d>=B[i].from&&r.d<=B[i].to&&(j<0?isBook(r):j?r.grp==='hold':r.grp==='ok'))}));
 const HB=[[0,30,'< 30 phút'],[30,60,'30–60 phút'],[60,120,'1–2 giờ'],[120,240,'2–4 giờ'],[240,480,'4–8 giờ'],[480,1440,'8–24 giờ'],[1440,1e9,'> 24 giờ']];
 const cf=list.filter(r=>r.held&&r.conf&&r.conf>=r.held);const hist=HB.map(([a,b,n])=>({lb:n,l:cf.filter(r=>r.conf-r.held>=a&&r.conf-r.held<b)}));hist.forEach(h=>{h.n=h.l.length;h.parts=[['Số đơn',h.l.length,'#2f6db5']];});
 const histHtml=`<div class="dz-hb">${hist.map((h,i)=>`<div class="lb">${h.lb}</div><div class="tr" style="width:${Math.max(2,h.n/Math.max(1,...hist.map(x=>x.n))*100)}%"><span style="width:100%;background:#2f6db5" ${pa(pick(()=>({title:'Thời gian xác nhận '+h.lb,list:h.l})),0)}></span></div><div class="vv">${h.n} đơn</div>`).join('')}</div>`;
 return `<div class="dz-tiles">${dzPlain('Năng lực giao trong kỳ',dzTT(capT),cp.length+' ngày × kho đã khai báo xe')}${dzPlain('Đã có xe',dzTT(ld),capT>0?pct(ld/capT)+' năng lực':'')}${dzPlain('Còn đặt được',dzTT(Math.max(0,capT-ld-hd)),'sau khi trừ đơn chờ xếp xe')}
 ${dzTile('Đang chờ xếp xe',hold,{color:SCOL.hold,meta:'mọi ngày'})}${dzTile('🚨 Khẩn chờ xếp xe',hold.filter(r=>r.x))}${dzTile('Hủy cận ngày',list.filter(r=>r.grp==='late'),{color:SCOL.late})}${dzPlain('Thời gian xác nhận (trung vị)',med?fmtMin(med.m):'–',med?med.n+' lần':'')}</div>
 <div class="dz-grid">${dzPanel('Mức lấp đầy 14 ngày tới','Đường gạch = năng lực giao · bấm cột để xem đơn',dzLeg([['Đã có xe',SCOL.ok],['Chờ xếp xe',SCOL.hold],['Năng lực','#1f2630']])+dzVbars(D14.map(d=>({lb:dm(d),tip:WDS[dow(d)]+' '+dmy(d)})),s14,p14,{c:'#1f2630',v:c14.map(a=>a.filter(c=>!c[5]).reduce((s,c)=>s+c[2],0))}))}
 ${dzPanel('Năng lực giao và tấn đã dùng',`Theo ${ndays(from,to)<=31?'ngày':ndays(from,to)<=124?'tuần':'tháng'} trong kỳ`,dzLeg([['Đã có xe',SCOL.ok],['Chờ xếp xe',SCOL.hold],['Năng lực','#1f2630']])+dzVbars(B,sB,pB,{c:'#1f2630',v:B.map(b=>capRows(Z,b.from,b.to).filter(c=>!c[5]).reduce((s,c)=>s+c[2],0))}))}
 ${dzPanel('Thời gian từ giữ chỗ đến xác nhận',cf.length+' đơn đã xác nhận trong kỳ',histHtml)}${dzPanel('Đơn đang chờ xếp xe',hold.length+' đơn · cũ nhất trước',dzRowsTbl(hold,20))}</div>`;}
function tabSales(Z,S_,from,to){const{list}=S_;const B=list.filter(isBook);
 const top=groupRows(B,r=>r.cid,(k,l)=>l[0].name,l=>byGrp(l,PIPE),15);const sr=groupRows(B,r=>r.sales||'-',k=>k==='-'?'(chưa gán Sales)':(Z.D.u[k]||'–'),bySeg);
 const lost=groupRows(list.filter(r=>r.grp==='rej'),r=>r.cid,(k,l)=>l[0].name,l=>[['Bị từ chối',dzSum(l),SCOL.rej]],10);
 return `<div class="dz-tiles">${dzTile('Tổng đã đặt',B,{prev:S_.prev.filter(isBook)})}${dzTile('Đã có xe',list.filter(r=>r.grp==='ok'),{color:SCOL.ok})}${dzTile('Đang chờ / đổi ngày / lưu tạm',list.filter(r=>['hold','resched','draft'].includes(r.grp)))}
 ${dzTile('Nhu cầu bị mất (bị từ chối)',list.filter(r=>r.grp==='rej'),{color:SCOL.rej})}${dzTile('Hủy cận ngày',list.filter(r=>r.grp==='late'),{color:SCOL.late})}${dzPlain('Khách có đặt hàng',new Set(B.map(r=>r.cid)).size,'trong kỳ')}</div>
 <div class="dz-grid">${dzPanel('Top khách hàng','Tổng đã đặt trong kỳ, tách trạng thái',dzLeg(PIPE.map(k=>[SNAME[k],SCOL[k]]))+dzHbars(top,hbPick('Khách',top,PIPE,(x,k)=>x.grp===k),{n:1}))}
 ${dzPanel('Theo segment','Bấm số để xem đơn',segTable(list,S_.prev))}${dzPanel('Theo Sales phụ trách','Tổng đã đặt trong kỳ, tách segment',dzLeg(SEGS.map(g=>[SEG_LABEL[g],GCOL[g]]))+dzHbars(sr,hbPick('Sales',sr,SEGS,(x,g)=>x.g===g)))}
 ${dzPanel('Nhu cầu bị mất','Khách bị từ chối nhiều nhất trong kỳ',dzHbars(lost,hbPick('Bị từ chối',lost)))}</div>`;}
const EXC={urg:['🚨 Đơn khẩn',r=>r.x&&r.s!=='rejected'],late:['Hủy cận ngày giao',r=>r.grp==='late'],canc:['Hủy trước mốc chốt',r=>r.grp==='canc'],allc:['Tất cả đơn hủy',r=>r.grp==='late'||r.grp==='canc']};
function tabExc(Z,S_,from,to){const{list}=S_;const E=EXC[Z.exc];const sel=list.filter(E[1]);const val=l=>Z.excM==='n'?l.length:dzSum(l);const fv=v=>Z.excM==='n'?v+' đơn':dzTT(v);
 const ok=list.filter(r=>r.grp==='ok'),late=list.filter(r=>r.grp==='late');const bk=list.filter(r=>isBook(r)||r.grp==='late'||r.grp==='canc');
 const segT=`<div class="tbl-wrap"><table class="dz-tbl"><thead><tr><th>Segment</th><th class="r">Số đơn</th><th class="r">Tấn</th><th class="r">% trên đơn đã đặt</th></tr></thead><tbody>${[...SEGS,''].map(g=>{const l=sel.filter(r=>!g||r.g===g),b=bk.filter(r=>!g||r.g===g);
  return `<tr class="c ${g?'':'total'}" data-a="dzPick" data-p="${pick(()=>({title:E[0]+' · '+(g?SEG_LABEL[g]:'Tổng'),list:l}))}" data-i="0"><td>${g?SEG_LABEL[g]:'<b>Tổng</b>'}</td><td class="r num">${l.length}</td><td class="r num">${dzTT(dzSum(l))}</td><td class="r">${b.length?pct(l.length/b.length):'–'}</td></tr>`;}).join('')}</tbody></table></div>`;
 const B=dzBuckets(from,to);const ser=[{n:E[0],c:Z.exc==='urg'?'#d33a2c':SCOL.late,v:B.map(b=>val(sel.filter(r=>r.d>=b.from&&r.d<=b.to)))}];const pT=pick(i=>({title:E[0]+' · '+B[i].tip,list:sel.filter(r=>r.d>=B[i].from&&r.d<=B[i].to)}));
 const mk=(l,parts)=>l.map(x=>({...x,parts:[[E[0],val(x.l),SCOL.late]]}));
 const whr=mk(groupRows(sel,r=>r.w,k=>(WHALL.find(w=>w.id===k)||{full:k}).full,()=>[]));const slr=mk(groupRows(sel,r=>r.sales||'-',k=>k==='-'?'(chưa gán Sales)':(Z.D.u[k]||'–'),()=>[]));
 const cu=mk(groupRows(list.filter(EXC.urg[1]),r=>r.cid,(k,l)=>l[0].name,()=>[],10));const rs=mk(groupRows(list.filter(r=>r.s==='cancelled'),r=>r.rc||'-',k=>k==='-'?'(không ghi lý do)':(Z.D.r[k]||k),()=>[]));
 const hb=(rows,t)=>`<div class="dz-hb">${rows.map((r,i)=>`<div class="lb" title="${esc(r.lb)}">${esc(r.lb)}</div><div class="tr" style="width:${Math.max(2,val(r.l)/Math.max(1,...rows.map(x=>val(x.l)))*100)}%"><span style="width:100%;background:${SCOL.late}" ${pa(pick(()=>({title:t+' · '+r.lb,list:r.l})),0)}></span></div><div class="vv">${fv(val(r.l))}</div>`).join('')||'<div class="muted small">Không có dữ liệu.</div>'}</div>`;
 return `<div class="dz-sub dz-noprint">${Object.entries(EXC).map(([k,v])=>`<button class="btn ghost sm ${Z.exc===k?'on':''}" data-a="dzExc" data-k="${k}">${v[0]}</button>`).join('')}<span class="grow"></span><button class="btn ghost sm ${Z.excM==='t'?'on':''}" data-a="dzExcM" data-k="t">Tấn</button><button class="btn ghost sm ${Z.excM==='n'?'on':''}" data-a="dzExcM" data-k="n">Số đơn</button></div>
 <div class="dz-tiles">${dzTile('🚨 Đơn khẩn',list.filter(EXC.urg[1]))}${dzTile('Hủy cận ngày giao',late,{color:SCOL.late})}${dzTile('Hủy trước mốc chốt',list.filter(r=>r.grp==='canc'))}${dzPlain('Tỷ lệ hủy cận ngày',ok.length+late.length?pct(late.length/(ok.length+late.length)):'–','trên đơn đã xếp xe')}</div>
 <div class="dz-grid">${dzPanel(E[0]+' theo segment','Số đơn · tấn · % trên tổng đơn đã đặt',segT)}${dzPanel(E[0]+' theo thời gian','Bấm cột để xem đơn',dzVbars(B,ser,pT))}
 ${dzPanel('Theo kho','',hb(whr,E[0]))}${dzPanel('Theo Sales quản lý','',hb(slr,E[0]))}${dzPanel('Khách đặt khẩn nhiều nhất','Top 10 trong kỳ',hb(cu,'Đơn khẩn'))}${dzPanel('Lý do hủy','Theo lý do CS chọn khi hủy',hb(rs,'Lý do hủy'))}</div>`;}
function tabCal(Z,S_,from,to){const{list}=S_;const[y,m]=parts(from);const first=(dow(from)+6)%7;const cells=[];for(let i=0;i<first;i++)cells.push('<div class="d x"></div>');
 for(let d=from;d<=to;d=addDays(d,1)){const l=list.filter(r=>r.d===d&&isBook(r));const t=dzSum(l),ok=dzSum(l.filter(r=>r.grp==='ok'));const c=capRows(Z,d,d);const cap=c.filter(x=>!x[5]&&x[6]).reduce((s,x)=>s+x[2],0);const free=Math.max(0,cap-c.reduce((s,x)=>s+x[3]+x[4],0));const off=c.length&&c.every(x=>x[5]);
  const col=cap>0?(t/cap>=1?'var(--bad)':t/cap>=(S.cfg.near/100)?'#e0861a':'var(--ok)'):'var(--muted)';
  cells.push(`<div class="d ${off?'off':''}" ${pa(pick(()=>({title:'Ngày bốc '+WDS[dow(d)]+' '+dmy(d),list:list.filter(r=>r.d===d)})),0)} style="border-left:4px solid ${col}"><div class="row"><b>${+d.slice(8)}</b><span class="grow"></span><span class="muted">${WDS[dow(d)]}</span></div>
  <div>Đặt: <b>${dzT(t)}</b> t · ${l.length} đơn</div><div class="muted">Có xe ${dzT(ok)} MT</div>${cap?`<div class="muted">Còn nhận ${dzT(free)} MT</div>`:off?'<div class="muted">Nghỉ</div>':'<div class="muted">Chưa khai báo xe</div>'}</div>`);}
 return `<div class="dz-tiles">${dzTile('Tổng đã đặt',list.filter(isBook))}${dzTile('Đã có xe',list.filter(r=>r.grp==='ok'),{color:SCOL.ok})}${dzTile('Đang chờ / đổi ngày / lưu tạm',list.filter(r=>['hold','resched','draft'].includes(r.grp)),{color:SCOL.hold})}${dzTile('Nhu cầu bị mất (bị từ chối)',list.filter(r=>r.grp==='rej'))}${dzTile('Hủy cận ngày giao',list.filter(r=>r.grp==='late'))}</div>
 ${dzPanel('Lịch đơn theo ngày bốc · tháng '+m+'/'+y,'Viền màu theo mức đặt so với năng lực giao · bấm ngày để xem đơn',`<div class="dz-cal">${['T2','T3','T4','T5','T6','T7','CN'].map(x=>`<div class="h">${x}</div>`).join('')}${cells.join('')}</div>`)}`;}
const workDays=(a,b)=>{let n=0;for(let d=a;d<=b;d=addDays(d,1))if(dow(d)!==0)n++;return n;};
function tabTgt(Z,S_,from,to){const D=Z.D;const{list}=S_;const ym=from.slice(0,7);const segs=Z.seg?[Z.seg]:SEGS;
 const tgtOf=mm=>(D.tgt||[]).filter(t=>t[0]===mm&&segs.includes(t[1])).reduce((s,t)=>s+(+t[2]),0);
 const T=tgtOf(ym);const L=list.filter(isBook);const A=dzSum(L);const end=to<TODAY?to:TODAY<from?addDays(from,-1):TODAY;
 const wdAll=workDays(from,to),wdNow=end<from?0:workDays(from,end);const exp=wdAll?wdNow/wdAll:0;const p=T>0?A/T:0;
 const done=to<TODAY;const lb=T<=0?'Chưa nhập mục tiêu':done?(p>=1?'Đạt target':'Không đạt'):(p>=exp?'Đúng tiến độ':p>=exp*0.9?'Hơi chậm':'Chậm tiến độ');
 const col=T<=0?'#9aa3ae':lb==='Đạt target'||lb==='Đúng tiến độ'?SCOL.ok:lb==='Hơi chậm'?'#e0861a':'#d33a2c';
 const days=[];for(let d=from;d<=to;d=addDays(d,1))days.push(d);let acc=0,wd=0;const act=[],tg=[];days.forEach(d=>{acc+=dzSum(L.filter(r=>r.d===d));if(dow(d)!==0)wd++;act.push(acc);tg.push(wdAll?T*wd/wdAll:0);});
 const W=680,H=220,Lm=44,Rm=8,Tm=10,Bm=26;const mx=Math.max(1,T,acc)*1.05;const x=i=>Lm+(W-Lm-Rm)*(i+.5)/days.length,y=v=>Tm+(H-Tm-Bm)*(1-v/mx);
 let s='';for(let k=0;k<=4;k++){const v=mx*k/4;s+=`<line x1="${Lm}" x2="${W-Rm}" y1="${y(v)}" y2="${y(v)}" stroke="#e3e7ec"/><text x="${Lm-6}" y="${y(v)+4}" font-size="10" text-anchor="end" fill="#6b7380">${dzT(v)}</text>`;}
 if(T>0)s+=`<polyline points="${tg.map((v,i)=>x(i)+','+y(v)).join(' ')}" fill="none" stroke="#1f2630" stroke-width="2" stroke-dasharray="5 3"/>`;
 s+=`<polyline points="${act.map((v,i)=>v==null?'':x(i)+','+y(v)).filter(Boolean).join(' ')}" fill="none" stroke="${GCOL.DD}" stroke-width="2.5"/>`;
 const pD=pick(i=>({title:'Ngày bốc '+dmy(days[i]),list:list.filter(r=>r.d===days[i])}));
 days.forEach((d,i)=>{s+=`<rect x="${x(i)-(W-Lm-Rm)/days.length/2}" y="${Tm}" width="${(W-Lm-Rm)/days.length}" height="${H-Tm-Bm}" fill="transparent" ${pa(pD,i)}><title>${dmy(d)} · cộng dồn ${act[i]==null?'–':dzTT(act[i])}${T>0?' · mục tiêu '+dzTT(tg[i]):''}</title></rect>`;if(i%3===0)s+=`<text x="${x(i)}" y="${H-8}" font-size="10" text-anchor="middle" fill="#6b7380">${+d.slice(8)}</text>`;});
 const yr=D.yr||[];const yy=to.slice(0,4);const M=[...Array(12)].map((_,i)=>{const mm=yy+'-'+pad(i+1);const r=yr.filter(a=>a[0]===mm&&segs.includes(a[1]));return{mm,lb:'Tháng '+(i+1),t:tgtOf(mm),b:r.reduce((s,a)=>s+(+a[2]||0),0),o:r.reduce((s,a)=>s+(+a[3]||0),0)};});
 const Q=[0,1,2,3].map(q=>{const a=M.slice(q*3,q*3+3);return{lb:'Quý '+(q+1),t:a.reduce((s,x)=>s+x.t,0),b:a.reduce((s,x)=>s+x.b,0),o:a.reduce((s,x)=>s+x.o,0)};});
 const Y={lb:'Năm '+yy,t:M.reduce((s,x)=>s+x.t,0),b:M.reduce((s,x)=>s+x.b,0),o:M.reduce((s,x)=>s+x.o,0)};
 const tr=(r,cls,mm)=>`<tr class="${cls||''} ${mm?'c':''}" ${mm?`data-a="dzMonth" data-m="${mm}"`:''}><td>${r.lb}</td><td class="r num">${r.t?dzTT(r.t):'–'}</td><td class="r num">${dzTT(r.b)}</td><td class="r num">${dzTT(r.o)}</td><td class="r">${r.t?`<span class="${r.b>=r.t?'dz-up':''}">${pct(r.b/r.t)}</span>`:'–'}</td></tr>`;
 const roll=`<div class="tbl-wrap"><table class="dz-tbl"><thead><tr><th></th><th class="r">Mục tiêu</th><th class="r">Đã đặt</th><th class="r">Đã có xe</th><th class="r">% đạt</th></tr></thead><tbody>${M.map(r=>tr(r,r.mm===ym?'total':'',r.mm)).join('')}${Q.map(r=>tr(r,'total')).join('')}${tr(Y,'total')}</tbody></table></div>`;
 return `<div class="dz-tiles">${dzPlain('Mục tiêu tháng '+ym.slice(5)+'/'+ym.slice(0,4),T?dzTT(T):'–',segs.map(g=>SEG_LABEL[g]).join(' + ')+(D.canTgt?` · <button class="linkbtn small dz-noprint" data-a="dzTgtEdit">Nhập mục tiêu</button>`:''))}${dzTile('Đã đặt trong tháng',L)}${dzPlain('Tiến độ cần đạt',pct(exp),wdNow+' / '+wdAll+' ngày làm việc (trừ Chủ nhật)')}${dzPlain('Còn thiếu',T>A?dzTT(T-A):'0 MT',T>0?'để đạt mục tiêu':'')}</div>
 <div class="dz-grid">${dzPanel('Performance tháng '+ym.slice(5)+'/'+ym.slice(0,4),lb,`<div style="text-align:center">${dzGauge(p,lb,col)}</div>`)}
 ${dzPanel('Tiến độ cộng dồn','Đường liền = đã đặt cộng dồn theo ngày bốc (cả đơn của các ngày tới) · đường gạch = mục tiêu theo ngày làm việc · bấm ngày để xem đơn',dzLeg([['Đã đặt',GCOL.DD],['Mục tiêu','#1f2630']])+`<svg class="dz-svg" viewBox="0 0 ${W} ${H}">${s}</svg>`)}
 ${dzPanel('Roll-up năm '+yy,'12 tháng + quý + năm · bấm tháng để xem',roll)}</div>${areaPanels(list)}`;}

/* ---------- khung chính ---------- */
const DZ_TABS=[['ov','Tổng quan',()=>canAny('dash.')],['cs','CS',()=>can('dash.service')],['log','Logistics',()=>can('dash.ops')],['sales','Sales',()=>can('dash.sales')],
 ['exc','Ngoại lệ',()=>canAny('dash.')],['cal','Lịch đơn',()=>canAny('dash.')],['tgt','Mục tiêu',()=>canAny('dash.')],['sys','Hệ thống',()=>can('dash.system')]];
vDash=function(){const Z=dzInit();const tabs=DZ_TABS.filter(t=>t[2]());if(!tabs.some(t=>t[0]===Z.tab))Z.tab=tabs[0]?tabs[0][0]:'ov';
 PK={};pkN=0;
 if(Z.reopen&&!V.modal){V.modal=Z.reopen;Z.reopen=null;if(Z.scroll!=null){const sy=Z.scroll;Z.scroll=null;setTimeout(()=>window.scrollTo(0,sy),0);}}
 const head=`<div class="pagehead"><h2>BẢNG THỐNG KÊ ĐẶT XE</h2><span class="grow"></span>${Z.tab!=='sys'?`<span class="row dz-noprint" style="gap:6px"><button class="btn ghost sm" data-a="dzXlsx">⬇ Excel</button><button class="btn ghost sm" data-a="dzPrint">In / PDF</button><button class="btn ghost sm" data-a="dzRefresh">↻ Làm mới</button></span>`:''}</div>
 <div class="tabs">${tabs.map(([k,l])=>`<button class="${Z.tab===k?'on':''}" data-a="dzTab" data-t="${k}">${l}</button>`).join('')}</div>`;
 if(Z.tab==='sys')return `<div class="panel">${head}${dashSystem()}</div>`;
 const[from,to]=dzRange(Z);const mOnly=Z.tab==='cal'||Z.tab==='tgt';
 const bar=`<div class="dz-bar dz-noprint">${mOnly?'':`<div class="dz-per">${[['day','Ngày'],['week','Tuần'],['month','Tháng'],['quarter','Quý'],['year','Năm'],['custom','Tùy chọn']].map(([k,l])=>`<button class="btn ghost sm ${Z.per===k?'on':''}" data-a="dzPer" data-k="${k}">${l}</button>`).join('')}</div>`}
  ${Z.per==='custom'&&!mOnly?`<div class="field"><label for="dz-f">Từ</label><input id="dz-f" type="date" class="inp" value="${from}" data-dz="from"></div><div class="field"><label for="dz-t">Đến</label><input id="dz-t" type="date" class="inp" value="${to}" data-dz="to"></div>`:
   `<div class="row" style="gap:6px;align-items:center"><button class="btn ghost sm" data-a="dzNav" data-k="-1" aria-label="Kỳ trước">‹</button><b class="num">${from===to?WDS[dow(from)]+' '+dmy(from):dmy(from)+' – '+dmy(to)}</b><button class="btn ghost sm" data-a="dzNav" data-k="1" aria-label="Kỳ sau">›</button><button class="btn ghost sm" data-a="dzNav" data-k="0">Hôm nay</button></div>`}
  <div class="field"><label for="dz-w">Kho</label><select id="dz-w" class="inp" data-dz="wh"><option value="">Tất cả kho</option>${WH.map(w=>`<option value="${w.id}" ${Z.wh===w.id?'selected':''}>${esc(w.full)}</option>`).join('')}</select></div>
  <div class="field"><label for="dz-s">Segment</label><select id="dz-s" class="inp" data-dz="seg"><option value="">Toàn bộ</option>${SEGS.map(g=>`<option value="${g}" ${Z.seg===g?'selected':''}>${SEG_LABEL[g]}</option>`).join('')}</select></div>${dzSalesSel(Z)}</div>`;
 dzLoad(Z,from,to);
 if(!Z.D||Z.key!==from+'|'+to)return `<div class="panel">${head}${bar}<div class="empty">Đang tải số liệu…</div></div>`;
 const S_=dzScope(Z,from,to);const f={ov:tabOv,cs:tabCs,log:tabLog,sales:tabSales,exc:tabExc,cal:tabCal,tgt:tabTgt}[Z.tab];
 return `<div class="panel">${head}${bar}${f(Z,S_,from,to)}<p class="small muted" style="margin-top:10px">${Z.D.scope&&Z.D.scope!=='all'?'Phạm vi: '+(Z.D.scope==='own'?'khách bạn phụ trách':SEG_LABEL[Z.D.scope])+' · ':''}Cập nhật ${clockStr(S.clock)} · bấm biểu đồ để xem danh sách đơn.</p></div>`;};

/* ---------- danh sách đơn khi bấm ---------- */
function dzDrill(title,list){const L=list.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1);V.modal={type:'dzList',wide:true,title,ids:L.map(r=>r.id)};render();}
M29.dzList=function(){const M=V.modal;const Z=V.dz;const map=new Map(Z.D.rows.map(r=>[r.id,r]));const L=M.ids.map(id=>map.get(id)).filter(Boolean);
 return `<div class="mhead"><span class="meta">${L.length.toLocaleString('vi-VN')} đơn · ${dzTT(dzSum(L))}</span><button class="btn ghost sm" data-a="dzListX">⬇ Excel</button></div><h2 style="margin-bottom:8px">${esc(M.title)}</h2>
 ${L.length?`<div class="tbl-wrap" style="max-height:60vh;overflow:auto"><table class="dz-tbl"><thead><tr><th>Mã</th><th>Ngày bốc</th><th>Kho</th><th>Khách hàng</th><th>Segment</th><th>Trạng thái</th><th class="r">Tấn</th><th>Sales</th></tr></thead><tbody>
 ${L.map(r=>`<tr class="c" data-a="dzBk" data-id="${r.id}"><td><b>${r.id}</b>${r.x?' 🚨':''}</td><td class="num">${dmy(r.d)}</td><td>${r.w}</td><td>${esc(r.name)}<div class="small muted">${esc(r.code)}</div></td><td>${SEG_LABEL[r.g]||''}</td><td>${esc(r.s==='cancelled'&&r.late?'Hủy quá cận ngày':ST_LABEL[r.s]||r.s)}</td><td class="r num">${t2(r.t)}</td><td>${esc(Z.D.u[r.sales]||'–')}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Không có đơn nào.</div>'}
 <div class="mfoot"><button class="btn" data-a="close">Đóng</button></div>`;};
function dzXlsx(rows,name){if(typeof XLSX==='undefined')return toast('Chưa tải được thư viện Excel, thử lại sau vài giây.');const Z=V.dz;
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mã booking','Ngày bốc','Kho','Mã KH','Khách hàng','Segment','Area','Trạng thái','Tấn','Khẩn','Sales'],
  ...rows.map(r=>[r.id,dmy(r.d),r.w,r.code,r.name,SEG_LABEL[r.g]||'',r.area,r.s==='cancelled'&&r.late?'Hủy quá cận ngày':ST_LABEL[r.s]||r.s,r.t,r.x?'Có':'',Z.D.u[r.sales]||''])]),'Đơn hàng');
 XLSX.writeFile(wb,name+'.xlsx');}
Object.assign(A,{
 goDb5:()=>{dzInit();V.dz.tab='sales';go('dash');},
 dzTab:d=>{V.dz.tab=d.t;render();},dzPer:d=>{const Z=V.dz;Z.per=d.k;if(d.k==='custom'){const[a,b]=dzRange({...Z,per:'month'});Z.from=Z.from||a;Z.to=Z.to||b;}render();},
 dzNav:d=>{const Z=V.dz;if(+d.k===0)Z.anchor=TODAY;else dzShift(Z,+d.k);render();},dzRefresh:()=>{V.dz.key='';render();},dzPrint:()=>window.print(),
 dzExc:d=>{V.dz.exc=d.k;render();},dzExcM:d=>{V.dz.excM=d.k;render();},
 dzMonth:d=>{V.dz.anchor=d.m+'-01';render();},dzTgtEdit:()=>{V.cfgTab='tgt';V.tgtY=+V.dz.anchor.slice(0,4);go('config');},
 dzPick:d=>{const f=PK[d.p];if(!f)return;const r=f(+d.i,d.j==null||d.j===''?-1:+d.j);if(r)dzDrill(r.title,r.list);},
 dzBk:d=>{const Z=V.dz;Z.reopen=V.modal&&V.modal.type==='dzList'?V.modal:null;Z.scroll=window.scrollY;openBooking(d.id);},
 dzListX:()=>{const M=V.modal;const map=new Map(V.dz.D.rows.map(r=>[r.id,r]));dzXlsx(M.ids.map(id=>map.get(id)).filter(Boolean),'don-'+M.title.replace(/[^\p{L}\p{N}]+/gu,'-').slice(0,60));},
 dzXlsx:()=>{const Z=V.dz;if(!Z.D)return;const[from,to]=dzRange(Z);dzXlsx(dzScope(Z,from,to).list,'thong-ke-'+from+'-'+to);}
});
document.addEventListener('change',e=>{const el=e.target;const k=el.dataset&&el.dataset.dz;if(!k||!V.dz)return;V.dz[k]=el.value;if(k==='from'||k==='to')V.dz.per='custom';render();});

/* ---------- Cấu hình › Mục tiêu ---------- */
function tgtCfg35(){const y=V.tgtY||+TODAY.slice(0,4);const C=V.tgtC;
 if(!C||C.y!==y){if(!V.tgtLoading){V.tgtLoading=true;rpc('dash_data',{p_from:y+'-01-01',p_to:y+'-01-01'}).then(D=>{V.tgtLoading=false;const v={};(D.tgt||[]).forEach(t=>{if(t[0].startsWith(y+''))v[t[0]+'|'+t[1]]=String(+t[2]);});V.tgtC={y,v,dirty:false};render();}).catch(e=>{V.tgtLoading=false;toast(e.message);});}
  return '<div class="empty">Đang tải mục tiêu…</div>';}
 const ms=[...Array(12)].map((_,i)=>y+'-'+pad(i+1));const sum=m=>SEGS.reduce((s,g)=>s+(num(C.v[m+'|'+g]||'')||0),0);
 return `<div class="row" style="gap:8px;margin:8px 0"><button class="btn ghost sm" data-a="tgtY" data-k="-1">‹</button><b>Năm ${y}</b><button class="btn ghost sm" data-a="tgtY" data-k="1">›</button><span class="grow"></span><span class="small muted">Tấn đặt mục tiêu theo tháng × segment; Country = tổng 3 segment. Để trống = chưa có mục tiêu.</span></div>
 <div class="tbl-wrap"><table><thead><tr><th>Tháng</th>${SEGS.map(g=>`<th class="r">${SEG_LABEL[g]} (t)</th>`).join('')}<th class="r">Country (t)</th></tr></thead><tbody>${ms.map(m=>`<tr><td>Tháng ${+m.slice(5)}</td>${SEGS.map(g=>`<td class="r"><input class="inp num" style="width:110px;text-align:right" inputmode="decimal" value="${esc(C.v[m+'|'+g]||'')}" data-tg="${m}|${g}" aria-label="Mục tiêu ${SEG_LABEL[g]} tháng ${+m.slice(5)}"></td>`).join('')}<td class="r num" id="tg-${m}">${t2(sum(m))}</td></tr>`).join('')}
 <tr class="total"><td>Năm ${y}</td>${SEGS.map(g=>`<td class="r num">${t2(ms.reduce((s,m)=>s+(num(C.v[m+'|'+g]||'')||0),0))}</td>`).join('')}<td class="r num">${t2(ms.reduce((s,m)=>s+sum(m),0))}</td></tr></tbody></table></div>
 <div class="row" style="margin-top:10px"><button class="btn" data-a="tgtSave" ${C.dirty?'':'disabled'}>Lưu mục tiêu</button></div>`;}
document.addEventListener('input',e=>{const el=e.target;if(!el.dataset||!el.dataset.tg||!V.tgtC)return;V.tgtC.v[el.dataset.tg]=el.value;V.tgtC.dirty=true;const m=el.dataset.tg.split('|')[0];
 const c=document.getElementById('tg-'+m);if(c)c.textContent=t2(SEGS.reduce((s,g)=>s+(num(V.tgtC.v[m+'|'+g]||'')||0),0));const b=document.querySelector('[data-a="tgtSave"]');if(b)b.disabled=false;});
Object.assign(A,{tgtY:d=>{V.tgtY=(V.tgtY||+TODAY.slice(0,4))+(+d.k);render();},
 tgtSave:()=>{const C=V.tgtC;const p=Object.entries(C.v).map(([k,v])=>{const[m,g]=k.split('|');return{month:m,seg:g,tons:String(num(v)||0)};});
  if(p.some(x=>!(+x.tons>=0)))return toast('Mục tiêu phải là số không âm.');
  mutate('save_targets',{p},{ok:()=>{C.dirty=false;if(V.dz)V.dz.key='';toast('Đã lưu mục tiêu');render();}});}});

// v3.15: lọc theo Sales (RSM xem từng người trong nhóm)
function dzSalesSel(Z){const D=Z.D;if(!D||!D.rows)return '';const ids=[...new Set(D.rows.map(r=>r.sales).filter(Boolean))];if(ids.length<2)return '';
 const nm=id=>(D.u&&D.u[id])||'?';ids.sort((a,b)=>nm(a).localeCompare(nm(b),'vi'));
 return `<div class="field"><label for="dz-sp">Sales</label><select id="dz-sp" class="inp" data-dz="sp"><option value="">Tất cả${role()==='sales'?' trong nhóm':''}</option>${ids.map(id=>`<option value="${id}" ${Z.sp===id?'selected':''}>${esc(nm(id))}${id===V.me?' (tôi)':''}</option>`).join('')}</select></div>`;}
