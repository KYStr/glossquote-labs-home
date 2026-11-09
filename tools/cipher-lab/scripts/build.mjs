// Reproducible preview build: copies public/ to dist-preview/ in sorted
// order, byte for byte. Running it twice produces identical output.
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = join(root, "public");
const outDir = join(root, "dist-preview");

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

const files = await collect(sourceDir);
await rm(outDir, { recursive: true, force: true });
for (const file of files) {
  const dest = join(outDir, relative(sourceDir, file));
  await mkdir(dirname(dest), { recursive: true });
  await copyFile(file, dest);
}
console.log(`build:preview wrote ${files.length} files to dist-preview/`);
