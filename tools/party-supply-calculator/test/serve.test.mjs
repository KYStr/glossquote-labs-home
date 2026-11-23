// Serve tests. Builds a fresh preview into a temporary directory, serves
// it on a loopback ephemeral port, and checks MIME, security headers, 404
// and traversal rejection over real HTTP. No browser involved.

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("serve: pages, MIME, CSP, 404 and traversal", async () => {
  const out = await mkdtemp(join(tmpdir(), "party-supply-serve-"));
  execFileSync(
    process.execPath,
    [join(toolDir, "scripts/build.mjs"), "--mode", "preview", "--out", out],
    { stdio: "pipe" }
  );
  const child = spawn(
    process.execPath,
    [
      join(toolDir, "scripts/serve.mjs"),
      "--host", "127.0.0.1",
      "--port", "0",
      "--dir", out,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  try {
    const port = await new Promise((resolvePort, reject) => {
      let buf = "";
      const timer = setTimeout(() => reject(new Error("serve did not print PORT")), 10000);
      child.stdout.on("data", (chunk) => {
        buf += chunk;
        const m = buf.match(/^PORT (\d+)/m);
        if (m) {
          clearTimeout(timer);
          resolvePort(Number(m[1]));
        }
      });
      child.on("error", reject);
    });
    const base = `http://127.0.0.1:${port}`;

    const zh = await fetch(`${base}/`);
    assert.equal(zh.status, 200);
    assert.match(zh.headers.get("content-type"), /text\/html/);
    assert.match(
      zh.headers.get("content-security-policy"),
      /default-src 'none'/
    );
    assert.equal(zh.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.ok((await zh.text()).includes("派對採購試算"));

    const enPage = await fetch(`${base}/en/index.html`);
    assert.equal(enPage.status, 200);
    assert.ok((await enPage.text()).includes("Party Supply Calculator"));

    const css = await fetch(`${base}/styles/app.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type"), /text\/css/);

    const head = await fetch(`${base}/`, { method: "HEAD" });
    assert.equal(head.status, 200);

    assert.equal((await fetch(`${base}/no-such-page.html`)).status, 404);
    assert.equal((await fetch(`${base}/..%2f..%2fpackage.json`)).status, 404);
    assert.equal((await fetch(`${base}/js/app.js`)).status, 200);
  } finally {
    child.kill();
    await rm(out, { recursive: true, force: true });
  }
});
