// Static project checks for Laundry Machine Handoff: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (limits, bilingual metadata, home links), core purity (no DOM /
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

// SPEC-pinned limits in the core.
const solveSource = await read("public/js/core/solve.mjs");
for (const [name, value] of [
  ["MAX_JSON_BYTES = 65536", "65536-byte input cap"],
  ["DAY_MINUTES = 1440", "1440-minute day"],
  ["MAX_BUSY = 16", "16 busy intervals per machine"],
  ["MAX_LOADS = 8", "8-load cap"],
  ["MAX_NAME_CODE_POINTS = 24", "24-code-point name cap"],
]) {
  if (!solveSource.includes(name)) fail(`public/js/core/solve.mjs: missing ${value}`);
}

// Bilingual metadata on both pages.
const zh = await read("public/index.html");
const en = await read("public/en/index.html");
for (const [page, source, title, description, home] of [
  [
    "public/index.html",
    zh,
    "洗烘兩機接續表｜Gloss Tools",
    "依共用洗烘機的空檔、批次與最長等待時間規劃同日接續。",
    "https://glossquote.com/index.html",
  ],
  [
    "public/en/index.html",
    en,
    "Laundry Machine Handoff | Gloss Tools",
    "Find washer and dryer slots in load order while keeping each transfer within its wait limit.",
    "https://glossquote.com/en/index.html",
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
  if (!source.includes(`href="${home}"`)) {
    fail(`${page}: missing SPEC same-language home link`);
  }
}
if (!zh.includes('lang="zh-Hant"')) fail("public/index.html: lang must be zh-Hant");
if (!en.includes('lang="en"')) fail("public/en/index.html: lang must be en");
if (!zh.includes('href="./en/index.html"')) fail("public/index.html: missing link to the English page");
if (!en.includes('href="../index.html"')) fail("public/en/index.html: missing link to the Chinese page");
if (!zh.includes('src="./js/app.js"')) fail("public/index.html: must load ./js/app.js as a module");
if (!en.includes('src="../js/app.js"')) fail("public/en/index.html: must load ../js/app.js as a module");

// The serve script must send the SPEC-pinned CSP and nosniff.
const serveSource = await read("scripts/serve.mjs");
if (!serveSource.includes("default-src 'none'")) {
  fail("scripts/serve.mjs: must send the SPEC-pinned CSP");
}
if (!serveSource.includes("X-Content-Type-Options")) {
  fail("scripts/serve.mjs: must send X-Content-Type-Options: nosniff");
}

// No remote assets anywhere in the public tree (only the SPEC-given
// glossquote.com home links are allowed).
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

// Tests must load the literal SPEC fixtures.
const testSource = await read("test/core.test.mjs");
if (!testSource.includes("fixtures.json")) {
  fail("test/core.test.mjs: must load the literal SPEC fixtures");
}

if (failures.length > 0) {
  console.error(`check failed (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("check passed");
