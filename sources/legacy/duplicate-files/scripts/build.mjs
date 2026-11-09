import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { ROOT, PUBLIC_FILES, checkPublic, inventory } from './check.mjs';

export async function build(root = ROOT) {
  await checkPublic(root);
  const output = resolve(root, 'dist');
  try { await inventory(output); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await mkdir(output, { recursive: true });
  for (const file of PUBLIC_FILES) {
    const target = resolve(output, file);
    await mkdir(resolve(target, '..'), { recursive: true });
    await copyFile(resolve(root, 'public', file), target);
    assert((await readFile(target)).equals(await readFile(resolve(root, 'public', file))), 'Build bytes differ');
  }
  assert.deepEqual(await inventory(output), [...PUBLIC_FILES].sort());
  return PUBLIC_FILES.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`PASS build: ${await build()} preview files; byte-identical to public; noindex retained`);
}
