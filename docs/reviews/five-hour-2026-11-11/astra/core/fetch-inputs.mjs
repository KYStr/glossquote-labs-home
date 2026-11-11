import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'input-manifest.json'),'utf8'));
const files=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<manifest.length){
  const row=manifest[cursor++];
  const r=await fetch('https://raw.githubusercontent.com/KYStr/glossquote-labs-home/'+row.commit+'/'+row.path,{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error('HTTP '+r.status+' '+row.path);
  const data=Buffer.from(await r.arrayBuffer());const blob=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
  if(blob!==row.blob)throw Error('Input Git blob mismatch '+row.path);
  const dest=path.join(root,row.kind,row.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data,{flag:'wx'});
  files.push({...row,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),status:'PASS'});
 }
}));
files.sort((a,b)=>(a.kind+a.path).localeCompare(b.kind+b.path));
await fs.writeFile(path.join(root,'public-byte-verification.json'),JSON.stringify({status:'PASS',observedAt:new Date().toISOString(),files},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',files:files.length}));
