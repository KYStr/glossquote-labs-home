import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ASSET_FILES, makeProduction, productionResponse, robotsAllows } from '../scripts/model.mjs';
const source = new Map(); for (const name of ASSET_FILES) source.set(name, await readFile(new URL(`../public/${name}`, import.meta.url)));
const files = makeProduction(source);
for (const [filename, lang, title] of [['index.html','zh-Hant','輪值排班表｜依成員順序安排每日輪值 | GlossQuote'],['en/index.html','en','Duty Roster | Rotate Daily Duties by Member Order | GlossQuote']]) {
  test(`M2 SEO ${lang}: exact canonical, reciprocal language links, OG and no localhost`, () => {
    const html = files.get(filename).toString('utf8'); const url = `https://rota.glossquote.com/${filename}`;
    assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1); assert.ok(html.includes(`<link rel="canonical" href="${url}">`));
    assert.ok(html.includes(`<html lang="${lang}">`)); assert.ok(html.includes(`<title>${title}</title>`)); assert.match(html, /<meta name="robots" content="index,follow">/); assert.doesNotMatch(html, /noindex|127\.0\.0\.1|localhost/);
    assert.ok(html.includes('<link rel="alternate" hreflang="zh-Hant" href="https://rota.glossquote.com/index.html">'));
    assert.ok(html.includes('<link rel="alternate" hreflang="en" href="https://rota.glossquote.com/en/index.html">'));
    assert.ok(html.includes('<link rel="alternate" hreflang="x-default" href="https://rota.glossquote.com/index.html">'));
    assert.ok(html.includes(`<meta property="og:url" content="${url}">`)); assert.equal((html.match(/<h1>/g) ?? []).length, 1);
    assert.equal(html.split('</head>')[1], source.get(filename).toString('utf8').split('</head>')[1]);
  });
  test(`M2 JSON-LD ${lang}: WebApplication data and exact per-page CSP SHA256`, () => {
    const html = files.get(filename).toString('utf8'); const matches = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]; assert.equal(matches.length, 1);
    const json = matches[0][1]; const data = JSON.parse(json);
    assert.equal(data['@context'], 'https://schema.org'); assert.equal(data['@type'], 'WebApplication'); assert.equal(data.inLanguage, lang); assert.equal(data.url, `https://rota.glossquote.com/${filename}`);
    assert.equal(data.name, lang === 'en' ? 'Duty Roster' : '輪值排班表'); assert.equal(data.applicationCategory, 'UtilitiesApplication');
    const csp = productionResponse(files, `/${filename}`).headers['content-security-policy'];
    const expected = `sha256-${createHash('sha256').update(json, 'utf8').digest('base64')}`;
    assert.ok(csp.includes(`'${expected}'`)); assert.equal((csp.match(/sha256-/g) ?? []).length, 1); assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
  });
}
test('M2 robots applies longest matching allow/disallow to EVERY real asset', () => {
  const robots = files.get('robots.txt').toString('utf8');
  for (const name of ASSET_FILES) assert.equal(robotsAllows(robots, `/${name}`), true, name);
  for (const route of ['/','/404.html','/missing','/_headers']) assert.equal(robotsAllows(robots, route), false, route);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\nAllow: /js/private/ok.js\n', '/js/private/no.js'), false);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /\nAllow: /js/\nDisallow: /js/private/\nAllow: /js/private/ok.js\n', '/js/private/ok.js'), true);
  assert.equal(robotsAllows('User-agent: *\nDisallow: /same\nAllow: /same\n', '/same'), true);
});
test('M2 sitemap contains only the two exact canonical URLs', () => {
  const xml = files.get('sitemap.xml').toString('utf8');
  assert.deepEqual([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), ['https://rota.glossquote.com/index.html','https://rota.glossquote.com/en/index.html']);
  assert.match(xml, /xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9"/);
});
test('M2 preview stays noindex without production canonical/JSON-LD; 404 stays noindex', () => {
  for (const name of ['index.html','en/index.html']) { const html = source.get(name).toString('utf8'); assert.match(html, /noindex,nofollow/); assert.doesNotMatch(html, /rel="canonical"|hreflang=|application\/ld\+json/); }
  assert.match(files.get('404.html').toString('utf8'), /noindex,nofollow/);
});
