import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestHandler, HOST, PORT } from '../scripts/serve.mjs';
import { checkPublic, PUBLIC_FILES } from '../scripts/check.mjs';

test('T00 closed public allowlist and Node24', async () => {
  assert.equal(process.versions.node.split('.')[0], '24');
  assert.equal((await checkPublic()).length, PUBLIC_FILES.length);
});

test('T00 request handler exact routes, MIME, host, method and traversal without listening', async () => {
  assert.equal(HOST, '127.0.0.1'); assert.equal(PORT, 4228);
  const handler = createRequestHandler();
  for (const [method, url, host, expected] of [
    ['GET', '/', '127.0.0.1:4228', 200], ['HEAD', '/en/index.html', '127.0.0.1:4228', 200],
    ['POST', '/', '127.0.0.1:4228', 405], ['GET', '/', 'evil.test', 403],
    ['GET', '/../package.json', '127.0.0.1:4228', 404], ['GET', '/%2e%2e/package.json', '127.0.0.1:4228', 404],
    ['GET', '/index.html?x=1', '127.0.0.1:4228', 404], ['GET', '/README.md', '127.0.0.1:4228', 404],
    ['GET', 'xindex.html', '127.0.0.1:4228', 404], ['GET', '//index.html', '127.0.0.1:4228', 404],
    ['GET', 'http://evil.test/index.html', '127.0.0.1:4228', 404], ['GET', '/en/', '127.0.0.1:4228', 404],
    ['GET', '/css/app.css', '127.0.0.1:4228', 200], ['GET', '/js/app.js', '127.0.0.1:4228', 200]
  ]) {
    let status, headers, body;
    await handler({ method, url, headers: { host } }, { writeHead(code, fields) { status = code; headers = fields; }, end(bytes) { body = bytes; } });
    assert.equal(status, expected, `${method} ${url}`);
    assert.equal(headers['Cache-Control'], 'no-store');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    if (method === 'HEAD') assert.equal(body, undefined);
    if (expected === 200 && url.endsWith('.css')) assert.match(headers['Content-Type'], /^text\/css/);
    if (expected === 200 && url.endsWith('.js')) assert.match(headers['Content-Type'], /^text\/javascript/);
  }
});
