// v3.45: trợ lý bền hơn
// - segment chỉ nhận DD / DA / EX (hiểu "dân dụng", "dự án", "xuất khẩu"); giá trị bịa bị bỏ và báo lại
// - tra Hướng dẫn bằng cả câu gốc người dùng gõ (mô hình nhỏ hay làm hỏng dấu tiếng Việt trong từ khóa)
// - hiện rõ khi Claude đang bật mà câu trả lời lại do mô hình miễn phí (Claude lỗi): nhãn cam + lý do; Admin thấy lỗi gần nhất
// - Kiểm thử trợ lý ghi mô hình thực sự trả lời từng câu
const SEG58=v=>{const k=fz(String(v||'')).replace(/[^a-z]/g,'');return /^(dd|dandung)$/.test(k)?'DD':/^(da|duan)$/.test(k)?'DA':/^(ex|xuatkhau|export)$/.test(k)?'EX':null;};
if(TOOLS.stats){const r0=TOOLS.stats.run;TOOLS.stats.run=async a=>{a={...(a||{})};let warn='';
 if(a.segment!=null&&a.segment!==''){const g=SEG58(a.segment);if(g)a.segment=g;else{warn='Bỏ qua segment "'+a.segment+'" (chỉ có DD = Dân dụng, DA = Dự án, EX = Xuất khẩu; không truyền segment nếu người hỏi không nêu).';delete a.segment;}}
 const res=await r0(a);return warn&&res&&typeof res==='object'?{...res,canh_bao:[res.canh_bao,warn].filter(Boolean).join(' ')}:res;};}
if(TOOLS.guide){const g0=TOOLS.guide.run;TOOLS.guide.run=async a=>{const lastU=[...CHAT.msgs].reverse().find(m=>m.role==='user');
 const r1=await g0(a);const r2=lastU&&fz(lastU.content)!==fz((a&&a.q)||'')?await g0({q:lastU.content}):[];
 const L1=Array.isArray(r1)?r1:(r1&&r1.ket_qua)||[];const L2=Array.isArray(r2)?r2:[];if(!Array.isArray(r1)&&r1&&r1.loi&&!L2.length)return r1;
 const seen=new Set(),out=[];for(const x of [...L2,...L1])if(x&&!seen.has(x.id)){seen.add(x.id);out.push(x);}return out.slice(0,3);};}
// nhãn khung chat: Claude bật mà câu trả lời do mô hình miễn phí → cam + lý do
const ERR58={get(){try{return JSON.parse(localStorage.getItem('ai58-err')||'null');}catch(e){return null;}},set(v){try{localStorage.setItem('ai58-err',JSON.stringify(v));}catch(e){}}};
{const c0=callAI;callAI=async function(){const t=await c0.apply(this,arguments);if(CHAT.note&&/Claude|ANTHROPIC/.test(CHAT.note))ERR58.set({at:Date.now(),note:CHAT.note});return t;};}
{const c0=chatRender;chatRender=function(){const r=c0.apply(this,arguments);const b=document.querySelector('#chatPanel .aib56');
 if(b){const fell=aiOn56()&&CHAT.engine==='free';b.classList.toggle('warn58',fell);if(fell){b.textContent='Miễn phí (Claude lỗi)';b.title=CHAT.note||'Claude đang bật nhưng câu trả lời do mô hình miễn phí.';}}return r;};}
(()=>{const st=document.createElement('style');st.textContent=`.aib56.warn58{background:var(--warn-bg,#fff1e0);color:var(--warn,#a5521b);border-color:var(--warn,#a5521b)}
.ai58e{font-size:12px;color:var(--bad,#b3261e);word-break:break-word}`;document.head.appendChild(st);})();
// Admin: lỗi Claude gần nhất (ghi trên máy này)
{const r0=render;render=function(){r0();const box=document.querySelector('.chatcfg .ai56');if(!box||box.querySelector('.ai58e'))return;const e=ERR58.get();if(!e)return;
 const d=document.createElement('div');d.className='ai58e';d.textContent='Lỗi Claude gần nhất ('+new Date(e.at).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})+'): '+e.note;box.appendChild(d);};}
// Kiểm thử trợ lý: mô hình thực sự trả lời từng câu
if(typeof ev55One==='function'){const o=ev55One;ev55One=async function(it){CHAT.engine='';CHAT.note='';const r=await o.apply(this,arguments);
 r.eng=CHAT.engine==='claude'?'Claude '+(CHAT.model==='sonnet'?'Sonnet':'Haiku'):CHAT.engine==='free'?'Miễn phí':'';
 if(r.st!=='skip'&&aiOn56()&&CHAT.engine==='free'){r.why=[...(r.why||[]),'Claude lỗi → trả lời bằng mô hình miễn phí'+(CHAT.note?' ('+CHAT.note+')':'')];r.st='bad';}return r;};}
if(typeof ev55Tsv==='function'){ev55Tsv=function(){return ['Mô hình chọn: '+(EV55.model||''),'Nhóm\tCâu hỏi\tKết quả\tLý do\tMô hình trả lời\tCông cụ đã gọi\tCâu trả lời\tThời gian (s)',
 ...EV55.res.map(r=>[r.g,r.q,r.st==='ok'?'ĐẠT':r.st==='skip'?'BỎ QUA':'TRƯỢT',(r.why||[]).join('; '),r.eng||'',(r.tools||[]).join(' | '),String(r.ans||'').replace(/\s+/g,' '),r.ms?(r.ms/1000).toFixed(1):''].join('\t'))].join('\n');};}
