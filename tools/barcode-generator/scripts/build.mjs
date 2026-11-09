// Reproducible preview build: copies public/ to preview/ byte for byte in
// sorted path order. Running it twice produces byte-identical output.
// Usage: node scripts/build.mjs [outputDir]
import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export async function collectFiles(root) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const path = join(dir, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) throw new Error(`symlink not allowed in public/: ${path}`);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) out.push(path);
    }
  }
  await walk(root);
  return out;
}

export async function buildPreview(outDir) {
  const publicRoot = join(PROJECT_ROOT, "public");
  const files = await collectFiles(publicRoot);
  await rm(outDir, { recursive: true, force: true });
  for (const file of files) {
    const dest = join(outDir, relative(publicRoot, file));
    await mkdir(join(dest, ".."), { recursive: true });
    await copyFile(file, dest);
  }
  return files.map((f) => relative(publicRoot, f));
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const outDir = process.argv[2] ? resolve(process.argv[2]) : join(PROJECT_ROOT, "preview");
  const written = await buildPreview(outDir);
  console.log(`build:preview wrote ${written.length} files to ${relative(PROJECT_ROOT, outDir) || "."}`);
}
