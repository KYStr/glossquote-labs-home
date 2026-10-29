import assert from 'node:assert/strict';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, PUBLIC_FILES, readSources } from './files.mjs';
import { validateDeploymentConfig } from './release.mjs';

const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
assert.equal(pkg.private, true); assert.equal(pkg.type, 'module'); assert.equal(pkg.engines.node, '>=24');
assert.equal(Object.keys(pkg.dependencies ?? {}).length, 0); assert.equal(Object.keys(pkg.devDependencies ?? {}).length, 0);
assert.deepEqual(pkg.scripts, { test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/serve.mjs', 'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' });
assert.ok(Number(process.versions.node.split('.')[0]) >= 24);
await validateDeploymentConfig();
const sources = await readSources();
for (const [name, buffer] of sources) {
  const text = buffer.toString('utf8');
  if (/\.(?:js|mjs)$/u.test(name)) {
    assert.doesNotMatch(text, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|Worker|SharedWorker|eval)\s*\(|\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b|\bconsole\s*\.|\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|sendBeacon|document\.cookie/u, name);
    for (const match of text.matchAll(/\b(?:from|import)\s*['"]([^'"]+)['"]/gu)) {
      assert.ok(match[1].startsWith('./') || match[1].startsWith('../'), name);
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1]));
      assert.ok(PUBLIC_FILES.includes(target), `${name}: unresolved import`);
    }
  }
  if (name.endsWith('.html')) {
    assert.equal((text.match(/<h1\b/gu) ?? []).length, 1, name);
    assert.match(text, /<meta name="robots" content="noindex,nofollow">/u);
    assert.doesNotMatch(text, /canonical|sitemap|<iframe\b|<object\b|<embed\b|\son\w+=|style=|<base\b/iu);
    assert.match(text, /<script type="module" src="(?:\.\/|\.\.\/)js\/app\.js"><\/script>/u);
    assert.match(text, /connect-src 'none'; font-src 'none'/u);
    assert.match(text, /id="files" type="file"[^>]*multiple/u);
    assert.match(text, /id="show-names" type="checkbox"/u);
    assert.doesNotMatch(text, /id="show-names"[^>]*checked/u);
    assert.match(text, /id="download-png"[^>]*disabled/u);
    const ids = [...text.matchAll(/\bid="([^"]+)"/gu)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, name);
    for (const m of text.matchAll(/(?:for|aria-labelledby|aria-describedby)="([^"]+)"/gu)) for (const id of m[1].split(' ')) assert.ok(ids.includes(id), `${name}: ${id}`);
    for (const m of text.matchAll(/\b(src|href)="([^"]+)"/gu)) {
      const target = m[2];
      if (target.startsWith('#')) { assert.ok(ids.includes(target.slice(1))); continue; }
      if (target.startsWith('https:')) {
        assert.equal(m[1], 'href');
        assert.ok(['https://glossquote.com/index.html', 'https://glossquote.com/en/index.html'].includes(target));
      } else {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(name), target));
        assert.ok(PUBLIC_FILES.includes(resolved), `${name}: ${target}`);
      }
    }
  }
  if (name.endsWith('.css')) {
    assert.doesNotMatch(text, /@import|url\s*\(/iu);
    for (const marker of ['min-width: 48rem', 'min-width: 75rem', 'prefers-reduced-motion', ':focus-visible', '44px', 'overflow-wrap: anywhere']) assert.ok(text.includes(marker));
  }
}
const zh = sources.get('index.html').toString();
const en = sources.get('en/index.html').toString();
assert.match(zh, /<html lang="zh-TW">/u); assert.match(en, /<html lang="en">/u);
assert.match(zh, /href="\.\/en\/index.html"/u); assert.match(en, /href="\.\.\/index.html"/u);
assert.match(zh, /<title>照片聯絡表｜把多張圖片排成編號清單<\/title>/u);
assert.match(en, /<title>Photo Contact Sheet Maker \| Number and Review Images<\/title>/u);
assert.equal(sources.get('robots.txt').toString(), 'User-agent: *\nDisallow: /\n');
assert.match(sources.get('_headers').toString(), /X-Robots-Tag: noindex, nofollow/u);
async function syntaxWalk(directory) {
  for (const name of await readdir(directory)) {
    const absolute = path.join(directory, name); const stat = await lstat(absolute);
    assert.ok(!stat.isSymbolicLink());
    if (stat.isDirectory()) await syntaxWalk(absolute);
    else if (/\.(?:js|mjs)$/u.test(name)) {
      const result = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8', shell: false, windowsHide: true });
      assert.equal(result.status, 0, `Syntax failed: ${name}`);
    }
  }
}
for (const dir of ['public', 'scripts', 'test']) await syntaxWalk(path.join(ROOT, dir));
console.log(`PASS source check: ${sources.size} assets; bilingual noindex routes, import closure, syntax and static safety. Browser behavior NOT_RUN.`);
