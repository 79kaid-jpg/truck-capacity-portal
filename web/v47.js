// v3.24: Trao đổi nội bộ theo đơn / xe / ngày-kho (khách hàng không thấy) + thông báo trên máy + trợ lý tự ẩn khi bấm ra ngoài
(()=>{const st=document.createElement('style');st.textContent=`
#talkPanel{position:fixed;right:0;top:0;bottom:0;width:min(440px,100vw);z-index:74;background:var(--surface);border-left:1.5px solid var(--ink);box-shadow:var(--shadow);display:flex;flex-direction:column}
#talkPanel .th{padding:10px 14px 8px;border-bottom:1px solid var(--line)}#talkPanel .th .row{gap:6px;align-items:center}#talkPanel .th b.t{flex:1;font-size:14.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tklock{display:inline-block;margin-top:6px;font-size:11.5px;font-weight:700;color:#7a5b00;background:#fff4c2;border:1px solid #f0d77a;border-radius:6px;padding:1px 7px}
.tkst{font-size:12px;margin-top:6px}.tkst.wait{color:#9a5b00}.tkst.done{color:var(--ok)}
.tkpin{margin:8px 14px 0;padding:7px 10px;border-radius:8px;background:#fff4c2;border:1px solid #f0d77a;font-size:13px;display:flex;gap:6px;align-items:flex-start}.tkpin .grow{white-space:pre-wrap}
#talkPanel .tm{flex:1;overflow:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;background:#fffdf3}
.tmsg{max-width:90%;align-self:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:12px;border-bottom-left-radius:4px;padding:6px 10px;font-size:13.5px;line-height:1.45;position:relative}
.tmsg.me{align-self:flex-end;background:#e8f0fb;border-color:#c6d7f1;border-bottom-left-radius:12px;border-bottom-right-radius:4px}
.tmsg .tmh{font-size:11.5px;color:var(--muted);display:flex;gap:6px;align-items:baseline;margin-bottom:2px}.tmsg .tmh b{color:var(--ink);font-size:12px}
.tmsg .tmb{white-space:pre-wrap;word-wrap:break-word}.tmsg .tmb a{color:var(--blue);cursor:pointer;text-decoration:underline}.tmsg .tmb .at{font-weight:700;color:#5b2fb0}
.tmsg.ask{border-left:3px solid #e59a00}.tmsg.del .tmb{color:var(--muted);font-style:italic}
.tmsg img{display:block;max-width:100%;max-height:220px;border-radius:8px;margin-top:4px;cursor:zoom-in}
.tmr{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}.tmr button{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:0 6px;font:inherit;font-size:12px;cursor:pointer}.tmr button.on{border-color:var(--blue);background:var(--blue-bg)}
.tmact{display:none;position:absolute;top:-12px;right:6px;background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:1px 3px;gap:1px}.tmsg:hover .tmact,.tmsg:focus-within .tmact{display:flex}
.tmact button{border:0;background:transparent;cursor:pointer;font-size:13px;padding:2px 4px;border-radius:5px}.tmact button:hover{background:var(--blue-bg)}
.tev{align-self:center;font-size:11.5px;color:var(--muted);text-align:center;max-width:95%}
.tseen{align-self:flex-end;font-size:11px;color:var(--muted)}
#talkPanel .tq{display:flex;gap:5px;flex-wrap:wrap;padding:6px 14px 0}#talkPanel .tq button{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:3px 9px;font:inherit;font-size:12px;cursor:pointer}#talkPanel .tq button.r{border-color:#c6d7f1;background:#e8f0fb}
#talkPanel .tf{padding:8px 14px 10px;border-top:1px solid var(--line);position:relative}#talkPanel .tf textarea{width:100%;min-height:44px;max-height:140px;resize:vertical}
#talkPanel .tf .row{gap:6px;align-items:center;margin-top:6px}.tkfile{position:relative;display:inline-block}.tkfile img{height:48px;border-radius:6px;border:1px solid var(--line)}.tkfile button{position:absolute;top:-6px;right:-6px;border-radius:50%;border:1px solid var(--line);background:var(--surface);width:18px;height:18px;font-size:11px;line-height:1;cursor:pointer}
#tkAt{position:absolute;left:14px;right:14px;bottom:100%;max-height:220px;overflow:auto;background:var(--surface);border:1.5px solid var(--ink);border-radius:10px;box-shadow:var(--shadow);z-index:2}
#tkAt button{display:flex;gap:8px;width:100%;text-align:left;border:0;background:transparent;padding:6px 10px;font:inherit;font-size:13px;cursor:pointer}#tkAt button.on,#tkAt button:hover{background:var(--blue-bg)}#tkAt small{color:var(--muted);margin-left:auto}
@media (min-width:1100px){body.talk-open{padding-right:min(440px,100vw)}}@media (min-width:700px){body.talk-open .scrim{right:min(440px,100vw)}}
.tkbadge{display:inline-flex;align-items:center;gap:2px;border:1.5px solid #e59a00;background:#fff4c2;color:#7a5b00;border-radius:999px;padding:0 6px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit}
.tkbadge.q{border-color:#d9480f;background:#ffe8d9;color:#a33a00}.tkbadge.z{border-color:var(--line);background:var(--surface);color:var(--muted);font-weight:600}
.tkpinl{font-size:11.5px;background:#fff4c2;border-radius:6px;padding:2px 6px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tkrow{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin:8px 0;background:var(--surface);cursor:pointer}.tkrow:hover{border-color:var(--ink)}
.tkrow.un{border-left:4px solid var(--blue)}.tkrow .ic{font-size:18px;line-height:1.2}.tkrow .grow{min-width:0}.tkrow .l{font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tkn{background:var(--blue);color:#fff;border-radius:999px;padding:0 7px;font-size:11px;font-weight:700}
`;document.head.appendChild(st);})();
IC.talk='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.5V16H5.5A1.5 1.5 0 0 1 4 14.5z"/><path d="M8 9h8M8 12h5"/></svg>';
const tkCan=()=>!!S&&!S.custView&&role()!=='customer';
{const a0=adopt;adopt=function(st){const s=a0(st);s.talk=st.talk||[];return s;};}
const TK={open:false,k:null,r:null,d:null,draft:'',ment:[],tags:[],file:null,img:{},busy:false,pinEdit:false,edit:null,at:null,ver:null,tab:'need',wh:''};
const tkList=()=>S&&S.talk||[];
const tkOf=(k,r)=>tkList().find(t=>t.k===k&&t.ref===r);
const tkNeed=t=>t.st==='wait'&&(t.wait||[]).includes(V.me);
const tkUnread=t=>t.inv&&t.unread>0;
function tkTitle(t){if(t.k==='bk'){const c=t.cid&&cust(t.cid);return t.ref+(c?' · '+c.name:'');}
 if(t.k==='truck'){const p=t.ref.split('-');return 'Xe '+p[2]+'-'+p[3]+' · '+p[0]+' '+dm(t.day);}const [w,d]=t.ref.split(':');return 'Ngày '+dm(d)+' · kho '+w;}
const tkIcon=k=>k==='bk'?'📦':k==='truck'?'🚚':'📅';
function tkBadge(k,r,label){const t=tkOf(k,r);if(!t||!t.n)return label?`<button type="button" class="tkbadge z" data-a="tkOpen" data-k="${k}" data-r="${esc(r)}" title="Trao đổi nội bộ">💬 ${label}</button>`:'';
 const need=tkNeed(t),un=tkUnread(t);return `<button type="button" class="tkbadge ${need?'q':un?'':'z'}" data-a="tkOpen" data-k="${k}" data-r="${esc(r)}" title="${need?'Đang chờ bạn trả lời':un?t.unread+' tin chưa đọc':'Trao đổi nội bộ'}">💬 ${need?'❓':''}${un?t.unread:t.n}${label?' '+label:''}</button>`;}
const tkPinLine=(k,r)=>{const t=tkOf(k,r);return t&&t.pin?`<div class="tkpinl" title="${esc(t.pin)}">📌 ${esc(t.pin)}</div>`:'';};
// ---------- mở / tải ----------
A.tkOpen=async d=>{if(!tkCan())return;const k=d.k,r=d.r;if(!k||!r)return;
 if(typeof CHAT!=='undefined'&&CHAT.open){CHAT.open=false;if(typeof chatRender==='function')chatRender();}
 if(TK.k!==k||TK.r!==r){TK.draft=d.text||'';TK.ment=[];TK.tags=d.tag?[d.tag]:[];TK.file=null;TK.pinEdit=false;TK.edit=null;TK.d=null;}
 else if(d.text)TK.draft=d.text;
 if(d.tag&&TK.draft&&!TK.draft.includes(tkTagLabel(d.tag)))TK.draft=tkTagLabel(d.tag)+' '+TK.draft;
 TK.open=true;TK.k=k;TK.r=r;tkRender();await tkLoad();setTimeout(()=>{const ta=document.querySelector('#talkPanel textarea');if(ta){ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);}},30);};
A.tkClose=()=>{TK.open=false;tkRender();};
async function tkLoad(){if(!TK.open)return;try{const d=await rpc('talk_get',{p_kind:TK.k,p_ref:TK.r});tkAdopt(d);}catch(e){toast(e.message);}}
function tkAdopt(d){TK.d=d;const t=tkOf(TK.k,TK.r);if(t){t.unread=0;if(d.thread){t.st=d.thread.st;t.pin=d.thread.pin;t.mode=d.thread.mode;t.wait=(d.thread.wait||[]).map(x=>x.id);t.n=d.msgs.length;}}
 else if(d.thread&&S){S.talk.unshift({id:d.thread.id,k:TK.k,ref:TK.r,wh:d.thread.wh,day:d.thread.day,cid:d.thread.cid,st:d.thread.st,pin:d.thread.pin,wait:(d.thread.wait||[]).map(x=>x.id),n:d.msgs.length,unread:0,inv:true,mine:true,mode:d.thread.mode,lastAt:S.clock,lastText:''});}
 tkRender();tkBadges();}
// ---------- mẫu câu ----------
const TK_Q={hold:['Khi nào xếp xe cho đơn này?','Ghép chung xe với đơn khác được không?'],ok:['Xe đến kho mấy giờ?','Cho xin biển số và tài xế?'],loaded:['Dự kiến giao lúc mấy giờ?'],transit:['Dự kiến giao lúc mấy giờ?','Xe đang ở đâu?'],
 any:['Dời sang ngày khác được không?','Khách cần giao gấp, ưu tiên được không?']};
const TK_R={logistics:['Đã xếp xe','Xe đến kho lúc __h','Không xếp được: hết xe','Đã giao xong'],cs:['Đã báo khách','Khách đồng ý','Đã cập nhật đơn'],sales:['Đã báo khách','Khách đồng ý'],admin:['Đã xử lý']};
function tkQuick(){const r=role();const out=[];const b=TK.k==='bk'?bkById(TK.r):null;
 if(r!=='logistics'){const ks=b?[...(TK_Q[b.status]||[]),...TK_Q.any]:TK.k==='truck'?['Xe đến kho mấy giờ?','Xe còn nhận thêm hàng không?']:['Ngày này còn xe không?','Thêm xe được không?'];ks.slice(0,4).forEach(q=>out.push({t:q,ask:true}));}
 if(r==='logistics'&&TK.k!=='bk')out.push({t:'Thiếu xe ngày này, cần dời bớt đơn?',ask:true});
 const d=TK.d;if(d&&d.thread&&d.thread.st==='wait'&&(d.thread.wait||[]).some(x=>x.id===V.me))(TK_R[r]||[]).forEach(q=>out.push({t:q,ask:false,r:1}));
 return out;}
// ---------- @nhắc tên ----------
const TK_TAGS=[['log','Log','Logistics kho'],['cs','CS','CS phụ trách'],['sales','Sales','Sales phụ trách'],['admin','Admin','Quản trị']];
const tkTagLabel=k=>{const x=TK_TAGS.find(t=>t[0]===k);return x?'@'+x[1]+(k==='log'&&TK.k?' '+tkWh():''):'';};
function tkWh(){if(TK.k==='bk'){const b=bkById(TK.r);return b?b.wh:'';}return TK.r?TK.r.split(/[-:]/)[0]:'';}
function tkAtList(q){q=fold30(q||'');const g=TK_TAGS.map(([k,l,d])=>({tag:k,name:l+(k==='log'?' '+tkWh():''),d})).filter(x=>!q||fold30(x.name).includes(q));
 const us=(S.users||[]).filter(u=>u.role!=='customer'&&u.id!==V.me&&(!q||fold30(u.name).includes(q))).slice(0,8).map(u=>({id:u.id,name:u.name,d:ROLE_LABEL[u.role]||u.role}));return [...g,...us].slice(0,10);}
function tkAtShow(ta){const v=ta.value.slice(0,ta.selectionStart);const m=v.match(/(^|\s)@([^\s@]{0,20})$/);const box=document.getElementById('tkAt');
 if(!m){if(box)box.remove();TK.at=null;return;}const l=tkAtList(m[2]);if(!l.length){if(box)box.remove();TK.at=null;return;}TK.at={l,i:0,start:ta.selectionStart-m[2].length-1};
 tkAtDraw();}
function tkAtDraw(){let box=document.getElementById('tkAt');const f=document.querySelector('#talkPanel .tf');if(!f||!TK.at)return;if(!box){box=document.createElement('div');box.id='tkAt';f.appendChild(box);}
 box.innerHTML=TK.at.l.map((x,i)=>`<button type="button" class="${i===TK.at.i?'on':''}" data-tkat="${i}"><b>@${esc(x.name)}</b><small>${esc(x.d)}</small></button>`).join('');}
function tkAtPick(i){const ta=document.querySelector('#talkPanel textarea');const x=TK.at&&TK.at.l[i];if(!ta||!x)return;const s=TK.at.start;const end=ta.selectionStart;
 ta.value=ta.value.slice(0,s)+'@'+x.name+' '+ta.value.slice(end);TK.draft=ta.value;if(x.tag){if(!TK.tags.includes(x.tag))TK.tags.push(x.tag);}else if(!TK.ment.some(m=>m.id===x.id))TK.ment.push({id:x.id,name:x.name});
 TK.at=null;const b=document.getElementById('tkAt');if(b)b.remove();ta.focus();const p=s+x.name.length+2;ta.setSelectionRange(p,p);}
// ---------- gửi ----------
async function tkSend(text,ask){if(TK.busy)return;const body=(text!=null?text:TK.draft).trim();if(!body&&!TK.file)return;
 const ment=TK.ment.filter(m=>body.includes('@'+m.name)).map(m=>m.id);const tags=TK.tags.filter(k=>body.includes('@'+TK_TAGS.find(t=>t[0]===k)[1]));
 TK.busy=true;tkRender();
 try{let fid=null;if(TK.file){fid=await rpc('talk_upload',{p_b64:TK.file.b64,p_mime:TK.file.mime});}
  const d=await rpc('talk_post',{p:{kind:TK.k,ref:TK.r,body,ask:ask==null?null:ask,mentions:ment,tags,fileId:fid}});
  if(text==null){TK.draft='';TK.ment=[];TK.tags=[];const ta=document.querySelector('#talkPanel .tf textarea');if(ta)ta.value='';}TK.file=null;TK.busy=false;tkAdopt(d);const t=tkOf(TK.k,TK.r);if(t){t.lastText=body||'📷 Ảnh';t.lastAt=Math.floor(Date.now()/60000);t.lastBy=me().name;t.mine=true;}
  setTimeout(()=>{const ta=document.querySelector('#talkPanel textarea');if(ta)ta.focus();},20);}
 catch(e){TK.busy=false;tkRender();toast(e.message);}}
A.tkQ=d=>{const q=TK_QL[+d.i];if(!q)return;if(q.t.includes('__')){TK.draft=q.t;tkRender();const ta=document.querySelector('#talkPanel textarea');if(ta){const i=q.t.indexOf('__');ta.focus();ta.setSelectionRange(i,i+2);}return;}
 const pre=q.ask&&role()!=='logistics'&&TK.k==='bk'?tkTagLabel('log')+' ':'';if(pre&&!TK.tags.includes('log'))TK.tags.push('log');tkSend(pre+q.t,q.ask);};
let TK_QL=[];
async function tkAct(fn,args){try{const d=await rpc(fn,args);tkAdopt(d);}catch(e){toast(e.message);}}
A.tkReact=d=>tkAct('talk_react',{p_id:+d.id,p_emoji:d.e});
A.tkDone=d=>tkAct('talk_set',{p_kind:TK.k,p_ref:TK.r,p_what:'status',p_value:d.v});
A.tkMode=d=>tkAct('talk_set',{p_kind:TK.k,p_ref:TK.r,p_what:'mode',p_value:d.v}).then(()=>toast(d.v==='mute'?'Đã tắt theo dõi: chỉ nhận thông báo khi được @ tên.':d.v==='follow'?'Đã theo dõi: nhận mọi tin mới.':'Theo mặc định.'));
A.tkPinEdit=()=>{TK.pinEdit=true;tkRender();setTimeout(()=>{const i=document.getElementById('tk-pin');if(i)i.focus();},20);};
A.tkPinSave=()=>{const i=document.getElementById('tk-pin');TK.pinEdit=false;tkAct('talk_set',{p_kind:TK.k,p_ref:TK.r,p_what:'pin',p_value:i?i.value:''});};
A.tkPinDel=()=>{TK.pinEdit=false;tkAct('talk_set',{p_kind:TK.k,p_ref:TK.r,p_what:'pin',p_value:''});};
A.tkEdit=d=>{TK.edit=+d.id;tkRender();setTimeout(()=>{const i=document.getElementById('tk-edit');if(i)i.focus();},20);};
A.tkEditSave=()=>{const i=document.getElementById('tk-edit');const id=TK.edit;TK.edit=null;if(i)tkAct('talk_edit',{p_id:id,p_body:i.value,p_delete:false});};
A.tkDel=d=>tkAct('talk_edit',{p_id:+d.id,p_body:'',p_delete:true});
A.tkGoRef=()=>{const k=TK.k,r=TK.r;if(k==='bk')openBooking(r);else if(k==='truck'){const t=truckByCode(r);if(t){V.wh=t.wh;V.whAll=false;V.day=t.date;V.view='day';V.modal={type:'truck',code:t.code};afterNav(goMonth(t.date));}}
 else{const [w,d]=r.split(':');V.wh=w;V.whAll=false;V.day=d;V.view='day';V.modal=null;afterNav(goMonth(d));}};
A.tkImg=async d=>{const s=await tkImgSrc(+d.id);if(!s)return;const w=window.open('');if(w){w.document.write('<title>Ảnh</title><body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><img src="'+s+'" style="max-width:100%;max-height:100vh">');}};
async function tkImgSrc(id){if(TK.img[id])return TK.img[id];try{const f=await rpc('talk_file',{p_id:id});TK.img[id]='data:'+f.mime+';base64,'+f.b64;return TK.img[id];}catch(e){return null;}}
// nén ảnh: cạnh dài ≤ 1600px, JPEG, ≤ 650 KB
async function tkCompress(file){const url=URL.createObjectURL(file);try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url;});
 let w=img.naturalWidth,h=img.naturalHeight;const k=Math.min(1,1600/Math.max(w,h));w=Math.round(w*k);h=Math.round(h*k);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
 let q=0.8,du=c.toDataURL('image/jpeg',q);while(du.length*0.75>650000&&q>0.35){q-=0.15;du=c.toDataURL('image/jpeg',q);}return {mime:'image/jpeg',b64:du.split(',')[1],prev:du};}finally{URL.revokeObjectURL(url);}}
// ---------- hiển thị ----------
function tkBody(s,tags){let h=esc(s);
 h=h.replace(/\b(BK-[A-Z0-9-]+)\b/g,(m,id)=>bkById(id)?`<a data-a="tkLink" data-x="bk:${id}">${id}</a>`:m)
  .replace(/\b([A-Z0-9]{2,8}-\d{6}-(?:DK|XT)-\d{2})\b/g,(m,c)=>`<a data-a="tkLink" data-x="truck:${c}">${c}</a>`)
  .replace(/(^|\s)((?:DK|XT)-\d{2})\b/g,(m,sp,c)=>{const t=tkCtxTruck(c);return t?`${sp}<a data-a="tkLink" data-x="truck:${t.code}">${c}</a>`:m;})
  .replace(/(^|\s)(@[^\s@,.:;!?]+(?: [A-Z0-9]{2,4}(?=\s|$))?)/g,'$1<span class="at">$2</span>');return h;}
function tkCtxTruck(short){let w,d;if(TK.k==='bk'){const b=bkById(TK.r);if(!b)return null;w=b.wh;d=b.date;}else if(TK.k==='truck'){const p=TK.r.split('-');w=p[0];d=TK.d&&TK.d.thread?TK.d.thread.day:null;}else{[w,d]=TK.r.split(':');}
 return d?trucksOf(w,d).find(t=>t.short===short):null;}
A.tkLink=d=>{const [k,id]=String(d.x).split(':');if(k==='bk'){const b=bkById(id);if(b)openBooking(b.id);}else{const t=truckByCode(id);if(t){V.wh=t.wh;V.whAll=false;V.day=t.date;V.view='day';V.modal={type:'truck',code:t.code};afterNav(goMonth(t.date));}}};
const ROLE_S={cs:'CS',sales:'Sales',logistics:'Log',admin:'Admin'};
function tkTimeline(d){const items=d.msgs.map(m=>({at:m.at,m}));
 if(TK.k==='bk')S.audit.filter(a=>a.obj===TK.r).forEach(a=>items.push({at:a.at,e:a.who+': '+a.text}));
 items.sort((a,b)=>a.at-b.at||(a.m?1:-1));const now=Date.now()/60000;
 return items.map(x=>{if(x.e)return `<div class="tev">${clockStr(x.at)} · ${esc(x.e)}</div>`;const m=x.m;const mine=m.by===V.me;
  const rx=Object.entries(m.reacts||{}).filter(([e,u])=>u&&u.length).map(([e,u])=>`<button class="${u.includes(V.me)?'on':''}" data-a="tkReact" data-id="${m.id}" data-e="${e}" title="${esc(u.map(id=>(user(id)||{}).name||'?').join(', '))}">${e} ${u.length}</button>`).join('');
  const canEd=mine&&!m.del&&now-m.at<5;
  const body=TK.edit===m.id?`<textarea id="tk-edit" class="inp" style="width:100%;min-height:50px">${esc(m.body)}</textarea><div class="row" style="gap:4px;margin-top:4px"><button class="btn sm" data-a="tkEditSave">Lưu</button><button class="btn ghost sm" data-a="tkEdit" data-id="">Thôi</button></div>`
   :`<div class="tmb">${m.del?'Tin nhắn đã xóa':tkBody(m.body)}</div>${m.file?`<img data-tkimg="${m.file}" alt="Ảnh đính kèm" data-a="tkImg" data-id="${m.file}" ${TK.img[m.file]?`src="${TK.img[m.file]}"`:''}>`:''}`;
  return `<div class="tmsg ${mine?'me':''} ${m.ask&&!m.del?'ask':''} ${m.del?'del':''}" tabindex="-1"><div class="tmh"><b>${esc(m.byName)}</b>${m.role&&ROLE_S[m.role]?`<span>${ROLE_S[m.role]}</span>`:''}<span>${clockStr(m.at)}</span>${m.edited&&!m.del?'<span>· đã sửa</span>':''}${m.ask&&!m.del?'<span title="Câu hỏi">❓</span>':''}</div>${body}
   ${rx?`<div class="tmr">${rx}</div>`:''}${m.del?'':`<div class="tmact">${['👍','✅','👀','🙏'].map(e=>`<button data-a="tkReact" data-id="${m.id}" data-e="${e}" title="Thả ${e}">${e}</button>`).join('')}${canEd?`<button data-a="tkEdit" data-id="${m.id}" title="Sửa (trong 5 phút)">✏️</button><button data-a="tkDel" data-id="${m.id}" title="Xóa (trong 5 phút)">🗑</button>`:''}</div>`}</div>`;}).join('');}
function tkSeen(d){const last=d.msgs[d.msgs.length-1];if(!last||last.by!==V.me)return '';const r=(d.reads||[]).filter(x=>x.at>=last.at);return r.length?`<div class="tseen">Đã xem · ${r.map(x=>esc(x.name)+' '+clockStr(x.at)).join(', ')}</div>`:'<div class="tseen">Đã gửi</div>';}
function tkRender(){let p=document.getElementById('talkPanel');document.body.classList.toggle('talk-open',TK.open);
 if(!TK.open||!tkCan()){if(p)p.remove();document.body.classList.remove('talk-open');return;}
 const ta0=p&&p.querySelector('.tf textarea');if(ta0)TK.draft=ta0.value;const sc=p&&p.querySelector('.tm');const atBottom=!sc||sc.scrollHeight-sc.scrollTop-sc.clientHeight<40;
 if(!p){p=document.createElement('aside');p.id='talkPanel';p.setAttribute('aria-label','Trao đổi nội bộ');document.body.appendChild(p);}
 const d=TK.d,th=d&&d.thread;const t0={k:TK.k,ref:TK.r,cid:TK.k==='bk'&&bkById(TK.r)?bkById(TK.r).customerId:null,day:TK.k==='truck'?(truckByCode(TK.r)||{}).date:null};
 const title=th?th.title:tkTitle(t0);const stl=!th?'':th.st==='wait'?`<div class="tkst wait">⏳ Chờ <b>${esc((th.wait||[]).map(x=>x.name).join(', ')||'?')}</b> trả lời · ${esc(th.askedBy||'')} hỏi lúc ${clockStr(th.askedAt)}</div>`:th.st==='done'?'<div class="tkst done">✓ Đã xong</div>':th.st==='answered'?'<div class="tkst">✔ Đã trả lời</div>':'';
 TK_QL=tkQuick();
 p.innerHTML=`<div class="th"><div class="row"><span>${tkIcon(TK.k)}</span><b class="t" title="${esc(title)}">${esc(title)}</b>
   <button class="btn ghost sm" data-a="tkGoRef" title="Mở ${TK.k==='bk'?'đơn':TK.k==='truck'?'xe':'ngày'}">Mở</button>
   ${th?`<button class="btn ghost sm" data-a="tkMode" data-v="${th.mode==='mute'?'':th.mode==='follow'?'mute':'follow'}" title="${th.mode==='mute'?'Đang tắt theo dõi – bấm để bật lại':th.mode==='follow'?'Đang theo dõi – bấm để tắt':'Theo dõi để nhận mọi tin mới'}">${th.mode==='mute'?'🔕':th.mode==='follow'?'🔔':'🔔+'}</button>
    ${th.st==='done'?'<button class="btn ghost sm" data-a="tkDone" data-v="open">Mở lại</button>':`<button class="btn ghost sm" data-a="tkDone" data-v="done" title="Đánh dấu đã giải quyết">✓ Xong</button>`}`:''}
   <button class="btn ghost sm" data-a="tkClose" aria-label="Đóng">✕</button></div>
  <span class="tklock">🔒 Nội bộ – khách hàng không thấy</span>${stl}</div>
 ${TK.pinEdit?`<div class="tkpin"><input id="tk-pin" class="inp grow" maxlength="300" value="${esc(th&&th.pin||'')}" placeholder="VD: Khách yêu cầu giao trước 10h, gọi trước 30 phút"><button class="btn sm" data-a="tkPinSave">Ghim</button>${th&&th.pin?'<button class="btn ghost sm" data-a="tkPinDel">Bỏ</button>':''}</div>`
  :th&&th.pin?`<div class="tkpin"><span>📌</span><span class="grow">${esc(th.pin)}<br><span class="small muted">${esc(th.pinBy||'')} · ${clockStr(th.pinAt)}</span></span><button class="btn ghost sm" data-a="tkPinEdit" title="Sửa ghi chú ghim">✏️</button></div>`
  :`<div style="padding:6px 14px 0"><button class="linkbtn small" data-a="tkPinEdit">📌 Ghim ghi chú quan trọng</button></div>`}
 <div class="tm">${!d?'<div class="tev">Đang tải…</div>':d.msgs.length||TK.k==='bk'&&S.audit.some(a=>a.obj===TK.r)?tkTimeline(d)+tkSeen(d):'<div class="tev">Chưa có trao đổi. Gõ câu hỏi, dùng @ để gọi đúng người (VD: @Log '+esc(tkWh())+').</div>'}</div>
 ${TK_QL.length?`<div class="tq">${TK_QL.map((q,i)=>`<button class="${q.r?'r':''}" data-a="tkQ" data-i="${i}" title="${q.t.includes('__')?'Điền rồi gửi':'Bấm là gửi'}">${esc(q.t)}</button>`).join('')}</div>`:''}
 <div class="tf"><textarea class="inp" placeholder="Nhắn nội bộ… @ để gọi tên (Enter gửi, Shift+Enter xuống dòng)" maxlength="2000" ${TK.busy?'disabled':''}>${esc(TK.draft)}</textarea>
  <div class="row">${TK.file?`<span class="tkfile"><img src="${TK.file.prev}" alt="Ảnh sắp gửi"><button data-a="tkFileDel" aria-label="Bỏ ảnh">✕</button></span>`:`<label class="btn ghost sm" title="Gửi ảnh (cuộn móp, phiếu giao…)" style="cursor:pointer">📷<input type="file" accept="image/*" id="tk-file" hidden></label>`}
   <button class="btn ghost sm" data-a="tkAtBtn" title="Gọi tên">@</button><span class="grow"></span><button class="btn sm" data-a="tkSendBtn" ${TK.busy?'disabled':''}>${TK.busy?'Đang gửi…':'Gửi'}</button></div></div>`;
 const tm=p.querySelector('.tm');if(atBottom)tm.scrollTop=tm.scrollHeight;
 p.querySelectorAll('img[data-tkimg]:not([src])').forEach(async im=>{const s=await tkImgSrc(+im.dataset.tkimg);if(s&&im.isConnected){im.src=s;if(atBottom)tm.scrollTop=tm.scrollHeight;}});}
A.tkSendBtn=()=>{const ta=document.querySelector('#talkPanel textarea');if(ta)TK.draft=ta.value;tkSend(null,null);};
A.tkFileDel=()=>{TK.file=null;tkRender();};
A.tkAtBtn=()=>{const ta=document.querySelector('#talkPanel textarea');if(!ta)return;const p=ta.selectionStart;const pre=ta.value.slice(0,p);const add=(pre&&!/\s$/.test(pre)?' ':'')+'@';ta.value=pre+add+ta.value.slice(p);ta.focus();ta.setSelectionRange(p+add.length,p+add.length);tkAtShow(ta);};
document.addEventListener('change',async e=>{if(e.target.id!=='tk-file'||!e.target.files[0])return;try{TK.file=await tkCompress(e.target.files[0]);const ta=document.querySelector('#talkPanel textarea');if(ta)TK.draft=ta.value;tkRender();}catch(x){toast('Không đọc được ảnh.');}});
document.addEventListener('input',e=>{const ta=e.target.closest&&e.target.closest('#talkPanel .tf textarea');if(!ta)return;TK.draft=ta.value;tkAtShow(ta);});
document.addEventListener('paste',async e=>{if(!(e.target.closest&&e.target.closest('#talkPanel')))return;const it=[...(e.clipboardData&&e.clipboardData.items||[])].find(i=>i.type.startsWith('image/'));if(!it)return;e.preventDefault();try{TK.file=await tkCompress(it.getAsFile());tkRender();}catch(x){}});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-tkat]');if(b){e.preventDefault();tkAtPick(+b.dataset.tkat);}});
document.addEventListener('keydown',e=>{const ta=e.target.closest&&e.target.closest('#talkPanel textarea');
 if(ta&&ta.id==='tk-edit'){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();A.tkEditSave();}else if(e.key==='Escape'){e.stopPropagation();TK.edit=null;tkRender();}return;}
 if(ta&&TK.at){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopPropagation();TK.at.i=(TK.at.i+(e.key==='ArrowDown'?1:-1)+TK.at.l.length)%TK.at.l.length;tkAtDraw();return;}
  if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();e.stopPropagation();tkAtPick(TK.at.i);return;}if(e.key==='Escape'){e.stopPropagation();TK.at=null;const b=document.getElementById('tkAt');if(b)b.remove();return;}}
 if(ta&&e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.stopPropagation();TK.draft=ta.value;tkSend(null,null);return;}
 if(e.target.id==='tk-pin'&&e.key==='Enter'){e.preventDefault();e.stopPropagation();A.tkPinSave();return;}
 if(e.key==='Escape'&&TK.open&&e.target.closest&&e.target.closest('#talkPanel')){e.stopPropagation();A.tkClose();}},true);
// cập nhật khi đang mở: 8 giây hỏi "có gì mới"
setInterval(async()=>{if(!TK.open||!S||document.hidden||TK.busy)return;try{const v=await rpc('get_ver');if(!v)return;const key=v.d+':'+v.n;if(TK.ver&&TK.ver!==key)await tkLoad();TK.ver=key;}catch(e){}},8000);
// ---------- gắn vào các màn hình ----------
function tkBadges(){if(!S||!tkCan())return;
 // sidebar
 const sb=document.querySelector('.side [data-v="talk"]');if(sb){const n=tkList().filter(t=>tkNeed(t)||tkUnread(t)).length;let dt=sb.querySelector('.dot');if(n){if(!dt){dt=document.createElement('span');dt.className='dot';sb.appendChild(dt);}dt.textContent=n;}else if(dt)dt.remove();}
 if(V.view==='booking'&&V.bk){const h=document.querySelector('.main .pagehead');if(h&&!h.querySelector('.tkbadge')){const x=document.createElement('span');x.innerHTML=tkBadge('bk',V.bk,'Trao đổi')||'';h.appendChild(x.firstChild||document.createTextNode(''));}
  const cr=document.querySelector('.main .crumb');const t=tkOf('bk',V.bk);if(cr&&t&&t.pin&&!document.querySelector('.main .tkpin')){const el=document.createElement('div');el.className='tkpin';el.style.margin='8px 0';el.innerHTML=`<span>📌</span><span class="grow">${esc(t.pin)}</span>`;cr.after(el);}}
 if(V.view==='day'){const dh=document.querySelector('.main .dayhead');if(dh&&!dh.querySelector('.tkbadge')){const x=document.createElement('span');x.innerHTML=tkBadge('day',V.wh+':'+V.day,'Trao đổi ngày');if(x.firstChild)dh.appendChild(x.firstChild);}
  document.querySelectorAll('.main .tcard[data-c]').forEach(c=>{const acts=c.querySelector('.tc-acts');if(!acts||acts.querySelector('.tkbadge'))return;const code=c.dataset.c;const x=document.createElement('span');x.innerHTML=tkBadge('truck',code,'');if(x.firstChild)acts.appendChild(x.firstChild);
   const pins=liveAllocsOnTruck(code).map(a=>tkOf('bk',a.bk)).filter(t=>t&&t.pin);if(pins.length&&!c.querySelector('.tkpinl')){const el=document.createElement('div');el.innerHTML=pins.slice(0,2).map(t=>`<div class="tkpinl" title="${esc(t.ref+': '+t.pin)}">📌 ${esc(t.pin)}</div>`).join('');acts.before(el);}});}
 document.querySelectorAll('.main .pitem').forEach(pi=>{if(pi.querySelector('.tkbadge,.tkpinl'))return;const m=pi.textContent.match(/\b(BK-[A-Z0-9-]+)\b/);if(!m)return;const id=m[1];const row=pi.querySelector('.small.muted');
  const x=document.createElement('span');x.innerHTML=tkBadge('bk',id,'');if(x.firstChild&&row){row.append(' ');row.appendChild(x.firstChild);}const pl=tkPinLine('bk',id);if(pl&&row)row.insertAdjacentHTML('afterend',pl);});}
{const r0=render;render=function(){r0();tkBadges();tkRender();};}
// xe: nút Trao đổi trong hộp thoại xe
{const m0=mTruck;mTruck=function(){const h=m0();if(!tkCan()||!V.modal||!V.modal.code)return h;return h.replace(/(<div class="mhead">[\s\S]*?)(<\/div>)/,`$1${tkBadge('truck',V.modal.code,'Trao đổi')||''}$2`);};}
// ---------- hộp Trao đổi ----------
NAV.splice(4,0,{v:'talk',label:'Trao đổi nội bộ',ic:'talk',ok:()=>tkCan()});
{const m0=mainView;mainView=function(){if(V.view==='talk'&&tkCan())return vTalk();return m0();};}
function vTalk(){const all=tkList();const tabs=[['need','Cần tôi trả lời',all.filter(tkNeed)],['asked','Tôi đã hỏi',all.filter(t=>t.askedBy===V.me&&t.st!=='done')],['mine','Đang theo',all.filter(t=>t.inv)],['all','Tất cả',all]];
 const cur=tabs.find(t=>t[0]===TK.tab)||tabs[0];let l=cur[2];if(TK.wh)l=l.filter(t=>t.wh===TK.wh);
 const nperm=typeof Notification!=='undefined'?Notification.permission:'unsupported';
 return `<div class="panel"><div class="pagehead"><h2>💬 TRAO ĐỔI NỘI BỘ</h2><span class="tklock" style="margin:0">🔒 Khách hàng không thấy</span><span class="grow"></span>
  ${nperm==='unsupported'?'':nperm==='granted'&&tkNotifOn()?'<button class="btn ghost sm" data-a="tkNotif" data-v="0" title="Đang hiện thông báo trên máy khi ứng dụng chạy nền">🔔 Thông báo trên máy: Bật</button>':'<button class="btn ghost sm" data-a="tkNotif" data-v="1">🔔 Bật thông báo trên máy</button>'}</div>
 <p class="small muted" style="margin:0 0 8px">Hỏi đáp gắn với đơn, xe hoặc ngày-kho. Mở chi tiết booking / xe / ngày rồi bấm <b>💬 Trao đổi</b> để bắt đầu. Phím tắt <b>G H</b>.</p>
 <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${tabs.map(([k,lb,x])=>`<button class="btn ghost sm ${cur[0]===k?'on':''}" data-a="tkTab" data-v="${k}">${lb}${x.length?` <b class="num">${x.length}</b>`:''}</button>`).join('')}
  <span class="grow"></span><select class="inp" style="width:auto" data-a="tkWhSel" aria-label="Kho"><option value="">Tất cả kho</option>${WH.map(w=>`<option value="${w.id}" ${TK.wh===w.id?'selected':''}>${esc(w.id)}</option>`).join('')}</select></div>
 ${l.length?l.map(t=>`<div class="tkrow ${tkUnread(t)||tkNeed(t)?'un':''}" data-a="tkOpen" data-k="${t.k}" data-r="${esc(t.ref)}" role="button" tabindex="0"><span class="ic">${tkIcon(t.k)}</span>
   <div class="grow"><div class="row" style="gap:6px;flex-wrap:wrap"><b>${esc(tkTitle(t))}</b>${t.st==='wait'?`<span class="st st-hold">${tkNeed(t)?'Chờ bạn trả lời':'Chờ trả lời'}</span>`:t.st==='done'?'<span class="st st-ok">Đã xong</span>':t.st==='answered'?'<span class="st st-loaded">Đã trả lời</span>':''}</div>
    <div class="l">${esc(t.lastBy||'')}: ${esc(t.lastText||'')}</div>${t.pin?`<div class="tkpinl">📌 ${esc(t.pin)}</div>`:''}</div>
   <div style="text-align:right;flex:none"><div class="small muted">${clockStr(t.lastAt)}</div>${tkUnread(t)?`<span class="tkn">${t.unread}</span>`:''}</div></div>`).join('')
  :`<div class="empty">${cur[0]==='need'?'Không có câu hỏi nào đang chờ bạn. 👍':'Chưa có trao đổi.'}</div>`}</div>`;}
A.tkTab=d=>{TK.tab=d.v;render();};
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.a==='tkWhSel'){TK.wh=e.target.value;render();}});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('tkrow')){e.preventDefault();A.tkOpen({k:e.target.dataset.k,r:e.target.dataset.r});}});
if(typeof SC!=='undefined')SC.push(['goTalk','global','Mở Trao đổi nội bộ','G H',()=>tkCan()&&go('talk')]);
// thông báo: mở thẳng trao đổi
{const o0=A.openNotif;A.openNotif=d=>{const n=S.notifs.find(x=>String(x.id)===String(d.id));const L=n&&n.link||{};if(!L.talk)return o0(d);
 if(!n.read){n.read=true;rpc('mark_notifs_read',{p_ids:[n.id]}).catch(()=>{});}A.tkOpen({k:L.talk.k,r:L.talk.r});};}
// ---------- thông báo trên máy (khi ứng dụng chạy nền / tab khác) ----------
const tkNotifOn=()=>{try{return localStorage.getItem('tcp-notif')==='1';}catch(e){return false;}};
A.tkNotif=async d=>{if(d.v==='0'){try{localStorage.setItem('tcp-notif','0');}catch(e){}render();return;}
 if(typeof Notification==='undefined'){toast('Trình duyệt không hỗ trợ thông báo.');return;}const p=await Notification.requestPermission();
 if(p!=='granted'){toast('Bạn chưa cho phép thông báo. Bấm biểu tượng ổ khóa cạnh địa chỉ trang → Thông báo → Cho phép.');return;}
 try{localStorage.setItem('tcp-notif','1');}catch(e){}tkShowNote({id:0,type:'Trao đổi',text:'Đã bật thông báo trên máy. Khi có tin mới lúc bạn đang ở tab khác, thông báo sẽ hiện ở đây.',link:null});render();};
const TKN={last:null};
async function tkShowNote(n){const title='[Đặt Xe] '+n.type;const opt={body:n.text,tag:'tcp-'+n.id,data:{link:n.link||null,id:n.id},icon:'icon-192.png',badge:'icon-192.png'};
 try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg&&reg.showNotification){await reg.showNotification(title,opt);return;}}catch(e){}
 try{const x=new Notification(title,opt);x.onclick=()=>{window.focus();tkOpenLink(n.link,n.id);x.close();};}catch(e){}}
function tkOpenLink(L,id){if(!L||!S)return;if(id&&S.notifs.some(x=>x.id===id))return A.openNotif({id});if(L.talk)return A.tkOpen({k:L.talk.k,r:L.talk.r});if(L.bk&&bkById(L.bk))openBooking(L.bk);}
setInterval(async()=>{if(!S||!tkNotifOn()||typeof Notification==='undefined'||Notification.permission!=='granted')return;
 if(TKN.last==null)TKN.last=Math.max(0,...S.notifs.map(n=>+n.id||0));if(!document.hidden){TKN.last=Math.max(TKN.last,...S.notifs.map(n=>+n.id||0));return;}
 try{const l=await rpc('my_new_notifs',{p_after:TKN.last});for(const n of l||[]){TKN.last=Math.max(TKN.last,n.id);await tkShowNote(n);}}catch(e){}},45000);
if(navigator.serviceWorker)navigator.serviceWorker.addEventListener('message',e=>{const d=e.data||{};if(d.type==='open-notif'){window.focus();reload().then(()=>{render();tkOpenLink(d.link,d.id);}).catch(()=>tkOpenLink(d.link,d.id));}});
// ---------- trợ lý: bấm ra ngoài thì tự thu gọn; công cụ Trao đổi ----------
document.addEventListener('mousedown',e=>{if(typeof CHAT==='undefined'||!CHAT.open)return;const t=e.target;if(!t.closest||t.closest('#chatPanel,#chatFab,#cellMenu'))return;CHAT.open=false;if(CHAT.busy)CHAT.dot=true;chatRender();},true);
if(typeof TOOLS!=='undefined'){
 const tkRef=a=>{if(a.booking_id||a.id){const id=String(a.booking_id||a.id).trim().toUpperCase();return ['bk',id];}if(a.truck){const t=truckByCode(a.truck);return t?['truck',t.code]:null;}if(a.date){const d=dateArg(a.date);return d?['day',(whArg(a.wh)||V.wh)+':'+d]:null;}return null;};
 TOOLS.talk_pending={d:'Trao đổi nội bộ đang chờ tôi trả lời / có tin chưa đọc / tôi đã hỏi chưa ai trả lời. args: không',ok:tkCan,run:async()=>({cho_toi_tra_loi:tkList().filter(tkNeed).map(t=>({tieu_de:tkTitle(t),loai:t.k,ma:t.ref,tin_cuoi:t.lastBy+': '+t.lastText})),
  chua_doc:tkList().filter(t=>tkUnread(t)&&!tkNeed(t)).map(t=>({tieu_de:tkTitle(t),loai:t.k,ma:t.ref,so_tin:t.unread})),toi_da_hoi:tkList().filter(t=>t.askedBy===V.me&&t.st==='wait').map(t=>({tieu_de:tkTitle(t),loai:t.k,ma:t.ref})),
  ghi_chu:'Link mở trao đổi: [tiêu đề](#talk:loai:ma)'})};
 TOOLS.talk_read={d:'Đọc trao đổi nội bộ để tóm tắt. args: booking_id, hoặc truck (mã xe đầy đủ), hoặc date + wh (trao đổi theo ngày)',ok:tkCan,run:async a=>{const r=tkRef(a);if(!r)return {loi:'Thiếu booking_id / truck / date'};
  try{const d=await rpc('talk_get',{p_kind:r[0],p_ref:r[1]});if(!d.thread)return {loi:'Chưa có trao đổi nào.'};
   return {tieu_de:d.thread.title,trang_thai:{wait:'chờ trả lời',answered:'đã trả lời',done:'đã xong',open:'đang trao đổi'}[d.thread.st],dang_cho:(d.thread.wait||[]).map(x=>x.name),ghim:d.thread.pin||'',
    tin:d.msgs.filter(m=>!m.del).slice(-30).map(m=>({luc:clockStr(m.at),nguoi:m.byName,noi_dung:m.body||'(ảnh)',hoi:m.ask})),link:`#talk:${r[0]}:${r[1]}`};}catch(e){return {loi:e.message};}}};
 TOOLS.talk_draft={d:'Soạn sẵn câu hỏi trong Trao đổi nội bộ (người dùng tự bấm Gửi). args: booking_id (hoặc truck / date+wh), text, to ("log" | "cs" | "sales")',ok:tkCan,run:async a=>{const r=tkRef(a);if(!r)return {loi:'Thiếu booking_id / truck / date'};
  if(r[0]==='bk'&&!bkById(r[1]))return {loi:'Không tìm thấy booking'};chatAway();await A.tkOpen({k:r[0],r:r[1],text:String(a.text||'').slice(0,2000),tag:['log','cs','sales'].includes(a.to)?a.to:null});
  return {da_mo:true,ghi_chu:'Đã mở khung Trao đổi với câu soạn sẵn; người dùng kiểm tra rồi bấm Gửi.'};}};
 STEP.talk_pending='Xem trao đổi đang chờ';STEP.talk_read='Đọc trao đổi';STEP.talk_draft='Soạn câu hỏi nội bộ';
 {const g0=chatGo;chatGo=function(k){const s=String(k);if(s.startsWith('talk:')){const [,kk,...rest]=s.split(':');const r=rest.join(':');return A.tkOpen({k:kk,r});}return g0(k);};}
 {const s0=sysPrompt;sysPrompt=function(){const s=s0();return tkCan()?s+'\nTRAO ĐỔI NỘI BỘ: hỏi "có ai hỏi tôi không", "tóm tắt trao đổi đơn X" → dùng talk_pending / talk_read; muốn hỏi Log / CS / Sales về một đơn → talk_draft (chỉ soạn sẵn, KHÔNG nói đã gửi). Link: [tiêu đề](#talk:bk:MÃ_BOOKING).':s;};}
}
// Cấu hình → Chung: nhắc câu hỏi chưa trả lời
{const r0=render;render=function(){r0();if(!S||V.view!=='config'||(V.cfgTab||'general')!=='general'||!can('config.general'))return;const host=document.querySelector('.main .panel .fgrid');if(!host||document.querySelector('.tkcfg'))return;
 const card=document.createElement('div');card.className='pkcard tkcfg';card.innerHTML=`<h4>💬 Trao đổi nội bộ</h4><div class="fgrid"><div class="field"><label for="cf-talkRemindHours">Nhắc người được hỏi nếu chưa trả lời sau</label><div class="row" style="flex-wrap:nowrap"><input id="cf-talkRemindHours" class="inp num" inputmode="decimal" data-f="cfg" data-k="talkRemindHours" value="${S.cfg.talkRemindHours||2}"><span class="muted small">giờ · gấp đôi thời gian này báo trưởng nhóm + Admin (7h–20h)</span></div></div></div>`;
 host.parentNode.insertBefore(card,host);};}
