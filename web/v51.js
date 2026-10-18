// v3.32: nút "Cài lên điện thoại" – Android/Chrome/Edge bấm là cài; iPhone hiện hướng dẫn 3 bước (Safari → Chia sẻ → Thêm vào MH chính)
(()=>{const st=document.createElement('style');st.textContent=`
#instbar{position:fixed;left:12px;right:84px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:89;display:flex;gap:10px;align-items:center;padding:10px 12px 10px 14px;border-radius:12px;background:var(--navy);color:var(--on-navy);box-shadow:var(--shadow);font-size:13.5px;max-width:480px;gap:8px!important}#instbar span{flex:1}
#instbar button{border:0;border-radius:8px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer;min-height:36px;white-space:nowrap}#instbar .go{background:#fff;color:var(--navy)}#instbar .x{background:transparent;color:inherit;opacity:.8}
.inststeps{display:grid;gap:10px;margin:10px 0 4px;padding:0;list-style:none;counter-reset:s}
.inststeps li{display:flex;gap:10px;align-items:flex-start;counter-increment:s}.inststeps li::before{content:counter(s);flex:0 0 26px;height:26px;border-radius:50%;background:var(--navy);color:var(--on-navy);display:grid;place-items:center;font-weight:700;font-size:13px}
.inststeps .ico{display:inline-flex;vertical-align:-5px;padding:2px 5px;border:1px solid var(--line);border-radius:6px;background:var(--surface)}
`;document.head.appendChild(st);})();
const INST={ev:null,done:false};
const instStandalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}catch(e){return false;}};
const instIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const instIOSSafari=()=>instIOS()&&!/CriOS|FxiOS|EdgiOS|Zalo|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent);
const instMobile=()=>instIOS()||/Android/i.test(navigator.userAgent);
const instCan=()=>!INST.done&&!instStandalone()&&(!!INST.ev||instMobile());
addEventListener('beforeinstallprompt',e=>{e.preventDefault();INST.ev=e;if(S)render();});
addEventListener('appinstalled',()=>{INST.done=true;INST.ev=null;instBarHide();if(S){toast('Đã cài Đặt Xe lên máy. Lần sau mở từ biểu tượng trên màn hình chính.');render();}});
const instLS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};
A.instGo=async()=>{instBarHide();instLS('tcp-inst-nag',String(Date.now()));
 if(INST.ev){const e=INST.ev;INST.ev=null;try{await e.prompt();const r=await e.userChoice;if(r&&r.outcome==='accepted')INST.done=true;}catch(x){}render();return;}
 V.menu=false;V.modal={type:'inst'};render();};
const SHARE_SVG='<svg width="16" height="18" viewBox="0 0 16 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11V1.5M4.5 4.5 8 1l3.5 3.5"/><path d="M5 7H2.5v9.5h11V7H11"/></svg>';
M29.inst=function(){const ios=instIOS();
 const body=ios?(instIOSSafari()
  ?`<ol class="inststeps"><li><span>Bấm nút <b>Chia sẻ</b> <span class="ico">${SHARE_SVG}</span> ở thanh dưới của Safari (iPad: góc trên bên phải).</span></li>
    <li><span>Kéo xuống, chọn <b>Thêm vào MH chính</b> <span class="ico">＋</span>.</span></li><li><span>Bấm <b>Thêm</b>. Biểu tượng <b>Đặt Xe</b> xuất hiện trên màn hình chính.</span></li></ol>`
  :`<p>iPhone chỉ cài được khi mở bằng <b>Safari</b>.</p><ol class="inststeps"><li><span>Bấm <b>Sao chép link</b> bên dưới.</span></li><li><span>Mở <b>Safari</b>, dán link vào ô địa chỉ, đăng nhập.</span></li><li><span>Bấm lại <b>📲 Cài lên điện thoại</b> trong menu tên của bạn.</span></li></ol>
   <div class="row" style="gap:6px;flex-wrap:nowrap"><input class="inp grow" id="inst-url" readonly value="${esc(location.origin+location.pathname)}"><button class="btn sm" data-a="instCopy">Sao chép link</button></div>`)
  :`<ol class="inststeps"><li><span>Mở trang này bằng <b>Chrome</b>.</span></li><li><span>Bấm <b>⋮</b> ở góc trên bên phải.</span></li><li><span>Chọn <b>Cài đặt ứng dụng</b> (hoặc <b>Thêm vào màn hình chính</b>) → <b>Cài đặt</b>.</span></li></ol>`;
 return `<div class="mhead"><h2>📲 CÀI ĐẶT XE LÊN ĐIỆN THOẠI</h2></div><p class="small">Mở nhanh từ màn hình chính, toàn màn hình như ứng dụng, không cần tải từ kho ứng dụng. Đăng nhập một lần là lần sau vào thẳng.</p>${body}
 <div class="mfoot"><button class="btn sm" data-a="close">Đã hiểu</button></div>`;};
A.instCopy=async()=>{const i=document.getElementById('inst-url');try{await navigator.clipboard.writeText(i.value);toast('Đã sao chép link');}catch(e){i.select();document.execCommand('copy');toast('Đã sao chép link');}};
// dải nhắc một lần trên điện thoại (bấm "Để sau" → 14 ngày không nhắc)
function instBarHide(){const b=document.getElementById('instbar');if(b)b.remove();}
A.instLater=()=>{instLS('tcp-inst-nag',String(Date.now()));instBarHide();};
function instBar(){if(document.getElementById('instbar')||!S||!instMobile()||!instCan()||V.modal)return;
 const last=+instLS('tcp-inst-nag')||0;if(Date.now()-last<14*864e5)return;
 if(!instBar.at)instBar.at=Date.now();if(Date.now()-instBar.at<4000){setTimeout(instBar,4100);return;} // để người dùng thấy màn hình trước
 const b=document.createElement('div');b.id='instbar';b.setAttribute('role','status');
 b.innerHTML='<span>📲 Cài Đặt Xe lên màn hình chính để mở nhanh</span><button class="go" data-a="instGo">Cài</button><button class="x" data-a="instLater">Để sau</button>';document.body.appendChild(b);}
{const r0=render;render=function(){r0();if(!S)return;
 const m=document.querySelector('.top .menu');
 if(m&&instCan()&&!m.querySelector('.instlink')){const a=document.createElement('button');a.className='instlink';a.dataset.a='instGo';a.textContent='📲 Cài lên điện thoại';
  a.style.cssText='display:block;width:100%;text-align:left;padding:8px 12px;background:none;border:0;color:inherit;font:inherit;font-weight:600;cursor:pointer';
  const lo=m.querySelector('.uatlink')||m.querySelector('[data-a="logout"]');m.insertBefore(a,lo||null);}
 instBar();};}
