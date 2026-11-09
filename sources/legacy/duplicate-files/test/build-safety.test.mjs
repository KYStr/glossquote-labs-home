import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm, unlink, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { ROOT, PUBLIC_FILES, checkPublic } from '../scripts/check.mjs';
import { build } from '../scripts/build.mjs';

async function sandbox(callback) {
  const directory = await mkdtemp(resolve(ROOT, 'test/.tmp-build-'));
  try {
    for (const file of PUBLIC_FILES) {
      const target = resolve(directory, 'public', file); await mkdir(dirname(target), { recursive: true });
      await copyFile(resolve(ROOT, 'public', file), target);
    }
    await callback(directory);
  } finally {
    const inside = relative(resolve(ROOT, 'test'), directory);
    assert(!isAbsolute(inside) && inside.startsWith('.tmp-build-') && !inside.includes('..') && !inside.includes('/') && !inside.includes('\\'), 'Cleanup restricted to this test-owned sandbox');
    assert((await lstat(directory)).isDirectory());
    await rm(directory, { recursive: true });
  }
}

test('T30 closed build reproduces source bytes, excludes evidence and preserves unknown/stale output', async () => {
  await sandbox(async directory => {
    assert.equal(await build(directory), 11);
    for (const file of PUBLIC_FILES) assert((await readFile(resolve(directory, 'public', file))).equals(await readFile(resolve(directory, 'dist', file))));
    await writeFile(resolve(directory, 'dist/stale-secret.txt'), 'SYNTHETIC_KEEP_ME');
    await assert.rejects(build(directory), /Unknown file/);
    assert.equal(await readFile(resolve(directory, 'dist/stale-secret.txt'), 'utf8'), 'SYNTHETIC_KEEP_ME');
  });
});

test('T30 public unknown files, junctions/symlinks and malformed SEO fail closed', async () => {
  await sandbox(async directory => {
    const index = resolve(directory, 'public/index.html'), original = await readFile(index, 'utf8');
    for (const changed of [original.replace('noindex,nofollow,noarchive', 'index,follow'), original.replace('找出內容相同的檔案</h1>', 'Wrong H1</h1>'), original.replace('在瀏覽器本機找出內容完全相同的檔案，確認要保留哪一份，再下載清單。', 'Wrong description')]) {
      await writeFile(index, changed); await assert.rejects(checkPublic(directory));
    }
    await writeFile(index, original);
    await mkdir(resolve(directory, 'outside'));
    const link = resolve(directory, 'public/linked');
    await symlink(resolve(directory, 'outside'), link, process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(build(directory), /Links are not allowed/);
    // Remove only the identified link, never recurse through its target.
    await unlink(link);
    await writeFile(resolve(directory, 'public/unexpected.js'), 'export const fake = true;');
    await assert.rejects(build(directory), /Unknown file/);
  });
});
