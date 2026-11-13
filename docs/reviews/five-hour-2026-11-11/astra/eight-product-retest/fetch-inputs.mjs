import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(await fs.readFile(path.join(root,'input-manifest.json'),'utf8'));
const results=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<manifest.length){
 const row=manifest[cursor++];assert.equal(row.repository,'KYStr/glossquote-labs-home');assert.match(row.blob,/^[0-9a-f]{40}$/);
 const isBlob=row.kind==='git-blob-api';if(!isBlob){assert.match(row.commit,/^[0-9a-f]{40}$/);assert(!row.path.split('/').includes('..'));}
 const url=isBlob?'https://api.github.com/repos/'+row.repository+'/git/blobs/'+row.blob:'https://raw.githubusercontent.com/'+row.repository+'/'+row.commit+'/'+row.path;
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('HTTP '+response.status+' '+row.destination);
 let bytes;if(isBlob){const payload=await response.json();assert.equal(payload.encoding,'base64');assert.equal(payload.sha,row.blob);bytes=Buffer.from(payload.content.replace(/\s/g,''),'base64');}else bytes=Buffer.from(await response.arrayBuffer());
 assert(bytes.length<8*1024*1024);const blob=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');assert.equal(blob,row.blob,row.destination);
 const file=path.resolve(root,row.destination);assert(file.startsWith(root+path.sep));await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes,{flag:'wx'});
 results.push({...row,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),status:'PASS'});
}}));
results.sort((a,b)=>a.destination.localeCompare(b.destination));await fs.writeFile(path.join(root,'download-verification.json'),JSON.stringify({status:'PASS',files:results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:'PASS',files:results.length}));

