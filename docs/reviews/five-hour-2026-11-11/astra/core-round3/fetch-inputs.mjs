import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'input-manifest.json'),'utf8'));
const results=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<manifest.length){
 const row=manifest[cursor++];const response=await fetch('https://raw.githubusercontent.com/'+row.repository+'/'+row.commit+'/'+row.path,{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('HTTP '+response.status+' '+row.path);const bytes=Buffer.from(await response.arrayBuffer());
 const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');if(blob!==row.blob)throw Error('Git blob mismatch '+row.path);
 const file=path.join(root,row.destination);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});
 results.push({...row,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),status:'PASS'});
}}));
results.sort((a,b)=>a.destination.localeCompare(b.destination));await fs.writeFile(path.join(root,'download-verification.json'),JSON.stringify({status:'PASS',files:results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',files:results.length}));
