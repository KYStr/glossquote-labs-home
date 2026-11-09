// Build tests: `node scripts/build.mjs --mode preview` run twice into two
// fresh directories produces byte-identical output (sorted SHA-256 per
// file), the generated worker source embeds the exact core + handler bytes,
// and the loopback server serves the preview with correct MIME, 404s, and
// traversal rejection.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

async function shaMap(dir) {
  const map = {};
  for (const file of await listFiles(dir)) {
    map[file] = createHash('sha256').update(await readFile(path.join(dir, file))).digest('hex');
  }
  return map;
}

test('build:preview twice is byte-identical; worker source embeds core + handler', async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'route-overlap-build-'));
  try {
    const outA = path.join(tmp, 'a');
    const outB = path.join(tmp, 'b');
    await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview', '--out', outA], { cwd: root });
    await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview', '--out', outB], { cwd: root });
    const hashesA = await shaMap(outA);
    const hashesB = await shaMap(outB);
    assert.deepEqual(hashesA, hashesB);
    assert.ok(Object.keys(hashesA).length >= 8, 'preview should contain the site files');

    const core = await readFile(path.join(root, 'public', 'js', 'core', 'core.mjs'), 'utf8');
    const handler = await readFile(path.join(root, 'scripts', 'worker-handler.mjs'), 'utf8');
    const workerModule = await readFile(path.join(outA, 'js', 'worker-source.mjs'), 'utf8');
    assert.equal(workerModule, `export const WORKER_SOURCE = ${JSON.stringify(`${core}\n${handler}`)};\n`);

    await execFileAsync('node', ['scripts/check-generated.mjs', '--dir', outA], { cwd: root });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test('serve: loopback preview serves pages, MIME, 404, traversal rejection', async (t) => {
  const tmp = await mkdtemp(path.join(tmpdir(), 'route-overlap-serve-'));
  const outDir = path.join(tmp, 'preview');
  await execFileAsync('node', ['scripts/build.mjs', '--mode', 'preview', '--out', outDir], { cwd: root });

  const child = spawn('node', ['scripts/serve.mjs', '--host', '127.0.0.1', '--port', '0', '--dir', outDir], { cwd: root });
  t.after(() => {
    child.kill('SIGTERM');
    return rm(tmp, { recursive: true, force: true });
  });

  const port = await new Promise((resolve, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('serve did not start')), 10000);
    child.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = buffer.match(/listening http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    child.stderr.on('data', (chunk) => { buffer += chunk.toString(); });
    child.on('error', reject);
  });

  const get = async (pathName, method = 'GET') => {
    const response = await fetch(`http://127.0.0.1:${port}${pathName}`, { method });
    return { status: response.status, type: response.headers.get('content-type'), text: await response.text() };
  };

  const home = await get('/');
  assert.equal(home.status, 200);
  assert.match(home.type, /text\/html/);
  assert.ok(home.text.includes('路由樣式交疊檢查'));

  const en = await get('/en/index.html');
  assert.equal(en.status, 200);
  assert.ok(en.text.includes('Route Pattern Overlap Audit'));

  const app = await get('/js/app.js');
  assert.equal(app.status, 200);
  assert.match(app.type, /text\/javascript/);

  const head = await get('/', 'HEAD');
  assert.equal(head.status, 200);

  const missing = await get('/no-such-page.html');
  assert.equal(missing.status, 404);

  const traversal = await get('/..%2f..%2fpackage.json');
  assert.equal(traversal.status, 404);
});
