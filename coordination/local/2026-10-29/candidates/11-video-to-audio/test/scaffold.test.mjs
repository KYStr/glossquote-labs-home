import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createStaticServer, PROJECT_ROOT, isWithin } from '../scripts/serve.mjs';

test('private ESM scaffold has executable commands and truthful preview', async () => {
  const pkg = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  for (const command of ['dev', 'test', 'check', 'build']) assert.ok(pkg.scripts[command]);
  const html = await readFile(path.join(PROJECT_ROOT, 'public/index.html'), 'utf8');
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /技術驗證未通過/);
  assert.match(html, /type="file"[^>]*disabled/);
});
test('path containment respects segment boundaries', () => {
  const root = path.resolve('public');
  assert.equal(isWithin(root, path.join(root, 'js/app.mjs')), true);
  assert.equal(isWithin(root, `${root}-other/index.html`), false);
  assert.equal(isWithin(root, path.resolve(root, '../package.json')), false);
});
test('loopback preview refuses traversal, uploads and non-public files', async (t) => {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  const request = (route, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port: server.address().port, path: route, method }, (res) => {
      const chunks = [];
      res.on('data', (data) => chunks.push(data));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end();
  });
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.headers['content-type'], /text\/html/);
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.match(home.headers['x-robots-tag'], /noindex/);
  assert.match(home.headers['content-security-policy'], /frame-ancestors 'none'/);
  assert.equal((await request('/', 'HEAD')).body, '');
  assert.equal((await request('/', 'POST')).status, 405);
  for (const route of ['/%2e%2e/package.json', '/../docs/PRIVACY-SECURITY.md', '/.env']) assert.equal((await request(route)).status, 403);
  for (const route of ['/%', '/%00', '/..%5cpackage.json', '/%252e%252e/package.json']) assert.equal((await request(route)).status, 400);
  for (const route of ['/package.json', '/docs/PRIVACY-SECURITY.md', '/test/scaffold.test.mjs', '/styles/', '/missing.html']) assert.equal((await request(route)).status, 404);
});
