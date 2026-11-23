// Static project checks for the Carbon Footprint Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, fuel-type enum, factor
// table, report filename and limit, example equals the vendored
// fixtures.json case 1, the vendored fixtures hash, bilingual
// metadata, the pinned FAQ answers, the bilingual disclaimer, the
// factor table, the Taiwan context line, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-carbon-footprint-calculator-20261121, spec candidate commit
// 5ce91f2f044624b42522398aa51b90d90fcecf10, draft spec PR #402); the
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
  "public/js/core/carbon-footprint.mjs",
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
const FIXTURES_SHA256 = "dd84d4401036eac5313242675b3cc2eedfd545f3f0a5e539159cfab27452b0d5";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, fuel
// enum, pinned factor table, report filename/limit, category key
// order, disclaimer, and the example must match the SPEC and the
// vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/carbon-footprint.mjs")).href
);
const EXPECTED_FIELDS = [
  "electricityKwhPerMonth",
  "carKmPerYear",
  "carFuelLPer100Km",
  "carFuelType",
  "busKmPerYear",
  "railKmPerYear",
  "flightShortKmPerYear",
  "flightLongKmPerYear",
  "dietBeefKgPerWeek",
  "dietPorkKgPerWeek",
  "dietPoultryKgPerWeek",
  "dietFishKgPerWeek",
  "dietEggsKgPerWeek",
  "dietRiceKgPerWeek",
];
if (!deepEqual(core.FIELDS, EXPECTED_FIELDS)) fail("core: FIELDS order mismatch");
const EXPECTED_DEFAULTS = {
  electricityKwhPerMonth: "300",
  carKmPerYear: "0",
  carFuelLPer100Km: "8",
  carFuelType: "gasoline",
  busKmPerYear: "0",
  railKmPerYear: "0",
  flightShortKmPerYear: "0",
  flightLongKmPerYear: "0",
  dietBeefKgPerWeek: "0",
  dietPorkKgPerWeek: "0",
  dietPoultryKgPerWeek: "0",
  dietFishKgPerWeek: "0",
  dietEggsKgPerWeek: "0",
  dietRiceKgPerWeek: "0",
};
if (!deepEqual(core.DEFAULTS, EXPECTED_DEFAULTS)) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
const EXPECTED_RANGES = {
  electricityKwhPerMonth: [0, 100000],
  carKmPerYear: [0, 500000],
  carFuelLPer100Km: [0, 100],
  busKmPerYear: [0, 1000000],
  railKmPerYear: [0, 1000000],
  flightShortKmPerYear: [0, 1000000],
  flightLongKmPerYear: [0, 1000000],
  dietBeefKgPerWeek: [0, 100],
  dietPorkKgPerWeek: [0, 100],
  dietPoultryKgPerWeek: [0, 100],
  dietFishKgPerWeek: [0, 100],
  dietEggsKgPerWeek: [0, 100],
  dietRiceKgPerWeek: [0, 100],
};
if (!deepEqual(core.RANGES, EXPECTED_RANGES)) fail("core: RANGES mismatch");
if (!deepEqual(core.FUEL_TYPES, ["gasoline", "diesel"])) fail("core: FUEL_TYPES mismatch");
const EXPECTED_FACTORS = {
  electricityKwh: { num: 471, den: 1000 },
  gasolineL: { num: 231, den: 100 },
  dieselL: { num: 268, den: 100 },
  busKm: { num: 102, den: 1000 },
  railKm: { num: 35, den: 1000 },
  flightShortKm: { num: 153, den: 1000 },
  flightLongKm: { num: 148, den: 1000 },
  dietBeefKg: { num: 995, den: 10 },
  dietPorkKg: { num: 123, den: 10 },
  dietPoultryKg: { num: 99, den: 10 },
  dietFishKg: { num: 136, den: 10 },
  dietEggsKg: { num: 47, den: 10 },
  dietRiceKg: { num: 45, den: 10 },
};
if (!deepEqual(core.FACTORS, EXPECTED_FACTORS)) fail("core: FACTORS table mismatch");
if (!deepEqual(core.CATEGORY_KEYS, ["electricity", "car", "bus", "rail", "flights", "diet"])) {
  fail("core: CATEGORY_KEYS order mismatch");
}
if (core.REPORT_FILENAME !== "carbon-footprint-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  core.DISCLAIMER_ZH !==
  "本工具結果為估算值，僅供個人參考，不構成正式碳盤查、碳足跡查證或任何申報依據。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "Results are estimates for personal reference only and are not a formal carbon inventory, verified footprint, or reporting basis."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-carbon-footprint-calculator-20261121") {
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

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the factor table values, the Taiwan context
// line, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具結果為估算值，僅供個人參考，不構成正式碳盤查、碳足跡查證或任何申報依據。";
const DISCLAIMER_EN =
  "Results are estimates for personal reference only and are not a formal carbon inventory, verified footprint, or reporting basis.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "碳足跡計算｜Gloss Tools",
    description:
      "輸入用電、交通與飲食，以官方排放係數估算一年碳足跡（公斤 CO2e），並看到六大類別的拆解。",
    h1: "碳足跡計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "結果是正式碳盤查嗎？",
      "不是，這是估算值，僅供個人參考。",
      "為什麼牛肉的係數這麼高？",
      // The page carries the pinned text HTML-escaped (&amp;); the
      // visible text after parsing is the SPEC's "Poore & Nemecek ...".
      "飲食係數取 Poore &amp; Nemecek (2018) 全球平均（含土地利用變化），生產方式差異極大，數值僅供比較參考。",
      "機車怎麼算？",
      "機車用同一組車輛欄位，填機車里程與油耗即可。",
    ],
    factors: [
      "0.471 公斤 CO2e／度",
      "2.31 公斤 CO2／公升",
      "2.68 公斤 CO2／公升",
      "0.102 公斤 CO2e／延人公里",
      "0.035 公斤 CO2e／延人公里",
      "0.153 公斤 CO2e／延人公里",
      "0.148 公斤 CO2e／延人公里",
      "99.5 公斤 CO2e／公斤",
      "12.3 公斤 CO2e／公斤",
      "9.9 公斤 CO2e／公斤",
      "13.6 公斤 CO2e／公斤",
      "4.7 公斤 CO2e／公斤",
      "4.5 公斤 CO2e／公斤",
    ],
    context:
      "台灣 2024 年人均溫室氣體排放約 11.7 公噸 CO2e（全國總量約 273 百萬公噸／人口約 2,340 萬人，2026 年版國家溫室氣體排放清冊），僅供對照，不作達標判定。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Carbon Footprint Calculator | Gloss Tools",
    description:
      "Estimate your annual carbon footprint in kg CO2e from electricity, transport and diet using official emission factors, with a breakdown by category.",
    h1: "Carbon Footprint Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Is this a formal carbon inventory?",
      "No, it is an estimate for personal reference only.",
      "Why is the beef factor so high?",
      "Diet factors are Poore &amp; Nemecek (2018) global averages including land-use change; production methods vary widely, so treat the figures as comparative estimates.",
      "How do I count a scooter?",
      "Use the same vehicle fields with your scooter's distance and fuel use.",
    ],
    factors: [
      "0.471 kg CO2e/kWh",
      "2.31 kg CO2/litre",
      "2.68 kg CO2/litre",
      "0.102 kg CO2e/passenger-km",
      "0.035 kg CO2e/passenger-km",
      "0.153 kg CO2e/passenger-km",
      "0.148 kg CO2e/passenger-km",
      "99.5 kg CO2e/kg",
      "12.3 kg CO2e/kg",
      "9.9 kg CO2e/kg",
      "13.6 kg CO2e/kg",
      "4.7 kg CO2e/kg",
      "4.5 kg CO2e/kg",
    ],
    context:
      "Taiwan's 2024 per-capita greenhouse gas emissions were about 11.7 tonnes CO2e (national total about 273 million tonnes / population about 23.4 million, 2026 National Greenhouse Gas Inventory). For reference only — not a pass/fail target.",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = EXPECTED_FIELDS.map((field) => `field-${field}`);
const ERROR_IDS = EXPECTED_FIELDS.map((field) => `error-${field}`);
const REGION_IDS = ["summary-rows", "category-rows"];
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
  for (const text of page.factors) {
    if (!html.includes(text)) fail(`${page.path}: missing factor text: ${text}`);
  }
  if (!html.includes(page.context)) fail(`${page.path}: missing Taiwan context line`);
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
    resolve(PROJECT_ROOT, "public/js/core/carbon-footprint.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "carbon-footprint-calculator-worker-"));
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
// controller. The core must be purely a function of its fourteen input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/carbon-footprint.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/carbon-footprint.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/carbon-footprint.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/carbon-footprint.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/factors/example, pages, syntax, worker concatenation, capability scan, core purity",
);
