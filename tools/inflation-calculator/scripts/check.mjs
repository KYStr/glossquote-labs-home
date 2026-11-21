// Static project checks for the Inflation Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, decimal places, defaults, ranges, report
// constants, error and status messages, the example equals the
// rate-basic fixture, the pinned bilingual strings in the app,
// bilingual metadata and the candidate noindex / CSP rules), core
// purity (no DOM/network/storage), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability scan
// (this tool has no persistent storage anywhere).
// Exits non-zero on the first failure list.

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
  "public/js/core/inflation.mjs",
  "public/styles/inflation.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/inflation-core.test.mjs",
  "test/inflation-controller.test.mjs",
  "test/inflation-report.test.mjs",
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
// does not match its own scan. Persistent storage is forbidden in this
// tool by the SPEC (no localStorage, no sessionStorage, no IndexedDB,
// no cookies), so those tokens are in this list, unlike tools whose
// SPEC pins draft persistence.
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

// Core contract: field order, raw limits, decimal places, defaults,
// ranges, report constants, error and status messages, and the example
// must match the SPEC and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/inflation.mjs")).href);
const expectedRateFields = ["mode", "amount", "annualRatePercent", "years"];
const expectedCpiFields = [
  "mode",
  "amount",
  "cpiFrom",
  "cpiTo",
  "labelFrom",
  "labelTo",
  "yearsBetween",
];
if (JSON.stringify(core.RATE_FIELDS) !== JSON.stringify(expectedRateFields)) {
  fail("core: RATE_FIELDS order mismatch");
}
if (JSON.stringify(core.CPI_FIELDS) !== JSON.stringify(expectedCpiFields)) {
  fail("core: CPI_FIELDS order mismatch");
}
const expectedRawLimits = {
  amount: 12,
  annualRatePercent: 8,
  years: 3,
  cpiFrom: 9,
  cpiTo: 9,
  labelFrom: 24,
  labelTo: 24,
  yearsBetween: 3,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDecimalPlaces = { amount: 2, annualRatePercent: 3, cpiFrom: 3, cpiTo: 3 };
if (canonical(core.DECIMAL_PLACES) !== canonical(expectedDecimalPlaces)) {
  fail("core: DECIMAL_PLACES mismatch");
}
const expectedDefaults = {
  mode: "rate",
  amount: "100000",
  annualRatePercent: "2",
  years: "10",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedCpiDefaults = {
  mode: "cpi",
  amount: "100000",
  cpiFrom: "100.0",
  cpiTo: "102.0",
  labelFrom: "",
  labelTo: "",
  yearsBetween: null,
};
if (canonical(core.CPI_DEFAULTS) !== canonical(expectedCpiDefaults)) {
  fail("core: CPI_DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow)");
}
if (core.AMOUNT_MIN !== 0 || core.AMOUNT_MAX !== 999999999.99) {
  fail("core: amount range must be 0-999999999.99");
}
if (core.RATE_MIN_EXCLUSIVE !== -100 || core.RATE_MAX !== 1000) {
  fail("core: rate range must be >-100 and <=1000");
}
if (core.YEARS_MIN !== 0 || core.YEARS_MAX !== 200) {
  fail("core: years range must be 0-200");
}
if (core.CPI_MIN_EXCLUSIVE !== 0 || core.CPI_MAX !== 99999.999) {
  fail("core: CPI range must be >0 and <=99999.999");
}
if (core.YEARS_BETWEEN_MIN !== 1 || core.YEARS_BETWEEN_MAX !== 200) {
  fail("core: yearsBetween range must be 1-200");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "inflation-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedErrors = {
  SCHEMA: { zh: "輸入結構不正確", en: "The input structure is invalid." },
  INPUT_LIMIT: { zh: "輸入太長", en: "Input is too long." },
  UNICODE: {
    zh: "輸入包含不完整的 Unicode 字元",
    en: "Input contains an unpaired surrogate.",
  },
  EMPTY: { zh: "此欄必填", en: "This field is required." },
  DECIMAL_FORMAT: {
    zh: "請輸入有效的小數",
    en: "Enter a valid decimal number.",
  },
  INTEGER_FORMAT: {
    zh: "請輸入有效的整數",
    en: "Enter a valid whole number.",
  },
  RANGE: { zh: "數值超出允許範圍", en: "Value is outside the allowed range." },
  OUTPUT_LIMIT: {
    zh: "報告太大，無法產生",
    en: "The report is too large to generate.",
  },
  INTERNAL: { zh: "處理失敗，請重試", en: "Processing failed. Try again." },
  WORKER_ERROR: { zh: "處理失敗，請重試", en: "Processing failed. Try again." },
};
if (canonical(core.ERROR_MESSAGES) !== canonical(expectedErrors)) {
  fail("core: ERROR_MESSAGES mismatch with SPEC inputsOutputs");
}
const expectedStatus = {
  empty: { zh: "請輸入數字，或載入範例。", en: "Enter values, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch with SPEC userFlow");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "888ae6a956bc5bda31a7c2af53633b5b64fabea2d25ae3d6d917b8023983a03f") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.specId !== "spec-inflation-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 24) {
  fail("test/fixtures.json: expected 24 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const rateBasic = fixtures.cases.find((entry) => entry.id === "rate-basic");
if (canonical(core.EXAMPLE) !== canonical(rateBasic.input)) {
  fail("core: EXAMPLE must equal the rate-basic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the
// example note, the page label and the beyond-range note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "已載入範例，請按「計算換算」執行。",
  "Example loaded. Run “Calculate conversion” to compute it.",
  "超出可計算範圍",
  "Beyond the computable range",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned method note and FAQ answers. Per SPEC tests, the preview
// candidate carries no production canonical, hreflang, or sitemap, and
// no https URL at all; the formal production build adds them after
// the origin is verified.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const METHOD_NOTE_ZH =
  "固定利率模式假設通膨率每年相同，是簡化模型；CPI 模式的結果取決於你輸入的指數來源與期別。";
const METHOD_NOTE_EN =
  "Constant-rate mode assumes the same inflation rate every year — a simplification. CPI mode results depend on the index source and periods you enter.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "通膨計算機｜Gloss Tools",
    description:
      "以固定年通膨率或兩期消費者物價指數，換算金額的未來名目值與實質購買力。",
    h1: "通膨計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    draftNote: "切換語言或離開頁面會失去草稿。",
    methodNote: METHOD_NOTE_ZH,
    faq: [
      "固定利率模式假設什麼？",
      "每年同一個通膨率、逐年複利；實際通膨逐年不同。",
      "CPI 指數從哪裡來？",
      "本工具不內建任何 CPI 資料；請填官方發布的指數（例如主計總處 CPI），並在標籤註明期別。",
      "可以輸入負通膨率嗎？",
      "可以；大於 −100% 的負值代表通縮，未來名目金額會比現在小、購買力上升。",
      "等值年通膨率是什麼？",
      "把兩期 CPI 的總變化，換算成每年相同、複利後得到相同總變化的年率；需要相隔年數才計算。",
    ],
    assets: ['href="./styles/inflation.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Inflation Calculator | Gloss Tools",
    description:
      "Convert an amount between price levels with a constant annual inflation rate or two CPI index values — future nominal value and real purchasing power.",
    h1: "Inflation Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    draftNote: "Switching language or leaving the page discards the draft.",
    methodNote: METHOD_NOTE_EN,
    faq: [
      "What does constant-rate mode assume?",
      "The same rate every year, compounded; real inflation varies year by year.",
      "Where do CPI values come from?",
      "The tool bundles no CPI data; enter officially published indices (such as DGBAS CPI) and label the periods.",
      "Can the rate be negative?",
      "Yes; a rate above −100% models deflation — the future nominal amount shrinks and purchasing power rises.",
      "What is the equivalent annual rate?",
      "The constant yearly rate that compounds to the total CPI change; it needs the years between the two indices.",
    ],
    assets: ['href="../styles/inflation.css"', 'src="../js/app.js"'],
  },
];
const INPUT_FIELDS = [
  "amount",
  "annualRatePercent",
  "years",
  "cpiFrom",
  "cpiTo",
  "labelFrom",
  "labelTo",
  "yearsBetween",
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes('rel="alternate"')) fail(`${page.path}: preview must not carry hreflang`);
  if (html.includes("https://")) fail(`${page.path}: preview must not contain an https URL`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  if (!html.includes(page.methodNote)) fail(`${page.path}: missing pinned method note`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of INPUT_FIELDS) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "mode-rate",
    "mode-cpi",
    "group-rate",
    "group-cpi",
    "status",
    "results",
    "result-rate",
    "result-cpi",
    "result-future-value",
    "result-purchasing-power",
    "result-cumulative",
    "year-table-body",
    "page-prev",
    "page-next",
    "page-label",
    "range-note",
    "result-period",
    "result-adjusted-amount",
    "result-cpi-cumulative",
    "result-equivalent-row",
    "result-equivalent-rate",
    "method-note",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
    "example-note",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/inflation.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "inflation-calculator-worker-"));
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
// or the controller. The app has no persistent storage either.
for (const purePath of [
  "public/js/core/inflation.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["localStorage", "sessionStorage"]) {
    if (text.includes(token)) {
      fail(`${purePath}: must not reference ${token}`);
    }
  }
}
for (const purePath of [
  "public/js/core/inflation.mjs",
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

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/decimals/defaults/ranges/messages/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
