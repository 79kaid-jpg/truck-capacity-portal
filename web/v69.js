// v3.57: Điện thoại – menu dạng bảng trượt từ dưới lên (bottom sheet).
// Menu "Thêm" ở thanh dưới, menu ⋯ của chi tiết booking và bảng Bộ lọc (Thống kê) cùng một kiểu:
// trượt lên, nền tối phía sau, thanh kéo; đóng khi vuốt xuống, chạm nền tối, chọn một mục, bấm lại nút, hoặc đổi màn.
// Sửa lỗi: chọn một mục trong menu Thêm thì menu không tự đóng.
(()=>{const st=document.createElement('style');st.textContent=`
.dim69{display:none}
@media (max-width:700px){
 .dim69{display:block;position:fixed;inset:0;z-index:61;background:rgba(10,15,22,.45);animation:fi69 .18s ease-out}
 .more61,.menu68{position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:0!important;z-index:62!important;
  min-width:0!important;max-width:none!important;max-height:80vh;overflow:auto;border-radius:16px 16px 0 0!important;border:0!important;
  padding:6px 8px calc(10px + env(safe-area-inset-bottom,0px))!important;box-shadow:0 -8px 30px rgba(0,0,0,.25)!important;touch-action:pan-y}
 .more61::before,.menu68::before,.scrim:has(.dzf67) .modal::before{content:"";display:block;flex:none;width:40px;height:5px;margin:4px auto 8px;border-radius:3px;background:var(--line)}
 .in69{animation:up69 .22s cubic-bezier(.2,.8,.2,1)}
 .scrim:has(.dzf67){align-items:flex-end!important;padding:0!important}
 .scrim:has(.dzf67) .modal{width:100%!important;max-width:none!important;border-radius:16px 16px 0 0!important;margin:0!important;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;touch-action:pan-y}
}
@keyframes up69{from{transform:translateY(100%)}to{transform:none}}
@keyframes fi69{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.in69,.dim69{animation:none!important}}`;document.head.appendChild(st);})();

const ph69=()=>matchMedia('(max-width:700px)').matches;
// kéo xuống để đóng: theo ngón tay; quá 1/3 chiều cao hoặc vuốt nhanh thì đóng, không thì bật lại
function drag69(el,close){if(!el||el.dataset.d69)return;el.dataset.d69='1';let y0=0,t0=0,dy=0,on=false;
 el.addEventListener('touchstart',e=>{if(el.scrollTop>0||e.touches.length!==1)return;on=true;y0=e.touches[0].clientY;t0=Date.now();dy=0;el.style.transition='none';},{passive:true});
 el.addEventListener('touchmove',e=>{if(!on)return;dy=Math.max(0,e.touches[0].clientY-y0);if(dy>0){el.style.transform=`translateY(${dy}px)`;if(e.cancelable)e.preventDefault();}},{passive:false});
 el.addEventListener('touchend',()=>{if(!on)return;on=false;const v=dy/Math.max(1,Date.now()-t0);el.style.transition='transform .18s ease-out';
  if(dy>el.offsetHeight/3||(v>0.6&&dy>30)){el.style.transform='translateY(100%)';setTimeout(close,170);}else el.style.transform='';});}
const close69={more:()=>{M61.more=false;render();},m68:()=>{V.m68=false;render();},flt:()=>{V.modal=null;render();}};
let open69={more:false,m68:false},lv69='';
{const r0=render;render=function(){if(S&&V.view!==lv69){lv69=V.view;M61.more=false;}r0();
 document.querySelectorAll('.dim69').forEach(x=>x.remove());if(!S||!ph69())return;
 const mo=document.querySelector('.more61:not([hidden])'),m8=document.querySelector('.menu68'),fl=document.querySelector('.scrim .dzf67')&&document.querySelector('.scrim .dzf67').closest('.modal');
 const cur={more:!!mo,m68:!!m8};
 if(mo||m8){const d=document.createElement('div');d.className='dim69';d.dataset.a=mo?'dim69more':'dim69m68';d.setAttribute('aria-hidden','true');document.body.appendChild(d);}
 if(mo){if(!open69.more)mo.classList.add('in69');drag69(mo,close69.more);}
 if(m8){if(!open69.m68)m8.classList.add('in69');drag69(m8,close69.m68);}
 if(fl){if(!fl.dataset.d69)fl.classList.add('in69');drag69(fl,close69.flt);}
 open69=cur;};}
A.dim69more=()=>close69.more();A.dim69m68=()=>close69.m68();
if(typeof NAV_SAFE!=='undefined'){NAV_SAFE.add('dim69more');NAV_SAFE.add('dim69m68');}
// chọn một mục trong menu Thêm: đóng menu trước khi chuyển màn
document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('.more61 [data-a]'))M61.more=false;},true);
