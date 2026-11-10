// Static project checks for the Ping Area Converter: required
// files, package contract, the SPEC-pinned rules that can be
// checked statically (field order, defaults, unit order, raw
// capacities, report filename and limit, the exact conversion
// constants spot-checked through the core, example equals the
// vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the tatami
// approximate labels, the candidate noindex / no-canonical rules),
// core purity (no DOM/network/storage/clock), syntax of every
// shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures (spec-ping-area-converter-20261109, spec
// candidate commit 6d7cc4cd18a273b0d386b19b85b883573d097cba, draft
// spec PR #227); the spec PR is not merged into this branch's base,
// so the check reads the vendored copy rather than a repo-level
// docs path.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
  "public/js/core/ping-area.mjs",
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

// Package contract: Node >=24, ESM, exactly the expected scripts,
// and zero dependencies of any kind.
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

// Fixtures provenance: the vendored copy must be byte-identical to
// the fixed spec candidate's fixtures file.
const FIXTURES_SHA256 = "9181883367eee444ef119af360a13a0c13c746966a668e6c15bc59e74508b550";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, unit order, raw capacities,
// display decimals, report filename/limit, and the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/ping-area.mjs")).href);
if (!deepEqual(core.FIELDS, ["amount", "unit"])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.DEFAULTS, { amount: "", unit: "ping" })) fail("core: DEFAULTS mismatch");
if (!deepEqual(core.UNITS, ["ping", "m2", "ft2", "tatami"])) fail("core: UNITS order mismatch");
if (core.MAX_AMOUNT_UNITS !== 12) fail("core: MAX_AMOUNT_UNITS must be 12");
if (core.MAX_UNIT_UNITS !== 6) fail("core: MAX_UNIT_UNITS must be 6");
if (!deepEqual(core.DISPLAY_DECIMALS, { ping: 2, m2: 2, ft2: 2, tatami: 1 })) {
  fail("core: DISPLAY_DECIMALS mismatch");
}
if (core.REPORT_FILENAME !== "ping-area-report.json") fail("core: REPORT_FILENAME mismatch");
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-ping-area-converter-20261109") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 23) {
  fail("test/fixtures.json: expected 23 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "table").length !== 1) {
  fail("test/fixtures.json: expected 1 table case");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language
// links are relative paths only), same-language home links, local
// assets, the pinned FAQ answers, the tatami approximate label on
// the unit option, the quick-table heading, the draft-loss note,
// and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "坪數換算｜Gloss Tools",
    description:
      "在坪、平方公尺、平方英尺與畳之間換算：精確有理數運算、只在最後一步四捨五入，附 1–100 坪固定速查表；畳採 1.62 m² 廣告慣例值，為概略換算。",
    h1: "坪數換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼 1 坪大約是 2 畳，畳卻寫 1.62 m²？",
      "畳的實際尺寸因地區而異（京間約 1.824 m²、江戸間約 1.549 m²）；本工具的畳採日本不動產廣告慣例 1 畳 = 1.62 m²，是概略換算，1 坪 = 400/121 m² ÷ 1.62 ≈ 2.04 畳。",
      "結果可以拿去簽約或登記嗎？",
      "不可以。建物登記以平方公尺為準，坪是民間慣用單位；本工具只供日常估算，正式文件請以權狀或謄本的平方公尺為準。",
    ],
    tatamiLabel: "畳（概略，1 畳 = 1.62 m² 廣告慣例）",
    tableHeading: "常見坪數速查表",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Ping Area Converter | Gloss Tools",
    description:
      "Convert between ping, square metres, square feet and tatami with exact rational arithmetic and a single final rounding, plus a fixed 1–100 ping quick table; tatami uses the approximate 1.62 m² advertising convention.",
    h1: "Ping Area Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why is 1 ping about 2 tatami when 1 tatami is 1.62 m²?",
      "Physical tatami sizes vary by region (Kyoma ≈ 1.824 m², Edoma ≈ 1.549 m²); this tool uses the Japanese real-estate advertising convention 1 tatami = 1.62 m² as an approximate conversion, and 1 ping = 400/121 m² ÷ 1.62 ≈ 2.04 tatami.",
      "Can I use the result in a contract or registration?",
      "No. Registered areas are recorded in square metres and ping is a customary unit; this tool is for everyday estimates only — use the square metres on the official title for formal documents.",
    ],
    tatamiLabel: "Tatami (approximate; 1 tatami = 1.62 m² advertising convention)",
    tableHeading: "Quick table (ping → m² / ft²)",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-amount", "field-unit"];
const ERROR_IDS = ["error-amount", "error-unit"];
const REGION_IDS = ["result-rows", "quick-table-body"];
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
  if (!html.includes(page.tatamiLabel)) fail(`${page.path}: missing tatami approximate label`);
  if (!html.includes(page.tableHeading)) fail(`${page.path}: missing quick-table heading`);
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
  for (const id of REGION_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing results region ${id}`);
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
    await execFileAsync(process.execPath, ["--check", file], { windowsHide: true });
  } catch (error) {
    fail(`${file}: syntax check failed: ${error.stderr ?? error.message}`);
  }
}
{
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/ping-area.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "ping-area-converter-worker-"));
  const tempFile = join(dir, "worker.mjs");
  try {
    await writeFile(tempFile, `${coreSource}\n${handlerSource}`, "utf8");
    await execFileAsync(process.execPath, ["--check", tempFile], { windowsHide: true });
  } catch (error) {
    fail(`worker concatenation failed syntax check: ${error.stderr ?? error.message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Forbidden-capability scan over the shipped sources and tests
// (this file itself is excluded: it assembles the tokens from
// fragments).
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

// Core purity: no DOM access and no clock in the pure modules or
// the controller. The core is purely a function of its two input
// strings (exact rational arithmetic), so a bare clock or
// locale-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/ping-area.mjs",
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
{
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/ping-area.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/ping-area.mjs: core must not reference the clock constructor");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/ping-area.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/units/capacities/example, pages, syntax, worker concatenation, capability scan, core purity",
);
