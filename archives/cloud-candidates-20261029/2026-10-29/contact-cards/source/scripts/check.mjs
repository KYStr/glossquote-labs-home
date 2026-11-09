// 語法、雙語、資產、安全 API 與生成頁面 gate；不是實瀏覽器／主機認證。
import assert from 'node:assert/strict';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { snapshotTree } from './files.mjs';
import { page } from './pages.mjs';
export async function check() {
  const root = new URL('../', import.meta.url); const files = await snapshotTree(new URL('public/', root));
  for (const [name, bytes] of files) {
    const text = bytes.toString('utf8');
    if (name.endsWith('.mjs')) {
      assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage|indexedDB|eval|Function)\s*[.(]/u);
      assert.doesNotMatch(text, /\.innerHTML|\.outerHTML|insertAdjacentHTML|document\.cookie|navigator\.serviceWorker|console\./u);
      for (const match of text.matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
        assert.match(match[1], /^\.\/[^/]+\.mjs$/u); assert(files.has(`js/${match[1].slice(2)}`));
      }
    }
    if (name.endsWith('.html')) {
      assert.match(text, /name="robots" content="noindex, nofollow"/u);
      assert.doesNotMatch(text, /(?:src|action)="https?:|\son[a-z]+=/u);
      assert.doesNotMatch(text, /rel="canonical"|<form\b/u);
    }
  }
  for (const [language, name] of [['zh-Hant','index.html'],['en','en/index.html']]) {
    assert.equal(files.get(name).toString(), page(language), 'Generated HTML is stale');
    assert.match(files.get(name).toString(), /<fieldset id="editor" disabled>/u);
  }
  // 檢查實際所有來源／腳本／測試模組，避免只驗證應用入口。
  for (const folder of ['public/js/','scripts/','test/']) for (const entry of await readdir(new URL(folder,root))) {
    if (!entry.endsWith('.mjs')) continue;
    const path = new URL(folder + entry,root); const info = await lstat(path);
    assert(info.isFile() && !info.isSymbolicLink() && info.nlink === 1);
    const result = spawnSync(process.execPath,['--check',fileURLToPath(path)],{shell:false});
    assert.equal(result.status,0,result.stderr.toString());
  }
  assert.equal(files.get('robots.txt').toString(),'User-agent: *\nDisallow: /\n');
  const pkg = JSON.parse(await readFile(new URL('package.json',root),'utf8'));
  assert.equal(pkg.dependencies,undefined); assert.equal(pkg.devDependencies,undefined); assert.equal(pkg.private,true);
  console.log(`CHECK PASS: ${files.size} allowlisted preview assets; bilingual source and JS syntax.`);
  return files;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) { if (process.argv.length !== 2) throw new Error('NO_CHECK_ARGUMENTS'); await check(); }
