// Static project checks for the Protein Intake Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, factor table, ranges, defaults, example
// equals the vendored fixtures.json case 1, report contract, bilingual
// metadata and the candidate noindex/no-canonical rules), core purity
// (no DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan. Exits
// non-zero on the first failure list. The vendored test/fixtures.json is
// a verbatim copy of the fixed spec's fixtures (spec candidate
// 6493df72ecb2c7a583d836fdcb9731b550168b40); the spec PR is not merged
// into this branch's base, so the check reads the vendored copy rather
// than a repo-level docs path.

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
  "public/js/core/protein.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/site.test.mjs",
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

// Core contract: field order, factor table, ranges, defaults, report
// contract, and the example must match the SPEC and the vendored
// fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/protein.mjs")).href);
const expectedFields = ["weight", "goal", "customFactor", "meals"];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (
  !deepEqual(core.GOAL_CODES, [
    "sedentary",
    "general",
    "regular-exercise",
    "strength-training",
    "high-intensity",
    "fat-loss",
    "custom",
  ])
) {
  fail("core: GOAL_CODES mismatch");
}
if (
  !deepEqual(core.GOAL_FACTORS_TENTHS, {
    sedentary: 8,
    general: 10,
    "regular-exercise": 12,
    "strength-training": 16,
    "high-intensity": 20,
    "fat-loss": 22,
  })
) {
  fail("core: GOAL_FACTORS_TENTHS mismatch");
}
if (!deepEqual(core.WEIGHT_RANGE, [20.0, 300.0])) fail("core: WEIGHT_RANGE mismatch");
if (!deepEqual(core.CUSTOM_FACTOR_RANGE, [0.1, 4.0])) {
  fail("core: CUSTOM_FACTOR_RANGE mismatch");
}
if (!deepEqual(core.MEAL_COUNTS, ["3", "4"])) fail("core: MEAL_COUNTS mismatch");
const expectedDefaults = { weight: "70", goal: "general", customFactor: "", meals: "3" };
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.REPORT_FILENAME !== "protein-intake-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.specId !== "spec-protein-intake-calculator-20261109") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 9) {
  fail("test/fixtures.json: expected 9 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned disclaimer and FAQ answers, the draft-loss note, the form
// control ids, and all seven goal options.
const DISCLAIMER_ZH =
  "本工具提供一般營養資訊，非醫療建議；如有腎臟疾病、懷孕或其他健康狀況，請先諮詢醫師或營養師。";
const DISCLAIMER_EN =
  "This tool provides general nutrition information, not medical advice. If you have kidney disease, are pregnant, or have other health conditions, consult a physician or dietitian first.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "蛋白質攝取量計算機｜Gloss Tools",
    description: "依體重與活動目標，用固定的 g/kg 係數表算出每日蛋白質目標、±0.2 區間與每餐分配。",
    h1: "蛋白質攝取量計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "區間怎麼來的？",
      "每日目標是體重乘上所選係數，區間是係數上下各 0.2 g/kg 分別計算的結果。",
      "每餐克數怎麼分？",
      "每日目標平均分到各餐，除不盡的餘數依序加到前面的餐次，所以每餐合計剛好等於每日目標。",
    ],
    disclaimer: DISCLAIMER_ZH,
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Protein Intake Calculator | Gloss Tools",
    description:
      "Estimate daily protein grams from body weight and an activity goal using pinned g/kg factors, with a ±0.2 range and per-meal splits.",
    h1: "Protein Intake Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Where does the range come from?",
      "The daily target is body weight times the chosen factor; the range recomputes at the factor minus and plus 0.2 g/kg.",
      "How are meals split?",
      "The daily target is divided evenly; any remainder is added one gram at a time to the earliest meals, so the meals always sum to the daily target.",
    ],
    disclaimer: DISCLAIMER_EN,
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-weight",
  "field-goal",
  "field-customFactor",
  "field-meals-3",
  "field-meals-4",
];
const ERROR_IDS = ["error-weight", "error-goal", "error-customFactor", "error-meals"];
const GOAL_VALUES = [
  "sedentary",
  "general",
  "regular-exercise",
  "strength-training",
  "high-intensity",
  "fat-loss",
  "custom",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing nutrition disclaimer`);
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
  for (const value of GOAL_VALUES) {
    if (!html.includes(`value="${value}"`)) fail(`${page.path}: missing goal option ${value}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/protein.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "protein-intake-calculator-worker-"));
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

// Forbidden-capability scan over the shipped sources and tests (this
// file itself is excluded: it assembles the tokens from fragments).
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
  "public/js/core/protein.mjs",
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
  "Check passed: files, package contract, core fields/factors/ranges/defaults/example, report contract, pages, syntax, worker concatenation, capability scan, core purity",
);
