#!/usr/bin/env node
// Reproducible preview build for the Oven Temperature Converter.
// Usage: node scripts/build.mjs --mode preview
// Copies public/ to dist-preview/ byte for byte. No timestamps, no
// network, no dependencies. Running the build twice produces
// byte-identical output; the sorted SHA-256 manifest is printed.

import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files;
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv.includes('--mode') ? argv[argv.indexOf('--mode') + 1] : 'preview';
  if (mode !== 'preview') {
    console.error(`error: unsupported mode ${JSON.stringify(mode)} (only "preview")`);
    process.exit(1);
  }
  const outDir = path.join(root, 'dist-preview');
  const publicDir = path.join(root, 'public');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(publicDir, outDir, { recursive: true });

  const files = await listFiles(outDir);
  const lines = [];
  for (const file of files) {
    const bytes = await readFile(path.join(outDir, file));
    lines.push(`${sha256(bytes)}  ${file}`);
  }
  lines.sort();
  console.log(`built dist-preview (${files.length} files)`);
  for (const line of lines) console.log(line);
}

main().catch((error) => {
  console.error(`build failed: ${error.message}`);
  process.exit(1);
});
