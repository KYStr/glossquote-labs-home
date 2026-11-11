// Static project checks for the Wallpaper Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (reset defaults equal the SPEC's pinned object, the example equals
// fixtures.json case 1, TRIM and row limits, the pinned bilingual strings
// in the app, bilingual metadata and the candidate noindex/no-canonical
// rules), core purity (no DOM/network/storage), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure list.

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

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/wallpaper.mjs",
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

// Core contract: the reset defaults must be exactly the object the SPEC's
// userFlow pins, the example must equal fixtures.json case 1, and the
// pinned constants must match the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/wallpaper.mjs")).href);
const expectedDefaults = {
  wallMode: "perimeter",
  perimeterM: "12",
  heightM: "2.5",
  rollWidthM: "0.53",
  rollLengthM: "10.05",
  patternRepeatCm: "0",
  openingsMode: "none",
  wastePercent: "0",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS must equal the SPEC-pinned reset object");
}
if (core.TRIM_CM !== 10) fail("core: TRIM_CM must be 10");
if (core.RAW_LIMIT !== 8) fail("core: RAW_LIMIT must be 8");
if (core.MAX_WALL_ROWS !== 12) fail("core: MAX_WALL_ROWS must be 12");
if (core.MAX_OPENING_ROWS !== 20) fail("core: MAX_OPENING_ROWS must be 20");
if (JSON.stringify(core.WALL_MODES) !== JSON.stringify(["perimeter", "walls"])) {
  fail("core: WALL_MODES mismatch");
}
if (JSON.stringify(core.OPENING_MODES) !== JSON.stringify(["none", "area", "list"])) {
  fail("core: OPENING_MODES mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "wallpaper-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const FIXTURES_SHA256 = "e3b30a07cac0547afd15d33a82b635eb21e6bf40af21ec07c33db9bef70def97";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.slug !== "wallpaper-calculator" || fixtures.specId !== "spec-wallpaper-calculator-20261109") {
  fail("test/fixtures.json: not the wallpaper-calculator spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 19) {
  fail("test/fixtures.json: expected 19 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the pinned bilingual error messages and flow-state
// strings verbatim.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請用數字，最多兩位小數",
  "請輸入整數",
  "超出允許範圍",
  "逐牆模式不能用開口尺寸清單，請改用面積扣除",
  "開口高度不可超過牆高。",
  "開口合計不小於牆面，請檢查開口尺寸",
  "每幅長度超過一捲長度，這款捲長不夠",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter a number with at most two decimal places.",
  "Enter a whole number.",
  "Out of range.",
  "Per-wall mode cannot use an openings dimension list; use the area deduction instead.",
  "Enter an opening height at or below the wall height.",
  "The openings add up to at least the wall size; check the opening dimensions.",
  "One strip is longer than a whole roll; this roll is too short.",
  "Something went wrong. Try again.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// SPEC-pinned section labels and FAQ, the openings-semantics note, the
// conservative-estimate disclosure, and the scalar field/error slots.
const SCALAR_FIELDS = [
  "perimeterM",
  "heightM",
  "rollWidthM",
  "rollLengthM",
  "patternRepeatCm",
  "openingsAreaM2",
  "wastePercent",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "壁紙用量計算｜Gloss Tools",
    description: "依房間周長或逐面牆尺寸、壁紙捲的寬與長、圖案重複長度，計算需要幾幅壁紙、每幅裁多長、共要買幾捲。",
    h1: "壁紙用量計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    sections: ["牆面量法與尺寸", "壁紙捲規格與圖案重複", "門窗開口", "損耗百分比", "需要幾捲"],
    openingsNote: "門窗面積用於計算淨牆面積。幅數、每幅裁切長度與採購捲數按完整牆面尺寸估算。尺寸清單僅周長模式可用。",
    estimateNote: "結果是保守估算，不是施工或退換貨保證。",
    runLabel: "計算壁紙用量",
    faq: [
      "為什麼填了門窗尺寸，捲數還是一樣？",
      "門窗面積會從毛牆面積扣除，得到淨牆面積。工具按完整牆寬估算幅數，因為門窗的位置、裁切方式和可用餘料會影響實際節省。",
      "每幅為什麼多留 10 公分？",
      "上下各 5 公分修剪裕度是固定常數，另再向上取整到完整圖案重複。",
      "損耗百分比加在哪裡？",
      "先把每面牆的幅數按損耗向上取整，再換算捲數；不同牆的剩料不互相流用。",
    ],
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Wallpaper Calculator | Gloss Tools",
    description:
      "Work out how many wallpaper strips you need, how long to cut each strip, and how many rolls to buy, from your room size, roll size and pattern repeat.",
    h1: "Wallpaper Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    draftNote: "Switching language or leaving the page discards the current draft.",
    sections: [
      "Wall measurement mode and dimensions",
      "Roll size and pattern repeat",
      "Doors and windows",
      "Waste percent",
      "Rolls to buy",
    ],
    openingsNote: "Door and window areas are used to calculate net wall area. Strip count, cut length and rolls to buy are estimated from the full wall dimensions. The dimension list is available in perimeter mode only.",
    estimateNote: "Results are a conservative estimate, not a construction or returns guarantee.",
    runLabel: "Calculate wallpaper needed",
    faq: [
      "Why does the roll count stay the same after I enter door or window dimensions?",
      "The calculator deducts the opening area to show the net wall area. It estimates strips from the full wall width because any savings depend on where the openings sit, how you cut the strips and which offcuts you can reuse.",
      "Why does each strip get 10 cm extra?",
      "A fixed 5 cm trim allowance at the top and bottom, then the length is rounded up to whole pattern repeats.",
      "Where does the waste percentage apply?",
      "It inflates each wall's strip count (rounded up) before rolls are counted; leftovers are not shared between walls.",
    ],
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
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
  if (!html.includes(page.openingsNote)) fail(`${page.path}: missing openings-semantics note`);
  if (!html.includes(page.estimateNote)) fail(`${page.path}: missing conservative-estimate note`);
  if (!html.includes(page.runLabel)) fail(`${page.path}: missing primary action label`);
  for (const text of page.sections) {
    if (!html.includes(text)) fail(`${page.path}: missing section label: ${text}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of SCALAR_FIELDS) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of ["walls-rows", "openings-rows", "error-walls", "error-openings", "error-openingsMode", "wall-rows"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/wallpaper.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "wallpaper-calculator-worker-"));
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
  "public/js/core/wallpaper.mjs",
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
  "Check passed: files, package contract, core defaults/constants/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
