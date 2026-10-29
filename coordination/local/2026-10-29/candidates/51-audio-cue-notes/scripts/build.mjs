import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { PUBLIC_FILES, root, closedTree, previewMetadata, requireNode24 } from './files.mjs';

export async function buildStatic(base = root) {
  const source = new URL('public/', base);
  const output = new URL('dist/', base);
  await closedTree(source);
  await previewMetadata(source);
  // Preflight before writing. Unknown output is an error, never deleted to pass.
  await closedTree(output, { complete: false, allowMissing: true });
  for (const file of PUBLIC_FILES) {
    const destination = new URL(file, output);
    await mkdir(new URL('.', destination), { recursive: true });
    await copyFile(new URL(file, source), destination);
  }
  await closedTree(output);
  await previewMetadata(output);
  const hashes = [];
  for (const file of PUBLIC_FILES) {
    const before = await readFile(new URL(file, source));
    const after = await readFile(new URL(file, output));
    if (!before.equals(after)) throw new Error(`Build byte mismatch: ${file}`);
    hashes.push({ path: file, bytes: after.byteLength, sha256: createHash('sha256').update(after).digest('hex') });
  }
  return hashes;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  requireNode24();
  const hashes = await buildStatic();
  console.log(JSON.stringify({ status: 'PASS', type: 'preview-noindex', files: hashes }, null, 2));
}
