// Verifies dist-preview/ is exactly what a fresh preview build produces:
// rebuilds into a temporary directory and compares every file byte-for-byte.

import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist-preview');

async function listFiles(dir, base = dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return null; }
  const files = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await listFiles(p, base));
    else files.push(path.relative(base, p));
  }
  return files;
}

const tmp = await mkdtemp(path.join(tmpdir(), 'contrast-checker-build-'));
try {
  await run(process.execPath, [path.join(root, 'scripts/build.mjs'), '--out', tmp]);
  const fresh = await listFiles(tmp);
  const existing = await listFiles(dist);
  if (!existing) {
    console.error('check:generated:preview FAIL - dist-preview/ missing; run npm run build:preview');
    process.exit(1);
  }
  const problems = [];
  if (JSON.stringify(fresh) !== JSON.stringify(existing)) {
    problems.push(`file list differs: fresh=${fresh.join(',')} existing=${existing.join(',')}`);
  } else {
    for (const rel of fresh) {
      const [a, b] = await Promise.all([readFile(path.join(tmp, rel)), readFile(path.join(dist, rel))]);
      if (!a.equals(b)) problems.push(`byte difference: ${rel}`);
    }
  }
  if (problems.length) {
    console.error('check:generated:preview FAIL\n' + problems.join('\n'));
    process.exit(1);
  }
  console.log(`check:generated:preview OK - ${fresh.length} files byte-identical to a fresh build`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
