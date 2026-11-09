// Verifies that preview/ on disk is exactly what build:preview generates
// from public/: same file set, same SHA-256 per file, no extras, no drift.

import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDir = path.join(toolRoot, 'public');
const outDir = path.join(toolRoot, 'preview');

async function listFiles(dir, base = dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else files.push(path.relative(base, full));
  }
  return files;
}

async function hash(file) {
  return createHash('sha256').update(await readFile(file)).digest('hex');
}

const failures = [];
const sourceFiles = await listFiles(sourceDir);
const previewFiles = await listFiles(outDir);
if (previewFiles === null) {
  failures.push('preview/ does not exist; run npm run build:preview first');
} else {
  const previewSet = new Set(previewFiles);
  for (const rel of sourceFiles) {
    if (!previewSet.has(rel)) {
      failures.push(`missing in preview/: ${rel}`);
    } else if ((await hash(path.join(sourceDir, rel))) !== (await hash(path.join(outDir, rel)))) {
      failures.push(`content differs: ${rel}`);
    }
  }
  const sourceSet = new Set(sourceFiles);
  for (const rel of previewFiles) {
    if (!sourceSet.has(rel)) failures.push(`extra file in preview/: ${rel}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`check:generated:preview FAIL ${failure}`);
  process.exit(1);
}
console.log(`check:generated:preview OK (${sourceFiles.length} files identical)`);
