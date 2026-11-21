// Static project checks for the Baking Pan Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, the full 11-row pan table, the
// example equals the first fixture input, the pinned bilingual strings
// in the app, bilingual metadata and the candidate noindex / CSP rules),
// core purity (no DOM/network/storage), syntax of every shipped script,
// the fixed worker-source concatenation, and a forbidden-capability
// scan. Exits non-zero on the first failure list.

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
  "public/js/core/baking-pan-converter.mjs",
  "public/styles/baking-pan-converter.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/baking-pan-converter-core.test.mjs",
  "test/baking-pan-converter-controller.test.mjs",
  "test/baking-pan-converter-report.test.mjs",
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
// does not match its own scan. The SPEC forbids persistent storage, so
// storage tokens are forbidden everywhere scanned; only the pinned
// https-free pages are allowed, so no absolute URL may appear in them.
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

// Core contract: field order, raw limits, defaults, the pinned pan
// table, report constants, status strings, and the example.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/baking-pan-converter.mjs")).href
);
const expectedFields = [
  "sourceKind",
  "sourcePan",
  "sourceShape",
  "sourceD1",
  "sourceD2",
  "sourceDepth",
  "targetKind",
  "targetPan",
  "targetShape",
  "targetD1",
  "targetD2",
  "targetDepth",
  "quantity",
  "quantityUnit",
];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  sourceKind: 8,
  sourcePan: 12,
  sourceShape: 8,
  sourceD1: 8,
  sourceD2: 8,
  sourceDepth: 8,
  targetKind: 8,
  targetPan: 12,
  targetShape: 8,
  targetD1: 8,
  targetD2: 8,
  targetDepth: 8,
  quantity: 10,
  quantityUnit: 4,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  sourceKind: "table",
  sourcePan: "round-8",
  sourceShape: "round",
  sourceD1: "",
  sourceD2: "",
  sourceDepth: "",
  targetKind: "table",
  targetPan: "round-9",
  targetShape: "round",
  targetD1: "",
  targetD2: "",
  targetDepth: "",
  quantity: "",
  quantityUnit: "g",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = { ...expectedDefaults, quantity: "500" };
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE mismatch");
}
if (core.DIMENSION_MIN_CM !== 5 || core.DIMENSION_MAX_CM !== 60) {
  fail("core: dimension range must be 5-60 cm");
}
if (core.DEPTH_MIN_CM !== 1 || core.DEPTH_MAX_CM !== 15) {
  fail("core: depth range must be 1-15 cm");
}
if (core.QUANTITY_MAX !== 100000) fail("core: QUANTITY_MAX must be 100000");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "baking-pan-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedPanTable = [
  { id: "round-6", nameZh: "圓形 6 吋", nameEn: "6-inch round", sizeIn: "⌀6 × 2", sizeCm: "⌀15.24 × 5.08", depthCm: 5.08, volumeMl: 927, basis: "geometric" },
  { id: "round-7", nameZh: "圓形 7 吋", nameEn: "7-inch round", sizeIn: "⌀7 × 2", sizeCm: "⌀17.78 × 5.08", depthCm: 5.08, volumeMl: 1261, basis: "geometric" },
  { id: "round-8", nameZh: "圓形 8 吋", nameEn: "8-inch round", sizeIn: "⌀8 × 2", sizeCm: "⌀20.32 × 5.08", depthCm: 5.08, volumeMl: 1647, basis: "geometric" },
  { id: "round-9", nameZh: "圓形 9 吋", nameEn: "9-inch round", sizeIn: "⌀9 × 2", sizeCm: "⌀22.86 × 5.08", depthCm: 5.08, volumeMl: 2085, basis: "geometric" },
  { id: "round-10", nameZh: "圓形 10 吋", nameEn: "10-inch round", sizeIn: "⌀10 × 2", sizeCm: "⌀25.40 × 5.08", depthCm: 5.08, volumeMl: 2574, basis: "geometric" },
  { id: "square-8", nameZh: "方形 8×8 吋", nameEn: "8×8-inch square", sizeIn: "8×8 × 2", sizeCm: "20.32×20.32 × 5.08", depthCm: 5.08, volumeMl: 2098, basis: "geometric" },
  { id: "square-9", nameZh: "方形 9×9 吋", nameEn: "9×9-inch square", sizeIn: "9×9 × 2", sizeCm: "22.86×22.86 × 5.08", depthCm: 5.08, volumeMl: 2655, basis: "geometric" },
  { id: "rect-9x13", nameZh: "長方形 9×13 吋", nameEn: "9×13-inch rectangular", sizeIn: "9×13 × 2", sizeCm: "22.86×33.02 × 5.08", depthCm: 5.08, volumeMl: 3835, basis: "geometric" },
  { id: "loaf-9x5", nameZh: "吐司／磅蛋糕模 9×5 吋", nameEn: "9×5-inch loaf", sizeIn: "9×5 × 2.5", sizeCm: "22.86×12.70 × 6.35", depthCm: 6.35, volumeMl: 1844, basis: "geometric" },
  { id: "bundt-10", nameZh: "Bundt 模 10 吋（標稱 12 杯）", nameEn: "10-inch Bundt (nominal 12 cups)", sizeIn: "10 × 3.5", sizeCm: "—", depthCm: null, volumeMl: 2844, basis: "nominal" },
  { id: "tube-10", nameZh: "中空蛋糕模 10 吋（標稱 16 杯）", nameEn: "10-inch tube (nominal 16 cups)", sizeIn: "10 × 4", sizeCm: "—", depthCm: null, volumeMl: 3792, basis: "nominal" },
];
if (canonical(core.PAN_TABLE) !== canonical(expectedPanTable)) {
  fail("core: PAN_TABLE differs from SPEC inputsOutputs");
}
const expectedStatus = {
  empty: { zh: "請輸入來源與目標烤盤，或載入範例。", en: "Enter a source and a target pan, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "換算完成", en: "Conversion complete" },
  error: { zh: "無法換算，請檢查輸入", en: "Cannot convert — check input" },
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
if (fixturesHash !== "9e4fb7ea7d084df5c9e3817a690f2881104179512559972c3ef9bb0984c22272") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const firstCase = fixtures.cases[0];
if (firstCase.id !== "table-upscale-round") {
  fail("test/fixtures.json: first case must be table-upscale-round");
}
if (canonical(core.EXAMPLE) !== canonical(firstCase.input)) {
  fail("core: EXAMPLE must equal the table-upscale-round fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the depth hints, the capacity disclosure and the example
// note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "請用數字，最多 2 位小數",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter a number with at most 2 decimal places.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "相同的麵糊量在較淺的烤盤中攤得較薄，通常熟得比較快——請提早檢查熟度。本工具只換算份量，不調整烘烤時間或溫度。",
  "相同的麵糊量在較深的烤盤中會更厚，通常需要更久才熟——請以牙籤或探針確認中心熟度。本工具只換算份量，不調整烘烤時間或溫度。",
  "有一側是標稱容量烤盤，沒有可比的深度。",
  "Shallower: the same amount of batter spreads thinner in a shallower pan and usually bakes faster — start checking for doneness early. This tool scales quantities only; it does not adjust baking time or temperature.",
  "Deeper: the same amount of batter sits thicker in a deeper pan and usually needs longer to bake through — check the centre with a skewer or probe. This tool scales quantities only; it does not adjust baking time or temperature.",
  "One side is a nominal-capacity pan, so depths cannot be compared.",
  "已載入範例，請按「換算」執行。",
  "Example loaded. Run “Convert” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned capacity disclosure and FAQ answers. The preview carries
// no production canonical, hreflang, sitemap, or absolute URL (SPEC).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "烤盤尺寸換算｜Gloss Tools",
    description:
      "選來源與目標烤盤，以容量比算出麵糊換算倍率與份量；11 種常見烤盤容量由標稱尺寸幾何推導，Bundt 與中空模用標稱容量並明示。",
    h1: "烤盤尺寸換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "5–60 公分，最多 2 位小數。",
    disclosure:
      "表格體積以標稱尺寸的直壁幾何計算；實際烤盤多有斜壁與圓角，容量會略有差異。標稱列（Bundt／中空模）採標準換算表的標示容量，不是幾何值。",
    faq: [
      "倍率怎麼看？",
      "倍率 = 目標盤容量 ÷ 來源盤容量。大於 1 表示要做更多麵糊，小於 1 表示減量。",
      "為什麼 Bundt 模和中空模用標稱容量？",
      "它們的形狀（溝紋、中央管）不是單純的圓柱或方體，幾何公式算不出實容量，所以採用標準換算表的標示容量並標明 nominal。",
      "可以換算每種食材的重量嗎？",
      "不行。本工具只換算一份麵糊的總量；食材配比換算請用烘焙百分比計算。",
    ],
    assets: ['href="./styles/baking-pan-converter.css"', 'src="./js/app.js"'],
    tableRow: "<td>Bundt 模 10 吋（標稱 12 杯）</td><td>10 × 3.5</td><td>—</td>",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Baking Pan Converter | Gloss Tools",
    description:
      "Scale batter between two pans by capacity ratio: 11 common pans with volumes derived geometrically from their nominal dimensions, Bundt and tube pans by labelled nominal capacity.",
    h1: "Baking Pan Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "5–60 cm, at most 2 decimal places.",
    disclosure:
      "Table volumes use straight-sided geometry at the nominal dimensions; real pans taper and have rounded corners, so actual capacity differs slightly. Nominal rows (Bundt / tube) use the labelled capacity from a standard conversion chart, not a geometric value.",
    faq: [
      "How do I read the factor?",
      "Factor = target pan volume ÷ source pan volume. Above 1 means make more batter; below 1 means make less.",
      "Why do Bundt and tube pans use nominal capacity?",
      "Their shapes (flutes, a centre tube) are not a plain cylinder or box, so no geometric formula gives the real capacity; the labelled capacity from a standard conversion chart is used and marked nominal.",
      "Can it scale each ingredient's weight?",
      "No. This tool scales one total batter quantity only; for ingredient-ratio conversions use the Baker's Percentage Calculator.",
    ],
    assets: ['href="../styles/baking-pan-converter.css"', 'src="../js/app.js"'],
    tableRow: "<td>10-inch Bundt (nominal 12 cups)</td><td>10 × 3.5</td><td>—</td>",
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
  if (html.includes("https://")) fail(`${page.path}: preview must not contain absolute URLs`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.disclosure)) fail(`${page.path}: missing pinned capacity disclosure`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  if (!html.includes(page.tableRow)) fail(`${page.path}: missing pinned nominal table row`);
  for (const field of expectedFields) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "status",
    "results",
    "factor-value",
    "result-source",
    "result-target",
    "result-percent",
    "result-scaled",
    "result-depth",
    "depth-hint",
    "disclaimer",
    "run-btn",
    "cancel-btn",
    "example-btn",
    "reset-btn",
    "download-btn",
    "example-note",
  ]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id="${id}"`);
  }
  for (const panId of core.PAN_IDS) {
    if (!html.includes(`value="${panId}"`)) fail(`${page.path}: missing pan option ${panId}`);
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
    resolve(PROJECT_ROOT, "public/js/core/baking-pan-converter.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "baking-pan-converter-worker-"));
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
// or the controller. No shipped page code may touch persistent storage.
for (const purePath of [
  "public/js/core/baking-pan-converter.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (purePath === "public/js/app.js" && (token === "document" || token === "window")) continue;
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: pure module must not reference ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/pan table/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
