import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, readdir, lstat, copyFile, unlink, symlink, link, rm, rmdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ASSETS, DIRECTORIES, snapshotTree, validateTree, removeKnownTree } from '../scripts/files.mjs';
const root = new URL('../',import.meta.url); const temp = new URL('test/.tmp/',root);
// 所有破壞性測試都在本案獨有 .tmp fixture，不碰真來源／dist 或外部路徑。
async function fixture(t) {
  await mkdir(temp,{recursive:true}); const parent=await lstat(fileURLToPath(temp).replace(/\/$/u,'')); assert(parent.isDirectory()&&!parent.isSymbolicLink());
  const path=await mkdtemp(fileURLToPath(new URL('build-',temp))); const base=pathToFileURL(path+'/');
  t.after(async()=>{await rm(base,{recursive:true,force:true});});
  await mkdir(new URL('public/',base)); await mkdir(new URL('scripts/',base)); await mkdir(new URL('test/',base)); await mkdir(new URL('evidence/',base));
  for(const dir of DIRECTORIES)await mkdir(new URL(`public/${dir}/`,base));
  for(const [name,bytes]of await snapshotTree(new URL('public/',root)))await writeFile(new URL('public/'+name,base),bytes,{flag:'wx'});
  for(const name of await readdir(new URL('scripts/',root)))if(name.endsWith('.mjs'))await copyFile(new URL('scripts/'+name,root),new URL('scripts/'+name,base));
  await copyFile(new URL('package.json',root),new URL('package.json',base));
  return base;
}
function run(base,...args){return spawnSync(process.execPath,['scripts/build.mjs',...args],{cwd:fileURLToPath(base),encoding:'utf8',timeout:15000,maxBuffer:1024*1024});}
const passed=result=>assert.equal(result.status,0,result.stderr+result.stdout);
const refused=result=>assert.notEqual(result.status,0,result.stdout);
async function emptyOutside(base) {
  const outside=new URL('outside/',base);await mkdir(outside);await writeFile(new URL('sentinel.txt',outside),'DO NOT CHANGE');return outside;
}
async function unchanged(outside){assert.equal(await readFile(new URL('sentinel.txt',outside),'utf8'),'DO NOT CHANGE');}
test('fresh/repeated/changed-source builds produce exact allowlisted bytes and leave no stages',async t=>{
  const base=await fixture(t);passed(run(base));
  for(const [name,bytes]of await snapshotTree(new URL('public/',base)))assert.deepEqual(await readFile(new URL('dist/'+name,base)),bytes);
  passed(run(base));const core=new URL('public/js/core.mjs',base);await writeFile(core,(await readFile(core,'utf8'))+'\n// fixture-only revision\n');passed(run(base));
  assert.deepEqual(await readFile(new URL('dist/js/core.mjs',base)),await readFile(core));
  assert.equal((await readdir(base)).filter(name=>name.startsWith('.build-')).length,0);
});
test('build refuses all production/release/unknown flags without creating output',async t=>{
  const base=await fixture(t);for(const flag of ['--release','--production','--out=/tmp/elsewhere'])refused(run(base,flag));
  await assert.rejects(lstat(new URL('dist',base)),{code:'ENOENT'});
});
for(const scope of ['public','dist']) {
  test(`${scope}: unknown file and unknown empty directory survive build refusal`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));
    await writeFile(new URL(`${scope}/unknown.txt`,base),'UNKNOWN MUST SURVIVE');refused(run(base));assert.equal(await readFile(new URL(`${scope}/unknown.txt`,base),'utf8'),'UNKNOWN MUST SURVIVE');
    await unlink(new URL(`${scope}/unknown.txt`,base));await mkdir(new URL(`${scope}/unknown-dir`,base));refused(run(base));assert((await lstat(new URL(`${scope}/unknown-dir`,base))).isDirectory());
  });
  test(`${scope}: missing allowlisted file is refused rather than silently repaired`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));await unlink(new URL(`${scope}/robots.txt`,base));refused(run(base));await assert.rejects(lstat(new URL(`${scope}/robots.txt`,base)),{code:'ENOENT'});
  });
  test(`${scope}: file symlink cannot read, overwrite or remove external data`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));const outside=await emptyOutside(base);const path=new URL(`${scope}/robots.txt`,base);
    await unlink(path);await symlink(fileURLToPath(new URL('sentinel.txt',outside)),path);refused(run(base));assert((await lstat(path)).isSymbolicLink());await unchanged(outside);
  });
  test(`${scope}: directory symlink cannot escape or mutate external tree`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));const outside=await emptyOutside(base);const path=new URL(`${scope}/styles`,base);
    await unlink(new URL(`${scope}/styles/app.css`,base));await rmdir(path);await symlink(fileURLToPath(outside),path,'dir');refused(run(base));assert((await lstat(path)).isSymbolicLink());await unchanged(outside);
  });
  test(`${scope}: hard-linked asset is rejected and external inode remains unchanged`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));const outside=await emptyOutside(base);const path=new URL(`${scope}/robots.txt`,base);
    await unlink(path);await link(new URL('sentinel.txt',outside),path);refused(run(base));assert.equal((await lstat(path)).nlink,2);await unchanged(outside);
  });
  test(`${scope}: root symlink is rejected and external sentinel survives`,async t=>{
    const base=await fixture(t);if(scope==='dist')passed(run(base));const outside=await emptyOutside(base);const path=new URL(scope,base);
    await removeKnownTree(new URL(`${scope}/`,base));await symlink(fileURLToPath(outside),path,'dir');refused(run(base));assert((await lstat(path)).isSymbolicLink());await unchanged(outside);
  });
}
test('destination regular file is not overwritten or removed',async t=>{
  const base=await fixture(t);await writeFile(new URL('dist',base),'UNKNOWN TARGET');refused(run(base));assert.equal(await readFile(new URL('dist',base),'utf8'),'UNKNOWN TARGET');
});
test('cleanup refuses unknown trees and never recursively removes unknown content',async t=>{
  const base=await fixture(t);passed(run(base));await writeFile(new URL('dist/unknown.txt',base),'KEEP');await assert.rejects(removeKnownTree(new URL('dist/',base)),/UNKNOWN_FILE/u);assert.equal(await readFile(new URL('dist/unknown.txt',base),'utf8'),'KEEP');assert.equal(await validateTree(new URL('absent/',base),{allowMissing:true}),false);
});
