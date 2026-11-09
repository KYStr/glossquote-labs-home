// Build tests: the preview build runs twice and produces byte-identical
// output, and the generated-output checker accepts it. Shells out to the
// real scripts, as the SPEC gate requires.

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function treeHashes(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await treeHashes(full, base)));
    else if (entry.isFile()) {
      out.push(`${sha256(await readFile(full))}  ${path.relative(base, full)}`);
    }
  }
  return out.sort();
}

test('build:preview twice is byte-identical; check:generated:preview passes', async () => {
  const build = ['scripts/build.mjs', ['--mode', 'preview']];
  await run('node', build, { cwd: toolRoot });
  const first = await treeHashes(path.join(toolRoot, 'dist-preview'));
  assert.ok(first.length > 0, 'dist-preview must not be empty');
  assert.ok(first.some((line) => line.endsWith('js/worker-source.mjs')), 'worker source generated');

  await run('node', build, { cwd: toolRoot });
  const second = await treeHashes(path.join(toolRoot, 'dist-preview'));
  assert.deepEqual(second, first, 'second build must be byte-identical to the first');

  const { stdout } = await run('node', ['scripts/check-generated.mjs'], { cwd: toolRoot });
  assert.match(stdout, /all generated-output checks passed/);
});

test('check.mjs passes on the source tree', async () => {
  const { stdout } = await run('node', ['scripts/check.mjs'], { cwd: toolRoot });
  assert.match(stdout, /all static checks passed/);
});
