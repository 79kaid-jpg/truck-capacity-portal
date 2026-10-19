// v3.46: khung chat trên điện thoại – không bị iPhone tự phóng to, chiếm trọn màn hình, co theo bàn phím, không tràn ngang.
(()=>{const st=document.createElement('style');st.textContent=`
#chatPanel{max-width:100vw;overflow:hidden}
#chatPanel .cm{min-width:0;overflow-x:hidden}
#chatPanel .cmsg{max-width:92%;min-width:0;overflow-wrap:anywhere;word-break:break-word}
#chatPanel .cmsg a{overflow-wrap:anywhere}
#chatPanel .cmsg table{display:block;max-width:100%;overflow-x:auto}
#chatPanel .cmsg pre,#chatPanel .cmsg code{white-space:pre-wrap;overflow-wrap:anywhere}
#chatPanel .cf{min-width:0}#chatPanel .cf textarea{min-width:0}
@media (max-width:760px){
 #chatPanel{left:0;right:0;top:0;bottom:auto;width:100%;height:100dvh;border-left:0;
  padding-top:env(safe-area-inset-top,0px);padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}
 #chatPanel .ch{min-height:52px}
 #chatPanel .ch .btn{min-width:44px;min-height:44px}
 #chatPanel .cf{padding:8px 12px;align-items:flex-end}
 #chatPanel .cf textarea{font-size:16px;min-height:44px;resize:none}
 #chatPanel .cf .btn{min-width:56px;min-height:44px;flex:none}
 #chatPanel .cl{padding-bottom:calc(8px + env(safe-area-inset-bottom,0px))}
 #chatPanel .cs button{min-height:36px}
}`;document.head.appendChild(st);})();
// iPhone: chiều cao theo phần màn hình còn lại khi bàn phím mở (visualViewport), giữ ô nhập ngay trên bàn phím
(()=>{const vv=window.visualViewport;if(!vv)return;const fit=()=>{const p=document.getElementById('chatPanel');if(!p)return;
 if(matchMedia('(max-width:760px)').matches){p.style.height=vv.height+'px';p.style.top=vv.offsetTop+'px';}else{p.style.height='';p.style.top='';}};
 vv.addEventListener('resize',fit);vv.addEventListener('scroll',fit);
 const c0=chatRender;chatRender=function(){const r=c0.apply(this,arguments);fit();return r;};})();
