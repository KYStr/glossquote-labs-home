import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, sourceMap, listFiles } from './files.mjs';
import { copy } from '../public/js/copy.js';
import { ERROR_CODES } from '../public/js/core/errors.js';
import { checkDeploymentConfig } from './release-config.mjs';
assert.equal(Number(process.versions.node.split('.')[0]), 24, 'Node 24 required');
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.private, true);
assert.equal(pkg.type, 'module');
assert.equal(Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length, 0);
await checkDeploymentConfig();
const sources = await sourceMap();
const pageIds = [];
for (const required of ['index.html', 'en/index.html', 'css/app.css', 'js/app.js']) assert(sources.has(required));
for (const [name, buffer] of sources) {
  const content = buffer.toString('utf8');
  assert(!/\b(?:innerHTML|outerHTML|DOMParser|document\.write|eval\s*\(|localStorage|sessionStorage|indexedDB|serviceWorker|fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|console\.)/.test(content), name + ' forbidden API');
  assert(!/<(?:script|link|img|iframe)[^>]*(?:src|href)\s*=\s*["'](?:https?:|\/\/)/i.test(content), name + ' remote resource');
  assert(!/\b(?:import\s*\(|from\s*)["'](?:https?:|\/\/)|url\s*\(\s*["']?(?:https?:|\/\/)|@import/i.test(content), name + ' remote import');
  if (name.endsWith('.html')) {
    assert.match(content, /<meta name="robots" content="noindex,nofollow,noarchive">/);
    assert.match(content, /<title>[^<]+<\/title>/);
    assert.match(content, /<meta name="description" content="[^"]+">/);
    assert.equal((content.match(/<h1[\s>]/g) ?? []).length, 1);
    assert(!/canonical/.test(content));
    assert(!/\s(?:on[a-z]+|action)\s*=/i.test(content), name + ' inline event/form action');
    const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, name + ' duplicate IDs');
    pageIds.push(ids.sort());
    const app = sources.get('js/app.js').toString('utf8');
    for (const match of app.matchAll(/byId\('([^']+)'\)/g)) assert(ids.includes(match[1]), name + ' missing controller target: ' + match[1]);
    for (const id of ['source', 'workspace', 'download-html', 'download-json']) assert(ids.includes(id));
    for (const match of content.matchAll(/\bfor="([^"]+)"/g)) assert(ids.includes(match[1]), name + ' broken label');
    assert.equal((content.match(/type="file"/g) ?? []).length, 1);
    assert(!/\bmultiple\b/.test(content));
    for (const match of content.matchAll(/(?:src|href)="(\/(?!\/)[^"]+)"/g)) assert(sources.has(match[1].slice(1)), name + ' missing local resource');
    if (name === 'index.html') {
      assert.match(content, /<html lang="zh-Hant">/);
      assert.match(content, /<title>書籤匯出整理｜本機重複連結整理工具<\/title>/);
      assert.match(content, /<h1>整理書籤匯出檔<\/h1>/);
      assert(content.includes('切換語言會離開此頁；未下載的書籤整理結果會遺失。'));
      assert(content.includes('href="https://glossquote.com/index.html"'));
    } else {
      assert.match(content, /<html lang="en">/);
      assert.match(content, /<title>Bookmark Export Organizer — Local Bookmark Cleanup<\/title>/);
      assert.match(content, /<h1>Organize a bookmark export<\/h1>/);
      assert(content.includes('Changing language leaves this page. Unexported bookmark changes will be lost.'));
      assert(content.includes('href="https://glossquote.com/en/index.html"'));
    }
  }
  if (name.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', path.join(root, 'public', name)], { shell: false, windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 0, name + ' syntax: ' + result.stderr);
  }
}
assert.deepEqual(pageIds[0], pageIds[1], 'Both pages expose the same controls');
assert.deepEqual(Object.keys(copy['zh-Hant']).sort(), Object.keys(copy.en).sort());
for (const text of Object.values(copy)) assert.deepEqual(Object.keys(text.errors).sort(), [...ERROR_CODES].sort());
for (const directory of ['scripts', 'test']) for (const name of await listFiles(path.join(root, directory))) {
  if (!name.endsWith('.mjs')) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(root, directory, name)], { shell: false, windowsHide: true, encoding: 'utf8' });
  assert.equal(result.status, 0, `${directory}/${name}: ${result.stderr}`);
}
process.stdout.write(`PASS static/syntax checks: ${sources.size} public files; no browser claims\n`);
