// 建置與 loopback HTTP 測試只寫此候選及 /tmp，不接觸發布服務。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { options, outputPage, extras, csp } from '../scripts/site.mjs';
import { page, escapeHTML } from '../scripts/pages.mjs';
import { build } from '../scripts/build.mjs';
import { root, listFiles, within } from '../scripts/files.mjs';
import { createPreviewServer } from '../scripts/serve.mjs';
import { locales } from '../public/js/locales.mjs';
const production = options(['--production', '--site=https://preview-test.invalid']);
test('preview defaults have no assumed origin', () => {
  assert.deepEqual(options([]), { production: false, site: null });
  assert.match(extras(options([]))['robots.txt'], /Disallow: \//); assert.equal(extras(options([]))['sitemap.xml'], undefined);
});
test('production requires explicit exact HTTPS origin', () => {
  for (const args of [['--production'], ['--site=https://test.invalid'], ['--production', '--site=http://test.invalid'], ['--production', '--site=https://x:test@test.invalid'], ['--production', '--site=https://test.invalid/'], ['--production', '--site=https://test.invalid/path'], ['--production', '--site=https://test.invalid?x=1'], ['--production', '--site=https://test.invalid:8000'], ['--production', '--site=https://127.0.0.1'], ['--production', '--production'], ['--deploy']]) assert.throws(() => options(args));
});
test('bilingual semantic IDs, controls and text keys match', () => {
  const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(ids(page('zh-Hant')), ids(page('en')));
  for (const language of ['zh-Hant', 'en']) {
    const html = page(language), list = ids(html); assert.equal(new Set(list).size, list.length);
    assert.match(html, new RegExp(`<html lang="${language}">`)); assert.match(html, /role="status" aria-live="polite"/);
    assert.doesNotMatch(html, /rel="canonical"|sitemap|<script>.*<\/script>/);
    assert.match(html, /type="file" accept="image\/png,image\/jpeg"/);
  }
  assert.deepEqual(Object.keys(locales.en.errors).sort(), Object.keys(locales['zh-Hant'].errors).sort());
});
test('HTML escaping prevents attribute or text injection', () => assert.equal(escapeHTML('<img "x" & \'y\'>'), '&lt;img &quot;x&quot; &amp; &#39;y&#39;&gt;'));
test('production canonical and reciprocal alternates only use supplied origin', () => {
  for (const [language, path] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) {
    const html = outputPage(page(language), path, production);
    assert.match(html, new RegExp(`rel="canonical" href="https://preview-test.invalid/${path}"`));
    for (const language of ['zh-Hant', 'en', 'x-default']) assert.match(html, new RegExp(`hreflang="${language}"`));
    assert.match(html, /content="index,follow"/); assert.doesNotMatch(html, /content="noindex,nofollow"/);
  }
});
test('security output forbids network APIs, framing, base and form changes', () => {
  for (const rule of ["connect-src 'none'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"]) assert.ok(csp.includes(rule));
  assert.match(extras(options([]))._headers, /X-Robots-Tag: noindex, nofollow/);
  assert.match(extras(production)._headers, /\/404.html\n  X-Robots-Tag: noindex, nofollow/);
});
test('file walker rejects symlink files and directories', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'overlay-files-'));
  try { await writeFile(join(dir, 'ok.txt'), 'x'); await symlink(join(dir, 'ok.txt'), join(dir, 'linked.txt')); await assert.rejects(listFiles(dir), /PATH_REJECTED/); }
  finally { await rm(dir, { recursive: true, force: true }); }
  assert.equal(within('/tmp/a', '/tmp/a/b'), true); assert.equal(within('/tmp/a', '/tmp/ab'), false);
});
test('preview and production are separate and reproducible', async () => {
  const preview = await build(); const before = await readFile(join(preview, 'index.html'), 'utf8');
  const dest = await build(['--production', '--site=https://preview-test.invalid']);
  try {
    assert.notEqual(preview, dest); assert.equal(await readFile(join(preview, 'index.html'), 'utf8'), before);
    assert.match(await readFile(join(dest, 'index.html'), 'utf8'), /rel="canonical"/);
    assert.match(await readFile(join(dest, '404.html'), 'utf8'), /noindex,nofollow/);
    await build(); assert.equal(await readFile(join(preview, 'index.html'), 'utf8'), before);
  } finally { await rm(dest, { recursive: true, force: true }); }
});
const get = (server, path, method = 'GET') => new Promise((resolve, reject) => {
  const req = request({ host: '127.0.0.1', port: server.address().port, path, method }, response => { const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() })); }); req.on('error', reject); req.end();
});
test('loopback server MIME, noindex, HEAD, methods and traversal', async () => {
  await build(); const server = createPreviewServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const path of ['/index.html', '/en/', '/js/app.mjs', '/styles/app.css']) {
      const res = await get(server, path); assert.equal(res.status, 200); assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow'); assert.equal(res.headers['content-security-policy'], csp);
    }
    assert.match((await get(server, '/js/app.mjs')).headers['content-type'], /text\/javascript/);
    assert.equal((await get(server, '/index.html', 'HEAD')).body, '');
    assert.equal((await get(server, '/', 'POST')).status, 405);
    for (const path of ['/../package.json', '/%2e%2e/package.json', '/a%5cb', '/%00', '/%ZZ']) assert.equal((await get(server, path)).status, 400);
    for (const path of ['/package.json', '/_headers', '/missing.html']) assert.equal((await get(server, path)).status, 404);
    const outside = await mkdtemp(join(tmpdir(), 'overlay-web-'));
    try { await writeFile(join(outside, 'secret.html'), 'PRIVATE'); await symlink(join(outside, 'secret.html'), join(root, 'dist-preview', 'link.html')); assert.equal((await get(server, '/link.html')).status, 404); }
    finally { await rm(join(root, 'dist-preview', 'link.html'), { force: true }); await rm(outside, { recursive: true, force: true }); }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
