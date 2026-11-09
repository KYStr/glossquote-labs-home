// Reproducible preview build: copies public/ into dist-preview/ in sorted
// order and writes a manifest of SHA-256 hashes. No timestamps or absolute
// paths are embedded, so running the build twice on the same sources
// produces byte-identical output.
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = resolve(ROOT, "public");
const OUT = resolve(ROOT, "dist-preview");

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full, base)));
    else if (entry.isFile()) files.push(relative(base, full));
  }
  return files;
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp(SRC, OUT, { recursive: true });

const files = await listFiles(OUT);
const manifest = { files: [] };
for (const rel of files) {
  if (rel === "BUILD-MANIFEST.json") continue;
  const bytes = await readFile(resolve(OUT, rel));
  manifest.files.push({
    path: rel.split("\\").join("/"),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  resolve(OUT, "BUILD-MANIFEST.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);
console.log(`build:preview wrote ${manifest.files.length} files to dist-preview/`);
