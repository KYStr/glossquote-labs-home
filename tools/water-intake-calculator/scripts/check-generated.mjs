// Rebuild preview into a temporary directory and verify the committed dist/
// and BUILD-MANIFEST.json match the fresh build byte-for-byte.

import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

function runBuild(outDir, manifestPath) {
  return new Promise((resolve) => {
    execFile(process.execPath,
      ['scripts/build.mjs', '--mode=preview', '--out=' + outDir, '--manifest=' + manifestPath],
      { cwd: root, env: process.env },
      (err, stdout, stderr) => resolve({ err, stdout, stderr }));
  });
}

async function collect(dir, base, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full, base, out);
    else out.set(path.relative(base, full).split(path.sep).join('/'), await readFile(full));
  }
  return out;
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'water-intake-gen-'));
try {
  const tmpDist = path.join(tmp, 'dist');
  const tmpManifest = path.join(tmp, 'BUILD-MANIFEST.json');
  const built = await runBuild(tmpDist, tmpManifest);
  if (built.err) {
    console.error('check-generated: rebuild failed: ' + (built.stderr || built.err.message));
    process.exit(1);
  }
  let existing;
  try {
    existing = await collect(distDir, distDir, new Map());
  } catch {
    console.error('check-generated: dist/ does not exist; run npm run build:preview first');
    process.exit(1);
  }
  const fresh = await collect(tmpDist, tmpDist, new Map());
  const problems = [];
  for (const key of new Set([...existing.keys(), ...fresh.keys()])) {
    if (!existing.has(key)) problems.push('missing in dist: ' + key);
    else if (!fresh.has(key)) problems.push('stale extra file in dist: ' + key);
    else if (!existing.get(key).equals(fresh.get(key))) problems.push('byte mismatch: ' + key);
  }
  const manifestExisting = await readFile(path.join(root, 'BUILD-MANIFEST.json'));
  const manifestFresh = await readFile(tmpManifest);
  if (!manifestExisting.equals(manifestFresh)) problems.push('byte mismatch: BUILD-MANIFEST.json');
  if (problems.length > 0) {
    console.error('CHECK-GENERATED FAIL (' + problems.length + ')');
    for (const p of problems) console.error(' - ' + p);
    process.exit(1);
  }
  console.log('CHECK-GENERATED PASS preview (' + fresh.size + ' files byte-identical)');
} finally {
  await rm(tmp, { recursive: true, force: true });
}
