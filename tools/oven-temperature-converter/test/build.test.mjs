// Build and serve tests for the Oven Temperature Converter.
// Runs the real preview build twice and requires byte-identical output,
// then serves dist-preview on an ephemeral loopback port and probes both
// language pages over HTTP.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function manifest(dir) {
  const files = [];
  async function walk(current, base) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : 1));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full, base);
      else if (entry.isFile()) files.push(path.relative(base, full));
    }
  }
  await walk(dir, dir);
  const lines = [];
  for (const file of files.sort()) {
    const bytes = await readFile(path.join(dir, file));
    lines.push(`${createHash('sha256').update(bytes).digest('hex')}  ${file}`);
  }
  return lines.join('\n');
}

test('build:preview is reproducible (two runs byte-identical)', async () => {
  await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview'], { cwd: root });
  const first = await manifest(path.join(root, 'dist-preview'));
  await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview'], { cwd: root });
  const second = await manifest(path.join(root, 'dist-preview'));
  assert.equal(second, first);
});

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(port, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status === 200) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('server did not start');
}

test('loopback serve returns both language pages and rejects traversal', async (t) => {
  await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview'], { cwd: root });
  const port = await freePort();
  const child = spawn('node', ['scripts/serve.mjs', '--port', String(port)], {
    cwd: root,
    stdio: 'ignore',
  });
  t.after(() => { child.kill('SIGTERM'); });
  await waitForServer(port);

  const zhRes = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(zhRes.status, 200);
  const zhBody = await zhRes.text();
  assert.ok(zhBody.includes('<title>烤箱溫度換算｜Gloss Tools</title>'));
  assert.match(zhRes.headers.get('content-type') ?? '', /text\/html/);
  assert.equal(zhRes.headers.get('x-robots-tag'), 'noindex,nofollow');

  const enRes = await fetch(`http://127.0.0.1:${port}/en/`);
  assert.equal(enRes.status, 200);
  const enBody = await enRes.text();
  assert.ok(enBody.includes('<title>Oven Temperature Converter | Gloss Tools</title>'));

  const traversal = await fetch(`http://127.0.0.1:${port}/../package.json`);
  assert.equal(traversal.status, 404);

  const missing = await fetch(`http://127.0.0.1:${port}/no-such-file.txt`);
  assert.equal(missing.status, 404);
});
