import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_ROOT, validatePublic, walkAllowed, verifyPath } from './validation.mjs';

export async function build(root = PROJECT_ROOT) {
  root = resolve(root);
  const files = await validatePublic(root);
  const target = join(root, 'dist');
  // Inspect the entire existing output before making any changes. Never clear stale unknown files.
  await walkAllowed(root, target, { requireAll: false, missing: true });
  const buffers = new Map();
  for (const file of files) {
    await verifyPath(root, join(target, file), { missing: true });
    buffers.set(file, await readFile(join(root, 'public', file)));
  }
  for (const file of files) {
    const path = join(target, file);
    await verifyPath(root, path, { missing: true });
    await mkdir(dirname(path), { recursive: true });
    await verifyPath(root, path, { missing: true });
    await writeFile(path, buffers.get(file), { flag: 'w' });
  }
  await walkAllowed(root, target);
  return files;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await build();
  console.log(`PASS: built ${files.length} preview assets into dist/; no production SEO or publication.`);
}
