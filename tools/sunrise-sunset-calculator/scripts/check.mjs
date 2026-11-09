// Static project checks for the Sunrise & Sunset Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, per-field capacities, defaults, example
// equals the vendored fixtures.json case 1, report filename and limit,
// bilingual metadata, the SPEC-pinned accuracy note, polar-day /
// polar-night texts, FAQ answers, preset table, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a verbatim
// copy of the fixed spec's fixtures (spec candidate
// f1f14924fae8e114c9b8f8e0caeba72922c64d30); the spec PR is not merged
// into this branch's base, so the check reads the vendored copy rather
// than a repo-level docs path.

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
  "public/js/core/sun.mjs",
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
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/sun.mjs")).href);
const expectedFields = ["date", "latitude", "longitude", "utcOffset"];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (!deepEqual(core.FIELD_LIMITS, { date: 10, latitude: 12, longitude: 12, utcOffset: 6 })) {
  fail("core: FIELD_LIMITS mismatch");
}
const expectedDefaults = {
  date: "",
  latitude: "25.0330",
  longitude: "121.5654",
  utcOffset: "+08:00",
};
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.REPORT_FILENAME !== "sunrise-sunset-report.json") fail("core: REPORT_FILENAME mismatch");
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-sunrise-sunset-calculator-20261109") {
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

// App-level preset table must match the SPEC's eight cities exactly.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const text of [
  '"25.0330", longitude: "121.5654", utcOffset: "+08:00"',
  '"24.1477", longitude: "120.6736", utcOffset: "+08:00"',
  '"22.6273", longitude: "120.3014", utcOffset: "+08:00"',
  '"35.6762", longitude: "139.6503", utcOffset: "+09:00"',
  '"-33.8688", longitude: "151.2093", utcOffset: "+10:00"',
  '"51.5074", longitude: "-0.1278", utcOffset: "+00:00"',
  '"40.7128", longitude: "-74.0060", utcOffset: "-05:00"',
  '"64.1466", longitude: "-21.9426", utcOffset: "+00:00"',
  "極晝：這一天太陽整日不落下。",
  "極夜：這一天太陽整日不升起。",
  "Polar day: the sun does not set on this date.",
  "Polar night: the sun does not rise on this date.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
]) {
  if (!appSource.includes(text)) fail(`app.js: missing SPEC-pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned accuracy note, the pinned FAQ answers, the draft-loss
// note, the preset options, and the form control / error ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "日出日落時間計算｜Gloss Tools",
    description:
      "輸入日期與地點的緯度、經度、UTC 偏移，以 NOAA 近似公式計算日出、太陽正午、日落與日長，並辨識極晝與極夜。",
    h1: "日出日落時間計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    accuracy:
      "本工具採 NOAA 近似公式，結果可能與實際觀測或官方曆象相差數分鐘。無時區資料庫、不處理日光節約時間；偏移請依當地當日實際時制自行確認。",
    faq: [
      "為什麼和氣象局公布的時間差一兩分鐘？",
      "本工具是 NOAA 近似公式，γ 只以當地正午取值，且只用固定偏移，不含當地時區規則與更精確的曆算，差數分鐘屬預期。",
      "為什麼沒有日光節約時間選項？",
      "偏移是固定輸入；夏令時間請自行把偏移加一小時，例如雪梨夏季改填 +11:00。",
      "什麼是太陽正午？",
      "太陽通過當地子午線的時刻，在固定偏移下通常不是 12:00。",
    ],
    presets: ["台北", "台中", "高雄", "東京", "雪梨", "倫敦", "紐約", "雷克雅維克", "自訂"],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Sunrise &amp; Sunset Calculator | Gloss Tools",
    description:
      "Compute sunrise, solar noon, sunset and day length for a date, latitude, longitude and UTC offset with the NOAA approximation, including polar day and polar night detection.",
    h1: "Sunrise &amp; Sunset Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    accuracy:
      "This tool uses the NOAA approximation; results may differ from observed or official times by a few minutes. There is no time-zone database and no daylight-saving handling; confirm the offset in force for your place and date.",
    faq: [
      "Why is this a minute or two off the official time?",
      "This tool uses the NOAA approximation with γ evaluated at local noon and a single fixed offset; official almanacs use more precise ephemerides and local time-zone rules, so a difference of a few minutes is expected.",
      "Why is there no daylight-saving option?",
      "The offset is a fixed input; for daylight-saving time add an hour yourself, e.g. use +11:00 for Sydney in summer.",
      "What is solar noon?",
      "The moment the sun crosses the local meridian; under a fixed offset it is usually not 12:00.",
    ],
    presets: ["Taipei", "Taichung", "Kaohsiung", "Tokyo", "Sydney", "London", "New York", "Reykjavík", "Custom"],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-date", "field-preset", "field-latitude", "field-longitude", "field-utcOffset"];
const ERROR_IDS = ["error-date", "error-latitude", "error-longitude", "error-utcOffset"];
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
  if (!html.includes(page.accuracy)) fail(`${page.path}: missing fixed accuracy note`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const name of page.presets) {
    if (!html.includes(`>${name}</option>`)) fail(`${page.path}: missing preset option: ${name}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/sun.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "sunrise-sunset-worker-"));
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
  "public/js/core/sun.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/sun.mjs"), "utf8");
  if (/\bDate\b/.test(coreText.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, ""))) {
    fail("public/js/core/sun.mjs: core must not use Date (timezone independence)");
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
