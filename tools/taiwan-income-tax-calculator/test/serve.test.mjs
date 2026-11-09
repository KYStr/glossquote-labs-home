// Serve tests + the loopback HTTP probe of the real built preview:
// both language pages return 200 with their pinned titles, HEAD works,
// missing paths 404, traversal is refused, and writes are rejected.

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function startServer() {
  const child = spawn(process.execPath, [
    path.join(root, 'scripts/serve.mjs'),
    '--host', '127.0.0.1', '--port', '0', '--dir', path.join(root, 'dist-preview'),
  ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const match = buffer.match(/http:\/\/127\.0\.0\.1:(\d+)\//);
      if (match) resolve(`http://127.0.0.1:${match[1]}`);
    });
    child.on('exit', (code) => reject(new Error(`server exited early with ${code}`)));
    setTimeout(() => reject(new Error('server start timed out')), 10000);
  });
  return { child, url };
}

test('loopback probe of the built preview', async () => {
  await run(process.execPath, [path.join(root, 'scripts/build.mjs'), '--mode', 'preview'], { cwd: root });
  const { child, url } = await startServer();
  try {
    const zh = await fetch(`${url}/`);
    assert.equal(zh.status, 200);
    assert.match(zh.headers.get('content-type'), /text\/html/);
    assert.equal(zh.headers.get('x-robots-tag'), 'noindex, nofollow');
    const zhBody = await zh.text();
    assert.ok(zhBody.includes('<title>綜合所得稅試算｜Gloss Tools</title>'));
    assert.ok(zhBody.includes('<html lang="zh-Hant">'));

    const en = await fetch(`${url}/en/`);
    assert.equal(en.status, 200);
    const enBody = await en.text();
    assert.ok(enBody.includes('<title>Taiwan Income Tax Calculator | Gloss Tools</title>'));
    assert.ok(enBody.includes('<html lang="en">'));

    const head = await fetch(`${url}/`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');

    const missing = await fetch(`${url}/no-such-page`);
    assert.equal(missing.status, 404);

    const traversal = await fetch(`${url}/..%2f..%2fpackage.json`);
    assert.equal(traversal.status, 404);

    const post = await fetch(`${url}/`, { method: 'POST' });
    assert.equal(post.status, 405);

    const app = await fetch(`${url}/js/app.js`);
    assert.equal(app.status, 200);
    assert.match(app.headers.get('content-type'), /text\/javascript/);
  } finally {
    child.kill('SIGTERM');
    await new Promise((resolve) => child.on('exit', resolve));
  }
});
