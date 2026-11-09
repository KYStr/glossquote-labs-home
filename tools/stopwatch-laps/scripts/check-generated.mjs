// Verifies the committed preview/ output is exactly what the build
// produces from the current public/ sources: rebuilds into a temp
// directory and byte-compares the two trees.

import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { PREVIEW_ROOT, buildPreview } from "./build.mjs";

async function collectFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(full, base)));
    else if (entry.isFile()) files.push(relative(base, full));
  }
  return files;
}

const tmp = await mkdtemp(resolve(tmpdir(), "stopwatch-preview-"));
try {
  const freshRoot = resolve(tmp, "preview");
  await buildPreview(freshRoot);
  const expected = await collectFiles(freshRoot);
  let actual;
  try {
    actual = await collectFiles(PREVIEW_ROOT);
  } catch {
    console.error("check:generated:preview FAIL - preview/ is missing; run npm run build:preview");
    process.exit(1);
  }
  const problems = [];
  for (const rel of new Set([...expected, ...actual])) {
    if (!expected.includes(rel)) problems.push(`extra in preview/: ${rel}`);
    else if (!actual.includes(rel)) problems.push(`missing in preview/: ${rel}`);
    else {
      const [a, b] = await Promise.all([
        readFile(resolve(freshRoot, rel)),
        readFile(resolve(PREVIEW_ROOT, rel)),
      ]);
      if (!a.equals(b)) problems.push(`differs: ${rel}`);
    }
  }
  if (problems.length > 0) {
    console.error("check:generated:preview FAIL");
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check:generated:preview PASS (${expected.length} files byte-identical)`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
