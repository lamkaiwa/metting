import {randomInt,createHash} from 'node:crypto';
import {mkdir,writeFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const localRegistry=join(root,'server','token-registry.local.js');
try {
  await access(localRegistry);
  console.log('Local token registry already exists; no credentials were changed.');
  process.exit(0);
} catch(error) { if(error.code!=='ENOENT')throw error; }
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const randomToken=()=>Array.from({length:16},()=>alphabet[randomInt(alphabet.length)]).join('');
const digest=value=>createHash('sha256').update(value).digest('hex');
function invitation(token){
  let n=BigInt('0x'+digest('tongpin-invite:'+token)),result='';
  for(let i=0;i<16;i++){result+=alphabet[Number(n%62n)];n/=62n;}
  return result;
}
const agents=[{id:'harbor',agent:'維港同頻'},{id:'city',agent:'城市漫遊'}];
const registry={},entries=[];
for(const agent of agents){
  const partnerToken=randomToken(),userToken=invitation(partnerToken);
  registry[agent.id]={partnerHash:digest(partnerToken),userHash:digest(userToken)};
  entries.push({agent:agent.agent,partnerToken,userToken});
}
const admin=randomToken();
await mkdir(join(root,'.private'),{recursive:true});
await writeFile(join(root,'.private','entry-tokens.json'),JSON.stringify(entries,null,2)+'\n',{flag:'wx',mode:0o600});
await writeFile(join(root,'.private','admin-token.txt'),admin+'\n',{flag:'wx',mode:0o600});
await writeFile(localRegistry,'export const TOKEN_HASHES='+JSON.stringify(registry)+';\nexport const ADMIN_HASH='+JSON.stringify(digest(admin))+';\n',{flag:'wx',mode:0o600});
console.log('New local bootstrap credentials created. Read .private/entry-tokens.json and .private/admin-token.txt locally.');
console.log('They differ from the live website credentials and are excluded from Git.');
