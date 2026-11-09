// Reproducible preview build: copies public/ to preview/ byte for byte.
//
// Files are visited in sorted order and copied with no timestamps, no
// banners and no transformations, so running the build twice produces
// byte-identical output. The preview keeps the pages' noindex marking;
// it is a review artifact, not a deployment.

import { cp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(toolRoot, 'public');
const outDir = path.join(toolRoot, 'preview');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else files.push(path.relative(base, full));
  }
  return files;
}

await rm(outDir, { recursive: true, force: true });
const files = await listFiles(sourceDir);
for (const rel of files) {
  await cp(path.join(sourceDir, rel), path.join(outDir, rel));
}
console.log(`build:preview wrote ${files.length} files to preview/`);
