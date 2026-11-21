// Static project checks for the Currency Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, bounds, quick-table steps, the
// example equals the default-forward fixture, the pinned bilingual
// strings in the app, bilingual metadata and the candidate noindex /
// CSP / no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source concatenation,
// and a forbidden-capability scan. Exits non-zero on the first failure
// list.

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
  "public/js/core/currency-converter.mjs",
  "public/styles/currency-converter.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/currency-converter-core.test.mjs",
  "test/currency-converter-controller.test.mjs",
  "test/currency-converter-report.test.mjs",
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
// does not match its own scan. This tool's SPEC bans persistent storage
// outright, so localStorage and sessionStorage are forbidden everywhere
// in the shipped sources (unlike tools whose SPEC pins a draft key).
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

// Core contract: field order, raw limits, defaults, bounds, quick-table
// steps, report constants, status strings, and the example must match
// the SPEC and fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/currency-converter.mjs")).href
);
const expectedFields = ["fromCode", "toCode", "rate", "amount", "direction"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { fromCode: 8, toCode: 8, rate: 14, amount: 12, direction: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  fromCode: "USD",
  toCode: "TWD",
  rate: "31.5",
  amount: "100",
  direction: "a-to-b",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC section 2)");
}
if (core.RATE_MICRO_MIN !== 1n) fail("core: RATE_MICRO_MIN must be 1n");
if (core.RATE_MICRO_MAX !== 1000000000000n) fail("core: RATE_MICRO_MAX must be 1000000000000n");
if (core.AMOUNT_CENTS_MAX !== 999999999n) fail("core: AMOUNT_CENTS_MAX must be 999999999n");
if (JSON.stringify(core.QUICK_TABLE_CENTS) !== JSON.stringify([100, 1000, 10000, 100000])) {
  fail("core: QUICK_TABLE_CENTS must be [100, 1000, 10000, 100000]");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "currency-converter-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入匯率與金額，或載入範例。", en: "Enter a rate and amount, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check the input" },
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
if (fixturesHash !== "fe03d36865e7295f94a037dc306e756fa647972d57e6d5ff7030483410343463") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 21) {
  fail("test/fixtures.json: expected 21 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const defaultForward = fixtures.cases.find((entry) => entry.id === "default-forward");
if (canonical(core.EXAMPLE) !== canonical(defaultForward.input)) {
  fail("core: EXAMPLE must equal the default-forward fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the disclaimer, and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "幣別代碼須為恰好 3 個英文字母",
  "請輸入有效的數字",
  "請選擇換算方向",
  "匯率須大於 0 且不超過 1000000",
  "金額須不超過 9999999.99",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "A currency code must be exactly 3 letters.",
  "Enter a valid number.",
  "Choose a conversion direction.",
  "The rate must be greater than 0 and at most 1000000.",
  "The amount must be at most 9999999.99.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "本工具不會取得或提供即時匯率。所有換算只使用你輸入的匯率；實際交易的匯率與費用，請向你的銀行或匯兌服務商確認。",
  "This tool does not fetch or provide live exchange rates. Every conversion uses only the rate you enter; for the rate and fees that will actually apply, check your bank or exchange provider.",
  "已載入範例，請按「換算」執行。",
  "Example loaded. Run “Convert” to compute it.",
  "反向匯率：",
  "Inverse rate:",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}
if ((appSource.match(/localStorage/g) ?? []).length !== 0) {
  fail("public/js/app.js: localStorage is banned by this SPEC and must not appear");
}
if ((appSource.match(/sessionStorage/g) ?? []).length !== 0) {
  fail("public/js/app.js: sessionStorage is banned by this SPEC and must not appear");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, no production canonical / hreflang /
// absolute URLs (SPEC section 7: the planned origin is not configured),
// same-language home links, local assets, the pinned disclaimer and FAQ.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "匯率換算｜Gloss Tools",
    description:
      "用你自己輸入的匯率，把金額在兩種幣別之間雙向換算，附反向匯率與 1、10、100、1000 快速對照表。本工具不提供即時匯率。",
    h1: "匯率換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: [
      "恰好 3 個英文字母，例如 USD",
      "大於 0、不超過 1000000，小數最多 6 位",
      "0–9999999.99，小數最多 2 位",
    ],
    rateLabel: "匯率（每 1 單位來源幣別可換得的目標幣別數量）",
    directionOptions: [
      "來源 → 目標（金額是來源幣別）",
      "目標 → 來源（金額是目標幣別）",
    ],
    disclaimer:
      "本工具不會取得或提供即時匯率。所有換算只使用你輸入的匯率；實際交易的匯率與費用，請向你的銀行或匯兌服務商確認。",
    draftNote: "切換語言或離開頁面會失去草稿。",
    faq: [
      "匯率從哪裡來？",
      "由你輸入。本工具不連線到任何匯率服務，也沒有內建匯率；你輸入什麼，就用什麼算。",
      "反方向為什麼不用畫面上的反向匯率算？",
      "反向匯率只取 6 位有效數字供顯示；反方向換算一律用你輸入的匯率做精確除法，只在最後捨入一次，所以不會累積顯示捨入的誤差。",
      "幣別代碼可以打任何 3 個英文字母嗎？",
      "可以。代碼不對照 ISO 4217 清單驗證，因為清單會變動，過期清單反而會誤拒合法代碼；工具對代碼不賦予語義，來源與目標相同也合法。",
      "換算結果會和銀行實際扣款一樣嗎？",
      "不一定。實際交易還有手續費與買入／賣出價差；請把你在銀行或服務商實際面對的匯率輸入，再用結果核對。",
    ],
    assets: ['href="./styles/currency-converter.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Currency Converter | Gloss Tools",
    description:
      "Convert an amount between two currencies in both directions using a rate you enter, with the inverse rate and a 1 / 10 / 100 / 1000 quick table. This tool does not provide live rates.",
    h1: "Currency Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: [
      "Exactly 3 letters, for example USD",
      "Greater than 0 and at most 1000000, with at most 6 decimal places",
      "0–9999999.99, with at most 2 decimal places",
    ],
    rateLabel: "Rate (units of the to currency per 1 unit of the from currency)",
    directionOptions: [
      "From → To (the amount is in the from currency)",
      "To → From (the amount is in the to currency)",
    ],
    disclaimer:
      "This tool does not fetch or provide live exchange rates. Every conversion uses only the rate you enter; for the rate and fees that will actually apply, check your bank or exchange provider.",
    draftNote: "Switching languages or leaving the page discards the draft.",
    faq: [
      "Where does the rate come from?",
      "From you. This tool never connects to a rate service and ships with no built-in rates; it computes with exactly the rate you enter.",
      "Why is the reverse direction not computed from the displayed inverse rate?",
      "The inverse rate is rounded to 6 significant digits for display only. Reverse conversions always divide by the rate you entered, exactly, and round once at the end, so display rounding never accumulates.",
      "Can I enter any 3 letters as a currency code?",
      "Yes. Codes are not checked against the ISO 4217 list, because the list changes and a stale list would wrongly reject valid codes; the tool assigns no meaning to a code, and using the same code on both sides is allowed.",
      "Will the result match what my bank actually charges?",
      "Not necessarily. Real transactions add fees and a buy/sell spread; enter the rate your bank or provider actually offers you and use the result to check it.",
    ],
    assets: ['href="../styles/currency-converter.css"', 'src="../js/app.js"'],
  },
];
const REQUIRED_IDS = [
  "currency-converter-form",
  "field-fromCode",
  "field-toCode",
  "field-rate",
  "field-amount",
  "field-direction",
  "field-direction-a-to-b",
  "field-direction-b-to-a",
  "error-fromCode",
  "error-toCode",
  "error-rate",
  "error-amount",
  "error-direction",
  "status",
  "results",
  "conversion-sentence",
  "direction-forward",
  "direction-inverse",
  "quick-table",
  "quick-table-body",
  "disclaimer",
  "disclaimer-input",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
  "example-note",
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
  if (html.includes("canonical")) fail(`${page.path}: must not carry a canonical link`);
  if (html.includes("hreflang")) fail(`${page.path}: must not carry hreflang`);
  if (html.includes("https://")) fail(`${page.path}: must not contain an absolute URL`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  for (const text of page.help) {
    if (!html.includes(text)) fail(`${page.path}: missing pinned help line: ${text}`);
  }
  if (!html.includes(page.rateLabel)) fail(`${page.path}: rate label must state the direction convention`);
  for (const text of page.directionOptions) {
    if (!html.includes(text)) fail(`${page.path}: missing direction option: ${text}`);
  }
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned disclaimer`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of REQUIRED_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id="${id}"`);
  }
}

// The serve script must carry the same SPEC CSP.
const serveSource = await readFile(resolve(PROJECT_ROOT, "scripts/serve.mjs"), "utf8");
if (!serveSource.includes(CSP_META)) fail("scripts/serve.mjs: CSP must match the SPEC CSP");

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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/currency-converter.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "currency-converter-worker-"));
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
// or the controller. Only public/js/app.js may touch the DOM.
for (const purePath of [
  "public/js/core/currency-converter.mjs",
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

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/bounds/quick-table/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
