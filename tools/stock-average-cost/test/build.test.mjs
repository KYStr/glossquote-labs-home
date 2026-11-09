// Build tests: preview build is reproducible byte-for-byte, generated
// output passes the generated-output checks, and the static source checks
// pass. All steps run in subprocesses via the package scripts.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(toolRoot, 'dist-preview');

function run(scriptArgs) {
  return execFileSync(process.execPath, scriptArgs, {
    cwd: toolRoot,
    encoding: 'utf8',
    timeout: 60000,
  });
}

async function treeHash(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const parts = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      parts.push(await treeHash(full, base));
    } else if (entry.isFile()) {
      const bytes = await readFile(full);
      const hash = createHash('sha256').update(bytes).digest('hex');
      parts.push(`${hash}  ${path.relative(base, full)}`);
    }
  }
  return parts.join('\n');
}

test('build:preview twice produces byte-identical output', async () => {
  await rm(outDir, { recursive: true, force: true });
  run(['scripts/build.mjs', '--mode', 'preview']);
  const first = await treeHash(outDir);
  run(['scripts/build.mjs', '--mode', 'preview']);
  const second = await treeHash(outDir);
  assert.equal(second, first);
  assert.ok(first.includes('js/worker-source.mjs'));
  assert.ok(first.includes('index.html'));
  assert.ok(first.includes('en/index.html'));
});

test('check:generated:preview passes on the built output', () => {
  const output = run(['scripts/check-generated.mjs']);
  assert.match(output, /all generated-output checks passed/);
});

test('check passes on the source tree', () => {
  const output = run(['scripts/check.mjs']);
  assert.match(output, /all static checks passed/);
});
