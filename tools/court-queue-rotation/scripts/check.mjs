// Static project checks for Drop-In Court Queue: required files, package
// contract, the SPEC-pinned rules that can be checked statically (limits,
// fixture ids, bilingual metadata), core purity (no DOM / network /
// storage), and a forbidden-capability scan. Exits non-zero with the
// failure list.

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

// Serve script must send the SPEC-pinned CSP and nosniff.
const serveSource = await read("scripts/serve.mjs");
for (const token of [
  "default-src 'none'",
  "script-src 'self'",
  "worker-src 'self'",
  "connect-src 'none'",
  "frame-ancestors 'none'",
  "x-content-type-options",
]) {
  if (!serveSource.includes(token)) {
    fail(`scripts/serve.mjs: missing SPEC header token: ${token}`);
  }
}

// SPEC-pinned limits in the core.
const solveSource = await read("public/js/core/solve.mjs");
for (const [name, value] of [
  ["MAX_JSON_BYTES = 65536", "65536-byte input cap"],
  ["MAX_TEAMS = 12", "12-team cap"],
  ["MIN_TEAMS = 2", "2-team minimum"],
  ["MAX_EVENTS = 120", "120-event cap"],
  ["MAX_CONSECUTIVE = 3", "consecutive cap 3"],
]) {
  if (!solveSource.includes(name)) fail(`public/js/core/solve.mjs: missing ${value}`);
}
for (const code of ["NEED_TEAMS", "WINNER", "STATE", "REF", "DUPLICATE"]) {
  if (!solveSource.includes(`"${code}"`)) {
    fail(`public/js/core/solve.mjs: missing error code ${code}`);
  }
}

// Bilingual metadata on both pages.
const zh = await read("public/index.html");
const en = await read("public/en/index.html");
for (const [page, source, title, description] of [
  [
    "public/index.html",
    zh,
    "單場散打輪轉板｜Gloss Tools",
    "跟著現場隊伍進出與勝方留場事件更新散打候場及下一對。",
  ],
  [
    "public/en/index.html",
    en,
    "Drop-In Court Queue | Gloss Tools",
    "Keep one drop-in court moving with a live queue, winner stays and a consecutive-play cap.",
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
// the sample in app.js matches the cap fixture.
if (!appSource.includes("court-queue-rotation.cap")) {
  fail("public/js/app.js: sample must cite the court-queue-rotation.cap fixture");
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
