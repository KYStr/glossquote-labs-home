// Static project checks for the Deal Comparator: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (defaults, example, ranges, report filename and limit,
// unit labels, the vendored fixtures hash, bilingual metadata, the
// pinned FAQ answers, the candidate noindex / no-canonical rules),
// core purity (no DOM/network/storage/clock), syntax of every
// shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure
// list. The vendored test/fixtures.json is a verbatim copy of the
// fixed spec's fixtures (spec-deal-comparator-20261121, spec
// candidate commit d96c5920128637f2b942b52c0fd11f771e7d25dc, draft
// spec PR #375); the spec PR is not merged into this branch's base,
// so the check reads the vendored copy rather than a repo-level docs
// path.

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
  "public/js/core/deal-comparator.mjs",
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
const FIXTURES_SHA256 = "f7d2d5fdec220b4309319b666082af2bc83459c8b6873805d5661fc196c5854b";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: defaults, example, capacity limits, ranges, report
// filename/limit, unit labels, and the example must match the SPEC
// and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/deal-comparator.mjs")).href
);
if (core.SPEC_ID !== "spec-deal-comparator-20261121") fail("core: SPEC_ID mismatch");
if (core.INPUT_LIMIT_CHARS !== 65536) fail("core: INPUT_LIMIT_CHARS must be 65536");
if (core.PRODUCT_NAME_MAX !== 80) fail("core: PRODUCT_NAME_MAX must be 80");
if (core.LABEL_MAX !== 40) fail("core: LABEL_MAX must be 40");
if (core.INTEGER_MAX_CHARS !== 6) fail("core: INTEGER_MAX_CHARS must be 6");
if (core.MONEY_MAX_CHARS !== 12) fail("core: MONEY_MAX_CHARS must be 12");
if (!deepEqual(core.UNIT_BASES, ["g", "ml", "piece"])) fail("core: UNIT_BASES mismatch");
if (!deepEqual(core.UNIT_LABELS, { g: "每 100 g", ml: "每 100 mL", piece: "每件" })) {
  fail("core: UNIT_LABELS mismatch");
}
if (!deepEqual(core.OFFER_TYPES, ["buyNGetM", "percentOff", "fixedOff", "bundle"])) {
  fail("core: OFFER_TYPES mismatch");
}
if (!deepEqual(core.DEFAULT_LABELS, ["方案 A", "方案 B", "方案 C", "方案 D"])) {
  fail("core: DEFAULT_LABELS mismatch");
}
if (core.PACK_PRICE_MIN_CENTS !== 1n) fail("core: PACK_PRICE_MIN_CENTS mismatch");
if (core.PACK_PRICE_MAX_CENTS !== 99999999n) fail("core: PACK_PRICE_MAX_CENTS mismatch");
if (core.COUNT_MIN !== 1 || core.COUNT_MAX !== 99) fail("core: COUNT_MIN/COUNT_MAX mismatch");
if (core.REPORT_FILENAME !== "deal-comparator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_DEFAULTS = {
  productName: "咖啡豆",
  unitBasis: "g",
  packSize: "500",
  packPrice: "150.00",
  offers: [
    { type: "buyNGetM", buyN: "2", getM: "1" },
    { type: "percentOff", percent: "20", quantity: "1" },
  ],
};
if (!deepEqual(core.DEFAULTS, EXPECTED_DEFAULTS)) fail("core: DEFAULTS mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-deal-comparator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned FAQ answers, the draft-loss note, and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "優惠比價｜Gloss Tools",
    description:
      "同一商品 2–4 個優惠方案，換算成統一單位價再排名，找出真正最划算的買法。",
    h1: "優惠比價",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "單位價怎麼算？",
      "把每個方案的實付金額除以總數量，再換算成每 100 g／每 100 mL／每件；買 N 送 M 的贈品數量也算進總數量。",
      "兩個方案單位價相同時為什麼排名不同？",
      "先比實付總價，總價低者在前；總價也相同時，輸入順序在前者在前。",
      "可以比較不同商品嗎？",
      "不行。本工具只比較同一商品的優惠方案；不同商品的比較不在範圍內。",
      "組合價比原價貴會怎樣？",
      "仍可比較，省下金額與百分比會是負值，該方案排名最後。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Deal Comparator | Gloss Tools",
    description:
      "Compare 2–4 offers for the same product as one common unit price and rank the best deal.",
    h1: "Deal Comparator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is the unit price calculated?",
      "Divide each offer's total paid by its total quantity, then scale to per 100 g / per 100 mL / per piece; free items from buy N get M count toward the total quantity.",
      "Why do two offers with the same unit price rank differently?",
      "The lower total paid ranks first; if the totals are also equal, the earlier-entered offer ranks first.",
      "Can I compare different products?",
      "No. This tool only compares offers for the same product; comparing different products is out of scope.",
      "What if a bundle costs more than the list price?",
      "It still compares; its savings amount and percent are negative and it ranks last.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-product-name",
  "field-unit-basis",
  "field-pack-size",
  "field-pack-price",
  "field-offer-count",
  "field-offer-0-label",
  "field-offer-0-type",
  "field-offer-0-buy-n",
  "field-offer-0-get-m",
  "field-offer-0-quantity",
  "field-offer-0-percent",
  "field-offer-0-amount-off",
  "field-offer-0-bundle-price",
];
const ERROR_IDS = [
  "error-product-name",
  "error-unit-basis",
  "error-pack-size",
  "error-pack-price",
  "error-offer-count",
  "error-offer-0",
  "error-offer-1",
  "error-offer-2",
  "error-offer-3",
];
const REGION_IDS = ["best-line", "result-rows"];
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
    resolve(PROJECT_ROOT, "public/js/core/deal-comparator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "deal-comparator-worker-"));
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
  "public/js/core/deal-comparator.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/deal-comparator.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/deal-comparator.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/deal-comparator.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core defaults/example/ranges, pages, syntax, worker concatenation, capability scan, core purity",
);
