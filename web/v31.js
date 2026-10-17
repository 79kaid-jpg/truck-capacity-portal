/* v3.1 – danh sách khách (tìm + giới hạn dòng) và nhập khách hàng / địa chỉ giao từ file Excel / CSV (F6). */

/* ---------- Danh sách khách: tìm theo mã / tên, mỗi lần chỉ vẽ tối đa 100 dòng ---------- */
const CUST_MAX31=100;
function custList31(){const q=fold30(V.custQ||'').trim();let L=S.customers;
 if(q)L=L.filter(c=>fold30(c.code+' '+c.name+' '+(c.erp||'')).includes(q));return L.slice(0,CUST_MAX31);}
function custAcc31(id){if(!S._acc){S._acc={};S.users.forEach(u=>{if(u.customerId)S._acc[u.customerId]=(S._acc[u.customerId]||0)+1;});}return S._acc[id]||0;}
function custBar31(){const q=fold30(V.custQ||'').trim();const n=q?S.customers.filter(c=>fold30(c.code+' '+c.name+' '+(c.erp||'')).includes(q)).length:S.customers.length;
 return `<div class="row" style="gap:10px;margin:8px 0;flex-wrap:wrap"><input id="cust-q" class="inp" style="max-width:320px" placeholder="Tìm mã KH, tên, mã ERP" value="${esc(V.custQ||'')}" data-q31="1" aria-label="Tìm khách hàng">
 <span class="small muted">${n>CUST_MAX31?`Hiện ${CUST_MAX31} / ${n.toLocaleString('vi-VN')} khách – gõ để tìm`:`${n.toLocaleString('vi-VN')} khách`}</span></div>`;}
document.addEventListener('input',e=>{const el=e.target;if(!el.dataset||!el.dataset.q31)return;V.custQ=el.value;clearTimeout(A._q31);
 A._q31=setTimeout(()=>{const pos=el.selectionStart;render();const n=document.getElementById('cust-q');if(n){n.focus();n.setSelectionRange(pos,pos);}},250);});

/* ---------- Nhập từ file ---------- */
const PROV_ALIAS31={'ho chi minh':'TP. Hồ Chí Minh','hcm':'TP. Hồ Chí Minh','sai gon':'TP. Hồ Chí Minh','binh duong':'TP. Hồ Chí Minh','ba ria':'TP. Hồ Chí Minh','vung tau':'TP. Hồ Chí Minh',
 'binh phuoc':'Đồng Nai','long an':'Tây Ninh','binh thuan':'Lâm Đồng','dak nong':'Lâm Đồng','dac nong':'Lâm Đồng','binh dinh':'Gia Lai','phu yen':'Đắk Lắk','dac lac':'Đắk Lắk',
 'quang nam':'Đà Nẵng','ninh thuan':'Khánh Hòa','hau giang':'Cần Thơ','soc trang':'Cần Thơ','quang binh':'Quảng Trị','hai duong':'Hải Phòng','thai binh':'Hưng Yên','bac giang':'Bắc Ninh',
 'ha noi':'Hà Nội','hanoi':'Hà Nội'};
function prov31(t){let f=fold30(t).replace(/[.,]/g,' ').replace(/\s+/g,' ').trim();if(!f)return '';
 f=f.replace(/^(tinh|thanh pho|tp)\s+/,'');
 for(const p of PROVINCES){const k=fold30(p).replace(/^tp\.?\s*/,'');if(f===k||f.endsWith(' '+k))return p;}
 for(const[k,p]of Object.entries(PROV_ALIAS31))if(f===k||f.endsWith(' '+k)||f.includes(k))return p;return '';}
// Địa chỉ nhiều dòng: dòng cuối là tỉnh thì tách ra; không thì thử phần sau dấu phẩy cuối
function addr31(lines){lines=lines.map(x=>String(x||'').trim()).filter(Boolean);if(!lines.length)return{label:'',province:''};
 const last=lines[lines.length-1];let p=prov31(last);if(p&&lines.length>1&&fold30(last).length<40)return{label:lines.slice(0,-1).join(', '),province:p};
 const parts=lines.join(', ').split(',');p=prov31(parts[parts.length-1])||(parts.length>1?prov31(parts[parts.length-2]):'');return{label:lines.join(', '),province:p};}
const seg31=t=>{const f=fold30(t).trim();return f==='dan dung'||f==='dd'?'DD':f==='du an'||f==='da'?'DA':f==='export'||f==='ex'||f==='xuat khau'?'EX':'';};
const yes31=t=>['true','1','x','co','yes','ngung'].includes(fold30(t).trim());
const COLS31={code:['ma kh'],name:['ten khach hang','ten cong ty','khach hang'],segment:['segment'],sales:['email sales','sales'],cs:['email cs phu trach','email cs','cs phu trach'],
 wh:['kho mac dinh'],addr:['dia chi giao','dia chi'],off:['ngung dung'],erp:['ma kh erp'],ext:['ma dia chi'],a1:['dia chi 1'],a2:['dia chi 2'],a3:['dia chi 3'],a4:['dia chi 4 / nguoi nhan','dia chi 4']};
function head31(row){const h=row.map(x=>fold30(x).trim());const ix={};for(const[k,names]of Object.entries(COLS31)){const i=h.findIndex(x=>names.includes(x));if(i>=0)ix[k]=i;}return ix;}
function parseBook31(sheets){const custs=[],addrs=[];let nC=0,nA=0;
 for(const rows of sheets){if(!rows.length)continue;const hi=rows.findIndex(r=>{const ix=head31(r);return ix.code!=null&&(ix.name!=null||ix.ext!=null);});if(hi<0)continue;
  const ix=head31(rows[hi]);const v=(r,k)=>ix[k]!=null?String(r[ix[k]]??'').trim():'';
  if(ix.ext!=null){nA++;rows.slice(hi+1).forEach((r,i)=>{if(!v(r,'code')&&!v(r,'ext'))return;const a=ix.a1!=null?addr31([v(r,'a1'),v(r,'a2'),v(r,'a3'),v(r,'a4')]):addr31([v(r,'addr')]);
    addrs.push({row:hi+i+2,code:v(r,'code'),ext:v(r,'ext'),label:a.label,province:a.province,active:!yes31(v(r,'off'))});});}
  else{nC++;rows.slice(hi+1).forEach((r,i)=>{if(!v(r,'code')&&!v(r,'name'))return;
    custs.push({row:hi+i+2,code:v(r,'code'),name:v(r,'name'),segment:seg31(v(r,'segment')),sales_email:v(r,'sales').includes('@')?v(r,'sales'):'',cs_email:v(r,'cs').includes('@')?v(r,'cs'):'',
     default_wh:v(r,'wh'),erp:v(r,'erp'),active:!yes31(v(r,'off')),_addr:v(r,'addr')});});}}
 // Khách không có dòng nào ở bảng địa chỉ: lấy cột "Địa chỉ giao" làm địa chỉ mã KH
 const has=new Set(addrs.map(a=>a.code));
 custs.forEach(c=>{if(c._addr&&!has.has(c.code)){const a=addr31([c._addr]);addrs.push({row:c.row,code:c.code,ext:'KH',label:a.label,province:a.province,active:true});}delete c._addr;});
 return{custs,addrs,nC,nA};}
// CSV: dấu phẩy hoặc chấm phẩy (Excel tiếng Việt), có ngoặc kép
function csv31(t){t=t.replace(/^\ufeff/,'');const first=t.split(/\r?\n/)[0]||'';const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
 const rows=[];let row=[],cell='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];
  if(q){if(ch==='"'){if(t[i+1]==='"'){cell+='"';i++;}else q=false;}else cell+=ch;}
  else if(ch==='"')q=true;else if(ch===sep){row.push(cell);cell='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=ch;}
 if(cell!==''||row.length){row.push(cell);rows.push(row);}return rows;}
async function impRead31(file){const M=V.modal;M.err='';M.res=null;M.file=file.name;render();
 try{let sheets;
  if(/\.csv$/i.test(file.name)){sheets=[csv31(await file.text())];}
  else{if(typeof XLSX==='undefined'){M.err='Chưa tải được thư viện đọc Excel; thử lại sau vài giây.';return render();}
   const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});sheets=wb.SheetNames.map(n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{header:1,raw:false,defval:''}));}
  const P=parseBook31(sheets);if(!P.custs.length&&!P.addrs.length){M.err='Không thấy bảng có cột "Mã KH" và "Tên khách hàng" (hoặc "Mã địa chỉ"). Tải file mẫu để xem đúng cột.';return render();}
  M.data=P;await impRun31(false);}catch(e){M.err='Không đọc được file: '+e.message;render();}}
async function impRun31(apply){const M=V.modal;M.err='';setBusy(true);render();
 try{M.res=await rpc('import_customers',{p_custs:M.data.custs,p_addrs:M.data.addrs,p_apply:apply});if(apply){await reload();}}catch(e){M.err=e.message;}
 setBusy(false);render();if(apply&&M.res&&M.res.applied)toast(`Đã nhập: ${M.res.custNew} khách mới, ${M.res.custUpd} cập nhật; ${M.res.addrNew} địa chỉ mới`);}
function impList31(arr,cnt,cls){if(!cnt)return '';return `<div class="tbl-wrap" style="max-height:220px;overflow:auto;margin-top:6px"><table><thead><tr><th>Bảng</th><th class="r">Dòng</th><th>Nội dung</th></tr></thead><tbody>${arr.map(x=>`<tr><td>${x.sheet==='DC'?'Địa chỉ':'Khách'}</td><td class="r num">${x.row??''}</td><td class="${cls}">${esc(x.msg)}</td></tr>`).join('')}</tbody></table></div>${cnt>arr.length?`<p class="small muted">… và ${cnt-arr.length} dòng khác</p>`:''}`;}
M29.custImp=function(){const M=V.modal;const R=M.res;const D=M.data;
 return `<h3>NHẬP KHÁCH HÀNG TỪ FILE</h3>
 <p class="small muted">File Excel (.xlsx) hoặc CSV. Bảng khách: Mã KH · Tên khách hàng · Segment · Email Sales · Email CS phụ trách · Kho mặc định · Địa chỉ giao · Ngừng dùng · Mã KH ERP. Bảng địa chỉ (tùy chọn): Mã KH · Mã địa chỉ · Địa chỉ 1 – 4 · Ngừng dùng. Khách đã có (trùng Mã KH) được cập nhật; khách không có trong file giữ nguyên.</p>
 <div class="row" style="gap:10px;flex-wrap:wrap;margin:8px 0"><input type="file" class="inp" accept=".xlsx,.xls,.csv" data-imp31="1" aria-label="Chọn file"><button class="btn ghost sm" data-a="impTpl">Tải file mẫu</button></div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}
 ${D&&R?`<div class="panel" style="margin-top:8px"><b>${esc(M.file||'')}</b> · ${D.custs.length.toLocaleString('vi-VN')} dòng khách, ${D.addrs.length.toLocaleString('vi-VN')} dòng địa chỉ
  <div class="kpis" style="margin-top:8px"><div class="tile"><span class="lbl">Khách mới</span><span class="val num">${R.custNew}</span></div><div class="tile"><span class="lbl">Khách cập nhật</span><span class="val num">${R.custUpd}</span></div><div class="tile"><span class="lbl">Không đổi</span><span class="val num">${R.custSame}</span></div>
  <div class="tile"><span class="lbl">Địa chỉ mới / cập nhật</span><span class="val num">${R.addrNew} / ${R.addrUpd}</span></div><div class="tile"><span class="lbl">Lỗi (bỏ qua)</span><span class="val num">${R.errCount}</span></div><div class="tile"><span class="lbl">Cảnh báo</span><span class="val num">${R.warnCount}</span></div></div>
  ${R.addrSkip?`<p class="small muted">Bỏ qua ${R.addrSkip} địa chỉ đã ngừng dùng.</p>`:''}
  ${impList31(R.errors,R.errCount,'')}${impList31(R.warnings,R.warnCount,'muted')}
  ${R.applied?`<p style="margin-top:8px"><span class="st st-ok">Đã ghi vào hệ thống</span></p>`:''}</div>`:''}
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button>${D&&R&&!R.applied&&(R.custNew+R.custUpd+R.addrNew+R.addrUpd)>0?`<button class="btn" data-a="impGo">Ghi ${R.custNew+R.custUpd} khách, ${R.addrNew+R.addrUpd} địa chỉ</button>`:''}</div>`;};
A.impOpen=()=>{V.modal={type:'custImp',wide:true,err:'',data:null,res:null};render();};
A.impGo=()=>impRun31(true);
A.impTpl=()=>{if(typeof XLSX==='undefined')return toast('Chưa tải được thư viện Excel, thử lại sau vài giây.');const wb=XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mã KH','Tên khách hàng','Segment','Email Sales','Email CS phụ trách','Kho mặc định','Địa chỉ giao','Ngừng dùng','Mã KH ERP'],
  ['103518','Công ty mẫu','Dân dụng','sales@congty.vn','cs@congty.vn','JM2','Số 3 Đường 9A, KCN Biên Hòa 2, Đồng Nai','FALSE','C103518']]),'Khách hàng');
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Mã KH','Mã địa chỉ','Địa chỉ 1','Địa chỉ 2','Địa chỉ 3','Địa chỉ 4 / người nhận','Ngừng dùng'],
  ['103518','D0001','Số 3 Đường 9A','Khu Công Nghiệp Biên Hòa 2','Thành Phố Biên Hòa','Tỉnh Đồng Nai','FALSE']]),'Địa chỉ giao');
 XLSX.writeFile(wb,'mau-nhap-khach-hang.xlsx');};
document.addEventListener('change',e=>{const el=e.target;if(el.dataset&&el.dataset.imp31&&el.files&&el.files[0]&&V.modal&&V.modal.type==='custImp')impRead31(el.files[0]);});
