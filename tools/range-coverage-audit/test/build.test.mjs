// Build determinism tests: two preview builds into separate temp dirs must
// be byte-identical, and the generated preview must pass check:generated.

import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

async function hashTree(dir) {
  const out = {};
  for (const file of await listFiles(dir)) {
    out[file] = createHash('sha256').update(await readFile(path.join(dir, file))).digest('hex');
  }
  return out;
}

test('build:preview is byte-identical across two runs', async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'rca-build-'));
  try {
    const first = path.join(base, 'a');
    const second = path.join(base, 'b');
    execFileSync(process.execPath, ['scripts/build.mjs', '--mode', 'preview', '--out', first], { cwd: root, stdio: 'pipe' });
    execFileSync(process.execPath, ['scripts/build.mjs', '--mode', 'preview', '--out', second], { cwd: root, stdio: 'pipe' });
    const a = await hashTree(first);
    const b = await hashTree(second);
    assert.deepEqual(a, b);
    // The generated app.js embeds the worker bundle and has no placeholder.
    const app = await readFile(path.join(first, 'js/app.js'), 'utf8');
    assert.ok(!app.includes('__WORKER_SOURCE_PLACEHOLDER__'));
    assert.ok(app.includes('function runAudit'));
    assert.ok(app.includes('handleWorkerMessage'));
    // check:generated passes on the temp output.
    execFileSync(process.execPath, ['scripts/check-generated.mjs', '--dir', first], { cwd: root, stdio: 'pipe' });
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
