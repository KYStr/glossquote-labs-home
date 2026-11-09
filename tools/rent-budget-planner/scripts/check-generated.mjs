// Verifies the generated preview: builds twice into temporary directories and
// compares every file byte for byte; also compares against dist-preview/
// when it exists. Proves the build is reproducible.

import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPreview } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function manifest(root) {
  const entries = new Map();
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const bytes = await readFile(full);
        entries.set(relative(root, full), createHash("sha256").update(bytes).digest("hex"));
      }
    }
  }
  await walk(root);
  return entries;
}

function compare(a, b, labelA, labelB) {
  const problems = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    if (!a.has(key)) problems.push(key + " missing from " + labelA);
    else if (!b.has(key)) problems.push(key + " missing from " + labelB);
    else if (a.get(key) !== b.get(key)) problems.push(key + " differs between " + labelA + " and " + labelB);
  }
  return problems;
}

const tmpA = await mkdtemp(join(tmpdir(), "rbp-a-"));
const tmpB = await mkdtemp(join(tmpdir(), "rbp-b-"));
try {
  await buildPreview(tmpA);
  await buildPreview(tmpB);
  const problems = compare(await manifest(tmpA), await manifest(tmpB), "build A", "build B");
  const distPreview = resolve(PROJECT_ROOT, "dist-preview");
  try {
    const distManifest = await manifest(distPreview);
    problems.push(...compare(await manifest(tmpA), distManifest, "fresh build", "dist-preview"));
  } catch {
    // dist-preview does not exist yet; reproducibility across the two fresh
    // builds above is the required evidence.
  }
  if (problems.length > 0) {
    for (const problem of problems) console.error("GENERATED CHECK FAIL: " + problem);
    process.exit(1);
  }
  console.log("check:generated:preview: builds are byte-identical.");
} finally {
  await rm(tmpA, { recursive: true, force: true });
  await rm(tmpB, { recursive: true, force: true });
}
