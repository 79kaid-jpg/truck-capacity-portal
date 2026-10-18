// v3.36: đồng bộ giao diện – biểu tượng SVG thay emoji, trạng thái nút bật/tắt cho trình đọc màn hình,
// cửa sổ có tên, giữ vị trí con trỏ bàn phím sau khi vẽ lại.
const IC53=(()=>{const P={
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5h.01"/>',
 warn:'<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
 box:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
 chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
 lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
 pin:'<path d="M9 3h6l-1 6 4 4H6l4-4-1-6zM12 13v8"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
 help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.4M12 17h.01"/>',
 keys:'<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
 eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 phone:'<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
 truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/>',
 bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20h4"/>',
 clip:'<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6"/>',
 cam:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
 ban:'<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>',
 bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
 flask:'<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7.5 15h9"/>'};
 const svg=k=>`<span class="ic53" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg></span>`;
 return {svg,map:{'⏳':'clock','🚨':'alert','⚠':'warn','📦':'box','💬':'chat','🔒':'lock','📌':'pin','🗑':'trash','❓':'help','⌨':'keys','👁':'eye','📲':'phone','🚚':'truck','🔔':'bell','📋':'clip','📷':'cam','⛔':'ban','🧪':'flask','💡':'bulb'}};})();
const RE53=new RegExp('('+Object.keys(IC53.map).join('|')+')\\uFE0F?\\s?','u');
const SKIP53='script,style,textarea,option,select,svg,[contenteditable],.tmb,.tmsg,.g30req,.tkpin,.tkpinl,.rq,.noic53';
function ic53(root){if(!root)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>RE53.test(n.data)&&!(n.parentElement&&n.parentElement.closest(SKIP53))?1:3});
 const list=[];while(w.nextNode())list.push(w.currentNode);
 list.forEach(n=>{const f=document.createDocumentFragment();let t=n.data,m;
  while((m=RE53.exec(t))){if(m.index)f.appendChild(document.createTextNode(t.slice(0,m.index)));const s=document.createElement('span');s.innerHTML=IC53.svg(IC53.map[m[1]]);f.appendChild(s.firstChild);
   if(m[0].endsWith(' ')||m[0].endsWith(' '))f.appendChild(document.createTextNode(' '));t=t.slice(m.index+m[0].length);}
  if(t)f.appendChild(document.createTextNode(t));n.parentNode.replaceChild(f,n);});}
// khóa nhận diện một phần tử điều khiển để tìm lại sau khi vẽ lại
const KEYS53=['a','d','v','i','g','id','w','c','t','m','n','r','s'];
// chỉ nút / liên kết: ô nhập do từng màn tự quản lý con trỏ (gợi ý khách, chuyển ô…)
function key53(e){if(!e||e===document.body||!e.closest||!e.closest('#app')||!e.matches('button,a,[role="button"],[tabindex]:not(input):not(textarea):not(select)'))return null;if(e.id)return '#'+CSS.escape(e.id);
 const ds=KEYS53.filter(k=>e.dataset&&e.dataset[k]!=null).map(k=>`[data-${k}="${CSS.escape(e.dataset[k])}"]`).join('');
 return ds?e.tagName.toLowerCase()+ds:null;}
{const r0=render;render=function(){const ae=document.activeElement;const k=key53(ae);const hadModal=!!V.modal;
 r0();if(!S)return;
 ic53(document.getElementById('app'));const fab=document.getElementById('chatFab');if(fab)ic53(fab);
 // nút chọn một trong nhiều (Tháng / 2 tuần, bộ lọc, kho, Xe | Khách…): báo trạng thái đang chọn
 document.querySelectorAll('.seg button,.cal36bar [data-a="calV"],.cal36bar [data-a="calF"],.cwh button,.g30tabs [data-a="g30Tab"],.tabs button').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('on')?'true':'false'));
 // cửa sổ: đặt tên theo tiêu đề; mới mở thì đưa con trỏ vào cửa sổ
 const md=document.querySelector('.modal[role="dialog"]');
 if(md){const h=md.querySelector('h2,h3');if(h){h.id=h.id||'mh53';md.setAttribute('aria-labelledby',h.id);}
  if(!md.contains(document.activeElement)){let e=null;try{e=hadModal&&k?md.querySelector(k):null;}catch(x){}
   if(e&&e.offsetParent!==null)e.focus({preventScroll:true});else{md.tabIndex=-1;md.focus({preventScroll:true});}}}
 // vẽ lại làm mất con trỏ bàn phím → trả về đúng nút / ô cũ
 else if(k&&(document.activeElement===document.body||!document.activeElement)){try{const e=document.querySelector(k);if(e&&e.offsetParent!==null)e.focus({preventScroll:true});}catch(x){}}
};}
