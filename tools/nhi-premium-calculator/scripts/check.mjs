// Static project checks for the NHI Premium Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, formula constants, the full 58-grade
// table and the appendix premium table, the example equals the first
// fixture case, the pinned bilingual strings in the app, bilingual
// metadata and the candidate canonical / noindex / CSP rules), core purity
// (no DOM/network/storage — the SPEC forbids persistent storage), syntax
// of every shipped script, the fixed worker-source concatenation, and a
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
  "public/js/core/nhi-premium.mjs",
  "public/styles/nhi-premium.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/nhi-premium-core.test.mjs",
  "test/nhi-premium-controller.test.mjs",
  "test/nhi-premium-report.test.mjs",
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
// this list: the SPEC forbids persistent storage for this tool, and no
// shipped file may touch it.
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

// Core contract: field order, raw limits, defaults, formula constants,
// the full 58-grade table, the appendix premium table, report constants,
// and the example must match the SPEC and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/nhi-premium.mjs")).href);
const expectedFields = ["monthlySalary", "dependents"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { monthlySalary: 8, dependents: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { monthlySalary: "45000", dependents: "0" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = { monthlySalary: "29500", dependents: "0" };
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE must equal the first fixture case (floor-grade-no-dependents)");
}
if (core.RATE_NUMERATOR !== 517 || core.RATE_DENOMINATOR !== 10000) {
  fail("core: premium rate must be 517/10000 (5.17%)");
}
if (
  core.SELF_SHARE_NUMERATOR !== 30 ||
  core.EMPLOYER_SHARE_NUMERATOR !== 60 ||
  core.GOVERNMENT_SHARE_NUMERATOR !== 10 ||
  core.SHARE_DENOMINATOR !== 100
) {
  fail("core: burden shares must be 30/60/10");
}
if (core.AVG_DEPENDENTS_NUMERATOR !== 156 || core.AVG_DEPENDENTS_DENOMINATOR !== 100) {
  fail("core: average-dependents factor must be 156/100 (1.56 persons)");
}
if (core.DEPENDENTS_CAP !== 3) fail("core: DEPENDENTS_CAP must be 3");
if (core.SALARY_MIN !== 1 || core.SALARY_MAX !== 99999999) {
  fail("core: salary range must be 1-99999999");
}
if (core.DEPENDENTS_MIN !== 0 || core.DEPENDENTS_MAX !== 99) {
  fail("core: dependents range must be 0-99");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "nhi-premium-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedGrades = [
  29500, 30300, 31800, 33300, 34800, 36300, 38200, 40100, 42000, 43900,
  45800, 48200, 50600, 53000, 55400, 57800, 60800, 63800, 66800, 69800,
  72800, 76500, 80200, 83900, 87600, 92100, 96600, 101100, 105600, 110100,
  115500, 120900, 126300, 131700, 137100, 142500, 147900, 150000, 156400,
  162800, 169200, 175600, 182000, 189500, 197000, 204500, 212000, 219500,
  228200, 236900, 245600, 254300, 263000, 273000, 283000, 293000, 303000,
  313000,
];
if (canonical(core.GRADE_AMOUNTS) !== canonical(expectedGrades)) {
  fail("core: GRADE_AMOUNTS table differs from SPEC section 3");
}
const expectedAppendix = [
  [458, 1428, 238], [470, 1466, 244], [493, 1539, 256], [516, 1611, 269],
  [540, 1684, 281], [563, 1757, 293], [592, 1849, 308], [622, 1940, 323],
  [651, 2032, 339], [681, 2124, 354], [710, 2216, 369], [748, 2332, 389],
  [785, 2449, 408], [822, 2565, 427], [859, 2681, 447], [896, 2797, 466],
  [943, 2942, 490], [990, 3087, 515], [1036, 3233, 539], [1083, 3378, 563],
  [1129, 3523, 587], [1187, 3702, 617], [1244, 3881, 647], [1301, 4060, 677],
  [1359, 4239, 707], [1428, 4457, 743], [1498, 4675, 779], [1568, 4892, 815],
  [1638, 5110, 852], [1708, 5328, 888], [1791, 5589, 932], [1875, 5850, 975],
  [1959, 6112, 1019], [2043, 6373, 1062], [2126, 6634, 1106], [2210, 6896, 1149],
  [2294, 7157, 1193], [2327, 7259, 1210], [2426, 7568, 1261], [2525, 7878, 1313],
  [2624, 8188, 1365], [2724, 8497, 1416], [2823, 8807, 1468], [2939, 9170, 1528],
  [3055, 9533, 1589], [3172, 9896, 1649], [3288, 10259, 1710], [3404, 10622, 1770],
  [3539, 11043, 1840], [3674, 11464, 1911], [3809, 11885, 1981], [3944, 12306, 2051],
  [4079, 12727, 2121], [4234, 13211, 2202], [4389, 13695, 2282], [4544, 14179, 2363],
  [4700, 14663, 2444], [4855, 15146, 2524],
];
if (canonical(core.APPENDIX_PREMIUMS) !== canonical(expectedAppendix)) {
  fail("core: APPENDIX_PREMIUMS table differs from SPEC section 3 appendix");
}
const expectedStatus = {
  empty: { zh: "準備就緒", en: "Ready" },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "試算完成", en: "Calculation complete" },
  error: { zh: "無法試算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
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
if (fixturesHash !== "567c04562f0a8ddd9ad0ed273c802f2e293ef93c8c37b6c12c370a70a266eabc") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.schemaVersion !== 1) fail("test/fixtures.json: schemaVersion must be 1");
if (fixtures.slug !== "nhi-premium-calculator") fail("test/fixtures.json: slug mismatch");
if (fixtures.specId !== "spec-nhi-premium-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const firstCase = fixtures.cases.find((entry) => entry.id === "floor-grade-no-dependents");
if (canonical(core.EXAMPLE) !== canonical(firstCase.input)) {
  fail("core: EXAMPLE must equal the floor-grade-no-dependents fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the cap notice, the estimate disclaimer and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請用整數",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "月薪請用整數（新臺幣元），不可含小數或符號",
  "眷屬人數請用整數",
  "⚠ 眷屬超過 3 人，以 3 人計",
  "依健保署 115 年 1 月 1 日生效公告表試算，僅供估算。",
  "已載入範例，請按「試算健保費」執行。",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter a whole number.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "Enter the salary as a whole number of NTD, with no decimals or symbols.",
  "Enter the number of dependents as a whole number.",
  "⚠ Only the first 3 dependents are charged.",
  "Estimated from NHIA tables effective January 1, 2026.",
  "Example loaded. Run “Calculate NHI premium” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}
if (appSource.includes("localStorage")) fail("public/js/app.js: localStorage must not be used");
if (appSource.includes("sessionStorage")) fail("public/js/app.js: sessionStorage must not be used");

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, the pinned canonical and Open Graph
// tags, same-language home links, local assets, the pinned FAQ answers,
// version note and estimate disclaimer.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "健保費試算｜Gloss Tools",
    description:
      "以健保署 115 年投保金額分級表與保險費負擔金額表，試算第一類受僱者的投保級距、本人與眷屬保費、投保單位與政府負擔。",
    h1: "健保費試算",
    canonical: "https://nhi-premium.glossquote.com/",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "整數，1–99,999,999 元，不可含小數、符號或空白。",
    versionNote:
      "參數版本：健保署 115 年 1 月 1 日生效公告版（費率 5.17%、平均眷口數 0.56、眷屬最多計 3 口）。",
    disclaimer:
      "依健保署 115 年 1 月 1 日生效公告表試算，僅供估算。",
    faq: [
      "眷屬超過 3 人怎麼算？",
      "依全民健康保險法第 18 條，眷屬保費由被保險人繳納，超過 3 口以 3 口計。",
      "公司負擔為什麼和我的眷屬人數無關？",
      "投保單位與政府依公告平均眷口數 0.56 人計算（合計 1.56 人份），不隨個人實際眷屬數變動。",
      "有算二代健保補充保費嗎？",
      "沒有。本工具只試算一般保險費；獎金等補充保費不在範圍。",
      "這是健保署核定的金額嗎？",
      "本工具依健保署 115 年 1 月 1 日生效的公告表試算，僅供估算；投保金額申報、部分工時與月中加退保等情形以健保署核定為準。",
    ],
    assets: ['href="./styles/nhi-premium.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "NHI Premium Calculator | Gloss Tools",
    description:
      "Estimate a Category 1 employee's Taiwan NHI payroll bracket and the monthly premiums for the insured, dependents, employer and government, from the NHIA tables effective January 1, 2026.",
    h1: "NHI Premium Calculator",
    canonical: "https://nhi-premium.glossquote.com/en/",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "A whole number, 1–99,999,999 NTD, with no decimals, symbols or spaces.",
    versionNote:
      "Parameters: NHIA tables effective January 1, 2026 (premium rate 5.17%, average dependents 0.56, at most 3 dependents charged).",
    disclaimer:
      "Estimated from NHIA tables effective January 1, 2026.",
    faq: [
      "What if I have more than three dependents?",
      "Under Article 18 of the National Health Insurance Act, dependents beyond the first three are not charged.",
      "Why doesn't the employer's share depend on my dependents?",
      "The employer and government shares use the announced average of 0.56 dependents (1.56 persons in total), not your actual number of dependents.",
      "Does this include the supplementary premium?",
      "No. This tool estimates the regular premium only; the second-generation supplementary premium on bonuses and other income is out of scope.",
      "Is this the amount the NHIA will bill?",
      "It is an estimate from the NHIA tables effective January 1, 2026. Reported salary basis, part-time work and mid-month enrollment changes follow the NHIA's own determination.",
    ],
    assets: ['href="../styles/nhi-premium.css"', 'src="../js/app.js"'],
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
  if (!html.includes(page.versionNote)) fail(`${page.path}: missing pinned version note`);
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned estimate disclaimer`);
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
  for (const id of ["status", "results", "grade-value", "insured-amount-value", "employee-total-value", "self-premium-value", "dependent-premium-value", "dependents-charged-value", "employer-premium-value", "government-premium-value", "cap-notice", "disclaimer", "run-btn", "example-btn", "reset-btn", "cancel-btn", "download-btn"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/nhi-premium.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "nhi-premium-calculator-worker-"));
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
// or the controller. The SPEC forbids persistent storage for this tool,
// so no shipped file may reference it at all.
for (const purePath of [
  "public/js/core/nhi-premium.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/constants/grades/appendix/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
