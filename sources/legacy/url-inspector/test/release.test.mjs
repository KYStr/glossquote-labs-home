import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile, cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { projectRoot, createStaticServer, listen } from '../scripts/serve.mjs';
import { check, ORIGIN, sha256 } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';
import { htmlTags, validateHtml } from '../scripts/validation.mjs';

test('U26 isolated reproducible preview/production, correct metadata/HTTP and invalid origins rejected', async t => {
  const parent = process.env.GQ_TEST_ARTIFACTS ?? os.tmpdir(); await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'url-release-'));
  for (const dir of ['public', 'scripts', 'test']) await cp(path.join(projectRoot, dir), path.join(root, dir), { recursive: true });
  await cp(path.join(projectRoot, 'wrangler.jsonc'), path.join(root, 'wrangler.jsonc'));
  const run = (...args) => spawnSync(process.execPath, [path.join(root, 'scripts', 'build.mjs'), ...args], { cwd: root, encoding: 'utf8' });
  const dist = path.join(root, 'dist');
  assert.equal(run().status, 0); await check(dist, { built: true });
  assert.doesNotMatch(await readFile(path.join(dist, 'index.html'), 'utf8'), /rel="canonical"|structured-data/);
  const previewHash = sha256(await readFile(path.join(dist, 'asset-manifest.json')));
  assert.equal(run('--production', '--origin=' + ORIGIN).status, 0); await check(dist, { built: true, production: true });
  const productionManifest = await readFile(path.join(dist, 'asset-manifest.json'));
  assert.notEqual(sha256(productionManifest), previewHash);
  assert.equal(run('--production', '--origin=' + ORIGIN).status, 0); assert.deepEqual(await readFile(path.join(dist, 'asset-manifest.json')), productionManifest);
  for (const origin of ['https://example.invalid', ORIGIN + '/', ORIGIN + '?q=1', ORIGIN + '#f', 'https://user@urls.glossquote.com', 'http://urls.glossquote.com']) assert.notEqual(run('--production', '--origin=' + origin).status, 0);
  const server = createStaticServer(dist); const { port } = await listen(server); t.after(() => new Promise(resolve => server.close(resolve)));
  for (const [url, mime] of [['/index.html', 'text/html'], ['/en/index.html', 'text/html'], ['/js/core/url.mjs', 'text/javascript'], ['/styles/app.css', 'text/css'], ['/robots.txt', 'text/plain'], ['/sitemap.xml', 'application/xml']]) { const res = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(res.status, 200); assert.ok(res.headers.get('content-type').startsWith(mime)); }
  for (const url of ['/missing', '/en/missing', '/nested/deep/missing', '/package.json', '/scripts/build.mjs', '/_headers']) { const res = await fetch(`http://127.0.0.1:${port}${url}`); assert.equal(res.status, 404); assert.match(await res.text(), /404/); }
  const en = htmlTags(await readFile(path.join(dist, 'en/index.html'), 'utf8'));
  assert.equal(en.find(tag => tag.attrs.property === 'og:title').attrs.content, 'URL Inspector & Query Editor — GlossQuote');
  const index = path.join(dist, 'index.html'); await writeFile(index, (await readFile(index, 'utf8')).replace('hreflang="x-default"', 'hreflang="wrong"'));
  await assert.rejects(check(dist, { built: true, production: true }));
  assert.throws(() => validateHtml('<meta name=robots content=noindex,nofollow><body background="https://example.invalid/x">', []), /active HTML attribute/);
  assert.throws(() => validateHtml('<meta name=robots content=noindex,nofollow><script type=module src="https&#58;//example.invalid/x"></script>', []), /Nonlocal asset/);
  await assert.rejects(build(undefined, undefined, { production: true, origin: 'https://example.invalid' }), /Unknown production origin/);
});
