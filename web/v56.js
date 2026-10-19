// v3.43: chọn mô hình AI cho trợ lý – Miễn phí (Workers AI) hoặc Claude (Anthropic API) bật theo thời hạn, có hạn mức lượt / ngày.
(()=>{const st=document.createElement('style');st.textContent=`
.ai56{margin:10px 0 4px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;display:grid;gap:8px}
.ai56 h5{margin:0;font-size:13px}.ai56 .row{gap:8px;flex-wrap:wrap;align-items:center}
.ai56 .st{font-size:13px}.ai56 .st b{color:var(--ink)}.ai56 .warn{color:var(--bad);font-size:12px}
.ai56 button[disabled]{opacity:.5;cursor:not-allowed}
.aib56{margin-left:8px;padding:1px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;vertical-align:middle;background:var(--sand);color:var(--muted);border:1px solid var(--line)}
.aib56.on{background:var(--navy,#232d40);color:#fff;border-color:transparent}
`;document.head.appendChild(st);})();
const AI56={key:null};
const aiOn56=()=>!!(S&&S.cfg&&S.cfg.aiEngine==='claude'&&S.cfg.aiUntil&&new Date(S.cfg.aiUntil).getTime()>Date.now());
const aiModel56=()=>(S&&S.cfg&&S.cfg.aiModel)==='sonnet'?'sonnet':'haiku';
const aiLabel56=()=>aiOn56()?'Claude '+(aiModel56()==='sonnet'?'Sonnet':'Haiku'):'Miễn phí (Llama)';
const hhmm56=d=>new Date(d).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'});
// số giờ tới 23:59 hôm nay (giờ VN), tối đa 12
const toEod56=()=>{const n=new Date();const vn=new Date(n.toLocaleString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}));const e=new Date(vn);e.setHours(23,59,0,0);return Math.max(0.5,Math.min(12,Math.round((e-vn)/360000)/10));};
// nhãn mô hình ở đầu khung chat
{const c0=chatRender;chatRender=function(){const r=c0.apply(this,arguments);const h=document.querySelector('#chatPanel .ch b');
 if(h){let b=h.querySelector('.aib56');if(!b){b=document.createElement('span');b.className='aib56';h.appendChild(b);}
  const on=CHAT.engine?CHAT.engine==='claude':aiOn56();b.classList.toggle('on',on);b.textContent=on?'✦ Claude':'Miễn phí';
  b.title=CHAT.note||(on?'Đang dùng '+aiLabel56()+(S.cfg.aiUntil?' đến '+hhmm56(S.cfg.aiUntil):''):'Đang dùng mô hình miễn phí');}
 return r;};}
// khi Admin đổi mô hình (cấu hình tải lại) → nhãn theo cấu hình mới cho tới câu trả lời kế tiếp
{const r0=render;render=function(){const was=AI56.last;r0();const now=aiLabel56();if(was&&was!==now){CHAT.engine='';CHAT.note='';if(typeof chatRender==='function'&&document.getElementById('chatPanel'))chatRender();}AI56.last=now;
 if(!S||role()!=='admin'||V.view!=='config'||(V.cfgTab||'general')!=='general')return;const card=document.querySelector('.chatcfg');if(!card||card.querySelector('.ai56'))return;
 const on=aiOn56(),m=aiModel56(),C=S.cfg;const box=document.createElement('div');box.className='ai56';
 box.innerHTML=`<h5>Mô hình AI</h5>
  <div class="row"><label class="row" style="gap:4px"><input type="radio" name="ai56e" value="free" ${on?'':'checked'}> Miễn phí – Llama (Cloudflare)</label>
   <label class="row" style="gap:4px"><input type="radio" name="ai56e" value="claude" ${on?'checked':''}> Claude – thông minh hơn, trả phí theo lượt</label></div>
  <div class="row"><label for="ai56m" class="small">Loại Claude</label><select id="ai56m" class="inp" style="width:auto"><option value="haiku" ${m==='haiku'?'selected':''}>Haiku – nhanh, rẻ</option><option value="sonnet" ${m==='sonnet'?'selected':''}>Sonnet – thông minh nhất</option></select>
   <span class="small">Bật trong:</span><button type="button" class="btn sm" data-ai56="2">2 giờ</button><button type="button" class="btn ghost sm" data-ai56="4">4 giờ</button><button type="button" class="btn ghost sm" data-ai56="eod">Đến hết ngày</button></div>
  <div class="st" id="ai56st">${on?`Đang dùng: <b>${aiLabel56()}</b> · tự tắt lúc ${hhmm56(C.aiUntil)} <button type="button" class="btn ghost sm" data-ai56="off">Tắt ngay</button>`:'Đang dùng: <b>Miễn phí (Llama)</b>'}</div>
  <div class="row"><label for="ai56d" class="small">Hạn mức lượt Claude / ngày (toàn hệ thống)</label><input id="ai56d" class="inp num" style="width:90px" inputmode="numeric" value="${C.aiClaudeDaily||200}"><span class="small muted" id="ai56n">Hôm nay: … lượt Claude</span></div>
  <div class="warn" id="ai56k" hidden>Chưa cài khóa Anthropic trên Cloudflare (biến ANTHROPIC_API_KEY): bật Claude sẽ vẫn dùng mô hình miễn phí.</div>`;
 const anchor=card.querySelector('[data-a="ev55Open"]');card.insertBefore(box,anchor||null);
 rpc('chat_stats').then(s=>{const e=document.getElementById('ai56n');if(e)e.textContent='Hôm nay: '+(s.claudeToday||0)+' / '+(C.aiClaudeDaily||200)+' lượt Claude';}).catch(()=>{});
 const showKey=()=>{const e=document.getElementById('ai56k');if(e)e.hidden=AI56.key!==false;};
 if(AI56.key===null)fetch(CHAT.api,{method:'GET'}).then(r=>r.json()).then(j=>{AI56.key=j&&typeof j.claudeKey==='boolean'?j.claudeKey:undefined;showKey();}).catch(()=>{AI56.key=undefined;});else showKey();};}
document.addEventListener('click',e=>{const b=e.target.closest('[data-ai56]');if(!b)return;const v=b.dataset.ai56;
 if(v==='off')return mutate('set_ai',{p_engine:'free'},{ok:()=>toast('Đã chuyển trợ lý về mô hình miễn phí')});
 const sel=document.querySelector('input[name="ai56e"]:checked');if(sel&&sel.value==='free'){document.querySelector('input[name="ai56e"][value="claude"]').checked=true;}
 const h=v==='eod'?toEod56():+v;const m=(document.getElementById('ai56m')||{}).value||'haiku';
 mutate('set_ai',{p_engine:'claude',p_model:m,p_hours:h},{ok:()=>toast('Đã bật Claude '+(m==='sonnet'?'Sonnet':'Haiku')+' trong '+String(h).replace('.',',')+' giờ')});});
document.addEventListener('change',e=>{const t=e.target;
 if(t.name==='ai56e'&&t.value==='free'&&aiOn56())mutate('set_ai',{p_engine:'free'},{ok:()=>toast('Đã chuyển trợ lý về mô hình miễn phí')});
 if(t.id==='ai56m'&&aiOn56()){const left=(new Date(S.cfg.aiUntil)-Date.now())/3600000;mutate('set_ai',{p_engine:'claude',p_model:t.value,p_hours:Math.max(0.5,Math.round(left*10)/10)},{ok:()=>toast('Đã đổi sang Claude '+(t.value==='sonnet'?'Sonnet':'Haiku'))});}
 if(t.id==='ai56d'){const n=parseInt(t.value,10);if(!(n>=1&&n<=5000))return toast('Hạn mức phải từ 1 đến 5000 lượt');mutate('set_ai',{p_engine:null,p_daily:n},{ok:()=>toast('Đã lưu hạn mức '+n+' lượt Claude / ngày')});}});
// Kiểm thử trợ lý: ghi mô hình của mỗi lần chạy
if(typeof ev55Run==='function'){const e0=ev55Run;ev55Run=async function(){EV55.model=aiLabel56();return e0.apply(this,arguments);};}
