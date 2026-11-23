// Static project checks for the Map Scale Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, the common-scales table, the example equals the vendored
// fixtures.json case 1, the vendored fixtures hash, bilingual
// metadata, the pinned FAQ answers, the bilingual scale table, and
// the candidate noindex / no-canonical rules), core purity (no
// DOM/network/storage/clock), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability
// scan. Exits non-zero on the first failure list. The vendored
// test/fixtures.json is a verbatim copy of the fixed spec's fixtures
// (spec-map-scale-calculator-20261121, spec candidate commit
// 91540b9ccad4b01dc72aed0419f44b5661e1416c, draft spec PR #398); the
// spec PR is not merged into this branch's base, so the check reads
// the vendored copy rather than a repo-level docs path.

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
  "public/js/core/map-scale.mjs",
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

// Fixtures provenance: the vendored copy must be byte-identical to
// the fixed spec candidate's fixtures file.
const FIXTURES_SHA256 = "1b5e53d7286b97b667bfee2e7bde9299ee4f3309507290c158c462fd5b8701bd";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: defaults, example, raw capacity, scale range,
// distance ranges, report filename/limit, and the pinned
// common-scales table (derived from the 1:N definition only).
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/map-scale.mjs")).href
);
if (
  !deepEqual(core.DEFAULTS, {
    mode: "map-to-real",
    scale: "25000",
    mapCm: "4",
    realValue: "1",
    realUnit: "km",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (core.SCALE_MIN !== 1) fail("core: SCALE_MIN mismatch");
if (core.SCALE_MAX !== 10000000) fail("core: SCALE_MAX mismatch");
if (core.REPORT_FILENAME !== "map-scale-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_SCALES = [
  { scale: 1000, metersPerCm: "10", cmPerKm: "100" },
  { scale: 5000, metersPerCm: "50", cmPerKm: "20" },
  { scale: 10000, metersPerCm: "100", cmPerKm: "10" },
  { scale: 25000, metersPerCm: "250", cmPerKm: "4" },
  { scale: 50000, metersPerCm: "500", cmPerKm: "2" },
  { scale: 100000, metersPerCm: "1000", cmPerKm: "1" },
  { scale: 200000, metersPerCm: "2000", cmPerKm: "0.5" },
];
if (!deepEqual(core.COMMON_SCALES, EXPECTED_SCALES)) fail("core: COMMON_SCALES table mismatch");
// The table must also be derivable from the definition: 1 cm on the
// map = N/100 m; 1 real km = 100,000/N map cm.
for (const row of core.COMMON_SCALES) {
  if (Number(row.metersPerCm) !== row.scale / 100) {
    fail(`core: COMMON_SCALES ${row.scale}: metersPerCm is not N/100`);
  }
  if (Number(row.cmPerKm) !== 100000 / row.scale) {
    fail(`core: COMMON_SCALES ${row.scale}: cmPerKm is not 100000/N`);
  }
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-map-scale-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 16) {
  fail("test/fixtures.json: expected 16 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned FAQ answers, the pinned scale table, the draft-loss
// note, and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "地圖比例尺換算｜Gloss Tools",
    description:
      "輸入地圖比例尺與圖上距離，換算實際距離；反向也可由實際距離算回圖上距離，並附常用比例尺對照表。",
    h1: "地圖比例尺換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "比例尺 1:25000 是什麼意思？",
      "圖上 1 公分等於實際 250 公尺（25,000 公分）。",
      "為什麼實際距離同時顯示公尺和公里？",
      "短距離讀公尺較直覺，長距離讀公里較方便；主要單位以精確值 1000 公尺為界切換。",
      "可以輸入不是整數的圖上距離嗎？",
      "可以，小數點後最多 3 位，例如 2.5 公分。",
    ],
    tableCells: [
      "1:1000", "10 公尺", "100 公分",
      "1:5000", "50 公尺", "20 公分",
      "1:10000", "100 公尺", "10 公分",
      "1:25000", "250 公尺", "4 公分",
      "1:50000", "500 公尺", "2 公分",
      "1:100000", "1 公里", "1 公分",
      "1:200000", "2 公里", "0.5 公分",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Map Scale Calculator | Gloss Tools",
    description:
      "Convert map distance to real distance from a map scale, or real distance back to map distance, with a common-scales reference table.",
    h1: "Map Scale Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What does a 1:25000 scale mean?",
      "1 cm on the map equals 250 m (25,000 cm) in reality.",
      "Why show both metres and kilometres?",
      "Metres read better for short distances and kilometres for long ones; the primary unit switches at exactly 1000 m on the unrounded value.",
      "Can I enter a non-integer map distance?",
      "Yes, up to 3 decimal places, for example 2.5 cm.",
    ],
    tableCells: [
      "1:1000", "10 m", "100 cm",
      "1:5000", "50 m", "20 cm",
      "1:10000", "100 m", "10 cm",
      "1:25000", "250 m", "4 cm",
      "1:50000", "500 m", "2 cm",
      "1:100000", "1 km", "1 cm",
      "1:200000", "2 km", "0.5 cm",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-mode-map",
  "field-mode-real",
  "field-scale",
  "field-map-cm",
  "field-real-value",
  "field-unit-m",
  "field-unit-km",
];
const ERROR_IDS = ["error-scale", "error-map-cm", "error-real-value"];
const REGION_IDS = ["summary-rows", "detail-rows", "scale-table", "group-map-cm", "group-real-value"];
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
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const text of page.tableCells) {
    if (!html.includes(text)) fail(`${page.path}: missing scale table cell: ${text}`);
  }
  for (const scale of [1000, 5000, 10000, 25000, 50000, 100000, 200000]) {
    if (!html.includes(`data-scale="${scale}"`)) {
      fail(`${page.path}: missing scale table button for 1:${scale}`);
    }
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
    await execFileAsync(process.execPath, ["--check", file]);
  } catch (error) {
    fail(`${file}: syntax check failed: ${error.stderr ?? error.message}`);
  }
}
{
  const coreSource = await readFile(
    resolve(PROJECT_ROOT, "public/js/core/map-scale.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "map-scale-calculator-worker-"));
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

// Core purity: no DOM access and no clock in the pure modules or the
// controller. The core must be purely a function of its input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/map-scale.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/map-scale.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/map-scale.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/map-scale.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core defaults/ranges/table/example, pages, syntax, worker concatenation, capability scan, core purity",
);
