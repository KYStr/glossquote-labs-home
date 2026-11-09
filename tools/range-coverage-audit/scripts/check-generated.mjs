// Checks the generated preview (dist-preview, or --dir <dir>).
// Verifies the worker source is embedded (no placeholder left), the manifest
// hashes match the files on disk, and every preview file matches its public/
// source except the build-transformed app.js.
//
// Usage: node scripts/check-generated.mjs [--dir <dir>]

import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const fail = (message) => failures.push(message);

let dir = path.join(root, 'dist-preview');
for (let i = 0; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--dir') dir = path.resolve(process.argv[i + 1]);
}

async function listFiles(base, current = base) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(base, full)));
    else if (entry.isFile()) files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files.sort();
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(dir, 'build-info.json'), 'utf8'));
} catch {
  fail('dist-preview/build-info.json missing — run npm run build:preview first');
}

if (manifest) {
  const files = await listFiles(dir);
  const expected = [...Object.keys(manifest.files), 'build-info.json'].sort();
  if (JSON.stringify(files) !== JSON.stringify(expected)) {
    fail(`preview file list mismatch: got ${files.join(', ')}`);
  }
  for (const [file, hash] of Object.entries(manifest.files)) {
    const actual = sha256(await readFile(path.join(dir, file)));
    if (actual !== hash) fail(`hash mismatch: ${file}`);
  }
  // Every preview file must equal its public/ source, except app.js, which
  // the build transforms by embedding the worker bundle.
  for (const file of Object.keys(manifest.files)) {
    if (file === 'js/app.js') continue;
    const preview = await readFile(path.join(dir, file), 'utf8');
    const source = await readFile(path.join(root, 'public', file), 'utf8');
    if (preview !== source) fail(`preview file differs from source: ${file}`);
  }
  const app = await readFile(path.join(dir, 'js/app.js'), 'utf8');
  if (app.includes('__WORKER_SOURCE_PLACEHOLDER__')) fail('generated app.js still contains the worker placeholder');
  if (!app.includes('URL.createObjectURL') || !app.includes("new Worker(")) {
    fail('generated app.js missing Blob worker construction');
  }
  if (!app.includes('export function runAudit') && !app.includes('function runAudit')) {
    fail('generated app.js does not embed the core');
  }
  if (!app.includes('handleWorkerMessage')) fail('generated app.js does not embed the worker handler');
}

if (failures.length > 0) {
  console.error(`check:generated:preview FAILED (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log('check:generated:preview OK: manifest hashes match, preview matches sources, worker embedded');
