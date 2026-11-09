// Static project checks for the Moving Box Estimator: required files,
// package contract, the SPEC-pinned rules that can be checked
// statically (field order, base-box table, defaults, example equals the
// vendored fixtures.json case 1, report file name and limits, bilingual
// metadata, the SPEC-pinned estimate note, FAQ answers, error strings,
// and the candidate noindex / no-canonical rules), core purity (no
// DOM/network/storage), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan. Exits
// non-zero on the first failure list. The vendored test/fixtures.json
// is a verbatim copy of the fixed spec's fixtures (spec candidate
// a536732ba0512afc595c924b242ee220211bf7ed); the spec PR is not merged
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
  "public/js/core/boxes.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
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

// Core contract: field order, home types, base table, defaults, report
// constants, and the example must match the SPEC and the vendored
// fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/boxes.mjs")).href);
const expectedFields = [
  "homeType",
  "manyBooks",
  "largeKitchen",
  "manyClothes",
  "fragileItems",
  "livedOver5Years",
];
if (!deepEqual(core.FIELDS, expectedFields)) fail("core: FIELDS order mismatch");
if (!deepEqual(core.TOGGLES, expectedFields.slice(1))) fail("core: TOGGLES order mismatch");
if (
  !deepEqual(core.HOME_TYPES, ["studio", "one-bedroom", "two-bedroom", "three-bedroom", "four-bedroom"])
) {
  fail("core: HOME_TYPES mismatch");
}
if (
  !deepEqual(core.BASE_BOXES, {
    studio: 15,
    "one-bedroom": 25,
    "two-bedroom": 40,
    "three-bedroom": 60,
    "four-bedroom": 80,
  })
) {
  fail("core: BASE_BOXES table mismatch");
}
const expectedDefaults = {
  homeType: "studio",
  manyBooks: false,
  largeKitchen: false,
  manyClothes: false,
  fragileItems: false,
  livedOver5Years: false,
};
if (!deepEqual(core.DEFAULTS, expectedDefaults)) fail("core: DEFAULTS mismatch");
if (core.INPUT_LIMIT_BYTES !== 65536) fail("core: INPUT_LIMIT_BYTES must be 65536");
if (core.REPORT_FILENAME !== "moving-box-estimator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-moving-box-estimator-20261109") {
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
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned estimate note, the pinned FAQ answers, the fixed per-option
// addition hints, the draft-loss note, and the form control ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "搬家紙箱估算｜Gloss Tools",
    description: "依住宅型態與生活習慣，估算搬家要買的小、中、大紙箱數量，以及膠帶和包裝紙的捲數。",
    h1: "搬家紙箱估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "小／中／大箱怎麼分工？",
      "小箱裝書和重物，中箱裝一般雜物，大箱裝衣物、寢具等輕而蓬鬆的物品。",
      "住 5 年以上的 +20% 怎麼算？",
      "住越久累積的物品通常越多，這個開關把小計上調 20%，無條件進位，上調的箱數全算中箱；東西少可以關掉。",
    ],
    estimateNote:
      "這是依一般家庭物品量推估的參考值，實際數量會因每戶物品多寡而不同；建議寧可多備幾箱，也不要買太少。",
    hints: ["+8 小箱", "+6 中箱", "+5 中箱", "+4 小箱", "基準 15 箱", "基準 80 箱"],
    resultsHeading: "需要的紙箱與耗材",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Moving Box Estimator | Gloss Tools",
    description:
      "Estimate how many small, medium and large moving boxes to buy for your home type and habits, plus the tape and packing-paper rolls to go with them.",
    h1: "Moving Box Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What goes in each size?",
      "Small boxes are for books and heavy items, medium for general household goods, and large for light, bulky items like clothes and bedding.",
      "Why does living 5+ years add 20%?",
      "Homes accumulate belongings over time, so this option raises the subtotal by 20%, rounded up, with the extra boxes counted as medium. Turn it off if you own less than typical.",
    ],
    estimateNote:
      "This is a rough estimate for a typical household. Actual needs vary from home to home, so keep a few spare boxes rather than too few.",
    hints: ["+8 small boxes", "+6 medium boxes", "+5 medium boxes", "+4 small boxes", "base 15 boxes", "base 80 boxes"],
    resultsHeading: "Boxes and supplies you need",
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-homeType",
  "field-manyBooks",
  "field-largeKitchen",
  "field-manyClothes",
  "field-fragileItems",
  "field-livedOver5Years",
  "error-homeType",
];
// The SPEC-pinned bilingual error and status strings live in app.js.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const text of [
  "輸入格式不正確",
  "輸入太大",
  "文字含有不完整的 Unicode 字元",
  "請選擇住宅型態",
  "住宅型態不在可選清單中",
  "The input format is invalid.",
  "The input is too large.",
  "The text contains an incomplete Unicode character.",
  "Choose a home type.",
  "The home type is not one of the available choices.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
]) {
  if (!appSource.includes(text)) fail(`app.js: missing SPEC-pinned string: ${text}`);
}
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
  if (!html.includes(page.estimateNote)) fail(`${page.path}: missing fixed estimate note`);
  if (!html.includes(page.resultsHeading)) fail(`${page.path}: missing results heading`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const text of page.hints) {
    if (!html.includes(text)) fail(`${page.path}: missing option hint: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing control ${id}`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/boxes.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "moving-box-estimator-worker-"));
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
  "public/js/core/boxes.mjs",
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
  "Check passed: files, package contract, core tables/defaults/example, pages, syntax, worker concatenation, capability scan, core purity",
);
