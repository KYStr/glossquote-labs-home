import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { request } from 'node:http';
import { root } from '../scripts/files.mjs';
import { renderProductionAssets } from '../scripts/production.mjs';
import { createProductionServer } from '../scripts/preview-production.mjs';

// These fixed fixtures are authored from the release contract, independently of
// the production builder's page objects, templates and hash helpers.
const fixtures = [
  {
    path: 'index.html', lang: 'zh-Hant', locale: 'zh_TW', title: 'GlossQuote 活動時間表｜安排活動流程與結束時間',
    description: '輸入開始時間與每段活動分鐘數，排出逐段起訖、跨午夜標記和目標結束時間差。活動資料只留在目前頁面記憶體。',
    json: '{"@context":"https://schema.org","@type":"WebApplication","name":"GlossQuote 活動時間表","description":"輸入開始時間與每段活動分鐘數，排出逐段起訖、跨午夜標記和目標結束時間差。活動資料只留在目前頁面記憶體。","url":"https://agenda.glossquote.com/index.html","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","inLanguage":"zh-Hant","browserRequirements":"Requires JavaScript"}'
  },
  {
    path: 'en/index.html', lang: 'en', locale: 'en_US', title: 'GlossQuote Event Timeline | Plan an Event Schedule',
    description: 'Add a start time and activity durations to see each start and end, next-day markers, and the difference from an optional target. Data stays in this page’s memory.',
    json: '{"@context":"https://schema.org","@type":"WebApplication","name":"GlossQuote Event Timeline","description":"Add a start time and activity durations to see each start and end, next-day markers, and the difference from an optional target. Data stays in this page’s memory.","url":"https://agenda.glossquote.com/en/index.html","applicationCategory":"UtilitiesApplication","operatingSystem":"Any","inLanguage":"en","browserRequirements":"Requires JavaScript"}'
  }
];
const expectedHashes = fixtures.map(fixture => createHash('sha256').update(fixture.json, 'utf8').digest('base64'));
const expectedCsp = `default-src 'none'; script-src 'self' 'sha256-${expectedHashes[0]}' 'sha256-${expectedHashes[1]}'; style-src 'self'; img-src 'self'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; media-src 'none'; worker-src 'none'; manifest-src 'none'`;
test('P01 fixed production file set; runtime/body bytes and M1 preview preserved', async () => {
  const output = await renderProductionAssets();
  assert.deepEqual([...output.keys()].sort(), ['index.html', 'en/index.html', '404.html', '_headers', 'robots.txt', 'sitemap.xml', 'styles/app.css', 'js/app.js', 'js/core/parse-clock.js', 'js/core/parse-duration.js', 'js/core/validation.js', 'js/core/schedule.js', 'js/core/report.js'].sort());
  for (const path of ['404.html', 'styles/app.css', 'js/app.js', 'js/core/parse-clock.js', 'js/core/parse-duration.js', 'js/core/validation.js', 'js/core/schedule.js', 'js/core/report.js']) assert.deepEqual(output.get(path), await readFile(join(root, 'public', path)));
  for (const fixture of fixtures) {
    const preview = await readFile(join(root, 'public', fixture.path), 'utf8');
    assert.ok(preview.includes('name="robots" content="noindex,nofollow"'));
    assert.equal(/rel="canonical"|hreflang|ld\+json|property="og:/.test(preview), false);
    const production = output.get(fixture.path).toString('utf8');
    assert.equal(production.slice(production.indexOf('<body>')), preview.slice(preview.indexOf('<body>')));
  }
});
test('P02 independent bilingual SEO and exact JSON-LD byte/hash oracles', async () => {
  const output = await renderProductionAssets();
  for (const fixture of fixtures) {
    const html = output.get(fixture.path).toString('utf8');
    assert.ok(html.includes(`<html lang="${fixture.lang}">`));
    assert.ok(html.includes(`<title>${fixture.title}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${fixture.description}">`));
    assert.ok(html.includes('<meta name="robots" content="index,follow">'));
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]), [`https://agenda.glossquote.com/${fixture.path}`]);
    assert.deepEqual([...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">/g)].map(match => [match[1], match[2]]), [
      ['zh-Hant', 'https://agenda.glossquote.com/index.html'], ['en', 'https://agenda.glossquote.com/en/index.html'], ['x-default', 'https://agenda.glossquote.com/index.html']
    ]);
    assert.deepEqual([...html.matchAll(/<meta property="og:([^"]+)" content="([^"]+)">/g)].map(match => [match[1], match[2]]), [
      ['title', fixture.title], ['description', fixture.description], ['locale', fixture.locale], ['url', `https://agenda.glossquote.com/${fixture.path}`], ['type', 'website']
    ]);
    assert.deepEqual([...html.matchAll(/<script type="application\/ld\+json">([^]*?)<\/script>/g)].map(match => match[1]), [fixture.json]);
    assert.equal([...html.matchAll(/<script\b/g)].length, 2);
  }
  const headers = output.get('_headers').toString('utf8');
  assert.equal(headers, '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), clipboard-write=(self)\n  X-Frame-Options: DENY\n  X-Robots-Tag: noindex, nofollow\n  Content-Security-Policy: ' + expectedCsp + '\n/index.html\n  ! X-Robots-Tag\n/en/index.html\n  ! X-Robots-Tag\n');
  assert.equal(/unsafe-inline|unsafe-eval|EXACT_PAGE|connect-src 'self'|data:/.test(headers), false);
});
test('P03 independent robots, two-URL sitemap and bilingual noindex 404', async () => {
  const output = await renderProductionAssets();
  const robots = output.get('robots.txt').toString('utf8');
  assert.equal(robots, 'User-agent: *\nAllow: /index.html$\nAllow: /en/index.html$\nAllow: /js/\nAllow: /styles/\nDisallow: /\nSitemap: https://agenda.glossquote.com/sitemap.xml\n');
  const rules = [...robots.matchAll(/^(Allow|Disallow): ([^\n]+)$/gm)].map(([, action, path]) => ({ allow: action === 'Allow', path }));
  function canCrawl(path) {
    const matches = rules.filter(rule => rule.path.endsWith('$') ? path === rule.path.slice(0, -1) : path.startsWith(rule.path));
    matches.sort((left, right) => right.path.replace(/\$$/, '').length - left.path.replace(/\$$/, '').length || Number(right.allow) - Number(left.allow));
    return matches.length ? matches[0].allow : true;
  }
  for (const path of ['/index.html', '/en/index.html', '/js/app.js', '/js/core/validation.js', '/styles/app.css']) assert.equal(canCrawl(path), true, path);
  for (const path of ['/README.md', '/scripts/production.mjs', '/test/production.test.mjs', '/en/unknown.html', '/unknown', '/index.html-source']) assert.equal(canCrawl(path), false, path);
  assert.equal(output.get('sitemap.xml').toString('utf8'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://agenda.glossquote.com/index.html</loc></url>\n  <url><loc>https://agenda.glossquote.com/en/index.html</loc></url>\n</urlset>\n');
  const page = output.get('404.html').toString('utf8');
  assert.ok(page.includes('name="robots" content="noindex,nofollow"')); assert.ok(page.includes('Page not found.')); assert.ok(page.includes('找不到頁面'));
  assert.ok(page.includes('href="/index.html"')); assert.ok(page.includes('href="/en/index.html"')); assert.equal(page.includes('timeline-form'), false);
});
test('P04 independent exact static-only Wrangler oracle', async () => {
  assert.deepEqual(JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8')), {
    name: 'glossquote-event-timeline', compatibility_date: '2026-10-16', workers_dev: false, preview_urls: false, send_metrics: false,
    assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
    routes: [{ pattern: 'agenda.glossquote.com', custom_domain: true }], observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } }
  });
});
test('P05 actual loopback production HTTP model with fixed header/MIME/404 oracles', async () => {
  const server = await createProductionServer(await renderProductionAssets());
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  assert.equal(server.address().address, '127.0.0.1');
  const get = (path, method = 'GET') => new Promise((resolve, reject) => {
    const connection = request({ host: '127.0.0.1', port: server.address().port, path, method }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }); connection.on('error', reject); connection.end();
  });
  try {
    for (const path of ['/index.html', '/en/index.html']) {
      const response = await get(path); assert.equal(response.status, 200); assert.equal(response.headers['x-robots-tag'], undefined); assert.ok(response.body.includes('name="robots" content="index,follow"'));
      assert.equal(response.headers['content-security-policy'], expectedCsp); assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
      assert.equal(response.headers['x-content-type-options'], 'nosniff'); assert.equal(response.headers['x-frame-options'], 'DENY'); assert.equal(response.headers['referrer-policy'], 'no-referrer');
      assert.equal(response.headers['permissions-policy'], 'camera=(), microphone=(), geolocation=(), clipboard-write=(self)');
    }
    for (const [path, type] of [['/js/app.js', 'text/javascript; charset=utf-8'], ['/styles/app.css', 'text/css; charset=utf-8'], ['/robots.txt', 'text/plain; charset=utf-8'], ['/sitemap.xml', 'application/xml; charset=utf-8']]) { const response = await get(path); assert.equal(response.status, 200); assert.equal(response.headers['content-type'], type); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow'); }
    assert.equal((await get('/index.html', 'HEAD')).body, '');
    for (const path of ['/unknown-production-25', '/404.html', '/_headers', '/scripts/production.mjs', '/test/production.test.mjs', '/wrangler.jsonc', '/%2e%2e/README.md', '/index.html?input=fake']) { const response = await get(path); assert.equal(response.status, 404); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow'); assert.ok(response.body.includes('Page not found.')); assert.equal(response.body.includes('timeline-form'), false); }
    const response = await get('/index.html', 'POST'); assert.equal(response.status, 405); assert.equal(response.headers.allow, 'GET, HEAD');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
test('P06 independent Cloudflare raw _headers merge/detach oracle', async () => {
  const output = await renderProductionAssets();
  const rawPolicy = output.get('_headers').toString('utf8');
  // Independent evaluator of the actual emitted rules, not the model's response
  // object: matching additions merge; explicit ! rules detach inherited values.
  const evaluate = pathname => {
    const values = new Map(); let matched = false;
    for (const line of rawPolicy.split('\n')) {
      if (!line.trim()) continue;
      if (!/^\s/.test(line)) { matched = line === '/*' || line === pathname; continue; }
      if (!matched) continue;
      const entry = line.trim();
      if (entry.startsWith('! ')) { values.delete(entry.slice(2).toLowerCase()); continue; }
      const colon = entry.indexOf(':'); const key = entry.slice(0, colon).toLowerCase(); const value = entry.slice(colon + 1).trim();
      values.set(key, values.has(key) ? values.get(key) + ', ' + value : value);
    }
    return values;
  };
  for (const path of ['/index.html', '/en/index.html']) {
    const headers = evaluate(path);
    assert.equal(headers.has('x-robots-tag'), false, 'Canonical must detach inherited noindex');
    assert.equal(headers.get('content-security-policy'), expectedCsp); assert.equal(headers.get('x-frame-options'), 'DENY'); assert.equal(headers.get('x-content-type-options'), 'nosniff');
  }
  for (const path of ['/404.html', '/unknown', '/index.html-other', '/js/app.js', '/styles/app.css']) {
    const headers = evaluate(path); assert.equal(headers.get('x-robots-tag'), 'noindex, nofollow'); assert.equal(headers.get('content-security-policy'), expectedCsp);
  }
  assert.equal((rawPolicy.match(/! X-Robots-Tag/g) ?? []).length, 2);
  assert.equal(rawPolicy.includes('X-Robots-Tag: index'), false);
});
