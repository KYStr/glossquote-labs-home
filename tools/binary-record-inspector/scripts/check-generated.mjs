// Checks for the generated preview (dist-preview/).
// Verifies the built tree mirrors public/, the embedded Worker source is
// exactly core + worker-entry, and the entry points are intact.
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'dist-preview');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
  else console.log(`ok - ${message}`);
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

check(await exists(outDir), 'dist-preview exists');
const built = await listFiles(outDir);
const expected = [
  'index.html',
  'en/index.html',
  'styles/app.css',
  'js/app.js',
  'js/controller.mjs',
  'js/core/inspector.mjs',
  'js/worker-source.js',
];
const builtRelative = built.map((file) => path.relative(outDir, file).split(path.sep).join('/')).sort();
check(
  JSON.stringify(builtRelative) === JSON.stringify([...expected].sort()),
  `dist-preview file set matches source (got: ${builtRelative.join(', ')})`,
);

const core = await readFile(path.join(root, 'public/js/core/inspector.mjs'), 'utf8');
const entry = await readFile(path.join(root, 'src/worker-entry.mjs'), 'utf8');
const workerSource = await readFile(path.join(outDir, 'js/worker-source.js'), 'utf8');
const combined = core + '\n' + entry;
check(
  workerSource.includes(`export const WORKER_SOURCE = ${JSON.stringify(combined)};`),
  'worker-source.js embeds exactly core + worker-entry',
);
check(
  workerSource.includes(`// Embedded core sha256: ${sha256(core)}`),
  'worker-source.js records core hash',
);
check(
  workerSource.includes(`// Worker entry sha256: ${sha256(entry)}`),
  'worker-source.js records worker-entry hash',
);

for (const rel of ['index.html', 'en/index.html', 'styles/app.css', 'js/app.js']) {
  const source = await readFile(path.join(root, 'public', rel), 'utf8');
  const generated = await readFile(path.join(outDir, rel), 'utf8');
  check(source === generated, `dist-preview/${rel} is byte-identical to public/${rel}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} generated-preview check(s) failed:`);
  for (const failure of failures) console.error(`  FAIL ${failure}`);
  process.exit(1);
}
console.log('\ngenerated preview checks passed');
