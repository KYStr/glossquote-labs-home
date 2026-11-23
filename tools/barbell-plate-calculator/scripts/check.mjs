// Static project checks for the Barbell Plate Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, plate set, report
// filename and limit, example equals the vendored fixtures.json
// case 1, the vendored fixtures hash, bilingual metadata, the pinned
// FAQ answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-barbell-plate-calculator-20261121, spec candidate commit
// f7c0d421cc5047de101383f241f6e0faa4fbe638, draft spec PR #373); the
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
  "public/js/core/barbell-plate-calculator.mjs",
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
const FIXTURES_SHA256 = "8c2ac601ad73b38f573fabdf99c3d18095b70674cda28e04bd6c74ed01d323fd";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, plate
// set, report filename/limit, and the example must match the SPEC
// and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/barbell-plate-calculator.mjs")).href
);
const EXPECTED_FIELDS = [
  "targetKg",
  "barKg",
  "pairs25",
  "pairs20",
  "pairs15",
  "pairs10",
  "pairs5",
  "pairs2_5",
  "pairs1_25",
];
if (!deepEqual(core.FIELDS, EXPECTED_FIELDS)) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.DEFAULTS, {
    targetKg: "100",
    barKg: "20",
    pairs25: "2",
    pairs20: "2",
    pairs15: "2",
    pairs10: "2",
    pairs5: "2",
    pairs2_5: "2",
    pairs1_25: "2",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (core.TARGET_MIN_KG !== 0) fail("core: TARGET_MIN_KG mismatch");
if (core.TARGET_MAX_KG !== 500) fail("core: TARGET_MAX_KG mismatch");
if (core.BAR_MIN_KG !== 0) fail("core: BAR_MIN_KG mismatch");
if (core.BAR_MAX_KG !== 50) fail("core: BAR_MAX_KG mismatch");
if (core.PAIRS_MIN !== 0) fail("core: PAIRS_MIN mismatch");
if (core.PAIRS_MAX !== 10) fail("core: PAIRS_MAX mismatch");
if (core.REPORT_FILENAME !== "barbell-plate-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_PLATES = [
  { field: "pairs25", plateKg: 25, units: 200 },
  { field: "pairs20", plateKg: 20, units: 160 },
  { field: "pairs15", plateKg: 15, units: 120 },
  { field: "pairs10", plateKg: 10, units: 80 },
  { field: "pairs5", plateKg: 5, units: 40 },
  { field: "pairs2_5", plateKg: 2.5, units: 20 },
  { field: "pairs1_25", plateKg: 1.25, units: 10 },
];
if (!deepEqual(core.PLATES, EXPECTED_PLATES)) fail("core: PLATES table mismatch");
if (core.formatKg(100) !== "100") fail("core: formatKg(100) must be 100");
if (core.formatKg(2.5) !== "2.5") fail("core: formatKg(2.5) must be 2.5");
if (core.formatKg(1.25) !== "1.25") fail("core: formatKg(1.25) must be 1.25");
if (core.formatKg(0.125) !== "0.125") fail("core: formatKg(0.125) must be 0.125");
if (core.formatKg(40.375) !== "40.375") fail("core: formatKg(40.375) must be 40.375");
if (core.formatKg(0) !== "0") fail("core: formatKg(0) must be 0");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-barbell-plate-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, the bar quick-select
// buttons, and the form control ids.
const DISCLAIMER_ZH =
  "本工具只依目標總重選槓片，不估算任何人的最大重量，也不把結果當訓練處方或安全保證。全部計算都在這個頁面本機進行，不上傳、不儲存、不記錄你的輸入。";
const DISCLAIMER_EN =
  "This tool only picks plates for a target total. It never estimates anyone's maximum lift, and its result is not a training prescription or a safety guarantee. All calculation happens locally on this page; nothing is uploaded, stored, or logged.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "槓鈴配重｜Gloss Tools",
    description:
      "輸入目標總重、槓鈴重與手邊槓片，算出每邊要掛哪幾片；掛不出來時告訴你差多少、最近能掛到幾公斤。",
    h1: "槓鈴配重",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "掛不出來是什麼意思？",
      "每邊餘數大於 0，表示手邊槓片湊不出目標；頁面會顯示實際可達總重與下一個較重建議。",
      "這會估算我的最大重量（1RM）嗎？",
      "不會。這只依目標總重選槓片，不估算任何人的最大重量。",
      "槓鈴夾的重量算進去了嗎？",
      "沒有。槓鈴夾以 0 公斤計；若你的夾子有重量，請把它加進槓鈴重量欄。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Barbell Plate Calculator | Gloss Tools",
    description:
      "Enter a target total, bar weight and the plates you have, and see which plates go on each side — and how close you can get when the exact weight is not reachable.",
    h1: "Barbell Plate Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What does “not reachable” mean?",
      "A per-side remainder above 0 means your plates cannot make the target; the page shows the achievable total and the next heavier suggestion.",
      "Does it estimate my one-rep max (1RM)?",
      "No. It only picks plates for a target total; it never estimates anyone's maximum lift.",
      "Are collar weights included?",
      "No. Collars count as 0 kg; if yours have weight, add it to the bar weight field.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-targetKg",
  "field-barKg",
  "field-pairs25",
  "field-pairs20",
  "field-pairs15",
  "field-pairs10",
  "field-pairs5",
  "field-pairs2_5",
  "field-pairs1_25",
];
const ERROR_IDS = [
  "error-targetKg",
  "error-barKg",
  "error-pairs25",
  "error-pairs20",
  "error-pairs15",
  "error-pairs10",
  "error-pairs5",
  "error-pairs2_5",
  "error-pairs1_25",
];
const BAR_PRESET_IDS = ["bar-preset-20", "bar-preset-15", "bar-preset-10"];
const REGION_IDS = ["summary-rows", "plates-rows", "remainder-note"];
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
  if (!html.includes(DISCLAIMER_ZH)) fail(`${page.path}: missing disclaimer (zh)`);
  if (!html.includes(DISCLAIMER_EN)) fail(`${page.path}: missing disclaimer (en)`);
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
  for (const id of BAR_PRESET_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing bar preset ${id}`);
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
    resolve(PROJECT_ROOT, "public/js/core/barbell-plate-calculator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "barbell-plate-calculator-worker-"));
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
// controller. The core must be purely a function of its nine input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/barbell-plate-calculator.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/barbell-plate-calculator.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/barbell-plate-calculator.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/barbell-plate-calculator.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/plates/example, pages, syntax, worker concatenation, capability scan, core purity",
);
