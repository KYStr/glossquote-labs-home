// Page, build and serve tests: both language pages carry the pinned
// metadata, the preview build is byte-identical across runs, the
// generated output verifies, and the loopback server serves both pages
// with the candidate security headers.

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createPreviewServer } from "../scripts/serve.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function runNode(args) {
  return execFileSync(process.execPath, args, { cwd: PROJECT_ROOT, encoding: "utf8" });
}

async function hashTree(root) {
  const hashes = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        hashes.push(
          `${relative(root, path)} ${createHash("sha256").update(await readFile(path)).digest("hex")}`,
        );
      }
    }
  }
  await visit(root);
  return hashes.join("\n");
}

test("static pages carry the pinned metadata and structure", async () => {
  const zh = await readFile(join(PROJECT_ROOT, "public/index.html"), "utf8");
  const en = await readFile(join(PROJECT_ROOT, "public/en/index.html"), "utf8");

  assert.ok(zh.includes('<html lang="zh-Hant">'));
  assert.ok(zh.includes("<title>電動車充電試算｜Gloss Tools</title>"));
  assert.ok(zh.includes(">電動車充電試算</h1>"));
  assert.ok(zh.includes('href="../../"'));
  assert.ok(zh.includes('href="./en/index.html"'));

  assert.ok(en.includes('<html lang="en">'));
  assert.ok(en.includes("<title>EV Charging Calculator | Gloss Tools</title>"));
  assert.ok(en.includes(">EV Charging Calculator</h1>"));
  assert.ok(en.includes('href="../../en/"'));
  assert.ok(en.includes('href="../index.html"'));

  for (const html of [zh, en]) {
    assert.ok(html.includes('<meta name="robots" content="noindex, nofollow">'));
    assert.ok(!html.includes('rel="canonical"'));
    for (const power of ["7", "11", "50", "120", "180"]) {
      assert.ok(html.includes(`data-power="${power}"`), `preset ${power}`);
    }
    for (const field of ["capacityKwh", "currentSoc", "targetSoc", "chargerPowerKw", "efficiencyPct", "pricePerKwh"]) {
      assert.ok(html.includes(`id="input-${field}"`), `field ${field}`);
    }
    assert.ok(!/https?:\/\//.test(html), "no absolute URLs");
  }
});

test("preview build is byte-identical across two runs and verifies", async () => {
  runNode(["scripts/build.mjs", "--mode", "preview"]);
  const first = await hashTree(join(PROJECT_ROOT, "dist-preview"));
  runNode(["scripts/build.mjs", "--mode", "preview"]);
  const second = await hashTree(join(PROJECT_ROOT, "dist-preview"));
  assert.equal(second, first);
  const verified = runNode(["scripts/build.mjs", "--mode", "preview", "--check"]);
  assert.match(verified, /Generated preview verified/);
});

test("loopback probe serves both language pages with security headers", async () => {
  runNode(["scripts/build.mjs", "--mode", "preview"]);
  const server = createPreviewServer();
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;
  try {
    const zh = await fetch(`${base}/index.html`);
    assert.equal(zh.status, 200);
    assert.match(zh.headers.get("content-type"), /text\/html/);
    assert.equal(zh.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(zh.headers.get("content-security-policy"), /default-src 'none'/);
    assert.ok((await zh.text()).includes("<title>電動車充電試算｜Gloss Tools</title>"));

    const root = await fetch(`${base}/`);
    assert.equal(root.status, 200);
    assert.ok((await root.text()).includes('<html lang="zh-Hant">'));

    const en = await fetch(`${base}/en/index.html`);
    assert.equal(en.status, 200);
    assert.ok((await en.text()).includes("<title>EV Charging Calculator | Gloss Tools</title>"));

    const script = await fetch(`${base}/js/app.js`);
    assert.equal(script.status, 200);
    assert.match(script.headers.get("content-type"), /text\/javascript/);

    const traversal = await fetch(`${base}/../scripts/serve.mjs`);
    assert.ok([400, 403, 404].includes(traversal.status));

    const missing = await fetch(`${base}/nope.html`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise((resolveClose) => server.close(resolveClose));
  }
});
