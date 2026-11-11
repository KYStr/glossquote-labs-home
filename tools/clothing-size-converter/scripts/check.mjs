// Static project checks for the Clothing Size Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order and raw limits, enum lists, defaults, both fixed size
// tables cell by cell, example equals fixtures.json case 1, the pinned
// bilingual strings in the app including the verbatim disclaimer, the
// pinned bilingual page metadata/FAQ and the candidate
// noindex/no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source concatenation,
// and a forbidden-capability scan.
// Exits non-zero on the first failure list.

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
  "public/js/core/clothing.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
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
// does not match its own scan.
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

// Core contract: field order, raw limits, enum lists, defaults, the
// measurement window, both fixed tables cell by cell, report constants,
// and the example must match the SPEC and fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/clothing.mjs")).href);
const expectedFields = ["garment", "mode", "measurementCm", "fromSystem", "sizeValue"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
if (
  canonical(core.RAW_LIMITS) !==
  canonical({ garment: 5, mode: 11, measurementCm: 5, fromSystem: 2, sizeValue: 4 })
) {
  fail("core: RAW_LIMITS mismatch");
}
if (JSON.stringify(core.GARMENTS) !== JSON.stringify(["women", "men"])) {
  fail("core: GARMENTS mismatch");
}
if (JSON.stringify(core.MODES) !== JSON.stringify(["measurement", "size"])) {
  fail("core: MODES mismatch");
}
if (JSON.stringify(core.SYSTEMS) !== JSON.stringify(["us", "uk", "eu", "jp"])) {
  fail("core: SYSTEMS mismatch");
}
const expectedDefaults = {
  garment: "women",
  mode: "measurement",
  measurementCm: "",
  fromSystem: "us",
  sizeValue: "",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.MEASUREMENT_MIN_MM !== 500 || core.MEASUREMENT_MAX_MM !== 2000) {
  fail("core: measurement window must be 500–2000 mm");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "clothing-size-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
function tableFromArrays(rows) {
  return rows.map(([row, cmLow, cmHigh, usLetter, usNumeric, ukNumeric, euNumeric, jpLetter, jpNumeric]) => ({
    row,
    cmLow,
    cmHigh,
    usLetter,
    usNumeric,
    ukNumeric,
    euNumeric,
    jpLetter,
    jpNumeric,
  }));
}
const expectedWomen = tableFromArrays([
  [1, 74, 79, "XXS", "0", "4", "30", null, "3"],
  [2, 79, 84, "XS", "2", "6", "32", null, "5"],
  [3, 84, 89, "S", "4", "8", "34", "S", "7"],
  [4, 89, 94, "M", "6", "10", "36", "M", "9"],
  [5, 94, 99, "L", "8", "12", "38", "L", "11"],
  [6, 99, 104, "XL", "10", "14", "40", "LL", "13"],
  [7, 104, 110, "XXL", "12", "16", "42", null, "15"],
  [8, 110, 116, "XXXL", "14", "18", "44", null, "17"],
]);
const expectedMen = tableFromArrays([
  [1, 86, 91, "XS", "34", "34", "44", "S", null],
  [2, 91, 96, "S", "36", "36", "46", "M", null],
  [3, 96, 101, "M", "38", "38", "48", "L", null],
  [4, 101, 106, "L", "40", "40", "50", "XL", null],
  [5, 106, 111, "XL", "42", "42", "52", "2L", null],
  [6, 111, 116, "XXL", "44", "44", "54", "3L", null],
  [7, 116, 121, "XXXL", "46", "46", "56", "4L", null],
]);
if (canonical(core.WOMEN_ROWS) !== canonical(expectedWomen)) {
  fail("core: WOMEN_ROWS must be the SPEC's fixed 8-row table, cell by cell");
}
if (canonical(core.MEN_ROWS) !== canonical(expectedMen)) {
  fail("core: MEN_ROWS must be the SPEC's fixed 7-row table, cell by cell");
}
if (canonical(core.ROWS) !== canonical({ women: expectedWomen, men: expectedMen })) {
  fail("core: ROWS must map women/men to the fixed tables");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (
  fixtures.slug !== "clothing-size-converter" ||
  fixtures.specId !== "spec-clothing-size-converter-20261109"
) {
  fail("test/fixtures.json: not the clothing-size-converter spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 18) {
  fail("test/fixtures.json: expected 18 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the SPEC-pinned strings verbatim, both languages:
// error messages, flow-state strings, and the fixed brand disclaimer.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "請輸入公分數，最多一位小數",
  "尺寸代碼只能使用英文字母與數字，且數字不得有前導零",
  "對照表中沒有這個尺寸代碼",
  "超出允許範圍（50.0–200.0 cm）",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter centimetres with at most one decimal place.",
  "A size code uses ASCII letters and digits only, with no leading zero on numbers.",
  "That size code is not in the reference chart.",
  "Out of range (50.0–200.0 cm).",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "尺寸表因品牌而異：本工具使用單一固定對照表，不同品牌的版型與標示可能不同，請以該品牌官方尺寸表與實際試穿為準。",
  "Size charts vary by brand: this tool uses one fixed reference chart. Fit and labelling differ between brands, so check the brand's official size chart and try the garment on whenever possible.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// pinned FAQ answers, the verbatim disclaimer, the draft-loss note, and
// all field/error element ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "服飾尺寸換算｜Gloss Tools",
    description:
      "男裝與女裝上衣尺寸對照：輸入胸圍量測（公分）或任一制尺寸，立即查出 US、UK、EU、JP 的字母與數字尺寸。",
    h1: "服飾尺寸換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼同一個尺寸，不同品牌穿起來不一樣？",
      "尺寸表因品牌而異，本工具使用單一固定對照表，請以該品牌官方尺寸表與實際試穿為準。",
      "量測剛好等於尺寸表的邊界值時算哪一邊？",
      "區間為半開：量測等於某列下界時屬於該列；等於全表最高上界時視為超出對照表範圍。",
      "可以查鞋碼或褲子尺寸嗎？",
      "不行。本工具只對照上衣；鞋碼請用專門的鞋碼換算工具，下身尺寸不在範圍內。",
    ],
    disclaimer:
      "尺寸表因品牌而異：本工具使用單一固定對照表，不同品牌的版型與標示可能不同，請以該品牌官方尺寸表與實際試穿為準。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Clothing Size Converter | Gloss Tools",
    description:
      "Convert men's and women's top sizes between US, UK, EU and JP charts — from a chest or bust measurement in centimetres, or from a size in any one system.",
    h1: "Clothing Size Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why does the same size fit differently across brands?",
      "Size charts vary by brand. This tool uses one fixed reference chart, so check the brand's official size chart and try the garment on whenever possible.",
      "What happens when my measurement is exactly on a boundary?",
      "Ranges are half-open: a measurement equal to a row's lower edge belongs to that row; a measurement equal to the chart's top edge is outside the chart.",
      "Can I look up shoe or bottom sizes here?",
      "No. This tool covers tops only; shoe sizes have their own converter, and bottoms are out of scope.",
    ],
    disclaimer:
      "Size charts vary by brand: this tool uses one fixed reference chart. Fit and labelling differ between brands, so check the brand's official size chart and try the garment on whenever possible.",
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-garment",
  "field-mode",
  "field-measurementCm",
  "field-fromSystem",
  "field-sizeValue",
  "error-garment",
  "error-mode",
  "error-measurementCm",
  "error-fromSystem",
  "error-sizeValue",
  "women-table-rows",
  "men-table-rows",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing verbatim disclaimer`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id ${id}`);
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
    await execFileAsync(process.execPath, ["--check", file], { windowsHide: true });
  } catch (error) {
    fail(`${file}: syntax check failed: ${error.stderr ?? error.message}`);
  }
}
{
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/clothing.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "clothing-size-converter-worker-"));
  const tempFile = join(dir, "worker.mjs");
  try {
    await writeFile(tempFile, `${coreSource}\n${handlerSource}`, "utf8");
    await execFileAsync(process.execPath, ["--check", tempFile], { windowsHide: true });
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

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/clothing.mjs",
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

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/enums/defaults/tables/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
