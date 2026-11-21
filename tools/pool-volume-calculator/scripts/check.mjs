// Static project checks for the Pool Volume Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, formula constants,
// ranges, the example equals the rect-single-depth fixture, the pinned
// bilingual strings in the app, bilingual metadata and the candidate
// noindex / CSP / no-canonical rules), core purity (no DOM/network/
// storage — the SPEC bans persistent storage outright), syntax of
// every shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure list.

import { createHash } from "node:crypto";
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

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/pool-volume.mjs",
  "public/styles/pool-volume.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/pool-volume-core.test.mjs",
  "test/pool-volume-controller.test.mjs",
  "test/pool-volume-report.test.mjs",
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
// does not match its own scan. Persistent storage is forbidden outright
// by the SPEC (draft lives only in the page), so localStorage and
// sessionStorage are in this list — unlike sibling tools that pin draft
// persistence. URL schemes are likewise in this list only as fetch-like
// sinks; the candidate pages carry no URLs at all (no canonical).
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

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

for (const path of REQUIRED_PATHS) {
  try {
    const info = await lstat(resolve(PROJECT_ROOT, path));
    if (!info.isFile()) fail(`Required path is not a file: ${path}`);
  } catch {
    fail(`Missing required path: ${path}`);
  }
}

// Package contract: Node >=24, ESM, exactly the expected scripts, and zero
// dependencies of any kind.
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

// Core contract: field order, raw limits, defaults, formula constants,
// ranges, report constants, and the example must match the SPEC and
// fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/pool-volume.mjs")).href
);
const expectedFields = [
  "shape",
  "depthMode",
  "lengthM",
  "widthM",
  "diameterM",
  "depthM",
  "shallowDepthM",
  "deepDepthM",
  "flowRateLMin",
];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  shape: 12,
  depthMode: 8,
  lengthM: 8,
  widthM: 8,
  diameterM: 8,
  depthM: 8,
  shallowDepthM: 8,
  deepDepthM: 8,
  flowRateLMin: 8,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  shape: "rectangular",
  depthMode: "single",
  lengthM: "8",
  widthM: "4",
  diameterM: "5",
  depthM: "1.5",
  shallowDepthM: "1",
  deepDepthM: "2",
  flowRateLMin: "40",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow reset defaults)");
}
if (core.LITRES_PER_GALLON_US !== 3.785411784) {
  fail("core: LITRES_PER_GALLON_US must be 3.785411784");
}
if (core.LITRES_PER_M3 !== 1000) fail("core: LITRES_PER_M3 must be 1000");
if (core.DIMENSION_MIN !== 0.1 || core.DIMENSION_MAX !== 100) {
  fail("core: dimension range must be 0.1-100");
}
if (core.DEPTH_MIN !== 0.1 || core.DEPTH_MAX !== 10) {
  fail("core: depth range must be 0.1-10");
}
if (core.FLOW_MIN !== 0.1 || core.FLOW_MAX !== 10000) {
  fail("core: flow range must be 0.1-10000");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "pool-volume-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入泳池尺寸，或載入範例。", en: "Enter the pool dimensions, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
const expectedErrors = {
  SCHEMA: { zh: "輸入格式不正確。", en: "The input is malformed." },
  INPUT_LIMIT: { zh: "輸入太長。", en: "The input is too long." },
  UNICODE: { zh: "輸入含有不完整的字元。", en: "The input contains an incomplete character." },
  EMPTY: { zh: "此欄必填。", en: "This field is required." },
  ENUM: { zh: "請選擇有效的選項。", en: "Choose a valid option." },
  DECIMAL_FORMAT: { zh: "請輸入最多兩位小數的數字。", en: "Enter a number with at most two decimal places." },
  RANGE: { zh: "數值超出允許範圍。", en: "The value is outside the allowed range." },
  DEPTH_ORDER: { zh: "淺端深度不可大於深端深度。", en: "Shallow-end depth must not exceed deep-end depth." },
  OUTPUT_LIMIT: { zh: "報告超過大小上限。", en: "The report exceeds the size limit." },
  INTERNAL: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
  WORKER_ERROR: { zh: "處理失敗，請重試。", en: "Something went wrong. Try again." },
};
if (canonical(core.ERROR_MESSAGES) !== canonical(expectedErrors)) {
  fail("core: ERROR_MESSAGES mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "07f50160da9f2bde49ebb49b7a30785ed1ceff34d3e1eb0affeef154eb84aa3a") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 18) {
  fail("test/fixtures.json: expected 18 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
if (fixtures.slug !== "pool-volume-calculator") fail("test/fixtures.json: slug mismatch");
if (fixtures.specId !== "spec-pool-volume-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
const rectSingle = fixtures.cases.find((entry) => entry.id === "rect-single-depth");
if (canonical(core.EXAMPLE) !== canonical(rectSingle.input)) {
  fail("core: EXAMPLE must equal the rect-single-depth fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the estimate disclaimer, the precision note, the no-fill
// line and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確。",
  "輸入太長。",
  "輸入含有不完整的字元。",
  "此欄必填。",
  "請選擇有效的選項。",
  "請輸入最多兩位小數的數字。",
  "數值超出允許範圍。",
  "淺端深度不可大於深端深度。",
  "報告超過大小上限。",
  "處理失敗，請重試。",
  "The input is malformed.",
  "The input is too long.",
  "The input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter a number with at most two decimal places.",
  "The value is outside the allowed range.",
  "Shallow-end depth must not exceed deep-end depth.",
  "The report exceeds the size limit.",
  "Something went wrong. Try again.",
  "以理想形狀與垂直池壁估算；未計池壁厚度、台階與實際水位（水面通常低於池緣），請把結果當估算值。",
  "Estimated for an ideal shape with vertical walls. Wall thickness, steps, and the actual water level (usually below the rim) are not included; treat the result as an estimate.",
  "公升與立方公尺都由未捨入的水量各自捨入一次；公升是較精確的數字。",
  "Litres and cubic metres are each rounded once from the same unrounded volume; the litre figure is the more precise one.",
  "未提供流速，不計算注水時間",
  "No fill rate provided; fill time not calculated.",
  "已載入範例，請按「計算水量」執行。",
  "Example loaded. Run “Calculate volume” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local
// assets, the pinned FAQ answers and estimate disclaimer. The SPEC
// pins NO production canonical, hreflang or sitemap on the candidate
// (the planned origin is not yet configured), so the pages must carry
// no https URL at all.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "泳池水量計算｜Gloss Tools",
    description:
      "輸入泳池長寬或直徑與深度（斜底可分淺端與深端），算出水量（立方公尺、公升、美制加侖）與注水所需時間。",
    h1: "泳池水量計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "0.1–100 公尺，最多兩位小數。",
    disclaimer:
      "以理想形狀與垂直池壁估算；未計池壁厚度、台階與實際水位（水面通常低於池緣），請把結果當估算值。",
    faq: [
      "斜底池怎麼算？",
      "取淺端與深端深度的平均；長方形均勻斜底時這是精確值，起伏不均勻的池底只是估算。",
      "為什麼公升不等於立方公尺顯示值 × 1000？",
      "兩者都由同一個未捨入水量各自捨入一次；小池可能出現立方公尺顯示 0、公升 1，公升是較精確的數字。",
      "可以算加氯等藥劑用量嗎？",
      "不行。本工具只算水量，藥劑投放不在範圍內。",
      "腎形或不規則池可以算嗎？",
      "不支援。只支援長方形、圓形與橢圓形的理想形狀。",
    ],
    assets: ['href="./styles/pool-volume.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Pool Volume Calculator | Gloss Tools",
    description:
      "Enter a pool's length and width or diameter and depth (shallow and deep ends for sloped floors) to get its water volume in cubic metres, litres, and US gallons, plus fill time.",
    h1: "Pool Volume Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "0.1–100 m, at most two decimal places.",
    disclaimer:
      "Estimated for an ideal shape with vertical walls. Wall thickness, steps, and the actual water level (usually below the rim) are not included; treat the result as an estimate.",
    faq: [
      "How is a sloped floor handled?",
      "The shallow- and deep-end depths are averaged; for a uniformly sloped rectangular floor this is exact, and only an estimate for uneven floors.",
      "Why don't litres equal the displayed cubic metres × 1000?",
      "Both are rounded once from the same unrounded volume; for a tiny pool the display can read 0 m³ and 1 litre, and the litre figure is the more precise one.",
      "Can it work out chemical dosing, such as chlorine?",
      "No. This tool calculates water volume only; chemical dosing is out of scope.",
      "Can it handle kidney-shaped or irregular pools?",
      "No. Only ideal rectangular, circular, and oval shapes are supported.",
    ],
    assets: ['href="../styles/pool-volume.css"', 'src="../js/app.js"'],
  },
];
for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang must be ${page.lang}`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.path}: missing preview noindex`);
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP_META}">`)) {
    fail(`${page.path}: CSP meta mismatch`);
  }
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: title mismatch`);
  if (!html.includes(`<meta name="description" content="${page.description}">`)) {
    fail(`${page.path}: description mismatch`);
  }
  if (!html.includes(`<h1>${page.h1}</h1>`)) fail(`${page.path}: h1 mismatch`);
  if (html.includes('rel="canonical"')) fail(`${page.path}: candidate must not carry a canonical`);
  if (html.includes("https://")) fail(`${page.path}: candidate must contain no https URL`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned estimate disclaimer`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of expectedFields) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "status",
    "results",
    "result-avg-depth",
    "result-volume-m3",
    "result-volume-litres",
    "result-volume-gallons",
    "result-fill",
    "disclaimer",
    "precision-note",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
  ]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id="${id}"`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/pool-volume.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "pool-volume-calculator-worker-"));
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

// Forbidden-capability scan over the shipped sources and tests (this file
// itself is excluded: it assembles the tokens from fragments).
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

// Core purity: no DOM, storage, or network access in the pure modules
// or the controller. The SPEC bans persistent storage outright, so the
// app must not touch localStorage or sessionStorage either.
for (const purePath of [
  "public/js/core/pool-volume.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: pure module must not reference ${token}`);
    }
  }
}
{
  const appText = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
  if (appText.includes("localStorage")) fail("public/js/app.js: localStorage must not be used");
  if (appText.includes("sessionStorage")) fail("public/js/app.js: sessionStorage must not be used");
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/constants/ranges/status/errors/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity, no persistent storage",
);
