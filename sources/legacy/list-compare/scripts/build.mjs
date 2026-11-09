import { mkdir, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, ASSETS, readAssets, walkFiles, requireNode24 } from './files.mjs';
import { checkSource } from './check.mjs';

export async function build() {
  requireNode24();
  await checkSource();
  const assets = await readAssets(path.join(ROOT, 'public'));
  const target = path.join(ROOT, 'dist');
  try {
    const actual = await walkFiles(target);
    if (actual.some(file => !ASSETS.includes(file))) throw new Error('Unknown stale build output rejected');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(target, { recursive: true });
  for (const [file, bytes] of assets) {
    const destination = path.join(target, file);
    await mkdir(path.dirname(destination), { recursive: true });
    // Reject a replaced directory or linked output before writing.
    await walkFiles(target);
    try {
      const current = await lstat(destination);
      if (!current.isFile() || current.isSymbolicLink() || current.nlink !== 1) throw new Error('Unsafe output');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await writeFile(destination, bytes);
  }
  await readAssets(target);
  return { files: assets.size, directory: target };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(await build()));
}
