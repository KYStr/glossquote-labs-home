// Static project checks for the Room Heater Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, W/m2 table, standard
// sizes, multi-unit rule, report filename and limit, example equals
// the vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// estimate note, and the candidate noindex / no-canonical rules),
// core purity (no DOM/network/storage/clock), syntax of every
// shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures (spec-room-heater-calculator-20261121, spec
// candidate commit d1aa3f2a79444eac5104b66dba2b7ceec2c592df, draft
// spec PR #380); the spec PR is not merged into this branch's base,
// so the check reads the vendored copy rather than a repo-level docs
// path.

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
  "public/js/core/room-heater.mjs",
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
const FIXTURES_SHA256 = "6dc7bd747914a4830407d4f4107d90f8e346e975559351b5d415ed93f8290e6c";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, enum values,
// W/m2 table, standard sizes, multi-unit rule, report filename/limit,
// the multi-unit note, and the example must match the SPEC and the
// vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/room-heater.mjs")).href
);
if (!deepEqual(core.FIELDS, ["area", "areaUnit", "ceilingHeight", "insulation"])) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    area: "10",
    areaUnit: "m2",
    ceilingHeight: "2.4",
    insulation: "average",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (!deepEqual(core.AREA_UNIT_VALUES, ["m2", "ping"])) fail("core: AREA_UNIT_VALUES mismatch");
if (!deepEqual(core.INSULATION_VALUES, ["good", "average", "poor"])) {
  fail("core: INSULATION_VALUES mismatch");
}
if (!deepEqual(core.W_PER_M2, { good: 60, average: 80, poor: 130 })) {
  fail("core: W_PER_M2 table mismatch");
}
if (
  !deepEqual(core.STANDARD_SIZES, [400, 500, 600, 800, 1000, 1200, 1500, 2000, 2500, 3000])
) {
  fail("core: STANDARD_SIZES mismatch");
}
if (core.MULTI_UNIT_SIZE !== 2000) fail("core: MULTI_UNIT_SIZE mismatch");
if (core.MULTI_UNIT_THRESHOLD !== 3000) fail("core: MULTI_UNIT_THRESHOLD mismatch");
if (core.REPORT_FILENAME !== "room-heater-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (core.MULTI_UNIT_NOTE_ZH !== "建議分裝多台，勿用單一延長線串接。") {
  fail("core: MULTI_UNIT_NOTE_ZH mismatch");
}
if (
  core.MULTI_UNIT_NOTE_EN !==
  "Use multiple units; do not daisy-chain on one extension cord."
) {
  fail("core: MULTI_UNIT_NOTE_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-room-heater-calculator-20261121") {
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
// the bilingual estimate note in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const NOTE_ZH =
  "本工具是選型估算，不是專業熱損失計算；結果僅供購買參考。大坪數、挑高或特殊格局請諮詢專業人員。";
const NOTE_EN =
  "This tool is a sizing estimate, not a professional heat-loss calculation; the result is for purchase guidance only. For large rooms, high ceilings or unusual layouts, consult a professional.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "暖氣功率試算｜Gloss Tools",
    description:
      "冬天買電暖器前，先確認房間需要幾瓦：填入面積、天花板高度與隔熱等級，算出所需瓦數與建議規格。",
    h1: "暖氣功率試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "坪怎麼換算？",
      "1 坪＝400/121 平方公尺（約 3.305785 m²）。",
      "這是專業熱損失計算嗎？",
      "不是，這是依隔熱等級的經驗法則估算，僅供選購參考；大坪數、挑高或特殊格局請諮詢專業人員。",
      "為什麼建議規格比所需瓦數大？",
      "市售電暖器只有固定瓦數檔位，建議取大於等於所需瓦數的最小檔位；超過 3000 W 時建議分裝多台 2000 W。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Room Heater Calculator | Gloss Tools",
    description:
      "Before buying a space heater, check how many watts your room needs from its area, ceiling height and insulation level.",
    h1: "Room Heater Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is 坪 converted?",
      "1 坪 = 400/121 m² (about 3.305785 m²).",
      "Is this a professional heat-loss calculation?",
      "No, it is a rule-of-thumb estimate by insulation level, for sizing guidance only; consult a professional for large rooms, high ceilings or unusual layouts.",
      "Why is the recommended size larger than the required wattage?",
      "Heaters are sold in fixed wattage steps, so the recommendation is the smallest step at or above the required wattage; above 3000 W, use multiple 2000 W units.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-area", "field-area-unit", "field-ceiling-height", "field-insulation"];
const ERROR_IDS = ["error-area", "error-area-unit", "error-ceiling-height", "error-insulation"];
const REGION_IDS = ["summary-rows", "detail-rows", "multi-note"];
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
  if (!html.includes(NOTE_ZH)) fail(`${page.path}: missing estimate note (zh)`);
  if (!html.includes(NOTE_EN)) fail(`${page.path}: missing estimate note (en)`);
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
    await execFileAsync(process.execPath, ["--check", file]);
  } catch (error) {
    fail(`${file}: syntax check failed: ${error.stderr ?? error.message}`);
  }
}
{
  const coreSource = await readFile(
    resolve(PROJECT_ROOT, "public/js/core/room-heater.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "room-heater-calculator-worker-"));
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
// controller. The core must be purely a function of its four input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/room-heater.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/room-heater.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/room-heater.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/room-heater.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/example, pages, syntax, worker concatenation, capability scan, core purity",
);
