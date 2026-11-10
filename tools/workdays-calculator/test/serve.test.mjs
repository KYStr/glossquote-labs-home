import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildProject } from "../scripts/build.mjs";
import { createStaticServer } from "../scripts/serve.mjs";

const PROJECT_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVE_DIR = ".test-serve";

async function withServer(fn) {
  await buildProject({ projectPath: PROJECT_ROOT, mode: "preview", outDir: SERVE_DIR, check: false });
  const server = createStaticServer({ root: join(PROJECT_ROOT, SERVE_DIR) });
  await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
    await rm(join(PROJECT_ROOT, SERVE_DIR), { recursive: true, force: true });
  }
}

test("serves both language pages with pinned MIME and security headers", async () => {
  await withServer(async (base) => {
    const zh = await fetch(`${base}/index.html`);
    assert.equal(zh.status, 200);
    assert.equal(zh.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(zh.headers.get("x-content-type-options"), "nosniff");
    assert.equal(zh.headers.get("referrer-policy"), "no-referrer");
    assert.equal(zh.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.ok(zh.headers.get("content-security-policy").includes("default-src 'none'"));
    assert.ok(zh.headers.get("content-security-policy").includes("worker-src blob:"));
    assert.ok(zh.headers.get("content-security-policy").includes("connect-src 'none'"));
    assert.ok((await zh.text()).includes('<html lang="zh-Hant">'));

    const en = await fetch(`${base}/en/index.html`);
    assert.equal(en.status, 200);
    assert.ok((await en.text()).includes('<html lang="en">'));

    const css = await fetch(`${base}/styles/app.css`);
    assert.equal(css.status, 200);
    assert.equal(css.headers.get("content-type"), "text/css; charset=utf-8");

    const js = await fetch(`${base}/js/app.js`);
    assert.equal(js.status, 200);
    assert.equal(js.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert.match(await js.text(), /new Worker\(url, \{ type: "module" \}\)/);

    const workerSource = await fetch(`${base}/js/worker-source.js`);
    assert.equal(workerSource.status, 200);
    assert.equal(workerSource.headers.get("content-type"), "text/javascript; charset=utf-8");
    assert.match(await workerSource.text(), /export const WORKER_SOURCE = /);
  });
});

test("HEAD works, unknown paths 404, traversal is refused, POST is 405", async () => {
  await withServer(async (base) => {
    const head = await fetch(`${base}/index.html`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");

    const missing = await fetch(`${base}/nope.html`);
    assert.equal(missing.status, 404);

    const traversal = await fetch(`${base}/../package.json`);
    assert.ok([400, 403, 404].includes(traversal.status));

    const encodedTraversal = await fetch(`${base}/%2e%2e/package.json`);
    assert.ok([400, 403, 404].includes(encodedTraversal.status));

    const post = await fetch(`${base}/index.html`, { method: "POST" });
    assert.equal(post.status, 405);
  });
});
