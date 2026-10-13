import assert from 'node:assert/strict';
import {api} from './public/api.js';
const originalFetch=globalThis.fetch;
try {
  globalThis.fetch=async()=>new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});
  assert.deepEqual(await api('session'),{ok:true});
  globalThis.fetch=async()=>new Response('<html>Sign in</html>',{status:401,headers:{'Content-Type':'text/html'}});
  await assert.rejects(api('session'),e=>e.status===401&&e.message.includes('網站登入已過期'));
  globalThis.fetch=async()=>new Response('<html>Access denied</html>',{status:403,headers:{'Content-Type':'text/html'}});
  await assert.rejects(api('session'),e=>e.status===403&&e.message.includes('本人帳號'));
  globalThis.fetch=async()=>({status:200,redirected:true,headers:new Headers({'Content-Type':'text/html'})});
  await assert.rejects(api('session'),e=>e.status===401);
  globalThis.fetch=async()=>new Response(JSON.stringify({error:'Token 無效'}),{status:401,headers:{'Content-Type':'application/json'}});
  await assert.rejects(api('session'),e=>e.status===401&&e.message==='Token 無效');
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch')};
  await assert.rejects(api('session'),/網路連線中斷/);
  console.log('API login checks passed: JSON, expired website login, redirects and transport errors.');
} finally { globalThis.fetch=originalFetch; }
