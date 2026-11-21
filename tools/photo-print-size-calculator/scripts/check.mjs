// Static project checks for the Photo Print Size Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, size table, quality
// labels, status strings, the example equals the max-24mp-300 fixture,
// the pinned bilingual strings in the app, bilingual metadata and the
// candidate noindex / CSP rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. This tool forbids
// persistent storage entirely (SPEC implementation), so localStorage
// and sessionStorage are forbidden everywhere. Exits non-zero on the
// first failure list.

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
  "public/js/core/photo-print-size.mjs",
  "public/styles/photo-print-size.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/photo-print-size-core.test.mjs",
  "test/photo-print-size-controller.test.mjs",
  "test/photo-print-size-report.test.mjs",
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

// Forbidden runtime capabilities. This file itself is excluded from
// the scan, so the tokens may appear here literally. Persistent
// storage is forbidden in this tool by the SPEC.
const forbiddenTokens = [
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "document.cookie",
  "document.write",
  "eval(",
  "new Function",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "sendBeacon",
];

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

// Core contract: field order, raw limits, defaults, size table,
// quality labels, status strings, ranges, report constants, and the
// example must match the SPEC and fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/photo-print-size.mjs")).href
);
const expectedFields = ["mode", "pixelsW", "pixelsH", "dpi", "sizeId"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { mode: 8, pixelsW: 8, pixelsH: 8, dpi: 8, sizeId: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  dpi: "300",
  mode: "max",
  pixelsH: "4000",
  pixelsW: "6000",
  sizeId: "4x6",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow)");
}
const expectedSizeIds = ["3x5", "4x6", "5x7", "6x8", "8x10", "10x12", "A5", "A4", "A3"];
if (JSON.stringify(core.SIZE_IDS) !== JSON.stringify(expectedSizeIds)) {
  fail("core: SIZE_IDS order mismatch");
}
const expectedSizeLabels = {
  "3x5": { zh: "3×5 相片", en: "3×5 photo" },
  "4x6": { zh: "4×6 相片", en: "4×6 photo" },
  "5x7": { zh: "5×7 相片", en: "5×7 photo" },
  "6x8": { zh: "6×8 相片", en: "6×8 photo" },
  "8x10": { zh: "8×10 相片", en: "8×10 photo" },
  "10x12": { zh: "10×12 相片", en: "10×12 photo" },
  A5: { zh: "A5", en: "A5" },
  A4: { zh: "A4", en: "A4" },
  A3: { zh: "A3", en: "A3" },
};
if (canonical(core.SIZE_LABELS) !== canonical(expectedSizeLabels)) {
  fail("core: SIZE_LABELS mismatch");
}
const expectedQualityLabels = {
  excellent: { zh: "極佳", en: "Excellent" },
  good: { zh: "良好", en: "Good" },
  acceptable: { zh: "可接受", en: "Acceptable" },
  poor: { zh: "不足", en: "Poor" },
};
if (canonical(core.QUALITY_LABELS) !== canonical(expectedQualityLabels)) {
  fail("core: QUALITY_LABELS mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入像素與目標 DPI，或載入範例。", en: "Enter pixel dimensions and a target DPI, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  example: { zh: "已載入範例", en: "Example loaded" },
  reset: { zh: "已重設", en: "Reset" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
if (core.PIXELS_MIN !== 1 || core.PIXELS_MAX !== 200000) {
  fail("core: pixel range must be 1-200000");
}
if (core.DPI_MIN !== 1 || core.DPI_MAX !== 1200) {
  fail("core: DPI range must be 1-1200");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "photo-print-size-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "7893229924415e87fed19f31819a9e8dfc1571621c16cc2f08640755bdc85106") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixturesDoc = JSON.parse(fixturesText);
if (fixturesDoc.specId !== "spec-photo-print-size-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
if (fixturesDoc.slug !== "photo-print-size-calculator") {
  fail("test/fixtures.json: slug mismatch");
}
const fixtures = fixturesDoc.cases;
if (!Array.isArray(fixtures)) fail("test/fixtures.json: expected a cases array");
if (fixtures.filter((entry) => entry.kind === "core").length !== 25) {
  fail("test/fixtures.json: expected 25 core cases");
}
if (fixtures.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const max24mp = fixtures.find((entry) => entry.id === "max-24mp-300");
if (canonical(core.EXAMPLE) !== canonical(max24mp.input)) {
  fail("core: EXAMPLE must equal the max-24mp-300 fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the quality disclosure, the example note, and the no-fit
// line.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "像素請用整數",
  "DPI 請用數字，最多兩位小數",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter the pixels as a whole number.",
  "Enter the DPI as a number, with at most two decimal places.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "品質分級是依一般觀看距離的常見經驗值，不是業界標準。",
  "Quality bands are common rules of thumb for typical viewing distances, not an industry standard.",
  "已載入範例，請按「計算沖印尺寸」執行。",
  "Example loaded. Run “Calculate print sizes” to compute it.",
  "無標準尺寸符合此 DPI",
  "No standard size fits at this DPI",
  "最大可印尺寸",
  "需求像素",
  "實際 DPI",
  "Largest print size",
  "Required pixels",
  "Effective DPI",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local
// assets, the pinned FAQ answers and quality disclosure, and no
// production canonical / absolute URLs.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "照片沖印尺寸計算｜Gloss Tools",
    description:
      "輸入照片像素與目標 DPI，算出最大可沖印尺寸、各標準尺寸的實際 DPI 與品質分級，或反推指定尺寸需要的像素。",
    h1: "照片沖印尺寸計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "僅「最大可印尺寸」與「實際 DPI」模式啟用。",
    disclaimer:
      "品質分級是依一般觀看距離的常見經驗值，不是業界標準。",
    sizeOption: "4×6 相片（6 × 4 英寸）",
    sizeOptionA4: "A4（29.7 × 21.0 公分）",
    draftNote: "切換語言或離開頁面會失去草稿。",
    faq: [
      "為什麼橫式和直式照片的判定一樣？",
      "尺寸表方向無關，長邊對長邊、短邊對短邊，橫直式不影響可印性。",
      "品質分級是業界標準嗎？",
      "不是，是依一般觀看距離（約手臂長度）的常見經驗值；大尺寸照片通常站得更遠看，低於 150 DPI 也可能可接受。",
      "照片比例和紙張比例不同會怎樣？",
      "本工具假設全幅列印、不裁切，逐邊 DPI 以完整畫面計算；實際送印時店家可能裁切或加白邊，請以店家說明為準。",
      "需要上傳照片嗎？",
      "不用，也沒有上傳功能；只要在檔案資訊裡查到的像素寬高數字，全部計算都在本頁離線完成。",
      "螢幕上看照片要算哪個？",
      "螢幕的細緻度看「螢幕 PPI 計算」，本工具只處理印到紙上的 DPI。",
    ],
    assets: ['href="./styles/photo-print-size.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Photo Print Size Calculator | Gloss Tools",
    description:
      "Enter a photo's pixel dimensions and a target DPI to find its largest printable size, the effective DPI and quality band at each standard size, or the pixels a chosen size requires.",
    h1: "Photo Print Size Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "Enabled only in “Largest print size” and “Effective DPI” modes.",
    disclaimer:
      "Quality bands are common rules of thumb for typical viewing distances, not an industry standard.",
    sizeOption: "4×6 photo (6 × 4 in)",
    sizeOptionA4: "A4 (29.7 × 21.0 cm)",
    draftNote: "Switching language or leaving the page discards the draft.",
    faq: [
      "Why do landscape and portrait photos get the same verdicts?",
      "The size table is orientation-free — long side to long side, short side to short side — so orientation never changes printability.",
      "Are the quality bands an industry standard?",
      "No. They are common rules of thumb for a typical viewing distance (about arm's length); large prints are usually viewed from farther away, so below 150 DPI can still look fine.",
      "What if the photo's aspect ratio differs from the paper's?",
      "This tool assumes full-frame printing without cropping and computes per-side DPI for the whole frame. A print shop may crop or add borders instead; check with the shop.",
      "Do I need to upload my photo?",
      "No, and there is no upload feature. You only type the pixel width and height from the file's properties; everything is computed offline on this page.",
      "What about viewing on a screen?",
      "Screen sharpness is the Screen PPI Calculator's job; this tool only covers printing on paper.",
    ],
    assets: ['href="../styles/photo-print-size.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes("https://")) fail(`${page.path}: preview must not contain any absolute URL`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned quality disclosure`);
  if (!html.includes(page.sizeOption)) fail(`${page.path}: missing size option label`);
  if (!html.includes(page.sizeOptionA4)) fail(`${page.path}: missing A4 size option label`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of ["mode-max", "mode-need", "mode-check", "pixelsW", "pixelsH", "dpi", "sizeId"]) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
  }
  for (const field of expectedFields) {
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "status",
    "results",
    "result-summary",
    "result-sub",
    "result-details",
    "disclaimer",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
    "example-note",
    "dpi-preset-150",
    "dpi-preset-240",
    "dpi-preset-300",
  ]) {
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
  const coreSource = await readFile(
    resolve(PROJECT_ROOT, "public/js/core/photo-print-size.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "photo-print-size-calculator-worker-"));
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
// itself is excluded).
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
// or the controller. The app may touch the DOM only; it must not touch
// storage at all (SPEC forbids persistent storage).
for (const purePath of [
  "public/js/core/photo-print-size.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/size table/labels/status/ranges/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
