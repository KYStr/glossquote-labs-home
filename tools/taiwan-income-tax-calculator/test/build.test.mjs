// Build tests: two preview builds are byte-identical, the preview carries
// noindex and no canonical, the worker bundle is embedded in app.js, and
// the emitted file set is exactly the allowlist.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function hashTree(dir) {
  const entries = [];
  async function walk(current, base) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const rel = path.join(base, entry.name);
      if (entry.isDirectory()) await walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) {
        const bytes = await readFile(path.join(current, entry.name));
        entries.push([rel.split(path.sep).join('/'), createHash('sha256').update(bytes).digest('hex')]);
      }
    }
  }
  await walk(dir, '');
  return entries.sort();
}

test('preview builds are byte-identical and complete', async () => {
  const outA = await mkdtemp(path.join(tmpdir(), 'tax-build-a-'));
  const outB = await mkdtemp(path.join(tmpdir(), 'tax-build-b-'));
  try {
    for (const out of [outA, outB]) {
      await run(process.execPath, [path.join(root, 'scripts/build.mjs'), '--mode', 'preview', '--out', out], { cwd: root });
    }
    const [treeA, treeB] = [await hashTree(outA), await hashTree(outB)];
    assert.deepStrictEqual(treeA, treeB);
    assert.deepStrictEqual(treeA.map(([rel]) => rel), [
      '_headers',
      'en/index.html',
      'index.html',
      'js/app.js',
      'js/core/controller.mjs',
      'js/core/core.mjs',
      'robots.txt',
      'styles/styles.css',
    ]);

    const zh = await readFile(path.join(outA, 'index.html'), 'utf8');
    assert.ok(zh.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(!zh.includes('rel="canonical"'));
    assert.ok(!zh.includes('<!--META-->'));

    const app = await readFile(path.join(outA, 'js/app.js'), 'utf8');
    assert.ok(!app.includes('__WORKER_SOURCE__'), 'worker token must be replaced');
    assert.ok(app.includes('salarySpecialDeduction'), 'core source is embedded for the worker bundle');
    assert.ok(app.includes('self.onmessage'), 'worker handler is embedded');

    const robots = await readFile(path.join(outA, 'robots.txt'), 'utf8');
    assert.equal(robots, 'User-agent: *\nDisallow: /\n');
  } finally {
    await rm(outA, { recursive: true, force: true });
    await rm(outB, { recursive: true, force: true });
  }
});

test('production mode is refused without a configured origin', async () => {
  await assert.rejects(
    run(process.execPath, [path.join(root, 'scripts/build.mjs'), '--mode', 'production'], { cwd: root }),
  );
});
