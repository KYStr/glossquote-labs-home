import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, rm, rmdir, mkdir, writeFile, readFile, symlink, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT, PUBLIC_FILES, assertPublicTree, inside } from '../scripts/check.mjs';
import { copyPublic } from '../scripts/build.mjs';
import { createStaticServer, HOST, PORT } from '../scripts/serve.mjs';

function get(path, method = 'GET', host = `${HOST}:${PORT}`) {
  return new Promise((resolve, reject) => {
    const req = request({ host: HOST, port: PORT, method, path, headers: { Host: host } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
    }); req.on('error', reject); req.end();
  });
}

test('S: loopback server exposes exact public routes, methods, MIME and headers only', async t => {
  assert.equal(HOST, '127.0.0.1'); assert.equal(PORT, 4221);
  const server = createStaticServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, HOST, resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  for (const route of ['/', '/index.html', '/en/', '/en/index.html']) {
    const res = await get(route); assert.equal(res.status, 200); assert.match(res.body, /noindex/);
    assert.equal(res.headers['content-type'], 'text/html; charset=utf-8');
    assert.match(res.headers['content-security-policy'], /connect-src 'none'/);
    const head = await get(route, 'HEAD'); assert.equal(head.status, 200); assert.equal(head.body, '');
  }
  assert.equal((await get('/js/app.mjs')).headers['content-type'], 'text/javascript; charset=utf-8');
  assert.equal((await get('/styles/app.css')).headers['content-type'], 'text/css; charset=utf-8');
  for (const path of ['/AGENTS.md', '/package.json', '/evidence/m1/environment-before.json', '/missing', '/en/missing', '/index.html?secret=x']) assert.equal((await get(path)).status, 404);
  for (const path of ['/../AGENTS.md', '/%2e%2e/AGENTS.md', '/js/%2E%2E/index.html', '/.git/config', '/%5cAGENTS.md', '/%252e%252e/AGENTS.md']) assert.equal((await get(path)).status, 403);
  assert.equal((await get('/%')).status, 400);
  assert.equal((await get('/', 'POST')).status, 405);
  assert.equal((await get('/', 'GET', 'evil.example')).status, 403);
});

test('S: build copies only reviewed public bytes and rejects unknown, hidden, link and unsafe paths', async () => {
  const parent = join(ROOT, 'evidence', 'm1'); await mkdir(parent, { recursive: true });
  const temp = await mkdtemp(join(parent, 'tmp-scaffold-'));
  try {
    const source = join(temp, 'public'); const output = join(temp, 'dist');
    for (const file of PUBLIC_FILES) { await mkdir(join(source, file, '..'), { recursive: true }); await copyFile(join(ROOT, 'public', file), join(source, file)); }
    await copyPublic(source, output);
    assert.deepEqual(await assertPublicTree(output), [...PUBLIC_FILES].sort());
    for (const file of PUBLIC_FILES) assert.deepEqual(await readFile(join(output, file)), await readFile(join(source, file)));
    await writeFile(join(output, 'unknown.txt'), 'preserve me');
    await assert.rejects(copyPublic(source, output), /STALE_DIST/);
    assert.equal(await readFile(join(output, 'unknown.txt'), 'utf8'), 'preserve me');
    await writeFile(join(source, '.hidden'), 'no'); await assert.rejects(assertPublicTree(source), /HIDDEN_PATH/);
    await rm(join(source, '.hidden'));
    await writeFile(join(source, 'unexpected.txt'), 'no'); await assert.rejects(assertPublicTree(source), /PUBLIC_ALLOWLIST/);
    await rm(join(source, 'unexpected.txt'));
    await mkdir(join(source, 'unreviewed-empty'));
    await assert.rejects(assertPublicTree(source), /EMPTY_DIRECTORY/);
    await rmdir(join(source, 'unreviewed-empty'));
    await symlink(source, join(temp, 'linked'), 'junction');
    await assert.rejects(assertPublicTree(join(temp, 'linked')), /UNSAFE_DIRECTORY/);
    await assert.rejects(copyPublic(source, ROOT), /UNSAFE_BUILD_PATH/);
    await assert.rejects(copyPublic(source, join(ROOT, 'docs')), /UNSAFE_BUILD_PATH/);
  } finally { assert.ok(inside(parent, temp)); await rm(temp, { recursive: true, force: true }); }
});
