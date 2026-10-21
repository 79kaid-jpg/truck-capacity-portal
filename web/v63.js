// v3.50: Logo mới (xe đầu kéo chở 3 cuộn coil) ở đầu trang + màn đăng nhập; biểu tượng menu "Khai báo xe" vẽ lại.
// Logo dùng đúng favicon.svg để icon màn hình chính, tab trình duyệt và logo trong app là một hình.
// Menu dùng hình nét (currentColor) cùng kiểu các biểu tượng khác, tự đổi màu khi chọn / dark mode.
(()=>{
  const st=document.createElement('style');
  st.textContent=`
.logo .mark.m63,.loginbox .brand .mark.m63{width:32px;height:32px;border:1px solid color-mix(in srgb,var(--on-navy) 35%,transparent);border-radius:8px;background:none;padding:0;overflow:hidden;display:inline-grid;place-items:center}
.mark.m63 img{width:100%;height:100%;display:block}
@media (max-width:700px){.top .logo .mark.m63{width:34px;height:34px}}`;
  document.head.appendChild(st);

  const LOGO63=`<img src="favicon.svg?v=${window.APP_V||''}" alt="" width="32" height="32">`;
  // Rơ-moóc chở 3 cuộn coil, bánh xe có trục (24×24, nét theo màu chữ)
  IC.coil63='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.6" cy="12" r="1.9"/><circle cx="8.6" cy="12" r="1.9"/><circle cx="12.6" cy="12" r="1.9"/><path d="M2 14.6h13"/><path d="M15.5 15.5V9.6c0-.6.4-1 1-1h2.2l3 3.6v3.3z"/><path d="M17.2 10.2h1.2l1.6 2h-2.8z"/><circle cx="5" cy="17.4" r="1.7"/><circle cx="11.6" cy="17.4" r="1.7"/><circle cx="18.6" cy="17.4" r="1.7"/><circle cx="5" cy="17.4" r=".3" fill="currentColor"/><circle cx="11.6" cy="17.4" r=".3" fill="currentColor"/><circle cx="18.6" cy="17.4" r=".3" fill="currentColor"/></svg>';
  const nf=NAV.find(n=>n.v==='fleet');if(nf)nf.ic='coil63';

  const fix63=root=>{(root||document).querySelectorAll('.top .logo .mark:not(.m63),.loginbox .brand .mark:not(.m63)').forEach(m=>{m.classList.add('m63');m.innerHTML=LOGO63;});};
  {const r0=render;render=function(){r0();fix63();};}
  {const s0=screen;screen=function(...a){return s0(...a).replace(/<span class="mark">[\s\S]*?<\/svg><\/span>/,`<span class="mark m63">${LOGO63}</span>`);};}
  fix63();
  new MutationObserver(()=>fix63()).observe(document.getElementById('app')||document.body,{childList:true});
})();
