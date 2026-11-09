import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceMap } from '../scripts/files.mjs';
import { makeHandler } from '../scripts/serve.mjs';
test('scaffold pages and loopback handler without opening a port', async () => {
  const files = await sourceMap();
  assert(files.has('index.html') && files.has('en/index.html'));
  const handle = makeHandler(files);
  for (const [url, method, host, expected] of [['/', 'GET', '127.0.0.1:4229', 200], ['/en/', 'HEAD', 'localhost:4229', 200], ['/../AGENTS.md', 'GET', '127.0.0.1:4229', 400], ['/%2e%2e/x', 'GET', '127.0.0.1:4229', 400], ['/', 'POST', '127.0.0.1:4229', 405], ['/', 'GET', 'example.com', 400], ['/unknown', 'GET', '127.0.0.1:4229', 404]]) {
    let status;
    handle({ url, method, headers: { host } }, { writeHead(value) { status = value; }, end() {} });
    assert.equal(status, expected, url);
  }
});
