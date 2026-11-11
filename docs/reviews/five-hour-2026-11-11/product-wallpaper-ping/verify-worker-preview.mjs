import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const root = resolve(process.argv[2] ?? ".");
const loopback = "127.0.0.1";
const casesBySlug = {
  "wallpaper-calculator": [
    "openings-list-deduction",
    "partial-height-opening-full-strips",
    "opening-height-exceeds-wall",
    "opening-height-equals-wall",
    "first-opening-height-before-aggregate-and-roll",
    "opening-width-format-before-height-cross-check",
  ],
  "ping-area-converter": ["hundred-ping-precision", "example-thirty-ping"],
};

async function checkWorker(directory, ids) {
  const fixtures = JSON.parse(await readFile(resolve(directory, "test/fixtures.json"), "utf8"));
  const workerPath = resolve(directory, "dist-preview/js/worker-source.js");
  const { WORKER_SOURCE } = await import(pathToFileURL(workerPath).href);
  const bridge = [
    'import {parentPort} from "node:worker_threads";',
    "globalThis.self = { postMessage: (message) => parentPort.postMessage(message) };",
    WORKER_SOURCE,
    "parentPort.on('message', (data) => self.onmessage({ data }));",
  ].join("\n");
  const worker = new Worker(new URL("data:text/javascript;base64," + Buffer.from(bridge).toString("base64")));
  try {
    for (const [index, id] of ids.entries()) {
      const entry = fixtures.cases.find((value) => value.id === id);
      assert.ok(entry, id);
      const generation = index + 1;
      const reply = once(worker, "message", { signal: AbortSignal.timeout(5000) });
      worker.postMessage({ generation, snapshot: entry.input });
      assert.deepEqual((await reply)[0], { generation, ...entry.expected }, id);
    }
  } finally {
    await worker.terminate();
  }
  return { vectors: ids, status: "PASS" };
}

async function availablePort() {
  const server = createServer();
  const listening = once(server, "listening", { signal: AbortSignal.timeout(5000) });
  server.listen(0, loopback);
  await listening;
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  return port;
}

async function checkPreview(directory) {
  const port = await availablePort();
  const origin = "http://" + loopback + ":" + port;
  const child = spawn(process.execPath, ["scripts/serve.mjs", "--host", loopback, "--port", String(port)], {
    cwd: directory,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (bytes) => { stdout += bytes; });
  child.stderr.on("data", (bytes) => { stderr += bytes; });
  const closed = new Promise((done) => child.once("close", done));
  const signal = AbortSignal.timeout(8000);
  try {
    while (!stdout.includes("(loopback only)")) {
      if (child.exitCode !== null) throw Error("Preview terminated: " + stderr);
      await once(child.stdout, "data", { signal });
    }
    const routes = [
      ["/", "index.html", "zh-Hant"],
      ["/en/", "en/index.html", "en"],
      ["/js/worker-source.js", "js/worker-source.js", null],
    ];
    for (const [route, file, lang] of routes) {
      const res = await fetch(origin + route, { signal, redirect: "error" });
      assert.equal(res.status, 200, route);
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal(res.headers.get("x-content-type-options"), "nosniff");
      assert.equal(res.headers.get("set-cookie"), null);
      const csp = res.headers.get("content-security-policy");
      assert.ok(csp?.includes("connect-src 'none'"));
      assert.ok(csp?.includes("worker-src blob:"));
      assert.ok(csp?.includes("frame-ancestors 'none'"));
      const actual = Buffer.from(await res.arrayBuffer());
      assert.deepEqual(actual, await readFile(resolve(directory, "dist-preview", file)));
      if (lang) {
        assert.ok(actual.toString("utf8").includes('lang="' + lang + '"'));
        assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/i);
      }
    }
    const post = await fetch(origin + "/", { method: "POST", signal });
    assert.equal(post.status, 405);
    await post.arrayBuffer();
    return { routes: routes.map(([route]) => route), rejectsPost: true, status: "PASS" };
  } finally {
    if (child.exitCode === null) child.kill();
    await closed;
  }
}

const checks = [];
for (const [slug, ids] of Object.entries(casesBySlug)) {
  const directory = resolve(root, "tools", slug);
  checks.push({ slug, worker: await checkWorker(directory, ids), preview: await checkPreview(directory) });
}
console.log(JSON.stringify({ node: process.version, scope: "Node Worker and loopback HTTP only", checks }, null, 2));
