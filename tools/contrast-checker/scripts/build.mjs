// Reproducible preview build: copies public/ to the output directory
// byte-for-byte in sorted path order. No timestamps or generated content
// are embedded, so running it twice produces byte-identical output.
// Usage: node scripts/build.mjs [--out <dir>]   (default: dist-preview)

import { cp, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.join(root, 'dist-preview');
const srcDir = path.join(root, 'public');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await listFiles(p, base));
    else files.push(path.relative(base, p));
  }
  return files;
}

const files = await listFiles(srcDir);
await mkdir(outDir, { recursive: true });
for (const rel of files) {
  await cp(path.join(srcDir, rel), path.join(outDir, rel));
}
console.log(`build:preview wrote ${files.length} files to ${path.relative(root, outDir) || outDir}`);
