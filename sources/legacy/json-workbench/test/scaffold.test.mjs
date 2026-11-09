import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdir, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from '../scripts/serve.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
test('T00 scripts and preview HTML are concrete', async () => {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.private, true);
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.engines.node, '>=24');
  for (const key of ['dev', 'test', 'check', 'build']) assert.ok(pkg.scripts[key]);
  const html = await readFile(path.join(root, 'public/index.html'), 'utf8');
  assert.match(html, /noindex,nofollow/u);
  assert.match(html, /<h1/u);
});
test('T00 static server isolates public and denies malformed paths and methods', async t => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  const request = (url, method = 'GET') => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path: url, method }, res => {
      const chunks = [];
      res.on('data', data => chunks.push(data));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    });
    req.on('error', reject); req.end();
  });
  const page = await request('/');
  assert.equal(page.status, 200);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.match(page.headers['x-robots-tag'], /noindex/u);
  assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/u);
  assert.equal((await request('/js/app.mjs')).headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal((await request('/', 'HEAD')).body, '');
  assert.equal((await request('/', 'POST')).status, 405);
  for (const url of ['/package.json', '/docs/ENGINEERING.md', '/missing.html']) assert.equal((await request(url)).status, 404);
  for (const url of ['/../package.json', '/%2e%2e/package.json', '/.git/config', '/styles/.hidden']) assert.equal((await request(url)).status, 403);
  for (const url of ['/%ZZ', '/%00', '/%5c..%5cpackage.json']) assert.equal((await request(url)).status, 400);
  const tmp = path.join(root, 'test/.tmp/scaffold');
  const link = path.join(root, 'public/test-escape');
  await mkdir(tmp, { recursive: true });
  await symlink(tmp, link, 'junction');
  t.after(async () => { await rm(link, { force: true }); await rm(tmp, { recursive: true, force: true }); });
  // Target exists outside public: resolving the junction must still fail closed.
  await (await import('node:fs/promises')).writeFile(path.join(tmp, 'escape.html'), 'fixture');
  assert.equal((await request('/test-escape/escape.html')).status, 403);
});
