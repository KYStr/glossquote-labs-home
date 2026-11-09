// Serve tests: build into a temp dir, serve on an ephemeral loopback
// port, and probe both language pages, MIME types, 404, HEAD, security
// headers, and path-traversal rejection.

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { buildPreview } from "../scripts/build.mjs";
import { startServer } from "../scripts/serve.mjs";

test("loopback preview serving", async () => {
  const tmp = await mkdtemp(path.join(tmpdir(), "parking-serve-"));
  const server = await startServer(tmp, 0);
  try {
    await buildPreview(tmp);
    const base = "http://127.0.0.1:" + server.address().port;

    const zhRes = await fetch(base + "/");
    assert.equal(zhRes.status, 200);
    assert.match(zhRes.headers.get("content-type"), /text\/html/);
    assert.equal(zhRes.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(zhRes.headers.get("content-security-policy"), /worker-src blob:/);
    const zh = await zhRes.text();
    assert.ok(zh.includes("<title>停車費計算機｜Gloss Tools</title>"));

    const enRes = await fetch(base + "/en/");
    assert.equal(enRes.status, 200);
    const en = await enRes.text();
    assert.ok(en.includes("<title>Parking Fee Calculator | Gloss Tools</title>"));

    const jsRes = await fetch(base + "/js/app.js");
    assert.equal(jsRes.status, 200);
    assert.match(jsRes.headers.get("content-type"), /javascript/);

    const missing = await fetch(base + "/no-such-page");
    assert.equal(missing.status, 404);

    const traversal = await fetch(base + "/%2e%2e/%2e%2e/package.json");
    assert.notEqual(traversal.status, 200);

    const head = await fetch(base + "/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    server.close();
    await rm(tmp, { recursive: true, force: true });
  }
});
