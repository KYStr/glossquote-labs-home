// Static project checks for the Tax-Included Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, formula constants, the example
// equals the net-basic fixture, the pinned bilingual strings in the app,
// bilingual metadata and the candidate canonical / noindex / CSP rules),
// core purity (no DOM/network/storage), syntax of every shipped script,
// the fixed worker-source concatenation, and a forbidden-capability
// scan. Exits non-zero on the first failure list.

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
  "public/js/core/tax-included.mjs",
  "public/styles/tax-included.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/tax-included-core.test.mjs",
  "test/tax-included-controller.test.mjs",
  "test/tax-included-report.test.mjs",
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
// does not match its own scan. localStorage is deliberately NOT in this
// list, but the app must not use it either: the SPEC pins the draft to
// the current page (switching language or leaving discards it), so the
// purity check below forbids localStorage in app.js too. URL schemes are
// likewise not in this list: the SPEC pins https canonical / Open Graph
// / hreflang URLs in the pages, and check.mjs asserts those are the
// only URLs present.
const forbiddenTokens = [
  ["inner", "HTML"],
  ["outer", "HTML"],
  ["insertAdjacent", "HTML"],
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

// Core contract: field order, raw limits, defaults, bounds, report
// constants, storage key, and the example must match the SPEC and
// fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/tax-included.mjs")).href);
const expectedFields = ["mode", "ratePercent", "basis", "amount", "lines"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { mode: 16, ratePercent: 8, basis: 16, amount: 16, lines: 16 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "single",
  basis: "net",
  amount: "10000",
  ratePercent: "5",
  lines: null,
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.AMOUNT_MAX !== 999999999999n) fail("core: AMOUNT_MAX must be 999999999999n");
if (core.LINE_MAX !== 20) fail("core: LINE_MAX must be 20");
if (core.RATE_HUNDREDTHS_MAX !== 10000n) fail("core: RATE_HUNDREDTHS_MAX must be 10000n");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "tax-included-converter-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.STORAGE_KEY !== "gloss-tools:tax-included-converter:draft:v1") {
  fail("core: STORAGE_KEY mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入或載入範例", en: "Enter an amount or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check your input" },
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
if (fixturesHash !== "6e15f67484f6fabadf1049e231c992a9720b66609782f79b320cdbd3f69e850b") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 22) {
  fail("test/fixtures.json: expected 22 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
if (fixtures.slug !== "tax-included-converter") fail("test/fixtures.json: slug mismatch");
if (fixtures.specId !== "spec-tax-included-converter-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
const netBasic = fixtures.cases.find((entry) => entry.id === "net-basic");
if (canonical(core.EXAMPLE) !== canonical(netBasic.input)) {
  fail("core: EXAMPLE must equal the net-basic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the estimate disclaimer and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "稅率請用數字，最多兩位小數",
  "金額請用整數元",
  "超出允許範圍",
  "明細最多 20 列",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter the rate as a number with at most two decimals.",
  "Enter the amount as whole dollars.",
  "Out of range.",
  "At most 20 lines.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "已載入範例，請按「換算」執行。",
  "Example loaded. Run “Convert” to calculate it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, the pinned canonical and Open Graph
// tags, same-language home links, local assets, the pinned FAQ answers
// and estimate disclaimer.
const CSP_META =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "含稅未稅換算｜Gloss Tools",
    description:
      "未稅金額與含稅金額雙向換算：輸入一筆金額或多筆未稅明細，按台灣營業稅 5%（可改）一次算出未稅、稅額與含稅三欄。",
    h1: "含稅未稅換算",
    canonical: "https://tax-included-converter.glossquote.com/",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "台灣營業稅現行徵收率 5%。",
    disclaimer:
      "估算說明：稅額依加值型及非加值型營業稅法第 14 條，按銷售總額計算一次、尾數四捨五入到元；明細模式的稅額亦按總額計算一次，逐項計稅合計僅供對照。結果僅供報價與填票前估算，不是實際開立或申報發票。",
    faq: [
      "這份結果可以直接拿去開立發票嗎？",
      "不行。這是報價與填票前的估算，實際開立統一發票或電子發票與申報請依稅務規定辦理。",
      "為什麼逐項計稅合計和按總額計稅會不一樣？",
      "因為稅額尾數四捨五入只做一次。逐項各捨一次再加總，和先加總再捨一次，結果可能差 1 元；發票結構是按總額計算一次，本工具以總額為準、把差額明示出來。",
      "稅率為什麼預設 5%？",
      "台灣營業稅現行徵收率為 5%（加值型及非加值型營業稅法第 10 條定 5–10% 區間，徵收率由行政院定之）。其他稅率情境可自行修改稅率欄位。",
    ],
    assets: ['href="./styles/tax-included.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Tax-Included Converter | Gloss Tools",
    description:
      "Convert between tax-exclusive and tax-inclusive amounts: enter one amount or several net lines and get net, tax and gross under Taiwan business tax 5% (editable), computed once on the total.",
    h1: "Tax-Included Converter",
    canonical: "https://tax-included-converter.glossquote.com/en/",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "Taiwan business tax is currently 5%.",
    disclaimer:
      "Estimate: under Article 14 of the Value-added and Non-value-added Business Tax Act, tax is computed once on the total sales amount and rounded half-up to the nearest dollar; in lines mode the tax is likewise computed once on the total, and the per-line sum is shown only for comparison. Results are estimates for quoting and filling in an invoice, not an issued or filed invoice.",
    faq: [
      "Can I use this result to issue an invoice directly?",
      "No. This is an estimate for quoting and filling in an invoice; issuing a uniform or e-invoice and filing must follow the tax rules.",
      "Why does the per-line tax sum differ from the tax on the total?",
      "Because the half-up rounding to the dollar happens only once. Rounding each line separately and adding can differ from rounding the total once by NT$1; the invoice structure taxes the total once, so this tool uses the total and shows the difference.",
      "Why is the default rate 5%?",
      "5% is the current Taiwan business tax levy (the Value-added and Non-value-added Business Tax Act, Article 10, sets a 5–10% range with the rate set by the Executive Yuan). Enter another rate for other situations.",
    ],
    assets: ['href="../styles/tax-included.css"', 'src="../js/app.js"'],
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
  if (!html.includes(`<link rel="canonical" href="${page.canonical}">`)) {
    fail(`${page.path}: canonical mismatch`);
  }
  if (!html.includes(`<meta property="og:url" content="${page.canonical}">`)) {
    fail(`${page.path}: og:url mismatch`);
  }
  if (!html.includes('<meta property="og:type" content="website">')) {
    fail(`${page.path}: missing og:type`);
  }
  if (!html.includes('<meta name="twitter:card" content="summary">')) {
    fail(`${page.path}: missing twitter:card`);
  }
  // The pinned canonical / og:url / hreflang URLs are the only URLs
  // in the page: canonical + og:url + zh-Hant + en + x-default = 5.
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 5) fail(`${page.path}: expected exactly 5 https URLs (canonical + og:url + 3 hreflang), found ${urlCount}`);
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
  for (const id of [
    "tax-form",
    "field-mode-single",
    "field-mode-lines",
    "field-ratePercent",
    "field-basis-net",
    "field-basis-gross",
    "field-amount",
    "lines-section",
    "lines-list",
    "lines-add-btn",
    "error-mode",
    "error-ratePercent",
    "error-basis",
    "error-amount",
    "error-lines",
    "status",
    "example-note",
    "results",
    "result-net-value",
    "result-tax-value",
    "result-gross-value",
    "result-net-tag",
    "result-tax-tag",
    "result-gross-tag",
    "result-echo",
    "result-lines-wrap",
    "result-lines-body",
    "result-perline-value",
    "result-difference-value",
    "result-same-note",
    "disclaimer",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/tax-included.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "tax-included-converter-worker-"));
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
// or the controller. The app must not touch storage either: the SPEC
// pins the draft to the current page, so there is no persistence layer.
for (const purePath of [
  "public/js/core/tax-included.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (purePath === "public/js/app.js" && (token === "document" || token === "window")) continue;
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
  "Check passed: files, package contract, core fields/limits/defaults/constants/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
