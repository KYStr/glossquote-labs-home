// Static project checks for the Cooking Measurement Converter: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, example equals
// fixtures.json case 1, the pinned density table, the pinned bilingual
// error/status strings in the app, bilingual metadata and the candidate
// noindex/no-canonical rules, the static density table and FAQ in both
// pages), core purity (no DOM/network/storage), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero when any check fails.

import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  DEFAULTS,
  DENSITY,
  EXAMPLE,
  FIELDS,
  INGREDIENTS,
  ML_PER_UNIT,
  RAW_LIMITS,
  REPORT_FILENAME,
  UNITS,
} from "../public/js/core/convert.mjs";
import fixtures from "../test/fixtures.json" with { type: "json" };

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
  console.error(`FAIL: ${message}`);
}

function pass(message) {
  console.log(`ok: ${message}`);
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/convert.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/html.test.mjs",
  "test/build.test.mjs",
  "test/fixtures.json",
  "HANDOFF.md",
  "VERIFICATION.md",
];

const EXPECTED_SCRIPTS = {
  dev: "node scripts/serve.mjs",
  test: "node --test test/*.test.mjs",
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

async function read(relative) {
  return readFile(resolve(PROJECT_ROOT, relative), "utf8");
}

// --- Required files -------------------------------------------------------
for (const path of REQUIRED_PATHS) {
  try {
    const info = await lstat(resolve(PROJECT_ROOT, path));
    if (!info.isFile()) fail(`Required path is not a file: ${path}`);
  } catch {
    fail(`Missing required path: ${path}`);
  }
}
pass("required files present");

// --- Package contract -----------------------------------------------------
const pkg = JSON.parse(await read("package.json"));
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
pass("package contract");

// --- Core pinned data -------------------------------------------------------
if (JSON.stringify(FIELDS) !== JSON.stringify(["amount", "fromUnit", "toUnit", "ingredient"])) {
  fail("core: FIELDS order mismatch");
}
if (JSON.stringify(RAW_LIMITS) !== JSON.stringify({ amount: 12, fromUnit: 4, toUnit: 4, ingredient: 32 })) {
  fail("core: RAW_LIMITS mismatch");
}
if (JSON.stringify(UNITS) !== JSON.stringify(["ml", "tsp", "tbsp", "cup", "g"])) {
  fail("core: UNITS mismatch");
}
if (ML_PER_UNIT.ml !== 1n || ML_PER_UNIT.tsp !== 5n || ML_PER_UNIT.tbsp !== 15n || ML_PER_UNIT.cup !== 240n) {
  fail("core: volume basis must be exactly 1 / 5 / 15 / 240 ml");
}
const EXPECTED_DENSITY = [
  ["water", "水", "Water", 227],
  ["all-purpose-flour", "中筋麵粉", "All-Purpose Flour", 120],
  ["granulated-sugar", "細砂糖", "Granulated Sugar", 198],
  ["brown-sugar", "紅糖（壓實）", "Brown Sugar (packed)", 213],
  ["powdered-sugar", "糖粉", "Powdered Sugar", 113],
  ["butter", "奶油", "Butter", 227],
  ["vegetable-oil", "植物油", "Vegetable Oil", 198],
  ["honey", "蜂蜜", "Honey", 336],
  ["cocoa-powder", "可可粉（無糖）", "Cocoa Powder (unsweetened)", 84],
  ["milk", "牛奶", "Milk", 227],
  ["long-grain-rice", "長米（生）", "Long-Grain Rice (uncooked)", 198],
  ["rolled-oats", "燕麥片", "Rolled Oats", 89],
];
if (DENSITY.length !== EXPECTED_DENSITY.length) {
  fail(`core: density table must have ${EXPECTED_DENSITY.length} rows`);
}
EXPECTED_DENSITY.forEach(([id, zh, en, grams], i) => {
  const row = DENSITY[i];
  if (!row || row.id !== id || row.zh !== zh || row.en !== en || row.gramsPerCup !== grams) {
    fail(`core: density row ${i} mismatch (expected ${id}/${grams})`);
  }
});
if (JSON.stringify(INGREDIENTS) !== JSON.stringify([...EXPECTED_DENSITY.map((r) => r[0]), "none"])) {
  fail("core: INGREDIENTS must be the 12 table ids plus none");
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

if (canonical(DEFAULTS) !== canonical({ amount: "", fromUnit: "cup", toUnit: "g", ingredient: "all-purpose-flour" })) {
  fail("core: DEFAULTS mismatch with the SPEC reset defaults");
}
const firstCase = fixtures.cases[0];
if (firstCase.id !== "example-cup-flour-to-grams" || canonical(EXAMPLE) !== canonical(firstCase.input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (REPORT_FILENAME !== "cooking-measurement-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
pass("core pinned data (basis, density table, defaults, example)");

// --- Core purity ------------------------------------------------------------
const coreText = await read("public/js/core/convert.mjs");
if (/^\s*import\s/m.test(coreText) || /\bfrom\s+['"]/.test(coreText)) {
  fail("core: must not import anything");
}
for (const token of ["document", "window", "navigator", "Date", "localStorage", "XMLHttpRequest", "Worker"]) {
  if (coreText.includes(token)) fail(`core: forbidden token ${token}`);
}
pass("core purity");

// --- Forbidden-capability scan ----------------------------------------------
const scannedFiles = [
  ...(await collectFiles(resolve(PROJECT_ROOT, "public"))),
  resolve(PROJECT_ROOT, "scripts/build.mjs"),
  resolve(PROJECT_ROOT, "scripts/check-generated.mjs"),
  resolve(PROJECT_ROOT, "scripts/serve.mjs"),
];
for (const file of scannedFiles) {
  if (!SCANNED_EXTENSIONS.has(extname(file).toLowerCase())) continue;
  const text = await readFile(file, "utf8");
  for (const token of forbiddenTokens) {
    if (text.includes(token)) fail(`${file}: forbidden token present`);
  }
}
pass("no forbidden capabilities in shipped sources");

// --- Pinned app strings -------------------------------------------------------
const appText = await read("public/js/app.js");
const PINNED_APP_STRINGS = [
  // SPEC-pinned error messages, both languages.
  "資料格式不正確", "輸入超過長度上限", "輸入含有不完整的字元", "不可留空",
  "請輸入數字（可含小數點）", "請選擇有效的選項", "數值必須大於 0 且不超過 100,000",
  "重量與體積互換需要選擇食材", "報告超過大小上限", "處理失敗，請重試",
  "The data format is invalid", "Input exceeds the length limit",
  "Input contains an unpaired character", "Must not be empty",
  "Enter a number, with an optional decimal point", "Choose a valid option",
  "Value must be greater than 0 and at most 100,000",
  "Choose an ingredient to convert between weight and volume",
  "The report exceeds the size limit", "Something went wrong. Try again.",
  // SPEC-pinned state strings, both languages.
  "輸入已變更，請重新執行", "已取消，可重新執行", "處理中",
  "Input changed. Run again.", "Cancelled. You can run again.", "Working",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appText.includes(text)) fail(`app.js: missing pinned string: ${text}`);
}
if (/\bimport\(/.test(appText)) fail("app.js: dynamic import is not allowed");
pass("pinned app strings");

// --- HTML pages -----------------------------------------------------------------
const zh = await read("public/index.html");
const en = await read("public/en/index.html");
const REQUIRED_IDS = [
  "convert-form", "form-heading",
  "field-amount", "help-amount", "error-amount",
  "field-fromUnit", "error-fromUnit",
  "field-toUnit", "error-toUnit",
  "field-ingredient", "help-ingredient", "error-ingredient",
  "status", "example-note",
  "run-btn", "example-btn", "reset-btn", "cancel-btn", "download-btn",
  "results", "results-heading", "result-value",
  "result-fraction-row", "result-fraction-label", "result-fraction",
  "result-density", "faq-heading",
];
let zhIds = null;
for (const [name, html] of [["zh", zh], ["en", en]]) {
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
    fail(`${name}: missing robots noindex meta`);
  }
  if (/rel="canonical"/.test(html) || /hreflang/.test(html)) {
    fail(`${name}: preview must not carry canonical/hreflang`);
  }
  if (/<script(?![^>]*\bsrc=)/.test(html)) fail(`${name}: inline script found`);
  if (/\son\w+\s*=/.test(html)) fail(`${name}: inline event handler found`);
  for (const id of REQUIRED_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${name}: missing id="${id}"`);
  }
  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  if (name === "zh") zhIds = ids;
  else {
    const missing = [...zhIds].filter((id) => !ids.has(id));
    const extra = [...ids].filter((id) => !zhIds.has(id));
    if (missing.length > 0) fail(`en: ids missing vs zh: ${missing.join(", ")}`);
    if (extra.length > 0) fail(`en: extra ids vs zh: ${extra.join(", ")}`);
  }
  for (const [, zhName, enName, grams] of EXPECTED_DENSITY) {
    const rowHtml = `<td>${zhName}</td><td>${enName}</td><td>${grams}</td>`;
    if (!html.includes(rowHtml)) fail(`${name}: density table row missing or wrong: ${enName}/${grams}`);
  }
  for (const unit of UNITS) {
    if (!html.includes(`<option value="${unit}"`)) fail(`${name}: unit option missing: ${unit}`);
  }
  for (const id of INGREDIENTS) {
    if (!html.includes(`<option value="${id}"`)) fail(`${name}: ingredient option missing: ${id}`);
  }
}
if (!zh.includes('<html lang="zh-Hant">')) fail("zh: lang must be zh-Hant");
if (!zh.includes("<title>料理單位換算｜Gloss Tools</title>")) fail("zh: title mismatch");
if (!zh.includes("<h1>料理單位換算</h1>")) fail("zh: h1 mismatch");
if (!zh.includes("把杯、湯匙、茶匙、毫升與公克互相換算；麵粉、糖、奶油等 12 種食材的重量換算只經一張固定密度表。")) {
  fail("zh: description mismatch");
}
if (!zh.includes('href="../../"')) fail("zh: same-language home link must be ../../");
if (!en.includes('<html lang="en">')) fail("en: lang must be en");
if (!en.includes("<title>Cooking Measurement Converter | Gloss Tools</title>")) fail("en: title mismatch");
if (!en.includes("<h1>Cooking Measurement Converter</h1>")) fail("en: h1 mismatch");
if (!en.includes("Convert between cups, tablespoons, teaspoons, millilitres and grams, with weight conversions for 12 common ingredients through one fixed density table.")) {
  fail("en: description mismatch");
}
if (!en.includes('href="../../en/"')) fail("en: same-language home link must be ../../en/");
const PINNED_FAQ = [
  "這裡的 1 杯是幾毫升？", "釘版 240 ml（FDA 家用量測定義）；美國習慣單位的精確值是 236.588 ml，本工具不採用。",
  "為什麼 1 杯水不是 240 公克？", "密度表全表同源 King Arthur 食材重量表，水在該表為 227 g／杯；純體積換算（杯↔毫升）不查表。",
  "沒有我要的食材怎麼辦？", "重量與體積互換只能用表內 12 種食材；只換體積時選「不指定」即可，不需食材。",
  "How many millilitres is a cup here?", "A pinned 240 ml (the FDA household measure); the exact US customary cup is 236.588 ml and is not used.",
  "Why isn't a cup of water 240 grams?", "The density table follows one source, King Arthur's ingredient weight chart, which lists water at 227 g per cup; pure volume conversions never use the table.",
  "What if my ingredient is not listed?", "Weight-to-volume conversion only works for the 12 table ingredients; for volume-only conversions choose \"None\".",
];
for (const text of PINNED_FAQ) {
  if (!zh.includes(text) && !en.includes(text)) fail(`pages: missing pinned FAQ text: ${text}`);
}
pass("HTML metadata, id parity, density table, FAQ");

// --- Syntax of shipped scripts ---------------------------------------------------
const syntaxFiles = [
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/convert.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
];
const tempDir = await mkdtemp(join(tmpdir(), "cmc-syntax-"));
try {
  for (const [index, relative] of syntaxFiles.entries()) {
    const target = join(tempDir, `file-${index}.mjs`);
    await writeFile(target, await read(relative), "utf8");
    try {
      await execFileAsync(process.execPath, ["--check", target], { windowsHide: true });
    } catch {
      fail(`syntax: ${relative} does not parse`);
    }
  }
  // The embedded worker source (core + handler) must parse as one module.
  const workerTarget = join(tempDir, "worker.mjs");
  await writeFile(
    workerTarget,
    `${await read("public/js/core/convert.mjs")}\n${await read("public/js/worker-handler.mjs")}`,
    "utf8",
  );
  try {
    await execFileAsync(process.execPath, ["--check", workerTarget], { windowsHide: true });
  } catch {
    fail("syntax: concatenated worker source does not parse");
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
pass("syntax of shipped scripts and worker concatenation");

if (failures.length > 0) {
  console.error(`${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("all static checks passed");
