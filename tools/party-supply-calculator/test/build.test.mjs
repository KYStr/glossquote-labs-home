// Build tests. Runs the preview build twice into fresh temporary
// directories and compares the sorted per-file SHA-256 lists: the build
// must be byte-identical across runs.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function hashTree(root) {
  const entries = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        const bytes = await readFile(path);
        entries.push(`${relative(root, path)} ${createHash("sha256").update(bytes).digest("hex")}`);
      }
    }
  }
  await walk(root);
  return entries.sort();
}

test("preview build is byte-identical across two runs", async () => {
  const a = await mkdtemp(join(tmpdir(), "party-supply-build-a-"));
  const b = await mkdtemp(join(tmpdir(), "party-supply-build-b-"));
  try {
    for (const out of [a, b]) {
      execFileSync(
        process.execPath,
        [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", out],
        { stdio: "pipe" }
      );
    }
    const hashA = await hashTree(a);
    const hashB = await hashTree(b);
    assert.deepEqual(hashA, hashB);
    assert.ok(hashA.length > 0);
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});

test("built app.js embeds the fixed worker source and drops the token", async () => {
  const out = await mkdtemp(join(tmpdir(), "party-supply-build-c-"));
  try {
    execFileSync(
      process.execPath,
      [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", out],
      { stdio: "pipe" }
    );
    const app = await readFile(join(out, "js/app.js"), "utf8");
    assert.ok(!app.includes("__WORKER_SOURCE__"));
    assert.ok(app.includes("self.onmessage"));
    assert.ok(app.includes("Party Supply Calculator"));
    const worker = await readFile(join(out, "js/core/core.mjs"), "utf8");
    assert.ok(worker.includes("export function run(input)"));
  } finally {
    await rm(out, { recursive: true, force: true });
  }
});
