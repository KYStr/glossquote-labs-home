import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ASSETS } from '../scripts/manifest.mjs';
import { M1_PUBLIC_SHA256, ORIGIN, PAGES, PRODUCTION_ASSETS, ALIASES, WRANGLER, pinnedPublic, compileProduction, validateProductionMap, validateWrangler, bodyOf, effectiveHeaders, robotsAllows } from '../scripts/production-lib.mjs';
import { productionHandler } from '../scripts/production-server.mjs';
import { SOURCE_FILES, validateMarkdownLinks } from '../scripts/release-check.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = await pinnedPublic(root); const compiled = compileProduction(source);
const copy = () => new Map([...compiled.output].map(([file, bytes]) => [file, Buffer.from(bytes)]));
const replace = (map, file, from, to) => map.set(file, Buffer.from(map.get(file).toString().replace(from, to)));

test('R01 exact M1 public fingerprint and module bytes remain fixed', () => {
  assert.equal(M1_PUBLIC_SHA256, '0326098381c7f70510374488259b1dd50a3a9a0e95a1b31390e02ab0bcc06404');
  assert.equal(source.size, 13);
  for (const file of ASSETS.filter(file => file.endsWith('.mjs') || file === 'styles.css')) assert.ok(compiled.output.get(file).equals(source.get(file)));
  assert.equal(createHash('sha256').update(source.get('core.mjs')).digest('hex'), 'ab2489be5e87ec7ca4da601b3d54ccf19299eb2d8ad1ed2b5ca0d92d22cac9cc');
});
test('R02 bilingual canonical/hreflang/x-default and indexable heads are exact', () => {
  validateProductionMap(compiled.output, source);
  for (const file of PAGES) {
    const html = compiled.output.get(file).toString();
    assert.ok(html.includes(`rel="canonical" href="https://subtitles.glossquote.com/${file}"`));
    assert.ok(html.includes('hreflang="x-default" href="https://subtitles.glossquote.com/index.html"'));
    assert.ok(html.includes('content="index, follow"')); assert.ok(!html.includes('content="noindex'));
  }
});
test('R03 body diff is only the two explicitly approved footer strings', () => {
  const footers = [['index.html', 'Gloss Tools by GlossQuote · 本機預覽版', 'Gloss Tools by GlossQuote · 字幕時間平移'], ['en/index.html', 'Gloss Tools by GlossQuote · Local preview', 'Gloss Tools by GlossQuote · Subtitle Time Shift']];
  for (const [file, from, to] of footers) assert.equal(bodyOf(compiled.output.get(file).toString()), bodyOf(source.get(file).toString()).replace(from, to));
  const bad = copy(); replace(bad, 'index.html', 'SRT 字幕文字', 'Changed UI'); assert.throws(() => validateProductionMap(bad, source));
});
test('R04 effective headers detach page noindex and retain every unknown 404 noindex', () => {
  const text = compiled.output.get('_headers').toString();
  for (const file of PAGES) {
    const headers = effectiveHeaders(text, '/' + file); assert.equal(headers['x-robots-tag'], undefined);
    assert.ok(headers['content-security-policy'].includes("worker-src 'self'")); assert.ok(!/unsafe-inline|unsafe-eval|,/.test(headers['content-security-policy']));
    assert.equal((headers['content-security-policy'].match(/'sha256-[^']+'/g) ?? []).length, 2);
  }
  for (const path of ['/missing', '/en/missing', '/404.html']) assert.equal(effectiveHeaders(text, path)['x-robots-tag'], 'noindex, nofollow');
  const duplicate = copy(); replace(duplicate, '_headers', '  ! X-Robots-Tag', '  X-Robots-Tag: index, follow'); assert.throws(() => validateProductionMap(duplicate, source));
});
test('R05 visible bilingual FAQ JSONLD and exact content hashes reject injected changes', () => {
  for (const file of PAGES) {
    const html = compiled.output.get(file).toString(); const data = JSON.parse(/type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
    assert.equal(data['@graph'][0]['@type'], 'WebApplication'); assert.equal(data['@graph'][1]['@type'], 'FAQPage'); assert.equal(data['@graph'][1].mainEntity.length, 5);
    assert.equal(data['@graph'][1].mainEntity[0].name, file.startsWith('en/') ? 'How do I shift SRT subtitle timing?' : '如何平移 SRT 字幕時間？');
    const wrongHash = copy(); replace(wrongHash, file, 'type="application/ld+json">\n', 'type="application/ld+json">\n '); assert.throws(() => validateProductionMap(wrongHash, source));
    const wrongText = copy(); replace(wrongText, file, '"@type":"FAQPage"', '"@type":"Thing"'); assert.throws(() => validateProductionMap(wrongText, source));
  }
  const inline = copy(); replace(inline, 'index.html', '</head>', '<script>1</script></head>'); assert.throws(() => validateProductionMap(inline, source));
  const extraHead = copy(); replace(extraHead, 'en/index.html', '</head>', '<meta name="unapproved" content="extra"></head>'); assert.throws(() => validateProductionMap(extraHead, source));
});
test('R06 root and language aliases are exact same-origin 302 redirects', () => {
  assert.deepEqual(ALIASES, { '/': '/index.html', '/en': '/en/index.html', '/en/': '/en/index.html' });
  assert.equal(compiled.output.get('_redirects').toString(), '/ /index.html 302\n/en /en/index.html 302\n/en/ /en/index.html 302\n');
  const bad = copy(); replace(bad, '_redirects', '/en/index.html 302', 'https://outside.invalid/ 302'); assert.throws(() => validateProductionMap(bad, source));
});
test('R07 robots longest-match and Allow tie-breaking keep all necessary assets accessible', () => {
  const robots = compiled.output.get('robots.txt').toString();
  for (const path of ['/', '/en', '/en/', '/index.html', '/en/index.html', '/worker.mjs', '/core.mjs', '/styles.css', '/sitemap.xml']) assert.equal(robotsAllows(robots, path), true);
  for (const path of ['/private', '/404.html', '/worker.mjs/extra']) assert.equal(robotsAllows(robots, path), false);
  const rules = 'User-agent: *\nDisallow: /\nAllow: /app.mjs$\nDisallow: /app*\n';
  assert.equal(robotsAllows(rules, '/app.mjs'), true); assert.equal(robotsAllows(rules, '/app.evil'), false);
  assert.equal(robotsAllows('User-agent: *\nAllow: /same\nDisallow: /same\n', '/same'), true);
  const bad = copy(); replace(bad, 'robots.txt', 'Allow: /worker.mjs$\n', ''); assert.throws(() => validateProductionMap(bad, source));
});
test('R08 sitemap contains exactly two canonical language URLs', () => {
  const xml = compiled.output.get('sitemap.xml').toString();
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [ORIGIN + '/index.html', ORIGIN + '/en/index.html']);
  const bad = copy(); replace(bad, 'sitemap.xml', '</urlset>', '<url><loc>https://outside.invalid</loc></url></urlset>'); assert.throws(() => validateProductionMap(bad, source));
});
test('R09 exact static-only Wrangler rejects binding/route/build/observability pollution', async () => {
  validateWrangler(JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8')));
  for (const mutate of [config => { config.main = 'worker.mjs'; }, config => { config.build = { command: 'anything' }; }, config => { config.vars = {}; }, config => { config.send_metrics = true; }, config => { config.assets.binding = 'ASSETS'; }, config => { config.assets.run_worker_first = true; }, config => { config.observability.traces.enabled = true; }, config => { config.routes.push({ pattern: 'outside.invalid', custom_domain: true }); }]) {
    const config = structuredClone(WRANGLER); mutate(config); assert.throws(() => validateWrangler(config));
  }
});
test('R10 closed production assets reject missing, unknown and runtime contamination', () => {
  assert.equal(PRODUCTION_ASSETS.length, 15);
  for (const mutate of [map => map.delete('worker.mjs'), map => map.set('private-fake.txt', Buffer.from('fake')), map => map.set('release-manifest.json', Buffer.from('{}'))]) { const bad = copy(); mutate(bad); assert.throws(() => validateProductionMap(bad, source)); }
  const changed = copy(); changed.set('core.mjs', Buffer.from('changed')); assert.throws(() => validateProductionMap(changed, source));
});
test('R11 portable Markdown links reject missing/absolute targets', () => {
  validateMarkdownLinks('[config](../wrangler.jsonc)', 'docs/M2-RELEASE.md'); validateMarkdownLinks('[source](https://example.invalid/path)', 'README.md');
  for (const text of ['[missing](missing.md)', '[absolute](/private/file.md)', '[up](../../elsewhere.md)']) assert.throws(() => validateMarkdownLinks(text, 'README.md'));
});
function model(path, method = 'GET', host = '127.0.0.1:5216') {
  let result; productionHandler(compiled.output)({ url: path, method, headers: { host } }, { writeHead(status, headers) { result = { status, headers }; }, end(bytes) { result.bytes = bytes; } }); return result;
}
test('R12 production HTTP model preserves exact routing/MIME/status/noindex and HEAD', () => {
  assert.equal(model('/').status, 302); assert.equal(model('/en/').headers.Location, '/en/index.html');
  assert.equal(model('/index.html').headers['x-robots-tag'], undefined); assert.equal(model('/worker.mjs').headers['Content-Type'], 'text/javascript; charset=utf-8');
  for (const [path, status, method, host] of [['/missing', 404], ['/_headers', 404], ['/_redirects', 404], ['/package.json', 404], ['/index.html?draft=FAKE', 404], ['/../AGENTS.md', 404], ['/index.html', 405, 'POST'], ['/index.html', 421, 'GET', 'outside.invalid']]) { const result = model(path, method, host); assert.equal(result.status, status); assert.equal(result.headers['x-robots-tag'], 'noindex, nofollow'); }
  assert.equal(model('/index.html', 'HEAD').bytes, undefined);
});
test('R13 publishing source allowlist is exact and excludes artifacts/credentials/dependencies', () => {
  assert.equal(SOURCE_FILES.length, 58); assert.equal(new Set(SOURCE_FILES).size, 58);
  for (const forbidden of ['.env', '.dev.vars', 'node_modules', '.git/config', '.runs/private', 'dist-production/index.html']) assert.equal(SOURCE_FILES.includes(forbidden), false);
});
test('R14 original preview pages remain noindex with original footer and no production canonical', () => {
  for (const file of PAGES) { const html = source.get(file).toString(); assert.ok(html.includes('content="noindex, nofollow"')); assert.ok(!html.includes('rel="canonical"')); assert.ok(html.includes(file.startsWith('en/') ? 'Gloss Tools by GlossQuote · Local preview' : 'Gloss Tools by GlossQuote · 本機預覽版')); }
});
