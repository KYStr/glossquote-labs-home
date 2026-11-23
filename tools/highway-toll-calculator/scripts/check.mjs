// Static project checks for the Highway Toll Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (field order, per-field capacities, defaults, example
// equals the vendored fixtures.json case 1, report filename and limit,
// the 14-station interchange table, the rate table, bilingual
// metadata, the SPEC-pinned disclosure statement, FAQ answers,
// status strings, and the candidate noindex / no-canonical rules),
// core purity (no DOM/network/storage, no host-clock or timezone
// reads), syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures (spec draft PR #388,
// registry rev 1787); the spec PR is not merged into this branch's
// base, so the check reads the vendored copy rather than a repo-level
// docs path.

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
  "public/js/core/toll.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
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

// Forbidden runtime capabilities, assembled from fragments so this file
// does not match its own scan.
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

// Core contract: field order, capacities, defaults, report constants,
// the interchange table, the rate table, and the example must match
// the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/toll.mjs")).href);
const expectedFields = ["mode", "vehicleType", "entry", "exit", "distanceKm", "priorKm", "etag"];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.FIELD_LIMITS, {
    mode: 16,
    vehicleType: 16,
    entry: 16,
    exit: 16,
    distanceKm: 16,
    priorKm: 16,
    etag: 16,
  })
) {
  fail("core: FIELD_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "distance",
  vehicleType: "small",
  distanceKm: "100",
  priorKm: "0",
  etag: "false",
  entry: null,
  exit: null,
};
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.REPORT_FILENAME !== "highway-toll-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const expectedInterchanges = [
  { id: "keelung", kmTenths: 0 },
  { id: "xizhi", kmTenths: 105 },
  { id: "neihu", kmTenths: 168 },
  { id: "taipei", kmTenths: 251 },
  { id: "wugu", kmTenths: 331 },
  { id: "linkou", kmTenths: 415 },
  { id: "taoyuan", kmTenths: 491 },
  { id: "zhongli", kmTenths: 624 },
  { id: "yangmei", kmTenths: 692 },
  { id: "hukou", kmTenths: 838 },
  { id: "taichung", kmTenths: 1786 },
  { id: "changhua", kmTenths: 1984 },
  { id: "tainan", kmTenths: 3274 },
  { id: "kaohsiung_end", kmTenths: 3728 },
];
if (!deepEqual(core.INTERCHANGES, expectedInterchanges)) {
  fail("core: INTERCHANGES table mismatch (14 Freeway 1 stations)");
}
if (
  !deepEqual(core.RATES, {
    small: { rateStandard: 1.2, rateLong: 0.9 },
    large: { rateStandard: 1.5, rateLong: 1.12 },
    trailer: { rateStandard: 1.8, rateLong: 1.35 },
  })
) {
  fail("core: RATES mismatch (large long rate is the table value 1.12)");
}
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-highway-toll-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "error").length !== 3) {
  fail("test/fixtures.json: expected 3 error cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 2) {
  fail("test/fixtures.json: expected 2 controller cases");
}

// App-level pins: the status strings.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const text of [
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "處理中",
  "Working",
]) {
  if (!appSource.includes(text)) fail(`app.js: missing SPEC-pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned disclosure statement (present in both the input and the
// results areas), the pinned FAQ answers, the draft-loss note, the
// results heading, and the form control / error ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "國道通行費試算｜Gloss Tools",
    description:
      "輸入里程或上下交流道，依台灣 ETC 計程收費規則試算國道通行費：每日 20 公里免費、200 公里以上長途 75 折、eTag 9 折。",
    h1: "國道通行費試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    disclosure: "門架牌價合計 389.6 元",
    faq: [
      "不是，每車每日一次，依車號每日歸戶合併計算。",
      "預儲帳戶餘額足夠扣款，或在通行次日起第 3–5 日內自行繳費；先打折、再四捨五入到元。",
      "不適用。連假另行公告單一費率，取消 20 公里優惠與長途折扣；本工具只算平常日／一般假日費率。",
      "實際按門架牌價加總，本工具以交流道里程估算；實際扣款以遠通電收帳務為準。",
    ],
    resultsHeading: "應繳通行費與分段明細",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    vehicleOptions: ["小型車", "大型車", "聯結車"],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Highway Toll Calculator | Gloss Tools",
    description:
      "Estimate Taiwan freeway ETC tolls from distance or entry and exit interchanges: 20 km free per day, 25% off beyond 200 km, 10% off with eTag.",
    h1: "Highway Toll Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    disclosure: "gantry prices total 389.6 dollars",
    faq: [
      "No — once per vehicle per day; all trips on the same day are settled together by licence plate.",
      "Keep a prepaid eTag balance high enough to cover the toll, or pay by yourself within 3–5 days after passage; the discount applies before rounding to the nearest dollar.",
      "No. Holidays use a separately announced flat rate with no free kilometres or long-distance discount; this tool covers normal and regular weekend rates only.",
      "Actual bills sum per-gantry prices; this tool estimates from interchange distances. The amount charged by the toll operator is authoritative.",
    ],
    resultsHeading: "Toll due and breakdown",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
    vehicleOptions: ["Small vehicle", "Large vehicle", "Articulated vehicle"],
  },
];
const FIELD_IDS = [
  "field-mode-distance",
  "field-mode-pair",
  "field-vehicleType",
  "field-entry",
  "field-exit",
  "field-distanceKm",
  "field-priorKm",
  "field-etag",
];
const ERROR_IDS = [
  "error-mode",
  "error-vehicleType",
  "error-entry",
  "error-exit",
  "error-distanceKm",
  "error-priorKm",
  "error-etag",
];
const INTERCHANGE_IDS = expectedInterchanges.map((entry) => entry.id);
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
  const noteCount = html.split(page.disclosure).length - 1;
  if (noteCount < 2) {
    fail(`${page.path}: disclosure statement must appear in both input and results areas (found ${noteCount})`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  if (!html.includes(page.resultsHeading)) fail(`${page.path}: missing results heading`);
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const option of page.vehicleOptions) {
    if (!html.includes(option)) fail(`${page.path}: missing vehicle option label: ${option}`);
  }
  for (const id of INTERCHANGE_IDS) {
    if (!html.includes(`value="${id}"`)) fail(`${page.path}: missing interchange option: ${id}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of ERROR_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing error slot ${id}`);
  }
  if (!html.includes('id="download-btn"')) fail(`${page.path}: missing download button`);
}

// Syntax-check every shipped script, and check the worker concatenation
// (core + handler) parses as one module.
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/toll.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "highway-toll-worker-"));
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

// Core purity: no DOM access in the pure modules or the controller, and
// no host-clock / timezone reads in the core (determinism contract).
for (const purePath of [
  "public/js/core/toll.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/toll.mjs"), "utf8");
  const stripped = coreText.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/\bDate\b/.test(stripped)) {
    fail("public/js/core/toll.mjs: core must not use Date (timezone independence)");
  }
  if (/\bIntl\b/.test(stripped)) {
    fail("public/js/core/toll.mjs: core must not use Intl (timezone independence)");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/example/interchanges/rates, pages, vehicle options, syntax, worker concatenation, capability scan, core purity",
);
