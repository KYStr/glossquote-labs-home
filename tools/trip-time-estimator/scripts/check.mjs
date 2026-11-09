// Static project checks for the Trip Time Estimator: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (field order, per-field capacities, defaults, example
// equals the vendored fixtures.json case 1, report filename and limit,
// bilingual metadata, the SPEC-pinned fixed-offset note, FAQ answers,
// route preset table, status strings, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage, no
// host-clock or timezone reads), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list. The vendored
// test/fixtures.json is a verbatim copy of the fixed spec's fixtures
// (spec candidate 8d2f3ec18de2885916da813361e4d19a68eac3da); the spec
// PR is not merged into this branch's base, so the check reads the
// vendored copy rather than a repo-level docs path.

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
  "public/js/core/trip.mjs",
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
// and the example must match the SPEC and the vendored fixtures.json
// case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/trip.mjs")).href);
const expectedFields = [
  "mode",
  "departureDate",
  "departureTime",
  "departureOffset",
  "arrivalOffset",
  "duration",
  "arrivalTime",
  "arrivalNextDay",
];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.FIELD_LIMITS, {
    mode: 16,
    departureDate: 16,
    departureTime: 8,
    departureOffset: 8,
    arrivalOffset: 8,
    duration: 8,
    arrivalTime: 8,
    arrivalNextDay: 8,
  })
) {
  fail("core: FIELD_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "duration",
  departureDate: "",
  departureTime: "",
  departureOffset: "+08:00",
  arrivalOffset: "+09:00",
  duration: "",
  arrivalTime: "",
  arrivalNextDay: "",
};
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.REPORT_FILENAME !== "trip-time-report.json") fail("core: REPORT_FILENAME mismatch");
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-trip-time-estimator-20261109") {
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

// App-level pins: the six route presets (offsets and names), the offset
// list bounds, the day-shift labels, and the status strings.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const text of [
  'departureOffset: "+08:00", arrivalOffset: "+09:00"',
  'departureOffset: "+08:00", arrivalOffset: "-08:00"',
  'departureOffset: "+08:00", arrivalOffset: "+00:00"',
  'departureOffset: "+08:00", arrivalOffset: "-05:00"',
  'departureOffset: "+08:00", arrivalOffset: "+10:00"',
  'departureOffset: "+08:00", arrivalOffset: "+01:00"',
  "臺北 → 東京",
  "Taipei → Tokyo",
  "臺北 → 洛杉磯",
  "Taipei → Los Angeles",
  "臺北 → 倫敦",
  "Taipei → London",
  "臺北 → 紐約",
  "Taipei → New York",
  "臺北 → 雪梨",
  "Taipei → Sydney",
  "臺北 → 巴黎",
  "Taipei → Paris",
  "minutes = -720; minutes <= 840; minutes += 15",
  "前一天",
  "the day before",
  "當天",
  "the same day",
  "隔天",
  "the next day",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "處理中",
]) {
  if (!appSource.includes(text)) fail(`app.js: missing SPEC-pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned fixed-offset note (present in both the input and the
// results areas), the pinned FAQ answers, the draft-loss note, the
// preset group label and standard-time note, the results heading, and
// the form control / error ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "旅程時間估算｜Gloss Tools",
    description:
      "輸入出發地日期時間、兩地 UTC 偏移與飛行時間（或抵達時間），換算抵達地日期時間與跨日變化；固定偏移，不含日光節約時間。",
    h1: "旅程時間估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    fixedNote:
      "本工具使用固定 UTC 偏移，不含日光節約時間與時區資料庫；實際航班與行程時間請以航空公司或營運單位公布為準。",
    faq: [
      "為什麼抵達時間看起來比出發還早？",
      "因為抵達地時區可能在出發地之後，鐘面讀數會倒退，甚至回到前一天；請看跨日標籤與抵達日期。",
      "有考慮日光節約時間嗎？",
      "沒有。本工具只用你輸入的固定 UTC 偏移；夏令時間期間請把偏移改成當地當時實際的偏移，實際航班時間以航空公司公布為準。",
    ],
    presetLabel: "常用航線（標準時間）",
    presetNote: "標準時間，夏令時間請自行調整偏移",
    resultsHeading: "抵達時間與旅程長度",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Trip Time Estimator | Gloss Tools",
    description:
      "Convert a departure date and time across fixed UTC offsets with a travel duration or an arrival time, and see the arrival date, day shift and duration. Fixed offsets; no daylight-saving database.",
    h1: "Trip Time Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    fixedNote:
      "This tool uses fixed UTC offsets with no daylight-saving or time-zone database; check your flight's actual times with the carrier.",
    faq: [
      "Why can the arrival clock time look earlier than the departure time?",
      "The destination may be in a later-offset zone, so the clock reading moves backwards, even to the day before; check the day-shift label and the arrival date.",
      "Does it handle daylight saving time?",
      "No. It uses only the fixed UTC offsets you enter; during daylight saving time, enter the offset actually in effect, and always confirm real flight times with the carrier.",
    ],
    presetLabel: "Common routes (standard time)",
    presetNote: "Standard time; adjust the offset yourself during daylight saving time",
    resultsHeading: "Arrival and duration",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-mode",
  "field-departureDate",
  "field-departureTime",
  "field-departureOffset",
  "field-arrivalOffset",
  "field-duration",
  "field-arrivalTime",
  "field-arrivalNextDay",
];
const ERROR_IDS = [
  "error-mode",
  "error-departureDate",
  "error-departureTime",
  "error-departureOffset",
  "error-arrivalOffset",
  "error-duration",
  "error-arrivalTime",
  "error-arrivalNextDay",
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
  const noteCount = html.split(page.fixedNote).length - 1;
  if (noteCount < 2) {
    fail(`${page.path}: fixed-offset note must appear in both input and results areas (found ${noteCount})`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  if (!html.includes(page.presetLabel)) fail(`${page.path}: missing preset group label`);
  if (!html.includes(page.presetNote)) fail(`${page.path}: missing standard-time note`);
  if (!html.includes(page.resultsHeading)) fail(`${page.path}: missing results heading`);
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/trip.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "trip-time-worker-"));
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
  "public/js/core/trip.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/trip.mjs"), "utf8");
  const stripped = coreText.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  if (/\bDate\b/.test(stripped)) {
    fail("public/js/core/trip.mjs: core must not use Date (timezone independence)");
  }
  if (/\bIntl\b/.test(stripped)) {
    fail("public/js/core/trip.mjs: core must not use Intl (timezone independence)");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/example, pages, presets, syntax, worker concatenation, capability scan, core purity",
);
