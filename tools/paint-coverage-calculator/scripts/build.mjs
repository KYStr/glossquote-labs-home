// Reproducible preview build: copies public/ into the destination in
// sorted path order, copying file bytes verbatim and adding nothing
// time-dependent, so two runs produce byte-identical output.
// Usage: node scripts/build.mjs [destDir]   (default: dist-preview/)

import { cp, rm, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIR = path.join(TOOL_ROOT, 'public');
export const DEFAULT_DEST = path.join(TOOL_ROOT, 'dist-preview');

export async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const out = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, base)));
    else if (entry.isFile()) out.push(path.relative(base, full));
  }
  return out;
}

export async function buildPreview(dest = DEFAULT_DEST) {
  await rm(dest, { recursive: true, force: true });
  await mkdir(dest, { recursive: true });
  const files = await listFiles(SOURCE_DIR);
  for (const rel of files) {
    const target = path.join(dest, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(path.join(SOURCE_DIR, rel), target);
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_DEST;
  const files = await buildPreview(dest);
  console.log(`build:preview: wrote ${files.length} files to ${path.relative(process.cwd(), dest) || dest}`);
}
