import {prepareFixture,fixtureUser} from './test-fixture.js';
import {TOKEN_HASHES,ADMIN_HASH} from './token-registry.js';
import {seeds} from './seeds.js';
import {blankAgencyState,agentsFor,resolveEntry,normalizeEntryToken,tokenDigest,userInviteToken,addAgent,renameAgent,toggleAgent,rotateAgentTokens,updateOwnedPost} from '../public/agency-core.js';
const DAY=86400000,SESSION='tp_session',DEVICE='tp_device';
const error=(status,message)=>Object.assign(new Error(message),{status});
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cookie=(request,name)=>request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1)||'';
const setCookie=(request,name,value,age)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
async function body(request,max=16384){const text=await request.text();if(text.length>max)throw error(413,'內容過大');try{return JSON.parse(text)}catch{throw error(400,'無效資料')}}
async function config(db){const row=await first(db,'SELECT data,revision FROM settings WHERE id=?','main');return {data:row?{...blankAgencyState(),...JSON.parse(row.data)}:blankAgencyState(),revision:row?.revision??0};}
function catalog(data){return [...seeds,...data.custom].map(p=>({...p,...data.edits[p.id]}));}
function sessionData(grant,data){return {...data,session:{version:3,role:grant.role,agentId:grant.agent_id,tokenRevision:grant.revision}};}
async function throttle(db,key,max,ms=60000){const now=Date.now(),slot=Math.floor(now/ms);const row=await first(db,'INSERT INTO rate_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',key+':'+slot,now+ms*2);if(row.count>max)throw error(429,'操作太頻繁，請稍後重試');}
async function grantFor(request,db,siteUser,data){const token=cookie(request,SESSION);if(!token)throw error(401,'請先輸入 Token');const grant=await first(db,'SELECT * FROM sessions WHERE id=? AND site_user=? AND expires>?',await tokenDigest(token),siteUser,Date.now());if(!grant)throw error(401,'登入已過期，請重新輸入 Token');if(grant.agent_id&&data.suspended.includes(grant.agent_id))throw error(403,'此代理已停用');if(grant.role==='partner'&&grant.revision!==(data.tokenOverrides[grant.agent_id]?.revision||0))throw error(401,'Token 已更新，請重新登入');return grant;}
async function viewState(db,data,g){const user=g.user_key?await first(db,'SELECT * FROM users WHERE id=? AND site_user=?',g.user_key,g.site_user):null;const posts=catalog(data).filter(p=>g.role==='admin'||p.agentId===g.agent_id&&(g.role==='partner'||p.status==='published'));const agentList=agentsFor(data).filter(a=>g.role==='admin'||a.id===g.agent_id);return {server:true,deviceId:g.user_key||'',binding:user?.agent_id||null,session:{version:3,role:g.role,agentId:g.agent_id,tokenRevision:g.revision||0},tokenOverrides:g.role==='partner'?{[g.agent_id]:{revision:g.revision||0}}:{},extraAgents:agentList,agentEdits:{},custom:posts,edits:{},disabled:data.disabled.filter(id=>g.role==='admin'||id===g.agent_id),suspended:g.role==='admin'?data.suspended:[],audit:g.role==='admin'?data.audit:[],conversations:[],profileName:user?.name||null,testFixture:g.role==='admin'?Object.keys(data.testFixtures||{}).length>0:undefined};}
async function conversation(db,g,id){if(!['user','partner'].includes(g.role))throw error(403,'此身份不能存取聊天');const c=await first(db,'SELECT * FROM conversations WHERE id=?',id);if(!c||c.agent_id!==g.agent_id||(g.role==='user'&&c.user_key!==g.user_key))throw error(404,'找不到此對話');return c;}
const actor=g=>g.role==='user'?g.user_key:'partner:'+g.agent_id;
const prefs=(c,role)=>JSON.parse(c[role+'_prefs']||'{}');
function allowSend(c){if(prefs(c,'user').blocked||prefs(c,'partner').blocked)throw error(403,'此對話已封鎖，無法傳送訊息');}
function messageView(m){return {id:m.id,seq:m.seq,clientId:m.client_id,sender:m.sender,body:m.recalled?'':m.body,kind:m.kind,attachmentId:m.recalled?null:m.attachment_id,replyTo:m.reply_to,created:m.created,recalled:!!m.recalled};}
function imageMime(bytes){if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';if(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return 'image/png';if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';return null;}
export async function handle(request,env,{registry=TOKEN_HASHES,adminHash=ADMIN_HASH}={}){try{
 const db=env.DB;if(!db)throw error(503,'聊天資料庫尚未就緒');const siteUser=request.headers.get('oai-authenticated-user-id');if(!siteUser)throw error(401,'請先登入網站',{code:'site_login'});
 const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=request.method;
 if(!['GET','HEAD'].includes(method)){if(request.headers.get('origin')!==url.origin)throw error(403,'請從本網站操作');}
 const cfg=await config(db),data=cfg.data;
 if(path[0]==='session'&&method==='POST'){
  await throttle(db,'login:'+siteUser,20);const input=await body(request);input.token=normalizeEntryToken(input.token);let device=cookie(request,DEVICE),user=device?await first(db,'SELECT * FROM users WHERE id=? AND site_user=?',device,siteUser):null;const named=await fixtureUser(db,data,siteUser,input.token);if(named){user=named.user;device=user.id;}const entry=named?.entry||await resolveEntry(input.token,{...data,binding:user?.agent_id||null},registry,adminHash);if(!['admin','partner','pending','bound'].includes(entry.kind))throw error(401,'Token 無效或代理已停用');
  await run(db,'INSERT OR IGNORE INTO settings(id,data,revision) VALUES(?,?,0)','main',JSON.stringify(data));
  const role=entry.kind==='admin'?'admin':entry.kind==='partner'?'partner':'user',agentId=entry.agent?.id||null;
  if(role==='user'){if(user&&user.agent_id!==agentId)throw error(409,'此瀏覽器已綁定其他代理');if(!user){device=crypto.randomUUID()+crypto.randomUUID();await run(db,'INSERT INTO users(id,site_user,agent_id,name,created) VALUES(?,?,?,?,?)',device,siteUser,agentId,String(input.name||'新朋友').trim().slice(0,30)||'新朋友',Date.now());user={id:device};}}
  const previous=cookie(request,SESSION);if(previous)await run(db,'DELETE FROM sessions WHERE id=?',await tokenDigest(previous));
  const raw=crypto.randomUUID()+crypto.randomUUID(),grant={id:await tokenDigest(raw),site_user:siteUser,user_key:user?.id||null,role,agent_id:agentId,revision:entry.revision||0,expires:Date.now()+30*DAY};
  await run(db,'INSERT INTO sessions(id,site_user,user_key,role,agent_id,revision,expires) VALUES(?,?,?,?,?,?,?)',grant.id,siteUser,grant.user_key,role,agentId,grant.revision,grant.expires);
  const response=json({state:await viewState(db,data,grant),inviteToken:role==='partner'?await userInviteToken(String(input.token).trim()):null});response.headers.append('Set-Cookie',setCookie(request,SESSION,raw,30*86400));if(user)response.headers.append('Set-Cookie',setCookie(request,DEVICE,device,365*86400));return response;
 }
 if(path[0]==='session'&&method==='DELETE'){const old=cookie(request,SESSION);if(old)await run(db,'DELETE FROM sessions WHERE id=? AND site_user=?',await tokenDigest(old),siteUser);return json({ok:true},200,{'Set-Cookie':setCookie(request,SESSION,'',0)});}
 const g=await grantFor(request,db,siteUser,data);
 if(path[0]==='session'&&method==='GET')return json({state:await viewState(db,data,g)});
 if(path[0]==='test-data'&&path.length===1&&method==='POST'){
  if(g.role!=='admin')throw error(403,'僅超級管理員可建立測試資料');
  const input=await body(request),prepared=await prepareFixture(data,g,input,{registry,adminHash});
  if(!prepared.existing){
   const serialized=JSON.stringify(prepared.next),f=prepared.fixture;
   const results=await db.batch([
    db.prepare('UPDATE settings SET data=?,revision=revision+1 WHERE id=? AND revision=?').bind(serialized,'main',cfg.revision),
    db.prepare('INSERT INTO users(id,site_user,agent_id,name,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM settings WHERE id=? AND revision=? AND data=?)').bind(f.userKey,g.site_user,f.agentId,'allen',Date.now(),'main',cfg.revision+1,serialized)
   ]);
   if(!results[0].meta.changes)throw error(409,'資料已被其他管理者更新，請重新整理後再試');
  }
  const f=prepared.fixture,source=prepared.next||data,posts=catalog(source).filter(p=>f.personIds.includes(p.id));
  return json({agent:{id:f.agentId,name:'leo'},user:{id:f.userKey,name:'allen'},people:posts.map(p=>({id:p.id,name:p.name,age:p.age,place:p.place,status:p.status})),existing:prepared.existing,state:await viewState(db,source,g)});
 }

 if(path[0]==='profile'&&method==='POST'){if(g.role!=='user'||!g.user_key)throw error(403,'僅用戶可修改暱稱');const input=await body(request),name=String(input.name||'').trim().slice(0,30);if(!name)throw error(400,'請輸入暱稱');await db.batch([db.prepare('UPDATE users SET name=? WHERE id=?').bind(name,g.user_key),db.prepare('UPDATE conversations SET user_name=? WHERE user_key=?').bind(name,g.user_key)]);return json({ok:true});}
 if(['agency','post'].includes(path[0])&&method==='POST'){
  const input=await body(request),next=sessionData(g,structuredClone(data));let result={};
  if(path[0]==='agency'){
   if(g.role!=='admin')throw error(403,'僅超級管理員可管理代理');
   if(input.action==='new')result=await addAgent(next,input.name);
   else if(input.action==='rename')renameAgent(next,input.id,input.name);
   else if(input.action==='toggle')toggleAgent(next,input.id);
   else if(input.action==='rotate')result=await rotateAgentTokens(next,input.id);
   else throw error(400,'不支援的操作');
  }else{
   if(g.role!=='partner')throw error(403,'僅代理商可管理內容');
   if(input.action==='save')updateOwnedPost(next,seeds,g.agent_id,Number(input.id)||null,input.data);
   else if(input.action==='toggle'){const p=catalog(next).find(p=>p.id===Number(input.id)&&p.agentId===g.agent_id);if(!p)throw error(404,'找不到此人物');next.edits[p.id]={...next.edits[p.id],status:p.status==='published'?'unpublished':'published'};}
   else if(input.action==='invites')next.disabled=next.disabled.includes(g.agent_id)?next.disabled.filter(id=>id!==g.agent_id):[...next.disabled,g.agent_id];
   else throw error(400,'不支援的操作');
  }
  delete next.session;const changed=await run(db,'UPDATE settings SET data=?,revision=revision+1 WHERE id=? AND revision=?',JSON.stringify(next),'main',cfg.revision);if(!changed.meta.changes)throw error(409,'其他管理者已更新資料，請重新整理後再試');return json({result,state:await viewState(db,next,g)});
 }
 if(path[0]==='conversations'&&path.length===1){
  if(!['partner','user'].includes(g.role))throw error(403,'此身份沒有聊天收件箱');
  if(method==='POST'){if(g.role!=='user')throw error(403,'僅用戶可開啟新對話');const input=await body(request),person=catalog(data).find(p=>p.id===Number(input.personId)&&p.agentId===g.agent_id&&p.status==='published');if(!person)throw error(404,'此人物目前無法開啟對話');const user=await first(db,'SELECT name FROM users WHERE id=?',g.user_key),id=crypto.randomUUID(),now=Date.now();await run(db,'INSERT OR IGNORE INTO conversations(id,user_key,agent_id,person_id,person_name,user_name,created,updated) VALUES(?,?,?,?,?,?,?,?)',id,g.user_key,g.agent_id,person.id,person.name,user.name,now,now);return json({conversation:await first(db,'SELECT * FROM conversations WHERE user_key=? AND agent_id=? AND person_id=?',g.user_key,g.agent_id,person.id)});}
  if(method==='GET'){const where=g.role==='user'?'c.user_key=? AND c.agent_id=?':'c.agent_id=?',args=g.role==='user'?[g.user_key,g.agent_id]:[g.agent_id];const rows=await all(db,`SELECT c.*,(SELECT count(*) FROM messages m WHERE m.conversation_id=c.id AND m.seq>c.${g.role}_read AND m.sender<>? AND m.recalled=0) AS unread,(SELECT CASE WHEN recalled=1 THEN '訊息已撤回' WHEN kind='image' THEN '[圖片]' ELSE body END FROM messages m WHERE m.conversation_id=c.id ORDER BY seq DESC LIMIT 1) AS preview FROM conversations c WHERE ${where} ORDER BY c.updated DESC LIMIT 300`,g.role,...args);return json({conversations:rows.map(c=>({...c,user_key:undefined,user_prefs:g.role==='user'?c.user_prefs:undefined,partner_prefs:g.role==='partner'?c.partner_prefs:undefined,blocked:!!(prefs(c,'user').blocked||prefs(c,'partner').blocked)}))});}
 }
 if(path[0]==='conversations'&&path[1]){
  const c=await conversation(db,g,path[1]);
  if(path[2]==='messages'&&method==='GET'){
   const before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER,query=(url.searchParams.get('q')||'').slice(0,100);const rows=await all(db,"SELECT * FROM messages WHERE conversation_id=? AND seq<? AND (?='' OR (recalled=0 AND instr(lower(body),lower(?))>0)) ORDER BY seq DESC LIMIT 51",c.id,before,query,query);const hasMore=rows.length>50;return json({messages:rows.slice(0,50).reverse().map(messageView),hasMore,conversation:{...c,user_key:undefined,user_prefs:g.role==='user'?c.user_prefs:undefined,partner_prefs:g.role==='partner'?c.partner_prefs:undefined,blocked:!!(prefs(c,'user').blocked||prefs(c,'partner').blocked)}});
  }
  if(path[2]==='messages'&&method==='POST'){
   allowSend(c);await throttle(db,'send:'+actor(g),60);const input=await body(request),text=String(input.body||'').trim(),kind=input.kind==='image'?'image':'text',clientId=String(input.clientId||'');if(!/^[a-zA-Z0-9-]{16,80}$/.test(clientId))throw error(400,'無效訊息識別');if(kind==='text'&&(!text||text.length>2000))throw error(400,'訊息需為 1–2000 個字');
   const exists=await first(db,'SELECT * FROM messages WHERE conversation_id=? AND sender_key=? AND client_id=?',c.id,actor(g),clientId);if(exists)return json({message:messageView(exists)});
   let attachment=null;if(kind==='image'){attachment=await first(db,'SELECT * FROM attachments WHERE id=? AND conversation_id=? AND sender_key=?',String(input.attachmentId||''),c.id,actor(g));if(!attachment)throw error(400,'圖片尚未上傳成功');}
   const reply=input.replyTo?await first(db,'SELECT id FROM messages WHERE id=? AND conversation_id=? AND recalled=0',String(input.replyTo),c.id):null;if(input.replyTo&&!reply)throw error(400,'引用訊息已撤回或不存在');
   const id=crypto.randomUUID(),now=Date.now();await db.batch([db.prepare('INSERT OR IGNORE INTO messages(id,conversation_id,client_id,sender,sender_key,body,kind,attachment_id,reply_to,created) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,c.id,clientId,g.role,actor(g),kind==='text'?text:'',kind,attachment?.id||null,reply?.id||null,now),db.prepare('UPDATE conversations SET updated=? WHERE id=?').bind(now,c.id)]);return json({message:messageView(await first(db,'SELECT * FROM messages WHERE conversation_id=? AND sender_key=? AND client_id=?',c.id,actor(g),clientId))});
  }
  if(path[2]==='ack'&&method==='POST'){const input=await body(request),max=await first(db,'SELECT MAX(seq) AS seq FROM messages WHERE conversation_id=?',c.id),seq=Math.min(Number(input.seq)||0,max?.seq||0);if(seq>0)await run(db,`UPDATE conversations SET ${g.role}_delivered=MAX(${g.role}_delivered,?),${g.role}_read=MAX(${g.role}_read,?) WHERE id=?`,seq,input.read?seq:0,c.id);return json({ok:true});}
  if(path[2]==='preferences'&&method==='POST'){const input=await body(request),next={...prefs(c,g.role)};for(const k of ['pinned','muted','archived','blocked'])if(typeof input[k]==='boolean')next[k]=input[k];await run(db,`UPDATE conversations SET ${g.role}_prefs=? WHERE id=?`,JSON.stringify(next),c.id);return json({ok:true});}
  if(path[2]==='recall'&&method==='POST'){const input=await body(request),m=await first(db,'SELECT * FROM messages WHERE id=? AND conversation_id=?',String(input.id),c.id);if(!m||m.sender_key!==actor(g))throw error(403,'只能撤回自己發送的訊息');if(m.recalled)return json({ok:true});if(Date.now()-m.created>120000)throw error(400,'只可在傳送後 2 分鐘內撤回');await run(db,"UPDATE messages SET body='',recalled=1 WHERE id=?",m.id);return json({ok:true});}
  if(path[2]==='upload'&&method==='POST'){
   allowSend(c);await throttle(db,'upload:'+actor(g),15);if(!env.BUCKET)throw error(503,'圖片儲存尚未就緒');if(Number(request.headers.get('content-length'))>5242880)throw error(413,'圖片不可超過 5 MB');
   const reader=request.body?.getReader();if(!reader)throw error(400,'缺少圖片');let size=0,chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5242880){await reader.cancel();throw error(413,'圖片不可超過 5 MB');}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const mime=imageMime(bytes);if(!mime)throw error(400,'僅支援 JPEG、PNG、WebP 圖片');const id=crypto.randomUUID(),key='chat/'+c.id+'/'+id;await env.BUCKET.put(key,bytes,{httpMetadata:{contentType:mime}});await run(db,'INSERT INTO attachments(id,conversation_id,sender_key,object_key,mime,size,created) VALUES(?,?,?,?,?,?,?)',id,c.id,actor(g),key,mime,size,Date.now());return json({id,mime,size});
  }
 }
 if(path[0]==='attachments'&&path[1]&&method==='GET'){
  const attachment=await first(db,'SELECT * FROM attachments WHERE id=?',path[1]);if(!attachment)throw error(404,'找不到圖片');await conversation(db,g,attachment.conversation_id);const sent=await first(db,'SELECT recalled FROM messages WHERE attachment_id=?',attachment.id);if(sent?.recalled||(!sent&&attachment.sender_key!==actor(g)))throw error(404,'圖片不可用');const object=await env.BUCKET?.get(attachment.object_key);if(!object)throw error(404,'圖片不可用');return new Response(object.body,{headers:{'Content-Type':attachment.mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
 }
 throw error(404,'找不到此功能');
 }catch(e){if(!e.status)console.error('API failure',e.message);return json({error:e.status?e.message:'服務暫時無法使用，請稍後重試'},e.status||500);}}
