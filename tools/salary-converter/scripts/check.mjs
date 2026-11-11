// Static project checks for the Salary Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, example equals fixtures.json case 1,
// the pinned bilingual error messages in the app, bilingual metadata and
// the candidate noindex/no-canonical rules, the pinned convention and
// rounding disclosures and FAQ on both pages), core purity (no
// DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list.

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
  "public/js/core/salary.mjs",
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

// Core contract: field order, bases, raw limits, defaults, report
// constants, and the example must match the SPEC and fixtures.json case 1
// exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/salary.mjs")).href);
const expectedFields = ["sourceBasis", "amount", "bonusMonths"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedBases = ["monthly", "daily", "hourly", "annual"];
if (JSON.stringify(core.BASES) !== JSON.stringify(expectedBases)) {
  fail("core: BASES order mismatch");
}
const expectedRawLimits = { sourceBasis: 7, amount: 12, bonusMonths: 4 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { sourceBasis: "monthly", amount: "40000", bonusMonths: "1" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "salary-converter-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "salary-converter" || fixtures.specId !== "spec-salary-converter-20261109") {
  fail("test/fixtures.json: not the salary-converter spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the SPEC-pinned error messages verbatim, both
// languages, plus the pinned flow-state strings and result labels.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確。",
  "輸入太長。",
  "輸入含有不完整的字元。",
  "此欄必填。",
  "請選擇有效的計算基準。",
  "數字格式不正確。",
  "數值超出允許範圍。",
  "處理失敗，請重試。",
  "報告太大，無法下載。",
  "The input shape is invalid.",
  "The input is too long.",
  "The input contains an unpaired surrogate.",
  "This field is required.",
  "Choose a valid salary basis.",
  "Invalid number format.",
  "The value is outside the allowed range.",
  "Processing failed. Try again.",
  "The report is too large to download.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "年薪（不含獎金）",
  "年薪（含獎金）",
  "Annual salary (excl. bonus)",
  "Annual salary (incl. bonus)",
  "Monthly salary",
  "Daily pay",
  "Hourly pay",
  "Year-end bonus",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// pinned convention/rounding disclosures, the pinned FAQ answers, and the
// draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "薪資換算｜Gloss Tools",
    description: "輸入月薪、日薪、時薪或年薪任一種金額，依台灣常見慣例一次換算全部：日薪為月薪 ÷ 30、時薪為月薪 ÷ 240，年薪含年終獎金月數。",
    h1: "薪資換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    disclosures: [
      "換算慣例：日薪 = 月薪 ÷ 30、時薪 = 月薪 ÷ 240（每月 30 天 × 每日 8 小時）、年薪 = 月薪 ×（12 ＋ 年終獎金月數）。這些是台灣常見的薪資換算慣例，不是勞動基準法的定義；實際金額以勞動契約與公司規定為準。",
      "每個金額都由未捨入的月薪一次換算，再四捨五入到整數元；因此時薪 × 240 不一定等於顯示的月薪，年薪（含獎金）與年薪（不含獎金）＋獎金之間也可能差 1 元。",
    ],
    faq: [
      "為什麼時薪是月薪除以 240？",
      "慣例以每月 30 天、每日 8 小時計算，30 × 8 = 240。勞基法實務計算平日每小時工資額時也常用同一基礎，但本工具只做金額換算，不判斷加班費或法定義務。",
      "年終獎金月數可以輸入小數嗎？",
      "可以，最多一位小數，例如 1.5 個月，範圍 0 到 24 個月。獎金金額 = 月薪 × 月數，年薪（含獎金）= 月薪 ×（12 ＋ 月數）。",
      "用年薪反推時，為什麼各金額兜不回年薪？",
      "月薪 = 年薪 ÷（12 ＋ 年終獎金月數）通常不是整數。每個顯示金額都由未捨入的月薪分別換算並四捨五入，所以彼此可能差 1 元；年薪（含獎金）本身由未捨入月薪直接乘回，與輸入年薪在捨入後一致。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Salary Converter | Gloss Tools",
    description:
      "Enter pay as a monthly, daily, hourly or annual amount and convert to all four at once under common Taiwan conventions: daily is monthly ÷ 30, hourly is monthly ÷ 240, and annual includes year-end bonus months.",
    h1: "Salary Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    disclosures: [
      "Conventions: daily pay = monthly ÷ 30; hourly pay = monthly ÷ 240 (30 days × 8 hours a day); annual pay = monthly × (12 + year-end bonus months). These are common Taiwan payroll conventions, not definitions under the Labor Standards Act; your employment contract and company rules govern the actual amounts.",
      "Each amount is converted in one step from the unrounded monthly figure and rounded half-up to whole NT$. Hourly × 240 may therefore differ from the displayed monthly amount, and the displayed annual total may differ by NT$1 from the displayed base annual plus bonus.",
    ],
    faq: [
      "Why is hourly pay the monthly salary divided by 240?",
      "The convention assumes 30 days a month at 8 hours a day, and 30 × 8 = 240. The same basis is commonly used in practice for the regular hourly wage rate under the Labor Standards Act, but this tool only converts amounts; it does not determine overtime pay or legal obligations.",
      "Can the bonus be a fraction of a month?",
      "Yes, up to one decimal place, for example 1.5 months, within 0 to 24 months. The bonus amount is monthly × months, and the annual total is monthly × (12 + months).",
      "Why don't the amounts reconcile exactly when converting from an annual salary?",
      "Monthly = annual ÷ (12 + bonus months) is usually not a whole number. Each displayed amount is converted separately from that unrounded monthly figure and rounded, so figures may differ by NT$1; the annual total itself is multiplied back from the unrounded monthly figure and matches the entered annual amount after rounding.",
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
  for (const text of page.disclosures) {
    if (!html.includes(text)) fail(`${page.path}: missing pinned disclosure: ${text}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of ["field-amount", "field-bonusMonths", "error-sourceBasis", "error-amount", "error-bonusMonths"]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id ${id}`);
  }
  for (const basis of expectedBases) {
    if (!html.includes(`id="field-sourceBasis-${basis}"`)) {
      fail(`${page.path}: missing basis radio field-sourceBasis-${basis}`);
    }
  }
  if (!html.includes('name="sourceBasis"')) fail(`${page.path}: missing sourceBasis radio group`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/salary.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "salary-converter-worker-"));
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
  "public/js/core/salary.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
