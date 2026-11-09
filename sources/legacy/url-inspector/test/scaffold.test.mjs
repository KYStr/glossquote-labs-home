import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, mkdir, writeFile, symlink, cp, rm, readFile } from 'node:fs/promises';
import { createStaticServer, listen, publicRoot, projectRoot } from '../scripts/serve.mjs';
import { check } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';

function request(port, url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: url, method }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    }); req.on('error', reject); req.end();
  });
}
test('T00 public-only HTTP, MIME, HEAD, 404, 405 and traversal denial', async t => {
  const server = createStaticServer(); const { port } = await listen(server);
  t.after(() => new Promise(resolve => server.close(resolve)));
  for (const [url, type] of [['/', 'text/html'], ['/en/index.html', 'text/html'], ['/js/app.mjs', 'text/javascript'], ['/styles/app.css', 'text/css']]) {
    const res = await request(port, url); assert.equal(res.status, 200); assert.ok(res.headers['content-type'].startsWith(type));
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.match(res.headers['content-security-policy'], /connect-src 'none'/);
  }
  const head = await request(port, '/index.html', 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, ''); assert.ok(Number(head.headers['content-length']) > 0);
  for (const url of ['/missing', '/PRODUCT.md', '/../PRODUCT.md', '/%2e%2e/PRODUCT.md', '/%252e%252e/PRODUCT.md', '/.git/config', '/js/../app.mjs', '/js%5capp.mjs', '/%00', '/styles//app.css', '/%zz', '/C:/Windows/win.ini']) assert.equal((await request(port, url)).status, 404, url);
  const post = await request(port, '/', 'POST'); assert.equal(post.status, 405); assert.equal(post.headers.allow, 'GET, HEAD');
});
test('T00 symlink root/file refused and build copy isolated by exact allowlist', async t => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'gq-url-scaffold-')); t.after(() => rm(temp, { recursive: true, force: true }));
  const clone = path.join(temp, 'public'); await cp(publicRoot, clone, { recursive: true });
  await check(clone);
  await writeFile(path.join(clone, 'private.txt'), 'TEST_ONLY'); await assert.rejects(check(clone), /allowlist/);
  await assert.rejects(build(publicRoot, path.join(temp, 'dist')), /outside owned dist/);
  await mkdir(path.join(temp, 'outside')); await writeFile(path.join(temp, 'outside', 'secret.txt'), 'TEST_ONLY');
  await symlink(path.join(temp, 'outside'), path.join(clone, 'linked'), 'junction');
  const server = createStaticServer(clone); const { port } = await listen(server); t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal((await request(port, '/linked/secret.txt')).status, 404);
  const before = await readFile(path.join(projectRoot, 'PRODUCT.md'), 'utf8');
  await build(); assert.equal(await readFile(path.join(projectRoot, 'PRODUCT.md'), 'utf8'), before);
});
