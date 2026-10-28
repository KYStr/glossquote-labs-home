import { readFile, readdir, lstat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT } from './assets.mjs';
import { release } from './release.mjs';

if(process.argv.length!==2)throw new Error('CAPTURE_M1B_USAGE');
await release('check');
const evidence=join(ROOT,'evidence','m1b');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const sort=files=>files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
const aggregate=files=>sha(sort([...files]).map(file=>`${file.path}\t${file.bytes}\t${file.sha256}\n`).join(''));
async function walk(relative) {
  const info=await lstat(join(ROOT,relative));if(info.isSymbolicLink())throw new Error('CAPTURE_UNSAFE_LINK');
  if(info.isFile())return [relative];if(!info.isDirectory())throw new Error('CAPTURE_UNSAFE_TYPE');
  const files=[];for(const name of await readdir(join(ROOT,relative)))files.push(...await walk(`${relative}/${name}`));return files;
}
async function records(paths) {
  const files=[];
  for(const path of paths) {
    if(path.startsWith('/')||path.includes('\\')||path.split('/').some(part=>part==='..'||!part))throw new Error('CAPTURE_UNSAFE_PATH');
    const bytes=await readFile(join(ROOT,path));files.push({path,bytes:bytes.length,sha256:sha(bytes)});
  }
  return sort(files);
}
const before=JSON.parse(await readFile(join(evidence,'protected-before.json'),'utf8'));
const after=await records([...(await walk('public')),...(await walk('dist')),...(await walk('evidence/m1'))]);
if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('M1_PROTECTED_FILES_CHANGED');
const readOnlySpecs=['START-HERE.md','AGENTS.md','README.md','PRODUCT.md','TECHNICAL.md','UX-SEO.md','ACCEPTANCE.md','TASKS.md',...await walk('docs')];
const files=await records(['package.json','.gitignore',...await walk('public'),...await walk('scripts'),...await walk('test'),...readOnlySpecs]);
const artifactRecords=await records(await walk('release-artifacts'));
const artifactFiles=artifactRecords.map(file=>({...file,path:file.path.slice('release-artifacts/'.length)}));
const siteFiles=artifactFiles.filter(file=>file.path.startsWith('site/')).map(file=>({...file,path:file.path.slice('site/'.length)}));
const runtimeFiles=after.filter(file=>file.path.startsWith('public/'));
const summary={
  schemaVersion:1,mode:'release-candidate',origin:'https://file-bundles.glossquote.com',toolSlug:'file-bundler',
  algorithm:'sha256-lines-v1',scope:'package.json, .gitignore, public, scripts, test and 13 read-only specifications/docs; excludes mutable HANDOFF/TASK-ENTRY/M1B-RELEASE and evidence/release-artifacts',
  sourceSha256:aggregate(files),runtimeSourceSha256:aggregate(runtimeFiles),siteSha256:aggregate(siteFiles),artifactSha256:aggregate(artifactFiles),
  manifestSha256:artifactFiles.find(file=>file.path==='manifest.json').sha256,
  protectedFilesUnchanged:true,protectedFiles:after.length,
  files,artifacts:sort(artifactFiles),
  status:'M1B_OFFLINE_PREP_AWAITING_PRIMARY_REVIEW',browser:'NOT_RUN_USER_FOCUS_INCIDENT',github:'NOT_PUBLISHED',hosting:'NOT_DEPLOYED'
};
await writeFile(join(evidence,'source-artifact-manifest.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({sourceSha256:summary.sourceSha256,runtimeSourceSha256:summary.runtimeSourceSha256,siteSha256:summary.siteSha256,artifactSha256:summary.artifactSha256,manifestSha256:summary.manifestSha256,sourceFiles:files.length,siteFiles:siteFiles.length,artifactFiles:artifactFiles.length,protectedFiles:after.length})+'\n');
