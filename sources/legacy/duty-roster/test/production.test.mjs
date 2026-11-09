import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ASSET_FILES, makeProduction, productionResponse, headerModel } from '../scripts/model.mjs';
import { M1_FROZEN } from '../scripts/m1-frozen.mjs';
const source = new Map(); for (const name of ASSET_FILES) source.set(name, await readFile(new URL(`../public/${name}`, import.meta.url)));
const files = makeProduction(source);

test('M2 config: only static assets, exact domain/date and all telemetry disabled', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(config).sort(), ['assets','compatibility_date','dependencies_instrumentation','name','observability','preview_urls','routes','send_metrics','workers_dev'].sort());
  assert.equal(config.name, 'glossquote-duty-roster'); assert.equal(config.compatibility_date, '2026-10-17');
  assert.deepEqual(config.routes, [{ pattern: 'rota.glossquote.com', custom_domain: true }]);
  assert.deepEqual(config.assets, { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' });
  for (const key of ['workers_dev','preview_urls','send_metrics']) assert.equal(config[key], false);
  assert.deepEqual(config.dependencies_instrumentation, { enabled: false });
  assert.deepEqual(config.observability, { enabled: false, logs: { enabled: false }, traces: { enabled: false } });
});
test('M2 exact static files and MIME; _headers is configuration, never served', () => {
  for (const [route, mime] of [['/index.html','text/html;charset=utf-8'],['/en/index.html','text/html;charset=utf-8'],['/styles/app.css','text/css;charset=utf-8'],['/js/app.js','text/javascript;charset=utf-8'],['/robots.txt','text/plain;charset=utf-8'],['/sitemap.xml','application/xml;charset=utf-8']]) {
    const response = productionResponse(files, route); assert.equal(response.status, 200); assert.equal(response.headers['content-type'], mime); assert.equal(response.body.equals(files.get(route.slice(1))), true);
  }
  assert.equal(productionResponse(files, '/_headers').status, 404);
});
test('M2 canonical headers detach inherited noindex AND CSP; other assets stay noindex', () => {
  for (const route of ['/index.html','/en/index.html']) {
    const response = productionResponse(files, route);
    assert.equal(response.headers['x-robots-tag'], 'index,follow'); assert.equal(response.headers['x-content-type-options'], 'nosniff'); assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.equal(response.headers['content-security-policy'].split('default-src').length, 2);
    assert.match(response.headers['content-security-policy'], /connect-src 'none'/); assert.match(response.headers['content-security-policy'], /frame-ancestors 'none'/); assert.match(response.headers['content-security-policy'], /form-action 'none'/);
    assert.match(response.headers['permissions-policy'], /clipboard-write=\(self\)/);
  }
  for (const route of ['/404.html','/robots.txt','/js/app.js']) assert.equal(productionResponse(files, route).headers['x-robots-tag'], 'noindex,nofollow');
  const fixture = '/*\n  X-Robots-Tag: noindex\n  Content-Security-Policy: old\n/index.html\n  ! X-Robots-Tag\n  X-Robots-Tag: index,follow\n  ! Content-Security-Policy\n  Content-Security-Policy: new\n';
  assert.deepEqual(headerModel(fixture, '/index.html'), { 'x-robots-tag': 'index,follow', 'content-security-policy': 'new' });
  assert.deepEqual(headerModel(fixture, '/missing'), { 'x-robots-tag': 'noindex', 'content-security-policy': 'old' });
});
test('M2 missing/alias/traversal paths have genuine 404 body, no SPA success form', () => {
  for (const route of ['/','/en/','/index','/missing','/package.json','/../package.json','/%2e%2e/package.json','/%5cpackage.json','/%00','/%zz']) {
    const response = productionResponse(files, route); assert.equal(response.status, 404, route); assert.equal(response.headers['x-robots-tag'], 'noindex,nofollow');
    assert.match(response.body.toString(), /Page not found/); assert.doesNotMatch(response.body.toString(), /<form|roster-form|application\/ld\+json/);
  }
});
test('M2 GET/HEAD and 405 policy is deterministic and contains no request values', () => {
  const get = productionResponse(files, '/index.html'); const head = productionResponse(files, '/index.html', 'HEAD');
  assert.deepEqual(head, get); // HTTP adapter suppresses only the payload for HEAD.
  for (const method of ['POST','PUT','DELETE','OPTIONS']) { const response = productionResponse(files, '/index.html', method); assert.equal(response.status, 405); assert.equal(response.headers.allow, 'GET, HEAD'); assert.equal(response.body.toString(), 'Method not allowed'); }
});
test('M2 unit: all eight accepted M1 public assets retain exact bytes without build outputs', async () => {
  assert.equal(M1_FROZEN.length, 8);
  for (const record of M1_FROZEN) {
    const publicBytes = await readFile(new URL(`../${record.path}`, import.meta.url));
    assert.equal(publicBytes.length, record.bytes); assert.equal(createHash('sha256').update(publicBytes).digest('hex'), record.sha256);
  }
});
