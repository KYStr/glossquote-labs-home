// Verifies the generated preview matches the source tree byte for byte:
// every file under dist-preview/ must equal its public/ counterpart, and no
// extra files may exist. Exit 0 = identical.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(full, base));
    else if (entry.isFile()) files.push(path.relative(base, full));
  }
  return files.sort();
}

const srcFiles = await listFiles(path.join(root, 'public'));
let distFiles;
try {
  distFiles = await listFiles(path.join(root, 'dist-preview'));
} catch {
  console.error('FAIL: dist-preview/ missing; run npm run build:preview first');
  process.exit(1);
}

const failures = [];
if (JSON.stringify(srcFiles) !== JSON.stringify(distFiles)) {
  failures.push(`file lists differ: public has ${srcFiles.length}, dist-preview has ${distFiles.length}`);
}
for (const file of srcFiles) {
  const a = await readFile(path.join(root, 'public', file));
  const b = await readFile(path.join(root, 'dist-preview', file)).catch(() => null);
  if (b === null) {
    failures.push(`missing in dist-preview: ${file}`);
  } else if (!a.equals(b)) {
    failures.push(`bytes differ: ${file}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  process.exit(1);
}
console.log(`check:generated:preview: ${srcFiles.length} files identical`);
