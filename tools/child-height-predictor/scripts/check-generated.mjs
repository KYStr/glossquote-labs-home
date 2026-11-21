// Verifies dist-preview matches a fresh build byte for byte: rebuilds into
// a temporary directory and compares the sorted per-file SHA-256 lists, then
// verifies BUILD-MANIFEST.json describes dist-preview exactly.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(toolDir, "dist-preview");

async function hashTree(root) {
  const entries = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        const bytes = await readFile(path);
        const hash = createHash("sha256").update(bytes).digest("hex");
        entries.push(`${relative(root, path)} ${hash}`);
      }
    }
  }
  await walk(root);
  return entries.sort();
}

const tmp = await mkdtemp(join(tmpdir(), "child-height-predictor-build-"));
try {
  execFileSync(
    process.execPath,
    [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", tmp],
    { stdio: "pipe" }
  );
  const fresh = await hashTree(tmp);
  const existing = await hashTree(distDir);
  if (JSON.stringify(fresh) !== JSON.stringify(existing)) {
    console.error("check-generated: dist-preview differs from a fresh build");
    const freshSet = new Set(fresh);
    const existingSet = new Set(existing);
    for (const line of fresh) if (!existingSet.has(line)) console.error(`  only in fresh build: ${line}`);
    for (const line of existing) if (!freshSet.has(line)) console.error(`  only in dist-preview: ${line}`);
    process.exit(1);
  }
  console.log(`check-generated: dist-preview matches fresh build (${fresh.length} files)`);
  // BUILD-MANIFEST.json must describe dist-preview exactly (path, bytes, sha256).
  const manifest = JSON.parse(await readFile(join(toolDir, "BUILD-MANIFEST.json"), "utf8"));
  if (manifest.mode !== "preview") {
    console.error("check-generated: BUILD-MANIFEST.json mode is not preview");
    process.exit(1);
  }
  const distEntries = [];
  for (const line of existing) {
    const [path, hash] = line.split(" ");
    const bytes = await stat(join(distDir, path));
    distEntries.push(`${path} ${hash} ${bytes.size}`);
  }
  const manifestLines = manifest.files
    .map((f) => `${f.path} ${f.sha256} ${f.bytes}`)
    .sort();
  if (JSON.stringify(manifestLines) !== JSON.stringify(distEntries.sort())) {
    console.error("check-generated: BUILD-MANIFEST.json does not match dist-preview");
    process.exit(1);
  }
  console.log(`check-generated: BUILD-MANIFEST.json matches dist-preview (${manifest.files.length} files)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
