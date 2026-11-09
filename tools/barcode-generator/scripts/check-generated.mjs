// Verifies that preview/ is exactly what a fresh build produces: rebuilds
// into a temporary directory and compares every file byte for byte.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { buildPreview, collectFiles } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const previewRoot = join(PROJECT_ROOT, "preview");

const tempDir = await mkdtemp(join(tmpdir(), "barcode-preview-"));
try {
  await buildPreview(tempDir);
  const fresh = await collectFiles(tempDir);
  const existing = await collectFiles(previewRoot);
  const freshRel = fresh.map((f) => relative(tempDir, f)).sort();
  const existingRel = existing.map((f) => relative(previewRoot, f)).sort();
  if (JSON.stringify(freshRel) !== JSON.stringify(existingRel)) {
    console.error("check:generated:preview FAILED: file lists differ");
    console.error(` fresh:    ${freshRel.join(", ")}`);
    console.error(` existing: ${existingRel.join(", ")}`);
    process.exit(1);
  }
  for (const rel of freshRel) {
    const a = await readFile(join(tempDir, rel));
    const b = await readFile(join(previewRoot, rel));
    if (!a.equals(b)) {
      console.error(`check:generated:preview FAILED: ${rel} differs from a fresh build`);
      process.exit(1);
    }
  }
  console.log(`check:generated:preview passed (${freshRel.length} files byte-identical)`);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
