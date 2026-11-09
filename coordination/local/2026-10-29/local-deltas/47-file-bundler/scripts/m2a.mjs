import { spawnSync } from 'node:child_process';
import { lstat,readdir,readFile,writeFile,mkdir,rename,realpath,access } from 'node:fs/promises';
import { resolve,relative,join,dirname,sep } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './assets.mjs';

const [mode,powershell,guard]=process.argv.slice(2);
if(!['archive','verify','seal'].includes(mode)||process.argv.length!==5)throw new Error('M2A_USAGE');
const evidence=join(ROOT,'evidence','m2a');await mkdir(evidence,{recursive:true});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sort=files=>files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const aggregate=files=>sha(sort([...files]).map(file=>`${file.path}\t${file.bytes}\t${file.sha256}\n`).join(''));
const save=async(name,value)=>writeFile(join(evidence,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const load=async name=>JSON.parse(await readFile(join(evidence,name),'utf8'));
function run(executable,args) {
  const result=spawnSync(executable,args,{cwd:ROOT,shell:false,windowsHide:true,encoding:'utf8',timeout:45000,maxBuffer:8*1024*1024});
  return {exitCode:result.status,signal:result.signal,stdout:result.stdout??'',stderr:result.stderr??'',error:result.error?'PROCESS_FAILED':null};
}
function environment() {
  const r=run(powershell,['-NoProfile','-NonInteractive','-File',guard]);if(r.exitCode!==0)throw new Error('ENVIRONMENT_GUARD_FAILED');
  const value=JSON.parse(r.stdout.replace(/^\uFEFF/,''));if(value.Status!=='PASS')throw new Error('ENVIRONMENT_GUARD_FAILED');return value;
}
async function walk(path) {
  const info=await lstat(join(ROOT,path));if(info.isSymbolicLink())throw new Error('UNSAFE_LINK');
  if(info.isFile())return [path];if(!info.isDirectory())throw new Error('UNSAFE_TYPE');
  const paths=[];for(const name of await readdir(join(ROOT,path)))paths.push(...await walk(`${path}/${name}`));return paths;
}
async function records(paths) {
  const result=[];
  for(const path of paths){if(path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>part==='..'||!part))throw new Error('UNSAFE_PATH');const bytes=await readFile(join(ROOT,path));result.push({path,bytes:bytes.length,sha256:sha(bytes)});}
  return sort(result);
}
const protectedPaths=async()=>[...await walk('public'),...await walk('dist'),...await walk('evidence/m1'),...await walk('evidence/m1b')];
async function sameProtected() {
  const before=await load('protected-before.json'),after=await records(await protectedPaths());
  if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('PROTECTED_FILES_CHANGED');return after;
}
if(mode==='archive') {
  await save('environment-entry.json',environment());
  await save('protected-before.json',await records(await protectedPaths()));
  const frozen=JSON.parse(await readFile(join(ROOT,'evidence/m1b/source-artifact-manifest.json'),'utf8'));
  const original=(await records(await walk('release-artifacts'))).map(file=>({...file,path:file.path.slice('release-artifacts/'.length)}));
  if(aggregate(original)!=='422ac6779ef7208e57888530b413726d987b7db3f9f5b21104d3d4afcd3182cf'||JSON.stringify(original)!==JSON.stringify(frozen.artifacts))throw new Error('OLD_RELEASE_NOT_FROZEN_M1B');
  const source=await realpath(join(ROOT,'release-artifacts'));
  const destination=resolve(evidence,'previous-release-artifacts');
  const parent=await realpath(evidence);const workspace=await realpath(ROOT);
  for(const target of [source,destination,parent]){const local=relative(workspace,target);if(!local||local==='..'||local.startsWith(`..${sep}`)||local.includes(':'))throw new Error('ARCHIVE_PATH_OUTSIDE_TOOL');}
  if((await lstat(evidence)).isSymbolicLink()||resolve(parent).toLowerCase()!==resolve(evidence).toLowerCase())throw new Error('ARCHIVE_PARENT_LINK');
  try{await access(destination);throw new Error('ARCHIVE_ALREADY_EXISTS');}catch(error){if(error.code!=='ENOENT')throw error;}
  // One verified tool-owned directory, moved intact within this tool; never deleted.
  await rename(source,destination);
  const archived=(await records(await walk('evidence/m2a/previous-release-artifacts'))).map(file=>({...file,path:file.path.slice('evidence/m2a/previous-release-artifacts/'.length)}));
  if(JSON.stringify(archived)!==JSON.stringify(original))throw new Error('ARCHIVE_BYTES_CHANGED');
  await save('archive.json',{status:'PASS',operation:'verified same-workspace rename, no deletion',artifactSha256:aggregate(archived),files:archived});
  process.stdout.write(`ARCHIVE PASS: ${archived.length} original artifacts preserved.\n`);
} else if(mode==='verify') {
  const baseline=await load('environment-entry.json'),before=environment();
  if(JSON.stringify(before.Snapshots)!==JSON.stringify(baseline.Snapshots))throw new Error('PERSISTENT_ENVIRONMENT_DRIFT');
  await sameProtected();await save('environment-before-checks.json',before);
  const npm=join(dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');
  const commands=[];
  for(const [command,args]of [['node --version',['--version']],['node --test test/release.test.mjs test/deployment-config.test.mjs',['--test','test/release.test.mjs','test/deployment-config.test.mjs']],['npm run check',[npm,'run','check']],['npm run build:release',[npm,'run','build:release']],['npm run check:release',[npm,'run','check:release']]]) {
    const result=run(process.execPath,args);commands.push({command,...result});process.stdout.write(`${command}: exit ${result.exitCode}\n${result.stdout}${result.stderr}`);if(result.exitCode!==0)break;
  }
  await save('commands.json',{scope:'related release/config only; no core large tests or browser',shell:false,windowsHide:true,commands});
  const after=environment();await save('environment-after-checks.json',after);
  if(JSON.stringify(after.Snapshots)!==JSON.stringify(baseline.Snapshots))throw new Error('PERSISTENT_ENVIRONMENT_DRIFT');
  await save('protected-after.json',await sameProtected());
  if(commands.length!==5||commands.some(command=>command.exitCode!==0))process.exitCode=1;
} else {
  const protectedFiles=await sameProtected();
  const previous=await load('archive.json');
  const current=(await records(await walk('release-artifacts'))).map(file=>({...file,path:file.path.slice('release-artifacts/'.length)}));
  const changes=[];
  for(const old of previous.files){const found=current.find(file=>file.path===old.path);if(!found)throw new Error('RELEASE_FILE_REMOVED');if(found.sha256!==old.sha256)changes.push(old.path);}
  if(current.length!==previous.files.length||JSON.stringify(changes.sort())!==JSON.stringify(['manifest.json','site/en/index.html','site/index.html']))throw new Error('UNEXPECTED_RELEASE_DELTA');
  const badges={'site/index.html':'<span class="candidate">本機候選版；尚未部署</span>','site/en/index.html':'<span class="candidate">Local candidate; not deployed</span>'};
  for(const [path,badge]of Object.entries(badges)){const old=await readFile(join(evidence,'previous-release-artifacts',path),'utf8');const fresh=await readFile(join(ROOT,'release-artifacts',path),'utf8');if(old.split(badge).length!==2||old.replace(badge,'')!==fresh)throw new Error('NOT_EXACT_BADGE_ONLY_DELTA');}
  const specs=['START-HERE.md','AGENTS.md','README.md','PRODUCT.md','TECHNICAL.md','UX-SEO.md','ACCEPTANCE.md','TASKS.md',...await walk('docs')];
  const files=await records(['package.json','.gitignore','wrangler.jsonc',...await walk('public'),...await walk('scripts'),...await walk('test'),...specs]);
  const manifest=current.find(file=>file.path==='manifest.json');
  await save('source-set.json',{schemaVersion:1,phase:'B20-47-M2A',algorithm:'sha256-lines-v1',scope:'package/.gitignore/wrangler/public/scripts/test plus13 read-only specs/docs; excludes mutable delivery prose/evidence/artifacts',sourceSetSha256:aggregate(files),artifactSha256:aggregate(current),manifestSha256:manifest.sha256,previousArtifactSha256:previous.artifactSha256,releaseChanges:changes,nonHtmlSiteFilesUnchanged:12,protectedFilesUnchanged:protectedFiles.length,files,artifacts:current,push:'NOT_RUN_NOT_AUTHORIZED_THIS_PHASE',deploy:'NOT_RUN_NOT_AUTHORIZED_THIS_PHASE'});
  process.stdout.write(JSON.stringify({status:'PASS_M2A_PREPARATION',sourceSetSha256:aggregate(files),artifactSha256:aggregate(current),manifestSha256:manifest.sha256,sourceFiles:files.length,artifactFiles:current.length,protectedFiles:protectedFiles.length,releaseChanges:changes})+'\n');
}
