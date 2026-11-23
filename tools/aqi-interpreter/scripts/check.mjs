// Static project checks for the AQI Interpreter: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (defaults, example, raw capacities, row limit, report
// filename and limit, level table, breakpoint tables, example equals
// the vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// disclaimer, and the candidate noindex / no-canonical rules), core
// purity (no DOM/network/storage/clock), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures (spec-aqi-interpreter-20261121, draft spec
// PR #391); the spec PR is not merged into this branch's base, so the
// check reads the vendored copy rather than a repo-level docs path.

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
  "public/js/core/aqi-interpreter.mjs",
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
const FIXTURES_SHA256 = "1e72c214fa0d924ba2ee04ba74615fd34f6ebf93eeec9932044fed9c864e2d46";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacities, row limit,
// report filename/limit, the pinned level table, the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/aqi-interpreter.mjs")).href
);
if (!deepEqual(core.FIELDS, ["mode", "system", "aqi", "rows"])) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.DEFAULTS, { mode: "aqi", system: "TW", aqi: "", rows: [] })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_AQI_RAW_UNITS !== 3) fail("core: MAX_AQI_RAW_UNITS must be 3");
if (core.MAX_VALUE_RAW_UNITS !== 10) fail("core: MAX_VALUE_RAW_UNITS must be 10");
if (core.MAX_ROWS !== 7) fail("core: MAX_ROWS must be 7");
if (
  !deepEqual(core.POLLUTANTS, ["PM2.5", "PM10", "O3-8h", "O3-1h", "CO", "SO2", "NO2"])
) {
  fail("core: POLLUTANTS order mismatch");
}
if (core.REPORT_FILENAME !== "aqi-interpreter-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_POLLUTANT_INFO = {
  "PM2.5": { decimals: 1, cap: "999.9" },
  PM10: { decimals: 0, cap: "999" },
  "O3-8h": { decimals: 3, cap: "1.000" },
  "O3-1h": { decimals: 3, cap: "1.000" },
  CO: { decimals: 1, cap: "99.9" },
  SO2: { decimals: 0, cap: "9999" },
  NO2: { decimals: 0, cap: "9999" },
};
if (!deepEqual(core.POLLUTANT_INFO, EXPECTED_POLLUTANT_INFO)) {
  fail("core: POLLUTANT_INFO mismatch");
}
// Pinned levels: ids, names, colours, hexes. The purple hex is the
// SPEC-pinned #99004C, not the older #8F3F97.
const EXPECTED_LEVEL_META = {
  good: { levelZh: "良好", levelEn: "Good", color: "green", colorZh: "綠", hex: "#00E400" },
  moderate: { levelZh: "普通", levelEn: "Moderate", color: "yellow", colorZh: "黃", hex: "#FFFF00" },
  usg: { levelZh: "對敏感族群不健康", levelEn: "Unhealthy for Sensitive Groups", color: "orange", colorZh: "橘", hex: "#FF7E00" },
  unhealthy: { levelZh: "對所有族群不健康", levelEn: "Unhealthy", color: "red", colorZh: "紅", hex: "#FF0000" },
  "very-unhealthy": { levelZh: "非常不健康", levelEn: "Very Unhealthy", color: "purple", colorZh: "紫", hex: "#99004C" },
  hazardous: { levelZh: "危害", levelEn: "Hazardous", color: "maroon", colorZh: "褐紅", hex: "#7E0023" },
};
for (const [level, meta] of Object.entries(EXPECTED_LEVEL_META)) {
  const pinned = core.LEVELS[level];
  if (pinned === undefined) {
    fail(`core: LEVELS missing ${level}`);
    continue;
  }
  for (const [key, value] of Object.entries(meta)) {
    if (pinned[key] !== value) fail(`core: LEVELS ${level} ${key} mismatch`);
  }
}
if (
  core.DISCLAIMER_ZH !==
  "本工具僅提供空氣品質資訊解讀與一般性活動建議，不構成醫療建議；如有呼吸道或心血管症狀，請諮詢醫師。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool provides air-quality information and general activity guidance only. It is not medical advice; consult a physician if you have respiratory or cardiovascular symptoms."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-aqi-interpreter-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 19) {
  fail("test/fixtures.json: expected 19 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Spot-check the pinned breakpoint tables through the public run():
// the values that distinguish the current MOENV table from the old
// one and the EPA 2024 revision must land on the pinned sub-index.
const spotChecks = [
  [{ mode: "concentration", system: "TW", aqi: "", rows: [{ pollutant: "PM2.5", value: "12.4" }] }, 50],
  [{ mode: "concentration", system: "TW", aqi: "", rows: [{ pollutant: "PM10", value: "30" }] }, 50],
  [{ mode: "concentration", system: "TW", aqi: "", rows: [{ pollutant: "O3-1h", value: "0.134" }] }, 150],
  [{ mode: "concentration", system: "US", aqi: "", rows: [{ pollutant: "PM2.5", value: "9.0" }] }, 50],
  [{ mode: "concentration", system: "US", aqi: "", rows: [{ pollutant: "O3-1h", value: "0.164" }] }, 150],
];
for (const [input, expectedSub] of spotChecks) {
  const outcome = core.run(input);
  if (!outcome.ok || outcome.result.subIndices[0].subIndex !== expectedSub) {
    fail(`core: breakpoint spot check failed for ${JSON.stringify(input)}`);
  }
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具僅提供空氣品質資訊解讀與一般性活動建議，不構成醫療建議；如有呼吸道或心血管症狀，請諮詢醫師。";
const DISCLAIMER_EN =
  "This tool provides air-quality information and general activity guidance only. It is not medical advice; consult a physician if you have respiratory or cardiovascular symptoms.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "空氣品質解讀｜Gloss Tools",
    description:
      "輸入 AQI 或污染物濃度，對照台灣與美國 EPA 分級表，解讀空氣品質等級、顏色與健康活動建議。",
    h1: "空氣品質解讀",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "同一個濃度在台灣和美國算出來的 AQI 為什麼不同？",
      "因為兩制的濃度斷點不同（例如 PM2.5 良好上限台灣為 12.4 µg/m³、美國為 9.0 µg/m³），詳見規格 §5 對照表。",
      "這個工具會預報明天的空氣嗎？",
      "不會。它只解讀你輸入的數字，不做預報、不查即時監測值。",
      "可以直接把即時濃度當成 24 小時平均輸入嗎？",
      "不行。PM2.5／PM10 的斷點以 24 小時平均定義，O3／CO 以 8 小時或 1 小時平均定義；即時讀數只能作為指示性參考，本工具不計算移動平均。",
      "為什麼 O3 8 小時濃度超過 0.200 ppm 沒有結果？",
      "依官方規定，AQI 301 以上改以 O3 1 小時值計算，請改輸入 O3 1 小時濃度。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "AQI Interpreter | Gloss Tools",
    description:
      "Enter an AQI value or pollutant concentrations and read the air-quality level, colour and health activity guidance under the Taiwan or US EPA scales.",
    h1: "AQI Interpreter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why does the same concentration give a different AQI in Taiwan vs the US?",
      "Because the breakpoint tables differ (for example, the Good limit for PM2.5 is 12.4 µg/m³ in Taiwan and 9.0 µg/m³ in the US); see the comparison table in SPEC §5.",
      "Does this tool forecast tomorrow's air quality?",
      "No. It only interprets the numbers you enter; it does not forecast or fetch live monitoring values.",
      "Can I enter a real-time reading as a 24-hour average?",
      "No. PM2.5/PM10 breakpoints are defined on 24-hour averages and O3/CO on 8-hour or 1-hour averages; a real-time reading is indicative only, and this tool does not compute moving averages.",
      "Why is there no result when 8-hour O3 exceeds 0.200 ppm?",
      "By the official rule, AQI values above 300 are computed from 1-hour O3; enter the 1-hour O3 concentration instead.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const CONTROL_IDS = [
  "entry-form",
  "mode-aqi",
  "mode-concentration",
  "system-tw",
  "system-us",
  "field-aqi",
  "error-aqi",
  "rows-list",
  "add-row-btn",
  "error-rows",
  "status",
  "level-swatch",
  "level-name",
  "result-aqi",
  "health-impact",
  "advice-general",
  "advice-sensitive",
  "dominant-value",
  "subindices-body",
  "notices-list",
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
  for (const id of CONTROL_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing control ${id}`);
  }
  for (const hex of ["#00E400", "#FFFF00", "#FF7E00", "#FF0000", "#99004C", "#7E0023"]) {
    if (!html.includes(hex)) fail(`${page.path}: missing pinned hex ${hex}`);
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
    resolve(PROJECT_ROOT, "public/js/core/aqi-interpreter.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "aqi-interpreter-worker-"));
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
  "public/js/core/aqi-interpreter.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/aqi-interpreter.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/aqi-interpreter.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/aqi-interpreter.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/capacities/example/levels/breakpoint spot checks, pages, syntax, worker concatenation, capability scan, core purity",
);
