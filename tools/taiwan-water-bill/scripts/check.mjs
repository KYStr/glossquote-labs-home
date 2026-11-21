// Static project checks for the Taiwan Water Bill Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, the full basic-fee
// tables, tier prices/limits/differences, the levy divisors, the
// example equals the bimonthly-typical fixture, the pinned bilingual
// strings in the app, bilingual metadata and the candidate canonical /
// noindex / CSP rules), core purity (no DOM/network/storage), syntax of
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
  "public/js/core/taiwan-water-bill.mjs",
  "public/styles/taiwan-water-bill.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/taiwan-water-bill-core.test.mjs",
  "test/taiwan-water-bill-controller.test.mjs",
  "test/taiwan-water-bill-report.test.mjs",
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
// does not match its own scan. The SPEC forbids persistent storage for
// this tool, so localStorage IS in this list (unlike tools whose SPEC
// pins a draft key). URL schemes are likewise not in this list: the
// SPEC pins https canonical / Open Graph URLs in the pages, and
// check.mjs asserts those are the only URLs present.
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

// Core contract: field order, raw limits, defaults, the full basic-fee
// tables, tier prices/limits/differences, levy divisors, report
// constants, status strings, and the example must match the SPEC and
// fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/taiwan-water-bill.mjs")).href
);
const expectedFields = ["cycle", "diameterMm", "usageM3", "sewerRateNt", "wasteRateNt"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
// The SPEC says 8 units per field, but the pinned enum value
// "bimonthly" is 9 units long; the cycle limit is 9 so the pinned
// value is admissible (HANDOFF.md spec-errata candidate 1).
const expectedRawLimits = { cycle: 9, diameterMm: 8, usageM3: 8, sewerRateNt: 8, wasteRateNt: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  cycle: "bimonthly",
  diameterMm: "20",
  usageM3: "30",
  sewerRateNt: "",
  wasteRateNt: "",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow)");
}
if (core.USAGE_MIN !== 0 || core.USAGE_MAX !== 999999) {
  fail("core: usage range must be 0-999999");
}
if (core.RATE_MAX_HUNDREDTHS !== 9999) fail("core: rate max must be 9999 hundredths (99.99)");
if (core.WRCC_DIVISOR !== 21) fail("core: WRCC_DIVISOR must be 21");
if (core.BUSINESS_TAX_DIVISOR !== 2100) fail("core: BUSINESS_TAX_DIVISOR must be 2100");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "taiwan-water-bill-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedBasicFees = {
  monthly: {
    13: 17850, 20: 35700, 25: 66150, 40: 196350, 50: 357000, 75: 963900,
    100: 1909950, 150: 5301450, 200: 10531500, 250: 18599700, 300: 29184750,
    350: 41626200, "400+": 58119600,
  },
  bimonthly: {
    13: 35700, 20: 71400, 25: 132300, 40: 392700, 50: 714000, 75: 1927800,
    100: 3819900, 150: 10602900, 200: 21063000, 250: 37199400, 300: 58369500,
    350: 83252400, "400+": 116239200,
  },
};
if (canonical(core.BASIC_FEE_MILLI_NT) !== canonical(expectedBasicFees)) {
  fail("core: BASIC_FEE_MILLI_NT table differs from the official tariff");
}
if (JSON.stringify(core.TIER_UNIT_PRICE_MILLI_NT) !== JSON.stringify([7350, 9450, 11550, 12075])) {
  fail("core: TIER_UNIT_PRICE_MILLI_NT must be 7350/9450/11550/12075");
}
if (
  JSON.stringify(core.TIER_LIMITS.monthly) !== JSON.stringify([10, 30, 50, Infinity]) ||
  JSON.stringify(core.TIER_LIMITS.bimonthly) !== JSON.stringify([20, 60, 100, Infinity])
) {
  fail("core: TIER_LIMITS mismatch");
}
const expectedDiffs = {
  monthly: [0, 21000, 84000, 110250],
  bimonthly: [0, 42000, 168000, 220500],
};
if (canonical(core.TIER_PROGRESSIVE_DIFF_MILLI_NT) !== canonical(expectedDiffs)) {
  fail("core: TIER_PROGRESSIVE_DIFF_MILLI_NT mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入用水度數，或載入範例。", en: "Enter the usage, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
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
if (fixturesHash !== "121380896d9eb1fc76d1165c2f772b68388f7d0fffaca676074afa46506c94b7") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 19) {
  fail("test/fixtures.json: expected 19 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const typical = fixtures.cases.find((entry) => entry.id === "bimonthly-typical");
// Absent optional rates in a fixture input read as "" (SPEC inputsOutputs).
const typicalInput = { sewerRateNt: "", wasteRateNt: "", ...typical.input };
if (canonical(core.EXAMPLE) !== canonical(typicalInput)) {
  fail("core: EXAMPLE must equal the bimonthly-typical fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the example note, the rounding note and the levy labels.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "度數請用整數",
  "費率請用數字，整數或最多兩位小數",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter the usage as a whole number.",
  "Enter the rate as a number, with at most two decimal places.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "已載入範例，請按「計算水費」執行。",
  "Example loaded. Run “Calculate water bill” to compute it.",
  "明細以精確值計算，總額依官方規定四捨五入至元；內含營業稅只作資訊列，不另加收。",
  "Line items are computed from exact values; the total is rounded to the nearest yuan per the official rule. Business tax is an information row only and is never added.",
  "未計入",
  "Not included",
  "內含營業稅（已內含，不另加收）",
  "Business tax included (included; not added)",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, the pinned canonical and Open Graph
// tags, same-language home links, local assets, the pinned scope note,
// source note and FAQ answers.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "台灣水費試算｜Gloss Tools",
    description:
      "依台灣自來水公司現行水價表，以水表口徑與一期用水度數試算基本費、四段累進用水費與水源保育與回饋費，並可加計自填的污水下水道使用費與清除處理費。",
    h1: "台灣水費試算",
    canonical: "https://taiwan-water-bill.glossquote.com/",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "1 度＝1 立方公尺＝1,000 公升。",
    scope: "本工具僅適用台灣自來水公司用戶；臺北自來水事業處轄區費率不同。",
    source:
      "費率來源：台灣自來水公司《本公司目前水費及各項服務費收費標準》（水價自民國 86 年 5 月 1 日實施，含 5% 營業稅），2026-11-09 查閱。費率如經公告調整，本頁將隨之更新；實際金額以台水帳單為準。",
    faq: [
      "這是台水的費率嗎？北水一樣嗎？",
      "僅台水；臺北自來水事業處是另一套價表。",
      "「度」是什麼？",
      "1 度＝1 立方公尺＝1,000 公升。",
      "為什麼試算和帳單可能不同？",
      "污水與清除處理費率因縣市與是否接用下水道而異，未填寫者不在總額內；估表、特殊用水類別與月中異動未納入模型。",
      "水源保育與回饋費怎麼算？",
      "未稅用水費的 5%，只按用水費計算、不含基本費，四捨五入至元。",
    ],
    assets: ['href="./styles/taiwan-water-bill.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Taiwan Water Bill Calculator | Gloss Tools",
    description:
      "Estimate a Taiwan Water Corporation bill from meter diameter and one period's usage: basic charge, four-tier usage charge and the conservation levy, with optional self-entered sewer and waste rates.",
    h1: "Taiwan Water Bill Calculator",
    canonical: "https://taiwan-water-bill.glossquote.com/en/",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "One degree is 1 m³, i.e. 1,000 litres.",
    scope: "This calculator covers Taiwan Water Corporation customers only; Taipei Water Department rates differ.",
    source:
      "Rates: Taiwan Water Corporation, Current Water Rates and Service Charges (tariff in force since 1 May 1997, 5% business tax included), retrieved 9 Nov 2026. If the tariff is officially revised this page's table will be updated; your actual bill governs.",
    faq: [
      "Is this the Taipei tariff too?",
      "No — Taipei Water Department uses its own rate table.",
      "What is a “degree”?",
      "One degree is 1 m³, i.e. 1,000 litres.",
      "Why can my bill differ?",
      "Sewer and waste rates vary by municipality and sewer connection and are excluded unless entered; estimated readings, special user classes and mid-period changes are not modelled.",
      "How is the conservation levy computed?",
      "5% of the tax-excluded usage charge (the usage charge only, never the basic fee), rounded to the nearest yuan.",
    ],
    assets: ['href="../styles/taiwan-water-bill.css"', 'src="../js/app.js"'],
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
  // The pinned canonical / og:url are the only URLs in the page.
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 2) fail(`${page.path}: expected exactly 2 https URLs (canonical + og:url), found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.scope)) fail(`${page.path}: missing pinned scope note`);
  if (!html.includes(page.source)) fail(`${page.path}: missing pinned source note`);
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
  for (const id of ["status", "results", "total-value", "result-echo", "tiers-body", "breakdown-list", "rounding-note", "run-btn", "cancel-btn", "example-btn", "reset-btn", "download-btn"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/taiwan-water-bill.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "taiwan-water-bill-worker-"));
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
// or the controller. No shipped file may touch persistent storage: the
// SPEC forbids it for this tool.
for (const purePath of [
  "public/js/core/taiwan-water-bill.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/tariff tables/tier data/divisors/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity, no persistent storage",
);
