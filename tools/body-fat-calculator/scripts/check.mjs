// Static project checks for the Body Fat Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, ranges, defaults, example equals fixtures.json case 1,
// bilingual metadata and the candidate noindex/no-canonical rules), core
// purity (no DOM/network/storage), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list.
//
// The spec PR is not merged into this base, so fixtures.json is the
// verbatim vendored copy in test/fixtures.json (spec candidate
// e3be9220520a92b9b7b0de37c03bb0f2f26de76c).

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

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/bodyfat.mjs",
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

// Core contract: field order, ranges, defaults, category ids, and the
// example must match the SPEC and fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/bodyfat.mjs")).href);
const expectedFields = ["sex", "heightCm", "neckCm", "waistCm", "hipCm", "weightKg"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRanges = {
  heightCm: [100, 250],
  neckCm: [20, 80],
  waistCm: [40, 300],
  hipCm: [40, 300],
  weightKg: [25, 500],
};
if (stableStringify(core.RANGES) !== stableStringify(expectedRanges)) {
  fail("core: RANGES mismatch");
}
const expectedDefaults = {
  sex: "male",
  heightCm: "",
  neckCm: "",
  waistCm: "",
  hipCm: "",
  weightKg: "",
};
if (stableStringify(core.DEFAULTS) !== stableStringify(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedCategories = ["below-essential", "essential", "athletes", "fitness", "average", "obese"];
if (JSON.stringify(core.CATEGORY_IDS) !== JSON.stringify(expectedCategories)) {
  fail("core: CATEGORY_IDS mismatch");
}
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "body-fat-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-body-fat-calculator-20261109") {
  fail("fixtures: specId mismatch");
}
if (stableStringify(core.EXAMPLE) !== stableStringify(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the pinned
// measurement hints, the fixed disclaimer, the two pinned FAQ answers, and
// the draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "體脂率計算機｜Gloss Tools",
    description: "用身高、頸圍、腰圍（女性再加臀圍）與體重，以美國海軍圍度法估算體脂率、脂肪重量與淨體重。",
    h1: "體脂率計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    hints: [
      "脫鞋站立量測。",
      "在喉結下方量測，皮尺與脖子長軸垂直。",
      "男性量肚臍水平位置；女性量腰部最細處。皮尺保持水平，正常吐氣結束時量測，貼合但不壓迫皮膚。",
      "量臀部最寬處，皮尺保持水平。",
    ],
    disclaimer:
      "本工具以美國海軍圍度法估算體脂率，結果是估計值，不是醫療量測，不能取代專業體組成檢測或醫療建議。",
    faq: [
      "這個方法準嗎？",
      "圍度法是估算，和 DEXA 等專業檢測會有誤差，適合看趨勢。",
      "為什麼男性不用臀圍？",
      "美國海軍公式男性只用腰圍與頸圍，女性才加入臀圍。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Body Fat Calculator | Gloss Tools",
    description:
      "Estimate body fat percentage, fat mass and lean mass from height, neck, waist (plus hip for women) and weight with the US Navy circumference method.",
    h1: "Body Fat Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    hints: [
      "Measure standing, without shoes.",
      "Measure just below the Adam's apple, with the tape perpendicular to the neck.",
      "Men: at navel level. Women: at the narrowest point of the waist. Keep the tape horizontal, measure at the end of a normal exhale, snug but not compressing the skin.",
      "Measure at the widest point of the hips, with the tape horizontal.",
    ],
    disclaimer:
      "This tool estimates body fat percentage using the US Navy circumference method. Results are estimates, not medical measurements, and do not replace professional body-composition assessment or medical advice.",
    faq: [
      "How accurate is this method?",
      "The circumference method is an estimate and differs from professional scans such as DEXA; it is best used to track trends.",
      "Why do men not enter hip?",
      "The US Navy formula uses waist and neck for men; hip is only part of the women's formula.",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing fixed disclaimer`);
  for (const text of page.hints) {
    if (!html.includes(text)) fail(`${page.path}: missing measurement hint: ${text}`);
  }
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/bodyfat.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "body-fat-worker-"));
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
  "public/js/core/bodyfat.mjs",
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
  "Check passed: files, package contract, core fields/ranges/defaults/example, pages, syntax, worker concatenation, capability scan, core purity",
);
