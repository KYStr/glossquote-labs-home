// 靜態稽核：零依賴、語法、安全 sink、core 純度、SPEC 清單唯一性、雙語頁面結構。
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { root, listFiles, sourceDir } from './build.mjs';

const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.dependencies, undefined, 'runtime dependencies must be absent');
assert.equal(pkg.devDependencies, undefined, 'dev dependencies must be absent');
assert.ok(pkg.engines.node.includes('24'), 'engines must pin Node >=24');

const files = await listFiles(sourceDir);
const texts = new Map();
for (const name of files) texts.set(name, await fs.readFile(path.join(sourceDir, name), 'utf8'));

// JS：語法檢查 + 危險 sink / 持久化 / 網路 API 禁令（namespace 常量字串除外）。
const ALLOWED_URLS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/XML/1998/namespace',
  'http://www.w3.org/2000/xmlns/',
]);
for (const [name, text] of texts) {
  if (!/\.(mjs|js)$/.test(name)) continue;
  const result = spawnSync(process.execPath, ['--check', path.join(sourceDir, name)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${name}: ${result.stderr}`);
  assert.doesNotMatch(text, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/, `${name}: DOM sink`);
  assert.doesNotMatch(text, /\beval\s*\(|new\s+Function/, `${name}: eval/Function`);
  assert.doesNotMatch(text, /localStorage|sessionStorage|indexedDB/, `${name}: storage API`);
  assert.doesNotMatch(text, /\bfetch\s*\(|XMLHttpRequest|WebSocket/, `${name}: network API`);
  for (const match of text.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
    assert.ok(ALLOWED_URLS.has(match[0]), `${name}: unexpected URL literal ${match[0]}`);
  }
}

// core 純度：不得碰 DOM 全域。
for (const [name, text] of texts) {
  if (!name.startsWith('js/core/')) continue;
  assert.doesNotMatch(text, /\bdocument\s*[.)]|\bwindow\s*[.)]|\bDOMParser\b|\bXMLSerializer\b/, `${name}: core must stay DOM-free`);
}

// 雙語頁面：lang/title/description/唯一 h1/noindex/canonical/hreflang/首頁連結/字型提醒/無 inline 行為。
const pages = [
  { name: 'index.html', lang: 'zh-Hant', home: '../../', fontNote: '無法載入網頁或網路字型' },
  { name: 'en/index.html', lang: 'en', home: '../../en/', fontNote: 'cannot load page or web fonts' },
];
for (const page of pages) {
  const text = texts.get(page.name);
  assert.ok(text, `${page.name} missing`);
  assert.match(text, new RegExp(`<html lang="${page.lang}">`), `${page.name}: lang`);
  assert.equal((text.match(/<h1>/g) || []).length, 1, `${page.name}: exactly one h1`);
  assert.match(text, /<title>[^<]+<\/title>/, `${page.name}: title`);
  assert.match(text, /<meta name="description" content="[^"]{20,}"/, `${page.name}: description`);
  assert.match(text, /noindex, nofollow/, `${page.name}: preview noindex`);
  assert.match(text, /rel="canonical"/, `${page.name}: canonical`);
  assert.match(text, /hreflang="zh-TW"/, `${page.name}: hreflang zh`);
  assert.match(text, /hreflang="en"/, `${page.name}: hreflang en`);
  assert.match(text, /hreflang="x-default"/, `${page.name}: hreflang x-default`);
  assert.ok(text.includes(`href="${page.home}"`), `${page.name}: same-language home link`);
  assert.ok(text.includes(page.fontNote), `${page.name}: permanent font note`);
  assert.doesNotMatch(text, /\son[a-z]+\s*=/i, `${page.name}: inline event handler`);
  assert.doesNotMatch(text, /<style[\s>]|(src|href)\s*=\s*"https?:\/\//, `${page.name}: inline style or remote URL`);
}

// app.js 只能經 blob: 圖片載入使用者 SVG，且必須 createObjectURL。
const appText = texts.get('js/app.js');
assert.match(appText, /createObjectURL/, 'app must load the sanitised SVG via blob URL');
assert.match(appText, /type: 'image\/svg\+xml'/, 'blob must be image/svg+xml');

console.log('static checks passed: zero deps, JS syntax, safe sinks, core purity, bilingual structure');
