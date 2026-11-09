// Static project checks for Gift Exchange Match: required files, package
// contract, the SPEC-pinned rules that can be checked statically (limits,
// batch size, fixture ids, bilingual metadata), core purity (no DOM /
// network / storage), and a forbidden-capability scan. Exits non-zero
// with the failure list.

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
  ["MAX_NAMES = 16", "16-person cap"],
  ["MAX_BLOCKED = 240", "240-block cap"],
  ["MAX_FEASIBILITY_CHECKS = 256", "256 feasibility-check cap"],
  ["MAX_EDGE_ATTEMPTS_PER_CHECK = 4096", "4096 edge-attempt cap"],
  ["BATCH_STEPS = 4096", "4096-step batch"],
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
    "交換禮物配對｜Gloss Tools",
    "輸入交換禮物短名與禁配方向，找出每人一送一收的配對。",
  ],
  [
    "public/en/index.html",
    en,
    "Gift Exchange Match | Gloss Tools",
    "Find a complete gift exchange match with exclusions, then reveal one recipient at a time.",
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

// Fixtures are present in the spec directory (read-only reference) and
// the sample in app.js matches the three-person fixture.
if (!appSource.includes("gift-exchange-match.three")) {
  fail("public/js/app.js: sample must cite the gift-exchange-match.three fixture");
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
