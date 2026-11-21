// Static project checks for the Baby Feeding Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, ranges, notices, status strings,
// the example equals the typical-4kg-8feeds fixture, the pinned bilingual
// strings in the app, bilingual metadata and the preview noindex / CSP
// rules), core purity (no DOM/network/storage), syntax of every shipped
// script, the fixed worker-source concatenation, and a forbidden-
// capability scan. Exits non-zero on the first failure list.

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
  "public/js/core/baby-feeding.mjs",
  "public/styles/baby-feeding.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/baby-feeding-core.test.mjs",
  "test/baby-feeding-controller.test.mjs",
  "test/baby-feeding-report.test.mjs",
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
// does not match its own scan. Persistent storage is deliberately in
// this list: the SPEC forbids persistent storage for this tool (the
// draft lives only on the page), so no shipped file may touch it. URL
// schemes are likewise in this list: the preview candidate carries no
// production canonical / Open Graph URLs, and the NHS source is cited
// as text, so no https URL may appear in the shipped sources.
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

// Core contract: field order, raw limits, defaults, ranges, report
// constants, notices and status strings, and the example must match the
// SPEC and fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/baby-feeding.mjs")).href
);
const expectedFields = ["weight", "factor", "feedsPerDay", "ageMonths"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { weight: 8, factor: 8, feedsPerDay: 8, ageMonths: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { weight: "", factor: "150", feedsPerDay: "8", ageMonths: "" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = { weight: "4", factor: "150", feedsPerDay: "8", ageMonths: "" };
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE mismatch");
}
if (core.WEIGHT_H_MIN !== 100 || core.WEIGHT_H_MAX !== 1500) {
  fail("core: weight range must be 100-1500 hundredths of a kg");
}
if (core.FACTOR_MIN !== 150 || core.FACTOR_MAX !== 200) {
  fail("core: factor range must be 150-200");
}
if (core.FEEDS_MIN !== 1 || core.FEEDS_MAX !== 24) {
  fail("core: feeds range must be 1-24");
}
if (core.AGE_MIN !== 0 || core.AGE_MAX !== 24) {
  fail("core: age range must be 0-24");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "baby-feeding-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedNotices = {
  "early-newborn-amounts-differ": {
    zh: "新生兒在出生後最初幾天需要的奶量小得多，指引的 150–200 ml 範圍是第一週結束後的用量。",
    en: "Newborns need much smaller amounts in the first few days; the 150–200 ml range applies from the end of the first week.",
  },
  "guideline-covers-to-about-6-months": {
    zh: "引用指引的適用期間到約 6 個月；開始副食品後奶量需求會改變，請諮詢兒科醫師。",
    en: "The cited guideline covers babies up to about 6 months old; once solids start, milk needs change — ask your paediatrician.",
  },
};
if (canonical(core.NOTICE_TEXT) !== canonical(expectedNotices)) {
  fail("core: NOTICE_TEXT mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入寶寶體重，或載入範例。", en: "Enter your baby's weight, or load the example." },
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
if (fixturesHash !== "55ab4683f0b4322ba1d5022928f8e77aad59cf52f4f8fcf2db0c7d02bc108acf") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (typeof fixtures !== "object" || fixtures === null || !Array.isArray(fixtures.cases)) {
  fail("test/fixtures.json: expected an object with a cases array");
} else {
  if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 16) {
    fail("test/fixtures.json: expected 16 core cases");
  }
  if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
    fail("test/fixtures.json: expected 3 controller cases");
  }
  const typical = fixtures.cases.find((entry) => entry.id === "typical-4kg-8feeds");
  if (canonical(core.EXAMPLE) !== canonical(typical.input)) {
    fail("core: EXAMPLE must equal the typical-4kg-8feeds fixture input");
  }
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the disclaimer, the guideline source, and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "體重請用數字（公斤），最多兩位小數",
  "係數請用整數",
  "餐數請用整數",
  "月齡請用整數",
  "體重需在 1–15 公斤之間",
  "係數需在 150–200 之間",
  "餐數需在 1–24 之間",
  "月齡需在 0–24 個月之間",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter the weight in kg, with at most two decimal places.",
  "Enter the factor as a whole number.",
  "Enter the number of feeds as a whole number.",
  "Enter the age as a whole number.",
  "Weight must be between 1 and 15 kg.",
  "The factor must be between 150 and 200.",
  "Feeds per day must be between 1 and 24.",
  "Age must be between 0 and 24 months.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "本工具僅依公開的一般餵食指引估算奶量，不是醫療建議，也不能取代醫師的診斷。每個寶寶需要的奶量都不同，請依寶寶的饑餓與飽足訊號餵食，並遵循您的兒科醫師、助產師或健康訪視員的個別建議。早產、低出生體重、正在生病或有健康狀況的寶寶，請完全依照醫療人員的指示餵食。",
  "This tool only estimates milk volume from a published general feeding guideline. It is not medical advice and does not replace a clinician's judgement. Every baby needs a different amount: feed in response to your baby's hunger and fullness cues, and follow the individual advice of your paediatrician, midwife or health visitor. For babies who are preterm, low birth weight, unwell or have a medical condition, follow your clinician's instructions exactly.",
  "指引來源：NHS 111 Wales《Infant formula: common questions》（頁面最後更新 2021-04-19，2026-11-09 查閱）：大多數寶寶在出生第一週結束後、到約 6 個月大之前，每天約需要每公斤體重 150 至 200 ml 的奶。本工具的預設值 150 是該範圍的下限，可在 150–200 間調整。",
  "Guideline source: NHS 111 Wales, 'Infant formula: common questions' (page last updated 19 Apr 2021; retrieved 9 Nov 2026): by the end of their first week, most babies need around 150 to 200 ml per kilo of their weight a day until they're 6 months old. This tool's default of 150 is the lower bound of that range; it can be adjusted between 150 and 200.",
  "已載入範例，請按「計算每日奶量」執行。",
  "Example loaded. Run “Calculate daily amount” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned FAQ answers, disclaimer and guideline source. The preview
// candidate carries no production canonical, hreflang, sitemap or
// https URLs (SPEC section 7; the planned origin is not configured).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "嬰兒奶量計算｜Gloss Tools",
    description:
      "依寶寶體重估算每日與每餐奶量：以 NHS 111 Wales 公布的每公斤每日 150–200 ml 指引為據（預設 150），每餐分配加總恰好等於每日總量。僅供一般參考，不是醫療建議。",
    h1: "嬰兒奶量計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: [
      "1–15 公斤，最多兩位小數。",
      "指引範圍 150–200，預設 150",
      "每日 1–24 餐的整數。",
      "月齡不影響計算結果",
    ],
    disclaimer:
      "本工具僅依公開的一般餵食指引估算奶量，不是醫療建議，也不能取代醫師的診斷。每個寶寶需要的奶量都不同，請依寶寶的饑餓與飽足訊號餵食，並遵循您的兒科醫師、助產師或健康訪視員的個別建議。早產、低出生體重、正在生病或有健康狀況的寶寶，請完全依照醫療人員的指示餵食。",
    source:
      "指引來源：NHS 111 Wales《Infant formula: common questions》（頁面最後更新 2021-04-19，2026-11-09 查閱）：大多數寶寶在出生第一週結束後、到約 6 個月大之前，每天約需要每公斤體重 150 至 200 ml 的奶。本工具的預設值 150 是該範圍的下限，可在 150–200 間調整。",
    faq: [
      "150 ml 這個數字是從哪裡來的？",
      "NHS 111 Wales 公布的範圍是每公斤每日 150–200 ml；本工具預設取範圍下限 150，可在範圍內調整。",
      "為什麼奶量不會依月齡改變？",
      "引用指引只給單一範圍（第一週結束後到約 6 個月）、未公布月齡對照表，所以月齡不調整係數，只用來顯示適用範圍提醒。",
      "每餐奶量加起來會等於每日總量嗎？",
      "會；除不盡的餘數以 1 ml 為單位依序分給最前面的幾餐，總和恰好相等。",
      "這算是醫療建議嗎？",
      "不是；這只是依公開指引的一般估算，請依寶寶的訊號與兒科醫師的個別建議餵食。",
    ],
    assets: ['href="./styles/baby-feeding.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Baby Feeding Calculator | Gloss Tools",
    description:
      "Estimate a baby's daily and per-feed milk volume from body weight, using the NHS 111 Wales guideline of 150–200 ml per kg per day (default 150), with per-feed amounts that sum exactly to the daily total. General information only — not medical advice.",
    h1: "Baby Feeding Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: [
      "1–15 kg, at most two decimal places.",
      "Guideline range 150–200, default 150",
      "A whole number from 1 to 24 feeds per day.",
      "Age does not change the result",
    ],
    disclaimer:
      "This tool only estimates milk volume from a published general feeding guideline. It is not medical advice and does not replace a clinician's judgement. Every baby needs a different amount: feed in response to your baby's hunger and fullness cues, and follow the individual advice of your paediatrician, midwife or health visitor. For babies who are preterm, low birth weight, unwell or have a medical condition, follow your clinician's instructions exactly.",
    source:
      "Guideline source: NHS 111 Wales, 'Infant formula: common questions' (page last updated 19 Apr 2021; retrieved 9 Nov 2026): by the end of their first week, most babies need around 150 to 200 ml per kilo of their weight a day until they're 6 months old. This tool's default of 150 is the lower bound of that range; it can be adjusted between 150 and 200.",
    faq: [
      "Where does the 150 ml figure come from?",
      "NHS 111 Wales publishes a range of 150–200 ml per kg per day; this tool defaults to the lower bound, 150, adjustable within the range.",
      "Why doesn't the amount change with age?",
      "The cited guideline gives a single range (end of the first week to about 6 months) with no age table, so age never adjusts the factor; it only controls reminder notices.",
      "Do the per-feed amounts add up to the daily total?",
      "Yes; any remainder is distributed 1 ml at a time to the earliest feeds, so they sum exactly.",
      "Is this medical advice?",
      "No; it is a general estimate from a published guideline — follow your baby's cues and your paediatrician's individual advice.",
    ],
    assets: ['href="../styles/baby-feeding.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: no production canonical in preview`);
  if (html.includes("hreflang")) fail(`${page.path}: no hreflang in preview`);
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected no https URLs in preview, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  for (const text of page.help) {
    if (!html.includes(text)) fail(`${page.path}: missing pinned help line: ${text}`);
  }
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned disclaimer`);
  if (!html.includes(page.source)) fail(`${page.path}: missing pinned guideline source`);
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
    "total-value",
    "average-value",
    "result-echo",
    "result-age",
    "result-notices",
    "feed-list",
    "disclaimer",
    "source",
    "run-btn",
    "example-btn",
    "reset-btn",
    "cancel-btn",
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/baby-feeding.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "baby-feeding-calculator-worker-"));
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
// or the controller. No shipped file may touch persistent storage at
// all for this tool (SPEC forbids it).
for (const purePath of [
  "public/js/core/baby-feeding.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (purePath === "public/js/app.js" && (token === "document" || token === "window")) continue;
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
  "Check passed: files, package contract, core fields/limits/defaults/ranges/notices/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
