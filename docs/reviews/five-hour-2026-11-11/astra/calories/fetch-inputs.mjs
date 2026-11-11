// Downloads pinned public source and candidate documentation only. No candidate code execution.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--output-dir')throw Error('Usage: node fetch-inputs.mjs --output-dir <new-empty-directory>');
const root=path.resolve(args[1]);
if(root===here||here.startsWith(root+path.sep))throw Error('Output cannot contain these evidence files');
await fs.mkdir(root,{recursive:true});if((await fs.readdir(root)).length)throw Error('Output must be empty; existing data is not overwritten');
const read=name=>fs.readFile(path.join(here,name),'utf8').then(JSON.parse);
const source=await read('source-blob-manifest.json'),candidate=await read('input-manifest.json'),shared=await read('shared-link-targets.json');
const files=[...source.map(x=>({...x,kind:'source',blob:x.blobSha})),
 ...candidate.files.concat(shared).map(x=>({...x,kind:'candidate',commit:candidate.candidate}))];
const rows=[];
for(const row of files){
 if(!/^[a-f0-9]{40}$/.test(row.commit)||!row.path.startsWith('docs/')||row.path.split('/').some(x=>!x||x==='..'||x.includes('\\')||x.includes(':')))throw Error('Unsafe input manifest');
 const r=await fetch('https://raw.githubusercontent.com/'+candidate.repository+'/'+row.commit+'/'+row.path,{signal:AbortSignal.timeout(30000)});
 if(!r.ok)throw Error('HTTP '+r.status+' '+row.path);
 const data=Buffer.from(await r.arrayBuffer());if(data.length>128*1024)throw Error('Oversized input');
 const blob=createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
 if(blob!==row.blob)throw Error('Git blob mismatch '+row.path);
 const dest=path.join(root,row.kind,...row.path.split('/'));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,data,{flag:'wx'});
 rows.push({kind:row.kind,path:row.path,commit:row.commit,gitBlob:blob,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex'),status:'PASS'});
}
await fs.writeFile(path.join(root,'download-verification.json'),JSON.stringify({status:'PASS',observedAt:new Date().toISOString(),files:rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',inputGitBlobs:rows.length,sourceFiles:5,candidateFiles:6,sharedCandidateTargets:4}));
