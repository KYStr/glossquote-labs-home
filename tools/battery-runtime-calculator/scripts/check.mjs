// Static project checks for the Battery Runtime Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (mode field order, raw limits, defaults, example equals
// fixtures.json case 1, the pinned bilingual strings in the app,
// bilingual metadata and the candidate noindex/no-canonical rules, the
// pinned disclaimer, DoD note, solve note and FAQ), core purity (no
// DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
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
  "public/js/core/battery-runtime-calculator.mjs",
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

// Core contract: mode field order, raw limits, defaults, report
// constants, and the example must match the SPEC and fixtures.json
// case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/battery-runtime-calculator.mjs")).href
);
const expectedModeFields = {
  "runtime-mah": ["capacityMah", "voltage", "loadWatts", "depthOfDischargePercent"],
  "runtime-wh": ["capacityWh", "loadWatts", "depthOfDischargePercent"],
  solve: ["targetRuntimeHours", "loadWatts", "voltage", "depthOfDischargePercent"],
  pack: [
    "cellCapacityMah",
    "cellVoltage",
    "seriesCount",
    "parallelCount",
    "loadWatts",
    "depthOfDischargePercent",
  ],
};
if (JSON.stringify(core.MODES) !== JSON.stringify(["runtime-mah", "runtime-wh", "solve", "pack"])) {
  fail("core: MODES mismatch");
}
if (canonical(core.MODE_FIELDS) !== canonical(expectedModeFields)) {
  fail("core: MODE_FIELDS order mismatch");
}
const expectedRawLimits = {
  capacityMah: 12,
  capacityWh: 10,
  voltage: 8,
  loadWatts: 11,
  targetRuntimeHours: 10,
  depthOfDischargePercent: 7,
  cellCapacityMah: 12,
  cellVoltage: 8,
  seriesCount: 3,
  parallelCount: 3,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  mode: "runtime-mah",
  capacityMah: "10000",
  voltage: "3.7",
  loadWatts: "10",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "battery-runtime-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "battery-runtime-calculator" || fixtures.specId !== "spec-battery-runtime-calculator-20261109") {
  fail("test/fixtures.json: not the battery-runtime-calculator spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 28) {
  fail("test/fixtures.json: expected 28 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the pinned flow-state and error strings plus the
// bilingual infinite-status wording, verbatim.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請輸入數字，最多 6 位小數",
  "請輸入整數",
  "請選擇計算模式",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter a number with at most 6 decimal places.",
  "Enter a whole number.",
  "Choose a calculation mode.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "無負載，續航無限",
  "No load — runtime is unlimited",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned disclaimer, DoD note, solve note, group heading, and the FAQ.
const DISCLAIMER_ZH =
  "本工具為估算：實際續航會因溫度、電池老化、放電速率與裝置效率而不同。";
const DISCLAIMER_EN =
  "This tool gives estimates only: actual runtime varies with temperature, battery age, discharge rate and device efficiency.";
const DOD_NOTE_ZH =
  "放電深度預設 100%。鉛酸電池常以約 50% 為可用上限，此為簡化假設，不依電池種類自動調整。";
const DOD_NOTE_EN =
  "Depth of discharge defaults to 100%. Lead-acid batteries are commonly limited to about 50% usable capacity; this is a simplifying assumption and is not adjusted automatically by battery type.";
const SOLVE_NOTE_ZH = "所需容量以無條件進位至整數 mAh，確保不低於目標續航所需。";
const SOLVE_NOTE_EN =
  "Required capacity is rounded up to the next whole mAh so it never falls short of the target runtime.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "電池續航計算｜Gloss Tools",
    description:
      "輸入電池容量（mAh 或 Wh）、電壓與負載瓦數，估算可用電量與續航時間，也能反推達到目標續航所需的容量，或計算串並聯電池組的總電量。",
    h1: "電池續航計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    headings: ["電池與負載", "估算結果", "常見問題"],
    disclaimer: DISCLAIMER_ZH,
    dodNote: DOD_NOTE_ZH,
    solveNote: SOLVE_NOTE_ZH,
    faq: [
      "Wh 怎麼換算？",
      "Wh = mAh × V ÷ 1000。",
      "為什麼實際續航比較短？",
      "溫度、老化、放電速率與轉換損耗都會降低可用電量；本工具為估算，可用放電深度粗略反映。",
      "負載填 0 W 為什麼顯示無限？",
      "模型中沒有負載就不消耗電量，續航不設上限；這是狀態，不是錯誤。",
      "有考慮 Peukert 效應嗎？",
      "沒有。大電流放電時鉛酸電池的有效容量會下降，本工具不模擬此效應。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Battery Runtime Calculator | Gloss Tools",
    description:
      "Estimate usable energy and runtime from battery capacity in mAh or Wh, voltage and load in watts — or solve for the capacity a target runtime requires, or combine cells in series and parallel.",
    h1: "Battery Runtime Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    headings: ["Battery and load", "Estimate", "Frequently asked questions"],
    disclaimer: DISCLAIMER_EN,
    dodNote: DOD_NOTE_EN,
    solveNote: SOLVE_NOTE_EN,
    faq: [
      "How is Wh calculated?",
      "Wh = mAh × V ÷ 1000.",
      "Why is real-world runtime shorter?",
      "Temperature, ageing, discharge rate and conversion losses all reduce usable energy; this tool gives an estimate and the depth-of-discharge input can approximate them.",
      "Why does a 0 W load show unlimited runtime?",
      "With no load the model draws no energy, so runtime has no finite limit; this is a status, not an error.",
      "Is the Peukert effect included?",
      "No. Effective capacity drops at high discharge rates, especially for lead-acid batteries; this tool does not model that effect.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned disclaimer`);
  if (!html.includes(page.dodNote)) fail(`${page.path}: missing DoD note`);
  if (!html.includes(page.solveNote)) fail(`${page.path}: missing solve note`);
  for (const heading of page.headings) {
    if (!html.includes(heading)) fail(`${page.path}: missing group heading: ${heading}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of [
    "mode",
    "capacityMah",
    "capacityWh",
    "voltage",
    "loadWatts",
    "targetRuntimeHours",
    "depthOfDischargePercent",
    "cellCapacityMah",
    "cellVoltage",
    "seriesCount",
    "parallelCount",
  ]) {
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const id of [
    "field-mode-runtime-mah",
    "field-mode-runtime-wh",
    "field-mode-solve",
    "field-mode-pack",
    "field-capacityMah",
    "field-capacityWh",
    "field-voltage",
    "field-loadWatts",
    "field-targetRuntimeHours",
    "field-depthOfDischargePercent",
    "field-cellCapacityMah",
    "field-cellVoltage",
    "field-seriesCount",
    "field-parallelCount",
  ]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of [
    "result-energy",
    "result-usable",
    "result-runtime-hours",
    "result-runtime-hm",
    "result-pack-voltage",
    "result-pack-capacity",
    "result-required-energy",
    "result-required-capacity",
    "result-infinite",
    "result-solve-note",
  ]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing result slot ${id}`);
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
    resolve(PROJECT_ROOT, "public/js/core/battery-runtime-calculator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "battery-runtime-calculator-worker-"));
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
  "public/js/core/battery-runtime-calculator.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
