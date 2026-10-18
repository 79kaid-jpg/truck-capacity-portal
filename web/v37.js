/* v3.7 – Phím tắt cấu hình được: mặc định → công ty (Admin) → từng người (Hồ sơ). Chặn phím của trình duyệt / hệ điều hành / bộ gõ,
   cảnh báo phím thường dùng ở app khác, báo trùng trong cùng màn hình. Bảng "?" luôn theo phím hiện hành. */
(()=>{const st=document.createElement('style');st.textContent=`
.kbd{display:inline-block;min-width:22px;padding:1px 6px;border:1px solid var(--line);border-bottom-width:2px;border-radius:5px;background:var(--surface);font:600 12px/1.5 ui-monospace,Menlo,Consolas,monospace;text-align:center}
.sc-tbl td{vertical-align:middle}.sc-in{width:150px;cursor:pointer;text-align:center;font:600 13px ui-monospace,Menlo,Consolas,monospace}
.sc-in.rec{outline:2px solid var(--blue);background:var(--blue-bg)}.sc-bad{color:var(--bad);font-size:12px}.sc-warn{color:#9a5b00;font-size:12px}
.sc-help{columns:2 320px;column-gap:28px}.sc-help section{break-inside:avoid;margin-bottom:14px}.sc-help h4{margin:0 0 6px;font-size:12px;letter-spacing:.06em;color:var(--muted)}
.sc-help .r{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dashed var(--line);font-size:13px}
#scSeq{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--navy);color:var(--on-navy);padding:6px 12px;border-radius:8px;font-weight:700;z-index:80}
`;document.head.appendChild(st);})();

const IS_MAC=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
const CTX_NAME={global:'Toàn ứng dụng',cal:'Lịch đặt xe',day:'Chi tiết ngày',bk:'Chi tiết booking',grid:'Lưới Đặt hàng',modal:'Hộp thoại',dash:'Bảng thống kê'};
// id, ngữ cảnh, tên, phím mặc định, thao tác
const SC=[
 ['help','global','Mở bảng phím tắt','?',()=>A.scHelp()],
 ['search','global','Tìm kiếm (ngoài ra luôn có Ctrl+K)','/',()=>gsOpen()],
 ['newOrder','global','Đặt hàng mới (ô ngày đang chọn nếu có)','N',()=>{if(!can('booking.create'))return;const c=document.activeElement&&document.activeElement.closest&&document.activeElement.closest('[data-tip]');A.newBk({d:c?c.dataset.tip:''});}],
 ['goCal','global','Đi tới Lịch đặt xe','G L',()=>go('calendar')],
 ['goList','global','Đi tới Danh sách booking','G B',()=>can('booking.list')&&go('bookings')],
 ['goAppr','global','Đi tới Booking chờ xếp xe (Approval)','G A',()=>can('approvals.view')&&go('approvals')],
 ['goFleet','global','Đi tới Khai báo xe','G X',()=>can('fleet.manage')&&go('fleet')],
 ['goDash','global','Đi tới Bảng thống kê','G S',()=>canAny('dash.')&&go('dash')],
 ['goNotif','global','Đi tới Thông báo','G T',()=>go('notifs')],
 ['goCfg','global','Đi tới Cấu hình','G C',()=>canAny('config.')&&go('config')],
 ['navBack','global','Quay lại màn hình trước','B B',()=>A.navBack()],
 ['navFwd','global','Đi tới màn hình vừa rời (Next)','B N',()=>A.navFwd()],
 ['chat','global','Mở trợ lý (chatbot)','G Q',()=>A.chatOpen&&A.chatOpen()],
 ['refresh','global','Làm mới dữ liệu','R',()=>A.refresh()],
 ['calPrev','cal','Tháng trước / 2 tuần trước','←',()=>V.calV==='w2'?A.w2nav({d:-1}):A.month({d:-1})],
 ['calNext','cal','Tháng sau / 2 tuần sau','→',()=>V.calV==='w2'?A.w2nav({d:1}):A.month({d:1})],
 ['calToday','cal','Về hôm nay','T',()=>{if(V.calV==='w2'){V.w2s=addDays(TODAY,-dow(TODAY));}afterNav(goMonth(TODAY));}],
 ['calMonth','cal','Xem tháng','M',()=>A.calV({v:'m'})],
 ['cal2w','cal','Xem 2 tuần','W',()=>A.calV({v:'w2'})],
 ['calWh','cal','Kho tiếp theo','K',()=>{const i=WH.findIndex(w=>w.id===V.wh);V.whAll=false;V.wh=WH[(i+1)%WH.length].id;render();}],
 ['calAllWh','cal','Tất cả kho','Shift+K',()=>{V.whAll=true;render();}],
 ['calF1','cal','Lọc: Tất cả','1',()=>A.calF({v:'all'})],
 ['calF2','cal','Lọc: Có đơn chờ xếp xe','2',()=>A.calF({v:'hold'})],
 ['calF3','cal','Lọc: Có đơn khẩn','3',()=>A.calF({v:'urg'})],
 ['calF4','cal','Lọc: Đơn của tôi','4',()=>A.calF({v:'mine'})],
 ['calReq','cal','Yêu cầu đặt hàng cho ô ngày đang chọn','Y',()=>A.cellReq()],
 ['calSide','cal','Thu / mở khung thống kê','S',()=>A.sideT()],
 ['dayPrev','day','Ngày trước','[',()=>A.dayNav({d:-1})],
 ['dayNext','day','Ngày sau',']',()=>A.dayNav({d:1})],
 ['dayJ','day','Booking chờ xếp xe tiếp theo','J',()=>pendJump(1)],
 ['dayK','day','Booking chờ xếp xe trước đó','K',()=>pendJump(-1)],
 ['dayBack','day','Quay lại lịch','Esc',()=>go('calendar')],
 ['bkEdit','bk','Sửa booking','E',()=>clickA('editBk')],
 ['bkSend','bk','Gửi Logistics','L',()=>clickA('v30Send')],
 ['bkDeliv','bk','Xác nhận giao hàng','D',()=>clickA('v9Deliv')],
 ['bkUrg','bk','Cờ khẩn','U',()=>clickA('v9Urgent')],
 ['bkSug','bk','Gợi ý xếp xe','X',()=>clickA('asgSuggest')],
 ['bkBack','bk','Quay lại','Esc',()=>A.back()],
 ['gDraft','grid','Lưu tạm (Nháp)','Ctrl+Enter',()=>clickA('g30Go','[data-m="draft"]')],
 ['gSend','grid','Đặt & gửi Logistics','Ctrl+Shift+Enter',()=>clickA('g30Go','[data-m="hold"]')],
 ['gAdd','grid','Chèn dòng mới','Alt+Enter',()=>{clickA('g30Add');setTimeout(()=>{const l=[...document.querySelectorAll('.g30 [data-g="code"]')].pop();if(l)l.focus();},30);}],
 ['gDel','grid','Xóa dòng đang đứng','Alt+Delete',()=>{const el=document.activeElement;const i=el&&el.dataset&&el.dataset.i;if(i!=null&&A.g30Del)A.g30Del({i});}],
 ['gZin','grid','Phóng to (A+)','Alt+=',()=>A.g30Zoom({d:10})],
 ['gZout','grid','Thu nhỏ (A−)','Alt+-',()=>A.g30Zoom({d:-10})],
 ['mSave','modal','Lưu / nút chính của hộp thoại','Ctrl+Enter',()=>{const b=[...document.querySelectorAll('.modal .mfoot .btn:not(.ghost):not([disabled]), .modal .row .btn:not(.ghost):not([disabled])')].pop();if(b)b.click();}],
 ...[1,2,3,4,5,6,7,8].map(n=>['dTab'+n,'dash','Tab thứ '+n,String(n),()=>{const t=document.querySelectorAll('[data-a="dzTab"]')[n-1];if(t)t.click();}]),
 ['dPrev','dash','Kỳ trước','←',()=>clickA('dzNav','[data-k="-1"]')],
 ['dNext','dash','Kỳ sau','→',()=>clickA('dzNav','[data-k="1"]')],
 ['dXlsx','dash','Xuất Excel','E',()=>clickA('dzXlsx')]
];
const SC_BY=Object.fromEntries(SC.map(x=>[x[0],x]));
function clickA(a,extra=''){const b=document.querySelector(`.modal [data-a="${a}"]${extra}, [data-a="${a}"]${extra}`);if(b&&!b.disabled)b.click();}
function pendJump(k){const l=[...document.querySelectorAll('.main [data-a="openBk"]')];if(!l.length)return;V.pj=((V.pj==null?-1:V.pj)+k+l.length)%l.length;l[V.pj].focus();l[V.pj].scrollIntoView({block:'center'});}

// Phím bị chặn (trình duyệt / hệ điều hành / bộ gõ tiếng Việt / dán từ Excel) và phím chỉ cảnh báo (app khác hay dùng)
const SC_BLOCK=new Set(['Ctrl+N','Ctrl+T','Ctrl+W','Ctrl+R','Ctrl+P','Ctrl+S','Ctrl+F','Ctrl+L','Ctrl+D','Ctrl+H','Ctrl+J','Ctrl+O','Ctrl+U','Ctrl+G','Ctrl+E','Ctrl+K','Ctrl+Tab','Ctrl+Shift+Tab',
 'Ctrl+C','Ctrl+V','Ctrl+X','Ctrl+Z','Ctrl+Y','Ctrl+A','Ctrl+=','Ctrl+-','Ctrl+0','Ctrl+Shift+N','Ctrl+Shift+T','Ctrl+Shift+W','Ctrl+Shift+A','Ctrl+Shift+I','Ctrl+Shift+J','Ctrl+Shift+C',
 'Ctrl+Shift+Delete','Ctrl+Shift+B','Ctrl+Shift+O','Ctrl+Shift+R','Ctrl+Shift+V','Ctrl+Shift+Z','F1','F3','F5','F6','F7','F11','F12','Ctrl+F5','Alt+F4','Alt+←','Alt+→','Alt+Home','Alt+F','Alt+E','Alt+D','Alt+Z',
 'Ctrl+Space','Shift+Delete','Ctrl+Backspace','Ctrl+Delete','Tab','Shift+Tab','Enter','Space','↑','↓',...[1,2,3,4,5,6,7,8,9].map(n=>'Ctrl+'+n)]);
const SC_WARN={'Ctrl+Shift+M':'Teams: tắt / bật mic','Ctrl+Shift+O':'Teams: tắt / bật camera','Ctrl+Shift+E':'Teams / Outlook','Ctrl+Shift+K':'Teams / Firefox',
 'Ctrl+Shift+S':'Zalo: chụp màn hình','Ctrl+Shift+F':'Outlook / Excel','Ctrl+Shift+L':'Excel: lọc','Alt+Shift':'Windows: đổi bàn phím','Ctrl+;':'Excel: chèn ngày','Ctrl+Shift+;':'Excel: chèn giờ'};
const KEYNAME={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Escape:'Esc',' ':'Space',Del:'Delete'};
function comboOf(e){const k=e.key;if(['Control','Shift','Alt','Meta','AltGraph','CapsLock'].includes(k))return null;
 let n=KEYNAME[k]||(k.length===1?k.toUpperCase():k);const parts=[];if(e.ctrlKey||e.metaKey)parts.push('Ctrl');if(e.altKey)parts.push('Alt');
 const sym=k.length===1&&!/[a-z]/i.test(k);if(e.shiftKey&&(!sym||e.ctrlKey||e.metaKey||e.altKey))parts.push('Shift');
 if(e.altKey&&e.code&&/^(Key|Digit)/.test(e.code)&&!e.ctrlKey)n=e.code.replace(/^(Key|Digit)/,'');
 if(e.altKey&&e.code==='Equal')n='=';if(e.altKey&&e.code==='Minus')n='-';
 parts.push(n);return parts.join('+');}
const kfmt=c=>!c?'<span class="muted small">(tắt)</span>':c.split(' ').map(s=>s.split('+').map(x=>`<span class="kbd">${esc(IS_MAC&&x==='Ctrl'?'⌘':IS_MAC&&x==='Alt'?'⌥':x)}</span>`).join('+')).join(' rồi ');
const scCompany=()=>(S&&S.cfg&&S.cfg.shortcuts)||{};
const scEnabled=()=>scCompany().enabled!==false;const scSingle=()=>scCompany().single!==false;
function scMap(user){const m={};SC.forEach(x=>m[x[0]]=x[3]);Object.assign(m,scCompany().map||{});if(user!==false)Object.assign(m,(S&&S.me&&S.me.shortcuts)||{});return m;}
const singleKey=c=>c&&!/^(Ctrl|Alt)\+/.test(c)&&c!=='Esc';
// trùng: cùng ngữ cảnh, hoặc "Toàn ứng dụng" với các màn hình (lịch / ngày / booking / thống kê)
const VIEWS=['cal','day','bk','dash'];const overlap=(a,b)=>a===b||(a==='global'&&VIEWS.includes(b))||(b==='global'&&VIEWS.includes(a));
function scCheck(id,c,map){if(!c)return{};const ctx=SC_BY[id][1];const first=c.split(' ')[0];
 if(SC_BLOCK.has(c)||SC_BLOCK.has(first)||/^Ctrl\+Alt\+/.test(c)||/^Ctrl\+Shift$/.test(c))return{bad:'Phím của trình duyệt / Windows / bộ gõ tiếng Việt – không dùng được'};
 if((ctx==='grid'||ctx==='modal')&&!/^(Ctrl|Alt)\+/.test(c)&&c!=='Esc')return{bad:'Đang gõ trong ô nên cần Ctrl hoặc Alt'};
 if(c.includes(' ')&&!/^[A-Z] [A-Z0-9]$/.test(c))return{bad:'Chuỗi 2 phím chỉ dùng dạng "chữ rồi chữ", ví dụ G L'};
 for(const[o,oc]of Object.entries(map)){if(o===id||!oc||!SC_BY[o])continue;const oc1=oc.split(' ')[0];
  if(overlap(ctx,SC_BY[o][1])&&(oc===c||(c.includes(' ')&&oc===first)||(oc.includes(' ')&&oc1===c)))return{bad:`Trùng với "${SC_BY[o][2]}" (${CTX_NAME[SC_BY[o][1]]})`};}
 const w=SC_WARN[c]||(/^Alt\+Shift/.test(c)?SC_WARN['Alt+Shift']:'');return w?{warn:'Hay dùng ở app khác: '+w}:{};}

/* ---------- bộ xử lý phím ---------- */
function scCtx(){if(V.modal)return V.modal.type==='grid'?['grid']:['modal'];const v={calendar:'cal',day:'day',booking:'bk',dash:'dash'}[V.view];return v?[v,'global']:['global'];}
let scSeq=null,scSeqT=0; // hẹn giờ cũ không được hủy chuỗi phím mới
const seqHint=t=>{let el=document.getElementById('scSeq');if(!t){if(el)el.remove();return;}if(!el){el=document.createElement('div');el.id='scSeq';document.body.appendChild(el);}el.textContent=t;};
document.addEventListener('keydown',e=>{if(!S||!scEnabled()||V.scRec||(typeof GS!=='undefined'&&GS.open))return;const t=e.target;
 const typing=t&&(['INPUT','TEXTAREA','SELECT'].includes(t.tagName)||t.isContentEditable);const c=comboOf(e);if(!c)return;
 // ô ngày đang chọn: mũi tên di chuyển giữa các ô, Enter mở
 if(!typing&&!V.modal&&V.view==='calendar'&&t&&t.dataset&&t.dataset.tip&&['←','→','↑','↓'].includes(c)){const cells=[...document.querySelectorAll('.cal [data-tip]')];const i=cells.indexOf(t);
  const d=t.dataset.tip;const step={'←':-1,'→':1,'↑':-7,'↓':7}[c];const want=addDays(d,step);const nx=cells.find(x=>x.dataset.tip===want)||cells[Math.max(0,Math.min(cells.length-1,i+Math.sign(step)))];if(nx){e.preventDefault();nx.focus();}return;}
 if(!typing&&!V.modal&&t&&t.dataset&&t.dataset.tip&&c==='Enter'&&t.dataset.a){e.preventDefault();t.click();return;}
 const map=scMap();const ctxs=scCtx();
 const ok=id=>{const x=SC_BY[id];if(!x||!ctxs.includes(x[1]))return false;const k=map[id];if(!k)return false;if(typing&&!/^(Ctrl|Alt)\+/.test(k))return false;if(singleKey(k)&&!scSingle()&&k!=='Esc')return false;return true;};
 if(scSeq){const want=scSeq+' '+c;scSeq=null;clearTimeout(scSeqT);seqHint('');const id=Object.keys(map).find(i=>ok(i)&&map[i]===want);if(id){e.preventDefault();SC_BY[id][4]();}return;}
 if(c==='Esc'&&(typing||V.modal))return; // Esc trong ô / hộp thoại: để mặc định (đóng hộp thoại)
 const id=Object.keys(map).find(i=>ok(i)&&map[i]===c);
 if(id){e.preventDefault();e.stopPropagation();SC_BY[id][4]();return;}
 if(!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&Object.keys(map).some(i=>ok(i)&&map[i]&&map[i].startsWith(c+' '))){e.preventDefault();scSeq=c;seqHint(c+' …');clearTimeout(scSeqT);scSeqT=setTimeout(()=>{scSeq=null;seqHint('');},1300);}
},true);

/* ---------- bảng "?" ---------- */
M29.scHelp=function(){const map=scMap();const g={};SC.forEach(x=>{(g[x[1]]=g[x[1]]||[]).push(x);});
 return `<div class="mhead"><span class="meta">${scEnabled()?'Phím tắt đang bật':'Phím tắt đang tắt (Admin)'}${!scSingle()?' · phím một chữ đang tắt':''}</span><button class="btn ghost sm" data-a="go" data-v="profile">Đổi phím tắt của tôi</button></div><h2 style="margin-bottom:10px">PHÍM TẮT</h2>
 <div class="sc-help">${Object.entries(g).map(([k,l])=>`<section><h4>${CTX_NAME[k].toUpperCase()}</h4>${l.map(x=>`<div class="r"><span>${x[2]}</span><span>${kfmt(map[x[0]])}</span></div>`).join('')}${k==='global'?`<div class="r"><span>Tìm kiếm (cố định)</span><span>${kfmt('Ctrl+K')}</span></div><div class="r"><span>Đóng hộp thoại (cố định)</span><span>${kfmt('Esc')}</span></div>`:''}${k==='cal'?`<div class="r"><span>Đi giữa các ô ngày / mở ô (cố định)</span><span>${kfmt('Tab')} ${kfmt('←')}${kfmt('↑')}${kfmt('→')}${kfmt('↓')} ${kfmt('Enter')}</span></div>`:''}</section>`).join('')}</div>
 <p class="small muted">Phím một chữ chỉ có tác dụng khi không đang gõ trong ô nhập liệu. ${IS_MAC?'Trên Mac, Ctrl = ⌘, Alt = ⌥.':''}</p><div class="mfoot"><button class="btn" data-a="close">Đóng</button></div>`;};

/* ---------- bảng chỉnh phím (dùng cho Hồ sơ và Cấu hình) ---------- */
function scEditor(kind){const E=V.scE&&V.scE.kind===kind?V.scE:(V.scE={kind,map:kind==='me'?{...((S.me&&S.me.shortcuts)||{})}:{...(scCompany().map||{})},enabled:scEnabled(),single:scSingle(),dirty:false});
 const base=kind==='me'?scMap(false):(()=>{const m={};SC.forEach(x=>m[x[0]]=x[3]);return m;})();const eff={...base,...E.map};const g={};SC.forEach(x=>{(g[x[1]]=g[x[1]]||[]).push(x);});
 const bad=SC.some(x=>scCheck(x[0],eff[x[0]],eff).bad);
 return `${kind==='co'?`<div class="row" style="gap:16px;margin:8px 0;flex-wrap:wrap"><label class="row"><input type="checkbox" data-sco="enabled" ${E.enabled?'checked':''}> Bật phím tắt cho toàn hệ thống</label><label class="row"><input type="checkbox" data-sco="single" ${E.single?'checked':''}> Cho phép phím một chữ cái (N, T, G L…)</label></div>`:''}
 <p class="small muted">Bấm vào ô phím rồi nhấn tổ hợp mới (chuỗi 2 phím: nhấn lần lượt, ví dụ G rồi L). Esc = hủy ghi, nút × = tắt phím đó. ${kind==='me'?'Ô để trống dùng phím mặc định của công ty.':'Đây là phím mặc định cho mọi người chưa tự đổi.'}</p>
 <div class="tbl-wrap"><table class="sc-tbl"><thead><tr><th>Màn hình</th><th>Thao tác</th><th>Phím ${kind==='me'?'của bạn':'mặc định công ty'}</th><th></th><th>Kiểm tra</th></tr></thead><tbody>
 ${Object.entries(g).map(([k,l])=>l.map((x,i)=>{const c=eff[x[0]];const chk=scCheck(x[0],c,eff);const own=E.map[x[0]]!==undefined;
  return `<tr>${i===0?`<td rowspan="${l.length}"><b>${CTX_NAME[k]}</b></td>`:''}<td>${x[2]}</td><td><input class="inp sc-in ${V.scRec===kind+'|'+x[0]?'rec':''}" readonly value="${esc(V.scRec===kind+'|'+x[0]?'Nhấn phím…':c||'(tắt)')}" data-sc="${kind}|${x[0]}" aria-label="Phím cho ${esc(x[2])}"></td>
  <td style="white-space:nowrap"><button class="btn ghost sm" data-a="scClr" data-k="${kind}|${x[0]}" title="Tắt phím này">×</button>${own?`<button class="btn ghost sm" data-a="scDef" data-k="${kind}|${x[0]}" title="Về mặc định">↺</button>`:''}</td>
  <td>${chk.bad?`<span class="sc-bad">⛔ ${esc(chk.bad)}</span>`:chk.warn?`<span class="sc-warn">⚠ ${esc(chk.warn)}</span>`:'<span class="muted small">OK</span>'}</td></tr>`;}).join('')).join('')}</tbody></table></div>
 <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-a="scSave" data-k="${kind}" ${E.dirty&&!bad?'':'disabled'}>Lưu phím tắt</button><button class="btn ghost" data-a="scAllDef" data-k="${kind}">${kind==='me'?'Dùng toàn bộ mặc định công ty':'Về mặc định gốc của hệ thống'}</button>${bad?'<span class="sc-bad">Sửa các dòng ⛔ trước khi lưu</span>':''}</div>
 ${kind==='co'?`<div class="panel" style="margin-top:14px"><b>Reset phím tắt người dùng về mặc định công ty</b><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap">
  <select class="inp" id="sc-user" style="max-width:320px"><option value="">— Chọn người dùng —</option>${S.users.filter(u=>u.active&&u.role!=='customer').map(u=>`<option value="${u.id}">${esc(u.name)} · ${esc(u.email)}</option>`).join('')}</select>
  <button class="btn ghost" data-a="scResetOne">Reset người này</button><span class="grow"></span><button class="btn ghost" data-a="scResetAll">Reset tất cả người dùng</button></div></div>`:''}`;}
function scRecord(e){if(!V.scRec)return;const[kind,id]=V.scRec.split('|');e.preventDefault();e.stopPropagation();
 if(e.key==='Escape'){V.scRec=null;V.scPend=null;return render();}const c=comboOf(e);if(!c)return;
 let val=c;if(V.scPend){val=V.scPend+' '+c;V.scPend=null;}else if(/^[A-Z]$/.test(c)&&SC_BY[id][1]!=='grid'&&SC_BY[id][1]!=='modal'){V.scPend=c;clearTimeout(scRecord.t);
  scRecord.t=setTimeout(()=>{if(V.scPend===c&&V.scRec===kind+'|'+id){V.scPend=null;V.scE.map[id]=c;V.scE.dirty=true;V.scRec=null;render();}},900);const el=document.querySelector(`[data-sc="${kind}|${id}"]`);if(el)el.value=c+' … (nhấn tiếp để thành chuỗi 2 phím)';return;}
 V.scE.map[id]=val;V.scE.dirty=true;V.scRec=null;render();}
document.addEventListener('keydown',scRecord,true);
document.addEventListener('click',e=>{const el=e.target.closest&&e.target.closest('[data-sc]');if(!el)return;V.scRec=el.dataset.sc;V.scPend=null;render();const n=document.querySelector(`[data-sc="${el.dataset.sc}"]`);if(n)n.focus();});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.sco;if(!k||!V.scE)return;V.scE[k]=e.target.checked;V.scE.dirty=true;render();});
Object.assign(A,{
 scHelp:()=>{V.modal={type:'scHelp',wide:true};render();},
 scClr:d=>{const[k,id]=d.k.split('|');V.scE.map[id]='';V.scE.dirty=true;render();},
 scDef:d=>{const[k,id]=d.k.split('|');delete V.scE.map[id];V.scE.dirty=true;render();},
 scAllDef:d=>{V.scE.map={};V.scE.dirty=true;render();},
 scSave:d=>{const E=V.scE;if(d.k==='me')mutate('save_my_shortcuts',{p:E.map},{ok:()=>{V.scE=null;toast('Đã lưu phím tắt của bạn');render();}});
  else mutate('admin_save_shortcuts',{p:{enabled:E.enabled,single:E.single,map:E.map}},{ok:()=>{V.scE=null;toast('Đã lưu phím tắt mặc định của công ty');render();}});},
 scResetOne:()=>{const u=document.getElementById('sc-user');if(!u||!u.value)return toast('Chọn người dùng cần reset.');const nm=user(u.value).name;
  mutate('admin_reset_shortcuts',{p_user:u.value},{ok:n=>{toast(n?`Đã đưa phím tắt của ${nm} về mặc định công ty`:`${nm} đang dùng mặc định công ty`);render();}});},
 scResetAll:()=>{if(!confirm('Đưa phím tắt của TẤT CẢ người dùng về mặc định công ty?'))return;mutate('admin_reset_shortcuts',{p_user:null},{ok:n=>{toast(`Đã reset ${n} người dùng về mặc định công ty`);render();}});}
});
/* Hồ sơ: thêm mục Phím tắt; Cấu hình: tab Phím tắt (Admin) */
{const vp=vProfile;vProfile=function(){const h=vp();const sec=`<div class="panel" style="margin-top:16px" id="sc-me"><h2 style="font-size:18px">PHÍM TẮT CỦA TÔI</h2>${scEditor('me')}</div>`;return h+sec;};}
function scCfg37(){return scEditor('co');}
// gợi ý phím trên nút
const SC_HINT={newBk:'newOrder',refresh:'refresh',g30Add:'gAdd',editBk:'bkEdit',v30Send:'bkSend',v9Deliv:'bkDeliv',v9Urgent:'bkUrg',asgSuggest:'bkSug',sideT:'calSide',dzXlsx:'dXlsx'};
{const r0=render;render=function(){r0();if(!S||!scEnabled())return;const map=scMap();
 document.querySelectorAll('[data-a]').forEach(b=>{const id=SC_HINT[b.dataset.a]||(b.dataset.a==='g30Go'?(b.dataset.m==='draft'?'gDraft':'gSend'):null);if(!id||!map[id])return;if(singleKey(map[id])&&!scSingle())return;
  const base=(b.getAttribute('title')||b.textContent.trim()).replace(/ \([^)]*\)$/,'');b.setAttribute('title',`${base} (${map[id].replace(/Ctrl/g,IS_MAC?'⌘':'Ctrl')})`);});};}
