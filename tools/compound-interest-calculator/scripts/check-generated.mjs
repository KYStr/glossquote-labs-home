// Verifies dist-preview/ matches a fresh regeneration byte-for-byte.
// Run `npm run build:preview` first. Exits non-zero on any drift.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewDir = path.join(toolDir, 'dist-preview');

async function treeHashes(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const map = new Map();
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of await treeHashes(full, base)) map.set(k, v);
    } else if (entry.isFile()) {
      const bytes = await readFile(full);
      map.set(
        path.relative(base, full).split(path.sep).join('/'),
        createHash('sha256').update(bytes).digest('hex'),
      );
    }
  }
  return map;
}

const tmp = await mkdtemp(path.join(os.tmpdir(), 'gq-cic-check-'));
try {
  execFileSync(process.execPath, [path.join(toolDir, 'scripts/build.mjs'), '--dest', tmp], { stdio: 'pipe' });
  let expected;
  try {
    expected = await treeHashes(previewDir);
  } catch {
    console.error('check:generated:preview FAIL - dist-preview/ is missing; run npm run build:preview first');
    process.exit(1);
  }
  const fresh = await treeHashes(tmp);
  const problems = [];
  for (const key of new Set([...expected.keys(), ...fresh.keys()])) {
    if (!expected.has(key)) problems.push(`unexpected generated file: ${key}`);
    else if (!fresh.has(key)) problems.push(`missing generated file: ${key}`);
    else if (expected.get(key) !== fresh.get(key)) problems.push(`content drift: ${key}`);
  }
  if (problems.length > 0) {
    console.error('check:generated:preview FAIL');
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log(`check:generated:preview PASS (${fresh.size} files byte-identical to a fresh build)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
