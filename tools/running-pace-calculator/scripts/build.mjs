// Reproducible preview build: copies public/ to dist/ verbatim and writes a
// deterministic build-manifest.json (sorted paths, byte counts, SHA-256).
// Running it twice produces byte-identical output: no timestamps, no random
// ordering, no environment data are embedded.
//
//   node scripts/build.mjs           rebuild dist/
//   node scripts/build.mjs --check   rebuild into a temp dir and verify that
//                                    dist/ matches it byte for byte

import { createHash } from 'node:crypto';
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'public');
const distDir = path.join(root, 'dist');
const MANIFEST_NAME = 'build-manifest.json';

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files;
}

async function buildInto(destDir) {
  await rm(destDir, { recursive: true, force: true });
  await cp(sourceDir, destDir, { recursive: true });
  const files = await listFiles(destDir);
  const manifestFiles = [];
  for (const rel of files) {
    const bytes = await readFile(path.join(destDir, rel));
    manifestFiles.push({
      path: rel,
      bytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  }
  const manifest = `${JSON.stringify({ files: manifestFiles }, null, 2)}\n`;
  await writeFile(path.join(destDir, MANIFEST_NAME), manifest);
  return manifestFiles.length;
}

async function directoriesEqual(a, b) {
  const [filesA, filesB] = [await listFiles(a), await listFiles(b)];
  if (JSON.stringify(filesA) !== JSON.stringify(filesB)) return false;
  for (const rel of filesA) {
    const [bytesA, bytesB] = await Promise.all([
      readFile(path.join(a, rel)),
      readFile(path.join(b, rel)),
    ]);
    if (!bytesA.equals(bytesB)) return false;
  }
  return true;
}

if (process.argv.includes('--check')) {
  const tempDir = await mkdtemp(path.join(tmpdir(), 'running-pace-preview-'));
  try {
    await buildInto(tempDir);
    if (await stat(distDir).catch(() => null)) {
      if (await directoriesEqual(tempDir, distDir)) {
        console.log('check:generated:preview OK — dist/ matches a fresh build byte for byte.');
        process.exit(0);
      }
    }
    console.error('check:generated:preview FAILED — dist/ is missing or stale. Run: npm run build:preview');
    process.exit(1);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
} else {
  const count = await buildInto(distDir);
  console.log(`build:preview OK — ${count} files copied to dist/ plus ${MANIFEST_NAME}.`);
}
