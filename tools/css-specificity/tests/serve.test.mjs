// Serve tests (SPEC §5/§6 security/privacy evidence at the local preview
// origin): the built dist is served with the exact house CSP and security
// headers, correct bytes, and closed failure modes. This exercises the
// project's own preview server on loopback — it is not a browser test.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Dynamic loopback port: the child server listens on port 0 and announces
// the actual address; never a fixed port, never kill-by-port.
let port;
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

function run(args) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, args, { cwd: root }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout);
    });
  });
}

function request(method, reqPath) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: reqPath, method }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

let server;
before(async () => {
  await run(['scripts/build.mjs', '--mode=preview']);
  const gen = await run(['scripts/check-generated.mjs', '--mode=preview']);
  assert.ok(gen.includes('CHECK-GENERATED PASS'), gen);
  server = spawn(process.execPath, ['scripts/serve.mjs', '--port=0'], { cwd: root });
  server.stdout.setEncoding('utf8');
  // Read the actual address the child announced (listen on port 0); the
  // readiness probe below then confirms it answers at that address.
  port = await new Promise((resolve, reject) => {
    let announced = '';
    const timer = setTimeout(() => reject(new Error('preview server did not announce a port')), 8000);
    server.stdout.on('data', (chunk) => {
      announced += chunk;
      const m = /http:\/\/127\.0\.0\.1:(\d+)\//.exec(announced);
      if (m) { clearTimeout(timer); resolve(Number(m[1])); }
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('preview server exited early with code ' + code));
    });
  });
  const deadline = Date.now() + 8000;
  while (true) {
    try {
      const r = await request('GET', '/');
      if (r.status === 200) break;
    } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error('preview server did not come up');
    await new Promise((r) => setTimeout(r, 100));
  }
});
after(() => { if (server) server.kill(); });

test('serves both pages and assets with exact bytes and house headers', async () => {
  const index = await request('GET', '/');
  assert.equal(index.status, 200);
  assert.equal(index.headers['content-security-policy'], CSP);
  assert.equal(index.headers['x-content-type-options'], 'nosniff');
  assert.equal(index.headers['referrer-policy'], 'no-referrer');
  assert.ok(index.body.equals(await readFile(path.join(root, 'dist/index.html'))));
  const en = await request('GET', '/en/');
  assert.equal(en.status, 200);
  assert.ok(en.body.equals(await readFile(path.join(root, 'dist/en/index.html'))));
  const core = await request('GET', '/assets/core.mjs');
  assert.equal(core.status, 200);
  assert.ok(core.body.equals(await readFile(path.join(root, 'dist/assets/core.mjs'))));
  const robots = await request('GET', '/robots.txt');
  assert.equal(robots.status, 200);
});

test('failure modes are closed: 404, traversal never serves outside files, 405, HEAD', async () => {
  assert.equal((await request('GET', '/does-not-exist')).status, 404);
  const traversal = await request('GET', '/assets/../../package.json');
  assert.notEqual(traversal.status, 200);
  assert.ok(!traversal.body.toString('utf8').includes('glossquote-labs-css-specificity'));
  const encoded = await request('GET', '/%2e%2e%2fpackage.json');
  assert.notEqual(encoded.status, 200);
  assert.equal((await request('POST', '/')).status, 405);
  const head = await request('HEAD', '/');
  assert.equal(head.status, 200);
  assert.equal(head.body.length, 0);
  assert.equal(Number(head.headers['content-length']), (await readFile(path.join(root, 'dist/index.html'))).length);
});
