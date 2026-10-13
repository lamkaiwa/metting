import assert from 'node:assert/strict';
import {blankAgencyState,resolveInvitation,belongsToAudience,updateOwnedPost,validPost,rememberDevice,bindInvitation} from './public/agency-core.js';

const state=blankAgencyState();
const seeds=[{id:1,agentId:'harbor',status:'published'},{id:2,agentId:'city',status:'published'},{id:3,agentId:'harbor',status:'draft'}];
assert.deepEqual(seeds.filter(p=>belongsToAudience(p,'harbor')).map(p=>p.id),[1]);
assert.deepEqual(seeds.filter(p=>belongsToAudience(p,'city')).map(p=>p.id),[2]);
assert.equal(seeds.filter(p=>belongsToAudience(p,'locked')).length,0);
assert.equal(belongsToAudience({...seeds[0],status:'unpublished'},'harbor'),false);
const data={name:'Nova',age:'28',gender:'女',place:'中環',intent:'輕鬆約會',bio:'Test',status:'published'};
assert.ok(validPost({...data,age:17}));assert.ok(validPost({...data,age:28.5}));assert.ok(validPost({...data,place:'Unknown'}));
assert.throws(()=>updateOwnedPost(state,seeds,'harbor',2,data),/只能編輯/);
updateOwnedPost(state,seeds,'harbor',null,data);
const created=state.custom[0];assert.equal(created.agentId,'harbor');assert.deepEqual(created.point,[22.28,114.16]);
assert.equal(belongsToAudience(created,'city'),false);assert.equal(belongsToAudience(created,'harbor'),true);
assert.throws(()=>updateOwnedPost(state,seeds,'city',created.id,data),/只能編輯/);
updateOwnedPost(state,seeds,'harbor',created.id,{...data,status:'draft'});
assert.equal(belongsToAudience({...created,...state.edits[created.id]},'harbor'),false);
console.log('Agency ownership, invitation, publication and scope checks passed');

import {resolveEntry,sessionRole,tokenDigest,userInviteToken} from './public/agency-core.js';
const partner='Ab3De6Gh9Jk2Mn5P', user=await userInviteToken(partner);
const registry={harbor:{partnerHash:await tokenDigest(partner),userHash:await tokenDigest(user)}};
assert.equal((await resolveEntry(partner,blankAgencyState(),registry)).kind,'partner');
assert.equal((await resolveEntry(user,blankAgencyState(),registry)).kind,'pending');
for(const old of ['10001','90001','HK-HARBOR',partner.toUpperCase(),partner.slice(0,-1)+'b'])assert.equal((await resolveEntry(old,blankAgencyState(),registry)).kind,'invalid');
assert.equal((await resolveEntry(user,{binding:'city',disabled:[]},registry)).kind,'conflict');
assert.equal((await resolveEntry(user,{binding:null,disabled:['harbor']},registry)).kind,'disabled');
assert.equal((await resolveEntry(user,{binding:'harbor',disabled:['harbor']},registry)).kind,'bound');
assert.equal(sessionRole({session:{role:'partner',agentId:'city'}}),null);
assert.equal(sessionRole({session:{version:3,role:'partner',agentId:'city'}}),'partner');
assert.equal(sessionRole({binding:'harbor',session:{version:3,role:'user'}}),'user');
console.log('Token roles, rejected legacy codes, case sensitivity and binding checks passed');

assert.equal(user.length,16);assert.match(user,/^[A-Za-z0-9]{16}$/);for(const invalid of [partner.slice(1),partner+'Z','tp_a_'+'a'.repeat(64)])assert.equal((await resolveEntry(invalid,blankAgencyState(),registry)).kind,'invalid');

import {agentsFor,requireAdmin,addAgent,renameAgent,toggleAgent,rotateAgentTokens} from './public/agency-core.js';
const admin=blankAgencyState();admin.session={version:3,role:'admin'};
const rootToken='RootDemoToken123';
assert.equal((await resolveEntry(rootToken,blankAgencyState(),registry,await tokenDigest(rootToken))).kind,'admin');
for(const role of ['user','partner']){const other={...blankAgencyState(),binding:'harbor',session:{version:3,role,agentId:'harbor'}};assert.throws(()=>requireAdmin(other));assert.throws(()=>toggleAgent(other,'harbor'));await assert.rejects(()=>addAgent(other,'Forbidden'));await assert.rejects(()=>rotateAgentTokens(other,'harbor'));}
const added=await addAgent(admin,'Test Partner');assert.equal(added.partnerToken.length,16);assert.equal(agentsFor(admin).length,3);
assert.equal((await resolveEntry(added.partnerToken,admin)).kind,'partner');
assert.equal((await resolveEntry(added.userToken,admin)).kind,'pending');
renameAgent(admin,added.id,'Renamed');assert.equal(agentsFor(admin).find(a=>a.id===added.id).name,'Renamed');
toggleAgent(admin,added.id);assert.equal((await resolveEntry(added.partnerToken,admin)).kind,'suspended');assert.equal((await resolveEntry(added.userToken,admin)).kind,'suspended');
assert.equal(sessionRole({...admin,session:{version:3,role:'partner',agentId:added.id,tokenRevision:1}}),null);
toggleAgent(admin,added.id);
const rotated=await rotateAgentTokens(admin,added.id);assert.equal((await resolveEntry(added.partnerToken,admin)).kind,'invalid');assert.equal((await resolveEntry(added.userToken,admin)).kind,'invalid');assert.equal((await resolveEntry(rotated.partnerToken,admin)).kind,'partner');
assert.equal(sessionRole({...admin,session:{version:3,role:'partner',agentId:added.id,tokenRevision:1}}),null);
assert.equal(sessionRole({...admin,session:{version:3,role:'partner',agentId:added.id,tokenRevision:2}}),'partner');
assert.ok(admin.audit.length);assert.ok(!JSON.stringify(admin).includes(rotated.partnerToken));
console.log('Admin ownership, creation, suspension, token rotation and session revision checks passed');

import {availableThreads,ensureUserThread,sendThreadMessage,markThreadRead,unreadThread} from './public/chat-core.js';
const chatDb={...blankAgencyState(),deviceId:'device-one',binding:'harbor',session:{version:3,role:'user'}};
const thread=ensureUserThread(chatDb,{name:'Test User'});
sendThreadMessage(chatDb,thread.id,'想了解 Chloe',{id:1,name:'Chloe'});
assert.equal(thread.agentId,'harbor');assert.equal(thread.messages[0].sender,'user');assert.equal(thread.messages.length,1);
assert.equal(ensureUserThread(chatDb,{name:'New Name'}).id,thread.id);
chatDb.session={version:3,role:'partner',agentId:'city'};assert.equal(availableThreads(chatDb).length,0);assert.throws(()=>sendThreadMessage(chatDb,thread.id,'wrong agent'));
chatDb.session={version:3,role:'admin'};assert.equal(availableThreads(chatDb).length,0);
chatDb.session={version:3,role:'partner',agentId:'harbor'};assert.equal(unreadThread(chatDb,thread),1);markThreadRead(chatDb,thread.id);assert.equal(unreadThread(chatDb,thread),0);sendThreadMessage(chatDb,thread.id,'這裡是維港代理');assert.equal(thread.messages[1].sender,'partner');assert.equal(thread.messages.length,2);
chatDb.session={version:3,role:'user'};assert.equal(unreadThread(chatDb,thread),1);chatDb.deviceId='other-device';assert.equal(availableThreads(chatDb).length,0);assert.throws(()=>sendThreadMessage(chatDb,thread.id,'wrong user'));
chatDb.deviceId='device-one';chatDb.suspended=['harbor'];assert.equal(availableThreads(chatDb).length,0);
console.log('User-to-partner messaging, sender attribution, unread counts and isolation checks passed');

const personaDb={...blankAgencyState(),deviceId:"persona-device",binding:"harbor",session:{version:3,role:"user"}};
const first=ensureUserThread(personaDb,{name:"Tester"},{id:1,name:"Chloe"});const second=ensureUserThread(personaDb,{name:"Tester"},{id:3,name:"Mika"});assert.notEqual(first.id,second.id);assert.equal(ensureUserThread(personaDb,{name:"Tester"},{id:1,name:"Chloe"}).id,first.id);sendThreadMessage(personaDb,first.id,"Hello Chloe");assert.equal(second.messages.length,0);assert.equal(first.person.name,"Chloe");assert.equal(ensureUserThread(personaDb,{name:"Tester"}).person,null);console.log("Person-specific conversation isolation passed");

const {normalizeEntryToken}=await import('./public/agency-core.js');
assert.equal(normalizeEntryToken(' \u200b`AbCdEf0123456789`\n'),'AbCdEf0123456789');
assert.equal(normalizeEntryToken('AbCd Ef0123 456789'),'AbCdEf0123456789');
assert.notEqual(normalizeEntryToken('abcdefgh12345678'),normalizeEntryToken('Abcdefgh12345678'),'case is preserved');
assert.equal(normalizeEntryToken('ＡbCdEf0123456789'),'ＡbCdEf0123456789','fullwidth characters are not silently converted');
console.log('Token paste formatting and case-preservation checks passed.');
