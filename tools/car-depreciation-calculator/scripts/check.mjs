// Static project checks for the Car Depreciation Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, example equals the first
// fixture case applied over the defaults, the vendored fixtures.json
// SHA-256, the pinned bilingual error messages in the app, bilingual
// metadata and the candidate noindex/no-canonical rules), core purity (no
// DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
  "public/js/core/car-depreciation.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
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

// SHA-256 of the spec candidate's fixtures.json, as vendored byte-identical
// into test/fixtures.json (see VERIFICATION.md).
const EXPECTED_FIXTURES_SHA256 =
  "524c6c91aac13f7318221b73d7cacb41d650fa5e2020fd7df9133b5fe09260df";

// Forbidden runtime capabilities, assembled from fragments so this file
// does not match its own scan.
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
  ["http", "://"],
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

// Core contract: field order, raw limits, defaults, report constants, and
// the example must match the SPEC and fixtures.json case 1 applied over
// the defaults exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/car-depreciation.mjs")).href
);
const expectedFields = ["method", "price", "years", "salvagePercent", "rate", "usefulLife", "tableRates"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  method: 9,
  price: 9,
  years: 2,
  salvagePercent: 5,
  rate: 5,
  usefulLife: 2,
  tableRates: 256,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  method: "declining",
  price: "880000",
  years: "5",
  salvagePercent: "10",
  rate: "15",
  usefulLife: "10",
  tableRates: "20\n18\n15\n12\n10\n8\n8\n6\n6\n5",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "car-depreciation-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (SHA-256 pinned above and in VERIFICATION.md).
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
const fixturesHash = createHash("sha256").update(fixturesBytes).digest("hex");
if (fixturesHash !== EXPECTED_FIXTURES_SHA256) {
  fail("test/fixtures.json: SHA-256 does not match the spec candidate's fixtures.json");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.slug !== "car-depreciation-calculator" || fixtures.specId !== "spec-car-depreciation-calculator-20261109") {
  fail("test/fixtures.json: not the car-depreciation-calculator spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical({ ...expectedDefaults, ...fixtures.cases[0].input })) {
  fail("core: EXAMPLE must equal defaults plus fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the SPEC-pinned error messages verbatim, both
// languages, plus the pinned flow-state strings.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇計算方式",
  "請輸入整數",
  "請輸入數字，最多兩位小數",
  "費率表最多 30 行",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a calculation method.",
  "Enter a whole number.",
  "Enter a number with at most two decimal places.",
  "The rate table has at most 30 rows.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "已載入範例，請按「計算折舊」執行。",
  "Example loaded. Run “Calculate depreciation” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the pinned
// disclosures and FAQ answers, and the draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "車輛折舊計算｜Gloss Tools",
    description:
      "輸入購入價、年數與殘值下限，用定率遞減、直線法或逐年費率表估算目前車價與逐年折舊；估算僅供規劃參考，不是正式鑑價。",
    h1: "車輛折舊計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    disclosure:
      "本工具的估算僅供規劃參考，不是正式鑑價；車輛實際市場價值受車況、里程、事故紀錄、市場供需與地區影響，請以專業鑑價或實際成交行情為準。",
    tableDisclosure:
      "預設逐年折舊率表（第 1–10 年：20%、18%、15%、12%、10%、8%、8%、6%、6%、5%）是常見的二手車經驗法則示意值，不是官方或鑑價機構的估值標準。",
    faq: [
      "估值等於行情嗎？",
      "不等於；估算只用購入價與年數，實際市值受車況、里程與市場供需影響，請以專業鑑價或實際成交行情為準。",
      "為什麼後幾年折舊變成 0？",
      "估值已達你設定的殘值下限，本工具不會讓估值低於下限。",
      "費率表的費率用完了怎麼辦？",
      "年數比費率行數多時，最後一年的費率會重複套用到其餘年份。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Car Depreciation Calculator | Gloss Tools",
    description:
      "Estimate a car's current value and year-by-year depreciation from its purchase price, age and a salvage floor, using declining balance, straight line, or a year-by-year rate table. Estimates are for planning only, not a formal appraisal.",
    h1: "Car Depreciation Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    disclosure:
      "Estimates from this tool are for planning only and are not a formal appraisal. A vehicle's actual market value depends on its condition, mileage, accident history, market supply and demand, and region; rely on a professional appraisal or actual transaction prices.",
    tableDisclosure:
      "The default year-by-year rate table (years 1–10: 20%, 18%, 15%, 12%, 10%, 8%, 8%, 6%, 6%, 5%) is an illustrative common used-car rule of thumb, not an official or appraisal-industry valuation standard.",
    faq: [
      "Is the estimate the market price?",
      "No. The estimate uses only purchase price and age; actual market value depends on condition, mileage and supply and demand — rely on a professional appraisal or actual transaction prices.",
      "Why does depreciation become 0 in later years?",
      "The value has reached the salvage floor you set; this tool never values the car below that floor.",
      "What happens when the rate table runs out?",
      "When there are more years than rate rows, the last row's rate repeats for the remaining years.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang must be ${page.lang}`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.path}: missing preview noindex`);
  if (html.includes("canonical")) fail(`${page.path}: candidate must not carry a canonical link`);
  if (html.includes("hreflang")) fail(`${page.path}: candidate must not carry hreflang`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: title mismatch`);
  if (!html.includes(`<meta name="description" content="${page.description}">`)) {
    fail(`${page.path}: description mismatch`);
  }
  if (!html.includes(`<h1>${page.h1}</h1>`)) fail(`${page.path}: h1 mismatch`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  if (!html.includes(page.disclosure)) fail(`${page.path}: missing pinned valuation disclosure`);
  if (!html.includes(page.tableDisclosure)) fail(`${page.path}: missing pinned table disclosure`);
  if (!html.includes("20\n18\n15\n12\n10\n8\n8\n6\n6\n5")) {
    fail(`${page.path}: missing default rate table`);
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
  for (const method of ["declining", "straight", "table"]) {
    if (!html.includes(`id="method-fields-${method}"`)) {
      fail(`${page.path}: missing method section method-fields-${method}`);
    }
    if (!html.includes(`value="${method}"`)) fail(`${page.path}: missing method option ${method}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/car-depreciation.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "car-depreciation-calculator-worker-"));
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

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/car-depreciation.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/example, fixtures SHA-256, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
