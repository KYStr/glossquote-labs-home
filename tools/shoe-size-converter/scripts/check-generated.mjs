// Verify dist-preview/ is exactly what the build should have produced:
// every file byte-identical to its public/ source, the manifest's hashes
// match the files on disk, and both preview pages exist with noindex set.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(toolRoot, "dist-preview");
const failures = [];

if (!existsSync(path.join(outDir, "BUILD-MANIFEST.json"))) {
  console.error("check:generated:preview FAILED — dist-preview/BUILD-MANIFEST.json missing; run npm run build:preview first");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(path.join(outDir, "BUILD-MANIFEST.json"), "utf8")).files;

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}

const onDisk = listFiles(outDir).filter((rel) => rel !== "BUILD-MANIFEST.json");
const listed = Object.keys(manifest).sort();
if (JSON.stringify(onDisk.sort()) !== JSON.stringify(listed)) {
  failures.push(`file set mismatch: disk [${onDisk}] vs manifest [${listed}]`);
}
for (const rel of listed) {
  const distBytes = readFileSync(path.join(outDir, rel));
  const hash = createHash("sha256").update(distBytes).digest("hex");
  if (hash !== manifest[rel]) failures.push(`${rel}: hash differs from manifest`);
  const srcPath = path.join(toolRoot, "public", rel);
  if (!existsSync(srcPath) || !readFileSync(srcPath).equals(distBytes)) {
    failures.push(`${rel}: differs from public/ source`);
  }
}
for (const rel of ["index.html", "en/index.html"]) {
  const file = path.join(outDir, rel);
  if (!existsSync(file)) failures.push(`${rel}: missing from preview`);
  else if (!readFileSync(file, "utf8").includes('content="noindex, nofollow"')) {
    failures.push(`${rel}: preview noindex missing`);
  }
}

if (failures.length > 0) {
  console.error(`check:generated:preview FAILED (${failures.length}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check:generated:preview ok — ${listed.length} generated files verified against sources and manifest`);
