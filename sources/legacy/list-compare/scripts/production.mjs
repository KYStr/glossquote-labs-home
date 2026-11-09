import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, ASSETS, PUBLIC_ASSETS, readAssets, walkFiles, requireNode24 } from './files.mjs';
import { checkSource } from './check.mjs';
import { ORIGIN, PAGES, WORKER_CONFIG, PRODUCTION_CSP, SECURITY_HEADERS, headersText, robotsText, sitemapText, productionPage, notFoundPage } from './release-contract.mjs';
import { makeServer, listenPreferred } from './server.mjs';
import { checkFrozenBehavior } from './frozen-behavior.mjs';

export async function expectedProduction() {
  await checkSource(); await checkFrozenBehavior();
  assert.deepEqual(JSON.parse(await readFile(path.join(ROOT, 'wrangler.jsonc'), 'utf8')), WORKER_CONFIG);
  for (const [file, expected] of [['404.html', notFoundPage()], ['_headers', headersText()], ['sitemap.xml', sitemapText()]]) assert.equal(await readFile(path.join(ROOT, 'public', file), 'utf8'), expected);
  const files = await readAssets(path.join(ROOT, 'public'));
  for (const [language, url] of Object.entries(PAGES)) files.set(url.slice(1), Buffer.from(productionPage(files.get(url.slice(1)).toString('utf8'), language)));
  files.set('robots.txt', Buffer.from(robotsText()));
  files.set('sitemap.xml', Buffer.from(sitemapText())); files.set('_headers', Buffer.from(headersText())); files.set('404.html', Buffer.from(notFoundPage()));
  return files;
}
export async function buildProduction() {
  requireNode24(); const files = await expectedProduction(); const target = path.join(ROOT, 'dist-production');
  try { const actual = await walkFiles(target); if (actual.some(file => !PUBLIC_ASSETS.includes(file))) throw new Error('Unknown production output'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(target, { recursive: true });
  for (const [file, bytes] of files) {
    const destination = path.join(target, file); await mkdir(path.dirname(destination), { recursive: true }); await walkFiles(target);
    try { const info = await lstat(destination); if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) throw new Error('Unsafe production file'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(destination, bytes);
  }
  return { status: 'PASS', mode: 'production-build', files: files.size, origin: ORIGIN };
}
export async function checkProduction() {
  const expected = await expectedProduction(); const actual = await readAssets(path.join(ROOT, 'dist-production'), { production: true, source: false });
  for (const [file, bytes] of expected) assert.deepEqual(actual.get(file), bytes, `Production bytes ${file}`);
  for (const [language, url] of Object.entries(PAGES)) {
    const html = actual.get(url.slice(1)).toString('utf8');
    assert.match(html, new RegExp(`<html lang="${language}">`));
    assert.equal([...html.matchAll(/rel="canonical"/g)].length, 1); assert.ok(html.includes(`rel="canonical" href="${ORIGIN}${url}"`));
    for (const [lang, href] of [['zh-Hant', '/index.html'], ['en', '/en/index.html'], ['x-default', '/index.html']]) assert.ok(html.includes(`hreflang="${lang}" href="https://lists.glossquote.com${href}"`));
    assert.ok(html.includes(`property="og:url" content="${ORIGIN}${url}"`)); assert.ok(html.includes('content="index,follow"'));
    assert.equal(html.includes('noindex'), false); assert.equal(html.includes('http://127.'), false);
    const data = JSON.parse(/<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html)[1]);
    assert.deepEqual(Object.keys(data).sort(), ['@context','@type','name','url','inLanguage','applicationCategory','operatingSystem'].sort());
    assert.equal(data['@type'], 'WebApplication'); assert.equal(data.url, 'https://lists.glossquote.com' + url); assert.equal(data.inLanguage, language); assert.equal(data.operatingSystem, 'Web'); assert.equal(data.applicationCategory, 'UtilitiesApplication');
    const preview = await readFile(path.join(ROOT, 'public', url.slice(1)), 'utf8');
    assert.equal(html.split('</head>')[1], preview.split('</head>')[1], 'M1 task body stays exact');
    assert.ok(html.includes(`href="https://glossquote.com${language === 'en' ? '/en' : ''}/index.html"`));
  }
  assert.deepEqual([...actual.get('sitemap.xml').toString().matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]), ['https://lists.glossquote.com/index.html','https://lists.glossquote.com/en/index.html']);
  assert.equal(actual.get('robots.txt').toString(), 'User-agent: *\nAllow: /\nSitemap: https://lists.glossquote.com/sitemap.xml\n');
  assert.ok(PRODUCTION_CSP.includes("connect-src 'none'")); assert.equal(PRODUCTION_CSP.includes('unsafe-inline'), false);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.ok(actual.get('_headers').toString().includes(`  ${name}: ${value}\n`));
  for (const file of ASSETS.filter(f => f.startsWith('js/') || f.startsWith('styles/'))) assert.deepEqual(actual.get(file), await readFile(path.join(ROOT,'public',file)));
  return { status: 'PASS', files: actual.size, origin: ORIGIN, seoPages: 2, frozenBehavior: 'PASS', liveDeployment: 'NOT_RUN' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  if (command === 'build') console.log(JSON.stringify(await buildProduction()));
  else if (command === 'check') { console.log(JSON.stringify(await checkProduction())); const { releaseSelfTest } = await import('./release-selftest.mjs'); console.log(JSON.stringify(await releaseSelfTest())); }
  else if (command === 'serve') { await checkProduction(); const server = await makeServer(path.join(ROOT,'dist-production'), { production: true }); const { address } = await listenPreferred(server, 0); console.log(JSON.stringify({url:`http://127.0.0.1:${address.port}/index.html`,pid:process.pid,productionCandidate:true})); }
  else throw new Error('Expected build/check/serve');
}
