// Static project checks for the Solar Payback Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, decimal limits, the
// 2026 tariff table, report filename and limit, the example equals
// the vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// disclaimer, the tariff citation, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-solar-payback-calculator-20261121, spec candidate commit
// 31b1fbf5174698ef9176a1687e1eb68ad5e8ae70, draft spec PR #403); the
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
  "public/js/core/solar-payback.mjs",
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
const FIXTURES_SHA256 = "76d1c9b6c9fcfb5e77d67680b293c88f3041ea28ae059cb55fa53dcf85ff850e";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, per-field
// decimal limits and ranges, the pinned 2026 tariff table, report
// filename/limit, the roof rule, the tariff citation, the ping
// conversion, and the example must match the SPEC and the vendored
// fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/solar-payback.mjs")).href
);
if (
  !deepEqual(core.FIELDS, [
    "systemKwp",
    "roofAreaM2",
    "sunHours",
    "installCost",
    "fitRate",
    "selfUsePct",
    "retailPrice",
  ])
) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    systemKwp: "9",
    roofAreaM2: "80",
    sunHours: "1250",
    installCost: "540000",
    fitRate: "5.6279",
    selfUsePct: "30",
    retailPrice: "3.00",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 16) fail("core: MAX_RAW_UNITS must be 16");
if (
  !deepEqual(core.FIELD_SPECS, {
    systemKwp: { maxDp: 2, min: "0.1", max: "500" },
    roofAreaM2: { maxDp: 2, min: "1", max: "100000" },
    sunHours: { maxDp: 1, min: "500", max: "2000" },
    installCost: { maxDp: 0, min: "1", max: "100000000" },
    fitRate: { maxDp: 4, min: "0.0001", max: "20" },
    selfUsePct: { maxDp: 1, min: "0", max: "100" },
    retailPrice: { maxDp: 2, min: "0.01", max: "20" },
  })
) {
  fail("core: FIELD_SPECS mismatch");
}
if (
  !deepEqual(core.FIT_BANDS, [
    { belowKwpHundredths: 1000n, rate: "5.6279" },
    { belowKwpHundredths: 2000n, rate: "5.3819" },
    { belowKwpHundredths: 5000n, rate: "4.2505" },
    { belowKwpHundredths: 10000n, rate: "4.0459" },
    { belowKwpHundredths: 50000n, rate: "3.7152" },
    { belowKwpHundredths: null, rate: "3.6236" },
  ])
) {
  fail("core: FIT_BANDS mismatch");
}
if (core.ROOF_M2_PER_KWP !== 8) fail("core: ROOF_M2_PER_KWP must be 8");
if (
  core.TARIFF_CITATION_ZH !==
  "經濟部 2026 年 1 月 2 日公告「115 年度再生能源電能躉購費率及其計算公式」（經能字第 11458005630 號）"
) {
  fail("core: TARIFF_CITATION_ZH mismatch");
}
if (
  core.TARIFF_CITATION_EN !==
  "MOEA announcement dated 2 January 2026 (Ref. No. 11458005630): 2026 (ROC 115) feed-in tariffs for rooftop solar"
) {
  fail("core: TARIFF_CITATION_EN mismatch");
}
if (core.REPORT_FILENAME !== "solar-payback-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (core.m2ToPing("80") !== "24.20") fail('core: m2ToPing("80") must be "24.20"');
if (core.m2ToPing("72") !== "21.78") fail('core: m2ToPing("72") must be "21.78"');
if (core.m2ToPing("8") !== "2.42") fail('core: m2ToPing("8") must be "2.42"');
if (core.m2ToPing("100") !== "30.25") fail('core: m2ToPing("100") must be "30.25"');
if (core.m2ToPing("abc") !== null) fail('core: m2ToPing("abc") must be null');
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-solar-payback-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 12) {
  fail("test/fixtures.json: expected 12 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the tariff citation and table values, the
// draft-loss note, the form control ids, and the default values.
const DISCLAIMER_ZH =
  "本工具的結果是靜態試算估計，不是發電保證、報價或投資建議；實際發電量受方位、傾角、遮蔭、氣候與設備影響，實際費率以完工併網當期經濟部公告與台電購售電契約為準。";
const DISCLAIMER_EN =
  "Results are static estimates, not a generation guarantee, a quote, or investment advice. Actual generation depends on orientation, tilt, shading, climate, and equipment; the applicable tariff is the one announced for the period when the system is completed and grid-connected, per the Taipower contract.";
const TARIFF_RATES = ["5.6279", "5.3819", "4.2505", "4.0459", "3.7152", "3.6236"];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "太陽能回本試算｜Gloss Tools",
    description:
      "輸入裝置容量、屋頂面積、年日照時數與建置成本，按台灣躉購費率算一年發多少電、一年拿回多少錢、幾年回本。",
    h1: "太陽能回本試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "躉購費率是哪一年的？",
      "2026 年（115 年度）經濟部公告的屋頂型費率，兩期相同；實際費率以完工併網當期的公告與台電契約為準。",
      "自用的電怎麼算錢？",
      "自用度數按你填的零售電價折算節省，預設每度 3.00 元是假設值，請按自家電費單的邊際單價改填；台電住宅用電是累進電價，本工具不做分段計算。",
      "屋頂不夠大怎麼辦？",
      "這是警告不是錯誤；頁面會顯示最大可裝容量，你可以改小裝置容量再算。",
    ],
    citation: "經能字第 11458005630 號",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Solar Payback Calculator | Gloss Tools",
    description:
      "Enter system size, roof area, annual sun hours and installation cost to estimate annual generation, yearly benefit and payback years at Taiwan's feed-in tariff.",
    h1: "Solar Payback Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Which year's feed-in tariff is used?",
      "The 2026 (ROC 115) MOEA-announced rooftop rates, identical in both phases; the rate that applies is the one announced for the period when the system is completed and grid-connected, per the Taipower contract.",
      "How is self-consumed electricity valued?",
      "Self-used kWh are valued at the retail price you enter (default NT$3.00/kWh is an assumption — replace it with the marginal rate on your own bill; Taipower residential rates are inclining-block, which this tool does not compute).",
      "What if my roof is too small?",
      "That is a warning, not an error; the page shows the largest capacity that fits, so you can lower the system size and recalculate.",
    ],
    citation: "11458005630",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-systemKwp",
  "field-roofAreaM2",
  "field-sunHours",
  "field-installCost",
  "field-fitRate",
  "field-selfUsePct",
  "field-retailPrice",
];
const ERROR_IDS = [
  "error-systemKwp",
  "error-roofAreaM2",
  "error-sunHours",
  "error-installCost",
  "error-fitRate",
  "error-selfUsePct",
  "error-retailPrice",
];
const REGION_IDS = ["summary-rows", "detail-rows", "roof-note", "beyond-note"];
const DEFAULT_VALUES = [
  'value="9"',
  'value="80"',
  'value="1250"',
  'value="540000"',
  'value="5.6279"',
  'value="30"',
  'value="3.00"',
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
  if (!html.includes(page.citation)) fail(`${page.path}: missing tariff citation`);
  for (const rate of TARIFF_RATES) {
    if (!html.includes(rate)) fail(`${page.path}: missing tariff rate ${rate}`);
  }
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
    if (!html.includes(value)) fail(`${page.path}: missing default value ${value}`);
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
    resolve(PROJECT_ROOT, "public/js/core/solar-payback.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "solar-payback-calculator-worker-"));
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
  "public/js/core/solar-payback.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/solar-payback.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/solar-payback.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/solar-payback.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/tariff table/example, pages, syntax, worker concatenation, capability scan, core purity",
);
