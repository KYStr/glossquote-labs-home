// Static project checks for the Life Insurance Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, the needs-approach formula constants, example equals the
// vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// disclaimer, and the candidate noindex / no-canonical rules), core
// purity (no DOM/network/storage/clock), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures
// (spec-life-insurance-calculator-20261121, spec candidate commit
// 5b7ffce437d5f3dc16f2d75b3a0d03e2c5d0a8d9, draft spec PR #401); the
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
  "public/js/core/life-insurance.mjs",
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
const FIXTURES_SHA256 = "59a18a7ba9ec28d89c8c96cde1bfaf9256199605d2a9aaff1f093d8b9a7ba811";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, report
// filename/limit, money formatting, and the example must match the
// SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/life-insurance.mjs")).href
);
const EXPECTED_FIELDS = [
  "annualIncome",
  "supportYears",
  "dependents",
  "educationPerChild",
  "mortgageBalance",
  "otherDebts",
  "finalExpenses",
  "existingCoverage",
  "liquidAssets",
];
if (!deepEqual(core.FIELDS, EXPECTED_FIELDS)) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.DEFAULTS, {
    annualIncome: "1200000",
    supportYears: "10",
    dependents: "2",
    educationPerChild: "500000",
    mortgageBalance: "3000000",
    otherDebts: "200000",
    finalExpenses: "350000",
    existingCoverage: "1000000",
    liquidAssets: "500000",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
const EXPECTED_RANGES = {
  annualIncome: [0, 99999999],
  supportYears: [0, 40],
  dependents: [0, 10],
  educationPerChild: [0, 9999999],
  mortgageBalance: [0, 99999999],
  otherDebts: [0, 99999999],
  finalExpenses: [0, 9999999],
  existingCoverage: [0, 99999999],
  liquidAssets: [0, 99999999],
};
if (!deepEqual(core.RANGES, EXPECTED_RANGES)) fail("core: RANGES mismatch");
if (core.REPORT_FILENAME !== "life-insurance-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (core.formatMoney(15050000) !== "15,050,000") fail("core: formatMoney grouping mismatch");
if (core.formatMoney(-2550000) !== "-2,550,000") fail("core: formatMoney negative mismatch");
if (core.formatMoney(0) !== "0") fail("core: formatMoney zero mismatch");
if (
  core.DISCLAIMER_ZH !==
  "本工具僅供教育試算參考，不構成保險建議、招攬或商品推薦。實際保額請諮詢合格保險業務員或理財顧問，並以保單條款為準。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool is an educational estimate only. It is not insurance advice, a solicitation, or a product recommendation. Consult a licensed insurance professional for advice on your own situation."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-life-insurance-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具僅供教育試算參考，不構成保險建議、招攬或商品推薦。實際保額請諮詢合格保險業務員或理財顧問，並以保單條款為準。";
const DISCLAIMER_EN =
  "This tool is an educational estimate only. It is not insurance advice, a solicitation, or a product recommendation. Consult a licensed insurance professional for advice on your own situation.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "壽險保額試算｜Gloss Tools",
    description:
      "以需求法試算家人需要的壽險保額：加總收入替代、房貸、負債、喪葬與教育費用，再扣掉現有保障與資產，並以 10 倍年收入法則對照。僅供教育參考，不構成保險建議。",
    h1: "壽險保額試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "10 倍年收入法則和需求法有什麼不同？",
      "10 倍法則只用年收入乘 10，是快速對照；需求法按你家的負債、房貸、教育與既有保障逐項加總扣抵，建議保額以需求法為準。",
      "為什麼建議保額可能是 0？",
      "現有保障加可動用資產已大於或等於需求總額時，缺口為零，狀態顯示已足夠。",
      "扶養年數怎麼選？",
      "通常是收入需要被替代的年數，例如到最年幼的扶養人成年或完成學業為止；常見參考為 10 年，本工具允許 0–40 年。",
      "試算有考慮通膨或投資報酬嗎？",
      "沒有。各項以名目金額直接相加，不做折現或複利，這是刻意的簡化；實際規劃請諮詢專業人士。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Life Insurance Calculator | Gloss Tools",
    description:
      "Estimate the life insurance coverage your family needs with the needs approach: add income replacement, mortgage, debts, final expenses and education costs, then subtract existing coverage and assets, with a 10× income benchmark for comparison. Educational estimate only, not insurance advice.",
    h1: "Life Insurance Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How do the 10× income rule and the needs approach differ?",
      "The 10× rule multiplies annual income by 10 as a quick benchmark; the needs approach adds up your debts, mortgage, education and final expenses, then subtracts existing coverage and assets. The recommended coverage follows the needs approach.",
      "Why can the recommended coverage be zero?",
      "When existing coverage plus liquid assets already meet or exceed the total need, there is no shortfall and the status shows covered.",
      "How do I choose the support years?",
      "Usually the number of years the income would need replacing, for example until the youngest dependent reaches adulthood or finishes education; 10 years is a common reference and this tool allows 0–40 years.",
      "Does the estimate account for inflation or investment returns?",
      "No. Items are added at face value with no discounting or compounding, as a deliberate simplification; consult a professional for actual planning.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = EXPECTED_FIELDS.map((field) => `field-${field}`);
const ERROR_IDS = EXPECTED_FIELDS.map((field) => `error-${field}`);
const REGION_IDS = ["summary-rows", "breakdown-rows"];
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
  if (!html.includes(DISCLAIMER_ZH)) fail(`${page.path}: missing disclaimer (zh)`);
  if (!html.includes(DISCLAIMER_EN)) fail(`${page.path}: missing disclaimer (en)`);
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
    resolve(PROJECT_ROOT, "public/js/core/life-insurance.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "life-insurance-checker-worker-"));
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
// controller. The core must be purely a function of its nine input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/life-insurance.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/life-insurance.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/life-insurance.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/life-insurance.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/example, pages, syntax, worker concatenation, capability scan, core purity",
);
