// Reproducible preview build: copy public/ to dist/preview/ byte for byte.
// The copy walks files in sorted order and writes no timestamps, banners or
// hashes into the output, so running it twice yields byte-identical trees.
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE = join(PROJECT_ROOT, "public");
const TARGET = join(PROJECT_ROOT, "dist", "preview");

export async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(relative(root, path));
    }
  }
  await visit(root);
  return files;
}

export async function buildPreview() {
  const files = await listFiles(SOURCE);
  await rm(TARGET, { recursive: true, force: true });
  for (const file of files) {
    const destination = join(TARGET, file);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(SOURCE, file), destination);
  }
  return files;
}

const invokedDirectly =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  const files = await buildPreview();
  console.log(`build:preview wrote ${files.length} files to dist/preview/`);
}
