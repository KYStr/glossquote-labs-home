// Static project checks for the Breakeven Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, amount limits, the example equals
// the ceil-rounds-up fixture, the pinned bilingual strings in the app,
// bilingual metadata and the preview noindex / CSP rules), core purity
// (no DOM/network/storage), syntax of every shipped script, the fixed
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
  "public/js/core/breakeven.mjs",
  "public/styles/breakeven.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/breakeven-core.test.mjs",
  "test/breakeven-controller.test.mjs",
  "test/breakeven-report.test.mjs",
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
// does not match its own scan. The SPEC forbids persistent storage,
// fetch/XHR/WebSocket/beacon, analytics, remote fonts, uploads and
// clipboard access outright, so storage tokens ARE forbidden here.
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
  ["clip", "board"],
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

// Core contract: field order, raw limits, defaults, amount limits, and
// the example must match the SPEC and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/breakeven.mjs")).href);
const expectedFields = ["fixedCost", "price", "variableCost", "expectedUnits"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { fixedCost: 12, price: 12, variableCost: 12, expectedUnits: 9 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { fixedCost: "100000", price: "400", variableCost: "150", expectedUnits: "" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.AMOUNT_CENTS_MAX !== 99999999999n) fail("core: AMOUNT_CENTS_MAX must be 99999999999n");
if (core.PRICE_CENTS_MIN !== 1n) fail("core: PRICE_CENTS_MIN must be 1n");
if (core.EXPECTED_UNITS_MAX !== 100000000) fail("core: EXPECTED_UNITS_MAX must be 100000000");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "breakeven-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: {
    zh: "請輸入固定成本、單位售價與單位變動成本，或載入範例。",
    en: "Enter fixed costs, price per unit and variable cost per unit, or load the example.",
  },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check the input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  example: {
    zh: "已載入範例，請按「計算損益平衡」執行。",
    en: "Example loaded. Run “Calculate breakeven” to compute it.",
  },
  reset: { zh: "已重設", en: "Reset" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
const expectedNoMargin = {
  zh: "單位變動成本必須低於單位售價，否則賣得越多虧得越多，沒有損益平衡點。",
  en: "Variable cost per unit must be below the price per unit; otherwise every sale loses money and no breakeven point exists.",
};
if (canonical(core.NO_MARGIN_TEXT) !== canonical(expectedNoMargin)) {
  fail("core: NO_MARGIN_TEXT mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "a75dabca3b765e4f1ceac13de15cde96d0b08d44ae64c2b9c727cc10da94154f") {
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
const firstCase = fixtures.cases.find((entry) => entry.id === "ceil-rounds-up");
if (canonical(core.EXAMPLE) !== canonical(firstCase.input)) {
  fail("core: EXAMPLE must equal the ceil-rounds-up fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the NO_MARGIN explanation and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "含有無效字元",
  "必填",
  "金額格式不正確（最多兩位小數）",
  "請輸入整數",
  "超出允許範圍",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Contains an invalid character.",
  "Required.",
  "Invalid amount (up to two decimal places).",
  "Enter a whole number.",
  "Out of range.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "已載入範例，請按「計算損益平衡」執行。",
  "Example loaded. Run “Calculate breakeven” to compute it.",
  "預期銷量低於損益平衡銷量",
  "Expected volume is below the breakeven volume",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}
// The NO_MARGIN explanation is not inlined in the app: it is imported
// as NO_MARGIN_TEXT from the core (whose verbatim text is pinned above),
// and the app's error map must use both language variants of it.
if (!appSource.includes("NO_MARGIN_TEXT.zh")) fail("public/js/app.js: must use NO_MARGIN_TEXT.zh");
if (!appSource.includes("NO_MARGIN_TEXT.en")) fail("public/js/app.js: must use NO_MARGIN_TEXT.en");

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned FAQ answers and the draft-loss note. Preview pages carry
// no production canonical, hreflang or https URLs (SPEC tests section).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "損益平衡計算｜Gloss Tools",
    description:
      "輸入固定成本、單位售價與單位變動成本，算出損益平衡銷量與營收、安全邊際與邊際貢獻率。",
    h1: "損益平衡計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "0–999,999,999.99，最多兩位小數。",
    draftNote: "切換語言或離開頁面會失去草稿。",
    labels: [
      "單位邊際貢獻",
      "邊際貢獻率",
      "損益平衡銷量（理論值）",
      "損益平衡銷量（整數單位）",
      "損益平衡營收（理論值）",
      "損益平衡營收（整數單位）",
      "安全邊際",
    ],
    faq: [
      "為什麼損益平衡銷量要無條件進位？",
      "少賣一個單位就還有固定成本沒攤平，仍是虧損；整數單位值是第一個不虧的銷量。",
      "為什麼有兩個營收數字？",
      "理論值假設可以賣出小數單位；整數單位值是第一個打平銷量的實際營收，兩者只差不到一個單位的售價。",
      "售價等於或低於變動成本時會怎樣？",
      "每個單位貢獻零或負數，賣再多也攤不平固定成本，數學上沒有損益平衡點，本工具直接說明而不給數字。",
      "安全邊際是什麼？",
      "預期銷量高出（或低於）損益平衡銷量的單位數與百分比，並附該銷量下的預期利潤或虧損。",
    ],
    assets: ['href="./styles/breakeven.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Breakeven Calculator | Gloss Tools",
    description:
      "Enter fixed costs, price per unit and variable cost per unit to find the breakeven volume and revenue, margin of safety and contribution margin ratio.",
    h1: "Breakeven Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "0–999,999,999.99, up to two decimal places.",
    draftNote: "Switching language or leaving the page discards the draft.",
    labels: [
      "Contribution margin per unit",
      "Contribution margin ratio",
      "Breakeven volume (exact)",
      "Breakeven volume (whole units)",
      "Breakeven revenue (exact)",
      "Breakeven revenue (whole units)",
      "Margin of safety",
    ],
    faq: [
      "Why is the breakeven volume always rounded up?",
      "Selling one unit fewer leaves part of the fixed costs uncovered, so it still loses money; the whole-unit figure is the first volume that does not lose money.",
      "Why are there two revenue figures?",
      "The exact figure assumes fractional units could be sold; the whole-unit figure is the actual revenue at the first volume that breaks even, and they differ by less than one unit's price.",
      "What if the price is at or below variable cost?",
      "Each unit contributes zero or less, so no volume can cover fixed costs and no breakeven point exists; the tool explains this instead of showing a number.",
      "What is the margin of safety?",
      "How far the expected volume sits above (or below) the breakeven volume, in units and percent, together with the profit or loss at that volume.",
    ],
    assets: ['href="../styles/breakeven.css"', 'src="../js/app.js"'],
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
  if (html.includes("https://")) fail(`${page.path}: preview must not contain https URLs`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  for (const text of page.labels) {
    if (!html.includes(text)) fail(`${page.path}: missing result label: ${text}`);
  }
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
    "semantic-notice",
    "results",
    "result-summary",
    "result-contribution",
    "result-ratio",
    "result-units-exact",
    "result-units",
    "result-revenue-exact",
    "result-revenue",
    "result-margin",
    "result-margin-units",
    "result-margin-percent",
    "result-expected-profit",
    "below-warning",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/breakeven.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "breakeven-calculator-worker-"));
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
// or the controller. The app may touch document/window (it is the DOM
// layer) but must not use any storage (the SPEC forbids persistent
// storage; the draft lives only in-page).
for (const purePath of [
  "public/js/core/breakeven.mjs",
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
  for (const token of ["localStorage", "sessionStorage"]) {
    if (appText.includes(token)) fail(`public/js/app.js: must not use ${token}`);
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/constants/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
