// Reproducible preview build.
// Usage: node scripts/build.mjs --mode preview [--out <dir>]
// Copies public/ into dist-preview/ (or --out) and generates
// js/worker-source.mjs: a module exporting WORKER_SOURCE, the fixed string
// formed by concatenating the pure core source with the fixed Worker
// message handler. The page creates a module Worker from that string via a
// Blob URL, so the Worker runs exactly the same core the tests import.
// The build is deterministic: no timestamps, no random values, files are
// written in sorted order. Running it twice must produce byte-identical
// output (verified by test/build.test.mjs).

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');

function parseArgs(argv) {
  const args = { mode: 'preview', out: 'dist-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--mode' && argv[i + 1]) args.mode = argv[i + 1];
    if (argv[i] === '--out' && argv[i + 1]) args.out = argv[i + 1];
  }
  return args;
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(full, base));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full));
    }
  }
  return files;
}

async function main() {
  const { mode, out } = parseArgs(process.argv.slice(2));
  if (mode !== 'preview') {
    console.error(`unsupported mode: ${mode}`);
    process.exitCode = 2;
    return;
  }
  const outDir = path.resolve(root, out);

  const coreSource = await readFile(path.join(publicDir, 'js', 'core', 'core.mjs'), 'utf8');
  const handlerSource = await readFile(path.join(root, 'scripts', 'worker-handler.mjs'), 'utf8');
  const workerSource = `export const WORKER_SOURCE = ${JSON.stringify(`${coreSource}\n${handlerSource}`)};\n`;

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(publicDir, outDir, { recursive: true });
  await writeFile(path.join(outDir, 'js', 'worker-source.mjs'), workerSource, 'utf8');

  const files = await listFiles(outDir);
  for (const file of files) {
    const bytes = await readFile(path.join(outDir, file));
    const hash = createHash('sha256').update(bytes).digest('hex');
    console.log(`${hash}  ${file}`);
  }
  console.log(`built ${files.length} files into ${path.relative(root, outDir)}`);
}

await main();
