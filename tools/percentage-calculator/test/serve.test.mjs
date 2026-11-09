// Serve probe: build the preview, serve it on an ephemeral loopback port,
// and verify both language pages, MIME types, security headers, 404 and
// traversal rejection over real HTTP.

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { get } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const toolDir = new URL("..", import.meta.url).pathname;

function fetch(port, path, method = "GET") {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = get({ host: "127.0.0.1", port, path, method }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () =>
        resolvePromise({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        })
      );
    });
    req.on("error", rejectPromise);
  });
}

test("preview server serves both pages and rejects escapes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pct-serve-"));
  execFileSync(
    process.execPath,
    [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", dir],
    { stdio: "pipe" }
  );
  const child = spawn(
    process.execPath,
    [join(toolDir, "scripts/serve.mjs"), "--host", "127.0.0.1", "--port", "0", "--dir", dir],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  try {
    const port = await new Promise((resolvePromise, rejectPromise) => {
      let buffer = "";
      child.stdout.on("data", (chunk) => {
        buffer += chunk;
        const m = buffer.match(/PORT (\d+)/);
        if (m) resolvePromise(Number(m[1]));
      });
      child.on("exit", () => rejectPromise(new Error("server exited early")));
      setTimeout(() => rejectPromise(new Error("server start timeout")), 10000);
    });

    const zh = await fetch(port, "/");
    assert.equal(zh.status, 200);
    assert.match(zh.headers["content-type"], /text\/html/);
    assert.ok(zh.body.includes("<h1>百分比計算機</h1>"));
    assert.match(zh.headers["content-security-policy"], /worker-src blob:/);
    assert.equal(zh.headers["x-robots-tag"], "noindex, nofollow");

    const en = await fetch(port, "/en/");
    assert.equal(en.status, 200);
    assert.ok(en.body.includes("<h1>Percentage Calculator</h1>"));

    const appJs = await fetch(port, "/js/app.js");
    assert.equal(appJs.status, 200);
    assert.match(appJs.headers["content-type"], /text\/javascript/);

    const head = await fetch(port, "/", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body, "");

    const missing = await fetch(port, "/no-such-file.txt");
    assert.equal(missing.status, 404);

    const traversal = await fetch(port, "/..%2f..%2fpackage.json");
    assert.equal(traversal.status, 404);
  } finally {
    child.kill("SIGTERM");
    await rm(dir, { recursive: true, force: true });
  }
});
