// Reproducible preview build: copies public/ to dist-preview/ in sorted
// path order, byte-for-byte, with no timestamps or generated content.
// Running it twice produces byte-identical output.
import { cpSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public");
const dst = join(root, "dist-preview");
rmSync(dst, { recursive: true, force: true });
const entries = readdirSync(src, { recursive: true, withFileTypes: true })
  .filter((e) => e.isFile())
  .map((e) => join(e.parentPath, e.name))
  .sort();
for (const file of entries) {
  const rel = file.slice(src.length + 1);
  cpSync(file, join(dst, rel));
}
console.log(`build:preview wrote ${entries.length} files to dist-preview/`);
