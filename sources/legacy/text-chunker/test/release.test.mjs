import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, cp, readFile, writeFile, rm, link } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:http';
import { createHash } from 'node:crypto';
import { ORIGIN, APPROVED_PREVIEW_DIGEST, PRODUCTION_FILES, buildProduction, checkProduction, renderProductionPage, validateProductionPage, productionHeaders } from '../scripts/release.mjs';
import { PUBLIC_FILES, manifest, parseMarkup } from '../scripts/validation.mjs';
import { startProductionPreview, productionRoute } from '../scripts/serve-production.mjs';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(project, 'test/.runs');
async function fixture(t) {
  await mkdir(evidence, { recursive: true });
  const root = await mkdtemp(path.join(evidence, 'release-'));
  assert.ok(root.startsWith(evidence + path.sep));
  t.after(async () => { if (!path.resolve(root).startsWith(evidence + path.sep)) throw new Error('CLEANUP_BOUNDARY'); await rm(root, { recursive: true, force: true }); });
  for (const directory of ['public', 'scripts']) await cp(path.join(project, directory), path.join(root, directory), { recursive: true });
  for (const file of ['package.json', 'wrangler.jsonc']) await cp(path.join(project, file), path.join(root, file));
  await mkdir(path.join(root, 'test'));
  await writeFile(path.join(root, 'test', 'fake.test.mjs'), '// Offline fixture.\n');
  return root;
}
const http = (url, pathname, method = 'GET', host = 'spoofed.invalid') => new Promise((resolve, reject) => {
  const parsed = new URL(url);
  const req = request({ hostname: parsed.hostname, port: parsed.port, path: pathname, method, headers: { Host: host } }, response => {
    const chunks = []; response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
  }); req.on('error', reject); req.end();
});
test('production generated heads keep every approved preview byte and app body intact', async t => {
  const root = await fixture(t);
  const before = await manifest(path.join(root, 'public'), PUBLIC_FILES);
  assert.equal(before.digest, APPROVED_PREVIEW_DIGEST);
  await buildProduction(root);
  assert.deepEqual(await manifest(path.join(root, 'public'), PUBLIC_FILES), before);
  assert.equal((await checkProduction(root)).production.records.length, 14);
  for (const [language, file] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) {
    const original = await readFile(path.join(root, 'public', file), 'utf8');
    const actual = await readFile(path.join(root, 'dist-production', file), 'utf8');
    assert.equal(actual.slice(actual.indexOf('</head>') + 7), original.slice(original.indexOf('</head>') + 7));
    const tags = parseMarkup(actual);
    const canonical = tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'canonical');
    assert.deepEqual(canonical.map(tag => tag.attrs.href), [ORIGIN + (language === 'en' ? '/en/index.html' : '/index.html')]);
    assert.deepEqual(tags.filter(tag => tag.name === 'link' && tag.attrs.rel === 'alternate').map(tag => [tag.attrs.hreflang, tag.attrs.href]), [['zh-Hant', ORIGIN + '/index.html'], ['en', ORIGIN + '/en/index.html'], ['x-default', ORIGIN + '/index.html']]);
    assert.ok(actual.includes('content="index,follow"'));
    assert.ok(!actual.includes('noindex'));
    const ld = JSON.parse(/<script type="application\/ld\+json">([^<]+)<\/script>/.exec(actual)[1]);
    assert.equal(ld['@type'], 'WebApplication'); assert.equal(ld.url, canonical[0].attrs.href); assert.equal(ld.inLanguage, language);
    const hash = createHash('sha256').update(JSON.stringify(ld)).digest('base64');
    assert.ok(productionHeaders()['Content-Security-Policy'].includes(`'sha256-${hash}'`));
  }
  for (const file of ['styles/app.css', 'js/app.mjs', 'js/state.mjs', 'js/i18n.mjs', 'js/core/text-chunker.mjs']) assert.deepEqual(await readFile(path.join(root, 'dist-production', file)), await readFile(path.join(root, 'public', file)));
});
test('production robots/sitemap have only fixed bilingual origin; host/query cannot configure it', async t => {
  const root = await fixture(t); await buildProduction(root);
  const robots = await readFile(path.join(root, 'dist-production/robots.txt'), 'utf8');
  assert.equal(robots, 'User-agent: *\nAllow: /\nSitemap: https://chunks.glossquote.com/sitemap.xml\n');
  const sitemap = await readFile(path.join(root, 'dist-production/sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://chunks.glossquote.com/index.html', 'https://chunks.glossquote.com/en/index.html']);
  assert.equal((sitemap.match(/hreflang="x-default"/g) ?? []).length, 2);
  assert.throws(() => renderProductionPage('x', 'en', 'https://spoofed.invalid'), /ORIGIN_NOT_ALLOWED/);
  const preview = await readFile(path.join(root, 'public/en/index.html'), 'utf8');
  const produced = renderProductionPage(preview, 'en');
  assert.throws(() => validateProductionPage(produced.replace('rel="canonical" href="https://chunks.glossquote.com/en/index.html"', 'rel="canonical" href="https://spoofed.invalid/en/index.html"'), preview, 'en'), /CANONICAL_MISMATCH/);
});
test('wrong origin/config/production bytes/stale files/target hardlinks reject before overwriting', async t => {
  const root = await fixture(t); await buildProduction(root);
  const original = await readFile(path.join(root, 'dist-production/index.html'));
  await writeFile(path.join(root, 'dist-production/index.html'), 'FAKE_TAMPERED');
  await assert.rejects(checkProduction(root), /PRODUCTION_BYTES_CHANGED/);
  await writeFile(path.join(root, 'dist-production/index.html'), original);
  await writeFile(path.join(root, 'dist-production/unknown.txt'), 'FAKE_STALE');
  await assert.rejects(buildProduction(root), /UNKNOWN_PUBLIC_FILE/);
  assert.deepEqual(await readFile(path.join(root, 'dist-production/index.html')), original);
  await rm(path.join(root, 'dist-production/unknown.txt'));
  const config = JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  config.observability.traces.enabled = true;
  await writeFile(path.join(root, 'wrangler.jsonc'), JSON.stringify(config));
  await assert.rejects(buildProduction(root), /WRANGLER_CONTRACT_MISMATCH/);
  config.observability.traces.enabled = false; await writeFile(path.join(root, 'wrangler.jsonc'), JSON.stringify(config));
  const sentinel = path.join(root, 'outside.txt'); await writeFile(sentinel, 'FAKE_SENTINEL');
  await rm(path.join(root, 'dist-production/index.html')); await link(sentinel, path.join(root, 'dist-production/index.html'));
  await assert.rejects(buildProduction(root), /HARDLINK_REJECTED/);
  assert.equal(await readFile(sentinel, 'utf8'), 'FAKE_SENTINEL');
});
test('true missing paths are localized HTTP404; method/MIME/security/metadata routes are verified', async t => {
  const root = await fixture(t); await buildProduction(root);
  const preview = await startProductionPreview(root);
  t.after(() => new Promise(resolve => preview.server.close(resolve)));
  assert.equal(preview.server.address().address, '127.0.0.1');
  const page = await http(preview.url, '/index.html?origin=https://spoofed.invalid&source=FAKE_PRIVATE_DRAFT');
  assert.equal(page.status, 200); assert.ok(page.body.includes('rel="canonical" href="https://chunks.glossquote.com/index.html"'));
  assert.ok(!page.body.includes('spoofed.invalid')); assert.ok(!page.body.includes('FAKE_PRIVATE_DRAFT'));
  assert.equal(page.headers['x-content-type-options'], 'nosniff'); assert.match(page.headers['content-security-policy'], /connect-src 'none'/);
  for (const [route, text] of [['/missing', '找不到這個頁面'], ['/en/missing', 'Page not found'], ['/en/deep/missing', 'Page not found']]) {
    const missing = await http(preview.url, route); assert.equal(missing.status, 404); assert.ok(missing.body.includes(text)); assert.match(missing.headers['content-type'], /^text\/html/);
  }
  for (const route of ['/_headers', '/_redirects', '/%2e%2e/package.json', '/%252e%252e/package.json', '/.git/config', '/package.json']) assert.equal((await http(preview.url, route)).status, 404);
  assert.equal((await http(preview.url, '/en/missing', 'HEAD')).body, '');
  assert.equal((await http(preview.url, '/index.html', 'POST')).status, 405);
  assert.match((await http(preview.url, '/js/app.mjs')).headers['content-type'], /^text\/javascript/);
  assert.match((await http(preview.url, '/styles/app.css')).headers['content-type'], /^text\/css/);
  assert.match((await http(preview.url, '/sitemap.xml')).headers['content-type'], /^application\/xml/);
  assert.deepEqual(productionRoute('/'), { status: 301, location: '/index.html' });
  assert.equal((await http(preview.url, '/')).headers.location, '/index.html');
  assert.equal(PRODUCTION_FILES.includes('worker.mjs'), false);
});
