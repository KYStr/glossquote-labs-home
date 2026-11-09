// Reproducible preview build: copies public/ to dist/ verbatim (no
// transforms), sorted traversal, so two runs produce byte-identical output.
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'public');
const distDir = join(root, 'dist');

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const files = await listFiles(srcDir);
for (const file of files) {
  const target = join(distDir, relative(srcDir, file));
  await mkdir(dirname(target), { recursive: true });
  await cp(file, target);
}

let manifest = '';
for (const file of await listFiles(distDir)) {
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  manifest += `${hash}  ${relative(distDir, file)}\n`;
}
process.stdout.write(`Built ${files.length} static files into dist.\n`);
process.stdout.write(manifest);
