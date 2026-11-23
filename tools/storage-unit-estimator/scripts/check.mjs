// Static project checks for the Storage Unit Estimator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (row/quantity/dimension limits, defaults, report
// filename and limit, the 21-item volume table, the 6-unit size
// table, example equals the vendored fixtures.json case 1, the
// vendored fixtures hash, bilingual metadata, the pinned FAQ
// answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-storage-unit-estimator-20261121, draft spec PR #382); the
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
  "public/js/core/storage-unit-estimator.mjs",
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
const FIXTURES_SHA256 = "ad67d39f7af13ce2d2b7722336f265a19ccadec68810b2f4f5d47b4e003d9738";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: limits, defaults, the pinned 21-item volume table
// (2-decimal m^3 literals as integer hundredths), the pinned 6-unit
// size table, report filename/limit, and the example must match the
// SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/storage-unit-estimator.mjs")).href
);
if (core.MAX_ROWS !== 30) fail("core: MAX_ROWS must be 30");
if (core.MAX_ITEM_ID_UNITS !== 32) fail("core: MAX_ITEM_ID_UNITS must be 32");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.QUANTITY_MIN !== 1 || core.QUANTITY_MAX !== 99) fail("core: quantity range mismatch");
if (core.DIM_MIN_CM !== 1 || core.DIM_MAX_CM !== 300) fail("core: dimension range mismatch");
if (!deepEqual(core.DEFAULTS, {
  items: [
    { itemId: "single-bed", quantity: "1" },
    { itemId: "wardrobe", quantity: "1" },
    { itemId: "box-medium", quantity: "2" },
  ],
})) fail("core: DEFAULTS mismatch");
if (core.REPORT_FILENAME !== "storage-unit-estimator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_VOLUMES = {
  "sofa-3-seat": 170, "sofa-2-seat": 130, armchair: 73, "double-bed": 182,
  "single-bed": 114, "dining-table": 84, "dining-chair": 20, wardrobe: 144,
  "chest-drawers": 55, bookshelf: 63, desk: 54, "coffee-table": 27,
  "refrigerator-large": 122, "refrigerator-small": 50, "washing-machine": 31,
  dryer: 31, "tv-55": 10, microwave: 6,
  "box-small": 6, "box-medium": 13, "box-large": 22,
};
const itemIds = Object.keys(core.ITEMS);
if (itemIds.length !== 21) fail("core: ITEMS must hold exactly 21 pinned items");
for (const [itemId, hundredths] of Object.entries(EXPECTED_VOLUMES)) {
  if (core.ITEMS[itemId]?.unitVolumeHundredths !== hundredths) {
    fail(`core: ITEMS ${itemId} volume mismatch`);
  }
}
const EXPECTED_UNITS = [
  { unitId: "5x5", unitLabelFt: "5 × 5 ft", floorAreaHundredths: 232, floorAreaPingHundredths: 70, capacityHundredths: 566 },
  { unitId: "5x10", unitLabelFt: "5 × 10 ft", floorAreaHundredths: 465, floorAreaPingHundredths: 141, capacityHundredths: 1133 },
  { unitId: "10x10", unitLabelFt: "10 × 10 ft", floorAreaHundredths: 929, floorAreaPingHundredths: 281, capacityHundredths: 2265 },
  { unitId: "10x15", unitLabelFt: "10 × 15 ft", floorAreaHundredths: 1394, floorAreaPingHundredths: 422, capacityHundredths: 3398 },
  { unitId: "10x20", unitLabelFt: "10 × 20 ft", floorAreaHundredths: 1858, floorAreaPingHundredths: 562, capacityHundredths: 4531 },
  { unitId: "10x30", unitLabelFt: "10 × 30 ft", floorAreaHundredths: 2787, floorAreaPingHundredths: 843, capacityHundredths: 6796 },
];
if (!deepEqual(core.UNITS, EXPECTED_UNITS)) fail("core: UNITS table mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-storage-unit-estimator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具是體積估算，不是實際裝載規劃；結果僅供選租參考，實際能否裝入還受物品形狀、門寬與堆疊方式影響。";
const DISCLAIMER_EN =
  "This tool estimates volume; it is not a loading plan. Results are for choosing a unit size only — whether everything actually fits also depends on item shapes, door width, and how things are stacked.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "倉儲空間估算｜Gloss Tools",
    description:
      "搬家或裝修前，先算東西總共多大：加入家具、家電與箱子，算出總體積與推薦的倉儲單位尺寸。",
    h1: "倉儲空間估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "體積怎麼算？",
      "每件物品以釘版典型外形尺寸的長×寬×高換算成立方公尺，再乘以數量加總；自訂物品以輸入的長寬高計算。",
      "為什麼需要體積比總體積大 25%？",
      "物品不是完美立方體，堆疊會有空隙，單位內還要留走道；本工具以固定 25% 預留估算，不是實測裝載效率。",
      "推薦的單位一定裝得下嗎？",
      "不一定。推薦以體積比較，實際還受物品形狀、門寬與堆疊方式影響；超大或不規則物品請先量門寬並向業者確認。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Storage Unit Estimator | Gloss Tools",
    description:
      "Before moving or renovating, work out how much space your things need: add furniture, appliances and boxes to get the total volume and a recommended storage unit size.",
    h1: "Storage Unit Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is volume calculated?",
      "Each item uses its pinned typical outer dimensions (length × width × height) converted to cubic metres, multiplied by quantity and summed; custom items use the dimensions you enter.",
      "Why is the required volume 25% more than the total?",
      "Items are not perfect cubes, stacking leaves gaps, and you need an aisle inside the unit; the tool applies a fixed 25% allowance, not a measured packing efficiency.",
      "Will the recommended unit definitely fit everything?",
      "Not necessarily. The recommendation compares volumes only; shape, door width and stacking also matter. Measure the door and check with the facility for oversized or irregular items.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const REGION_IDS = [
  "entry-form",
  "rows-list",
  "add-row-btn",
  "row-limit-note",
  "status",
  "summary-rows",
  "rows-table-body",
  "overflow-note",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
];
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
  for (const id of REGION_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing region ${id}`);
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
    resolve(PROJECT_ROOT, "public/js/core/storage-unit-estimator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "storage-unit-estimator-worker-"));
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
// controller. The core must be purely a function of its input, so a
// bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/storage-unit-estimator.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/storage-unit-estimator.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/storage-unit-estimator.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/storage-unit-estimator.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core limits/defaults/tables/example, pages, syntax, worker concatenation, capability scan, core purity",
);
