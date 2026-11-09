// Build tests: the preview build is reproducible (two runs, byte-identical
// trees) and the generated tree passes check:generated:preview.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles } from "../scripts/build.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = join(ROOT, "dist", "preview");

async function hashTree() {
  const files = await listFiles(DIST);
  const hashes = {};
  for (const file of files) {
    const bytes = await readFile(join(DIST, file));
    hashes[file] = createHash("sha256").update(bytes).digest("hex");
  }
  return hashes;
}

test("preview build is byte-identical across two runs and matches public/", async () => {
  execFileSync("node", ["scripts/build.mjs"], { cwd: ROOT, stdio: "pipe" });
  const first = await hashTree();
  execFileSync("node", ["scripts/build.mjs"], { cwd: ROOT, stdio: "pipe" });
  const second = await hashTree();
  assert.deepEqual(second, first);
  execFileSync("node", ["scripts/check-generated.mjs"], { cwd: ROOT, stdio: "pipe" });
});
