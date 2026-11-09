// Reproducible preview build: copies public/ into dist-preview/.
// No timestamps or generated content are embedded, so running the build
// twice produces byte-identical output.
import { cp, mkdir, rm, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'public');
const outDir = path.join(root, 'dist-preview');

const mode = process.argv.includes('--mode')
  ? process.argv[process.argv.indexOf('--mode') + 1]
  : 'preview';
if (mode !== 'preview') {
  console.error(`unsupported mode: ${mode}`);
  process.exit(2);
}

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(full, base));
    } else if (entry.isFile()) {
      files.push(path.relative(base, full));
    }
  }
  return files.sort();
}

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(srcDir, outDir, { recursive: true });

const files = await listFiles(outDir);
for (const file of files) {
  const info = await stat(path.join(outDir, file));
  if (!info.isFile()) throw new Error(`unexpected non-file in output: ${file}`);
}
console.log(`build:preview: ${files.length} files -> dist-preview/`);
