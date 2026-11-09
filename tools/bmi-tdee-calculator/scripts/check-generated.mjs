// Verifies dist/ (from build:preview) matches public/ byte for byte.
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function hashes(base) {
  const map = new Map();
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) {
        map.set(relative(base, path), createHash('sha256').update(await readFile(path)).digest('hex'));
      }
    }
  }
  await walk(base);
  return map;
}

let source;
let generated;
try {
  source = await hashes(join(root, 'public'));
} catch {
  console.error('public/ is missing.');
  process.exit(1);
}
try {
  generated = await hashes(join(root, 'dist'));
} catch {
  console.error('dist/ is missing; run npm run build:preview first.');
  process.exit(1);
}

let failed = false;
for (const [path, hash] of source) {
  if (generated.get(path) !== hash) {
    console.error(`MISMATCH: ${path}`);
    failed = true;
  }
}
for (const path of generated.keys()) {
  if (!source.has(path)) {
    console.error(`EXTRA in dist: ${path}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`Generated preview verified: ${source.size} files byte-identical to public/.`);
