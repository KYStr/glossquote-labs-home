import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';
import { createPreviewServer } from '../scripts/serve.mjs';
import { ROOT } from '../scripts/check.mjs';

function send(target, { method = 'GET', host = '127.0.0.1:4220', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port: 4220, path: target, method, headers: { Host: host, ...headers }, timeout: 3000, agent: false }, response => {
      const pieces = []; response.on('data', chunk => pieces.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(pieces) }));
      response.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('HTTP_TEST_TIMEOUT'))); req.on('error', reject); req.end();
  });
}

test('Real loopback HTTP: exact GET/HEAD bytes, methods, Host, raw paths, MIME and privacy headers', async () => {
  const server = await createPreviewServer();
  try {
    server.listen(4220, '127.0.0.1');
    // EADDRINUSE is a failing gate. This test never kills or reuses the occupant.
    await once(server, 'listening');
    assert.equal(server.address().address, '127.0.0.1'); assert.equal(server.address().port, 4220);
    for (const [route, file, mime] of [['/', 'index.html', 'text/html; charset=utf-8'], ['/en/', 'en/index.html', 'text/html; charset=utf-8'], ['/en/index.html', 'en/index.html', 'text/html; charset=utf-8'], ['/js/core/zone.mjs', 'js/core/zone.mjs', 'text/javascript; charset=utf-8'], ['/styles/app.css', 'styles/app.css', 'text/css; charset=utf-8']]) {
      const actual = await send(route); const expected = await readFile(path.join(ROOT, 'public', file));
      assert.equal(actual.status, 200); assert.deepEqual(actual.body, expected); assert.equal(actual.headers['content-type'], mime);
      assert.equal(Number(actual.headers['content-length']), expected.length);
      assert.equal(actual.headers['cache-control'], 'no-store'); assert.equal(actual.headers['x-robots-tag'], 'noindex, nofollow'); assert.equal(actual.headers['x-content-type-options'], 'nosniff'); assert.equal(actual.headers['referrer-policy'], 'no-referrer');
      assert.ok(actual.headers['content-security-policy'].includes("connect-src 'none'")); assert.ok(actual.headers['content-security-policy'].includes("form-action 'none'"));
      const head = await send(route, { method: 'HEAD' }); assert.equal(head.status, 200); assert.equal(head.body.length, 0); assert.equal(head.headers['content-length'], actual.headers['content-length']);
    }
    for (const route of ['/missing', '/README.md', '/package.json', '/scripts/check.mjs', '/test/ics.test.mjs', '/evidence/m1/environment-before.json', '/index.html?private=fake', '/../index.html', '/%2e%2e/index.html', '/js/../index.html', '//index.html', '/INDEX.HTML', '/en', '/index.html%00', '/js\\app.mjs', 'http://127.0.0.1:4220/']) {
      const result = await send(route); assert.equal(result.status, 404, route); assert.equal(result.body.toString(), 'Not found\n');
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']) {
      const result = await send('/', { method }); assert.equal(result.status, 405); assert.equal(result.headers.allow, 'GET, HEAD'); assert.equal(result.body.toString(), 'Method not allowed\n');
    }
    for (const host of ['localhost:4220', '127.0.0.1', 'invalid.example', '127.0.0.1:4221', '127.0.0.1:4220.invalid.example']) {
      const result = await send('/', { host }); assert.equal(result.status, 403); assert.equal(result.body.toString(), 'Forbidden\n');
    }
    const missingHead = await send('/missing', { method: 'HEAD' }); assert.equal(missingHead.status, 404); assert.equal(missingHead.body.length, 0);
  } finally {
    // Close only this in-process task-owned server; preserve every existing process.
    await new Promise(resolve => server.close(resolve));
  }
});
