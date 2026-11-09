// Source checks for the Cabin Baggage Checker (run before building):
// required files exist, the vendored fixtures match the fixed spec id
// and case counts, the core's published rules table equals the SPEC's
// verified table (spot-checked per airline, including the null
// personal-item limits and the starlux total-weight rule), the pages
// carry the pinned strings and preview conventions, and neither the
// core nor the app uses forbidden capabilities (DOM in the core,
// markup-building sinks in the app, network/storage anywhere).

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (path) => readFile(resolve(PROJECT_ROOT, path), "utf8");

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/baggage.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/fixtures.json",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/site.test.mjs",
];
for (const path of REQUIRED_PATHS) {
  await access(resolve(PROJECT_ROOT, path));
}

const pkg = JSON.parse(await read("package.json"));
assert.equal(pkg.type, "module");
assert.equal(pkg.engines.node, ">=24");
assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
assert.equal(pkg.scripts.test, "node --test");
assert.equal(pkg.scripts.check, "node scripts/check.mjs");
assert.equal(pkg.scripts["build:preview"], "node scripts/build.mjs --mode preview");
assert.equal(pkg.scripts["check:generated:preview"], "node scripts/check-generated.mjs --mode preview");
assert.equal(pkg.scripts.dev, "node scripts/serve.mjs");

const fixtures = JSON.parse(await read("test/fixtures.json"));
assert.equal(fixtures.specId, "spec-cabin-baggage-checker-20261109");
assert.equal(fixtures.cases.filter((entry) => entry.kind === "core").length, 9);
assert.equal(fixtures.cases.filter((entry) => entry.kind === "controller").length, 3);

const {
  AIRLINE_IDS,
  DEFAULTS,
  EXAMPLE,
  REPORT_FILENAME,
  RULES,
  RULES_AS_OF,
} = await import(resolve(PROJECT_ROOT, "public/js/core/baggage.mjs"));
assert.equal(RULES_AS_OF, "2026-11-09");
assert.equal(REPORT_FILENAME, "cabin-baggage-report.json");
assert.deepEqual(AIRLINE_IDS, [
  "eva",
  "china-airlines",
  "starlux",
  "tigerair-taiwan",
  "ana",
  "jal",
]);
assert.deepEqual(RULES, [
  { id: "eva", mainTenths: [560, 360, 230], personalTenths: [400, 300, 100], weightMode: "main", weightLimitTenths: 70 },
  { id: "china-airlines", mainTenths: [560, 360, 230], personalTenths: [400, 300, 150], weightMode: "main", weightLimitTenths: 70 },
  { id: "starlux", mainTenths: [560, 360, 230], personalTenths: [400, 300, 100], weightMode: "total", weightLimitTenths: 70 },
  { id: "tigerair-taiwan", mainTenths: [540, 380, 230], personalTenths: null, weightMode: "total", weightLimitTenths: 100 },
  { id: "ana", mainTenths: [550, 400, 250], personalTenths: [400, 300, 200], weightMode: "total", weightLimitTenths: 100 },
  { id: "jal", mainTenths: [550, 400, 250], personalTenths: null, weightMode: "total", weightLimitTenths: 100 },
]);
assert.deepEqual(DEFAULTS.airlines, AIRLINE_IDS);
assert.deepEqual(EXAMPLE, fixtures.cases[0].input);

const DISCLAIMER =
  "比對結果依 2026-11-09 查核之各航空公司公開規定（經濟艙），僅供參考。規定可能變更，行李是否可登機以航空公司官網與現場認定為準。 / Checked against each airline's published economy-class rules as verified on 2026-11-09, for reference only. Rules can change; the airline's official website and airport staff have the final say.";

const zh = await read("public/index.html");
const en = await read("public/en/index.html");
for (const [page, title, h1] of [
  [zh, "<title>手提行李規定檢查｜Gloss Tools</title>", "<h1>手提行李規定檢查</h1>"],
  [en, "<title>Cabin Baggage Checker | Gloss Tools</title>", "<h1>Cabin Baggage Checker</h1>"],
]) {
  assert.ok(page.includes(title), title);
  assert.ok(page.includes(h1), h1);
  assert.ok(page.includes('<meta name="robots" content="noindex, nofollow">'));
  assert.ok(page.includes(DISCLAIMER));
  assert.equal(page.includes("canonical"), false);
  assert.equal(page.includes("hreflang"), false);
  assert.equal(page.includes("sitemap"), false);
  assert.equal(page.includes("http://"), false);
  assert.equal(page.includes("https://"), false);
}
assert.ok(zh.includes('href="./en/index.html"'));
assert.ok(zh.includes('href="../../"'));
assert.ok(en.includes('href="../index.html"'));
assert.ok(en.includes('href="../../en/"'));

const coreSource = await read("public/js/core/baggage.mjs");
for (const forbidden of [
  "document",
  "window",
  "fetch(",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "Date.",
  "Math.random",
  "eval(",
  "Function(",
]) {
  assert.equal(coreSource.includes(forbidden), false, `core must not use ${forbidden}`);
}

const appSource = await read("public/js/app.js");
for (const forbidden of [
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
  "eval(",
  "fetch(",
  "localStorage",
  "sessionStorage",
]) {
  assert.equal(appSource.includes(forbidden), false, `app must not use ${forbidden}`);
}

console.log("check: source contract OK (files, fixtures, rules table, pages, purity)");
