// Static project checks for the Markup & Margin Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, bounds, the reference
// table, the example equals the report-basic fixture, the pinned
// bilingual strings in the app, bilingual metadata and the candidate
// noindex / CSP rules, no production canonical), core purity (no DOM /
// network / storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
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
  "public/js/core/markup-margin.mjs",
  "public/styles/markup-margin.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/markup-margin-core.test.mjs",
  "test/markup-margin-controller.test.mjs",
  "test/markup-margin-report.test.mjs",
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
// does not match its own scan. The SPEC forbids persistent storage
// outright for this tool, so localStorage and sessionStorage are
// forbidden everywhere here (unlike tools whose SPEC pins a stored
// draft). URL schemes are likewise not in this list: the pages carry
// no URLs at all in preview (no canonical), and check.mjs asserts
// that below.
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

// Core contract: field order, raw limits, defaults, bounds, reference
// table, report constants, and the example must match the SPEC and
// fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/markup-margin.mjs")).href);
const expectedFields = ["mode", "cost", "price", "markupPercent", "marginPercent"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { mode: 12, cost: 10, price: 10, markupPercent: 9, marginPercent: 9 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "report",
  cost: "80.00",
  price: "100.00",
  markupPercent: null,
  marginPercent: null,
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC section 3)");
}
if (core.COST_CENTS_MIN !== 1 || core.COST_CENTS_MAX !== 99999999) {
  fail("core: cost cents range must be 1-99999999");
}
if (core.PRICE_CENTS_MIN !== 0 || core.PRICE_CENTS_MAX !== 99999999) {
  fail("core: price cents range must be 0-99999999");
}
if (core.PERCENT_MILLI_MIN !== 0 || core.PERCENT_MILLI_MAX !== 99999999) {
  fail("core: percent milli range must be 0-99999999");
}
if (core.NO_SOLUTION_MILLI !== 100000) fail("core: NO_SOLUTION_MILLI must be 100000");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "markup-margin-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedReferenceTable = [
  { marginPercent: 0, markupHundredths: 0 },
  { marginPercent: 10, markupHundredths: 1111 },
  { marginPercent: 20, markupHundredths: 2500 },
  { marginPercent: 25, markupHundredths: 3333 },
  { marginPercent: 30, markupHundredths: 4286 },
  { marginPercent: 40, markupHundredths: 6667 },
  { marginPercent: 50, markupHundredths: 10000 },
  { marginPercent: 60, markupHundredths: 15000 },
  { marginPercent: 70, markupHundredths: 23333 },
  { marginPercent: 75, markupHundredths: 30000 },
  { marginPercent: 80, markupHundredths: 40000 },
  { marginPercent: 90, markupHundredths: 90000 },
  { marginPercent: 95, markupHundredths: 190000 },
];
if (canonical(core.REFERENCE_TABLE) !== canonical(expectedReferenceTable)) {
  fail("core: REFERENCE_TABLE differs from SPEC section 2");
}
const expectedStatus = {
  empty: { zh: "請輸入成本與售價，或載入範例", en: "Enter cost and price, or load the example." },
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

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "ee49cb9fcc1bfe988b9e11ef097e62ddf27e5001c025e45e1b87769e0274c15a") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 32) {
  fail("test/fixtures.json: expected 32 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const reportBasic = fixtures.cases.find((entry) => entry.id === "report-basic");
if (canonical(core.EXAMPLE) !== canonical(reportBasic.input)) {
  fail("core: EXAMPLE must equal the report-basic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the NO_SOLUTION message, the derived / below-cost /
// margin-undefined notes and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "請用正確的小數格式",
  "超出允許範圍",
  "目標毛利率達到或超過 100% 時，沒有有限售價能達成",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "另一率由四捨五入後售價回算",
  "售價低於成本，兩率為負值",
  "毛利率無法定義（售價為零）",
  "已載入範例，請按「計算」執行。",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Use the correct decimal format.",
  "Out of range.",
  "No finite price achieves a margin of 100% or more.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "Derived from the rounded price",
  "The price is below cost; both rates are negative.",
  "Margin is undefined (the price is zero).",
  "Example loaded. Run “Calculate” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned FAQ answers and reference table. Preview carries no
// production canonical, hreflang or sitemap (SPEC section 7).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "加價率與毛利率換算｜Gloss Tools",
    description:
      "輸入成本與售價，同時算出加價率與毛利率；或反過來，由目標加價率、目標毛利率反推售價。全程以整數分與千分之一百分比精確運算，百分比顯示至小數點後兩位。",
    h1: "加價率與毛利率換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "成本，0.01–999999.99，最多兩位小數。",
    faq: [
      "加價率和毛利率有什麼不同？",
      "兩者利潤相同，分母不同：加價率除以成本，毛利率除以售價。售價高於成本時毛利率恆小於加價率，且毛利率永遠到不了 100%。",
      "為什麼目標毛利率 100% 求不出售價？",
      "毛利率 100% 表示利潤等於全部售價，也就是成本必須為零；成本為正時售價要無限大才行，所以本工具回報無解，而不是輸入錯誤。",
      "售價低於成本時會發生什麼事？",
      "照常計算，利潤與兩個百分比為負值並標示低於成本；這是有效的報表結果，不是錯誤。",
      "毛利率顯示 100.00% 是怎麼回事？",
      "成本相對售價極小時，精確毛利率非常接近但小於 100%，顯示捨入至小數兩位後呈現 100.00%；精確值永遠小於 100%。",
    ],
    assets: ['href="./styles/markup-margin.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Markup &amp; Margin Calculator | Gloss Tools",
    description:
      "Enter cost and price to get markup and margin together, or work backwards from a target markup or margin to the required price. All arithmetic is exact integer cents and milli-percent; percentages display to two decimals.",
    h1: "Markup &amp; Margin Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "Cost, 0.01–999999.99, at most two decimal places.",
    faq: [
      "How are markup and margin different?",
      "Markup and margin use the same profit over different bases: markup divides by cost, margin by price. When the price is above cost, margin is always smaller than markup, and margin can never reach 100%.",
      "Why is a 100% target margin unsolvable?",
      "A 100% margin means the profit equals the whole price, so the cost would have to be zero; with any positive cost the price would need to be infinite, so the tool reports no solution instead of an input error.",
      "What happens when the price is below cost?",
      "It is still calculated: the profit and both percentages come out negative and are flagged as below cost — a valid report, not an error.",
      "Why can the margin display as 100.00%?",
      "When the cost is tiny next to the price, the exact margin is very close to but below 100%; rounded to two decimals for display it shows 100.00%, while the exact value is always below 100%.",
    ],
    assets: ['href="../styles/markup-margin.css"', 'src="../js/app.js"'],
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
  if (html.includes("rel=\"canonical\"")) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes("hreflang")) fail(`${page.path}: preview must not carry hreflang`);
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected no https URLs in preview, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  // The static reference table: all 13 rows, margin and markup.
  for (const row of expectedReferenceTable) {
    const markupText = core.formatPercent(row.markupHundredths);
    if (!html.includes(`<td>${row.marginPercent}%</td><td>${markupText}</td>`)) {
      fail(`${page.path}: missing reference row margin ${row.marginPercent}% -> ${markupText}`);
    }
  }
  for (const field of expectedFields) {
    if (field === "mode") {
      for (const mode of ["report", "solve-markup", "solve-margin"]) {
        if (!html.includes(`id="field-mode-${mode}"`)) fail(`${page.path}: missing input field-mode-${mode}`);
      }
    } else if (!html.includes(`id="field-${field}"`)) {
      fail(`${page.path}: missing input field-${field}`);
    }
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "status",
    "results",
    "results-heading",
    "result-summary",
    "result-price",
    "result-profit",
    "result-markup",
    "result-margin",
    "result-note",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/markup-margin.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "markup-margin-calculator-worker-"));
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
// or the controller. The app also must not touch storage at all: the
// SPEC forbids persistent storage for this tool.
for (const purePath of [
  "public/js/core/markup-margin.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    // app.js legitimately uses document/window (DOM wiring); the pure
    // modules must not. Storage is forbidden in all four files.
    if (purePath === "public/js/app.js" && ["document", "window"].includes(token)) continue;
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: must not reference ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/bounds/reference table/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
