import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, writeFile, mkdir, link, rm, rmdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createPreviewServer } from '../scripts/serve.mjs';
import { assets, inspectTree, inspectSource, root, securityHeaders } from '../scripts/files.mjs';

test('Offline source gate: 12 fixed assets, preview metadata and exact header policy', async () => {
  await inspectSource(); assert.equal(assets.length, 12);
  for (const [path, lang, home] of [['index.html', 'zh-Hant', 'https://glossquote.com/index.html'], ['en/index.html', 'en', 'https://glossquote.com/en/index.html']]) {
    const source = await readFile(join(root, 'public', path), 'utf8');
    assert.ok(source.includes(`<html lang="${lang}">`)); assert.ok(source.includes(home));
    assert.equal([...source.matchAll(/<details>/g)].length, 4);
    assert.ok(source.includes('name="robots" content="noindex,nofollow"')); assert.equal(/canonical|hreflang|ld\+json|sitemap/.test(source), false);
  }
});
test('Offline file gate refuses unknown files, unknown empty directories, hardlinks and traversal', async () => {
  const directory = await mkdtemp(join(root, 'test', '.safety-'));
  const path = relative(root, directory);
  try {
    await writeFile(join(directory, 'ok.txt'), 'fake'); await inspectTree(path, ['ok.txt']);
    await writeFile(join(directory, 'unknown.txt'), 'fake'); await assert.rejects(inspectTree(path, ['ok.txt']), /Unexpected/);
    await rm(join(directory, 'unknown.txt')); await mkdir(join(directory, 'unknown')); await assert.rejects(inspectTree(path, ['ok.txt']), /Unexpected/);
    await rmdir(join(directory, 'unknown')); await link(join(directory, 'ok.txt'), join(directory, 'linked.txt')); await assert.rejects(inspectTree(path, ['ok.txt', 'linked.txt']), /Unsafe/);
    await assert.rejects(inspectTree('../', []), /Unsafe/); await assert.rejects(inspectTree(path, ['../ok.txt']), /Unsafe/);
  } finally {
    assert.ok(relative(join(root, 'test'), directory).startsWith('.safety-'));
    await rm(directory, { recursive: true });
  }
});
test('Loopback HTTP: HTML/ESM/CSS/TXT MIME, HEAD, real 404, closed paths and 405', async () => {
  const server = await createPreviewServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  assert.equal(server.address().address, '127.0.0.1');
  const get = (path, method = 'GET') => new Promise((resolve, reject) => {
    const connection = request({ host: '127.0.0.1', port: server.address().port, path, method }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    }); connection.on('error', reject); connection.end();
  });
  try {
    for (const [path, type] of [['/index.html', 'text/html; charset=utf-8'], ['/en/index.html', 'text/html; charset=utf-8'], ['/styles/app.css', 'text/css; charset=utf-8'], ['/js/app.js', 'text/javascript; charset=utf-8'], ['/robots.txt', 'text/plain; charset=utf-8']]) {
      const response = await get(path); assert.equal(response.status, 200); assert.equal(response.headers['content-type'], type);
      for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers[name.toLowerCase()], value);
      assert.equal(response.headers['cache-control'], 'no-store');
    }
    assert.equal((await get('/')).status, 200);
    assert.equal((await get('/index.html', 'HEAD')).body, '');
    for (const path of ['/not-a-page-25', '/404.html', '/_headers', '/package.json', '/scripts/serve.mjs', '/../PRODUCT.md', '/%2e%2e/PRODUCT.md', '/en/', '/index.html?draft=fake', '/index.html%00']) {
      const response = await get(path); assert.equal(response.status, 404); assert.ok(response.body.includes('Page not found')); assert.ok(response.body.includes('href="/en/index.html"')); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
    }
    const post = await get('/index.html', 'POST'); assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
  } finally { await new Promise(resolve => server.close(resolve)); }
});
