// Static project checks for the Debt Payoff Planner: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, example equals the vendored fixtures.json case 1, the
// vendored fixtures hash, bilingual metadata, the pinned FAQ
// answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-debt-payoff-planner-20261121, draft spec PR #376); the spec
// PR is not merged into this branch's base, so the check reads the
// vendored copy rather than a repo-level docs path.

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
  "public/js/core/debt-payoff-planner.mjs",
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
const FIXTURES_SHA256 = "5f35c9076a97e9d8e4292085c0d4ddcf3806902b9f492d39ed1e02516123d2dc";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, limits, ranges, report
// filename/limit, the pinned disclaimer, and the example must match
// the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/debt-payoff-planner.mjs")).href
);
if (!deepEqual(core.DEBT_FIELDS, ["name", "balance", "apr", "minimum"])) {
  fail("core: DEBT_FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    debts: [
      { name: "Credit Card", balance: "5000.00", apr: "19.99", minimum: "150.00" },
      { name: "Personal Loan", balance: "8000.00", apr: "9.50", minimum: "200.00" },
      { name: "Store Card", balance: "1200.00", apr: "24.99", minimum: "50.00" },
    ],
    extraMonthly: "200.00",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_DEBTS !== 12) fail("core: MAX_DEBTS must be 12");
if (core.MAX_NAME_UNITS !== 40) fail("core: MAX_NAME_UNITS must be 40");
if (core.MAX_RAW_UNITS !== 15) fail("core: MAX_RAW_UNITS must be 15");
if (core.BALANCE_MAX_CENTS !== 1000000000) fail("core: BALANCE_MAX_CENTS mismatch");
if (core.PAYMENT_MAX_CENTS !== 100000000) fail("core: PAYMENT_MAX_CENTS mismatch");
if (core.APR_MAX_HUNDREDTHS !== 9999) fail("core: APR_MAX_HUNDREDTHS mismatch");
if (core.MAX_MONTHS !== 600) fail("core: MAX_MONTHS must be 600");
if (core.REPORT_FILENAME !== "debt-payoff-plan.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  core.DISCLAIMER_ZH !==
  "本工具以你輸入的固定年利率與固定月還款做推算，實際利率、最低還款與費用會隨銀行規定改變，結果僅供規劃參考，不是理財建議。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool projects from the fixed APRs and fixed monthly payments you enter. Real rates, minimum payments and fees change with each lender; results are for planning only, not financial advice."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-debt-payoff-planner-20261121") {
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

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具以你輸入的固定年利率與固定月還款做推算，實際利率、最低還款與費用會隨銀行規定改變，結果僅供規劃參考，不是理財建議。";
const DISCLAIMER_EN =
  "This tool projects from the fixed APRs and fixed monthly payments you enter. Real rates, minimum payments and fees change with each lender; results are for planning only, not financial advice.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "債務清償規劃｜Gloss Tools",
    description:
      "同時背著多筆債務時，比較雪球法與雪崩法各自要幾個月還清、總利息差多少。",
    h1: "債務清償規劃",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "雪球法和雪崩法差在哪？",
      "雪球先還餘額最小的，雪崩先還利率最高的；雪崩通常利息較少，雪球通常先看到一筆還清。",
      "還清一筆後，它的最低還款會怎樣？",
      "從下個月起併入額外還款池，繼續滾向下一筆；每月總流出不變。",
      "最低還款比利息少會怎樣？",
      "該筆餘額會越滾越大；若 600 個月內還不清，工具會如實顯示未還清與剩餘餘額。",
      "會連到我的銀行嗎？",
      "不會。全部計算都在本頁完成，不上傳任何資料。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Debt Payoff Planner | Gloss Tools",
    description:
      "Compare snowball and avalanche payoff plans for multiple debts: months to debt-free and total interest for each.",
    h1: "Debt Payoff Planner",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What is the difference between snowball and avalanche?",
      "Snowball pays the smallest balance first; avalanche pays the highest APR first. Avalanche usually costs less interest; snowball usually clears one debt sooner.",
      "What happens to a paid-off debt's minimum payment?",
      "From the next month it joins the extra-payment pool and rolls to the next debt; the total monthly outflow stays the same.",
      "What if a minimum payment is less than the interest?",
      "That balance grows; if it cannot be cleared within 600 months, the tool says so and shows the remaining balance.",
      "Does it connect to my bank?",
      "No. All calculations run on this page and nothing is uploaded.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const STATIC_IDS = [
  "entry-form",
  "debt-rows",
  "row-errors",
  "add-debt-btn",
  "field-extra",
  "error-extra",
  "status",
  "example-note",
  "comparison-rows",
  "snowball-months",
  "snowball-interest",
  "snowball-paid",
  "snowball-order",
  "snowball-payoff",
  "snowball-monthly",
  "snowball-prev",
  "snowball-next",
  "snowball-page",
  "snowball-notfree",
  "avalanche-months",
  "avalanche-interest",
  "avalanche-paid",
  "avalanche-order",
  "avalanche-payoff",
  "avalanche-monthly",
  "avalanche-prev",
  "avalanche-next",
  "avalanche-page",
  "avalanche-notfree",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
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
  if (!html.includes(DISCLAIMER_ZH)) fail(`${page.path}: missing disclaimer (zh)`);
  if (!html.includes(DISCLAIMER_EN)) fail(`${page.path}: missing disclaimer (en)`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of STATIC_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element ${id}`);
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
    resolve(PROJECT_ROOT, "public/js/core/debt-payoff-planner.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "debt-payoff-planner-worker-"));
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
// controller. The core must be purely a function of its input, so a
// bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/debt-payoff-planner.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/debt-payoff-planner.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/debt-payoff-planner.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/debt-payoff-planner.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/limits/example, pages, syntax, worker concatenation, capability scan, core purity",
);
