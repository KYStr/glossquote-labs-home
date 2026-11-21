// Static project checks for the Savings Goal Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, bounds, the example
// equals the first fixture input, the pinned bilingual status
// sentences and disclosure, the pinned bilingual strings in the app,
// bilingual metadata and the preview noindex / CSP rules), core
// purity (no DOM/network/storage), syntax of every shipped script,
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
  "public/js/core/savings-goal.mjs",
  "public/styles/savings-goal.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/savings-goal-core.test.mjs",
  "test/savings-goal-controller.test.mjs",
  "test/savings-goal-report.test.mjs",
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
// file does not match its own scan. This tool keeps no persistent
// draft anywhere, so localStorage / sessionStorage / IndexedDB are
// forbidden in every shipped file, including the app.
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

// Core contract: field order, raw limits, defaults, bounds, report
// constants, status text, status sentences and disclosure.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/savings-goal.mjs")).href
);
const expectedFields = [
  "mode",
  "targetAmount",
  "initialAmount",
  "annualRate",
  "months",
  "monthlyPayment",
];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  mode: 16,
  targetAmount: 16,
  initialAmount: 16,
  annualRate: 8,
  months: 8,
  monthlyPayment: 16,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "payment",
  targetAmount: "100000",
  initialAmount: "10000",
  annualRate: "3",
  months: "60",
  monthlyPayment: "3000",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = {
  annualRate: "0",
  initialAmount: "10000",
  mode: "payment",
  monthlyPayment: "3000",
  months: "12",
  targetAmount: "100000",
};
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE must equal the first fixture input (payment-basic-zero-rate)");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "savings-goal-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.TARGET_MIN_CENTS !== 1n) fail("core: TARGET_MIN_CENTS must be 1n");
if (core.AMOUNT_MAX_CENTS !== 99999999999n) {
  fail("core: AMOUNT_MAX_CENTS must be 99999999999n");
}
if (core.RATE_MAX_BP !== 10000n) fail("core: RATE_MAX_BP must be 10000n");
if (core.MONTHS_MIN !== 1 || core.MONTHS_MAX !== 600) {
  fail("core: months range must be 1-600");
}
if (core.HORIZON_MONTHS !== 1200) fail("core: HORIZON_MONTHS must be 1200");
const expectedStatus = {
  empty: { zh: "請輸入或載入範例", en: "Enter your inputs or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check your input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
const expectedSentences = {
  "already-funded": {
    zh: "目前存款已達目標，不需再存。",
    en: "Your current savings already reach the goal; no deposit is needed.",
  },
  "growth-sufficient": {
    zh: "不需新增存款，目前存款單獨成長即可在期限內達標。",
    en: "No new deposits are needed; your current savings alone grow to the goal by the deadline.",
  },
  "unreachable-no-growth": {
    zh: "在目前條件下餘額永遠不會成長，達不到目標。",
    en: "Under these inputs the balance never grows, so the goal can never be reached.",
  },
  "unreachable-beyond-horizon": {
    zh: "以目前每月金額，達標需要超過 1200 個月（100 年），超出本工具範圍。",
    en: "At this monthly amount the goal takes over 1,200 months (100 years), beyond this tool's horizon.",
  },
};
if (canonical(core.STATUS_SENTENCES) !== canonical(expectedSentences)) {
  fail("core: STATUS_SENTENCES mismatch");
}
const expectedDisclosure = {
  zh: "報酬率為假設值，試算結果不保證實際收益。",
  en: "The rate is an assumption; results do not guarantee actual returns.",
};
if (canonical(core.DISCLOSURE) !== canonical(expectedDisclosure)) {
  fail("core: DISCLOSURE mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "b4115210a148532133b2ec728ed87772b59ca3af98a76adc28cccaa014405979") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (typeof fixtures !== "object" || fixtures === null || Array.isArray(fixtures)) {
  fail("test/fixtures.json: expected a spec fixtures object");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: cases must be an array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 18) {
  fail("test/fixtures.json: expected 18 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const firstCase = fixtures.cases.find((entry) => entry.id === "payment-basic-zero-rate");
if (canonical(core.EXAMPLE) !== canonical(firstCase.input)) {
  fail("core: EXAMPLE must equal the payment-basic-zero-rate fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "金額請用數字，最多 2 位小數",
  "年利率請用數字，最多 2 位小數",
  "期限請用整數",
  "期限為 1–600 個月",
  "年利率為 0–100%",
  "目標金額為 0.01–999,999,999.99",
  "金額為 0–999,999,999.99",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "已載入範例，請按「計算儲蓄計畫」執行。",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter the amount as a number, with at most 2 decimal places.",
  "Enter the annual rate as a number, with at most 2 decimal places.",
  "Enter the term as a whole number.",
  "The term must be 1–600 months.",
  "The annual rate must be 0–100%.",
  "The goal amount must be 0.01–999,999,999.99.",
  "The amount must be 0–999,999,999.99.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "Example loaded. Run “Calculate savings plan” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, no production canonical (the SPEC pins
// none for the preview candidate), same-language home links, local
// assets, the pinned disclosure and FAQ answers.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const DISCLOSURE_LINE =
  "報酬率為假設值，試算結果不保證實際收益。 / The rate is an assumption; results do not guarantee actual returns.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "儲蓄目標計算｜Gloss Tools",
    description:
      "輸入目標金額、目前存款與假設年利率，算出每月要存多少，或以固定月存金額算出幾個月達標；月底存款、精確有理數運算，結果不保證收益。",
    h1: "儲蓄目標計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "0.01–999,999,999.99 元，最多 2 位小數。",
    faq: [
      "存款是什麼時候存入？",
      "每月月底（普通年金），本月存入的錢下個月才開始計息。",
      "為什麼每月金額無條件進位到分？",
      "避免差不到一分錢沒達標；照顯示金額存，期末餘額會等於或略高於目標。最後一月的尾款也是同樣規則，所以顯示利息可能比精確值少不到一分。",
      "報酬率是保證的嗎？",
      "不是。利率是你輸入的假設，結果只是該假設下的試算，不保證任何實際收益。",
      "和複利計算機有什麼不同？",
      "複利計算機逐月模擬成長並提供每月明細，答案來自逐月進位到分的模擬；本工具只解兩個反問題，用不捨入的閉式公式精確計算，因此同樣輸入下兩者答案可能差幾分錢。",
    ],
    assets: ['href="./styles/savings-goal.css"', 'src="./js/app.js"'],
    detailLabels: [
      "期限（月）",
      "每月需存金額",
      "總存款",
      "總利息",
      "期末餘額",
      "達標月數",
      "最後一月需存金額",
      "全額存入時餘額",
    ],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Savings Goal Calculator | Gloss Tools",
    description:
      "Enter a goal, current savings and an assumed annual rate to find the monthly deposit you need, or the months a fixed deposit takes to reach the goal. End-of-month deposits and exact rational arithmetic; results are not a guarantee of returns.",
    h1: "Savings Goal Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "0.01–999,999,999.99, at most 2 decimal places.",
    faq: [
      "When are deposits made?",
      "At the end of each month (ordinary annuity); a deposit starts earning interest the following month.",
      "Why is the monthly amount rounded up to the cent?",
      "So the plan never falls a cent short; depositing the displayed amount ends at or slightly above the goal. The final month's smaller deposit follows the same rule, so the displayed interest can be under a cent below the exact figure.",
      "Is the return guaranteed?",
      "No. The rate is your own assumption and the result is only a projection under it, not a promise of any actual return.",
      "How is this different from the Compound Interest Calculator?",
      "That tool simulates growth month by month with a full table, and its answers come from that cent-rounded simulation; this tool solves only the two inverse questions with unrounded closed-form math, so the two can differ by a few cents on the same inputs.",
    ],
    assets: ['href="../styles/savings-goal.css"', 'src="../js/app.js"'],
    detailLabels: [
      "Term (months)",
      "Monthly deposit needed",
      "Total deposits",
      "Total interest",
      "Final balance",
      "Months required",
      "Final month deposit",
      "Balance if paying in full",
    ],
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
  if (html.includes("rel=\"canonical\"")) {
    fail(`${page.path}: preview must not carry a production canonical`);
  }
  if (html.includes("https://")) {
    fail(`${page.path}: preview must not contain an https URL`);
  }
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(DISCLOSURE_LINE)) fail(`${page.path}: missing pinned disclosure`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const label of page.detailLabels) {
    if (!html.includes(label)) fail(`${page.path}: missing detail label: ${label}`);
  }
  for (const field of expectedFields) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "status",
    "results",
    "result-summary",
    "status-sentence",
    "result-details",
    "disclosure",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
    "example-note",
  ]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id="${id}"`);
  }
  for (const key of [
    "months",
    "monthlyPayment",
    "totalDeposits",
    "totalInterest",
    "finalBalance",
    "monthsRequired",
    "finalMonthPayment",
    "balanceIfFullPayment",
  ]) {
    if (!html.includes(`id="row-${key}"`)) fail(`${page.path}: missing detail row row-${key}`);
    if (!html.includes(`id="value-${key}"`)) fail(`${page.path}: missing detail value value-${key}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/savings-goal.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "savings-goal-calculator-worker-"));
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
// or the controller. The app must not touch storage either: this tool
// keeps the draft in the page only.
for (const purePath of [
  "public/js/core/savings-goal.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (purePath === "public/js/app.js" && token === "document") continue;
    if (purePath === "public/js/app.js" && token === "window") continue;
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
  "Check passed: files, package contract, core fields/limits/defaults/bounds/status/sentences/disclosure/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
