// Static project checks for the Depth of Field Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, decimal rules, ranges, report
// filename and limit, CoC table, example equals the vendored
// fixtures.json case 1, the vendored fixtures hash, bilingual
// metadata, the pinned FAQ answers, the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-depth-of-field-calculator-20261121, spec candidate commit
// e6c526038f637195fd3d14499e74feb3966ba53a, draft spec PR #394); the
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
  "public/js/core/depth-of-field.mjs",
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
const FIXTURES_SHA256 = "eeddf8cdab6f801ca2049f5626369656973c11abad00338c78036490a1527b17";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, decimal rules, ranges, the
// pinned CoC table, report filename/limit, and the example must match
// the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/depth-of-field.mjs")).href
);
if (!deepEqual(core.FIELDS, ["focalLengthMm", "aperture", "focusDistanceM", "sensor", "cocMm"])) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    focalLengthMm: "50",
    aperture: "8",
    focusDistanceM: "3",
    sensor: "full-frame",
    cocMm: "",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (
  !deepEqual(core.DECIMAL_RULES, {
    focalLengthMm: { maxRawUnits: 8, maxDecimals: 2, min: 1, max: 2000 },
    aperture: { maxRawUnits: 8, maxDecimals: 2, min: 0.5, max: 64 },
    focusDistanceM: { maxRawUnits: 10, maxDecimals: 3, min: 0.05, max: 10000 },
    cocMm: { maxRawUnits: 8, maxDecimals: 3, min: 0.001, max: 1 },
  })
) {
  fail("core: DECIMAL_RULES mismatch");
}
const EXPECTED_COC = {
  "1-inch": 0.011,
  "four-thirds": 0.015,
  "aps-c": 0.018,
  "aps-c-canon": 0.018,
  "aps-c-nikon": 0.019,
  "aps-h": 0.023,
  "full-frame": 0.029,
  "medium-645": 0.047,
};
if (!deepEqual(core.SENSORS, [...Object.keys(EXPECTED_COC), "custom"])) {
  fail("core: SENSORS mismatch");
}
for (const [sensor, cocMm] of Object.entries(EXPECTED_COC)) {
  if (core.COC_TABLE[sensor]?.cocMm !== cocMm) {
    fail(`core: COC_TABLE[${sensor}] mismatch`);
  }
}
if (core.REPORT_FILENAME !== "depth-of-field-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-depth-of-field-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 11) {
  fail("test/fixtures.json: expected 11 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned FAQ answers, the draft-loss note, the sensor options
// with pinned CoC values, and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "景深計算｜Gloss Tools",
    description:
      "輸入焦距、光圈、對焦距離與感光元件，算出近限、遠限、景深總長與超焦距，決定該收幾級光圈或把焦點移到哪裡。",
    h1: "景深計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "容許彌散圓是什麼？",
      "畫面上仍被視為一點的最大模糊圓直徑，依感光元件尺寸而定。",
      "遠限顯示無限遠是什麼意思？",
      "對焦距離已達或超過超焦距，從近限起的一切都落在可接受的清晰範圍內。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Depth of Field Calculator | Gloss Tools",
    description:
      "Enter focal length, aperture, focus distance and sensor format to find the near limit, far limit, total depth of field and hyperfocal distance.",
    h1: "Depth of Field Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What is the circle of confusion?",
      "The largest blur spot still seen as a point, set by sensor size.",
      "What does an infinite far limit mean?",
      "The focus distance has reached or passed the hyperfocal distance, so everything from the near limit onward is acceptably sharp.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-focal-length-mm",
  "field-aperture",
  "field-focus-distance-m",
  "field-sensor",
  "field-coc-mm",
];
const ERROR_IDS = [
  "error-focal-length-mm",
  "error-aperture",
  "error-focus-distance-m",
  "error-sensor",
  "error-coc-mm",
];
const REGION_IDS = ["summary-rows", "setup-rows"];
const SENSOR_OPTIONS = [
  "1-inch",
  "four-thirds",
  "aps-c",
  "aps-c-canon",
  "aps-c-nikon",
  "aps-h",
  "full-frame",
  "medium-645",
  "custom",
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
  for (const sensor of SENSOR_OPTIONS) {
    if (!html.includes(`value="${sensor}"`)) fail(`${page.path}: missing sensor option ${sensor}`);
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
    resolve(PROJECT_ROOT, "public/js/core/depth-of-field.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "depth-of-field-calculator-worker-"));
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
  "public/js/core/depth-of-field.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/depth-of-field.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/depth-of-field.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/depth-of-field.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/rules/CoC/example, pages, syntax, worker concatenation, capability scan, core purity",
);
