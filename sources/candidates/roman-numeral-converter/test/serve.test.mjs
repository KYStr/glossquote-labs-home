import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { request } from "node:http";
import test from "node:test";

import { createStaticServer } from "../scripts/serve.mjs";

const EXPECTED_CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function probe(base, route, method = "GET") {
  return new Promise((resolvePromise, rejectPromise) => {
    const req = request(`${base}${route}`, { method }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolvePromise({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on("error", rejectPromise);
    req.end();
  });
}

async function withServer(run) {
  const server = createStaticServer();
  await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(base);
  } finally {
    await new Promise((resolvePromise) => server.close(resolvePromise));
  }
}

test("the preview server serves both pages with the house security headers", async () => {
  await withServer(async (base) => {
    for (const [route, file] of [
      ["/index.html", "../public/index.html"],
      ["/en/index.html", "../public/en/index.html"],
      ["/js/core/roman.mjs", "../public/js/core/roman.mjs"],
      ["/styles/app.css", "../public/styles/app.css"],
    ]) {
      const response = await probe(base, route);
      assert.equal(response.status, 200, route);
      assert.equal(response.headers["content-security-policy"], EXPECTED_CSP, route);
      assert.equal(response.headers["x-content-type-options"], "nosniff", route);
      assert.equal(response.headers["referrer-policy"], "no-referrer", route);
      assert.equal(response.headers["cache-control"], "no-store", route);
      const expected = await readFile(new URL(file, import.meta.url));
      assert.ok(response.body.equals(expected), route);
    }
  });
});

test("the preview server refuses roots, traversal and writes", async () => {
  await withServer(async (base) => {
    assert.equal((await probe(base, "/")).status, 404);
    assert.equal((await probe(base, "/missing.html")).status, 404);
    assert.equal((await probe(base, "/..%2fpackage.json")).status, 403);
    assert.equal((await probe(base, "/index.html", "POST")).status, 405);
    const head = await probe(base, "/index.html", "HEAD");
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
  });
});
