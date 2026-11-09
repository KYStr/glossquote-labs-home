import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, readFile, mkdir, unlink, link, rename, symlink, lstat } from 'node:fs/promises';
import { build } from '../scripts/build.mjs';
import { inventory, ASSETS, exists } from '../scripts/lib/files.mjs';
import { validateText } from '../scripts/lib/validate.mjs';
import { fixture, cleanupFixture, ownedPath } from '../scripts/test-support/fixture.mjs';

async function withFixture(body){const root=await fixture();try{await body(root);}finally{await cleanupFixture(root);}}
test('build is reproducible, byte-identical, closed, and can restore a missing known output',()=>withFixture(async root=>{
  const first=await build(root);assert.deepEqual(first,await build(root));assert.equal(first.length,10);
  await unlink(ownedPath(root,'dist/js/app.js'));assert.deepEqual(await build(root),first);
  assert.equal(await exists(ownedPath(root,'dist-production')),false);
}));
test('unknown source asset, empty foreign directory and missing source block building',async()=>{
  for(const kind of ['file','directory','missing'])await withFixture(async root=>{
    if(kind==='file')await writeFile(ownedPath(root,'public/secret.txt'),'FAKE-ONLY');
    if(kind==='directory')await mkdir(ownedPath(root,'public/foreign'));
    if(kind==='missing')await unlink(ownedPath(root,'public/index.html'));
    await assert.rejects(()=>build(root));assert.equal(await exists(ownedPath(root,'dist')),false);
  });
});
test('stale output blocks before writes and preserves existing bytes',()=>withFixture(async root=>{
  await build(root);const before=await readFile(ownedPath(root,'dist/index.html'));
  await writeFile(ownedPath(root,'dist/stale.txt'),'FAKE');await writeFile(ownedPath(root,'public/index.html'),before.toString().replace('補貨數量試算','變更試算'));
  await assert.rejects(()=>build(root),/Unknown/);assert.deepEqual(await readFile(ownedPath(root,'dist/index.html')),before);
}));
test('hardlinked assets fail closed in source and output',async()=>{
  for(const directory of ['public','dist'])await withFixture(async root=>{
    if(directory==='dist')await build(root);
    await unlink(ownedPath(root,`${directory}/en/index.html`));await link(ownedPath(root,`${directory}/index.html`),ownedPath(root,`${directory}/en/index.html`));
    await assert.rejects(()=>build(root),/linked/);
  });
});
test('directory junction/symlink rejected in source and output',async()=>{
  for(const directory of ['public','dist'])await withFixture(async root=>{
    if(directory==='dist')await build(root);
    const original=ownedPath(root,`${directory}/en`),held=ownedPath(root,'held-en');
    await rename(original,held);await symlink(held,original,process.platform==='win32'?'junction':'dir');assert.equal((await lstat(original)).isSymbolicLink(),true);
    await assert.rejects(()=>build(root),/junction/);
  });
});
test('manifest traversal, absolute paths, backslashes and duplicated entries are rejected',()=>withFixture(async root=>{
  for(const files of [['../index.html'],['/index.html'],['en\\index.html'],['index.html','index.html'],['.env'],['a/../index.html']])await assert.rejects(()=>inventory(ownedPath(root,'public'),files),/manifest/);
  assert.equal(ASSETS.length,10);
}));
test('checker rejects inline script payload, external asset tricks, missing labels and browser side effects',()=>{
  const p='<meta name="robots" content="noindex,nofollow">';
  for(const text of ['<script type="module" src="/js/app.js">alert(1)</script>',"<img src='https://example.invalid/x'>",'<script src="https://glossquote.com/index.html"></script>','<meta http-equiv="refresh" content="0;url=https://example.invalid">','<input id="x" disabled autofocus>','<a href=/index.html>go</a>','<label for="missing">Label</label>','<p id="x"></p><p id="x"></p>'])assert.throws(()=>validateText('index.html',p+text));
  for(const text of ['import("./core/schema.mjs")','window.print()','new Worker("x")','caches.open("x")','new URLSearchParams()'])assert.throws(()=>validateText('js/app.js',text));
});
