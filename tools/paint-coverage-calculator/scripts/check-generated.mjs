// Verifies that dist-preview/ is exactly what a fresh build produces:
// rebuilds into a temporary directory and compares the file sets and every
// file's bytes. Exits non-zero on any difference.

import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildPreview, listFiles, DEFAULT_DEST } from './build.mjs';

const tmp = await mkdtemp(path.join(os.tmpdir(), 'paint-preview-'));
try {
  await buildPreview(tmp);
  const fresh = await listFiles(tmp);
  let committed = [];
  try {
    committed = await listFiles(DEFAULT_DEST);
  } catch {
    console.error('check:generated:preview: FAIL — dist-preview/ is missing; run npm run build:preview');
    process.exit(1);
  }
  const problems = [];
  if (JSON.stringify(fresh) !== JSON.stringify(committed)) {
    problems.push(`file sets differ (fresh ${fresh.length}, dist-preview ${committed.length})`);
  }
  for (const rel of fresh) {
    if (!committed.includes(rel)) continue;
    const [a, b] = await Promise.all([
      readFile(path.join(tmp, rel)),
      readFile(path.join(DEFAULT_DEST, rel)),
    ]);
    if (!a.equals(b)) problems.push(`bytes differ: ${rel}`);
  }
  if (problems.length > 0) {
    console.error('check:generated:preview: FAIL');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  console.log(`check:generated:preview: OK — dist-preview matches a fresh build (${fresh.length} files, byte-identical)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
