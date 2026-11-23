// Static project checks for the Grocery Budget Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, the two USDA tables, the size factors, the example equals
// the vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/
// storage/clock), syntax of every shipped script, the fixed worker-
// source concatenation, and a forbidden-capability scan. Exits
// non-zero on the first failure list. The vendored test/fixtures.json
// is a verbatim copy of the fixed spec's fixtures
// (spec-grocery-budget-calculator-20261121, spec candidate commit
// 354c16abacab2d9d935667f032f401834f8ccf9f, draft spec PR #379); the
// spec PR is not merged into this branch's base, so the check reads
// the vendored copy rather than a repo-level docs path.

import assert from "node:assert/strict";
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

function deepEqual(actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/grocery-budget.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/site.test.mjs",
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
// file does not match its own scan.
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

for (const path of REQUIRED_PATHS) {
  try {
    const info = await lstat(resolve(PROJECT_ROOT, path));
    if (!info.isFile()) fail(`Required path is not a file: ${path}`);
  } catch {
    fail(`Missing required path: ${path}`);
  }
}

// Package contract: Node >=24, ESM, exactly the expected scripts, and
// zero dependencies of any kind.
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

// Fixtures provenance: the vendored copy must be byte-identical to
// the fixed spec candidate's fixtures file.
const FIXTURES_SHA256 = "558e6d92bff162c49e04295d8e978e83b841f2d81f3a6ea8298c08cd936e9a4c";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, count range,
// household range, report filename/limit, the two pinned USDA
// tables (integer cents), the size factors, and the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/grocery-budget.mjs")).href
);
const EXPECTED_FIELDS = [
  "c1", "c2_3", "c4_5", "c6_8", "c9_11",
  "f12_13", "f14_19", "f20_50", "f51_70", "f71",
  "m12_13", "m14_19", "m20_50", "m51_70", "m71",
];
if (!deepEqual(core.FIELDS, EXPECTED_FIELDS)) fail("core: FIELDS order mismatch");
if (!deepEqual(core.ALL_FIELDS, ["plan", ...EXPECTED_FIELDS])) fail("core: ALL_FIELDS mismatch");
if (!deepEqual(core.PLANS, ["thrifty", "low-cost"])) fail("core: PLANS mismatch");
if (!deepEqual(core.DEFAULTS, {
  plan: "thrifty", c1: "0", c2_3: "0", c4_5: "0", c6_8: "0", c9_11: "0",
  f12_13: "0", f14_19: "0", f20_50: "1", f51_70: "0", f71: "0",
  m12_13: "0", m14_19: "0", m20_50: "1", m51_70: "0", m71: "0",
})) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.COUNT_MIN !== 0 || core.COUNT_MAX !== 10) fail("core: count range mismatch");
if (core.HOUSEHOLD_MIN !== 1 || core.HOUSEHOLD_MAX !== 20) fail("core: household range mismatch");
if (core.REPORT_FILENAME !== "grocery-budget-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_THRIFTY = {
  c1: 2640, c2_3: 3980, c4_5: 4350, c6_8: 4830, c9_11: 5580,
  f12_13: 5170, f14_19: 6010, f20_50: 5870, f51_70: 5460, f71: 6030,
  m12_13: 5970, m14_19: 7530, m20_50: 7370, m51_70: 6500, m71: 6200,
};
const EXPECTED_LOW_COST = {
  c1: 3830, c2_3: 4010, c4_5: 4140, c6_8: 6050, c9_11: 6260,
  f12_13: 6230, f14_19: 6260, f20_50: 6390, f51_70: 6220, f71: 6210,
  m12_13: 7320, m14_19: 7450, m20_50: 7350, m51_70: 6920, m71: 6840,
};
if (!deepEqual(core.THRIFTY_CENTS, EXPECTED_THRIFTY)) fail("core: THRIFTY_CENTS table mismatch");
if (!deepEqual(core.LOW_COST_CENTS, EXPECTED_LOW_COST)) fail("core: LOW_COST_CENTS table mismatch");
const EXPECTED_FACTORS = { 1: [6, 5], 2: [11, 10], 3: [21, 20], 4: [1, 1], 5: [19, 20], 6: [19, 20], 7: [9, 10], 20: [9, 10] };
for (const [size, factor] of Object.entries(EXPECTED_FACTORS)) {
  if (!deepEqual(core.sizeFactorFor(Number(size)), factor)) {
    fail(`core: sizeFactorFor(${size}) mismatch`);
  }
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-grocery-budget-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
// The reference family weekly total must equal USDA's published
// $236.50 exactly.
{
  const outcome = core.run(fixtures.cases[0].input);
  if (!outcome.ok || outcome.result.weeklyTotal !== 236.5) {
    fail("core: reference-family-thrifty weekly total must be 236.50");
  }
  if (!outcome.ok || outcome.result.monthlyTotal !== 1024.8) {
    fail("core: reference-family-thrifty monthly total must be 1024.80 (disclosed $0.20 gap)");
  }
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, the pinned
// FAQ answers, the draft-loss note, local assets, and the form
// control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "採買預算試算｜Gloss Tools",
    description:
      "輸入家中成員的年齡層，對照 USDA 食物計畫表，算出每週與每月的在家做飯預算。",
    h1: "採買預算試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼每月金額和 USDA 公布的不完全一樣？",
      "本工具的每月金額以公布的每週總額乘 4.333 算出；USDA 自己的每月金額以未捨入的每週費用算出，兩者可相差約 0.20 美元。",
      "包含外食嗎？",
      "不包含。食物計畫表假設全部餐點與點心都在家製備。",
      "為什麼一人戶每人反而比較貴？",
      "USDA 規定一人戶加 20%、二人戶加 10%，因為小家庭採買較無規模效益；七人以上減 10%。",
      "有 Moderate-cost 或 Liberal 計畫嗎？",
      "本工具只提供 Thrifty 與 Low-cost 兩種計畫。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Grocery Budget Calculator | Gloss Tools",
    description:
      "Enter your household by age group and price a weekly and monthly at-home food budget from the USDA food plans.",
    h1: "Grocery Budget Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why does the monthly total differ slightly from USDA's published figure?",
      "This tool multiplies the published rounded weekly total by 4.333; USDA's own monthly figures use unrounded weekly costs, so the two can differ by about $0.20.",
      "Does it include eating out?",
      "No. The food plans assume all meals and snacks are prepared at home.",
      "Why does a one-person household cost more per person?",
      "USDA adds 20% for one person and 10% for two, because small households get less bulk-buying benefit; households of seven or more get 10% off.",
      "Are Moderate-Cost or Liberal plans included?",
      "This tool offers only the Thrifty and Low-Cost plans.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-plan-thrifty", "field-plan-low-cost",
  ...EXPECTED_FIELDS.map((field) => `field-${field}`),
];
const ERROR_IDS = [
  "error-plan",
  ...EXPECTED_FIELDS.map((field) => `error-${field}`),
];
const REGION_IDS = ["household-total", "summary-rows", "breakdown-body"];
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
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of ERROR_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing error slot ${id}`);
  }
  for (const id of REGION_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing results region ${id}`);
  }
  for (const field of EXPECTED_FIELDS) {
    for (const part of ["step-down-", "step-up-", "help-"]) {
      if (!html.includes(`id="${part}${field}"`)) {
        fail(`${page.path}: missing ${part}${field}`);
      }
    }
  }
}

// Syntax-check every shipped script, and check the worker
// concatenation (core + handler) parses as one module.
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
  const coreSource = await readFile(
    resolve(PROJECT_ROOT, "public/js/core/grocery-budget.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "grocery-budget-calculator-worker-"));
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

// Forbidden-capability scan over the shipped sources and tests (this
// file itself is excluded: it assembles the tokens from fragments).
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

// Core purity: no DOM access and no clock in the pure modules or the
// controller. The core must be purely a function of its input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/grocery-budget.mjs",
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
{
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/grocery-budget.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/grocery-budget.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/grocery-budget.mjs: core must not reference Intl");
  }
  if (/\.toFixed\s*\(/.test(coreText)) {
    fail("public/js/core/grocery-budget.mjs: core must not call toFixed for money rounding");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/tables/factors/example, reference-family totals, pages, syntax, worker concatenation, capability scan, core purity",
);
