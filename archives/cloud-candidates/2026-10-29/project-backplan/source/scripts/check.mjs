// 靜態契約掃描不是完整安全認證；搭配單元測試及實頁驗證。
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { snapshotTree, validateTree } from './files.mjs';
import { spawnSync } from 'node:child_process';
const root = new URL('../', import.meta.url);
if (process.argv.length > 2) throw new Error('Preview-only check; unsupported arguments.');
const snapshot = await snapshotTree(new URL('public/', root));
await validateTree(new URL('dist/', root), { allowMissing: true });
const files = [...snapshot.keys()].map(relative => new URL(`public/${relative}`, root));
for (const file of files) {
  const relative = file.pathname.split('/public/')[1];
  const text = snapshot.get(relative).toString('utf8');
  if (file.pathname.endsWith('.mjs')) {
    const run = spawnSync(process.execPath, ['--check', file.pathname]);
    assert.equal(run.status, 0, run.stderr.toString());
    assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|eval|Function)\s*[.(]/);
    assert.doesNotMatch(text, /\.innerHTML\s*=|document\.cookie|navigator\.serviceWorker|console\./);
  }
  if (file.pathname.endsWith('.html')) {
    assert.match(text, /name="robots" content="noindex, nofollow"/);
    assert.match(text, /<fieldset id="editor" disabled>/);
    assert.match(text, /id="calculate" type="submit" disabled/);
    assert.doesNotMatch(text, /<input[^>]+name=|<textarea[^>]+name=|canonical|<script[^>]*>\s*[^<\s]/);
    assert.doesNotMatch(text, /(?:src|action)="https?:|\son[a-z]+=/);
    const en = file.pathname.endsWith('/en/index.html');
    assert.match(text, new RegExp(`lang="${en ? 'en' : 'zh-Hant'}"`));
    assert.match(text, new RegExp(`href="https://glossquote\\.com/${en ? 'en/' : ''}index\\.html"`));
  }
}
assert.equal(await readFile(new URL('public/robots.txt', root), 'utf8'), 'User-agent: *\nDisallow: /\n');
const packageData = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
assert.equal(packageData.dependencies, undefined);
assert.equal(packageData.devDependencies, undefined);
console.log(`Static source check passed: ${files.length} public files. Preview only.`);
