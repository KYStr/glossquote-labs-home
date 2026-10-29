// 每個破壞性 fixture 僅在本測試新建暫存目錄；不碰其他工作或服務。
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, readdirSync, rmSync, unlinkSync, symlinkSync, linkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildProject } from '../scripts/build.mjs';
import { validateTree, snapshotTree } from '../scripts/files.mjs';
const expected=['404.html','_headers','en/index.html','index.html','js/app.mjs','js/core.mjs','js/i18n.mjs','robots.txt','styles.css'];
function fixture(t){
  const root=mkdtempSync(join(tmpdir(),'agenda-test-'));mkdirSync(join(root,'public'));mkdirSync(join(root,'public/en'));mkdirSync(join(root,'public/js'));
  for(const path of expected)copyFileSync(fileURLToPath(new URL(`../public/${path}`,import.meta.url)),join(root,'public',path));
  copyFileSync(fileURLToPath(new URL('../package.json',import.meta.url)),join(root,'package.json'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;
}
function tree(root,prefix=''){return readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(join(root,e.name),`${prefix}${e.name}/`):[prefix+e.name]).sort();}
function fingerprints(root){return Object.fromEntries(tree(root).map(p=>[p,readFileSync(join(root,p)).toString('base64')]));}
test('build outputs exactly nine assets, deterministic bytes, no source/private files',t=>{
  const root=fixture(t);writeFileSync(join(root,'private-notes.txt'),'never deploy');
  assert.equal(buildProject(root).files,9);assert.deepEqual(tree(join(root,'dist')),expected);
  for(const path of expected)assert.deepEqual(readFileSync(join(root,'dist',path)),readFileSync(join(root,'public',path)));
  const first=fingerprints(join(root,'dist'));buildProject(root);assert.deepEqual(fingerprints(join(root,'dist')),first);
  assert.deepEqual(readdirSync(root).sort(),['dist','package.json','private-notes.txt','public']);
});
for(const variant of ['unknown-file','unknown-directory','missing-file','symlink-file','hardlink-file','symlink-directory'])test(`source ${variant} refused; old output unchanged`,t=>{
  const root=fixture(t);buildProject(root);const before=fingerprints(join(root,'dist'));
  const source=join(root,'public');
  if(variant==='unknown-file')writeFileSync(join(source,'secret.txt'),'KEEP');
  if(variant==='unknown-directory')mkdirSync(join(source,'other'));
  if(variant==='missing-file')unlinkSync(join(source,'index.html'));
  if(variant==='symlink-file'){unlinkSync(join(source,'index.html'));symlinkSync(join(root,'dist/index.html'),join(source,'index.html'));}
  if(variant==='hardlink-file'){unlinkSync(join(source,'index.html'));linkSync(join(root,'dist/index.html'),join(source,'index.html'));}
  if(variant==='symlink-directory'){rmSync(join(source,'en'),{recursive:true});symlinkSync(join(root,'dist/en'),join(source,'en'));}
  assert.throws(()=>buildProject(root));assert.deepEqual(fingerprints(join(root,'dist')),before);
});
for(const variant of ['unknown-file','unknown-directory','missing-file','symlink-file','hardlink-file','symlink-directory'])test(`existing output ${variant} refuses without deleting sentinel`,t=>{
  const root=fixture(t);buildProject(root);const output=join(root,'dist');const sentinel=join(root,'sentinel.txt');writeFileSync(sentinel,'KEEP-EXTERNAL');
  if(variant==='unknown-file')writeFileSync(join(output,'sentinel.txt'),'KEEP-IN-OUTPUT');
  if(variant==='unknown-directory'){mkdirSync(join(output,'unknown'));writeFileSync(join(output,'unknown/keep.txt'),'KEEP-IN-OUTPUT');}
  if(variant==='missing-file')unlinkSync(join(output,'index.html'));
  if(variant==='symlink-file'){unlinkSync(join(output,'index.html'));symlinkSync(sentinel,join(output,'index.html'));}
  if(variant==='hardlink-file'){unlinkSync(join(output,'index.html'));linkSync(sentinel,join(output,'index.html'));}
  if(variant==='symlink-directory'){rmSync(join(output,'en'),{recursive:true});symlinkSync(join(root,'public/en'),join(output,'en'));}
  const files=tree(output);assert.throws(()=>buildProject(root));assert.deepEqual(tree(output),files);assert.equal(readFileSync(sentinel,'utf8'),'KEEP-EXTERNAL');
  if(variant==='unknown-file')assert.equal(readFileSync(join(output,'sentinel.txt'),'utf8'),'KEEP-IN-OUTPUT');
  if(variant==='unknown-directory')assert.equal(readFileSync(join(output,'unknown/keep.txt'),'utf8'),'KEEP-IN-OUTPUT');
});
test('source and output symlink roots are refused without touching external directory',t=>{
  const root=fixture(t);buildProject(root);rmSync(join(root,'public'),{recursive:true});symlinkSync(join(root,'dist'),join(root,'public'));
  assert.throws(()=>buildProject(root));assert.equal(tree(join(root,'dist')).length,9);
  unlinkSync(join(root,'public'));mkdirSync(join(root,'public'));mkdirSync(join(root,'public/en'));mkdirSync(join(root,'public/js'));
  for(const path of expected)copyFileSync(join(root,'dist',path),join(root,'public',path));
  rmSync(join(root,'dist'),{recursive:true});symlinkSync(join(root,'public'),join(root,'dist'));
  assert.throws(()=>buildProject(root));assert.equal(tree(join(root,'public')).length,9);
});
test('linked ancestor is refused, not just the leaf root',t=>{
  const root=fixture(t), alias=join(root,'alias');symlinkSync(join(root,'public'),alias);
  assert.throws(()=>snapshotTree(alias));assert.throws(()=>validateTree(join(alias,'en')));
  assert.ok(existsSync(join(root,'public/index.html')));
});
test('snapshot refuses unknown empty directory and oversized ordinary asset',t=>{
  const root=fixture(t);mkdirSync(join(root,'public/private'));assert.throws(()=>snapshotTree(join(root,'public')));
  rmSync(join(root,'public/private'),{recursive:true});writeFileSync(join(root,'public/index.html'),'x'.repeat(2_000_001));assert.throws(()=>snapshotTree(join(root,'public')));
});
