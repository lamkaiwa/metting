import {TOKEN_HASHES,ADMIN_HASH} from './token-registry.js';
export const AGENTS = [
  {id:'harbor',name:'維港同頻',intro:'在維港兩岸，遇見聊得來的人。',accent:'#31584b'},
  {id:'city',name:'城市漫遊',intro:'一起探索城市，讓相遇自然發生。',accent:'#b56a4d'}
];
export const LOCATIONS = {
  '中環':{area:'中西區',point:[22.28,114.16]},'上環':{area:'中西區',point:[22.29,114.15]},
  '尖沙咀':{area:'油尖旺',point:[22.30,114.17]},'銅鑼灣':{area:'灣仔',point:[22.28,114.19]},
  '啟德':{area:'九龍城',point:[22.33,114.20]},'太古':{area:'東區',point:[22.28,114.22]},
  '沙田':{area:'新界',point:[22.38,114.19]},'荃灣':{area:'新界',point:[22.37,114.12]}
};
export const blankAgencyState=()=>({conversations:[],extraAgents:[],agentEdits:{},tokenOverrides:{},suspended:[],audit:[],session:null,binding:null,deviceId:null,boundAt:null,edits:{},custom:[],disabled:[]});
export function rememberDevice(state,makeId){if(!state.deviceId)state.deviceId=makeId();return state.deviceId;}
export async function tokenDigest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function normalizeEntryToken(value){return String(value||'').replace(/[\s\u200B-\u200D\u2060\u2066-\u2069\uFEFF`]/g,'');}
export async function userInviteToken(token){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let n=BigInt('0x'+await tokenDigest('tongpin-invite:'+token)),result='';for(let i=0;i<16;i++){result+=alphabet[Number(n%62n)];n/=62n;}return result;}
export async function resolveEntry(code,state,registry=TOKEN_HASHES,adminHash=ADMIN_HASH){
  const token=normalizeEntryToken(code);if(!/^[A-Za-z0-9]{16}$/.test(token))return {kind:'invalid'};
  const hash=await tokenDigest(token);if(hash===adminHash)return {kind:'admin'};
  const effective={...registry,...state.tokenOverrides},agents=agentsFor(state),partner=agents.some(a=>effective[a.id]?.partnerHash===hash);
  const agent=agents.find(a=>effective[a.id]?.[partner?'partnerHash':'userHash']===hash);
  if(!agent)return {kind:'invalid'};
  if(state.suspended?.includes(agent.id))return {kind:'suspended',agent};
  if(partner)return {kind:'partner',agent,revision:state.tokenOverrides?.[agent.id]?.revision||0};
  if(state.binding&&state.binding!==agent.id)return {kind:'conflict',agent};
  if(state.binding===agent.id)return {kind:'bound',agent};
  if(state.disabled.includes(agent.id))return {kind:'disabled',agent};
  return {kind:'pending',agent};
}
export async function resolveInvitation(code,state){const r=await resolveEntry(code,state);return ['partner','admin'].includes(r.kind)?{kind:'invalid'}:r;}
export async function bindInvitation(state,code,makeId){const result=await resolveInvitation(code,state);if(result.kind==='pending'){rememberDevice(state,makeId);state.binding=result.agent.id;state.boundAt=new Date().toISOString();}return result;}
export function belongsToAudience(person,scope){
  return person.status==='published' && scope!=='locked' && (!scope||person.agentId===scope);
}
export function validPost(data){
  const age=Number(data.age),name=String(data.name||'').trim(),bio=String(data.bio||'').trim();
  if(!name||name.length>20)return '暱稱需為 1–20 個字。';
  if(!Number.isInteger(age)||age<18||age>99)return '年齡必須為 18–99 歲的整數。';
  if(!['女','男','非二元'].includes(data.gender))return '請選擇有效的性別。';
  if(!LOCATIONS[data.place])return '請選擇有效的所在地區。';
  if(!['輕鬆約會','開放探索','認真發展'].includes(data.intent))return '請選擇有效的交友意向。';
  if(bio.length>180)return '介紹最多 180 字。';
  return null;
}
export function updateOwnedPost(state,seeds,operator,id,data){
  if(!agentsFor(state).some(a=>a.id===operator)||state.suspended?.includes(operator))throw new Error('無效的代理身份。');
  const error=validPost(data);if(error)throw new Error(error);
  const existing=id?[...seeds,...state.custom].find(p=>p.id===id):null;
  if(id&&(!existing||existing.agentId!==operator))throw new Error('只能編輯目前代理的資料。');
  const place=LOCATIONS[data.place];
  const post={...data,name:data.name.trim(),age:Number(data.age),bio:data.bio.trim(),area:place.area,point:place.point,agentId:operator,status:data.status==='draft'?'draft':'published'};
  if(id)state.edits[id]={...state.edits[id],...post};
  else state.custom.push({...post,id:Date.now()+Math.floor(Math.random()*1000),tags:['代理推薦','城市探索'],color:'#c9c6b1',shirt:'#55705c',hair:'#34322b',style:1,available:true,mutual:false});
}

export function agentsFor(state){return [...(state.server?[]:AGENTS),...(state.extraAgents||[])].map(a=>({...a,...state.agentEdits?.[a.id]}));}
export function sessionRole(state){
 if(state.session?.version!==3)return null;
 if(state.session.role==='admin')return 'admin';
 if(state.session.role==='partner'&&agentsFor(state).some(a=>a.id===state.session.agentId)&&!state.suspended?.includes(state.session.agentId)&&(state.session.tokenRevision||0)===(state.tokenOverrides?.[state.session.agentId]?.revision||0))return 'partner';
 if(state.session.role==='user'&&state.binding&&!state.suspended?.includes(state.binding))return 'user';
 return null;
}
export function requireAdmin(state){if(sessionRole(state)!=='admin')throw new Error('僅超級管理員可執行此操作。');}
export function randomToken(){const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';let value='';while(value.length<16){for(const n of crypto.getRandomValues(new Uint8Array(32))){if(n<248)value+=alphabet[n%62];if(value.length===16)break;}}return value;}
function audit(state,action,id){state.audit??=[];state.audit.unshift({action,agentId:id,at:new Date().toISOString()});state.audit=state.audit.slice(0,50);}
export function renameAgent(state,id,name){requireAdmin(state);name=String(name).trim();if(!name||name.length>30)throw new Error('代理名稱需為 1–30 個字。');if(!agentsFor(state).some(a=>a.id===id))throw new Error('找不到代理。');state.agentEdits??={};state.agentEdits[id]={...state.agentEdits[id],name};audit(state,'修改名稱',id);}
export function toggleAgent(state,id){requireAdmin(state);if(!agentsFor(state).some(a=>a.id===id))throw new Error('找不到代理。');state.suspended??=[];const active=state.suspended.includes(id);state.suspended=active?state.suspended.filter(x=>x!==id):[...state.suspended,id];audit(state,active?'啟用代理':'停用代理',id);}
export async function rotateAgentTokens(state,id){requireAdmin(state);if(!agentsFor(state).some(a=>a.id===id))throw new Error('找不到代理。');const partnerToken=randomToken(),userToken=await userInviteToken(partnerToken);const hashes={partnerHash:await tokenDigest(partnerToken),userHash:await tokenDigest(userToken)};requireAdmin(state);state.tokenOverrides??={};state.tokenOverrides[id]={...hashes,revision:(state.tokenOverrides[id]?.revision||0)+1};audit(state,'重置 Token',id);return {partnerToken,userToken};}
export async function addAgent(state,name){requireAdmin(state);name=String(name).trim();if(!name||name.length>30)throw new Error('代理名稱需為 1–30 個字。');if(agentsFor(state).some(a=>a.name===name))throw new Error('此名稱已存在。');const id=crypto.randomUUID();state.extraAgents??=[];state.extraAgents.push({id,name,intro:'歡迎來到專屬推薦空間。',accent:'#31584b'});const tokens=await rotateAgentTokens(state,id);audit(state,'新增代理',id);return {id,...tokens};}
