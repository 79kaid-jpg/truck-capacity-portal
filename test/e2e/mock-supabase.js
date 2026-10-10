// Test-only mock of supabase-js v2 (auth + mfa + rpc) talking to server.py. TOTP code hợp lệ trong test: 123456
window.supabase={createClient(){const K='mock-session';const get=()=>{try{return JSON.parse(localStorage.getItem(K));}catch(e){return null;}};const put=v=>localStorage.setItem(K,JSON.stringify(v));
 const h=new URLSearchParams(location.hash.slice(1));if(h.get('type')==='recovery'&&h.get('mock_uid'))put({id:h.get('mock_uid'),email:h.get('mock_email'),aal:'aal1'});
 const post=async(p,b)=>{const r=await fetch(p,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json();return r.ok?{data:j,error:null}:{data:null,error:j};};
 const uid=()=>(get()||{}).id;
 const list=async()=>{const r=await post('/auth/mfa/list',{uid:uid()});const all=r.data||[];return{data:{all,totp:all.filter(f=>f.status==='verified'),phone:[]},error:null};};
 return{auth:{getSession:async()=>({data:{session:get()}}),getUser:async()=>({data:{user:get()}}),refreshSession:async()=>({data:{session:get()},error:null}),
  signInWithPassword:async({email,password})=>{const r=await post('/auth/login',{email,password});if(r.error)return{error:r.error};put({...r.data,aal:'aal1'});return{data:r.data,error:null};},
  signOut:async()=>{localStorage.removeItem(K);return{error:null};},updateUser:async()=>{window.__pwUpdatedAal=(get()||{}).aal;return{data:{},error:null};},
  resetPasswordForEmail:async(email,opts)=>{window.__reset={email,opts};return{data:{},error:null};},
  mfa:{listFactors:list,
   getAuthenticatorAssuranceLevel:async()=>{const s=get();if(!s)return{data:null,error:null};const{data}=await list();const cur=s.aal||'aal1';return{data:{currentLevel:cur,nextLevel:data.totp.length?'aal2':cur},error:null};},
   enroll:async({friendlyName})=>post('/auth/mfa/enroll',{uid:uid(),name:friendlyName}),
   unenroll:async({factorId})=>post('/auth/mfa/unenroll',{uid:uid(),factorId}),
   challengeAndVerify:async({factorId,code})=>{const r=await post('/auth/mfa/verify',{uid:uid(),factorId,code});if(r.error)return r;put({...get(),aal:'aal2'});return r;}}},
  rpc:async(fn,args)=>post('/rpc/'+fn,{uid:uid(),aal:(get()||{}).aal,args})};}};
