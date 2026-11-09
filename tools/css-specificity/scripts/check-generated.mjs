// Rebuild the same mode into a temporary directory and verify the committed
// dist output matches byte-for-byte (SPEC §5: two clean same-mode builds must
// be byte-identical, and the checked-in generated output must be current).

import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseMode(argv) {
  for (const a of argv) if (a.startsWith('--mode=')) return a.slice('--mode='.length);
  return 'preview';
}
const mode = parseMode(process.argv.slice(2));
if (mode !== 'preview' && mode !== 'production') {
  console.error('check-generated: --mode must be preview or production');
  process.exit(1);
}
const distDir = path.join(root, mode === 'production' ? 'dist-production' : 'dist');

function runBuild(outDir) {
  return new Promise((resolve) => {
    const args = ['scripts/build.mjs', '--mode=' + mode, '--out=' + outDir];
    execFile(process.execPath, args, { cwd: root, env: process.env }, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
  });
}

async function collect(dir, base, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, base, out);
    else out.set(path.relative(base, full), await readFile(full));
  }
  return out;
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'cssspec-gen-'));
try {
  const built = await runBuild(tmp);
  if (built.err) {
    console.error('check-generated: rebuild failed: ' + (built.stderr || built.err.message));
    process.exit(1);
  }
  let existing;
  try {
    existing = await collect(distDir, distDir, new Map());
  } catch {
    console.error('check-generated: ' + path.relative(root, distDir) + '/ does not exist; run the build first');
    process.exit(1);
  }
  const fresh = await collect(tmp, tmp, new Map());
  const problems = [];
  for (const key of new Set([...existing.keys(), ...fresh.keys()])) {
    if (!existing.has(key)) problems.push('missing in dist: ' + key);
    else if (!fresh.has(key)) problems.push('stale extra file in dist: ' + key);
    else if (!existing.get(key).equals(fresh.get(key))) problems.push('byte mismatch: ' + key);
  }
  if (problems.length > 0) {
    console.error('CHECK-GENERATED FAIL (' + problems.length + ')');
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }
  console.log('CHECK-GENERATED PASS ' + mode + ' (' + fresh.size + ' files byte-identical)');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
