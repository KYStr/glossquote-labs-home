import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { ROOT, PUBLIC_FILES, readPublic, inspectTree } from './files.mjs';

export async function buildPreview(root = ROOT) {
  const files = await readPublic(join(root, 'public'));
  for (const name of ['index.html', 'en/index.html']) if (!files.get(name).toString().includes('<meta name="robots" content="noindex,nofollow">')) throw new Error('PREVIEW_NOINDEX_REQUIRED');
  const destination = join(root, 'dist');
  await inspectTree(destination, PUBLIC_FILES, { missing: true });
  await mkdir(destination, { recursive: true });
  const manifest = [];
  for (const [name, bytes] of files) {
    const path = join(destination, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    manifest.push({ path: name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await inspectTree(destination);
  const built = await readPublic(destination);
  for (const [name, bytes] of files) if (!bytes.equals(built.get(name))) throw new Error('BUILD_BYTE_MISMATCH');
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await buildPreview(); process.stdout.write(`build PASS ${files.length} byte-identical noindex assets\n`);
}
