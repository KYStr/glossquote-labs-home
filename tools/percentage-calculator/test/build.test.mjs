// Build reproducibility: two builds produce identical per-file SHA-256
// lists, the Worker source is embedded (token replaced), and the embedded
// Worker module actually answers a calculation end to end.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";

const toolDir = new URL("..", import.meta.url).pathname;

async function buildTo(dir) {
  execFileSync(
    process.execPath,
    [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", dir],
    { stdio: "pipe" }
  );
}

async function hashTree(root) {
  const entries = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else {
        const bytes = await readFile(path);
        entries.push(
          `${relative(root, path)} ${createHash("sha256").update(bytes).digest("hex")}`
        );
      }
    }
  }
  await walk(root);
  return entries.sort();
}

test("two builds are byte-identical and embed the worker source", async () => {
  const a = await mkdtemp(join(tmpdir(), "pct-build-a-"));
  const b = await mkdtemp(join(tmpdir(), "pct-build-b-"));
  try {
    await buildTo(a);
    await buildTo(b);
    const [hashA, hashB] = [await hashTree(a), await hashTree(b)];
    assert.deepEqual(hashA, hashB);
    assert.ok(hashA.some((line) => line.startsWith("index.html ")));
    assert.ok(hashA.some((line) => line.startsWith("en/index.html ")));
    const appJs = await readFile(join(a, "js/app.js"), "utf8");
    assert.ok(!appJs.includes("__WORKER_SOURCE__"), "token must be replaced");
    assert.ok(appJs.includes("self.onmessage"), "worker handler embedded");
    assert.ok(appJs.includes("DIVISION_BY_ZERO"), "core embedded");
  } finally {
    await rm(a, { recursive: true, force: true });
    await rm(b, { recursive: true, force: true });
  }
});

test("the embedded worker source runs the core end to end", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pct-worker-"));
  try {
    await buildTo(dir);
    const appJs = await readFile(join(dir, "js/app.js"), "utf8");
    const match = appJs.match(/const WORKER_SOURCE = ("(?:[^"\\]|\\.)*");/);
    assert.ok(match, "worker source literal present");
    const workerSource = JSON.parse(match[1]);
    const workerPath = join(dir, "worker-under-test.mjs");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(workerPath, workerSource, "utf8");
    // Emulate the web Worker global the fixed handler expects, then drive
    // one message through the exact embedded bytes.
    const posted = [];
    globalThis.self = { postMessage: (message) => posted.push(message) };
    try {
      await import(workerPath);
      assert.equal(typeof globalThis.self.onmessage, "function");
      globalThis.self.onmessage({
        data: { generation: 7, input: { mode: "share", first: "2", second: "3" } },
      });
    } finally {
      delete globalThis.self;
    }
    assert.deepEqual(posted, [
      {
        generation: 7,
        outcome: {
          ok: true,
          result: { mode: "share", value: "66.6666666667", display: "66.67", direction: null },
        },
      },
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
