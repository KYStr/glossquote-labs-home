// Reproducible preview build: copies public/ to the output directory
// in sorted order, byte for byte, with no timestamps or environment
// data embedded. Running it twice produces byte-identical output.

import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = resolve(PROJECT_ROOT, "public");
export const PREVIEW_ROOT = resolve(PROJECT_ROOT, "preview");

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

export async function buildPreview(outRoot = PREVIEW_ROOT) {
  await rm(outRoot, { recursive: true, force: true });
  const files = await collectFiles(PUBLIC_ROOT);
  for (const src of files) {
    const dest = resolve(outRoot, relative(PUBLIC_ROOT, src));
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
  return files.map((f) => relative(PUBLIC_ROOT, f));
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const files = await buildPreview();
  console.log(`preview built: ${files.length} files -> ${relative(process.cwd(), PREVIEW_ROOT) || PREVIEW_ROOT}`);
}
