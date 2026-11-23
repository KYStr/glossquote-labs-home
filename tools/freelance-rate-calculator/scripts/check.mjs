// Static project checks for the Freelance Rate Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, example equals the vendored fixtures.json case 1, the
// vendored fixtures hash, bilingual metadata, the pinned FAQ
// answers, the bilingual quote note, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-freelance-rate-calculator-20261121, spec candidate commit
// 468c6cd604644154701002a52c3d6949c3f726a0, draft spec PR #374); the
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
  "public/js/core/freelance-rate.mjs",
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
const FIXTURES_SHA256 = "74d66bc65236d693cb1f0827d728417c5b86ccddfc97926ded242634ddd1a1c9";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, report
// filename/limit, and the example must match the SPEC and the
// vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/freelance-rate.mjs")).href
);
if (
  !deepEqual(core.FIELDS, [
    "targetAnnualIncome",
    "workingDaysPerYear",
    "hoursPerDay",
    "billableUtilizationPercent",
    "overheadPercent",
  ])
) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    targetAnnualIncome: "1200000",
    workingDaysPerYear: "220",
    hoursPerDay: "8",
    billableUtilizationPercent: "70",
    overheadPercent: "20",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (
  !deepEqual(core.RANGES, {
    targetAnnualIncome: { min: "1", max: "100000000" },
    workingDaysPerYear: { min: "1", max: "365" },
    hoursPerDay: { min: "0.5", max: "24" },
    billableUtilizationPercent: { min: "1", max: "100" },
    overheadPercent: { min: "0", max: "100" },
  })
) {
  fail("core: RANGES mismatch");
}
if (core.REPORT_FILENAME !== "freelance-rate-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-freelance-rate-calculator-20261121") {
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
// the bilingual quote note on both pages, the pinned FAQ answers,
// the draft-loss note, the form control ids, and the pre-filled
// SPEC defaults.
const QUOTE_ZH =
  "這只是試算參考，實際報價還要考慮稅費、勞健保、議價空間與市場行情。";
const QUOTE_EN =
  "This is an estimate only; actual quotes should also account for tax, insurance, negotiation room and market rates.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "接案費率試算｜Gloss Tools",
    description:
      "自由工作者從目標年收入出發，計入可計費使用率與間接成本，算出應報的時薪與日薪。",
    h1: "接案費率試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "時薪是怎麼算出來的？",
      "先把目標年收入加上間接成本，再除以計費時數（年工作天數 × 可計費使用率 × 每日工時）。",
      "這個費率可以直接拿去報價嗎？",
      "這只是試算參考，實際報價還要考慮稅費、勞健保、議價空間與市場行情。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Freelance Rate Calculator | Gloss Tools",
    description:
      "Set your freelance hourly and day rate from a target annual income, billable utilization and overhead.",
    h1: "Freelance Rate Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is the hourly rate calculated?",
      "Add overhead to the target annual income, then divide by billable hours (working days × utilization × hours per day).",
      "Can I quote this rate directly?",
      "This is an estimate only; actual quotes should also account for tax, insurance, negotiation room and market rates.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-targetAnnualIncome",
  "field-workingDaysPerYear",
  "field-hoursPerDay",
  "field-billableUtilizationPercent",
  "field-overheadPercent",
];
const ERROR_IDS = [
  "error-targetAnnualIncome",
  "error-workingDaysPerYear",
  "error-hoursPerDay",
  "error-billableUtilizationPercent",
  "error-overheadPercent",
];
const REGION_IDS = ["summary-rows"];
const DEFAULT_VALUES = [
  'value="1200000"',
  'value="220"',
  'value="8"',
  'value="70"',
  'value="20"',
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
  if (!html.includes(QUOTE_ZH)) fail(`${page.path}: missing quote note (zh)`);
  if (!html.includes(QUOTE_EN)) fail(`${page.path}: missing quote note (en)`);
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
  for (const value of DEFAULT_VALUES) {
    if (!html.includes(value)) fail(`${page.path}: missing pre-filled default ${value}`);
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
    resolve(PROJECT_ROOT, "public/js/core/freelance-rate.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "freelance-rate-calculator-worker-"));
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
// controller. The core must be purely a function of its five input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/freelance-rate.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/freelance-rate.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/freelance-rate.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/freelance-rate.mjs: core must not reference Intl");
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
