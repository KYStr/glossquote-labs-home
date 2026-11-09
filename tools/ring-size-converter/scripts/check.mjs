// Static project checks for the Ring Size Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, source list, value raw limit, defaults, the fixed 21-row
// standard table, the fit tolerance, example equals fixtures.json case 1,
// the pinned bilingual strings in the app, bilingual metadata and the
// candidate noindex/no-canonical rules), core purity (no DOM/network/
// storage), syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan.
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
  "public/js/core/ring.mjs",
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

// Core contract: field order, source list, value raw limit, defaults, the
// fixed 21-row table, the fit tolerance, report constants, and the example
// must match the SPEC and fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/ring.mjs")).href);
if (JSON.stringify(core.FIELDS) !== JSON.stringify(["source", "value"])) {
  fail("core: FIELDS order mismatch");
}
const expectedSources = ["circumference", "diameter", "us", "eu", "jp", "uk"];
if (JSON.stringify(core.SOURCES) !== JSON.stringify(expectedSources)) {
  fail("core: SOURCES mismatch");
}
if (core.VALUE_RAW_LIMIT !== 8) fail("core: VALUE_RAW_LIMIT must be 8");
const expectedDefaults = { source: "circumference", value: "" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "ring-size-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.FIT_TOLERANCE_H !== 30) fail("core: FIT_TOLERANCE_H must be 30 (0.30 mm)");
const expectedRows = [
  [4420, "3", "F½"], [4550, "3.5", "G½"], [4680, "4", "H½"], [4800, "4.5", "I½"],
  [4930, "5", "J½"], [5060, "5.5", "K½"], [5190, "6", "L½"], [5310, "6.5", "M½"],
  [5440, "7", "N½"], [5570, "7.5", "O½"], [5700, "8", "P½"], [5830, "8.5", "Q½"],
  [5950, "9", "R½"], [6080, "9.5", "S½"], [6210, "10", "T½"], [6340, "10.5", "U½"],
  [6460, "11", "V½"], [6590, "11.5", "W½"], [6720, "12", "X½"], [6850, "12.5", "Y½"],
  [6970, "13", "Z½"],
].map(([circH, usSize, ukSize]) => ({ circH, usSize, ukSize }));
if (canonical(core.ROWS) !== canonical(expectedRows)) {
  fail("core: ROWS must be the SPEC's fixed 21-row table");
}
if (JSON.stringify(core.UK_LABELS) !== JSON.stringify(expectedRows.map((row) => row.ukSize))) {
  fail("core: UK_LABELS must be the table's UK column in order");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "ring-size-converter" || fixtures.specId !== "spec-ring-size-converter-20261109") {
  fail("test/fixtures.json: not the ring-size-converter spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the SPEC-pinned strings verbatim, both languages:
// error messages, flow-state strings, the fit labels, and the two fixed
// result notes.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "請輸入數字，最多兩位小數",
  "請輸入整數",
  "超出允許範圍",
  "美圍須為 0.5 的倍數",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter a number with at most two decimal places.",
  "Enter a whole number.",
  "Out of range.",
  "US size must be a multiple of 0.5.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "吻合",
  "Exact match",
  "介於兩尺寸之間",
  "Between sizes",
  "未滿日圍 1 號",
  "Below Japan size 1",
  "差距 0.3 mm 以內視為吻合。",
  "A difference of up to 0.3 mm counts as an exact match.",
  "各品牌尺寸可能略有差異，購買前請先實測。",
  "Sizes vary slightly by brand; measure before buying.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// pinned FAQ answers, the draft-loss note, and both value controls.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "戒圍換算｜Gloss Tools",
    description: "輸入任一戒圍系統（內圍、內徑、美圍、歐圍、日圍、英圍），立即換算全部系統與最接近的標準尺寸。",
    h1: "戒圍換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "日圍怎麼算？",
      "依日本 JIS S 4700 的直徑定義：1 號內徑 13.0 mm，每升一號內徑增加 1/3 mm；本工具由內圍換算內徑後四捨五入得出，各品牌可能差一號。",
      "顯示「介於兩尺寸之間」怎麼辦？",
      "內圍與最接近的標準尺寸差距超過 0.3 mm 時，會同時列出相鄰的另一尺寸；配戴上通常建議選較大的一邊，並以實測為準。",
      "各品牌尺寸可能略有差異，購買前請先實測。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Ring Size Converter | Gloss Tools",
    description:
      "Enter a ring size in any system — inside circumference, inside diameter, US, EU, Japan or UK — and convert it to all the others plus the nearest standard size.",
    h1: "Ring Size Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is the Japan size derived?",
      "From the JIS S 4700 diameter definition: size 1 has a 13.0 mm inside diameter and each size adds 1/3 mm. This tool converts the circumference to a diameter and rounds; brands may differ by one size.",
      'What if the result says "between sizes"?',
      "When the circumference is more than 0.3 mm from the nearest standard size, the adjacent size is shown too. Most wearers size up, and a physical measurement decides.",
      "Sizes vary slightly by brand; measure before buying.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-source", "field-value", "field-value-uk", "error-source", "error-value"];
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
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id ${id}`);
  }
  for (const label of expectedRows.map((row) => row.ukSize)) {
    if (!html.includes(`<option value="${label}">`)) {
      fail(`${page.path}: missing UK option ${label}`);
    }
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/ring.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "ring-size-converter-worker-"));
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

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/ring.mjs",
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
  "Check passed: files, package contract, core fields/sources/limits/defaults/table/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
