// Static project checks for the Home Affordability Calculator:
// required files, package contract, the SPEC-pinned rules that can
// be checked statically (field order, defaults, ranges, report
// filename and limit, the pinned disclaimer, and the example equals
// the vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// disclaimer, and the candidate noindex / no-canonical rules), core
// purity (no DOM/network/storage/clock), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures (spec-home-affordability-calculator-20261121,
// spec candidate commit d0a79715f63df1ad1c9050a8642d8dad382fa7b8,
// draft spec PR #381); the spec PR is not merged into this branch's
// base, so the check reads the vendored copy rather than a repo-level
// docs path.

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
  "public/js/core/home-affordability.mjs",
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
const FIXTURES_SHA256 = "f1ac0788edabcdc3146863509b193d41e9d3de8803f236d67d6b634362ac058e";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, report
// filename/limit, the pinned disclaimer, and the example must match
// the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/home-affordability.mjs")).href
);
if (
  !deepEqual(core.FIELDS, [
    "annualIncome",
    "downPayment",
    "mortgageRate",
    "years",
    "otherDebts",
    "frontEndCapPct",
    "backEndCapPct",
  ])
) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    annualIncome: "1200000",
    downPayment: "2000000",
    mortgageRate: "2",
    years: "30",
    otherDebts: "0",
    frontEndCapPct: "28",
    backEndCapPct: "36",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (core.ANNUAL_INCOME_MIN !== 1) fail("core: ANNUAL_INCOME_MIN mismatch");
if (core.ANNUAL_INCOME_MAX !== 1000000000) fail("core: ANNUAL_INCOME_MAX mismatch");
if (core.DOWN_PAYMENT_MIN !== 0) fail("core: DOWN_PAYMENT_MIN mismatch");
if (core.DOWN_PAYMENT_MAX !== 1000000000) fail("core: DOWN_PAYMENT_MAX mismatch");
if (core.YEARS_MIN !== 1) fail("core: YEARS_MIN mismatch");
if (core.YEARS_MAX !== 40) fail("core: YEARS_MAX mismatch");
if (core.OTHER_DEBTS_MIN !== 0) fail("core: OTHER_DEBTS_MIN mismatch");
if (core.OTHER_DEBTS_MAX !== 1000000) fail("core: OTHER_DEBTS_MAX mismatch");
if (core.MORTGAGE_RATE_MIN !== 0) fail("core: MORTGAGE_RATE_MIN mismatch");
if (core.MORTGAGE_RATE_MAX !== 30) fail("core: MORTGAGE_RATE_MAX mismatch");
if (core.MORTGAGE_RATE_MAX_DECIMALS !== 4) fail("core: MORTGAGE_RATE_MAX_DECIMALS mismatch");
if (core.FRONT_END_CAP_MIN !== 10) fail("core: FRONT_END_CAP_MIN mismatch");
if (core.FRONT_END_CAP_MAX !== 50) fail("core: FRONT_END_CAP_MAX mismatch");
if (core.FRONT_END_CAP_MAX_DECIMALS !== 2) fail("core: FRONT_END_CAP_MAX_DECIMALS mismatch");
if (core.BACK_END_CAP_MIN !== 20) fail("core: BACK_END_CAP_MIN mismatch");
if (core.BACK_END_CAP_MAX !== 60) fail("core: BACK_END_CAP_MAX mismatch");
if (core.BACK_END_CAP_MAX_DECIMALS !== 2) fail("core: BACK_END_CAP_MAX_DECIMALS mismatch");
if (core.REPORT_FILENAME !== "home-affordability-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  core.DISCLAIMER_ZH !==
  "本工具僅依你輸入的假設與 28/36 負擔比率試算；月付只計房貸本金加利息，不含稅金、保險、管理費與房貸成數限制，不是財務建議、銀行報價或核貸保證。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool estimates only from the assumptions you enter and the 28/36 debt-to-income guideline. The monthly payment counts mortgage principal and interest only, excluding taxes, insurance, management fees and loan-to-value limits, and is not financial advice, a bank quotation or a loan approval guarantee."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-home-affordability-calculator-20261121") {
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
  "本工具僅依你輸入的假設與 28/36 負擔比率試算；月付只計房貸本金加利息，不含稅金、保險、管理費與房貸成數限制，不是財務建議、銀行報價或核貸保證。";
const DISCLAIMER_EN =
  "This tool estimates only from the assumptions you enter and the 28/36 debt-to-income guideline. The monthly payment counts mortgage principal and interest only, excluding taxes, insurance, management fees and loan-to-value limits, and is not financial advice, a bank quotation or a loan approval guarantee.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "購屋能力試算｜Gloss Tools",
    description:
      "輸入年收入、頭期款、房貸利率、年期與其他債務，依 28/36 負擔比率算出最高房價與最高月付。",
    h1: "購屋能力試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "28/36 是銀行的硬性上限嗎？",
      "不是。28/36 是傳統經驗法則：住房支出不超過稅前月收入 28%，全部債務不超過 36%。美國 CFPB 說不同貸款產品與銀行的 DTI 上限各不相同；舊的 43% 合格房貸上限已改為價格制。本工具以 28/36 為預設，你可以在範圍內調整。",
      "為什麼最高房價只算本金加利息？",
      "因為稅金、保險、管理費因地而異、無法由收入反推；本工具的月付只計房貸本金加利息，試算聲明已明載，實際每月支出會更高。",
      "其他債務太多、算出來沒有貸款額度，代表什麼？",
      "代表在你設定的後端上限下，其他債務已經吃掉全部額度；最高房價等於頭期款，只能全現金購屋，或先降低其他債務、再調高上限假設重算。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Home Affordability Calculator | Gloss Tools",
    description:
      "Enter annual income, down payment, mortgage rate, term and other debts to find your maximum home price and monthly payment under the 28/36 debt-to-income guideline.",
    h1: "Home Affordability Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Is 28/36 a hard bank limit?",
      "No. It is a traditional guideline: housing costs at or below 28% of gross monthly income, and all debts at or below 36%. The US CFPB says different loan products and lenders set different DTI limits, and the old 43% Qualified Mortgage cap was replaced with a price-based standard. This tool uses 28/36 as the default, and you can adjust it within the allowed range.",
      "Why does the maximum price only count principal and interest?",
      "Taxes, insurance and management fees vary by location and cannot be derived from income, so this tool's monthly payment counts mortgage principal and interest only, as the disclaimer states; your actual monthly cost will be higher.",
      "What does it mean when other debts leave no loan room?",
      "Under your back-end cap, your other debts already use up the whole allowance, so the maximum home price equals your down payment: a cash-only purchase, unless you lower other debts or raise the cap assumption and recalculate.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-annualIncome",
  "field-downPayment",
  "field-mortgageRate",
  "field-years",
  "field-otherDebts",
  "field-frontEndCapPct",
  "field-backEndCapPct",
];
const ERROR_IDS = [
  "error-annualIncome",
  "error-downPayment",
  "error-mortgageRate",
  "error-years",
  "error-otherDebts",
  "error-frontEndCapPct",
  "error-backEndCapPct",
];
const REGION_IDS = ["summary-rows", "no-room-note"];
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
    resolve(PROJECT_ROOT, "public/js/core/home-affordability.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "home-affordability-checker-worker-"));
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
// controller. The core must be purely a function of its seven input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/home-affordability.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/home-affordability.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/home-affordability.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/home-affordability.mjs: core must not reference Intl");
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
