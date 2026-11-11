// Built-in Node modules only. Downloads public pinned inputs; executes no candidate code.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const here=path.dirname(fileURLToPath(import.meta.url));
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--output-dir')throw new Error('Usage: node fetch-inputs.mjs --output-dir <new-empty-directory>');
const root=path.resolve(args[1]);
if(root===here||here.startsWith(root+path.sep))throw new Error('Output cannot contain these evidence files');
await fs.mkdir(root,{recursive:true});
if((await fs.readdir(root)).length)throw new Error('Output directory must be empty; no existing data will be overwritten');
const source=JSON.parse(await fs.readFile(path.join(here,'source-blob-manifest.json'),'utf8'));
const candidate=JSON.parse(await fs.readFile(path.join(here,'public-blob-manifest.json'),'utf8'));
const expected=JSON.parse(await fs.readFile(path.join(here,'offline-review.json'),'utf8'));
const listed=JSON.parse(await fs.readFile(path.join(here,'pr-files.json'),'utf8')).filenames;
const wanted=candidate.files.map(x=>x.path).sort();
if(JSON.stringify([...listed].sort())!==JSON.stringify(wanted))throw new Error('Recorded PR scope differs');
const sha=(algo,b)=>createHash(algo).update(b).digest('hex');
const inputs=[...source.map(x=>({kind:'source',...x,sha:x.blobSha})),
 ...candidate.files.map(x=>({kind:'candidate',...x,commit:candidate.candidate}))];
const out=[];let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
 while(cursor<inputs.length){
  const row=inputs[cursor++];
  if(!/^[0-9a-f]{40}$/.test(row.commit)||!row.path.startsWith('docs/')||row.path.split('/').some(x=>!x||x==='..'||x.includes('\\')||x.includes(':')))throw new Error('Unsafe pinned input');
  const response=await fetch('https://raw.githubusercontent.com/KYStr/glossquote-labs-home/'+row.commit+'/'+row.path,{signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('HTTP '+response.status+' '+row.path);
  const b=Buffer.from(await response.arrayBuffer());if(b.length>128*1024)throw new Error('Oversized input');
  const blob=sha('sha1',Buffer.concat([Buffer.from('blob '+b.length+'\0'),b]));
  if(blob!==row.sha)throw new Error('Git blob mismatch '+row.path);
  const original=row.kind==='candidate'?expected.files.find(x=>x.path===row.path):null;
  const tested=original?original.sha256===sha('sha256',b)&&original.bytes===b.length:null;
  if(original&&!tested)throw new Error('Reviewed snapshot mismatch '+row.path);
  const dest=path.join(root,row.kind,...row.path.split('/'));
  await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,b,{flag:'wx'});
  out.push({kind:row.kind,path:row.path,bytes:b.length,gitBlob:blob,sha256:sha('sha256',b),matchesTestedSnapshot:tested,status:'PASS'});
 }
}));
out.sort((a,b)=>(a.kind+'/'+a.path).localeCompare(b.kind+'/'+b.path,'en'));
const links=[];
for(const row of out.filter(x=>x.kind==='candidate'&&x.path.endsWith('.md'))){
 const t=await fs.readFile(path.join(root,'candidate',...row.path.split('/')),'utf8');
 for(const m of t.matchAll(/\]\(([^)]+)\)/g)){
  const target=m[1];if(/^(https?:|#)/.test(target))continue;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(row.path),target.split('#')[0]));
  links.push({source:row.path,target,resolved,exists:wanted.includes(resolved)});
 }
}
if(links.some(x=>!x.exists))throw new Error('Missing relative candidate link');
const report={observedAt:new Date().toISOString(),status:'PASS',files:out,relativeLinks:links,
 sourceFiles:source.length,candidateFiles:candidate.files.length,testedSpecMatches:out.filter(x=>x.matchesTestedSnapshot).length};
await fs.writeFile(path.join(root,'download-verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,sourceFiles:report.sourceFiles,candidateFiles:report.candidateFiles,testedSpecMatches:report.testedSpecMatches,relativeLinks:links.length}));
