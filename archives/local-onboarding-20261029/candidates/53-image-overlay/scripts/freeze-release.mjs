import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { ROOT } from './files.mjs';

const evidence=join(ROOT,'evidence','m1b'), digest=bytes=>createHash('sha256').update(bytes).digest('hex');
async function snapshot(paths) {
  const entries=[];
  async function walk(path) {
    const stat=await lstat(join(ROOT,path));
    if(stat.isSymbolicLink()) throw new Error('SNAPSHOT_LINK');
    if(stat.isDirectory()) for(const name of (await readdir(join(ROOT,path))).sort()) await walk(`${path}/${name}`);
    else { const bytes=await readFile(join(ROOT,path)); entries.push({path,bytes:bytes.length,sha256:digest(bytes)}); }
  }
  for(const path of paths) await walk(path);
  entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  return {files:entries.length,bytes:entries.reduce((sum,file)=>sum+file.bytes,0),sha256:digest(entries.map(file=>`${file.path}\0${file.bytes}\0${file.sha256}\n`).join('')),entries};
}
async function save(name,data) { await writeFile(join(evidence,name),`${JSON.stringify(data,null,2)}\n`,{flag:'wx'}); }
const fixedPaths=['.gitignore','package.json','AGENTS.md','ACCEPTANCE.md','PRODUCT.md','README.md','START-HERE.md','TASKS.md','TECHNICAL.md','UX-SEO.md','M1B-RELEASE.md','docs','public','scripts','test'];
const sourceBefore=await snapshot(fixedPaths); await save('source-before.json',sourceBefore);
const protectedBefore=JSON.parse(await readFile(join(evidence,'protected-before.json'),'utf8'));
const protectedPaths=['public','dist','evidence/m1'];
const protectedInitial=await snapshot(protectedPaths);
for(const key of ['files','bytes','sha256']) {
  // The original protected capture used depth-first paths rather than global
  // sorting; compare entries below, then save our canonical snapshot after work.
  if(key!=='sha256') assert.equal(protectedInitial[key],protectedBefore[key]);
}
assert.deepEqual(protectedInitial.entries,[...protectedBefore.entries].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0));
const npmCli=join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js'), commands=[];
for(const [command,args,log] of [
  ['npm test',['test'],'final-test.log'],['npm run check',['run','check'],'final-check.log'],
  ['npm run build:release',['run','build:release'],'final-build-release.log'],['npm run check:release',['run','check:release'],'final-check-release.log']
]) {
  const result=spawnSync(process.execPath,[npmCli,...args],{cwd:ROOT,shell:false,windowsHide:true,encoding:'utf8',timeout:60_000});
  await writeFile(join(evidence,log),`${result.stdout??''}${result.stderr??''}`,{flag:'wx'});
  const record={command,exitCode:result.status,error:result.error?.code??null};
  if(command==='npm test') record.counts={tests:Number(result.stdout.match(/(?:ℹ|#) tests (\d+)/)?.[1]??NaN),pass:Number(result.stdout.match(/(?:ℹ|#) pass (\d+)/)?.[1]??NaN),fail:Number(result.stdout.match(/(?:ℹ|#) fail (\d+)/)?.[1]??NaN),skipped:Number(result.stdout.match(/(?:ℹ|#) skipped (\d+)/)?.[1]??NaN)};
  commands.push(record);
  if(result.status!==0) { await save('commands.json',{status:'FAIL',node:process.version,commands}); throw new Error(`FAILED:${command}`); }
}
await save('commands.json',{status:'PASS_OFFLINE_ONLY',node:process.version,invocation:'native Node npm-cli; shell:false windowsHide:true; sequential',commands});
const sourceAfter=await snapshot(fixedPaths); assert.deepEqual(sourceAfter,sourceBefore); await save('source-after.json',sourceAfter);
const protectedAfter=await snapshot(protectedPaths); assert.deepEqual(protectedAfter,protectedInitial);
await save('protected-after.json',{...protectedAfter,scope:protectedPaths,unchanged:true,originalBeforeSha256:protectedBefore.sha256});
const artifacts=await snapshot(['release-artifacts']); await save('artifact-manifest.json',artifacts);
const manifest=JSON.parse(await readFile(join(ROOT,'release-artifacts','manifest.json'),'utf8'));
const result={status:'PASS_M1B_OFFLINE_ONLY',origin:manifest.origin,toolSlug:manifest.toolSlug,source:{files:sourceAfter.files,bytes:sourceAfter.bytes,sha256:sourceAfter.sha256},artifacts:{files:artifacts.files,bytes:artifacts.bytes,sha256:artifacts.sha256},site:{files:manifest.files.length,bytes:manifest.files.reduce((sum,file)=>sum+file.bytes,0)},manifestSha256:artifacts.entries.find(file=>file.path==='release-artifacts/manifest.json').sha256,sourceUnchanged:true,publicDistAndOldM1EvidenceUnchanged:true,browser:'NOT_RUN_USER_FOCUS_INCIDENT',hosting:'NOT_DEPLOYED',sourcePublication:'NOT_PUBLISHED',requiredNext:'Primary independent review and necessary browser acceptance before M2 decision'};
await save('summary.json',result); process.stdout.write(`${JSON.stringify({...result,commands})}\n`);
