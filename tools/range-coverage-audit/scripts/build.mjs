// Reproducible preview build for Numeric Range Coverage Audit.
// Copies public/ into dist-preview (or --out <dir>) and embeds the fixed
// worker bundle into app.js. The output is byte-identical across runs: no
// timestamps, no random values, files listed in sorted order in build-info.json.
//
// Usage: node scripts/build.mjs --mode preview [--out <dir>]

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { mode: 'preview', outDir: path.join(root, 'dist-preview') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode') out.mode = argv[i + 1];
    if (argv[i] === '--out') out.outDir = path.resolve(argv[i + 1]);
  }
  if (out.mode !== 'preview') throw new Error(`unsupported mode: ${out.mode}`);
  return out;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

const { outDir } = parseArgs(process.argv.slice(2));

// 1. Build the fixed worker bundle: core source + worker handler, with the
//    handler's import of the core removed (the core is concatenated above).
const coreSource = await readFile(path.join(root, 'public/js/core/range.mjs'), 'utf8');
const workerSource = await readFile(path.join(root, 'public/js/worker-source.mjs'), 'utf8');
const workerBody = workerSource
  .split('\n')
  .filter((line) => !line.startsWith('import '))
  .join('\n');
if (/^\s*import\s/m.test(workerBody)) {
  throw new Error('worker bundle still contains an import after stripping');
}
const bundle = coreSource + '\n' + workerBody;

// 2. Copy public/ into the output directory.
await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(path.join(root, 'public'), outDir, { recursive: true });

// 3. Embed the bundle into the preview copy of app.js.
const appPath = path.join(outDir, 'js/app.js');
const appSource = await readFile(appPath, 'utf8');
const placeholder = '"__WORKER_SOURCE_PLACEHOLDER__"';
const occurrences = appSource.split(placeholder).length - 1;
if (occurrences !== 1) {
  throw new Error(`expected exactly 1 worker placeholder in app.js, found ${occurrences}`);
}
await writeFile(appPath, appSource.replace(placeholder, JSON.stringify(bundle)), 'utf8');

// 4. Deterministic manifest: sorted file list with SHA-256 hashes.
const files = await listFiles(outDir);
const manifest = { mode: 'preview', files: {} };
for (const file of files) {
  manifest.files[file] = sha256(await readFile(path.join(outDir, file)));
}
await writeFile(
  path.join(outDir, 'build-info.json'),
  JSON.stringify(manifest, null, 2) + '\n',
  'utf8',
);

for (const file of files) {
  console.log(`${manifest.files[file]}  ${file}`);
}
console.log(`preview built: ${files.length} files -> ${outDir}`);
