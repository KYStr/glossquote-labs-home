import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { ROOT } from './assets.mjs';

const evidence = join(ROOT,'evidence/m2a');
const workspace = resolve(ROOT,'../..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const aggregate = files => sha(files.map(file=>`${file.path}\0${file.bytes}\0${file.sha256}\n`).join(''));
async function file(base,path) {
  assert.ok(path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!part.includes('\\')&&!part.includes(':')));
  let full=base;for(const part of path.split('/')) {full=join(full,part);assert.equal((await lstat(full)).isSymbolicLink(),false);}
  const bytes=await readFile(full);return {path,bytes:bytes.length,sha256:sha(bytes)};
}
async function walk(base,path) {
  const stat=await lstat(join(base,path));assert.equal(stat.isSymbolicLink(),false);
  if(stat.isFile())return [await file(base,path)];
  assert.ok(stat.isDirectory());const result=[];for(const name of(await readdir(join(base,path))).sort())result.push(...await walk(base,path+'/'+name));return result;
}
async function manifest(base,paths) {
  const files=await Promise.all([...paths].sort().map(path=>file(base,path)));
  return {algorithm:'SHA-256',aggregateFormat:'UTF-8 sorted path + NUL + byte length + NUL + hex SHA-256 + LF',fileCount:files.length,totalBytes:files.reduce((sum,item)=>sum+item.bytes,0),aggregateSha256:aggregate(files),files};
}

const baseline=JSON.parse(await readFile(join(evidence,'baseline.json'),'utf8'));
const protectedNow=[];for(const path of baseline.protectedRoots)protectedNow.push(...await walk(workspace,path));protectedNow.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
assert.deepEqual(protectedNow,baseline.protectedFiles,'FROZEN_PREVIEW_OR_OLD_EVIDENCE_CHANGED');
assert.equal(aggregate(protectedNow),baseline.protectedAggregateSha256);
for(const record of baseline.previousRelease.files)assert.deepEqual(await file(join(evidence,'release-before'),record.path),record,'M1B_RELEASE_ARCHIVE_CHANGED');

const sourcePaths=[...baseline.sourceFiles.map(record=>record.path),'wrangler.jsonc','M2A-RELEASE.md','scripts/m2a-evidence.mjs'];
assert.equal(new Set(sourcePaths).size,sourcePaths.length);
const sources=await manifest(ROOT,sourcePaths);
const beforeSource=new Map(baseline.sourceFiles.map(record=>[record.path,record]));
const sourceChanges=sources.files.filter(record=>beforeSource.get(record.path)?.sha256!==record.sha256).map(record=>({path:record.path,before:beforeSource.get(record.path)??null,after:record}));
const allowed=new Set(['scripts/release-html.mjs','scripts/release.mjs','test/release.test.mjs','HANDOFF.md','TASK-ENTRY.md','wrangler.jsonc','M2A-RELEASE.md','scripts/m2a-evidence.mjs']);
assert.ok(sourceChanges.every(change=>allowed.has(change.path)),'UNEXPECTED_SOURCE_DIFF');

const beforeManifest=JSON.parse(await readFile(join(evidence,'release-before/manifest.json'),'utf8'));
const afterManifestBytes=await readFile(join(ROOT,'release-artifacts/manifest.json'));
const afterManifest=JSON.parse(afterManifestBytes);
assert.deepEqual(afterManifest.sourceFiles,beforeManifest.sourceFiles);
const artifactChanges=[];
for(const record of baseline.previousRelease.files.filter(item=>item.path!=='manifest.json')) {
  const before=await readFile(join(evidence,'release-before',record.path));const after=await readFile(join(ROOT,'release-artifacts',record.path));
  if(record.path==='site/index.html'||record.path==='site/en/index.html') {
    const oldBanner=record.path==='site/index.html'?'<p class="preview-label">本地預覽候選</p>':'<p class="preview-label">Local preview candidate</p>';
    const newBanner=record.path==='site/index.html'?'<p class="preview-label">檔案在此瀏覽器處理</p>':'<p class="preview-label">Files are processed in this browser</p>';
    assert.equal(before.toString('utf8').split(oldBanner).length,2);
    assert.ok(after.equals(Buffer.from(before.toString('utf8').replace(oldBanner,newBanner))),'NON_BANNER_HTML_CHANGE');
    artifactChanges.push({path:record.path,beforeBytes:before.length,beforeSha256:sha(before),afterBytes:after.length,afterSha256:sha(after),onlyExactBannerChanged:true});
  } else assert.ok(before.equals(after),'OTHER_RELEASE_ASSET_CHANGED');
}
const expectedManifest=structuredClone(beforeManifest);
for(const item of expectedManifest.files) {const actual=await file(join(ROOT,'release-artifacts/site'),item.path);Object.assign(item,actual);}
assert.ok(afterManifestBytes.equals(Buffer.from(JSON.stringify(expectedManifest,null,2)+'\n')),'UNEXPECTED_MANIFEST_CHANGE');
const site=await manifest(join(ROOT,'release-artifacts/site'),afterManifest.files.map(item=>item.path));
assert.deepEqual(site.files,afterManifest.files);
const artifact=await manifest(join(ROOT,'release-artifacts'),['manifest.json',...site.files.map(item=>'site/'+item.path)]);

const browser=[];
for(const reference of baseline.browserReferences) {
  const result=JSON.parse(await readFile(join(workspace,reference.path),'utf8'));
  assert.equal(result.failures.length,0);assert.equal(result.prohibited.length,0);
  const statuses={};for(const item of result.cases)statuses[item.status]=(statuses[item.status]??0)+1;
  browser.push({path:reference.path,sha256:reference.sha256,browserVersion:result.browserVersion,statuses,failures:0,prohibited:0});
}
const commands=JSON.parse(await readFile(join(evidence,'commands.json'),'utf8'));
assert.ok(commands.commands.every(command=>command.exitCode===0));
const environment=JSON.parse(await readFile(join(evidence,'environment-comparison.json'),'utf8'));
assert.equal(environment.status,'PASS');assert.equal(environment.unchanged,true);
for(const [name,data] of [['source-manifest.json',sources],['site-manifest.json',site],['artifact-manifest.json',artifact],['source-diff.json',{status:'PASS',changes:sourceChanges}],['artifact-diff.json',{status:'PASS',changedSiteFiles:artifactChanges,otherSiteFilesByteIdentical:site.fileCount-artifactChanges.length,manifestOnlyRehashesChangedHtml:true}],['preservation.json',{status:'PASS',protectedFiles:protectedNow.length,aggregateSha256:aggregate(protectedNow),unchanged:true,previousArtifactSha256:baseline.previousRelease.aggregateSha256,previousReleasePreservedAt:'evidence/m2a/release-before'}],['browser-reference.json',{status:'CORE_ACCEPTED_BY_PRIMARY_MANUAL_REMAINS',runs:browser,remainingNotRunCount:10,newBrowserRunByOwner:false}]])await writeFile(join(evidence,name),JSON.stringify(data,null,2)+'\n');
const config=await file(ROOT,'wrangler.jsonc');
const compatibilityDate=JSON.parse(await readFile(join(ROOT,'wrangler.jsonc'),'utf8')).compatibility_date;
assert.equal(compatibilityDate,'2026-10-24','PRIMARY_APPROVED_COMPATIBILITY_DATE_CHANGED');
const candidate={task:'B20-44-M2A',status:'RELEASE_SOURCE_PREPARED_AWAITING_PRIMARY_M2B_REVIEW',origin:'https://picklist.glossquote.com',compatibilityDate,source:{files:sources.fileCount,bytes:sources.totalBytes,sha256:sources.aggregateSha256},artifact:{files:artifact.fileCount,bytes:artifact.totalBytes,sha256:artifact.aggregateSha256},site:{files:site.fileCount,bytes:site.totalBytes,sha256:site.aggregateSha256},config,changedSourceFiles:sourceChanges.length,changedSiteFiles:2,otherSiteBytesUnchanged:true,protectedFilesUnchanged:protectedNow.length,commands,browser:{primaryAcceptedCore:true,runs:browser,notRun:10,ownerDidNotRerun:true},wranglerCliValidation:'NOT_RUN_NO_CLI_OR_DEPENDENCY_INSTALL',github:'NOT_PUBLISHED',deployment:'NOT_DEPLOYED',externalReview:'PENDING',sourceCommit:null};
await writeFile(join(evidence,'candidate.json'),JSON.stringify(candidate,null,2)+'\n');console.log(JSON.stringify(candidate,null,2));
