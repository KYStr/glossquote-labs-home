import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { readFile, readdir, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import { buildProject } from "../scripts/build.mjs";
import { runProjectCheck } from "../scripts/check.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));

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
    assert.ok(firstHashes.has("js/worker-source.js"));
  } finally {
    await rm(scratchOne, { recursive: true, force: true });
    await rm(scratchTwo, { recursive: true, force: true });
  }
});

test("built module Worker runs the fixed core and echoes the generation", async () => {
  const outDir = ".test-worker";
  const scratch = join(PROJECT_ROOT, outDir);
  try {
    await buildProject({ projectPath: PROJECT_ROOT, mode: "preview", outDir, check: false });
    const { WORKER_SOURCE } = await import(pathToFileURL(join(scratch, "js/worker-source.js")));
    const core = await readFile(join(scratch, "js/core/core.mjs"), "utf8");
    const handler = await readFile(join(scratch, "js/worker-handler.mjs"), "utf8");
    assert.equal(WORKER_SOURCE, `${core}\n${handler}`);

    // Node's module thread provides a small adapter for the browser worker globals.
    const moduleSource = `
      import { parentPort } from "node:worker_threads";
      globalThis.self = { postMessage: (data) => parentPort.postMessage(data) };
      ${WORKER_SOURCE}
      parentPort.on("message", (data) => self.onmessage({ data }));
    `;
    const worker = new Worker(new URL(`data:text/javascript;base64,${Buffer.from(moduleSource).toString("base64")}`));
    try {
      const reply = once(worker, "message", { signal: AbortSignal.timeout(5000) });
      worker.postMessage({
        generation: 7,
        snapshot: {
          mode: "shift",
          startDate: "2026-01-09",
          days: "1",
          holidays: "2026-01-12",
        },
      });
      assert.deepEqual(await reply, [{
        generation: 7,
        ok: true,
        result: {
          mode: "shift",
          startDate: "2026-01-09",
          days: 1,
          resultDate: "2026-01-13",
          resultWeekday: 2,
          resultIsBusinessDay: true,
          calendarDaysMoved: 4,
        },
      }]);
    } finally {
      await worker.terminate();
    }
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});

test("unsupported build modes are refused", async () => {
  await assert.rejects(
    () => buildProject({ projectPath: PROJECT_ROOT, mode: "production", check: false }),
    /Unsupported build mode/,
  );
});
