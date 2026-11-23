// Static project checks for the Brick Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, preset table, example equals the vendored fixtures.json
// case 1, the vendored fixtures hash, bilingual metadata, the pinned
// FAQ answers, the bilingual structural disclaimer, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/storage/
// clock), syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-brick-calculator-20261121, spec candidate commit
// f3a6e9d8b1047c2ad8aca895911bdc5eaa70bdbc, draft spec PR #384,
// registry rev 1767); the spec PR is not merged into this branch's
// base, so the check reads the vendored copy rather than a repo-level
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
  "public/js/core/brick-calculator.mjs",
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
const FIXTURES_SHA256 = "bdc037d46a01788bf347235722248f1fe8fc974dc03849caeda9b66102307596";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, report
// filename/limit, the pinned preset table, and the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/brick-calculator.mjs")).href
);
if (!deepEqual(core.FIELDS, [
  "wallLengthM",
  "wallHeightM",
  "openings",
  "brickPreset",
  "brickLengthMm",
  "brickHeightMm",
  "brickWidthMm",
  "jointMm",
  "wastePct",
])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.DEFAULTS, {
  wallLengthM: "4",
  wallHeightM: "2.5",
  openings: [],
  brickPreset: "taiwan-red",
  jointMm: "10",
  wastePct: "5",
})) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (core.WALL_MIN_MM !== 10) fail("core: WALL_MIN_MM mismatch");
if (core.WALL_MAX_MM !== 100000) fail("core: WALL_MAX_MM mismatch");
if (core.JOINT_MIN_TENTHS_MM !== 0) fail("core: JOINT_MIN_TENTHS_MM mismatch");
if (core.JOINT_MAX_TENTHS_MM !== 200) fail("core: JOINT_MAX_TENTHS_MM mismatch");
if (core.WASTE_MIN_HUNDREDTHS !== 0) fail("core: WASTE_MIN_HUNDREDTHS mismatch");
if (core.WASTE_MAX_HUNDREDTHS !== 5000) fail("core: WASTE_MAX_HUNDREDTHS mismatch");
if (core.BRICK_LENGTH_MIN_MM !== 20) fail("core: BRICK_LENGTH_MIN_MM mismatch");
if (core.BRICK_LENGTH_MAX_MM !== 500) fail("core: BRICK_LENGTH_MAX_MM mismatch");
if (core.BRICK_HEIGHT_MIN_MM !== 20) fail("core: BRICK_HEIGHT_MIN_MM mismatch");
if (core.BRICK_HEIGHT_MAX_MM !== 300) fail("core: BRICK_HEIGHT_MAX_MM mismatch");
if (core.BRICK_WIDTH_MIN_MM !== 20) fail("core: BRICK_WIDTH_MIN_MM mismatch");
if (core.BRICK_WIDTH_MAX_MM !== 300) fail("core: BRICK_WIDTH_MAX_MM mismatch");
if (core.MAX_OPENINGS !== 10) fail("core: MAX_OPENINGS must be 10");
if (core.REPORT_FILENAME !== "brick-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_PRESETS = {
  "taiwan-red": { nameZh: "紅磚", nameEn: "Taiwan red brick", lengthMm: 230, heightMm: 60, widthMm: 110 },
  "uk-standard": { nameZh: "英規標準磚", nameEn: "UK standard brick", lengthMm: 215, heightMm: 65, widthMm: 102.5 },
  "us-modular": { nameZh: "美規模組磚", nameEn: "US modular brick", lengthMm: 194, heightMm: 57, widthMm: 92 },
};
if (!deepEqual(core.PRESETS, EXPECTED_PRESETS)) fail("core: PRESETS table mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-brick-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 11) {
  fail("test/fixtures.json: expected 11 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual structural disclaimer in both languages on both
// pages, the pinned FAQ answers, the draft-loss note, and the form
// control ids.
const DISCLAIMER_ZH =
  "這是採購估算，不是結構設計；承重、配比與施工請依專業設計。";
const DISCLAIMER_EN =
  "This is a purchasing estimate, not a structural design; follow professional design for load-bearing, mix and workmanship.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "磚塊用量計算｜Gloss Tools",
    description:
      "輸入牆長、牆高、門窗開口、磚種、灰縫與損耗率，算出淨磚數、應購磚數與砂漿體積。",
    h1: "磚塊用量計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "損耗加在哪裡？",
      "損耗加在未捨入的淨磚數上再無條件進位，不是加在已進位的整數上。",
      "灰縫 0 時砂漿為什麼是 0？",
      "本工具的砂漿是牆體減磚體的差值，灰縫為 0 代表磚與磚之間沒有砂漿空間。",
      "這是結構設計嗎？",
      "不是。這是採購估算，不做結構設計；承重、配比與施工請依專業設計。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Brick Calculator | Gloss Tools",
    description:
      "Enter wall size, openings, brick type, joint and waste to get net bricks, bricks to buy and mortar volume.",
    h1: "Brick Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Where is waste applied?",
      "Waste is added to the unrounded net brick count, then rounded up — never to the already-rounded integer.",
      "Why is mortar zero with a 0 mm joint?",
      "Mortar here is wall volume minus brick volume, so a zero joint leaves no mortar space.",
      "Is this a structural design?",
      "No. This is a purchasing estimate, not a structural design; follow professional design for load-bearing, mix and workmanship.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-wallLengthM",
  "field-wallHeightM",
  "field-brickPreset",
  "field-brickLengthMm",
  "field-brickHeightMm",
  "field-brickWidthMm",
  "field-jointMm",
  "field-wastePct",
];
const ERROR_IDS = [
  "error-wallLengthM",
  "error-wallHeightM",
  "error-brickPreset",
  "error-brickLengthMm",
  "error-brickHeightMm",
  "error-brickWidthMm",
  "error-jointMm",
  "error-wastePct",
  "error-openings",
];
const REGION_IDS = ["summary-rows", "detail-rows", "openings-list", "custom-dims"];
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
    resolve(PROJECT_ROOT, "public/js/core/brick-calculator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "brick-calculator-worker-"));
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
// controller. The core must be purely a function of its inputs, so a
// bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/brick-calculator.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/brick-calculator.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/brick-calculator.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/brick-calculator.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/presets/example, pages, syntax, worker concatenation, capability scan, core purity",
);
