import { readFile, readdir, lstat, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, PUBLIC_FILES } from './files.mjs';
import { outputEvidence } from './output-evidence.mjs';

const evidence=join(ROOT,'evidence','m1');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
async function sourceSnapshot() {
  const paths=[];
  async function walk(relative) {
    const target=join(ROOT,relative), stat=await lstat(target);
    if(stat.isSymbolicLink()) throw new Error('SOURCE_LINK');
    if(stat.isDirectory()) for(const name of await readdir(target)) await walk(`${relative}/${name}`);
    else if(stat.isFile()) paths.push(relative);
    else throw new Error('SOURCE_UNSAFE');
  }
  // Mutable handoff/progress records, generated dist and evidence are deliberately
  // separate. Everything executable, both static pages and immutable specs are fixed.
  for(const item of ['.gitignore','package.json','AGENTS.md','ACCEPTANCE.md','PRODUCT.md','README.md','START-HERE.md','TASKS.md','TECHNICAL.md','UX-SEO.md','docs','public','scripts','test']) await walk(item);
  const files=[];
  for(const path of paths.sort()) { const bytes=await readFile(join(ROOT,path)); files.push({path,bytes:bytes.length,sha256:hash(bytes)}); }
  const lines=files.map(file=>`${file.path}\0${file.bytes}\0${file.sha256}\n`).join('');
  return {scope:'Implementation, tests, scripts, immutable specifications. Excludes HANDOFF.md, TASK-ENTRY.md, generated dist and evidence.',files:files.length,bytes:files.reduce((sum,file)=>sum+file.bytes,0),sha256:hash(lines),entries:files};
}
async function save(name,data) { await writeFile(join(evidence,name),`${JSON.stringify(data,null,2)}\n`,{flag:'wx'}); }
await mkdir(evidence,{recursive:true});
const before=await sourceSnapshot(); await save('source-before.json',before);
const npmCli=join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'); await access(npmCli);
const commands=[];
for(const [label,args,file] of [['npm test',['test'],'test'],['npm run check',['run','check'],'check'],['npm run build',['run','build'],'build']]) {
  const result=spawnSync(process.execPath,[npmCli,...args],{cwd:ROOT,encoding:'utf8',shell:false,windowsHide:true,timeout:60_000});
  await writeFile(join(evidence,`t04-final-${file}.log`),`${result.stdout??''}${result.stderr??''}`,{flag:'wx'});
  const entry={command:label,invocation:[process.execPath,npmCli,...args],exitCode:result.status,error:result.error?.code??null};
  if(file==='test') entry.counts={tests:Number(result.stdout.match(/(?:ℹ|#) tests (\d+)/)?.[1]??NaN),pass:Number(result.stdout.match(/(?:ℹ|#) pass (\d+)/)?.[1]??NaN),fail:Number(result.stdout.match(/(?:ℹ|#) fail (\d+)/)?.[1]??NaN)};
  commands.push(entry);
  if(result.status!==0) { await save('commands.json',{status:'FAIL',commands}); throw new Error(`FINAL_COMMAND_FAILED:${label}`); }
}
await save('commands.json',{status:'PASS',node:process.version,commands});
const outputs=await outputEvidence();
const dist=[];
for(const path of PUBLIC_FILES) {
  const source=await readFile(join(ROOT,'public',path)), built=await readFile(join(ROOT,'dist',path)); assert.deepEqual(built,source);
  dist.push({path,bytes:built.length,sha256:hash(built)});
}
const after=await sourceSnapshot(); await save('source-after.json',after); assert.deepEqual(after,before);
await save('dist-manifest.json',{status:'PASS',mode:'preview-noindex',files:dist.length,bytes:dist.reduce((sum,file)=>sum+file.bytes,0),entries:dist});
await save('fixed-candidate.json',{status:'PASS_M1_LOCAL_ONLY',sourceUnchanged:true,source:{files:after.files,bytes:after.bytes,sha256:after.sha256},distFiles:dist.length,outputFiles:outputs.files.length,browser:'NOT_RUN_USER_FOCUS_INCIDENT',publication:'NOT_PUBLISHED',hosting:'NOT_DEPLOYED'});
process.stdout.write(`${JSON.stringify({status:'PASS_M1_LOCAL_ONLY',source:{files:after.files,bytes:after.bytes,sha256:after.sha256},commands})}\n`);
