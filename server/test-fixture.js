import {agentsFor,normalizeEntryToken,tokenDigest,userInviteToken,validPost,updateOwnedPost} from '../public/agency-core.js';
const failure=(status,message)=>Object.assign(new Error(message),{status});
const fixtureId='allen-leo-v1';
export async function prepareFixture(data,grant,input,{registry={},adminHash}={}){
  const partnerToken=String(input.partnerToken||''),userToken=String(input.userToken||'');
  if(!/^[A-Za-z0-9]{16}$/.test(partnerToken)||!/^[A-Za-z0-9]{16}$/.test(userToken)||partnerToken===userToken)throw failure(400,'測試 Token 必須是兩組不同的 16 位字母數字');
  const partnerHash=await tokenDigest(partnerToken),userHash=await tokenDigest(userToken),prior=data.testFixtures?.[fixtureId];
  if(prior){
    if(prior.siteUser!==grant.site_user||prior.partnerHash!==partnerHash||prior.userHash!==userHash)throw failure(409,'這組測試資料已存在，請使用原本保存的 Token');
    return {existing:true,fixture:prior};
  }
  if(agentsFor(data).some(a=>a.name.toLowerCase()==='leo'))throw failure(409,'已經有 leo 代理，請勿重複建立');
  const next=structuredClone(data),agentId=crypto.randomUUID(),userKey=crypto.randomUUID()+crypto.randomUUID();
  next.extraAgents.push({id:agentId,name:'leo',intro:'leo 的專屬推薦空間。',accent:'#31584b'});
  const invitation=await userInviteToken(partnerToken);
  if(invitation===userToken)throw failure(400,'請重新產生不同的測試 Token');
  const invitationHash=await tokenDigest(invitation);
  const used=new Set([adminHash,...Object.values({...registry,...data.tokenOverrides}).flatMap(x=>[x.partnerHash,x.userHash]),...Object.values(data.testFixtures||{}).map(x=>x.userHash)]);
  if([partnerHash,userHash,invitationHash].some(hash=>used.has(hash))||new Set([partnerHash,userHash,invitationHash]).size!==3)throw failure(400,'請為測試資料使用全新的 Token');
  next.tokenOverrides[agentId]={partnerHash,userHash:invitationHash,revision:1};
  const people=[
    {name:'Alice',age:26,gender:'女',place:'上環',intent:'輕鬆約會',bio:'成年虛構測試人物。喜歡咖啡、展覽和沿海散步。'},
    {name:'Mia',age:28,gender:'女',place:'銅鑼灣',intent:'開放探索',bio:'成年虛構測試人物。喜歡攝影、音樂和城市探索。'},
    {name:'Zoe',age:25,gender:'女',place:'尖沙咀',intent:'認真發展',bio:'成年虛構測試人物。喜歡看書、料理與真誠的交流。'}
  ];
  let nextId=Math.max(Date.now(),...next.custom.map(p=>p.id));
  const personIds=[];
  for(const person of people){
    const invalid=validPost(person);if(invalid)throw failure(400,invalid);
    updateOwnedPost(next,[],agentId,null,{...person,status:'published'});
    const post=next.custom.at(-1);post.id=++nextId;post.style=personIds.length+1;personIds.push(post.id);
  }
  const fixture={agentId,userKey,siteUser:grant.site_user,partnerHash,userHash,revision:1,personIds};
  next.testFixtures={...next.testFixtures,[fixtureId]:fixture};
  next.audit.unshift({action:'建立 allen / leo 測試資料',agentId,at:new Date().toISOString()});next.audit=next.audit.slice(0,50);
  return {existing:false,next,fixture};
}
export async function fixtureUser(db,data,siteUser,token){
  const hash=await tokenDigest(normalizeEntryToken(token));
  const fixture=Object.values(data.testFixtures||{}).find(f=>f.userHash===hash);
  if(!fixture)return null;
  if(fixture.siteUser!==siteUser||data.suspended.includes(fixture.agentId)||(data.tokenOverrides[fixture.agentId]?.revision||0)!==fixture.revision)throw failure(401,'測試用戶 Token 已失效或不屬於此網站帳號');
  const user=await db.prepare('SELECT * FROM users WHERE id=? AND site_user=? AND agent_id=?').bind(fixture.userKey,siteUser,fixture.agentId).first();
  if(!user)throw failure(401,'測試用戶尚未建立');
  return {user,entry:{kind:'bound',agent:agentsFor(data).find(a=>a.id===fixture.agentId)}};
}
