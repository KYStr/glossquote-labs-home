// Scaffold tests: both language pages carry the required preview/SEO
// scaffolding and same-language home links; the core loads in plain Node
// (proving it needs no DOM) and reports its data version.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DATA_VERSION } from "../public/js/core/data.mjs";
import { calculate } from "../public/js/core/calculator.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

test("core loads without a DOM and exposes a data version", () => {
  assert.equal(typeof calculate, "function");
  assert.match(DATA_VERSION, /^electricity-cost-data\/\d+$/);
});

test("zh-Hant page scaffolding", async () => {
  const html = await readFile(join(ROOT, "public/index.html"), "utf8");
  for (const needle of [
    '<html lang="zh-Hant">',
    'content="noindex, nofollow"',
    'rel="canonical"',
    'hreflang="en"',
    'href="../../"',
    'href="./en/"',
    'id="page-title"',
  ]) {
    assert.ok(html.includes(needle), `zh page missing ${needle}`);
  }
});

test("en page scaffolding", async () => {
  const html = await readFile(join(ROOT, "public/en/index.html"), "utf8");
  for (const needle of [
    '<html lang="en">',
    'content="noindex, nofollow"',
    'rel="canonical"',
    'hreflang="zh-Hant"',
    'href="../../en/"',
    'href="../"',
    'id="page-title"',
  ]) {
    assert.ok(html.includes(needle), `en page missing ${needle}`);
  }
});

test("both pages print the tiered limitation note and the formulas", async () => {
  const zh = await readFile(join(ROOT, "public/index.html"), "utf8");
  const en = await readFile(join(ROOT, "public/en/index.html"), "utf8");
  assert.ok(zh.includes('id="limitation-note"'));
  assert.ok(en.includes("whole billed consumption for the period"));
  assert.ok(en.includes('id="limitation-note"'));
});

test("no external resources are referenced by either page", async () => {
  for (const path of ["public/index.html", "public/en/index.html"]) {
    const html = await readFile(join(ROOT, path), "utf8");
    assert.ok(!html.includes("http://") && !html.includes("https://"), path);
  }
});
