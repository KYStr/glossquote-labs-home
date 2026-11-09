import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { buildProject } from "../scripts/build.mjs";
import { runProjectCheck } from "../scripts/check.mjs";

const PROJECT_ROOT = new URL("..", import.meta.url).pathname;

async function hashTree(root) {
  const entries = new Map();
  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const path = join(directory, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.isFile()) {
        const bytes = await readFile(path);
        entries.set(
          relative(root, path).split(/[\\/]/).join("/"),
          createHash("sha256").update(bytes).digest("hex"),
        );
      }
    }
  }
  await visit(root);
  return entries;
}

test("project check passes on the candidate sources", async () => {
  const report = await runProjectCheck(PROJECT_ROOT);
  assert.deepStrictEqual(report.failures, []);
  assert.equal(report.ok, true);
});

test("preview build is reproducible: two builds are byte-identical", async () => {
  const scratchOne = join(PROJECT_ROOT, ".test-build-one");
  const scratchTwo = join(PROJECT_ROOT, ".test-build-two");
  try {
    const first = await buildProject({
      projectPath: PROJECT_ROOT,
      mode: "preview",
      outDir: ".test-build-one",
      check: false,
    });
    const second = await buildProject({
      projectPath: PROJECT_ROOT,
      mode: "preview",
      outDir: ".test-build-two",
      check: false,
    });
    assert.equal(first.fileCount, second.fileCount);
    const firstHashes = await hashTree(first.outputPath);
    const secondHashes = await hashTree(second.outputPath);
    assert.deepStrictEqual([...firstHashes.entries()], [...secondHashes.entries()]);
    assert.ok(firstHashes.has("index.html"));
    assert.ok(firstHashes.has("en/index.html"));
    assert.ok(firstHashes.has("js/app.js"));
    assert.ok(firstHashes.has("js/core/core.mjs"));
  } finally {
    await rm(scratchOne, { recursive: true, force: true });
    await rm(scratchTwo, { recursive: true, force: true });
  }
});

test("unsupported build modes are refused", async () => {
  await assert.rejects(
    () => buildProject({ projectPath: PROJECT_ROOT, mode: "production", check: false }),
    /Unsupported build mode/,
  );
});
