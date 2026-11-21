// Static project checks for the Stock Profit Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, the day-trade rate, the example
// equals the round-lot-profit fixture, the pinned bilingual strings in
// the app, bilingual metadata and the candidate no-canonical / noindex /
// CSP rules), core purity (no DOM/network/storage), syntax of every
// shipped script, the fixed worker-source concatenation, and a
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
  "public/js/core/stock-profit.mjs",
  "public/styles/stock-profit.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/stock-profit-core.test.mjs",
  "test/stock-profit-controller.test.mjs",
  "test/stock-profit-report.test.mjs",
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
// does not match its own scan. Persistent storage is deliberately IN
// this list: the SPEC forbids persistent storage for this tool, so no
// shipped source may touch it. URL schemes are likewise not in this
// list: the pages carry no absolute URLs at all (checked below).
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

// Core contract: field order, raw limits, defaults, day-trade rate,
// report constants, and the example must match the SPEC and
// fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/stock-profit.mjs")).href);
const expectedFields = [
  "buyPrice",
  "buyQty",
  "buyUnit",
  "sellPrice",
  "sellQty",
  "sellUnit",
  "feeRatePct",
  "feeDiscount",
  "minFeeTwd",
  "taxMode",
  "taxRatePct",
];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  buyPrice: 9,
  buyQty: 6,
  buyUnit: 8,
  sellPrice: 9,
  sellQty: 6,
  sellUnit: 8,
  feeRatePct: 8,
  feeDiscount: 5,
  minFeeTwd: 5,
  taxMode: 8,
  taxRatePct: 8,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  buyPrice: "100",
  buyQty: "1000",
  buyUnit: "share",
  sellPrice: "110",
  sellQty: "1000",
  sellUnit: "share",
  feeRatePct: "0.1425",
  feeDiscount: "1",
  minFeeTwd: "20",
  taxMode: "standard",
  taxRatePct: "0.3",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow)");
}
if (core.DAY_TAX_RATE_PCT !== "0.15") fail("core: DAY_TAX_RATE_PCT must be 0.15");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "stock-profit-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入資料或載入範例", en: "Enter your trade or load the example" },
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
if (fixturesHash !== "3eab7f7389355403a26547a2cfae6cd588924a11f664c6439e3f07642a5cfb95") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.schemaVersion !== 1) fail("test/fixtures.json: schemaVersion must be 1");
if (fixtures.slug !== "stock-profit-calculator") fail("test/fixtures.json: slug mismatch");
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const roundLot = fixtures.cases.find((entry) => entry.id === "round-lot-profit");
if (canonical(core.EXAMPLE) !== canonical(roundLot.input)) {
  fail("core: EXAMPLE must equal the round-lot-profit fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the investment-advice disclaimer and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "數字格式不正確，請檢查小數位數",
  "請輸入整數",
  "請選擇有效的選項",
  "超出允許範圍",
  "賣出股數不可超過買入股數",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Check the number format and decimal places.",
  "Enter a whole number.",
  "Choose a valid option.",
  "Out of range.",
  "Sell shares cannot exceed buy shares.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "試算結果不構成投資建議；費率、稅率與最低費可能調整，實際收費以券商對帳單為準。",
  "Results are estimates, not investment advice. Rates and minimum fees may change; your broker's statement governs.",
  "已載入範例，請按「計算損益」執行。",
  "Example loaded. Run “Calculate profit & loss” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local
// assets, the pinned FAQ answers and investment disclaimer. The
// candidate carries no production canonical, hreflang, sitemap or
// absolute URL at all (SPEC: the planned origin is not configured).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "股票損益計算｜Gloss Tools",
    description:
      "輸入台股買入價、賣出價與股數，逐項算出買賣手續費、最低手續費、證交稅、淨損益、報酬率與損益兩平賣出價；費率與稅率可依自己的券商調整。",
    h1: "股票損益計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "預設 0.1425% 是證交所營業細則第 94 條基準",
    disclaimer:
      "試算結果不構成投資建議；費率、稅率與最低費可能調整，實際收費以券商對帳單為準。",
    faq: [
      "最低手續費 20 元是法律規定的嗎？",
      "不是。它是券商自訂並申報證交所備查的每筆最低費用，20 元是整股交易的普遍約定，零股常為 1 元；請依你的券商修改。",
      "手續費折讓怎麼填？",
      "填你實際支付的比例：無折讓填 1、6 折填 0.6、2.8 折填 0.28。折讓只套用在手續費，證交稅不打折。",
      "當沖稅率 0.15% 一直都有嗎？",
      "只適用現股當沖（同券商、同帳戶、同日、同種同量），依證券交易稅條例第 2 條之 2 施行至 2027 年 12 月 31 日；資券當沖仍為 0.3%。",
      "為什麼和券商 App 的損益不一樣？",
      "常見原因是折讓的結算方式（逐筆或按月退還）、費用尾數處理或最低費不同。請把參數改成你的券商條件再比對，實際收費以對帳單為準。",
    ],
    assets: ['href="./styles/stock-profit.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Stock Profit Calculator | Gloss Tools",
    description:
      "Work out a Taiwan stock trade line by line: buy and sell brokerage fees with the per-order minimum, securities transaction tax, net profit or loss, return %, and the breakeven sell price, with rates you can adjust to your broker.",
    h1: "Stock Profit Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "the 0.1425% default is the TWSE Operating Rules Art. 94 benchmark",
    disclaimer:
      "Results are estimates, not investment advice. Rates and minimum fees may change; your broker's statement governs.",
    faq: [
      "Is the NT$20 minimum fee set by law?",
      "No. Each broker sets its own per-order minimum, filed with the TWSE; NT$20 is the common round-lot convention and odd lots are often NT$1. Adjust it to your broker.",
      "How do I enter my fee discount?",
      "Enter the fraction you actually pay: 1 for none, 0.6 for 40% off. The discount applies to brokerage fees only, never to the transaction tax.",
      "Is the 0.15% day-trading rate permanent?",
      "It covers cash day trades only (same broker, account, day, stock and quantity) under Article 2-2 of the Securities Transaction Tax Act, in force through 31 Dec 2027; margin day trades stay at 0.3%.",
      "Why does my broker app show a different figure?",
      "Usual causes are how discounts settle (per trade or monthly rebate), fee rounding, or a different minimum fee. Match the parameters to your broker; the statement governs.",
    ],
    assets: ['href="../styles/stock-profit.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: must not carry a canonical link`);
  if (html.includes("hreflang")) fail(`${page.path}: must not carry hreflang`);
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected no absolute https URLs, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned disclaimer`);
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
    "net-value",
    "return-value",
    "profit-word",
    "disclaimer",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
    "result-buy-gross",
    "result-buy-fee",
    "result-buy-total",
    "result-sell-gross",
    "result-sell-fee",
    "result-sell-tax",
    "result-sell-net",
    "result-cost-basis",
    "result-remaining-shares",
    "result-breakeven",
    "result-effective-tax",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/stock-profit.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "stock-profit-calculator-worker-"));
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

// Core purity: no DOM, storage, or network access in the pure modules,
// the controller, or the app. Only the app may touch `window` and
// `document` (it is the DOM layer); nothing may touch storage.
for (const purePath of [
  "public/js/core/stock-profit.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/day-rate/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
