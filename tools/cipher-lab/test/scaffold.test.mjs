// Scaffold contract: package shape, page metadata and core purity.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("package.json: ESM, Node >=24, zero dependencies, required scripts", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.type, "module");
  assert.match(pkg.engines.node, />=24/);
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.devDependencies ?? {}), []);
  for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
    assert.ok(pkg.scripts[script], `missing script ${script}`);
  }
  assert.equal(pkg.scripts.test, "node --test");
});

test("pages: lang, noindex, canonical, hreflang and same-language home links", async () => {
  const zh = await read("public/index.html");
  const en = await read("public/en/index.html");
  assert.match(zh, /<html lang="zh-Hant">/);
  assert.match(en, /<html lang="en">/);
  for (const html of [zh, en]) {
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(html.includes('rel="canonical"'));
    assert.ok(html.includes('hreflang="zh-Hant"'));
    assert.ok(html.includes('hreflang="en"'));
    assert.ok(html.includes('hreflang="x-default"'));
    assert.ok(html.includes("<h1>"));
    assert.ok(html.includes('name="description"'));
  }
  assert.ok(zh.includes('href="../../"'), "zh page links back to the zh home page");
  assert.ok(en.includes('href="../../en/"'), "en page links back to the en home page");
  assert.ok(!/(?:src|href)="https?:\/\//.test(zh), "zh page has no external resources");
  assert.ok(!/(?:src|href)="https?:\/\//.test(en), "en page has no external resources");
});

test("core is pure and app.js renders only via text-safe sinks", async () => {
  const core = await read("public/js/core/cipher.mjs");
  assert.ok(!/^\s*import/m.test(core), "core must not import anything");
  assert.ok(!/\b(document|window|fetch|localStorage|sessionStorage|navigator)\b/.test(core));
  const app = await read("public/js/app.js");
  assert.ok(!app.includes("innerHTML"), "app.js must not use innerHTML");
  assert.ok(!/\b(fetch|localStorage|sessionStorage)\b/.test(app));
});

test("bounds appear once as auditable constants matching SPEC section 4", async () => {
  const core = await read("public/js/core/cipher.mjs");
  assert.ok(core.includes("export const MAX_INPUT_LENGTH = 10000;"));
  assert.ok(core.includes("export const MAX_KEY_LENGTH = 64;"));
  assert.ok(core.includes("export const MAX_SHIFT = 25;"));
  assert.equal(core.match(/MAX_INPUT_LENGTH = /g).length, 1);
});
