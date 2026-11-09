// Static project checks for Pickup Window Route: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (limits, batch size, bilingual metadata), core purity
// (no DOM / network / storage), and a forbidden-capability scan.
// Exits non-zero with the failure list.

import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/worker.mjs",
  "public/js/core/solve.mjs",
  "public/js/core/flow.mjs",
  "public/js/core/i18n.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
];

const EXPECTED_SCRIPTS = {
  dev: "node scripts/serve.mjs",
  test: "node --test",
  check: "node scripts/check.mjs",
  "build:preview": "node scripts/build.mjs --mode preview",
  "check:generated:preview": "node scripts/check-generated.mjs --mode preview",
};

for (const rel of REQUIRED_PATHS) {
  const stat = await lstat(resolve(PROJECT_ROOT, rel)).catch(() => null);
  if (stat === null || !stat.isFile()) fail(`Missing required file: ${rel}`);
}

const packageText = await readFile(resolve(PROJECT_ROOT, "package.json"), "utf8");
let pkg;
try {
  pkg = JSON.parse(packageText);
} catch {
  fail("package.json is not valid JSON");
}
if (pkg) {
  if (pkg.type !== "module") fail('package.json: "type" must be "module"');
  if (pkg.private !== true) fail('package.json: "private" must be true');
  if (
    typeof pkg.engines?.node !== "string" ||
    !pkg.engines.node.includes("24")
  ) {
    fail('package.json: engines.node must require Node >= 24');
  }
  if (
    pkg.dependencies !== undefined ||
    pkg.devDependencies !== undefined
  ) {
    fail("package.json: no runtime or dev dependencies allowed");
  }
  for (const [name, script] of Object.entries(EXPECTED_SCRIPTS)) {
    if (pkg.scripts?.[name] !== script) {
      fail(`package.json: script "${name}" must be "${script}"`);
    }
  }
}

async function read(rel) {
  return readFile(resolve(PROJECT_ROOT, rel), "utf8");
}

// Core purity: no DOM / network / storage in public/js/core/.
for (const rel of [
  "public/js/core/solve.mjs",
  "public/js/core/flow.mjs",
  "public/js/core/i18n.mjs",
]) {
  const source = await read(rel);
  for (const token of [
    "document.",
    "window.",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "fetch(",
    "XMLHttpRequest",
    "innerHTML",
    "navigator.",
  ]) {
    if (source.includes(token)) {
      fail(`${rel}: forbidden token in pure core: ${token}`);
    }
  }
}

// App safety: no innerHTML, no fetch, no storage writes.
const appSource = await read("public/js/app.js");
for (const token of [
  "innerHTML",
  "outerHTML",
  "document.write",
  "fetch(",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "sendBeacon",
]) {
  if (appSource.includes(token)) {
    fail(`public/js/app.js: forbidden token: ${token}`);
  }
}
if (!appSource.includes("textContent")) {
  fail("public/js/app.js: expected textContent-based rendering");
}

// Worker contract: batch constant and cancel handling.
const workerSource = await read("public/js/worker.mjs");
if (!workerSource.includes("BATCH_STEPS")) {
  fail("public/js/worker.mjs: must use the BATCH_STEPS batch limit");
}
if (!workerSource.includes('"cancel"') && !workerSource.includes("'cancel'")) {
  fail("public/js/worker.mjs: must handle cancel messages");
}
const solveSource = await read("public/js/core/solve.mjs");
for (const [name, value] of [
  ["MAX_JSON_BYTES = 65536", "65536-byte input cap"],
  ["MAX_STOPS = 8", "8-stop cap"],
  ["BATCH_STEPS = 4096", "4096-step batch"],
  ["MAX_NODES = 109601", "109,601-node bound"],
  ["MAX_ORDERS = 40320", "40,320-order bound"],
]) {
  if (!solveSource.includes(name)) fail(`public/js/core/solve.mjs: missing ${value}`);
}

// Bilingual metadata on both pages.
const zh = await read("public/index.html");
const en = await read("public/en/index.html");
for (const [page, source, title, description] of [
  [
    "public/index.html",
    zh,
    "多站取件時窗路線｜Gloss Tools",
    "用自行估算的有向旅時與取件窗口找出同日可完成的訪站順序。",
  ],
  [
    "public/en/index.html",
    en,
    "Pickup Window Route | Gloss Tools",
    "Find an earliest-return pickup order from your own travel times and pickup windows.",
  ],
]) {
  if (!source.includes(`<title>${title}</title>`)) {
    fail(`${page}: missing SPEC title`);
  }
  if (!source.includes(`content="${description}"`)) {
    fail(`${page}: missing SPEC description`);
  }
  if (!source.includes('content="noindex, nofollow"')) {
    fail(`${page}: preview must be noindex, nofollow`);
  }
  if (!source.includes('rel="canonical"')) fail(`${page}: missing canonical`);
  if (!source.includes('hreflang="zh-Hant"')) fail(`${page}: missing zh-Hant hreflang`);
  if (!source.includes('hreflang="en"')) fail(`${page}: missing en hreflang`);
  if (!source.includes('hreflang="x-default"')) fail(`${page}: missing x-default hreflang`);
}
if (!zh.includes('lang="zh-Hant"')) fail("public/index.html: lang must be zh-Hant");
if (!en.includes('lang="en"')) fail("public/en/index.html: lang must be en");
if (!zh.includes('href="../../"')) fail("public/index.html: same-language home link must be ../../");
if (!en.includes('href="../../en/"')) fail("public/en/index.html: same-language home link must be ../../en/");
if (!zh.includes('href="./en/index.html"')) fail("public/index.html: missing link to the English page");
if (!en.includes('href="../index.html"')) fail("public/en/index.html: missing link to the Chinese page");
if (!zh.includes('src="./js/app.js"')) fail("public/index.html: must load ./js/app.js as a module");
if (!en.includes('src="../js/app.js"')) fail("public/en/index.html: must load ../js/app.js as a module");

// Fixture ids are present in the SPEC's fixtures.json (the test loads
// them dynamically), and the sample in app.js matches the only-order
// fixture.
const testSource = await read("test/core.test.mjs");
const fixturesSource = await read(
  "../../docs/specs/pickup-window-route/fixtures.json",
);
for (const id of [
  "pickup-window-route.only-order",
  "pickup-window-route.wait-and-tie",
  "pickup-window-route.exact-return",
  "pickup-window-route.missing-return",
  "pickup-window-route.zero-leg",
  "pickup-window-route.diagonal",
  "pickup-window-route.dirty-after-edit",
  "pickup-window-route.cancel-then-late",
]) {
  if (!fixturesSource.includes(id)) {
    fail(`fixtures.json: missing fixture ${id}`);
  }
}
if (!testSource.includes("fixtures.json")) {
  fail("test/core.test.mjs: must load the SPEC fixtures.json");
}
if (!appSource.includes("pickup-window-route.only-order")) {
  fail("public/js/app.js: sample must cite the pickup-window-route.only-order fixture");
}

// Serve script must send the SPEC-pinned CSP.
const serveSource = await read("scripts/serve.mjs");
for (const fragment of [
  "default-src 'none'",
  "worker-src 'self'",
  "connect-src 'none'",
  "frame-ancestors 'none'",
]) {
  if (!serveSource.includes(fragment)) {
    fail(`scripts/serve.mjs: CSP must include ${fragment}`);
  }
}

// No remote assets anywhere in the public tree.
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = [];
  for (const entry of entries) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}
for (const file of await walk(resolve(PROJECT_ROOT, "public"))) {
  const source = await readFile(file, "utf8");
  if (/https?:\/\//.test(source) && !/glossquote\.com/.test(source)) {
    fail(`${file}: unexpected remote URL (only the spec-given glossquote.com home is allowed)`);
  }
  if (extname(file) === ".html" && /<script[^>]+src="http/.test(source)) {
    fail(`${file}: remote script`);
  }
}

if (failures.length > 0) {
  console.error(`check failed (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("check passed");
