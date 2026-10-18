// v3.10: Lịch sử màn hình — B B quay lại, B N đi tới; đồng bộ nút Back/Forward của trình duyệt
const NH={list:[],pos:-1,seq:0,busy:false,MAX:20};
const NH_KEYS=['view','day','wh','whAll','ym','calV','w2s','bk','dashTab','cfgTab','uTab','blTab','nTab'];
const nhSnap=()=>{const o={};NH_KEYS.forEach(k=>{const v=V[k];o[k]=Array.isArray(v)?v.slice():v;});return o;};
const nhSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function nhRecord(){if(!S){NH.list=[];NH.pos=-1;return;}if(NH.busy)return;const s=nhSnap();const cur=NH.list[NH.pos];if(cur&&nhSame(cur.s,s))return;
 if(cur&&typeof BG_RENDER!=='undefined'&&BG_RENDER){cur.s=s;return;}
 const e={id:++NH.seq,s};
 if(!cur){NH.list=[e];NH.pos=0;try{history.replaceState({tcp:e.id},'');}catch(_){}return;}
 NH.list=NH.list.slice(0,NH.pos+1);NH.list.push(e);
 if(NH.list.length>NH.MAX)NH.list.shift();NH.pos=NH.list.length-1;
 try{history.pushState({tcp:e.id},'');}catch(_){}}
function nhGo(i){const e=NH.list[i];if(!e)return;NH.pos=i;NH.busy=true;
 const s=e.s;NH_KEYS.forEach(k=>{if(k!=='ym')V[k]=Array.isArray(s[k])?s[k].slice():s[k];});
 V.modal=null;V.menu=false;V.hl=null;if(V.view!=='booking')V.asg=null;
 const[y,m]=s.ym||V.ym;const need=goMonth(`${y}-${String(m).padStart(2,'0')}-01`);
 try{afterNav(need);}finally{NH.busy=false;}window.scrollTo(0,0);}
A.navBack=()=>{if(V.modal)return;if(NH.pos<=0){toast('Không còn màn hình trước đó');return;}history.back();};
A.navFwd=()=>{if(V.modal)return;if(NH.pos>=NH.list.length-1){toast('Không còn màn hình phía trước');return;}history.forward();};
window.addEventListener('popstate',ev=>{const id=ev.state&&ev.state.tcp;if(!id||!S)return;const i=NH.list.findIndex(e=>e.id===id);if(i>=0&&i!==NH.pos)nhGo(i);});
{const r0=render;render=function(){r0();nhRecord();};}
