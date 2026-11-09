import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import path from 'node:path';
import { ROOT, ASSETS, readAssets } from '../scripts/files.mjs';
import { makeServer, listenPreferred, routePath, CSP } from '../scripts/server.mjs';
import { renderPage } from '../scripts/pages.mjs';

function get(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path: url, method }, response => {
      const chunks = []; response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, bytes: Buffer.concat(chunks) }));
    });
    req.on('error', reject); req.end();
  });
}
const close = server => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

test('Preview server binds loopback; GET/HEAD exact assets; 404/405; MIME and headers', async () => {
  const assets = await readAssets(path.join(ROOT, 'public'));
  const server = await makeServer(path.join(ROOT, 'public'));
  const { address } = await listenPreferred(server, 0);
  try {
    assert.equal(address.address, '127.0.0.1');
    for (const file of ASSETS) {
      const response = await get(address.port, '/' + file);
      assert.equal(response.status, 200); assert.deepEqual(response.bytes, assets.get(file));
      assert.equal(response.headers['content-security-policy'], CSP); assert.equal(response.headers['cache-control'], 'no-store');
      assert.equal(response.headers['x-content-type-options'], 'nosniff'); assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow');
      const expected = file.endsWith('.html') ? 'text/html' : file.endsWith('.mjs') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/plain';
      assert.ok(response.headers['content-type'].startsWith(expected));
      const head = await get(address.port, '/' + file, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.bytes.length, 0); assert.equal(Number(head.headers['content-length']), assets.get(file).length);
    }
    for (const url of ['/missing', '/package.json', '/.runs/', '/js/missing.mjs', '/../package.json', '/%2e%2e/package.json', '/%5cpackage.json']) assert.equal((await get(address.port, url)).status, 404);
    assert.equal((await get(address.port, '/index.html', 'POST')).status, 405);
    assert.equal((await get(address.port, '/index.html', 'OPTIONS')).headers.allow, 'GET, HEAD');
    assert.deepEqual((await get(address.port, '/')).bytes, assets.get('index.html'));
    assert.deepEqual((await get(address.port, '/en/')).bytes, assets.get('en/index.html'));
  } finally { await close(server); }
});
test('Occupied preferred port falls back to an OS-assigned loopback port, preserving owner', async () => {
  const first = await makeServer(path.join(ROOT, 'public')); const second = await makeServer(path.join(ROOT, 'public'));
  const occupied = await listenPreferred(first, 0);
  try {
    const fallback = await listenPreferred(second, occupied.address.port);
    assert.equal(fallback.fallback, true); assert.equal(fallback.address.address, '127.0.0.1'); assert.notEqual(fallback.address.port, occupied.address.port);
    assert.equal((await get(occupied.address.port, '/index.html')).status, 200);
  } finally { if (second.listening) await close(second); await close(first); }
});
test('Traversal parser rejects encoded separators, malformed encodings and dot segments', () => {
  for (const invalid of ['/../a', '/a/./b', '/%2E%2E/a', '/a%2fb', '/a%5cb', '/a\\b', '/%00a', '/%ZZ', 'https://outside.example/', '//../a']) assert.equal(routePath(invalid), null);
});
test('Both HTMLs have no maxlength truncation, preview indexing policy and read-only fallback', () => {
  for (const lang of ['zh-Hant', 'en']) {
    const html = renderPage(lang); assert.equal(/maxlength/i.test(html), false);
    assert.match(html, /name="robots" content="noindex,nofollow"/); assert.match(html, /connect-src 'none'/);
    assert.equal([...html.matchAll(/id="[a-zA-Z]+-manual"[^>]*readonly/g)].length, 4);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(new Set(ids).size, ids.length);
    assert.equal([...html.matchAll(/<script /g)].length, 1); assert.equal([...html.matchAll(/<h1>/g)].length, 1);
    assert.equal(html.includes('rel="canonical"'), false);
  }
});
