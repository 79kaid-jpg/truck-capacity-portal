// Test-only mock of supabase-js v2 (auth + rpc) talking to server.py
window.supabase={createClient(){const K='mock-session';const get=()=>{try{return JSON.parse(localStorage.getItem(K));}catch(e){return null;}};
 const post=async(p,b)=>{const r=await fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();return r.ok?{data:j,error:null}:{data:null,error:j};};
 return{auth:{getSession:async()=>({data:{session:get()}}),getUser:async()=>({data:{user:get()}}),
  signInWithPassword:async({email,password})=>{const r=await post('/auth/login',{email,password});if(r.error)return{error:r.error};localStorage.setItem(K,JSON.stringify(r.data));return{data:r.data,error:null};},
  signOut:async()=>{localStorage.removeItem(K);return{error:null};},updateUser:async()=>({data:{},error:null})},
  rpc:async(fn,args)=>post('/rpc/'+fn,{uid:(get()||{}).id,args})};}};
