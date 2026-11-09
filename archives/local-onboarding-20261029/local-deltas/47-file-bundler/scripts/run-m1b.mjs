import { spawnSync } from 'node:child_process';
import { readFile, writeFile, readdir, lstat, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { ROOT } from './assets.mjs';

const [label,powershell,guard]=process.argv.slice(2);
if(!/^(?:capture|targeted(?:-[0-9]+)?|final(?:-[0-9]+)?)$/.test(label??'')||!powershell||!guard||process.argv.length!==5)throw new Error('M1B_USAGE');
const evidence=join(ROOT,'evidence','m1b');
await mkdir(evidence,{recursive:true});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function run(args,executable=process.execPath) {
  const r=spawnSync(executable,args,{cwd:ROOT,shell:false,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  return {exitCode:r.status,signal:r.signal,stdout:r.stdout??'',stderr:r.stderr??'',error:r.error?'PROCESS_FAILED':null};
}
function environment() {
  const r=run(['-NoProfile','-NonInteractive','-File',guard],powershell);
  if(r.exitCode!==0)throw new Error('ENVIRONMENT_GUARD_FAILED');
  const snapshot=JSON.parse(r.stdout.replace(/^\uFEFF/,''));
  if(snapshot.Status!=='PASS')throw new Error('ENVIRONMENT_GUARD_FAILED');
  return snapshot;
}
async function protectedFiles() {
  const files=[];
  async function walk(path) {
    const info=await lstat(join(ROOT,path));if(info.isSymbolicLink())throw new Error('PROTECTED_LINK');
    if(info.isDirectory())for(const item of await readdir(join(ROOT,path)))await walk(`${path}/${item}`);
    else if(info.isFile()){const bytes=await readFile(join(ROOT,path));files.push({path,bytes:bytes.length,sha256:hash(bytes)});}
    else throw new Error('PROTECTED_TYPE');
  }
  for(const path of ['public','dist','evidence/m1'])await walk(path);
  return files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
if(label==='capture') {
  const snapshot=environment();const protectedBefore=await protectedFiles();
  await writeFile(join(evidence,'entry-environment.json'),JSON.stringify(snapshot,null,2)+'\n',{flag:'wx'});
  await writeFile(join(evidence,'protected-before.json'),JSON.stringify(protectedBefore,null,2)+'\n',{flag:'wx'});
  process.stdout.write(`M1B BASELINE PASS: ${protectedBefore.length} protected files; environment guard PASS.\n`);
} else {
  const target=join(evidence,`${label}-commands.json`);
  try{await access(target);throw new Error('EVIDENCE_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
  const baseline=JSON.parse(await readFile(join(evidence,'entry-environment.json'),'utf8'));
  const before=environment();
  if(JSON.stringify(before.Snapshots)!==JSON.stringify(baseline.Snapshots))throw new Error('PERSISTENT_ENVIRONMENT_DRIFT');
  await writeFile(join(evidence,`${label}-environment-before.json`),JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  const npm=join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
  const list=label.startsWith('targeted')?[['node --test test/release.test.mjs',['--test','test/release.test.mjs']]]:[['node --version',['--version']],['npm test',[npm,'test']],['npm run check',[npm,'run','check']],['npm run build:release',[npm,'run','build:release']],['npm run check:release',[npm,'run','check:release']]];
  const commands=[];
  for(const [command,args]of list){const r=run(args);commands.push({command,...r});process.stdout.write(`${command}: exit ${r.exitCode}\n${r.stdout}${r.stderr}`);if(r.exitCode!==0)break;}
  await writeFile(target,JSON.stringify({label,shell:false,windowsHide:true,commands},null,2)+'\n',{flag:'wx'});
  const after=environment();
  await writeFile(join(evidence,`${label}-environment-after.json`),JSON.stringify(after,null,2)+'\n',{flag:'wx'});
  const protectedAfter=await protectedFiles();
  const pinned=JSON.parse(await readFile(join(evidence,'protected-before.json'),'utf8'));
  const environmentUnchanged=JSON.stringify(after.Snapshots)===JSON.stringify(baseline.Snapshots);
  const protectedUnchanged=JSON.stringify(protectedAfter)===JSON.stringify(pinned);
  await writeFile(join(evidence,`${label}-invariants.json`),JSON.stringify({environmentUnchanged,protectedUnchanged,protectedFiles:protectedAfter.length,files:protectedAfter},null,2)+'\n',{flag:'wx'});
  if(!environmentUnchanged)throw new Error('PERSISTENT_ENVIRONMENT_DRIFT');
  if(!protectedUnchanged)throw new Error('PROTECTED_FILES_CHANGED');
  if(commands.length!==list.length||commands.some(r=>r.exitCode!==0))process.exitCode=1;
}
