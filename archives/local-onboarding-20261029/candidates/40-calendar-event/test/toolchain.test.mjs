import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, unlink, rmdir, mkdir, symlink, realpath, readFile } from 'node:fs/promises';
import path from 'node:path';
import { inventory, ROOT } from '../scripts/check.mjs';
import { build, assertFreshOutput } from '../scripts/build.mjs';

test('Build refuses wrong target, unknown paths, stale bytes, and actual junctions before copy', async () => {
  const base = path.join(ROOT, 'evidence', 'm1');
  await mkdir(base, { recursive: true });
  const scratch = await mkdtemp(path.join(base, '.toolchain-'));
  const index = path.join(scratch, 'index.html'); const unknown = path.join(scratch, 'unexpected.txt');
  const link = path.join(scratch, 'js'); const target = path.join(scratch, 'junction-target');
  let hasIndex = false; let hasUnknown = false; let hasTarget = false; let hasLink = false;
  try {
    assert.equal(await realpath(scratch), path.resolve(scratch));
    await assert.rejects(build(path.join(scratch, '..', 'outside')), /BUILD_TARGET_NOT_ALLOWED/);
    await writeFile(index, 'stale fake bytes'); hasIndex = true;
    assert.deepEqual(await inventory(scratch), ['index.html']);
    await assert.rejects(assertFreshOutput(scratch), /STALE_DIST/);
    await writeFile(unknown, 'fake unexpected content'); hasUnknown = true;
    await assert.rejects(inventory(scratch), /UNKNOWN_PUBLIC_PATH/);
    assert.equal(await readFile(unknown, 'utf8'), 'fake unexpected content');
    await unlink(unknown); hasUnknown = false;
    await mkdir(target); hasTarget = true;
    // Test root rejection directly as well as a whitelisted nested path.
    await symlink(target, link, 'junction'); hasLink = true;
    await assert.rejects(inventory(link), /UNSAFE_ROOT/);
    await rmdir(target); hasTarget = false;
    await assert.rejects(inventory(scratch), /UNSAFE_LINK/);
  } finally {
    // Only these task-owned exact files/empty directories; no recursive delete.
    assert.ok(path.resolve(scratch).startsWith(path.join(base, '.toolchain-')));
    assert.equal(await realpath(scratch), path.resolve(scratch));
    if (hasLink) await unlink(link);
    if (hasTarget) await rmdir(target);
    if (hasUnknown) await unlink(unknown);
    if (hasIndex) await unlink(index);
    await rmdir(scratch);
  }
});
