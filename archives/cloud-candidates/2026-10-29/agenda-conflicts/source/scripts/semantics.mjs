// check/build 共用的精確 snapshot 語意 gate；拒絕非 noindex 或危險靜態來源。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
export function validateAssets(assets) {
const js = [...assets].filter(([path]) => path.endsWith('.mjs'));
for (const [path, bytes] of js) {
  const text = bytes.toString();
  assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB|caches|serviceWorker|eval|Function)\b|innerHTML|outerHTML|insertAdjacentHTML|document\.cookie|console\./u, path);
  assert.doesNotMatch(text, /\bDate\s*[.(]|\b(?:Intl|Temporal)\s*\./u, path);
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: text, encoding: 'utf8' });
  assert.equal(result.status, 0, `${path}: ${result.stderr}`);
}
for (const [path, locale, home] of [['index.html','zh-Hant','https://glossquote.com/index.html'],['en/index.html','en','https://glossquote.com/en/index.html']]) {
  const html = assets.get(path).toString();
  assert.ok(html.includes(`<html lang="${locale}">`));
  assert.match(html, /name="robots" content="noindex,nofollow"/u);
  assert.match(html, /<fieldset id="workspace" disabled>/u);
  assert.match(html, /<noscript>/u); assert.ok(html.includes(home));
  assert.doesNotMatch(html, /rel="canonical"|hreflang=|application\/ld\+json|<style|\sstyle=|\son\w+=/u);
  assert.doesNotMatch(html, /<(?:input|textarea|button)[^>]*\sname=/u);
  assert.equal((html.match(/<script/g) || []).length, 1);
}
assert.equal(assets.get('robots.txt').toString(), 'User-agent: *\nDisallow: /\n');
const headers = assets.get('_headers').toString();
for (const rule of ["default-src 'none'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", 'noindex, nofollow', 'nosniff', 'no-referrer']) assert.ok(headers.includes(rule));
assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval|https:/u);
assert.doesNotMatch(assets.get('styles.css').toString(), /@import|url\s*\(/u);
  assert.match(assets.get('404.html').toString(), /name="robots" content="noindex,nofollow"/u);
  return assets;
}
// 不依賴 npm 是否先跑 check；直接 build 也必須符合私人 ESM／零依賴政策。
export function validatePackage(bytes) {
  const pkg = JSON.parse(bytes.toString('utf8'));
  assert.ok(pkg && typeof pkg === 'object' && !Array.isArray(pkg), 'Package must be an object.');
  assert.equal(pkg.private, true, 'Package must stay private.');
  assert.equal(pkg.type, 'module', 'Package must stay ESM.');
  for (const key of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    if (!Object.hasOwn(pkg, key)) continue;
    const value = pkg[key];
    assert.ok(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0, 'Package must have no dependencies.');
  }
  return pkg;
}
export function validateProject(snapshot) {
  validatePackage(snapshot.packageBytes);
  validateAssets(snapshot.assets);
  return snapshot;
}
