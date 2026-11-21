// Static project checks for the Screen PPI Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, formula constants, the example
// equals the fhd-24 fixture, the pinned bilingual strings in the app,
// bilingual metadata and the candidate noindex / CSP rules), core purity
// (no DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list.

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
  "public/js/core/screen-ppi.mjs",
  "public/styles/screen-ppi.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/screen-ppi-core.test.mjs",
  "test/screen-ppi-controller.test.mjs",
  "test/screen-ppi-report.test.mjs",
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
// does not match its own scan. The SPEC bans persistent storage
// outright, so localStorage/sessionStorage are forbidden everywhere
// here (unlike sibling tools whose SPEC pins a storage key).
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
// report constants, and the example must match the SPEC and fixtures.json
// exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/screen-ppi.mjs")).href);
const expectedFields = ["diagonalIn", "widthPx", "heightPx"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { diagonalIn: 8, widthPx: 8, heightPx: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { diagonalIn: "27", widthPx: "2560", heightPx: "1440" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = { diagonalIn: "24", widthPx: "1920", heightPx: "1080" };
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE must equal the fhd-24 fixture input");
}
if (core.INCH_CM !== 2.54) fail("core: INCH_CM must be 2.54");
if (core.MM_PER_INCH !== 25.4) fail("core: MM_PER_INCH must be 25.4");
if (core.DIAGONAL_MIN !== 0.1 || core.DIAGONAL_MAX !== 200) {
  fail("core: diagonal range must be 0.1-200");
}
if (core.PX_MIN !== 1 || core.PX_MAX !== 16384) {
  fail("core: pixel range must be 1-16384");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "screen-ppi-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入或載入範例", en: "Enter values or load the example" },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
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
if (fixturesHash !== "bccbc7d42443fffbd9589c1182c1148205ba7c542eee6e94f0f89967cd52bef6") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.slug !== "screen-ppi-calculator") fail("test/fixtures.json: slug mismatch");
if (fixtures.specId !== "spec-screen-ppi-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 18) {
  fail("test/fixtures.json: expected 18 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const fhd24 = fixtures.cases.find((entry) => entry.id === "fhd-24");
if (canonical(core.EXAMPLE) !== canonical(fhd24.input)) {
  fail("core: EXAMPLE must equal the fhd-24 fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "對角線請用數字（英寸），最多兩位小數",
  "像素請用整數",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter the diagonal in inches, with at most two decimal places.",
  "Enter the pixel count as a whole number.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "已載入範例，請按「計算螢幕密度」執行。",
  "Example loaded. Run “Calculate screen density” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned FAQ answers. The candidate carries NO production canonical,
// hreflang, sitemap or external URLs (SPEC section 7).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "螢幕 PPI 計算｜Gloss Tools",
    description:
      "輸入對角線英寸與原生解析度，算出像素密度 PPI、實體寬高、點距與總像素，購物前先查核螢幕細緻度。",
    h1: "螢幕 PPI 計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "0.1–200 英寸，最多兩位小數。",
    draftNote: "切換語言或離開頁面會失去草稿。",
    faq: [
      "寬高為什麼不用畫面上顯示的 PPI 來算？",
      "寬高由未捨入的 PPI 推導，四捨五入後的 PPI 只供閱讀；用顯示值反推會讓寬高與對角線對不起來。",
      "可以由長寬比反推缺少的一邊嗎？",
      "本工具不做求解，長寬比只是參考標籤；要由比例與一邊求另一邊，請用長寬比計算工具。",
      "對角線要用含邊框的數字嗎？",
      "請用規格表上的可視對角線與面板原生解析度；市售標示若含邊框或非原生解析度，結果會跟著偏差。",
      "點距和 PPI 是同一個東西嗎？",
      "點距是相鄰像素中心的距離（mm)，與 PPI 互為倒數關係（25.4 / PPI)；點距越小畫面越細緻。",
    ],
    assets: ['href="./styles/screen-ppi.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Screen PPI Calculator | Gloss Tools",
    description:
      "Enter the diagonal in inches and the native resolution to get pixel density (PPI), physical width and height, dot pitch and total pixels.",
    h1: "Screen PPI Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "0.1–200 inches, at most two decimal places.",
    draftNote: "Switching language or leaving the page discards the draft.",
    faq: [
      "Why aren't the width and height derived from the displayed PPI?",
      "They are computed from the unrounded PPI; the rounded PPI is for reading only, and deriving from it would make the dimensions disagree with the diagonal.",
      "Can I solve for a missing side from the aspect ratio?",
      "This tool does not solve; the ratio is a reference label only. To solve a missing side from a ratio, use the aspect ratio calculator.",
      "Should the diagonal include the bezel?",
      "Use the viewable diagonal and the panel's native resolution from the spec sheet; a marketed size that includes the bezel, or a non-native resolution, shifts the result.",
      "Are dot pitch and PPI the same thing?",
      "Dot pitch is the distance between adjacent pixel centres in mm, the reciprocal of PPI (25.4 / PPI); a smaller pitch means a finer image.",
    ],
    assets: ['href="../styles/screen-ppi.css"', 'src="../js/app.js"'],
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
  if (html.includes("rel=\"canonical\"")) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes("hreflang")) fail(`${page.path}: preview must not carry hreflang`);
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected no https URLs in the preview page, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
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
  for (const id of ["status", "results", "ppi-value", "result-echo", "result-width", "result-height", "result-dot-pitch", "result-megapixels", "result-aspect", "run-btn", "example-btn", "reset-btn", "cancel-btn", "download-btn"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/screen-ppi.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "screen-ppi-calculator-worker-"));
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
// or the controller. The SPEC bans persistent storage outright, so the
// app must not touch localStorage/sessionStorage either.
for (const purePath of [
  "public/js/core/screen-ppi.mjs",
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
{
  const appText = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
  if (appText.includes("localStorage")) fail("public/js/app.js: localStorage must not be used");
  if (appText.includes("sessionStorage")) fail("public/js/app.js: sessionStorage must not be used");
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/constants/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
