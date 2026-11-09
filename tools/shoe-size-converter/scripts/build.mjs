// Reproducible preview build: verify the data gate, then copy public/ to
// dist-preview/ verbatim (sorted walk, no timestamps or host data embedded)
// and write a content-hash manifest. Running it twice produces byte-identical
// output.

import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyDataGate } from "./gate.mjs";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(toolRoot, "public");
const outDir = path.join(toolRoot, "dist-preview");

const gate = await verifyDataGate(toolRoot);
if (!gate.ok) {
  console.error("build: data gate failed");
  for (const p of gate.problems) console.error(`  - ${p}`);
  process.exit(1);
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const manifest = {};
for (const rel of listFiles(srcDir)) {
  const from = path.join(srcDir, rel);
  const to = path.join(outDir, rel);
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to);
  manifest[rel] = createHash("sha256").update(readFileSync(to)).digest("hex");
}
writeFileSync(
  path.join(outDir, "BUILD-MANIFEST.json"),
  `${JSON.stringify({ files: manifest }, null, 2)}\n`,
);

console.log(`build:preview ok — ${Object.keys(manifest).length} files copied to dist-preview/`);
console.log(`data gate ok — adult ${gate.record.adultRows} rows, kids ${gate.record.kidsRows} rows, sha256 ${gate.actualSha}`);
