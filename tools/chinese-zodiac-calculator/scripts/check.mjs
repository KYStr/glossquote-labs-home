// Static project checks for the Chinese Zodiac Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw capacities, the CNY table size and
// spot values, the animal/stem tables, defaults, example equals the
// vendored fixtures.json case 1, bilingual metadata, the SPEC-pinned
// FAQ answers and boundary disclosure, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage, no Date),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures (spec candidate
// b68311b57e79ddbbae922a0672b4bd8fe299ba3a); the spec PR is not merged
// into this branch's base, so the check reads the vendored copy
// rather than a repo-level docs path.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, lstat, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

function deepEqual(actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/zodiac.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/site.test.mjs",
  "test/fixtures.json",
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

// Forbidden runtime capabilities, assembled from fragments so this
// file does not match its own scan.
const forbiddenTokens = [
  ["inner", "HTML"],
  ["outer", "HTML"],
  ["insertAdjacent", "HTML"],
  ["local", "Storage"],
  ["session", "Storage"],
  ["indexed", "DB"],
  ["document.", "cookie"],
  ["document.", "write"],
  ["ev", "al("],
  ["new", " Function"],
  ["fe", "tch("],
  ["XML", "HttpRequest"],
  ["Web", "Socket"],
  ["Event", "Source"],
  ["send", "Beacon"],
  ["http", "://"],
  ["https", "://"],
].map((parts) => parts.join(""));

const SCANNED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(fullPath)));
    else files.push(fullPath);
  }
  return files;
}

for (const path of REQUIRED_PATHS) {
  try {
    const info = await lstat(resolve(PROJECT_ROOT, path));
    if (!info.isFile()) fail(`Required path is not a file: ${path}`);
  } catch {
    fail(`Missing required path: ${path}`);
  }
}

// Package contract: Node >=24, ESM, exactly the expected scripts, and
// zero dependencies of any kind.
const pkg = JSON.parse(await readFile(resolve(PROJECT_ROOT, "package.json"), "utf8"));
if (pkg.type !== "module") fail("package.json: type must be module");
if (pkg.engines?.node !== ">=24") fail("package.json: engines.node must be >=24");
for (const [name, command] of Object.entries(EXPECTED_SCRIPTS)) {
  if (pkg.scripts?.[name] !== command) fail(`package.json: script ${name} mismatch`);
}
if (Object.keys(pkg.scripts ?? {}).length !== Object.keys(EXPECTED_SCRIPTS).length) {
  fail("package.json: unexpected extra scripts");
}
for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) {
    fail(`package.json: ${key} must be empty (zero-dependency tool)`);
  }
}

// Core contract: field order, capacities, the CNY table (78 rows,
// years 1959-2036, with the SPEC's pinned spot values including the
// restored 1999 row and the 2036 boundary row), the animal and stem
// tables (the sheep is always Goat), defaults, and the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/zodiac.mjs")).href);
if (!deepEqual(core.FIELDS, ["birthDate", "asOfDate"])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.MAX_RAW_UNITS, { birthDate: 32, asOfDate: 32 })) {
  fail("core: MAX_RAW_UNITS mismatch (SPEC pins 32 code units per field)");
}
const cnyYears = Object.keys(core.CNY_DATES).map(Number).sort((a, b) => a - b);
if (cnyYears.length !== 78 || cnyYears[0] !== 1959 || cnyYears[77] !== 2036) {
  fail("core: CNY_DATES must hold exactly the years 1959-2036");
}
for (const [year, date] of [
  [1959, "1959-02-08"],
  [1960, "1960-01-28"],
  [1984, "1984-02-02"],
  [1999, "1999-02-16"],
  [2025, "2025-01-29"],
  [2036, "2036-01-28"],
]) {
  if (core.CNY_DATES[year] !== date) fail(`core: CNY_DATES[${year}] must be ${date}`);
}
if (core.ANIMALS.length !== 12) fail("core: ANIMALS must have 12 entries");
if (core.ANIMALS[7].en !== "Goat" || core.ANIMALS[7].zh !== "羊") {
  fail("core: animal index 7 must be 羊 Goat");
}
if (core.ANIMALS[4].en !== "Dragon" || core.ANIMALS[0].branch !== "子") {
  fail("core: ANIMALS table mismatch");
}
if (core.STEMS.length !== 10 || core.STEMS[0].zh !== "甲" || core.STEMS[6].elementEn !== "Metal") {
  fail("core: STEMS table mismatch");
}
if (!deepEqual(core.DEFAULTS, { birthDate: "", asOfDate: "" })) {
  fail("core: DEFAULTS mismatch");
}
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-chinese-zodiac-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 12) {
  fail("test/fixtures.json: expected 12 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The core must not use the Date object at all (SPEC implementation:
// integer algorithms only, so the host timezone can never leak in).
// Field and function names legitimately contain "Date" (CNY_DATES,
// gregorianToDayNumber, ...); only construction or static calls
// count.
{
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/zodiac.mjs"), "utf8");
  if (
    /new\s+Date\b/.test(coreSource) ||
    /\bDate\s*\.\s*(now|parse|UTC)/.test(coreSource) ||
    /(?<![A-Za-z])Date\s*\(/.test(coreSource)
  ) {
    fail("core: must not construct or call Date");
  }
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the SPEC-pinned FAQ answers, the fixed boundary disclosure in the
// results area, the draft-loss note, and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "農曆生肖查詢｜Gloss Tools",
    description: "輸入國曆出生日期，以農曆春節為交界查正確生肖、干支與生肖年起訖，並判讀本命年；附 1960–2035 年春節日期表。",
    h1: "農曆生肖查詢",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼 1、2 月出生的人，生肖常常被算錯？",
      "生肖年不是從 1 月 1 日開始，而是從農曆正月初一（春節）開始",
      "什麼是本命年？",
      "每 12 年一次",
      "為什麼八字排盤給的生肖可能不一樣？",
      "八字命理以立春（約 2 月 4 日）為年界",
    ],
    modelNote: "本工具以農曆正月初一（春節）為生肖交界；八字命理以立春交界者，結果可能不同。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Chinese Zodiac Calculator | Gloss Tools",
    description:
      "Find your Chinese zodiac sign from a Gregorian birth date using the Chinese New Year boundary, with the zodiac year's start and end dates and your Ben Ming Nian.",
    h1: "Chinese Zodiac Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why do January and February birthdays so often get the wrong sign?",
      "the zodiac year starts at Chinese New Year (lunar 1/1), not on January 1",
      "What is Ben Ming Nian?",
      "it comes around every 12 years",
      "Why might a BaZi chart give a different sign?",
      "BaZi switches the year at Li Chun (around February 4)",
    ],
    modelNote:
      "This tool switches the zodiac year at Chinese New Year (lunar 1/1); BaZi traditions that switch at Li Chun may differ.",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-birthDate", "field-asOfDate"];
const ERROR_IDS = ["error-birthDate", "error-asOfDate"];
// The SPEC pins the dirty/busy/cancelled status strings verbatim;
// they live in app.js.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const text of [
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
]) {
  if (!appSource.includes(text)) fail(`app.js: missing SPEC-pinned status string: ${text}`);
}
for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang must be ${page.lang}`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.path}: missing preview noindex`);
  if (html.includes("canonical")) fail(`${page.path}: candidate must not carry a canonical link`);
  if (html.includes("hreflang")) fail(`${page.path}: candidate must not carry hreflang`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: title mismatch`);
  if (!html.includes(`<meta name="description" content="${page.description}">`)) {
    fail(`${page.path}: description mismatch`);
  }
  if (!html.includes(`<h1>${page.h1}</h1>`)) fail(`${page.path}: h1 mismatch`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  if (!html.includes(page.modelNote)) fail(`${page.path}: missing fixed boundary disclosure`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of ERROR_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing error slot ${id}`);
  }
}

// Syntax-check every shipped script, and check the worker
// concatenation (core + handler) parses as one module.
const scriptFiles = [];
for (const root of [resolve(PROJECT_ROOT, "public/js"), resolve(PROJECT_ROOT, "scripts")]) {
  scriptFiles.push(...(await collectFiles(root)));
}
for (const file of scriptFiles) {
  if (![".js", ".mjs"].includes(extname(file).toLowerCase())) continue;
  try {
    await execFileAsync(process.execPath, ["--check", file]);
  } catch (error) {
    fail(`${file}: syntax check failed: ${error.stderr ?? error.message}`);
  }
}
{
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/zodiac.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "chinese-zodiac-worker-"));
  const tempFile = join(dir, "worker.mjs");
  try {
    await writeFile(tempFile, `${coreSource}\n${handlerSource}`, "utf8");
    await execFileAsync(process.execPath, ["--check", tempFile]);
  } catch (error) {
    fail(`worker concatenation failed syntax check: ${error.stderr ?? error.message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Forbidden-capability scan over the shipped sources and tests (this
// file itself is excluded: it assembles the tokens from fragments).
const scanRoots = [
  resolve(PROJECT_ROOT, "public"),
  resolve(PROJECT_ROOT, "test"),
  resolve(PROJECT_ROOT, "scripts/build.mjs"),
  resolve(PROJECT_ROOT, "scripts/check-generated.mjs"),
  resolve(PROJECT_ROOT, "scripts/serve.mjs"),
];
const scanFiles = [];
for (const root of scanRoots) {
  const info = await lstat(root);
  if (info.isDirectory()) scanFiles.push(...(await collectFiles(root)));
  else scanFiles.push(root);
}
for (const file of scanFiles) {
  if (!SCANNED_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  const text = await readFile(file, "utf8");
  for (const token of forbiddenTokens) {
    if (text.includes(token)) fail(`${file}: forbidden token present: ${token}`);
  }
}

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/zodiac.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator"]) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: pure module must not reference ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core tables/capacities/defaults/example, pages, syntax, worker concatenation, capability scan, core purity",
);
