import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp, mkdir, writeFile, link, rm, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, ASSETS, HEADERS, inside, validateSource, inspectTree } from '../scripts/validation.mjs';
import { createPreviewServer } from '../scripts/serve.mjs';

test('Toolchain reviewed source, bilingual noindex pages, imports and disabled no-JS actions', async () => {
  assert.deepEqual(await validateSource(), ASSETS);
  for (const relative of ['../secret', '/../../secret', 'x\\y', '', 'x//y']) assert.throws(() => inside(ROOT, relative));
});

test('Toolchain unknown files, directories and hardlinks fail closed', async t => {
  const fixture = await mkdtemp(path.join(ROOT, 'test', '.validation-'));
  t.after(async () => {
    assert.ok(path.resolve(fixture).startsWith(path.resolve(ROOT, 'test') + path.sep));
    await rm(fixture, { recursive: true });
  });
  await writeFile(path.join(fixture, 'unknown.txt'), 'fake');
  await assert.rejects(inspectTree(fixture), /UNKNOWN_ASSET/);
  await rm(path.join(fixture, 'unknown.txt'));
  await mkdir(path.join(fixture, 'unknown'));
  await assert.rejects(inspectTree(fixture), /UNKNOWN_DIRECTORY/);
  await rmdir(path.join(fixture, 'unknown'));
  await writeFile(path.join(fixture, 'index.html'), 'fake');
  await link(path.join(fixture, 'index.html'), path.join(fixture, '404.html'));
  await assert.rejects(inspectTree(fixture), /LINK_OR_SPECIAL_FILE_REJECTED/);
});

test('Toolchain actual loopback HTTP: GET/HEAD MIME, security headers, 404/405, host and raw traversal rejection', async t => {
  const server = await createPreviewServer({ source: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  assert.equal(server.address().address, '127.0.0.1');
  const port = server.address().port;
  const send = (route, { method = 'GET', host = `127.0.0.1:${port}` } = {}) => new Promise((resolve, reject) => {
    const request = httpRequest({ host: '127.0.0.1', port, method, path: route, headers: { host } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8') }));
    });
    request.on('error', reject); request.end();
  });
  for (const route of ['/index.html', '/en/index.html', '/', '/en/']) {
    const response = await send(route); assert.equal(response.status, 200); assert.ok(response.body.includes('noindex,nofollow'));
    assert.equal(response.headers['content-type'], 'text/html; charset=utf-8');
    for (const [header, expected] of Object.entries(HEADERS)) assert.equal(response.headers[header.toLowerCase()], expected);
  }
  for (const [route, mime] of [['/styles.css', 'text/css; charset=utf-8'], ['/js/app.mjs', 'text/javascript; charset=utf-8'], ['/robots.txt', 'text/plain; charset=utf-8']]) {
    const response = await send(route); assert.equal(response.status, 200); assert.equal(response.headers['content-type'], mime);
  }
  const head = await send('/index.html', { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.body, ''); assert.ok(Number(head.headers['content-length']) > 0);
  const missing = await send('/not-found'); assert.equal(missing.status, 404); assert.ok(missing.body.includes('Page not found')); assert.ok(!missing.body.includes('budget-form'));
  assert.equal((await send('/index.html', { method: 'POST' })).status, 405);
  assert.equal((await send('/index.html', { host: 'untrusted.example' })).status, 421);
  for (const route of ['/../package.json', '/%2e%2e/package.json', '/%252e%252e/package.json', '/%5csecret', '/%00', '/%', '/index.html?data=fake']) assert.equal((await send(route)).status, 400);
});
