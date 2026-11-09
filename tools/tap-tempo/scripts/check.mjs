// Static project checks for the Tap Tempo BPM detector: required files,
// package contract, the SPEC-pinned core constants and bilingual error
// messages, the vendored fixtures identity (spec id, case counts, and the
// first core case reproduced exactly), bilingual page metadata and the
// candidate noindex/no-canonical rules, the pinned CSP in the preview
// server, syntax of every shipped script, a forbidden-capability scan,
// and core/controller purity. Exits non-zero on the first failure list.

import { execFile } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
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
  "public/js/core/tempo.mjs",
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

// Core contract: pinned constants, error messages, and the report rules
// from the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/tempo.mjs")).href);
if (core.MAX_TAPS !== 512) fail("core: MAX_TAPS must be 512");
if (core.MAX_TIMESTAMP !== 10000000000000) fail("core: MAX_TIMESTAMP must be 10^13");
if (core.RESET_GAP_MS !== 2000) fail("core: RESET_GAP_MS must be 2000");
if (core.WINDOW_SIZE !== 8) fail("core: WINDOW_SIZE must be 8");
if (core.MAX_TOKEN_UNITS !== 16) fail("core: MAX_TOKEN_UNITS must be 16");
if (core.REPORT_FILENAME !== "tap-tempo-report.json") fail("core: REPORT_FILENAME mismatch");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
const expectedMessages = {
  SCHEMA: ["輸入格式不正確", "The input shape is invalid."],
  EMPTY: ["沒有可計算的時間戳", "There are no timestamps to measure."],
  INPUT_LIMIT: ["超過數量上限", "The item limit was exceeded."],
  INTEGER_FORMAT: ["時間戳必須是整數毫秒", "Timestamps must be integer milliseconds."],
  RANGE: ["時間戳超出允許範圍", "A timestamp is out of range."],
  NON_MONOTONIC: ["時間戳必須嚴格遞增", "Timestamps must be strictly increasing."],
  INTERNAL: ["處理失敗，請重試", "Something went wrong. Try again."],
};
for (const [code, [zh, en]] of Object.entries(expectedMessages)) {
  const entry = core.ERROR_MESSAGES[code];
  if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
    fail(`core: ERROR_MESSAGES.${code} mismatch`);
  }
}

// Vendored fixtures identity: the fixed spec candidate's literal cases.
// The core must reproduce the first core case exactly, and the fixture set
// must hold 17 core and 4 controller cases.
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-tap-tempo-20261109") fail("fixtures: specId mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 17) fail(`fixtures: expected 17 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 4) {
  fail(`fixtures: expected 4 controller cases, got ${controllerCases.length}`);
}
if (JSON.stringify(core.run(coreCases[0].input)) !== JSON.stringify(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case steady-120 exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the two
// pinned FAQ answers, and the draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "點按節拍 BPM 偵測｜Gloss Tools",
    description:
      "跟著音樂點按幾下，以最近間隔的中位數即時量出 BPM、每拍毫秒與平均 BPM；停太久自動重新起算，全部在本機計算。",
    h1: "點按節拍 BPM 偵測",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼用中位數？",
      "偶爾敲偏一下不會拉走讀數，平均值同時顯示供對照。",
      "停太久會怎樣？",
      "間隔超過 2000 ms 就重新起算，那一次敲擊是新段落的第一下，先前間隔不列入計算。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: [
      "tap-btn",
      "status",
      "reading-hint",
      "readings",
      "reading-bpm",
      "reading-ms",
      "reading-mean",
      "reading-bps",
      "reading-intervals",
      "segment-row",
      "reading-segment-taps",
      "undo-btn",
      "reset-btn",
      "import-form",
      "import-text",
      "error-taps",
      "measure-btn",
      "cancel-btn",
      "download-btn",
    ],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Tap Tempo — BPM Detector | Gloss Tools",
    description:
      "Tap along to the music to measure BPM from the median of your recent tap intervals, with milliseconds per beat and a mean reading alongside. Everything is computed locally.",
    h1: "Tap Tempo — BPM Detector",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why the median?",
      "One off tap does not drag the reading; the mean is shown alongside for comparison.",
      "What happens after a long pause?",
      "A gap over 2000 ms starts a new segment: that tap is the first tap of the new segment and earlier intervals no longer count.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
    ids: [
      "tap-btn",
      "status",
      "reading-hint",
      "readings",
      "reading-bpm",
      "reading-ms",
      "reading-mean",
      "reading-bps",
      "reading-intervals",
      "segment-row",
      "reading-segment-taps",
      "undo-btn",
      "reset-btn",
      "import-form",
      "import-text",
      "error-taps",
      "measure-btn",
      "cancel-btn",
      "download-btn",
    ],
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
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of page.ids) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id ${id}`);
  }
}

// The preview server must carry exactly the SPEC-pinned CSP.
const serveSource = await readFile(resolve(PROJECT_ROOT, "scripts/serve.mjs"), "utf8");
const expectedCsp =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
if (!serveSource.includes(expectedCsp)) fail("serve.mjs: CSP differs from the SPEC-pinned value");

// Syntax-check every shipped script.
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

// Core purity: no DOM access in the pure core or the controller.
for (const purePath of ["public/js/core/tempo.mjs", "public/js/controller.mjs"]) {
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
  "Check passed: files, package contract, core constants/messages, fixtures identity, pages, CSP, syntax, capability scan, core purity",
);
