import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import path from 'node:path';
import { ROOT, ASSETS } from '../scripts/validation.mjs';
import { EXPECTED_CONFIG, ORIGIN, PRODUCTION_ASSETS, assertReleaseConfig, renderProduction, headersForAsset } from '../scripts/production.mjs';
import { createProductionServer } from '../scripts/serve-production.mjs';

test('Production closed config accepts only the pinned static-assets target', () => {
  assertReleaseConfig(structuredClone(EXPECTED_CONFIG));
  for (const mutate of [
    config => { config.main = 'worker.mjs'; }, config => { config.build = { command: 'anything' }; },
    config => { config.bindings = []; }, config => { config.send_metrics = true; },
    config => { config.observability.logs.enabled = true; }, config => { config.observability.traces.enabled = true; },
    config => { config.assets.directory = './public'; }, config => { config.assets.not_found_handling = 'single-page-application'; },
    config => { config.routes[0].pattern = 'other.example'; }, config => { config.compatibility_date = '2026-10-15'; }
  ]) { const config = structuredClone(EXPECTED_CONFIG); mutate(config); assert.throws(() => assertReleaseConfig(config), /RELEASE_CONFIG_MISMATCH/); }
});

test('Production bilingual canonical/hreflang/OG/JSON-LD are unique, reciprocal and factual', async () => {
  const files = await renderProduction();
  assert.deepEqual([...files.keys()].sort(), PRODUCTION_ASSETS);
  for (const [file, lang, title] of [['index.html', 'zh-Hant', '訂閱費用盤點'], ['en/index.html', 'en', 'Subscription budget']]) {
    const html = files.get(file).toString('utf8');
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1);
    assert.ok(html.includes(`rel="canonical" href="${ORIGIN}/${file}"`));
    assert.deepEqual([...html.matchAll(/rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(match => match.slice(1)), [
      ['zh-Hant', `${ORIGIN}/index.html`], ['en', `${ORIGIN}/en/index.html`], ['x-default', `${ORIGIN}/index.html`]
    ]);
    assert.ok(html.includes('content="index,follow"')); assert.ok(!html.includes('noindex'));
    assert.ok(html.includes(`property="og:url" content="${ORIGIN}/${file}"`));
    const scripts = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const data = JSON.parse(scripts[0][1]);
    assert.equal(data['@type'], 'WebApplication'); assert.equal(data.name, title); assert.equal(data.inLanguage, lang);
    assert.equal(data.url, `${ORIGIN}/${file}`); assert.equal(data.isAccessibleForFree, true);
    assert.equal(data.browserRequirements, 'Requires JavaScript.');
    for (const key of ['review', 'aggregateRating', 'downloadCount', 'offers']) assert.equal(Object.hasOwn(data, key), false);
    assert.ok(html.includes(lang === 'en' ? 'href="https://glossquote.com/en/index.html"' : 'href="https://glossquote.com/index.html"'));
  }
});

test('Production CSP permits exactly both JSON-LD hashes while keeping static security boundaries', async () => {
  const files = await renderProduction();
  const hashes = ['index.html', 'en/index.html'].map(file => {
    const json = files.get(file).toString('utf8').match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1];
    return `'sha256-${createHash('sha256').update(json).digest('base64')}'`;
  });
  for (const file of ['index.html', 'en/index.html', '404.html']) {
    const headers = headersForAsset(files, file); const csp = headers['Content-Security-Policy'];
    assert.ok(csp.includes(`script-src 'self' ${hashes.join(' ')}`)); assert.equal([...csp.matchAll(/sha256-/g)].length, 2);
    for (const directive of ["default-src 'none'", "connect-src 'none'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'none'", "object-src 'none'"]) assert.ok(csp.includes(directive));
    assert.ok(!csp.includes('unsafe-')); assert.equal(headers['X-Content-Type-Options'], 'nosniff'); assert.equal(headers['X-Frame-Options'], 'DENY');
  }
});

test('Production robots/sitemap/404 and unchanged preview, core/app/assets', async () => {
  const files = await renderProduction();
  assert.equal(files.get('robots.txt').toString(), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  assert.deepEqual([...files.get('sitemap.xml').toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [`${ORIGIN}/index.html`, `${ORIGIN}/en/index.html`]);
  assert.ok(files.get('404.html').toString().includes('content="noindex,nofollow"'));
  for (const file of ASSETS) {
    const original = await readFile(path.join(ROOT, 'public', file));
    if (!['index.html', 'en/index.html', 'robots.txt'].includes(file)) assert.deepEqual(files.get(file), original);
    if (file === 'index.html' || file === 'en/index.html') { assert.ok(original.toString().includes('noindex,nofollow')); assert.ok(!original.toString().includes('rel="canonical"')); }
  }
});

test('Production actual loopback HTTP model: bilingual bytes/SEO/CSP/MIME, 404/405/traversal and hidden _headers', async t => {
  const files = await renderProduction();
  const server = await createProductionServer({ generated: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port; assert.equal(server.address().address, '127.0.0.1');
  const send = (route, method = 'GET', host = `127.0.0.1:${port}`) => new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, path: route, method, headers: { host } }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    }); request.on('error', reject); request.end();
  });
  for (const file of ['index.html', 'en/index.html', 'styles.css', 'js/app.mjs', 'robots.txt', 'sitemap.xml']) {
    const response = await send(`/${file}`); assert.equal(response.status, 200); assert.deepEqual(response.body, files.get(file));
    for (const [key, expected] of Object.entries(headersForAsset(files, file))) assert.equal(response.headers[key.toLowerCase()], expected);
  }
  assert.equal((await send('/js/app.mjs')).headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal((await send('/sitemap.xml')).headers['content-type'], 'application/xml; charset=utf-8');
  const head = await send('/index.html', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0);
  for (const route of ['/missing', '/index', '/en/missing', '/_headers']) {
    const response = await send(route); assert.equal(response.status, 404); assert.deepEqual(response.body, files.get('404.html')); assert.ok(response.body.toString().includes('noindex,nofollow'));
  }
  assert.equal((await send('/index.html', 'POST')).status, 405);
  assert.equal((await send('/index.html', 'GET', 'other.example')).status, 421);
  for (const route of ['/../package.json', '/%2e%2e/package.json', '/%252e%252e/x', '/%00', '/%', '/index.html?draft=fake']) assert.equal((await send(route)).status, 400);
});
