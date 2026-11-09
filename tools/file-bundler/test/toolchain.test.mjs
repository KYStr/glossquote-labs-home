import test from 'node:test';
import assert from 'node:assert/strict';
import edge from '../scripts/edge-headers.mjs';
import { routeRequest, handler } from '../scripts/serve.mjs';

test('allowlisted preview routes only; traversal, queries, methods and foreign hosts fail closed', () => {
  assert.deepEqual(routeRequest('GET','/','127.0.0.1:4227'), { status: 200, file: 'index.html', contentType: 'text/html; charset=utf-8' });
  assert.equal(routeRequest('HEAD','/en/index.html','localhost:4227').status,200);
  for (const path of ['/../PRODUCT.md','/%2e%2e/AGENTS.md','/package.json','/index.html?x=1','//index.html','/en/../index.html','/missing','/a\\b']) assert.equal(routeRequest('GET',path,'127.0.0.1:4227').status,404);
  assert.equal(routeRequest('POST','/','127.0.0.1:4227').status,405);
  assert.equal(routeRequest('GET','/','evil.invalid').status,421);
});
const expectedCSP = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

test('preview handler sends HTTP framing protection on both languages and errors without binding a port', async () => {
  for (const [method, url, host, status] of [
    ['HEAD', '/index.html', '127.0.0.1:4227', 200],
    ['HEAD', '/en/index.html', '127.0.0.1:4227', 200],
    ['GET', '/missing', '127.0.0.1:4227', 404],
    ['POST', '/', '127.0.0.1:4227', 405],
    ['GET', '/', 'example.invalid', 421]
  ]) {
    const response = { writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { this.body = body; } };
    await handler({ method, url, headers: { host } }, response);
    assert.equal(response.status, status);
    assert.equal(response.body, undefined);
    assert.equal(response.headers['Content-Security-Policy'], expectedCSP);
    assert.equal(response.headers['X-Frame-Options'], 'DENY');
    assert.equal(response.headers['Strict-Transport-Security'], undefined);
    assert.match(response.headers['X-Robots-Tag'], /noindex/);
    if (status === 200) assert.equal(response.headers['Content-Type'], 'text/html; charset=utf-8');
  }
});

test('edge handler preserves asset status, headers and bodies while securing every route', async t => {
  const cases = [
    { path: '/index.html', status: 200, body: '<html lang="zh-Hant">', headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    { path: '/en/index.html', status: 200, body: '<html lang="en">', headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    { path: '/', status: 301, headers: { Location: '/index.html' } },
    { path: '/en', status: 301, headers: { Location: '/en/index.html' } },
    { path: '/en/', status: 301, headers: { Location: '/en/index.html' } },
    { path: '/missing', status: 404, body: 'Not found' },
    { path: '/index.html', status: 405, method: 'POST', headers: { Allow: 'GET, HEAD' } },
    { path: '/en/index.html', status: 200, method: 'HEAD', headers: { 'Content-Length': '100' } },
    { path: '/js/app.js', status: 206, requestHeaders: { Range: 'bytes=0-2' }, body: 'abc', headers: { 'Content-Range': 'bytes 0-2/100', 'Content-Length': '3' } },
    { path: '/js/app.js', status: 304, requestHeaders: { 'If-None-Match': '"tag"' }, headers: { ETag: '"tag"' } },
    { path: '/index.html', status: 500, failure: true }
  ];
  for (const { path, status, method = 'GET', requestHeaders, body = null, headers, failure = false } of cases) {
    await t.test(`${method} ${path} to ${status}`, async () => {
      const request = new Request('https://file-bundles.glossquote.com' + path, { method, headers: requestHeaders });
      const asset = new Response(body, { status, headers: { ...headers, 'X-Frame-Options': 'SAMEORIGIN' } });
      const forwardedRequests = [];
      const response = await edge.fetch(request, { ASSETS: { fetch(forwarded) {
        forwardedRequests.push(forwarded);
        if (failure) throw new Error('synthetic asset failure');
        return asset;
      } } });
      assert.equal(forwardedRequests.length, 1);
      const [forwarded] = forwardedRequests;
      assert.equal(forwarded.url, request.url);
      assert.equal(forwarded.method, request.method);
      assert.equal(forwarded.redirect, 'manual');
      assert.deepEqual([...forwarded.headers], [...request.headers]);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('Content-Security-Policy'), expectedCSP);
      assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
      assert.equal(response.headers.get('Strict-Transport-Security'), 'max-age=31536000');
      assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('X-Robots-Tag'), 'index, follow');
      assert.equal(response.headers.get('Cross-Origin-Resource-Policy'), 'same-origin');
      for (const [name, value] of Object.entries(headers ?? {})) assert.equal(response.headers.get(name), value);
      assert.equal(response.body, asset.body);
      assert.equal(await response.text(), body ?? '');
    });
  }
});
