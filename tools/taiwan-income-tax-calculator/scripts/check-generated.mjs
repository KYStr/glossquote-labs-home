// Verifies dist-preview matches a fresh deterministic rebuild:
// rebuilds into a temporary directory inside the tool root, compares the
// sorted per-file SHA-256 lists, and cleans up.

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const mode = (process.argv.find((a) => a.startsWith('--mode=')) || '--mode=preview').slice('--mode='.length);
if (mode !== 'preview') {
  console.error(`check-generated: unsupported mode "${mode}"`);
  process.exit(1);
}

async function hashTree(dir) {
  const entries = [];
  async function walk(current, base) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const rel = path.join(base, entry.name);
      if (entry.isDirectory()) await walk(path.join(current, entry.name), rel);
      else if (entry.isFile()) {
        const bytes = await readFile(path.join(current, entry.name));
        entries.push(`${rel.split(path.sep).join('/')}  ${createHash('sha256').update(bytes).digest('hex')}`);
      }
    }
  }
  await walk(dir, '');
  return entries.sort();
}

const distDir = path.join(root, 'dist-preview');
const tmpDir = path.join(root, '.generated-check');
await rm(tmpDir, { recursive: true, force: true });
try {
  await run(process.execPath, [path.join(root, 'scripts/build.mjs'), '--mode', 'preview', '--out', tmpDir], { cwd: root });
  const expected = await hashTree(tmpDir);
  let actual;
  try {
    actual = await hashTree(distDir);
  } catch {
    console.error('check-generated: dist-preview is missing; run npm run build:preview first');
    process.exit(1);
  }
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error('check-generated: dist-preview does not match a fresh build');
    console.error(`expected:\n${expected.join('\n')}`);
    console.error(`actual:\n${actual.join('\n')}`);
    process.exit(1);
  }
  console.log(`check-generated: dist-preview matches fresh build (${expected.length} files)`);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
