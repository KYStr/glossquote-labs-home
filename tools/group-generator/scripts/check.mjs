// Static project checks for the Group Generator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, PRNG constants and first draws,
// the example equals the basic-count fixture, the pinned bilingual
// strings in the core and the app, bilingual metadata and the preview
// noindex / no-canonical rules), core purity (no DOM/network/storage /
// entropy access), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
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
  "public/js/core/group-generator.mjs",
  "public/styles/group-generator.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/group-generator-core.test.mjs",
  "test/group-generator-controller.test.mjs",
  "test/group-generator-report.test.mjs",
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
// does not match its own scan. Persistent storage is deliberately in
// this list: the SPEC pins no storage at all for this tool (the draft
// lives only in the page), so no shipped file may touch it.
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

// Core contract: field order, raw limits, defaults, PRNG constant and
// first draws, report constants, and the example.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/group-generator.mjs")).href
);
const expectedFields = ["names", "mode", "groupCount", "groupSize", "seed"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedDefaults = {
  names: "",
  mode: "count",
  groupCount: "3",
  groupSize: "4",
  seed: "",
};
if (canonical(core.DEFAULT_DRAFT) !== canonical(expectedDefaults)) {
  fail("core: DEFAULT_DRAFT mismatch");
}
const expectedExample = {
  names: "王小明\n李小華\n陳小美\n林阿哲\n黃小芬\n吳阿國\n劉小玉\n張阿宏",
  mode: "count",
  groupCount: "3",
  groupSize: "",
  seed: "42",
};
if (canonical(core.EXAMPLE_INPUT) !== canonical(expectedExample)) {
  fail("core: EXAMPLE_INPUT mismatch");
}
if (core.MAX_RAW_UNITS !== 32768) fail("core: MAX_RAW_UNITS must be 32768");
if (core.MAX_NAMES !== 500) fail("core: MAX_NAMES must be 500");
if (core.MAX_NAME_UNITS !== 40) fail("core: MAX_NAME_UNITS must be 40");
if (core.MAX_COUNT_UNITS !== 3) fail("core: MAX_COUNT_UNITS must be 3");
if (core.MAX_SEED_UNITS !== 10) fail("core: MAX_SEED_UNITS must be 10");
if (core.UINT32_MAX !== 4294967295) fail("core: UINT32_MAX must be 4294967295");
if (core.GROUP_MIN !== 1 || core.GROUP_MAX !== 500) fail("core: group range must be 1-500");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "group-generator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.TEXT_FILENAME !== "group-generator-groups.txt") {
  fail("core: TEXT_FILENAME mismatch");
}
if (core.PRNG_INCREMENT !== 0x6d2b79f5) fail("core: PRNG_INCREMENT must be 0x6D2B79F5");
// mulberry32 first draws for seed 42, numerators k (AUTHOR-CHECK,
// independently recomputed with integer arithmetic).
const expectedFirstDraws = [
  2581720956, 1925393290, 3661312704, 2876485805, 750819978, 2261697747, 1173505300,
  2683257857,
];
{
  const next = core.createPrng(42);
  const drawn = expectedFirstDraws.map(() => Math.floor(next() * 4294967296));
  if (JSON.stringify(drawn) !== JSON.stringify(expectedFirstDraws)) {
    fail("core: mulberry32 first draws for seed 42 differ from the pinned values");
  }
}
// Pinned error messages: spot-check every code/field variant.
const expectedMessages = [
  ["SCHEMA", null, null, "zh-Hant", "輸入格式不正確。"],
  ["SCHEMA", null, null, "en", "Input is malformed."],
  ["INPUT_LIMIT", "names", null, "zh-Hant", "名單太長。"],
  ["INPUT_LIMIT", "names", 2, "zh-Hant", "姓名太長（上限 40 字）。"],
  ["INPUT_LIMIT", "seed", null, "en", "Input is too long."],
  ["UNICODE", "names", 1, "zh-Hant", "姓名含有不完整的字元。"],
  ["EMPTY", "names", null, "zh-Hant", "請先輸入名單。"],
  ["EMPTY", "groupCount", null, "en", "Number of groups must not be blank."],
  ["EMPTY", "groupSize", null, "en", "People per group must not be blank."],
  ["EMPTY", "seed", null, "en", "Seed must not be blank."],
  ["ROW_LIMIT", "names", 501, "en", "At most 500 names."],
  ["ENUM", "mode", null, "en", "Choose a grouping mode."],
  ["INTEGER_FORMAT", "seed", null, "en", "Enter a decimal integer with no spaces, sign, decimals or exponent."],
  ["RANGE", "groupCount", null, "zh-Hant", "組數必須介於 1 到 500，且不可大於人數。"],
  ["RANGE", "groupSize", null, "en", "People per group must be between 1 and 500."],
  ["RANGE", "seed", null, "en", "Seed must be between 0 and 4294967295."],
  ["OUTPUT_LIMIT", null, null, "en", "The report is too large to download."],
  ["INTERNAL", null, null, "en", "Something went wrong. Try again."],
];
for (const [code, field, row, lang, text] of expectedMessages) {
  if (core.errorMessage({ code, field, row }, lang) !== text) {
    fail(`core: errorMessage ${code}/${field}/${lang} mismatch`);
  }
}
const expectedStatus = {
  empty: { "zh-Hant": "請輸入名單，或載入範例。", en: "Enter a name list, or load the example." },
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  success: { "zh-Hant": "分組完成", en: "Groups generated" },
  error: { "zh-Hant": "無法分組，請檢查輸入", en: "Cannot generate groups — check the input" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};
if (canonical(core.STATUS_MESSAGES) !== canonical(expectedStatus)) {
  fail("core: STATUS_MESSAGES mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "51fd1ac04063da885fde5ebf4a287599283cca837de03d3075ca92f60ce976fb") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
if (fixtures.specId !== "spec-group-generator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
const basicCount = fixtures.cases.find((entry) => entry.id === "basic-count");
if (canonical(core.EXAMPLE_INPUT) !== canonical(basicCount.input)) {
  fail("core: EXAMPLE_INPUT must equal the basic-count fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the
// seed-fill failure message, the fairness note, the seed help, the
// example note and the draft-loss note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "留空時會自動產生一個種子並顯示出來，之後可用同一種子重現相同分組。",
  "Leave blank to have a seed generated and shown; reuse it to reproduce the same groups.",
  "此瀏覽器無法自動產生種子，請手動輸入種子。",
  "This browser cannot generate a seed automatically; enter a seed manually.",
  "以種子洗牌後依序輪流發牌，每人恰好一組、各組人數最多差 1；相同名單與種子會得到相同分組。",
  "Names are shuffled with the seed and dealt round-robin: everyone lands in exactly one group, group sizes differ by at most one, and the same list and seed always give the same groups.",
  "已載入範例，請按「隨機分組」執行。",
  "Example loaded. Run “Generate groups” to group them.",
  "切換語言或離開頁面會失去草稿。",
  "Switching language or leaving the page discards the draft.",
  "（第 ",
  " (line ",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta (including worker-src blob:), same-language
// home links, local assets, the pinned FAQ answers and fairness note.
// Preview pages carry NO canonical, hreflang, Open Graph or production
// URLs (SPEC section 7).
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "隨機分組產生器｜Gloss Tools",
    description:
      "貼上名單、選組數或每組人數，用可重現的種子洗牌平均分組，每人恰好一組。",
    h1: "隨機分組產生器",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "每行一人，最多 500 人；每名最多 40 字。",
    fairness:
      "以種子洗牌後依序輪流發牌，每人恰好一組、各組人數最多差 1；相同名單與種子會得到相同分組。",
    faq: [
      "同樣的名單和種子會得到一樣的分組嗎？",
      "會。洗牌只由種子決定，重跑或換裝置都相同。",
      "有兩個同名的人怎麼辦？",
      "同名會保留成兩個人，各自獨立分組，不會被合併或刪除。",
      "種子留空會怎樣？",
      "app 會產生一個種子並顯示出來，之後可用同一種子重現。",
    ],
    assets: ['href="./styles/group-generator.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Group Generator | Gloss Tools",
    description:
      "Paste a name list, choose a group count or a group size, and deal everyone into balanced groups with a reproducible seeded shuffle.",
    h1: "Group Generator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "One name per line, at most 500 names; each name at most 40 characters.",
    fairness:
      "Names are shuffled with the seed and dealt round-robin: everyone lands in exactly one group, group sizes differ by at most one, and the same list and seed always give the same groups.",
    faq: [
      "Do the same list and seed give the same groups?",
      "Yes. The shuffle depends only on the seed, so reruns and other devices match.",
      "What about two people with the same name?",
      "Duplicate names are kept as separate people and grouped independently; they are never merged or dropped.",
      "What if I leave the seed blank?",
      "The app generates a seed and shows it, so you can reproduce the same groups later.",
    ],
    assets: ['href="../styles/group-generator.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes("hreflang")) fail(`${page.path}: preview must not carry hreflang`);
  if (html.includes("og:")) fail(`${page.path}: preview must not carry Open Graph tags`);
  if (html.includes("https://")) fail(`${page.path}: preview must not contain production URLs`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
  if (!html.includes(page.fairness)) fail(`${page.path}: missing pinned fairness note`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of ["names", "groupCount", "groupSize", "seed"]) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  if (!html.includes('id="field-mode-count"')) fail(`${page.path}: missing mode radio field-mode-count`);
  if (!html.includes('id="field-mode-size"')) fail(`${page.path}: missing mode radio field-mode-size`);
  if (!html.includes('id="error-mode"')) fail(`${page.path}: missing error slot error-mode`);
  for (const id of ["status", "names-count", "results", "result-summary", "groups-list", "fairness-note", "run-btn", "cancel-btn", "example-btn", "reset-btn", "download-report-btn", "download-text-btn"]) {
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
  const coreSource = await readFile(
    resolve(PROJECT_ROOT, "public/js/core/group-generator.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "group-generator-worker-"));
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

// Core purity: no DOM, storage, network or entropy access in the pure
// modules or the controller. Only public/js/app.js may touch the
// platform entropy source, through the injected fillSeed function.
for (const purePath of [
  "public/js/core/group-generator.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of [
    "document",
    "window",
    "location",
    "navigator",
    "localStorage",
    "sessionStorage",
    "fetch",
    "Math.random",
    "crypto",
  ]) {
    if (new RegExp(`\\b${token.replace(".", "\\.")}\\b`).test(text)) {
      fail(`${purePath}: pure module must not reference ${token}`);
    }
  }
  if (/\bDate\b/.test(text)) fail(`${purePath}: pure module must not reference Date`);
}
{
  const appText = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
  if (!appText.includes("getRandomValues")) {
    fail("public/js/app.js: seed fill must use getRandomValues");
  }
  if (appText.includes("localStorage") || appText.includes("sessionStorage")) {
    fail("public/js/app.js: persistent storage must not be used");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/PRNG/messages/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
