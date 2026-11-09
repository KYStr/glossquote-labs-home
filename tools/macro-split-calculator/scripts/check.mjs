// Static project checks for the Macro Split Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, ranges, preset table, defaults, example equals the
// vendored fixtures.json case 1, bilingual metadata and the candidate
// noindex/no-canonical rules, the verbatim nutrition note and FAQ),
// core purity (no DOM/network/storage), syntax of every shipped script,
// the fixed worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list. The vendored test/fixtures.json
// is a verbatim copy of the fixed spec's fixtures (spec candidate
// 2a24708ad8b9e10c5631f58e896dd005b069eb8b); the spec PR is not merged into
// this branch's base, so the check reads the vendored copy rather than a
// repo-level docs path.

import assert from "node:assert/strict";
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

function deepEqual(actual, expected) {
  try {
    assert.deepEqual(actual, expected);
    return true;
  } catch {
    return false;
  }
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/macro.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/site.test.mjs",
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

// Core contract: field order, ranges, preset table, energy factors,
// defaults, report constants, and the example must match the SPEC and the
// vendored fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/macro.mjs")).href);
const expectedFields = ["calories", "preset", "proteinPct", "carbsPct", "fatPct", "meals"];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (!deepEqual(core.CALORIES_RANGE, [800, 10000])) fail("core: CALORIES_RANGE mismatch");
if (!deepEqual(core.PCT_RANGE, [0, 100])) fail("core: PCT_RANGE mismatch");
if (!deepEqual(core.MEALS_RANGE, [1, 6])) fail("core: MEALS_RANGE mismatch");
if (
  !deepEqual(core.PRESET_IDS, ["balanced", "high-protein", "low-carb", "keto", "custom"])
) {
  fail("core: PRESET_IDS mismatch");
}
if (
  !deepEqual(core.PRESETS, {
    balanced: { protein: 30, carbs: 40, fat: 30 },
    "high-protein": { protein: 40, carbs: 30, fat: 30 },
    "low-carb": { protein: 35, carbs: 25, fat: 40 },
    keto: { protein: 20, carbs: 5, fat: 75 },
  })
) {
  fail("core: PRESETS mismatch");
}
if (!deepEqual(core.ENERGY_FACTORS, { protein: 4, carbs: 4, fat: 9 })) {
  fail("core: ENERGY_FACTORS mismatch");
}
const expectedDefaults = {
  calories: "2000",
  preset: "balanced",
  proteinPct: "",
  carbsPct: "",
  fatPct: "",
  meals: "",
};
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.REPORT_FILENAME !== "macro-split-report.json") fail("core: REPORT_FILENAME mismatch");
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-macro-split-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 8) {
  fail("test/fixtures.json: expected 8 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the two
// pinned FAQ answers, the verbatim nutrition note, the draft-loss note,
// and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "三大營養素分配計算機｜Gloss Tools",
    description:
      "輸入每日熱量目標與飲食比例（均衡、高蛋白、低碳、生酮或自訂），換算蛋白質、碳水化合物與脂肪的每日克數、回算熱量與每餐分配。",
    h1: "三大營養素分配計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    headings: ["每日熱量目標與飲食比例", "自訂百分比與每餐分配", "每種營養素克數與回算熱量"],
    faq: [
      "克數回算的熱量為什麼和目標不完全相等？",
      "克數取整數克，最大營養素已按固定規則吸收捨入差，剩餘差額以回算差明示。",
      "熱量目標從哪裡來？",
      "由你輸入，本工具不計算熱量需求。",
    ],
    nutritionNote:
      "本工具依一般營養通則換算：蛋白質與碳水化合物每克 4 大卡、脂肪每克 9 大卡。結果僅供一般飲食規劃參考，不構成醫療或營養處方；有疾病、懷孕或特殊飲食需求時，請諮詢醫師或營養師。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Macro Split Calculator | Gloss Tools",
    description:
      "Turn a daily calorie target and a diet ratio (balanced, high-protein, low-carb, keto or custom) into grams of protein, carbs and fat, with implied calories and an optional per-meal split.",
    h1: "Macro Split Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    headings: [
      "Daily calorie target and diet preset",
      "Custom percentages and per-meal split",
      "Grams per macro and implied calories",
    ],
    faq: [
      "Why doesn't the implied total match the target exactly?",
      "Grams are whole numbers; the largest macro absorbs the rounding drift by a fixed rule and any remaining difference is shown.",
      "Where does the calorie target come from?",
      "You enter it; this tool does not estimate calorie needs.",
    ],
    nutritionNote:
      "This tool uses the general nutrition conversion of 4 kcal per gram of protein and carbohydrate and 9 kcal per gram of fat. Results are general dietary-planning information only, not medical or nutrition advice; consult a physician or dietitian if you have a medical condition, are pregnant, or have special dietary needs.",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-calories",
  "field-preset-balanced",
  "field-preset-high-protein",
  "field-preset-low-carb",
  "field-preset-keto",
  "field-preset-custom",
  "field-proteinPct",
  "field-carbsPct",
  "field-fatPct",
  "field-meals",
];
const ERROR_IDS = [
  "error-calories",
  "error-preset",
  "error-proteinPct",
  "error-carbsPct",
  "error-fatPct",
  "error-meals",
];
const STRUCTURE_IDS = [
  "macro-form",
  "status",
  "example-note",
  "results",
  "summary",
  "adjusted-note",
  "macro-rows",
  "meals-block",
  "meal-rows",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
];
const PRESET_VALUES = ["balanced", "high-protein", "low-carb", "keto", "custom"];
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
  if (!html.includes(page.nutritionNote)) fail(`${page.path}: nutrition note must be verbatim`);
  for (const heading of page.headings) {
    if (!html.includes(heading)) fail(`${page.path}: missing section heading: ${heading}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of ERROR_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing error slot ${id}`);
  }
  for (const id of STRUCTURE_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element ${id}`);
  }
  for (const preset of PRESET_VALUES) {
    if (!html.includes(`value="${preset}"`)) {
      fail(`${page.path}: missing preset radio value ${preset}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/macro.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "macro-split-calculator-worker-"));
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
  "public/js/core/macro.mjs",
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
  "Check passed: files, package contract, core ranges/presets/defaults/example, pages, syntax, worker concatenation, capability scan, core purity",
);
