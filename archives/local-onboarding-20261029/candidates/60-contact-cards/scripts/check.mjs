import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, PUBLIC_FILES, readPublic } from './files.mjs';
import { validateReleaseConfig } from './release.mjs';

export async function checkProject(root = ROOT) {
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true); assert.equal(manifest.type, 'module'); assert.equal(manifest.engines.node, '>=24');
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0); assert.equal(Object.keys(manifest.devDependencies ?? {}).length, 0);
  assert.deepEqual(manifest.scripts, { test: 'node --test test/*.test.mjs', check: 'node scripts/check.mjs', build: 'node scripts/build.mjs', dev: 'node scripts/serve.mjs', 'build:release': 'node scripts/release.mjs build', 'check:release': 'node scripts/release.mjs check' });
  const files = await readPublic(resolve(root, 'public'));
  await validateReleaseConfig(root);
  let checks = 6;
  const expected = {
    'index.html': { lang: 'zh-Hant', title: '名單轉通訊錄｜Gloss Tools', h1: '把 CSV 聯絡人整理成一個 VCF', description: '把 CSV 名單映射成 vCard 3.0 通訊錄檔。先檢查姓名、電話、email 與重複資料，再手動下載 VCF。', home: 'https://glossquote.com/index.html', alternate: 'en/index.html' },
    'en/index.html': { lang: 'en', title: 'Contact List to vCard | Gloss Tools', h1: 'Turn a CSV contact list into one VCF', description: 'Map a CSV contact list to a vCard 3.0 file. Review names, phone numbers, email, and exact duplicate groups before downloading a VCF.', home: 'https://glossquote.com/en/index.html', alternate: '../index.html' }
  };
  const idsByPage = [];
  for (const [name, data] of Object.entries(expected)) {
    const html = files.get(name).toString('utf8');
    assert.ok(html.includes(`<html lang="${data.lang}">`));
    assert.ok(html.includes(`<title>${data.title}</title>`));
    assert.ok(html.includes(`<h1>${data.h1}</h1>`));
    assert.ok(html.includes(`<meta name="description" content="${data.description}">`));
    assert.ok(html.includes('<meta name="robots" content="noindex,nofollow">'));
    assert.ok(html.includes(`href="${data.home}"`)); assert.ok(html.includes(`href="${data.alternate}"`));
    assert.equal(/rel="canonical"|sitemap|<base\b|<iframe\b|<form\b|\son\w+\s*=/i.test(html), false);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(ids.length, new Set(ids).size); idsByPage.push(ids.sort());
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const value = match[1]; if (value.startsWith('#') || value === data.home) continue;
      assert.equal(value.includes(':'), false);
      const target = posix.normalize(posix.join(posix.dirname(name), value));
      assert.ok(PUBLIC_FILES.includes(target), `UNKNOWN_ASSET:${target}`);
    }
    for (const match of html.matchAll(/<label for="([^"]+)"/g)) assert.ok(ids.includes(match[1]));
    for (const match of html.matchAll(/aria-(?:describedby|labelledby|controls)="([^"]+)"/g)) for (const id of match[1].split(' ')) assert.ok(ids.includes(id));
    assert.ok(html.includes('<input id="csv-file" type="file" accept=".csv,text/csv"'));
    assert.equal(/<script(?! type="module" src="[^"]+"><\/script>)/i.test(html), false);
    checks += 14;
  }
  assert.deepEqual(idsByPage[0], idsByPage[1]); checks++;
  const forbidden = /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|serviceWorker|eval)\b|\bconsole\s*\.|innerHTML|outerHTML|insertAdjacentHTML|document\.write|navigator\.clipboard|navigator\.contacts|new\s+Function\b/;
  for (const [name, bytes] of files) {
    const text = bytes.toString('utf8');
    if (/\.(?:js|mjs)$/.test(name)) {
      assert.equal(forbidden.test(text), false, `FORBIDDEN_API:${name}`);
      for (const match of text.matchAll(/\b(?:import|export)\s+(?:[^;]*?\s+from\s+)?['"]([^'"]+)['"]/g)) {
        assert.ok(match[1].startsWith('./') || match[1].startsWith('../'));
        assert.ok(files.has(posix.normalize(posix.join(posix.dirname(name), match[1]))));
      }
    }
    if (name.endsWith('.css')) {
      assert.equal(/@import|url\s*\(/i.test(text), false); assert.ok(text.includes('prefers-reduced-motion'));
      assert.ok(text.includes('48rem')); assert.ok(text.includes('74.999rem')); assert.ok(text.includes(':focus-visible'));
    }
    checks++;
  }
  const app = files.get('js/app.js').toString('utf8');
  for (const match of app.matchAll(/\bget\('([^']+)'\)/g)) assert.ok(idsByPage[0].includes(match[1]), `UNKNOWN_DOM_ID:${match[1]}`);
  assert.ok(app.includes("addEventListener('pagehide', () => session.clear())"));
  assert.ok(files.get('robots.txt').toString().includes('Disallow: /'));
  assert.ok(files.get('_headers').toString().includes("connect-src 'none'")); checks += 4;
  const syntaxFiles = PUBLIC_FILES.filter((name) => /\.(?:js|mjs)$/.test(name)).map((name) => resolve(root, 'public', name));
  for (const dir of ['scripts', 'test']) for (const name of await readdir(resolve(root, dir))) if (name.endsWith('.mjs')) syntaxFiles.push(resolve(root, dir, name));
  for (const path of syntaxFiles) {
    const result = spawnSync(process.execPath, ['--check', path], { shell: false, windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 0, `SYNTAX_FAILED:${path}`); checks++;
  }
  return { checks, publicFiles: files.size, syntaxFiles: syntaxFiles.length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkProject();
  process.stdout.write(`check PASS ${JSON.stringify(result)}; static checks do not replace browser acceptance\n`);
}
