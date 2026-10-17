// v3.18: Quản lý người dùng – bộ lọc, tạo tài khoản (đơn lẻ / hàng loạt), đặt lại mật khẩu, xóa tài khoản (có chuyển giao)
(()=>{const st=document.createElement('style');st.textContent=`
.ufbar{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0 10px}.ufbar .field{min-width:140px}.ufbar .grow{flex:1}
.ufcnt{font-size:12.5px;color:var(--muted);margin-left:auto}.ufsel{display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:#fff4e0;margin-bottom:8px}
.pwbox{display:flex;gap:6px;align-items:center}.pwbox code{font-size:18px;letter-spacing:.06em;background:var(--ground);padding:6px 10px;border-radius:8px;user-select:all}
.ubulk textarea{width:100%;min-height:140px;font-family:ui-monospace,monospace;font-size:12.5px}.ubulk td.bad{color:var(--bad)}
.udel ul{margin:6px 0 10px 18px}.udel .warn{background:var(--warn-bg);border-radius:8px;padding:8px 10px}
`;document.head.appendChild(st);})();
const ROLE_OPTS=[['admin','Admin'],['cs','CS'],['logistics','Logistics'],['sales','Sales'],['customer','Khách hàng']];
const UF_KEY='uf';let UF={role:'',seg:'',st:'',login:'',q:''};try{UF={...UF,...JSON.parse(localStorage.getItem(UF_KEY)||'{}')};}catch(e){}
const ufSave=()=>{try{localStorage.setItem(UF_KEY,JSON.stringify(UF));}catch(e){}};
const isAdmin45=()=>role()==='admin'&&!(S&&S.custView);
function pwGen(n=10){const a='ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';const r=new Uint32Array(n);crypto.getRandomValues(r);let s='';for(let i=0;i<n;i++)s+=a[r[i]%a.length];return /\d/.test(s)?s:s.slice(0,-1)+'7';}
function ufList(){const q=fold30(UF.q.trim());const d30=addDays(TODAY,-30);
 return S.users.filter(u=>(!UF.role||u.role===UF.role)&&(!UF.seg||(u.segment||(u.customerId?cust(u.customerId).segment:''))===UF.seg)
  &&(!UF.st||(UF.st==='on'?u.active:!u.active))&&(!UF.login||(UF.login==='never'?!u.last:(!u.last||u.last<d30)))
  &&(!q||fold30(u.name+' '+u.email).includes(q)));}
// ---------- bảng người dùng: bộ lọc + chọn nhiều + nút mới ----------
{const v0=vUsers;vUsers=function(){if(V.uTab&&V.uTab!=='users'||!can('users.manage'))return v0();
 const all=S.users;const list=ufList();const sel=V.usel||(V.usel=new Set());[...sel].forEach(id=>{if(!list.some(u=>u.id===id))sel.delete(id);});
 S.users=list;let h;try{h=v0();}finally{S.users=all;}
 const ad=isAdmin45();let i=0;
 if(ad)h=h.replace('<th>Họ tên</th>',`<th style="width:26px"><input type="checkbox" data-usall="1" ${list.length&&sel.size===list.filter(u=>u.id!==V.me).length?'checked':''} aria-label="Chọn tất cả"></th><th>Họ tên</th>`)
  .replace(/<tr><td><b>/g,()=>{const u=list[i++];return `<tr><td>${u&&u.id!==V.me?`<input type="checkbox" data-usel="${u.id}" ${sel.has(u.id)?'checked':''} aria-label="Chọn ${esc(u.name)}">`:''}</td><td><b>`;});
 if(ad)h=h.replace(/(<button class="btn ghost sm" data-a="userEdit" data-id="([^"]+)">Sửa<\/button>)/g,(m,b,id)=>`${b} <button class="btn ghost sm" data-a="pwReset" data-id="${id}" title="Đặt lại mật khẩu">🔑</button>${id!==V.me?` <button class="btn ghost sm" data-a="udel" data-id="${id}" title="Xóa tài khoản">🗑</button>`:''}`);
 h=h.replace('<button class="btn" data-a="userNew">Cấp quyền tài khoản</button>',`<span class="row" style="gap:8px">${ad?'<button class="btn ghost" data-a="ucBulk">Tạo hàng loạt</button>':''}<button class="btn ghost" data-a="userNew" title="Email đã có tài khoản đăng nhập, chỉ cần gán vai trò">Gán vai trò</button>${ad?'<button class="btn" data-a="ucNew">+ Tạo tài khoản</button>':''}</span>`);
 const segOn=!UF.role||UF.role==='sales'||UF.role==='customer';
 const bar=`<div class="ufbar">
  <div class="field"><label for="uf-q">Tìm</label><input id="uf-q" class="inp" data-uf="q" value="${esc(UF.q)}" placeholder="Tên hoặc email (vd: test, .dev)"></div>
  <div class="field"><label for="uf-r">Vai trò</label><select id="uf-r" class="inp" data-uf="role"><option value="">Tất cả</option>${ROLE_OPTS.map(([k,l])=>`<option value="${k}" ${UF.role===k?'selected':''}>${l}</option>`).join('')}</select></div>
  ${segOn?`<div class="field"><label for="uf-s">Segment</label><select id="uf-s" class="inp" data-uf="seg"><option value="">Tất cả</option>${SEGS.map(g=>`<option value="${g}" ${UF.seg===g?'selected':''}>${SEG_LABEL[g]}</option>`).join('')}</select></div>`:''}
  <div class="field"><label for="uf-t">Trạng thái</label><select id="uf-t" class="inp" data-uf="st"><option value="">Tất cả</option><option value="on" ${UF.st==='on'?'selected':''}>Đang hoạt động</option><option value="off" ${UF.st==='off'?'selected':''}>Đã khóa</option></select></div>
  <div class="field"><label for="uf-l">Đăng nhập</label><select id="uf-l" class="inp" data-uf="login"><option value="">Tất cả</option><option value="never" ${UF.login==='never'?'selected':''}>Chưa đăng nhập bao giờ</option><option value="30" ${UF.login==='30'?'selected':''}>Không đăng nhập &gt; 30 ngày</option></select></div>
  ${UF.role||UF.seg||UF.st||UF.login||UF.q?'<button class="btn ghost sm" data-a="ufClear">Bỏ lọc</button>':''}<span class="ufcnt">Đang hiện ${list.length}/${all.length} tài khoản</span></div>
  ${ad&&sel.size?`<div class="ufsel"><b>Đã chọn ${sel.size}</b><button class="btn danger sm" data-a="udelMany">🗑 Xóa ${sel.size} tài khoản</button><button class="btn ghost sm" data-a="uselNone">Bỏ chọn</button></div>`:''}`;
 return h.replace(/(<div class="tabs">[\s\S]*?<\/div>)/,'$1'+bar);};}
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.uf;if(!k)return;UF[k]=e.target.value;if(k==='role'&&e.target.value&&!['sales','customer'].includes(e.target.value))UF.seg='';ufSave();
 if(k==='q'){clearTimeout(UF._t);UF._t=setTimeout(()=>{render();const el=document.getElementById('uf-q');if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length);}},200);}else render();});
document.addEventListener('change',e=>{const d=e.target.dataset||{};if(d.usel){const s=V.usel||(V.usel=new Set());e.target.checked?s.add(d.usel):s.delete(d.usel);render();}
 else if(d.usall){const s=V.usel||(V.usel=new Set());if(e.target.checked)ufList().forEach(u=>{if(u.id!==V.me)s.add(u.id);});else s.clear();render();}});
A.ufClear=()=>{UF={role:'',seg:'',st:'',login:'',q:''};ufSave();render();};
A.uselNone=()=>{V.usel=new Set();render();};
// ---------- tạo tài khoản ----------
A.ucNew=()=>{A.userNew();const M=V.modal;M.create=true;M.f.pw=pwGen();M.f.welcome=false;M.f.force=true;render();setTimeout(()=>{const el=document.getElementById('un-n');if(el)el.focus();},40);};
{const m0=mUserNew;mUserNew=function(){let h=m0();const M=V.modal;if(!M.create)return h;const f=M.f;
 h=h.replace('CẤP QUYỀN TÀI KHOẢN','TẠO TÀI KHOẢN').replace(/<div class="hint" style="margin-bottom:10px"><b>Bước 1:[\s\S]*?<\/div>/,'')
  .replace('type="email" data-f="un" data-k="email"','type="text" data-f="un" data-k="email" placeholder="hung.phan hoặc email đầy đủ"')
  .replace('Email đăng nhập <span class="req">*</span>','Email / tên đăng nhập <span class="req">*</span>')
  .replace(/<p class="small muted">Gửi email và mật khẩu tạm[^<]*<\/p>/,'')
  .replace('data-a="unSave">Cấp quyền</button>','data-a="ucSave">Tạo tài khoản</button>');
 const pw=`<div class="fgrid" style="margin-top:10px"><div class="field"><label for="uc-pw">Mật khẩu tạm <span class="req">*</span></label><div class="pwbox"><input id="uc-pw" class="inp" data-f="un" data-k="pw" value="${esc(f.pw)}" autocomplete="off" spellcheck="false"><button class="btn ghost sm" data-a="ucGen" title="Sinh mật khẩu mới">↻</button><button class="btn ghost sm" data-a="ucCopy" title="Copy">📋</button></div></div>
  <div class="field"><label class="row" style="gap:6px"><input type="checkbox" data-f="unc" data-k="force" ${f.force?'checked':''}> Bắt đổi mật khẩu khi đăng nhập lần đầu</label>
  <label class="row" style="gap:6px"><input type="checkbox" data-f="unc" data-k="welcome" ${f.welcome?'checked':''}> Gửi email chào mừng (tên đăng nhập + mật khẩu tạm)</label></div></div>`;
 return h.replace('<div class="mfoot">',pw+'<div class="mfoot">');};}
A.ucGen=()=>{V.modal.f.pw=pwGen();render();};
A.ucCopy=()=>{const v=(V.modal&&V.modal.f&&V.modal.f.pw)||(V.modal&&V.modal.pw)||'';navigator.clipboard&&navigator.clipboard.writeText(v).then(()=>toast('Đã copy mật khẩu')).catch(()=>{});};
A.ucSave=()=>{const M=V.modal;const f=M.f;M.err='';const email=loginEmail(f.email);
 if(!f.name.trim()||!/^\S+@\S+\.\S+$/.test(email)){M.err='Nhập họ tên và email / tên đăng nhập hợp lệ.';return render();}
 if(S.users.some(u=>u.email.toLowerCase()===email)){M.err='Email này đã có tài khoản.';return render();}
 if(f.role==='sales'&&!f.phone.trim()){M.err='Sales cần số điện thoại (hiển thị cho khách).';return render();}
 if(f.role==='customer'&&!f.customerId){M.err='Chọn công ty khách hàng.';return render();}
 if(!f.pw||f.pw.length<8){M.err='Mật khẩu tạm tối thiểu 8 ký tự.';return render();}
 const pw=f.pw,name=f.name.trim();
 mutate('admin_create_user',{p:{email,name,role:f.role,phone:f.phone,segment:f.segment,customer_id:f.customerId,wh:f.wh,stat_scope:f.statScope||'',manager_id:f.managerId||'',notify_team:!!f.notifyTeam,password:pw,welcome:!!f.welcome,force_change:f.force!==false}},
  {err:m=>{M.err=m;},ok:r=>{V.modal={type:'ucDone',email:r.email,name,pw,sent:r.emailSent,welcome:!!f.welcome};render();}});};
M29.ucDone=function(){const M=V.modal;return `<div class="mhead"><h2>✓ ĐÃ TẠO TÀI KHOẢN</h2><span class="meta">${esc(M.name)}</span></div>
 <p>Tên đăng nhập: <b>${esc(M.email)}</b></p><div class="pwbox"><span>Mật khẩu tạm:</span><code>${esc(M.pw)}</code><button class="btn ghost sm" data-a="ucCopy">📋 Copy</button></div>
 <p class="small" style="margin-top:10px">${M.sent?'Đã xếp hàng email chào mừng tới người dùng.':M.welcome?'<span style="color:var(--warn)">Email đang tắt trên hệ thống nên chưa gửi được: báo mật khẩu cho người dùng.</span>':'Báo tên đăng nhập và mật khẩu tạm cho người dùng.'} Mật khẩu chỉ hiện một lần ở đây.</p>
 <div class="mfoot"><button class="btn" data-a="close">Xong</button></div>`;};
// ---------- tạo hàng loạt ----------
A.ucBulk=()=>{V.modal={type:'ucBulk',wide:true,text:'',rows:[],err:'',done:null};render();};
const ROLE_MAP={admin:'admin',cs:'cs',logistics:'logistics',log:'logistics',sales:'sales','kinh doanh':'sales',kd:'sales'};
function ucParse(text){const lines=String(text||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);const out=[];const seen=new Set();
 lines.forEach((l,i)=>{const c=l.split(/\t|;|,(?=\s*\S+@)/).map(x=>x.trim());if(i===0&&/h[oọ] t[eê]n|email/i.test(l)&&!/@/.test(l))return;
  const [name,em,rl,seg,phone,wh]=c;const email=loginEmail(em);const role=ROLE_MAP[fold30(rl||'')]||'';const r={name,email,role,segment:(seg||'').toUpperCase(),phone:phone||'',wh:(wh||'').toUpperCase(),err:''};
  if(!name)r.err='Thiếu họ tên';else if(!/^\S+@\S+\.\S+$/.test(email))r.err='Email không hợp lệ';else if(!role)r.err='Vai trò phải là Admin / CS / Logistics / Sales (khách hàng tạo từng người)';
  else if(role==='sales'&&!['DD','DA','EX'].includes(r.segment))r.err='Sales cần Segment DD / DA / EX';else if(role==='sales'&&!r.phone)r.err='Sales cần SĐT';
  else if(seen.has(email)||S.users.some(u=>u.email.toLowerCase()===email))r.err='Email đã có tài khoản / trùng';
  if(r.wh&&!WH.some(w=>w.id===r.wh))r.err=r.err||'Kho không tồn tại';seen.add(email);out.push(r);});return out;}
M29.ucBulk=function(){const M=V.modal;const rows=M.rows;const ok=rows.filter(r=>!r.err).length;
 if(M.done)return `<div class="mhead"><h2>TẠO HÀNG LOẠT · KẾT QUẢ</h2></div><p>Đã tạo <b>${M.done.filter(x=>x.ok).length}/${M.done.length}</b> tài khoản. Tải danh sách mật khẩu tạm ngay (chỉ hiện một lần).</p>
  <div class="tbl-wrap"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Kết quả</th></tr></thead><tbody>${M.done.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td class="${x.ok?'':'bad'}">${x.ok?'✓ '+esc(x.pw):esc(x.err)}</td></tr>`).join('')}</tbody></table></div>
  <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="ucBulkCsv">⬇ Tải danh sách (CSV)</button></div>`;
 return `<div class="mhead"><h2>TẠO TÀI KHOẢN HÀNG LOẠT</h2></div><div class="ubulk">
 <p class="small">Dán từ Excel, mỗi dòng một người: <b>Họ tên | Email (hoặc tên đăng nhập) | Vai trò | Segment | SĐT | Kho</b>. Vai trò: Admin, CS, Logistics, Sales. Mỗi người được sinh mật khẩu tạm riêng và bị bắt đổi khi đăng nhập lần đầu.</p>
 <textarea class="inp" data-ucb="1" placeholder="Nguyễn Văn A&#9;a.nguyen&#9;Sales&#9;DD&#9;0909123456&#9;JM2">${esc(M.text)}</textarea>
 ${rows.length?`<div class="tbl-wrap" style="margin-top:8px;max-height:260px;overflow:auto"><table><thead><tr><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Segment</th><th>SĐT</th><th>Kho</th><th>Kiểm tra</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.name||'')}</td><td>${esc(r.email||'')}</td><td>${esc(r.role)}</td><td>${esc(r.segment)}</td><td>${esc(r.phone)}</td><td>${esc(r.wh)}</td><td class="${r.err?'bad':''}">${r.err?esc(r.err):'✓'}</td></tr>`).join('')}</tbody></table></div>`:''}
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}</div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button><button class="btn" data-a="ucBulkGo" ${ok?'':'disabled'}>Tạo ${ok} tài khoản</button></div>`;};
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.ucb&&V.modal&&V.modal.type==='ucBulk'){V.modal.text=e.target.value;clearTimeout(V.modal._t);V.modal._t=setTimeout(()=>{V.modal.rows=ucParse(V.modal.text);render();const t=document.querySelector('[data-ucb]');if(t){t.focus();t.setSelectionRange(t.value.length,t.value.length);}},300);}});
A.ucBulkGo=async()=>{const M=V.modal;const rows=M.rows.filter(r=>!r.err);const done=[];setBusy(true);
 for(const r of rows){const pw=pwGen();try{await rpc('admin_create_user',{p:{email:r.email,name:r.name,role:r.role,segment:r.segment||'DD',phone:r.phone,wh:r.wh||'JM2',password:pw,welcome:false,force_change:true}});done.push({...r,pw,ok:true});}
  catch(e){done.push({...r,ok:false,err:e.message});}}
 try{await reload();}catch(e){}setBusy(false);M.done=done;render();};
A.ucBulkCsv=()=>{const d=V.modal.done.filter(x=>x.ok);const csv='﻿Họ tên,Email,Vai trò,Mật khẩu tạm\n'+d.map(x=>[x.name,x.email,x.role,x.pw].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='tai-khoan-moi-'+TODAY+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);};
// ---------- đặt lại mật khẩu ----------
A.pwReset=d=>{const u=user(d.id);V.modal={type:'pwReset',id:d.id,name:u.name,email:u.email,pw:pwGen(),done:false,err:''};render();};
M29.pwReset=function(){const M=V.modal;return `<div class="mhead"><h2>🔑 ĐẶT LẠI MẬT KHẨU</h2><span class="meta">${esc(M.name)}</span></div>
 ${M.done?`<p>Đã đặt mật khẩu tạm mới cho <b>${esc(M.email)}</b>. ${M.id===V.me?'':'Người dùng sẽ bị yêu cầu đổi khi đăng nhập.'}</p><div class="pwbox"><code>${esc(M.pw)}</code><button class="btn ghost sm" data-a="ucCopy">📋 Copy</button></div><p class="small muted">Mật khẩu chỉ hiện một lần ở đây.</p><div class="mfoot"><button class="btn" data-a="close">Xong</button></div>`
 :`<div class="field"><label for="pr-pw">Mật khẩu tạm mới</label><div class="pwbox"><input id="pr-pw" class="inp" data-prpw="1" value="${esc(M.pw)}" autocomplete="off"><button class="btn ghost sm" data-a="prGen">↻</button></div></div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}<div class="mfoot"><button class="btn ghost" data-a="close">Hủy</button><button class="btn" data-a="prGo">Đặt lại mật khẩu</button></div>`}`;};
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.prpw&&V.modal&&V.modal.type==='pwReset')V.modal.pw=e.target.value;});
A.prGen=()=>{V.modal.pw=pwGen();render();};
A.prGo=()=>{const M=V.modal;if((M.pw||'').length<8){M.err='Tối thiểu 8 ký tự.';return render();}mutate('admin_reset_password',{p_user:M.id,p_pw:M.pw},{err:m=>{M.err=m;},ok:()=>{M.done=true;render();}});};
// ---------- xóa tài khoản ----------
A.udel=async d=>{const u=user(d.id);V.modal={type:'udel',id:d.id,u,refs:null,to:'',typed:'',err:''};render();
 try{V.modal.refs=await rpc('admin_user_refs',{p_user:d.id});}catch(e){V.modal.err=e.message;}if(V.modal&&V.modal.type==='udel')render();};
M29.udel=function(){const M=V.modal;const u=M.u;const r=M.refs;if(!r)return `<div class="mhead"><h2>XÓA TÀI KHOẢN</h2></div><div class="empty">${M.err?esc(M.err):'Đang kiểm tra dữ liệu…'}</div><div class="mfoot"><button class="btn ghost" data-a="close">Đóng</button></div>`;
 const need=(+r.salesCust)+(+r.csCust)+(+r.bookings)+(+r.delegateOf);const wantRole=+r.salesCust?['sales']:['cs','admin'];
 const cands=S.users.filter(x=>x.id!==u.id&&x.active&&wantRole.includes(x.role)).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 return `<div class="mhead"><h2>🗑 XÓA TÀI KHOẢN</h2><span class="meta">${esc(u.name)} · ${esc(u.email)}</span></div><div class="udel">
 <p>Xóa hẳn tài khoản đăng nhập và hồ sơ. ${u.role==='customer'?'Công ty khách hàng và đơn hàng vẫn giữ nguyên.':''} Lịch sử, nhật ký vẫn ghi tên "${esc(u.name)} (đã xóa)". Email này có thể tạo lại sau.</p>
 ${need?`<div class="warn"><b>Tài khoản đang gắn dữ liệu:</b><ul>${+r.salesCust?`<li>${r.salesCust} khách hàng (Sales phụ trách)</li>`:''}${+r.csCust?`<li>${r.csCust} khách hàng (CS phụ trách)</li>`:''}${+r.bookings?`<li>${r.bookings} booking phụ trách (${r.openBk} đang mở)</li>`:''}${+r.delegateOf?`<li>Là người nhận thay của ${r.delegateOf} người</li>`:''}</ul>
  <div class="field"><label for="ud-to">Chuyển giao tất cả cho <span class="req">*</span></label><select id="ud-to" class="inp" data-udel="to"><option value="">Chọn ${wantRole[0]==='sales'?'Sales':'CS'}…</option>${cands.map(x=>`<option value="${x.id}" ${M.to===x.id?'selected':''}>${esc(x.name)} · ${ROLE_LABEL[x.role]}</option>`).join('')}</select></div>
  <p class="small">Hoặc <button class="linkbtn" data-a="udelLock">Khóa tài khoản thay vì xóa</button> (giữ nguyên mọi thứ).</p></div>`:'<p class="small muted">Tài khoản không gắn khách hàng hay booking nào.</p>'}
 ${+r.reports?`<p class="small">Đang là RSM của ${r.reports} Sales: quan hệ quản lý sẽ được gỡ.</p>`:''}${+r.requests?`<p class="small">${r.requests} yêu cầu đặt hàng chưa xử lý sẽ được hủy.</p>`:''}
 <div class="field"><label for="ud-x">Gõ <b>XOA</b> để xác nhận</label><input id="ud-x" class="inp" data-udel="typed" value="${esc(M.typed)}" autocomplete="off"></div>
 ${M.err?`<div class="err">${esc(M.err)}</div>`:''}</div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Hủy</button><button class="btn danger" data-a="udelGo">Xóa vĩnh viễn</button></div>`;};
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.udel;if(k&&V.modal&&V.modal.type==='udel')V.modal[k]=e.target.value;});
document.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.udel;if(k&&V.modal&&V.modal.type==='udel')V.modal[k]=e.target.value;});
A.udelLock=()=>{const id=V.modal.id;V.modal=null;A.userToggle({id});};
A.udelGo=()=>{const M=V.modal;const r=M.refs;const need=(+r.salesCust)+(+r.csCust)+(+r.bookings)+(+r.delegateOf);M.err='';
 if(fold30(M.typed.trim())!=='xoa'){M.err='Gõ XOA để xác nhận.';return render();}if(need&&!M.to){M.err='Chọn người nhận chuyển giao.';return render();}
 const em=M.u.email;mutate('admin_delete_user',{p_user:M.id,p_transfer:M.to||null},{err:m=>{M.err=m;},ok:()=>{V.modal=null;if(V.usel)V.usel.delete(M.id);render();toast('Đã xóa tài khoản '+em);}});};
A.udelMany=()=>{const ids=[...(V.usel||[])];V.modal={type:'udelMany',ids,typed:'',err:'',res:null};render();};
M29.udelMany=function(){const M=V.modal;const us=M.ids.map(user);
 if(M.res)return `<div class="mhead"><h2>KẾT QUẢ XÓA</h2></div><p>Đã xóa <b>${M.res.filter(x=>x.ok).length}/${M.res.length}</b> tài khoản.</p><div class="tbl-wrap"><table><tbody>${M.res.map(x=>`<tr><td>${esc(x.email)}</td><td class="${x.ok?'':'bad'}">${x.ok?'✓ Đã xóa':esc(x.err)}</td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">Tài khoản đang gắn khách / booking cần xóa từng người để chọn người nhận chuyển giao.</p><div class="mfoot"><button class="btn" data-a="close">Đóng</button></div>`;
 return `<div class="mhead"><h2>🗑 XÓA ${us.length} TÀI KHOẢN</h2></div><div class="udel"><ul>${us.map(u=>`<li>${esc(u.name)} · ${esc(u.email)} · ${ROLE_LABEL[u.role]}</li>`).join('')}</ul>
 <p class="small">Tài khoản nào đang gắn khách hàng / booking sẽ được bỏ qua (xóa riêng để chuyển giao).</p>
 <div class="field"><label for="udm-x">Gõ <b>XOA</b> để xác nhận</label><input id="udm-x" class="inp" data-udelm="1" value="${esc(M.typed)}" autocomplete="off"></div>${M.err?`<div class="err">${esc(M.err)}</div>`:''}</div>
 <div class="mfoot"><button class="btn ghost" data-a="close">Hủy</button><button class="btn danger" data-a="udelManyGo">Xóa vĩnh viễn</button></div>`;};
document.addEventListener('input',e=>{if(e.target.dataset&&e.target.dataset.udelm&&V.modal&&V.modal.type==='udelMany')V.modal.typed=e.target.value;});
A.udelManyGo=async()=>{const M=V.modal;if(fold30(M.typed.trim())!=='xoa'){M.err='Gõ XOA để xác nhận.';return render();}setBusy(true);const res=[];
 for(const id of M.ids){const u=user(id);try{await rpc('admin_delete_user',{p_user:id,p_transfer:null});res.push({email:u.email,ok:true});}catch(e){res.push({email:u.email,ok:false,err:e.message.split('.')[0]});}}
 V.usel=new Set();try{await reload();}catch(e){}setBusy(false);M.res=res;render();};
// ---------- bắt đổi mật khẩu lần đầu ----------
{const s0=startApp;startApp=async function(){await s0();if(S&&S.me&&S.me.mustChangePw&&!S.imp&&!S.custView){showSetPassword();
 const f=document.getElementById('sp');if(f)f.insertAdjacentHTML('afterbegin','<div class="hint" style="margin-bottom:6px">Bạn đang dùng <b>mật khẩu tạm</b> do Admin cấp. Đặt mật khẩu mới của riêng bạn để tiếp tục.</div>');}};}
