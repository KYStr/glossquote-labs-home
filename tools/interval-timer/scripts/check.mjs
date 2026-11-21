// Static project checks for the Interval Timer: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, ranges, segment/total ceilings,
// the example equals the tabata-classic fixture, the pinned bilingual
// strings in the app, bilingual metadata and the candidate canonical /
// noindex / CSP rules), core purity (no DOM/network/storage), syntax of
// every shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure list.

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
  "public/js/core/interval-timer.mjs",
  "public/styles/interval-timer.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/interval-timer-core.test.mjs",
  "test/interval-timer-session.test.mjs",
  "test/interval-timer-controller.test.mjs",
  "test/interval-timer-report.test.mjs",
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
// does not match its own scan. localStorage / sessionStorage are in this
// list: the SPEC pins the draft to the current page only ("資料只保留
// 在目前頁面草稿"), so no page state may be persisted. URL schemes are
// likewise not in this list: the SPEC pins https canonical / Open Graph
// URLs in the pages, and check.mjs asserts those are the only URLs
// present.
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

// Core contract: field order, raw limits, defaults, ranges, ceilings,
// report constants, kind labels and status text, and the example must
// match the SPEC and fixtures.json exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/interval-timer.mjs")).href
);
const expectedFields = ["prepareSeconds", "workSeconds", "restSeconds", "rounds", "finalRest"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  prepareSeconds: 8,
  workSeconds: 8,
  restSeconds: 8,
  rounds: 8,
  finalRest: 8,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  prepareSeconds: "10",
  workSeconds: "30",
  restSeconds: "10",
  rounds: "8",
  finalRest: "skip",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedRanges = {
  prepareSeconds: [0, 3600],
  workSeconds: [1, 3600],
  restSeconds: [0, 3600],
  rounds: [1, 99],
};
if (canonical(core.RANGES) !== canonical(expectedRanges)) {
  fail("core: RANGES mismatch");
}
if (core.MAX_SEGMENTS !== 199) fail("core: MAX_SEGMENTS must be 199");
if (core.MAX_TOTAL_SECONDS !== 716400) fail("core: MAX_TOTAL_SECONDS must be 716400");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "interval-timer-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedKindLabels = {
  prepare: { zh: "準備", en: "Prepare" },
  work: { zh: "運動", en: "Work" },
  rest: { zh: "休息", en: "Rest" },
};
if (canonical(core.KIND_LABELS) !== canonical(expectedKindLabels)) {
  fail("core: KIND_LABELS mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入節目設定，或載入範例。", en: "Enter a program, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行。", en: "Input changed. Run again." },
  busy: { zh: "處理中…", en: "Working…" },
  success: { zh: "節目表已建立。", en: "Program built." },
  error: { zh: "無法建立節目表，請檢查輸入。", en: "Cannot build the program — check the input." },
  cancelled: { zh: "已取消，可重新執行。", en: "Cancelled. You can run again." },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "6133ac436565addcb961071161e276a7c72dfd07f40de6f159a6a2dfae751969") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.length !== 21) fail("test/fixtures.json: expected 21 cases");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "session").length !== 3) {
  fail("test/fixtures.json: expected 3 session cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const tabata = fixtures.cases.find((entry) => entry.id === "tabata-classic");
if (canonical(core.EXAMPLE) !== canonical(tabata.input)) {
  fail("core: EXAMPLE must equal the tabata-classic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the example note and the draft-loss note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "超出允許範圍",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Out of range.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "已載入範例（Tabata：準備 10 秒、運動 20 秒、休息 10 秒、8 回合），請按「建立節目表」執行。",
  "Example loaded (Tabata: prepare 10 s, work 20 s, rest 10 s, 8 rounds). Run “Build program” to build it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// The draft-loss and local-only notes are pinned in the pages (the
// app never writes them; they are static page copy).
const PINNED_PAGE_STRINGS = {
  "public/index.html": [
    "切換語言或離開頁面會失去草稿。",
    "全部計算都在這個頁面本機進行，不上傳、不儲存到伺服器。",
  ],
  "public/en/index.html": [
    "Switching languages or leaving the page loses the draft.",
    "All computation happens locally on this page. Nothing is uploaded or stored on a server.",
  ],
};
for (const [pagePath, strings] of Object.entries(PINNED_PAGE_STRINGS)) {
  const html = await readFile(resolve(PROJECT_ROOT, pagePath), "utf8");
  for (const text of strings) {
    if (!html.includes(text)) fail(`${pagePath}: missing pinned string: ${text}`);
  }
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, the pinned canonical and Open Graph
// tags, same-language home links, local assets, the pinned FAQ answers.
const CSP_META =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "間歇計時器｜Gloss Tools",
    description:
      "先算好準備、運動、休息秒數與回合數的完整多段節目表與總時長，再以同一份節目表驅動間歇計時：暫停不計時，段界提示清楚。",
    h1: "間歇計時器",
    canonical: "https://interval-timer.glossquote.com/",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "準備秒數，0–3,600 秒；0 表示不設準備段。",
    faq: [
      "最後一回合後要不要休息？",
      "由「最後一回合休息」選項決定，預設不含；選「含」會在最後一回合後再加一段休息。",
      "暫停時計時會繼續嗎？",
      "不會。計時核心只吃活動毫秒數，暫停期間不計入；繼續後從暫停時的讀數接續。",
      "段落切換時會有提示嗎？",
      "會。段落切換時畫面會顯示新段落名稱並播報，裝置允許時也會發出短提示音；節目結束時提示音較長。",
    ],
    assets: ['href="./styles/interval-timer.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Interval Timer | Gloss Tools",
    description:
      "Build a full multi-segment program first — prepare, work and rest seconds, rounds, and whether to rest after the final round — then run the same program as a timer: pausing never steals time, and segment boundaries are announced.",
    h1: "Interval Timer",
    canonical: "https://interval-timer.glossquote.com/en/",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "Prepare seconds, 0–3,600. 0 means no prepare segment.",
    faq: [
      "Do I rest after the final round?",
      "That is decided by the “Rest after the final round” option, skipped by default; choose “Include” to add one more rest segment after the final round.",
      "Does the timer keep running while paused?",
      "No. The timer core only consumes active milliseconds, so paused time never counts; resuming continues from the paused reading.",
      "Are segment changes announced?",
      "Yes. A segment change shows and announces the new segment name, and plays a short cue tone when the device allows audio; the program-end tone is longer.",
    ],
    assets: ['href="../styles/interval-timer.css"', 'src="../js/app.js"'],
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
  if (!html.includes(`<link rel="canonical" href="${page.canonical}">`)) {
    fail(`${page.path}: canonical mismatch`);
  }
  if (!html.includes(`<meta property="og:url" content="${page.canonical}">`)) {
    fail(`${page.path}: og:url mismatch`);
  }
  if (!html.includes('<meta property="og:type" content="website">')) {
    fail(`${page.path}: missing og:type`);
  }
  if (!html.includes('<meta name="twitter:card" content="summary">')) {
    fail(`${page.path}: missing twitter:card`);
  }
  // The pinned canonical / og:url are the only URLs in the page.
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 2) fail(`${page.path}: expected exactly 2 https URLs (canonical + og:url), found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
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
  for (const id of [
    "status",
    "results",
    "summary-total",
    "summary-count",
    "summary-rounds",
    "segment-list",
    "timer-panel",
    "timer-phase",
    "timer-segment",
    "timer-remaining",
    "timer-total-remaining",
    "timer-cue",
    "run-btn",
    "example-btn",
    "reset-btn",
    "cancel-btn",
    "download-btn",
    "timer-start-btn",
    "timer-pause-btn",
    "timer-resume-btn",
    "timer-skip-btn",
    "timer-reset-btn",
  ]) {
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
    resolve(PROJECT_ROOT, "public/js/core/interval-timer.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "interval-timer-worker-"));
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

// Core purity: no DOM, storage, or network access in the pure modules
// or the controller. Only public/js/app.js may touch the DOM.
for (const purePath of [
  "public/js/core/interval-timer.mjs",
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
  ]) {
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
  "Check passed: files, package contract, core fields/limits/defaults/ranges/ceilings/labels/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
