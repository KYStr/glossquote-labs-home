// Static project checks for the BAC Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limit, defaults, example equals fixtures.json case
// 1, the pinned bilingual strings in the app, bilingual metadata and the
// candidate noindex/no-canonical rules, the pinned disclaimer, band
// wording and FAQ), core purity (no DOM/network/storage), syntax of
// every shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan.
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
  "public/js/core/bac-calculator.mjs",
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

// Core contract: field order, raw limit, defaults, report constants,
// and the example must match the SPEC and fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/bac-calculator.mjs")).href);
const expectedFields = ["sex", "weightKg", "drinks", "elapsedMinutes"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
if (core.RAW_LIMIT !== 8) fail("core: RAW_LIMIT must be 8");
if (core.MAX_DRINKS !== 12) fail("core: MAX_DRINKS must be 12");
const expectedDefaults = {
  sex: "male",
  weightKg: "70",
  drinks: [{ volumeMl: "350", abvPercent: "5" }],
  elapsedMinutes: "0",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "bac-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "bac-calculator" || fixtures.specId !== "spec-bac-calculator-20261109") {
  fail("test/fixtures.json: not the bac-calculator spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
// Only two Taiwan thresholds exist in current law; the concept note's
// third value (0.4 mg/L) must not appear anywhere in the product.
const allProductText = [
  await readFile(resolve(PROJECT_ROOT, "public/js/core/bac-calculator.mjs"), "utf8"),
  await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8"),
  await readFile(resolve(PROJECT_ROOT, "public/index.html"), "utf8"),
  await readFile(resolve(PROJECT_ROOT, "public/en/index.html"), "utf8"),
].join("\n");
if (allProductText.includes("0.4 mg/L")) {
  fail("product: the non-existent 0.4 mg/L threshold must not appear");
}

// The app must carry the pinned flow-state and error strings plus the
// bilingual band wording, verbatim.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "體重請用數字，最多一位小數",
  "酒精濃度請用數字，最多一位小數",
  "請輸入整數",
  "請選擇性別",
  "超出允許範圍",
  "最多 12 杯",
  "請至少加入一杯飲料",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter body weight as a number with at most one decimal place.",
  "Enter alcohol by volume as a number with at most one decimal place.",
  "Enter a whole number.",
  "Choose a sex.",
  "Out of range.",
  "At most 12 drinks.",
  "Add at least one drink.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "未達行政罰門檻（喝酒仍不可駕車）",
  "Below the administrative threshold (still not OK to drive)",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned disclaimer, band note, short disclaimer, group headings, the
// thresholds table, and the FAQ answers.
const DISCLAIMER_ZH =
  "本工具僅依 Widmark 公式推估，不是醫療或執法測量。實際酒精濃度因個人體質、飲食、服藥與飲用速度差異很大。只要喝酒，就不要開車或騎車；本工具的任何結果都不能當作可以安全駕駛的依據。";
const DISCLAIMER_EN =
  "This tool only estimates with the Widmark formula; it is not a medical or law-enforcement measurement. Actual alcohol concentration varies widely with body composition, food, medication and drinking speed. If you drink, do not drive or ride; no result from this tool is evidence that driving is safe.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "酒精濃度估算｜Gloss Tools",
    description:
      "輸入性別、體重、飲酒量與經過時間，用 Widmark 公式推估血液酒精濃度，並對照台灣酒駕行政與刑事門檻。僅供推估，喝酒不開車。",
    h1: "酒精濃度估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    headings: ["性別與體重", "飲料清單（容量與酒精濃度）", "推估濃度與法定區間", "台灣酒駕法定門檻對照"],
    disclaimer: DISCLAIMER_ZH,
    bandNote: "區間以未捨入的推估值判定",
    shortDisclaimer: "僅供推估，喝酒不開車",
    thresholds: ["0.15 mg/L", "0.03%", "0.25 mg/L", "0.05%", "2000:1"],
    faq: [
      "低於 0.15 mg/L 就可以開車嗎？",
      "不行。門檻只是處罰的起點，酒精從第一口就影響反應與判斷，而且本工具只是推估，誤差可能讓你實際上已超過門檻。",
      "喝水、咖啡或運動可以加速代謝嗎？",
      "不行。酒精以約每小時 0.15 g/L 的固定速率代謝，喝水、咖啡、沖冷水或運動都不會讓它變快，只有時間有效。",
      "吐氣濃度是怎麼換算的？",
      "台灣法規以成對數值定義門檻：吐氣 0.15 mg/L 對應血液 0.03%，0.25 mg/L 對應 0.05%，兩者都是血液：吐氣 = 2000:1。本工具以同樣比例換算，結果是參考值，不是儀器量測。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "BAC Calculator | Gloss Tools",
    description:
      "Estimate blood alcohol concentration with the Widmark formula from sex, weight, drinks and elapsed time, with Taiwan's administrative and criminal DUI thresholds for reference. Estimate only — never drink and drive.",
    h1: "BAC Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    headings: ["Sex and body weight", "Drinks (volume and ABV)", "Estimated BAC and legal band", "Taiwan DUI thresholds"],
    disclaimer: DISCLAIMER_EN,
    bandNote: "Band is decided on the unrounded estimate.",
    shortDisclaimer: "Estimate only. Never drink and drive.",
    thresholds: ["0.15 mg/L", "0.03%", "0.25 mg/L", "0.05%", "2000:1"],
    faq: [
      "Is below 0.15 mg/L OK to drive?",
      "No. The threshold is only where penalties start; alcohol impairs reaction and judgment from the first drink, and this tool is only an estimate — error could put you over the threshold in reality.",
      "Can water, coffee or exercise speed up elimination?",
      "No. Alcohol is eliminated at a roughly fixed 0.15 g/L per hour; water, coffee, cold showers and exercise do not speed it up. Only time works.",
      "How is the breath figure converted?",
      "Taiwan's statutes define thresholds in pairs — breath 0.15 mg/L with blood 0.03%, and breath 0.25 mg/L with blood 0.05% — both give a blood-to-breath ratio of 2000:1. This tool converts with the same ratio; the result is a reference value, not an instrument reading.",
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
  if (!html.includes(page.bandNote)) fail(`${page.path}: missing band note`);
  if (!html.includes(page.shortDisclaimer)) fail(`${page.path}: missing short disclaimer`);
  for (const heading of page.headings) {
    if (!html.includes(heading)) fail(`${page.path}: missing group heading: ${heading}`);
  }
  for (const text of page.thresholds) {
    if (!html.includes(text)) fail(`${page.path}: missing threshold text: ${text}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of ["sex", "weightKg", "drinks", "elapsedMinutes"]) {
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  if (!html.includes('id="field-weightKg"')) fail(`${page.path}: missing input field-weightKg`);
  if (!html.includes('id="field-elapsedMinutes"')) fail(`${page.path}: missing input field-elapsedMinutes`);
  if (!html.includes('id="field-sex-male"')) fail(`${page.path}: missing radio field-sex-male`);
  if (!html.includes('id="field-sex-female"')) fail(`${page.path}: missing radio field-sex-female`);
  if (!html.includes('id="drink-rows"')) fail(`${page.path}: missing drink-rows container`);
  if (!html.includes('id="add-drink-btn"')) fail(`${page.path}: missing add-drink button`);
  for (const id of ["result-bac-gl", "result-bac-percent", "result-breath", "result-band", "result-peak", "result-alcohol", "result-to-admin", "result-to-zero"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/bac-calculator.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "bac-calculator-worker-"));
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
  "public/js/core/bac-calculator.mjs",
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
