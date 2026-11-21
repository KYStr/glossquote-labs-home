// Static project checks for the Lighting Lumen Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, raw limits, defaults, the target illuminance
// table with its pinned source lines, the example equals the
// living-dimensions-basic fixture, the pinned bilingual strings in the
// app, bilingual metadata and the preview noindex / CSP /
// no-production-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan.
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
  "public/js/core/lighting-lumen.mjs",
  "public/styles/lighting-lumen.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/lighting-lumen-core.test.mjs",
  "test/lighting-lumen-controller.test.mjs",
  "test/lighting-lumen-report.test.mjs",
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
// does not match its own scan. The draft is never persisted (SPEC
// userFlow: switching language or leaving the page discards it), so
// localStorage and sessionStorage are forbidden everywhere in the
// shipped sources, unlike sibling tools that pin draft persistence.
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

// Core contract: field order, raw limits, defaults, the target
// illuminance table with labels and source lines, report constants,
// and the example must match the SPEC and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/lighting-lumen.mjs")).href);
const expectedFields = ["mode", "lengthM", "widthM", "areaUnit", "areaValue", "roomType", "bulbLumens"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { lengthM: 8, widthM: 8, areaValue: 8, bulbLumens: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "dimensions",
  lengthM: "4.0",
  widthM: "3.5",
  areaUnit: "m2",
  areaValue: "20.00",
  roomType: "living",
  bulbLumens: "800",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (SPEC userFlow)");
}
const expectedTargetLux = {
  living: 100,
  bedroom: 75,
  kitchen: 100,
  bathroom: 100,
  study: 300,
  corridor: 100,
};
if (canonical(core.ROOM_TARGET_LUX) !== canonical(expectedTargetLux)) {
  fail("core: ROOM_TARGET_LUX table differs from SPEC scope");
}
const expectedRoomTypes = {
  living: {
    lux: 100,
    label: { zh: "客廳", en: "Living room" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 起居室·一般活動",
      en: "GB 50034-2013 Table 5.1.1, living room — general activity",
    },
  },
  bedroom: {
    lux: 75,
    label: { zh: "臥室", en: "Bedroom" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 臥室·一般活動",
      en: "GB 50034-2013 Table 5.1.1, bedroom — general activity",
    },
  },
  kitchen: {
    lux: 100,
    label: { zh: "廚房", en: "Kitchen" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 廚房·一般活動",
      en: "GB 50034-2013 Table 5.1.1, kitchen — general activity",
    },
  },
  bathroom: {
    lux: 100,
    label: { zh: "浴室", en: "Bathroom" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 衛生間",
      en: "GB 50034-2013 Table 5.1.1, bathroom",
    },
  },
  study: {
    lux: 300,
    label: { zh: "書房／辦公", en: "Study / office" },
    source: {
      zh: "GB 50034-2013 表 5.1.1 起居室·書寫、閱讀",
      en: "GB 50034-2013 Table 5.1.1, living room — writing and reading",
    },
  },
  corridor: {
    lux: 100,
    label: { zh: "走廊", en: "Corridor" },
    source: {
      zh: "EN 12464-1:2021 流通區域與走廊",
      en: "EN 12464-1:2021, circulation areas and corridors",
    },
  },
};
if (canonical(core.ROOM_TYPES) !== canonical(expectedRoomTypes)) {
  fail("core: ROOM_TYPES labels/sources differ from SPEC scope");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "lighting-lumen-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入房間資訊，或載入範例。", en: "Enter the room details, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
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
if (fixturesHash !== "a1d297f5f221dc9b2730fa8e01b63f55901ddb0cfced5509350a0f553d7629d0") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const livingBasic = fixtures.cases.find((entry) => entry.id === "living-dimensions-basic");
if (canonical(core.EXAMPLE) !== canonical(livingBasic.input)) {
  fail("core: EXAMPLE must equal the living-dimensions-basic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the room source line, the simplification disclaimer and the
// example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "數字格式不正確，請檢查小數位數",
  "長度請用數字，最多一位小數",
  "寬度請用數字，最多一位小數",
  "面積請用數字，最多兩位小數",
  "每顆流明請用整數",
  "超出允許範圍",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Check the number format and decimal places.",
  "Enter the length in metres with at most one decimal place.",
  "Enter the width in metres with at most one decimal place.",
  "Enter the area as a number with at most two decimal places.",
  "Enter the lumens per bulb as a whole number.",
  "Out of range.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "未計利用係數與維護係數，為簡化估算",
  "Simplified estimate: utilisation and maintenance factors are not applied.",
  "已載入範例，請按「計算所需流明」執行。",
  "Example loaded. Run “Calculate required lumens” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local assets,
// the pinned FAQ answers and simplification disclaimer. Per SPEC tests
// the candidate pages carry NO production canonical, hreflang or
// sitemap (the planned origin is not configured yet), so no https URL
// may appear in either page.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "照明流明計算｜Gloss Tools",
    description:
      "輸入房間長寬或面積，依房間用途的目標照度，算出需要的總流明與要裝幾顆燈泡。",
    h1: "照明流明計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "0.5–100.0 公尺，最多一位小數。",
    disclaimer: "未計利用係數與維護係數，為簡化估算",
    faq: [
      "這個結果是專業照明設計嗎？",
      "不是，這是未計利用係數與維護係數的簡化流明法估算；實際需求受燈具配光、牆面顏色與天花板高度影響。",
      "為什麼實際照度比目標高？",
      "燈泡只能整顆裝，顆數無條件進位，裝設總流明因此高於需求，實際照度也隨之高於目標。",
      "坪怎麼換算成平方公尺？",
      "1 坪 = 400/121 m²，約 3.3058 m²；本工具以精確分數計算，只在顯示時捨入。",
      "目標照度是哪來的？",
      "主要取自 GB 50034-2013 表 5.1.1 的一般活動值，走廊取 EN 12464-1:2021；各標準建議值不同，這只是單一釘版來源。",
    ],
    assets: ['href="./styles/lighting-lumen.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Lighting Lumen Calculator | Gloss Tools",
    description:
      "Enter a room's dimensions or area to get the total lumens and bulb count needed for a target illuminance by room type.",
    h1: "Lighting Lumen Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "0.5–100.0 m, at most one decimal place.",
    disclaimer:
      "Simplified estimate: utilisation and maintenance factors are not applied.",
    faq: [
      "Is this a professional lighting design?",
      "No. It is a simplified lumen-method estimate without utilisation or maintenance factors; luminaire distribution, surface colours and ceiling height all change real needs.",
      "Why is the achieved illuminance above the target?",
      "Bulbs come in whole units, so the count is rounded up and the installed lumens exceed the requirement.",
      "How is a ping converted to square metres?",
      "1 ping = 400/121 m², about 3.3058 m²; the tool computes with the exact fraction and rounds only for display.",
      "Where do the target values come from?",
      "Mainly the general-activity values in Table 5.1.1 of GB 50034-2013, with corridors from EN 12464-1:2021; standards differ, and this is one pinned source.",
    ],
    assets: ['href="../styles/lighting-lumen.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: no production canonical in preview`);
  if (html.includes("hreflang")) fail(`${page.path}: no hreflang in preview`);
  // No https URLs at all in a preview page (no canonical / og:url).
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected 0 https URLs in preview, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned simplification disclaimer`);
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
  for (const id of ["status", "results", "result-summary", "result-area", "result-target", "result-total", "result-count", "result-installed", "result-achieved", "disclaimer", "room-source", "run-btn", "cancel-btn", "example-btn", "reset-btn", "download-btn", "example-note"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/lighting-lumen.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "lighting-lumen-calculator-worker-"));
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
// or the controller. The app must not touch storage either: the draft
// is never persisted (SPEC userFlow).
for (const purePath of [
  "public/js/core/lighting-lumen.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/target-lux table/room sources/labels/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
