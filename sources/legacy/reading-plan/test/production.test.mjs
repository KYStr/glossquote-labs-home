import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, mkdtemp, copyFile, writeFile, rm, link } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { request } from 'node:http';
import { ROOT, ASSETS, checkedTree } from '../scripts/files.mjs';
import { buildProduction } from '../scripts/build-production.mjs';
import { checkProduction } from '../scripts/check-production.mjs';
import { startProduction } from '../scripts/preview-production.mjs';
import { checkSourceTree, SOURCE_FILES } from '../scripts/source-policy.mjs';

// Independent release oracle: literals do not import generator/config values.
const EXPECTED_CONFIG = { name: 'glossquote-reading-plan', compatibility_date: '2026-10-16', workers_dev: false, preview_urls: false, send_metrics: false, assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' }, routes: [{ pattern: 'reading.glossquote.com', custom_domain: true }], observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } } };
const GOLDEN_LD = {
  'zh-Hant': '{"@context":"https://schema.org","@type":"WebApplication","name":"閱讀進度規劃","url":"https://reading.glossquote.com/index.html","inLanguage":"zh-Hant","applicationCategory":"EducationalApplication","description":"輸入總頁數、已讀頁數、日期範圍與可讀星期，將剩餘頁數分配到各閱讀日。可檢查每日頁數上限；工具不追蹤實際閱讀。","browserRequirements":"Requires JavaScript.","publisher":{"@type":"Organization","name":"GlossQuote"}}',
  en: '{"@context":"https://schema.org","@type":"WebApplication","name":"Reading plan","url":"https://reading.glossquote.com/en/index.html","inLanguage":"en","applicationCategory":"EducationalApplication","description":"Enter total and completed pages, a date range, and the weekdays you can read. Distribute remaining pages across those dates and check a daily page cap. The tool does not track reading.","browserRequirements":"Requires JavaScript.","publisher":{"@type":"Organization","name":"GlossQuote"}}'
};
const EXPECTED_ROBOTS = 'User-agent: *\nAllow: /index.html\nAllow: /en/index.html\nAllow: /js/\nAllow: /styles/\nDisallow: /\nSitemap: https://reading.glossquote.com/sitemap.xml\n';
const EXPECTED_FILES = ['404.html', '_headers', 'en/index.html', 'index.html', 'js/app.mjs', 'js/core/civil-date.mjs', 'js/core/reading-plan.mjs', 'js/core/report.mjs', 'js/i18n.mjs', 'robots.txt', 'sitemap.xml', 'styles/app.css'];
const GOLDEN_HASHES = Object.values(GOLDEN_LD).map(text => createHash('sha256').update(text, 'utf8').digest('base64'));
const EXPECTED_CSP = `default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'none'; script-src 'self' 'sha256-${GOLDEN_HASHES[0]}' 'sha256-${GOLDEN_HASHES[1]}'; style-src 'self'; img-src 'self'; font-src 'self'; worker-src 'none'`;
async function fixture(t, all = false) {
  const tmpRoot = resolve(ROOT, 'test/.tmp'); await mkdir(tmpRoot, { recursive: true });
  const root = await mkdtemp(join(tmpRoot, 'production-'));
  t.after(async () => { const rel = relative(tmpRoot, resolve(root)); if (!rel.startsWith('production-') || rel.includes('..') || rel.includes(':')) throw new Error('UNSAFE_FIXTURE_CLEANUP'); await rm(root, { recursive: true }); });
  for (const file of all ? SOURCE_FILES : ['package.json', 'wrangler.jsonc', ...ASSETS.map(p => `public/${p}`)]) {
    const parts = file.split('/'); parts.pop(); await mkdir(join(root, ...parts), { recursive: true }); await copyFile(join(ROOT, file), join(root, file));
  }
  return root;
}
test('release oracle: production metadata and body preserve independently accepted M1', async t => {
  const root = await fixture(t); const before = await checkedTree(join(root, 'public'));
  const manifest = await buildProduction(root); assert.deepEqual(manifest.map(f => f.path), EXPECTED_FILES);
  assert.deepEqual(JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8')), EXPECTED_CONFIG);
  assert.deepEqual(await checkedTree(join(root, 'public')), before);
  const header = await readFile(join(root, 'dist-production/_headers'), 'utf8');
  assert(header.includes('  Content-Security-Policy: ' + EXPECTED_CSP + '\n'));
  assert(!/unsafe-inline|unsafe-eval|https:|data:/.test(header));
  assert(header.includes('/index.html\n  ! X-Robots-Tag\n/en/index.html\n  ! X-Robots-Tag\n'));
  for (const [locale, path] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) {
    const preview = await readFile(join(root, 'public', path), 'utf8'); const output = await readFile(join(root, 'dist-production', path), 'utf8');
    assert.equal(output.slice(output.indexOf('<body>')), preview.slice(preview.indexOf('<body>')));
    assert(output.includes('<meta name="robots" content="index,follow">')); assert(!output.includes('noindex'));
    assert(output.includes(`<link rel="canonical" href="https://reading.glossquote.com/${path}">`));
    for (const [lang, target] of [['zh-Hant', 'index.html'], ['en', 'en/index.html'], ['x-default', 'index.html']]) assert(output.includes(`<link rel="alternate" hreflang="${lang}" href="https://reading.glossquote.com/${target}">`));
    const ld = output.match(/<script type="application\/ld\+json">([^<]*)<\/script>/)[1];
    assert.equal(ld, GOLDEN_LD[locale]); assert.deepEqual(JSON.parse(ld), JSON.parse(GOLDEN_LD[locale]));
    assert(output.includes(`<meta property="og:url" content="https://reading.glossquote.com/${path}">`));
    assert(output.includes(`<meta property="og:locale" content="${locale === 'en' ? 'en_US' : 'zh_TW'}">`));
  }
  for (const path of ['styles/app.css', 'js/app.mjs', 'js/i18n.mjs', 'js/core/civil-date.mjs', 'js/core/reading-plan.mjs', 'js/core/report.mjs']) assert.deepEqual(await readFile(join(root, 'dist-production', path)), await readFile(join(root, 'public', path)));
  assert.equal(await readFile(join(root, 'dist-production/robots.txt'), 'utf8'), EXPECTED_ROBOTS);
  const sitemap = await readFile(join(root, 'dist-production/sitemap.xml'), 'utf8');
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]), ['https://reading.glossquote.com/index.html', 'https://reading.glossquote.com/en/index.html']);
  assert(!/lastmod|localhost|127\.0\.0\.1/.test(sitemap));
  const missing = await readFile(join(root, 'dist-production/404.html'), 'utf8'); assert(missing.includes('content="noindex,nofollow"')); assert(!/id="reading-form"|application\/ld\+json|canonical/.test(missing));
  assert.equal((await checkProduction(root)).length, 12);
});
test('release rejects M1 changes, closed-config additions, stale/unknown/hardlinked output', async t => {
  const root = await fixture(t); await buildProduction(root);
  await writeFile(join(root, 'dist-production/robots.txt'), 'bad'); await assert.rejects(checkProduction(root), /PRODUCTION_STALE_OR_TAMPERED/); await buildProduction(root);
  await writeFile(join(root, 'dist-production/hidden.txt'), 'KEEP'); await assert.rejects(buildProduction(root), /UNEXPECTED_OR_LINKED_FILE/); assert.equal(await readFile(join(root, 'dist-production/hidden.txt'), 'utf8'), 'KEEP');
  const modified = await fixture(t); await writeFile(join(modified, 'public/robots.txt'), 'changed'); await assert.rejects(buildProduction(modified), /ROBOTS_BOUNDARY|M1_PUBLIC_CHANGED_STOP/);
  const config = await fixture(t); await writeFile(join(config, 'wrangler.jsonc'), JSON.stringify({ ...EXPECTED_CONFIG, main: 'worker.mjs' })); await assert.rejects(buildProduction(config), /WRANGLER_CLOSED_CONFIG/);
  const linked = await fixture(t); await buildProduction(linked); await link(join(linked, 'dist-production/robots.txt'), join(linked, 'second.txt')); await assert.rejects(checkProduction(linked), /UNEXPECTED_OR_LINKED_FILE/);
});
test('release source policy excludes private coordination and rejects unexpected publication files', async t => {
  const root = await fixture(t, true);
  const source = await checkSourceTree(root, { publishingCopy: true }); assert.equal(source.length, SOURCE_FILES.length);
  assert(!source.some(f => /HANDOFF|TASK-ENTRY|DISPATCH|project\.json|\.runs|dist\//.test(f.path)));
  await writeFile(join(root, 'account.txt'), 'PRIVATE_FIXTURE'); await assert.rejects(checkSourceTree(root, { publishingCopy: true }), /UNKNOWN_OR_LINKED_SOURCE_FILE/);
});
test('production HTTP model uses independent status/header/MIME oracles and exposes no source', async t => {
  const root = await fixture(t); await buildProduction(root);
  const server = await startProduction({ root, port: 0 }); t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1'); const port = server.address().port;
  const get = (path, method = 'GET') => new Promise((resolve, reject) => { const req = request({ hostname: '127.0.0.1', port, path, method }, res => { const parts = []; res.on('data', chunk => parts.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(parts) })); }); req.on('error', reject); req.end(); });
  for (const [path, mime] of [['/index.html', 'text/html; charset=utf-8'], ['/en/index.html', 'text/html; charset=utf-8'], ['/js/app.mjs', 'text/javascript; charset=utf-8'], ['/styles/app.css', 'text/css; charset=utf-8'], ['/robots.txt', 'text/plain; charset=utf-8'], ['/sitemap.xml', 'application/xml; charset=utf-8']]) {
    const res = await get(path); assert.equal(res.status, 200); assert.equal(res.headers['content-type'], mime); assert.equal(res.headers['content-security-policy'], EXPECTED_CSP); assert.equal(res.headers['x-content-type-options'], 'nosniff'); assert.equal(res.headers['referrer-policy'], 'no-referrer'); assert.equal(res.headers['x-frame-options'], 'DENY'); assert.equal(res.headers['cache-control'], 'no-store');
    if (path.endsWith('index.html')) { assert.equal(res.headers['x-robots-tag'], undefined); assert(res.body.toString().includes('content="index,follow"')); }
    const head = await get(path, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(Number(head.headers['content-length']), res.body.length);
  }
  for (const path of ['/', '/en/', '/missing', '/index', '/_headers', '/package.json', '/wrangler.jsonc', '/scripts/production.mjs', '/docs/RELEASE.md', '/../package.json', '/%2e%2e/package.json', '/js/../index.html']) {
    const res = await get(path); assert.equal(res.status, 404); assert.equal(res.headers['x-robots-tag'], 'noindex, nofollow'); assert.equal(res.headers['content-type'], 'text/html; charset=utf-8'); assert(res.body.toString().includes('Page not found')); assert(!res.body.toString().includes('id="reading-form"'));
  }
  const missingHead = await get('/missing', 'HEAD'); assert.equal(missingHead.status, 404); assert.equal(missingHead.body.length, 0);
  const post = await get('/index.html', 'POST'); assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD'); assert.equal(post.headers['x-robots-tag'], 'noindex, nofollow');
});
