// Static project checks for the Image File Size Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, total-pixels cap, bit
// depth and format enumerations, the pinned factor table, report
// filename and limit, the estimate note, the example equals the
// vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/storage/
// clock), syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-image-file-size-calculator-20261121, spec candidate commit
// 8c510a9a8a8fcf1658b94e8743d84d4e09885c54, draft spec PR #407); the
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
  "public/js/core/image-file-size.mjs",
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
const FIXTURES_SHA256 = "68f16b6decd4518d843d484a667f17ada8862eba9f5c7eed578e047b621c2a1e";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, dimension
// range, total-pixels cap, bit-depth and format enumerations, the
// pinned factor table, report filename/limit, the estimate note, and
// the example must match the SPEC and the vendored fixtures.json
// case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/image-file-size.mjs")).href
);
if (!deepEqual(core.FIELDS, ["widthPx", "heightPx", "bitDepth", "format"])) {
  fail("core: FIELDS order mismatch");
}
if (!deepEqual(core.DEFAULTS, { widthPx: "", heightPx: "", bitDepth: "24", format: "jpeg" })) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.DIMENSION_MIN !== 1) fail("core: DIMENSION_MIN mismatch");
if (core.DIMENSION_MAX !== 100000) fail("core: DIMENSION_MAX mismatch");
if (core.MAX_TOTAL_PIXELS !== 1000000000n) fail("core: MAX_TOTAL_PIXELS mismatch");
if (!deepEqual(core.BIT_DEPTHS, ["1", "8", "16", "24", "32", "48", "64"])) {
  fail("core: BIT_DEPTHS mismatch");
}
if (
  !deepEqual(core.FORMAT_IDS, [
    "uncompressed",
    "jpeg",
    "png",
    "webp-lossy",
    "webp-lossless",
    "gif",
    "avif",
  ])
) {
  fail("core: FORMAT_IDS order mismatch");
}
const EXPECTED_FACTORS = {
  uncompressed: [1n, 1n],
  jpeg: [1n, 10n],
  png: [2n, 5n],
  "webp-lossy": [7n, 100n],
  "webp-lossless": [3n, 10n],
  gif: [1n, 4n],
  avif: [1n, 20n],
};
for (const [format, factor] of Object.entries(EXPECTED_FACTORS)) {
  if (!deepEqual(core.FORMATS[format].factor, factor)) {
    fail(`core: FORMATS.${format}.factor mismatch`);
  }
}
if (core.REPORT_FILENAME !== "image-file-size-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (core.ESTIMATE_NOTE_ZH !== "估算值，非實際檔案大小") {
  fail("core: ESTIMATE_NOTE_ZH mismatch");
}
if (core.ESTIMATE_NOTE_EN !== "Estimate, not the actual file size") {
  fail("core: ESTIMATE_NOTE_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-image-file-size-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual estimate note on both pages, the pinned FAQ answers,
// the draft-loss note, and the form control ids.
const ESTIMATE_NOTE_ZH = "估算值，非實際檔案大小";
const ESTIMATE_NOTE_EN = "Estimate, not the actual file size";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "圖片檔案大小估算｜Gloss Tools",
    description:
      "輸入圖片寬×高像素、色彩深度與格式，估算靜態圖片的檔案大小（KB／MB）。",
    h1: "圖片檔案大小估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "估算值準嗎？",
      "實際檔案大小依圖片內容、編碼器與品質設定而異，本工具給的是典型估算值，不是實際檔案大小。",
      "1 KB 是 1000 還是 1024 bytes？",
      "本工具 1 KB = 1024 bytes、1 MB = 1024 KB。",
      "影片可以用嗎？",
      "不行。影片大小以位元率 × 時長估算，本工具只算靜態圖片。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Image File Size Calculator | Gloss Tools",
    description:
      "Estimate a still image's file size from its pixel dimensions, bit depth and format.",
    h1: "Image File Size Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Are estimates accurate?",
      "Actual file size depends on image content, encoder and quality settings; this tool gives a typical estimate, not the actual file size.",
      "Is 1 KB 1000 or 1024 bytes?",
      "This tool uses 1 KB = 1024 bytes and 1 MB = 1024 KB.",
      "Can I use it for video?",
      "No. Video size is estimated from bitrate × duration; this tool is for still images only.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-widthPx", "field-heightPx", "field-bitDepth", "field-format"];
const ERROR_IDS = ["error-widthPx", "error-heightPx", "error-bitDepth", "error-format"];
const REGION_IDS = ["summary-rows", "detail-rows", "estimate-note"];
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
  if (!html.includes(ESTIMATE_NOTE_ZH)) fail(`${page.path}: missing estimate note (zh)`);
  if (!html.includes(ESTIMATE_NOTE_EN)) fail(`${page.path}: missing estimate note (en)`);
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
    resolve(PROJECT_ROOT, "public/js/core/image-file-size.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "image-file-size-calculator-worker-"));
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
// controller. The core must be purely a function of its four input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/image-file-size.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/image-file-size.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/image-file-size.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/image-file-size.mjs: core must not reference Intl");
  }
  // No binary floating point in the core: the SPEC pins integer/BigInt
  // arithmetic, so the core must not use parseFloat or parseInt
  // anywhere. (Number() is used only to convert a bounded BigInt
  // result to a JSON integer, which is exact.)
  if (/\bparseFloat\b/.test(coreText) || /\bparseInt\b/.test(coreText)) {
    fail("public/js/core/image-file-size.mjs: core must not use parseFloat/parseInt");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/enumerations/factors/example, pages, syntax, worker concatenation, capability scan, core purity",
);
