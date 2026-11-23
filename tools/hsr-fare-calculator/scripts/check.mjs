// Static project checks for the HSR Fare Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, quantity capacity, report
// filename and limit, the 12-station table with km marks, spot
// values from all three full-fare tables, the three business
// not-sold pairs, example equals the vendored fixtures.json case 1,
// the vendored fixtures hash, bilingual metadata, the pinned FAQ
// answers, the bilingual fare note, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-hsr-fare-calculator-20261121, draft spec PR #389, registry
// rev 1792 per the parent task); the spec PR is not merged into
// this branch's base, so the check reads the vendored copy rather
// than a repo-level docs path.

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
  "public/js/core/hsr-fare.mjs",
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
// the fixed spec fixtures.
const FIXTURES_SHA256 = "c8890da6bd89bd1ce4f49775e0e220cbea80dc4cd3020ed3cb452a09903514a9";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, quantity capacity/range,
// report filename/limit, the 12-station table (codes and km marks),
// spot values from all three fare tables, the three business
// not-sold pairs, and the example must match the SPEC and the
// vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/hsr-fare.mjs")).href
);
if (!deepEqual(core.FIELDS, ["origin", "destination", "cabin", "fareKind", "quantity"])) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    origin: "TPE",
    destination: "TAC",
    cabin: "standard",
    fareKind: "full",
    quantity: "1",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.QUANTITY_MAX_RAW_UNITS !== 8) fail("core: QUANTITY_MAX_RAW_UNITS must be 8");
if (core.ENUM_MAX_RAW_UNITS !== 16) fail("core: ENUM_MAX_RAW_UNITS must be 16");
if (core.QUANTITY_MIN !== 1) fail("core: QUANTITY_MIN mismatch");
if (core.QUANTITY_MAX !== 10) fail("core: QUANTITY_MAX mismatch");
if (core.REPORT_FILENAME !== "hsr-fare-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  !deepEqual(
    core.STATIONS.map((station) => station.code),
    ["NAG", "TPE", "BAQ", "TAY", "HSC", "MIL", "TAC", "CHH", "YUL", "CHY", "TAN", "ZUY"],
  )
) {
  fail("core: STATIONS codes mismatch");
}
if (
  !deepEqual(
    core.STATIONS.map((station) => station.kmTenths),
    [0, 59, 131, 423, 722, 1049, 1657, 1939, 2185, 2516, 3139, 3452],
  )
) {
  fail("core: STATIONS km marks mismatch");
}
if (!deepEqual(core.CABINS, ["standard", "business", "nonreserved"])) {
  fail("core: CABINS mismatch");
}
if (
  !deepEqual(core.FARE_KINDS, [
    "full",
    "concession",
    "earlyBird65",
    "earlyBird80",
    "earlyBird90",
    "student50",
    "student75",
    "student88",
  ])
) {
  fail("core: FARE_KINDS mismatch");
}
if (
  !deepEqual(core.BUSINESS_NOT_SOLD_PAIRS, [
    ["NAG", "TPE"],
    ["NAG", "BAQ"],
    ["TPE", "BAQ"],
  ])
) {
  fail("core: BUSINESS_NOT_SOLD_PAIRS mismatch");
}
// Spot values read straight from the SPEC's three tables.
const spotFares = [
  ["TPE", "ZUY", { standard: 1490, business: 2440, nonreserved: 1445 }],
  ["NAG", "ZUY", { standard: 1530, business: 2500, nonreserved: 1480 }],
  ["NAG", "TPE", { standard: 40, business: null, nonreserved: 35 }],
  ["NAG", "BAQ", { standard: 70, business: null, nonreserved: 65 }],
  ["TPE", "BAQ", { standard: 40, business: null, nonreserved: 35 }],
  ["TPE", "TAC", { standard: 700, business: 1250, nonreserved: 675 }],
  ["TAC", "CHH", { standard: 130, business: 400, nonreserved: 125 }],
  ["CHH", "YUL", { standard: 110, business: 370, nonreserved: 105 }],
  ["TAN", "ZUY", { standard: 140, business: 410, nonreserved: 135 }],
  ["MIL", "TAC", { standard: 270, business: 610, nonreserved: 260 }],
];
for (const [origin, destination, expected] of spotFares) {
  if (!deepEqual(core.cabinFares(origin, destination), expected)) {
    fail(`core: cabinFares(${origin}, ${destination}) mismatch`);
  }
}
if (core.cabinFares("TPE", "TPE") !== null) fail("core: cabinFares same station must be null");
if (core.cabinFares("XXX", "ZUY") !== null) fail("core: cabinFares unknown code must be null");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-hsr-fare-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, the bilingual
// fare note, the pinned FAQ answers, the draft-loss note, and the
// form control ids.
const FARE_NOTE_ZH =
  "票價以 2026-11-21 查核的台灣高鐵官方公告為準；官方調價後以新版為準，本工具不自動跟價。早鳥與大學生優惠只限指定車次且限量，買得到該折數時才適用表列價格。";
const FARE_NOTE_EN =
  "Fares follow the Taiwan High Speed Rail official tables as checked on 2026-11-21; later official fare changes apply instead, and this tool does not track them automatically. Early Bird and student discounts apply only to designated trains with limited quotas; the listed price applies only when that discount is available.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "高鐵票價試算｜Gloss Tools",
    description:
      "選出發站與到達站、車廂與票種，依台灣高鐵官方公告票價表試算單張與多張總票價。",
    h1: "高鐵票價試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "票價是即時查詢嗎？",
      "不是，本工具依官方公告票價表靜態試算，不查班次與剩餘座位。",
      "早鳥或大學生優惠一定買得到嗎？",
      "不一定，只限指定車次且限量，買得到該折數時才適用表列價格。",
      "身高未滿 115 公分的兒童要買票嗎？",
      "不需佔位時得免票，每位全票或成年旅客最多帶 2 名；需要座位時應依規定購票。",
      "為什麼南港─台北沒有商務車廂票價？",
      "南港─台北、南港─板橋、台北─板橋三組短區間不發售商務車廂車票。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "HSR Fare Calculator | Gloss Tools",
    description:
      "Pick origin and destination stations, cabin and fare type to estimate per-ticket and total Taiwan High Speed Rail fares from the official fare tables.",
    h1: "HSR Fare Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Is this a live fare lookup?",
      "No. It estimates from the published official fare tables and does not check trains or seat availability.",
      "Are Early Bird or student discounts always available?",
      "No. They apply only to designated trains with limited quotas; the listed price applies only when that discount is available.",
      "Does a child under 115 cm need a ticket?",
      "No ticket is needed when no seat is used, up to 2 children per full-fare adult; a seat requires a ticket under the rules.",
      "Why is there no business fare for Nangang–Taipei?",
      "Business class is not sold on the Nangang–Taipei, Nangang–Banqiao and Taipei–Banqiao short segments.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-origin",
  "field-destination",
  "field-cabin",
  "field-fareKind",
  "field-quantity",
];
const ERROR_IDS = [
  "error-origin",
  "error-destination",
  "error-cabin",
  "error-fareKind",
  "error-quantity",
];
const REGION_IDS = ["summary-rows", "compare-rows"];
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
  if (!html.includes(FARE_NOTE_ZH)) fail(`${page.path}: missing fare note (zh)`);
  if (!html.includes(FARE_NOTE_EN)) fail(`${page.path}: missing fare note (en)`);
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
    resolve(PROJECT_ROOT, "public/js/core/hsr-fare.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "hsr-fare-calculator-worker-"));
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
// controller. The core must be purely a function of its five input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/hsr-fare.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/hsr-fare.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/hsr-fare.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/hsr-fare.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/capacity/stations/spot fares/example, pages, syntax, worker concatenation, capability scan, core purity",
);
