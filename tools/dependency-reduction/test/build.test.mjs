import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function runNode(args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, args, { cwd: root, ...options }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${args.join(' ')}\n${stdout}\n${stderr}`));
      else resolve({ stdout, stderr });
    });
  });
}

async function treeHashes(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = {};
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, await treeHashes(full, base));
    else if (entry.isFile()) {
      const bytes = await readFile(full);
      out[path.relative(base, full)] = createHash('sha256').update(bytes).digest('hex');
    }
  }
  return out;
}

test('build:preview twice produces byte-identical output; check passes', async () => {
  await runNode(['scripts/build.mjs', '--mode', 'preview']);
  const first = await treeHashes(path.join(root, 'dist-preview'));
  await runNode(['scripts/build.mjs', '--mode', 'preview']);
  const second = await treeHashes(path.join(root, 'dist-preview'));
  assert.deepEqual(second, first);
  assert.ok(Object.keys(first).length >= 7, 'preview should contain the site files');
  await runNode(['scripts/check.mjs']);
  await runNode(['scripts/check-generated.mjs']);
});

test('serve: loopback probe of both pages, 404, traversal, headers', async () => {
  await runNode(['scripts/build.mjs', '--mode', 'preview']);
  const port = 46173;
  const server = spawn(process.execPath, [
    'scripts/serve.mjs', '--host', '127.0.0.1', '--port', String(port), '--dir', 'dist-preview',
  ], { cwd: root, stdio: 'ignore' });
  try {
    const base = `http://127.0.0.1:${port}`;
    let response;
    for (let attempt = 0; attempt < 25; attempt += 1) {
      try {
        response = await fetch(`${base}/`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    assert.ok(response, 'server did not start');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(response.headers.get('content-security-policy'), /worker-src blob:/);
    const zh = await response.text();
    assert.match(zh, /<h1>模組依賴冗餘檢查<\/h1>/);

    const en = await fetch(`${base}/en/`);
    assert.equal(en.status, 200);
    assert.match(await en.text(), /<h1>Module Dependency Reduction<\/h1>/);

    const js = await fetch(`${base}/js/core/graph.mjs`);
    assert.equal(js.status, 200);
    assert.match(js.headers.get('content-type'), /javascript/);

    const missing = await fetch(`${base}/nope.html`);
    assert.equal(missing.status, 404);

    const traversal = await fetch(`${base}/..%2f..%2fpackage.json`);
    assert.equal(traversal.status, 404);
  } finally {
    server.kill('SIGTERM');
  }
});
