// Static project checks for the Blood Pressure Checker: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, report filename and
// limit, category table, example equals the vendored fixtures.json
// case 1, the vendored fixtures hash, bilingual metadata, the pinned
// FAQ answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-blood-pressure-checker-20261121, spec candidate commit
// f8a034e4c1bd81c3c21cb7fb221c0bb6fec8f683, draft spec PR #368); the
// spec PR is not merged into this branch's base, so the check reads
// the vendored copy rather than a repo-level docs path.

import assert from "node:assert/strict";
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
  "public/js/core/blood-pressure.mjs",
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

// Forbidden runtime capabilities, assembled from fragments so this
// file does not match its own scan.
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

// Fixtures provenance: the vendored copy must be byte-identical to
// the fixed spec candidate's fixtures file.
const FIXTURES_SHA256 = "67dc8ed880c781d72cb2ff375ec9483aefb2a4f8ada80f491c676c8fd4f4e7a5";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, ranges, report
// filename/limit, the pinned category table, and the example must
// match the SPEC and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/blood-pressure.mjs")).href
);
if (!deepEqual(core.FIELDS, ["systolic", "diastolic"])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.DEFAULTS, { systolic: "", diastolic: "" })) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 4) fail("core: MAX_RAW_UNITS must be 4");
if (core.SYSTOLIC_MIN !== 40) fail("core: SYSTOLIC_MIN mismatch");
if (core.SYSTOLIC_MAX !== 300) fail("core: SYSTOLIC_MAX mismatch");
if (core.DIASTOLIC_MIN !== 20) fail("core: DIASTOLIC_MIN mismatch");
if (core.DIASTOLIC_MAX !== 200) fail("core: DIASTOLIC_MAX mismatch");
if (core.REPORT_FILENAME !== "blood-pressure-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_CATEGORIES = {
  normal: {
    categoryZh: "正常",
    categoryEn: "Normal",
    adviceZh: "維持健康生活型態，定期量測血壓。",
    adviceEn: "Maintain a healthy lifestyle and check your blood pressure regularly.",
  },
  elevated: {
    categoryZh: "偏高",
    categoryEn: "Elevated",
    adviceZh: "建議調整生活型態，3–6 個月後再量測。",
    adviceEn: "Consider lifestyle changes and recheck in 3–6 months.",
  },
  stage1: {
    categoryZh: "第一期高血壓",
    categoryEn: "Stage 1 Hypertension",
    adviceZh: "建議調整生活型態，評估心血管風險，必要時諮詢醫師。",
    adviceEn:
      "Consider lifestyle changes, assess cardiovascular risk, and consult a physician if needed.",
  },
  stage2: {
    categoryZh: "第二期高血壓",
    categoryEn: "Stage 2 Hypertension",
    adviceZh: "建議諮詢醫師，討論生活型態調整與藥物治療。",
    adviceEn: "Consult a physician to discuss lifestyle changes and medication.",
  },
  crisis: {
    categoryZh: "高血壓危象",
    categoryEn: "Hypertensive Crisis",
    adviceZh: "血壓極高，請盡快就醫；若出現胸痛、呼吸困難、視力變化等症狀，請立即就醫或撥打 119。",
    adviceEn:
      "Blood pressure is very high — seek medical care promptly. If you have chest pain, shortness of breath, or vision changes, seek emergency care or call 119.",
  },
};
if (!deepEqual(core.CATEGORIES, EXPECTED_CATEGORIES)) fail("core: CATEGORIES table mismatch");
if (
  core.DISCLAIMER_ZH !==
  "本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑慮，請諮詢醫師或醫療專業人員。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns, consult a physician or healthcare professional."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-blood-pressure-checker-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具僅供參考，不能取代專業醫療建議、診斷或治療。如有疑慮，請諮詢醫師或醫療專業人員。";
const DISCLAIMER_EN =
  "This tool is for reference only and is not a substitute for professional medical advice, diagnosis, or treatment. If you have concerns, consult a physician or healthcare professional.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "血壓分級｜Gloss Tools",
    description:
      "輸入收縮壓與舒張壓，對照 AHA/ACC 2017 分級表，立即知道這次量測落在哪一級。僅供參考，非醫療建議。",
    h1: "血壓分級",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "單次量測就能診斷高血壓嗎？",
      "不能；分級以單次量測對照，高血壓診斷需多次量測與醫師評估。",
      "收縮壓與舒張壓落在不同級時取哪一級？",
      "取較高者。",
      "180/120 算高血壓危象嗎？",
      "不算；危象是收縮壓高於 180 或舒張壓高於 120（嚴格大於），180/120 本身為第二期。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Blood Pressure Checker | Gloss Tools",
    description:
      "Enter systolic and diastolic pressure to see the AHA/ACC 2017 category for a single reading. For reference only, not medical advice.",
    h1: "Blood Pressure Checker",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Can one reading diagnose hypertension?",
      "No; this classifies a single reading. Diagnosis needs repeated measurements and a physician's evaluation.",
      "If systolic and diastolic fall in different categories, which one applies?",
      "The higher category.",
      "Is 180/120 a hypertensive crisis?",
      "No; a crisis is systolic above 180 or diastolic above 120 (strictly greater), so 180/120 itself is Stage 2.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-systolic", "field-diastolic"];
const ERROR_IDS = ["error-systolic", "error-diastolic"];
const REGION_IDS = ["summary-rows", "advice-rows", "crisis-note"];
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
  if (!html.includes(DISCLAIMER_ZH)) fail(`${page.path}: missing disclaimer (zh)`);
  if (!html.includes(DISCLAIMER_EN)) fail(`${page.path}: missing disclaimer (en)`);
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
  for (const id of REGION_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing results region ${id}`);
  }
}

// Syntax-check every shipped script, and check the worker
// concatenation (core + handler) parses as one module.
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
    resolve(PROJECT_ROOT, "public/js/core/blood-pressure.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "blood-pressure-checker-worker-"));
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

// Core purity: no DOM access and no clock in the pure modules or the
// controller. The core must be purely a function of its two input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/blood-pressure.mjs",
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
{
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/blood-pressure.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/blood-pressure.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/blood-pressure.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/example, pages, syntax, worker concatenation, capability scan, core purity",
);
