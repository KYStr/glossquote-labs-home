// Reproducible preview build: copies public/ into the destination directory
// byte-for-byte in sorted order and writes a sha256 manifest. No timestamps
// or environment data are embedded, so two runs are byte-identical.
// Usage: node scripts/build.mjs [--dest <dir>]   (default: dist-preview)
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(toolDir, 'public');
const args = process.argv.slice(2);
const destFlag = args.indexOf('--dest');
const destDir = destFlag >= 0
  ? path.resolve(args[destFlag + 1])
  : path.join(toolDir, 'dist-preview');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

const files = await listFiles(srcDir);
await rm(destDir, { recursive: true, force: true });
await mkdir(destDir, { recursive: true });
const manifest = { tool: 'compound-interest-calculator', files: [] };
for (const rel of files) {
  const bytes = await readFile(path.join(srcDir, rel));
  const target = path.join(destDir, rel);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(path.join(srcDir, rel), target);
  manifest.files.push({
    path: rel,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
await writeFile(path.join(destDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`build:preview wrote ${files.length} files + manifest.json to ${path.relative(toolDir, destDir) || destDir}`);
