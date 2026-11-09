// Checks on the generated preview output (dist-preview/).
// Usage: node scripts/check-generated.mjs [--dir <dir>]
// Verifies the preview contains the expected files, the generated
// worker-source module embeds the exact core source and the fixed handler,
// app.js imports resolve inside the preview, and both pages carry the
// noindex meta. Run after `npm run build:preview`.

import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function parseArgs(argv) {
  const args = { dir: 'dist-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dir' && argv[i + 1]) args.dir = argv[i + 1];
  }
  return args;
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files;
}

const { dir } = parseArgs(process.argv.slice(2));
const outDir = path.resolve(root, dir);

async function exists(file) {
  try {
    await stat(path.join(outDir, file));
    return true;
  } catch {
    return false;
  }
}

for (const file of [
  'index.html',
  'en/index.html',
  'js/app.js',
  'js/controller.mjs',
  'js/messages.mjs',
  'js/core/core.mjs',
  'js/worker-source.mjs',
  'styles/app.css',
]) {
  check(await exists(file), `dist-preview: missing ${file}`);
}

const coreSource = await readFile(path.join(root, 'public', 'js', 'core', 'core.mjs'), 'utf8');
const handlerSource = await readFile(path.join(root, 'scripts', 'worker-handler.mjs'), 'utf8');
const workerModule = await readFile(path.join(outDir, 'js', 'worker-source.mjs'), 'utf8');
const expected = `export const WORKER_SOURCE = ${JSON.stringify(`${coreSource}\n${handlerSource}`)};\n`;
check(workerModule === expected, 'dist-preview/js/worker-source.mjs: must embed the exact core + handler bytes');

const appSource = await readFile(path.join(outDir, 'js', 'app.js'), 'utf8');
check(appSource.includes("from './worker-source.mjs'"), 'dist-preview/js/app.js: must import the generated worker source');
check(appSource.includes("from './controller.mjs'"), 'dist-preview/js/app.js: must import the controller');
check(appSource.includes("from './messages.mjs'"), 'dist-preview/js/app.js: must import the messages');

for (const page of ['index.html', 'en/index.html']) {
  const html = await readFile(path.join(outDir, page), 'utf8');
  check(html.includes('name="robots" content="noindex, nofollow"'), `dist-preview/${page}: must carry robots noindex, nofollow`);
  check(!html.includes('rel="canonical"'), `dist-preview/${page}: must not carry a production canonical`);
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  console.log('check:generated:preview: all generated-output checks passed');
}
