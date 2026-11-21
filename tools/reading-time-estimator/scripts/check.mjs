// Static project checks for the Reading Time Estimator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, rate ranges, the example equals the
// zh-basic fixture, the pinned bilingual strings in the app, bilingual
// metadata and the preview noindex / CSP / no-canonical rules), core
// purity (no DOM/network/storage), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability scan.
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
  "public/js/core/reading-time.mjs",
  "public/styles/reading-time.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/reading-time-core.test.mjs",
  "test/reading-time-controller.test.mjs",
  "test/reading-time-report.test.mjs",
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
// does not match its own scan. Persistent storage is deliberately IN
// this list: the SPEC forbids persistent storage for this tool (the
// draft lives only in the current page), so no shipped file may touch
// it. URL schemes are likewise not in this list: the SPEC pins no
// absolute URLs in the preview pages, and check.mjs asserts there are
// none.
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

// Core contract: field order, raw limits, defaults, rate ranges, report
// constants, and the example must match the SPEC and fixtures.json
// exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/reading-time.mjs")).href);
const expectedFields = ["text", "zhSilentRate", "zhSpeakRate", "enSilentRate", "enSpeakRate"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  text: 100000,
  zhSilentRate: 8,
  zhSpeakRate: 8,
  enSilentRate: 8,
  enSpeakRate: 8,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
if (core.TEXT_LIMIT !== 100000) fail("core: TEXT_LIMIT must be 100000");
const expectedDefaults = {
  text: "",
  zhSilentRate: "400",
  zhSpeakRate: "240",
  enSilentRate: "200",
  enSpeakRate: "150",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = {
  text: "閱讀時間估算",
  zhSilentRate: "400",
  zhSpeakRate: "240",
  enSilentRate: "200",
  enSpeakRate: "150",
};
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE mismatch (must equal the zh-basic fixture input)");
}
const expectedRateRanges = {
  zhSilentRate: { min: 50, max: 2000 },
  zhSpeakRate: { min: 50, max: 1200 },
  enSilentRate: { min: 50, max: 1000 },
  enSpeakRate: { min: 50, max: 600 },
};
if (canonical(core.RATE_RANGES) !== canonical(expectedRateRanges)) {
  fail("core: RATE_RANGES mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "reading-time-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { zh: "請輸入本文，或載入範例。", en: "Enter your text, or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "估算完成", en: "Estimate complete" },
  error: { zh: "無法估算，請檢查輸入", en: "Cannot estimate — check input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "dad1d90236dd961d76d8d33e1e5123ac895a799edb15d4d371b612df66d00bf4") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.specId !== "spec-reading-time-estimator-20261109") {
  fail("test/fixtures.json: specId mismatch");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const zhBasic = fixtures.cases.find((entry) => entry.id === "zh-basic");
if (canonical(core.EXAMPLE) !== canonical(zhBasic.input)) {
  fail("core: EXAMPLE must equal the zh-basic fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the example note, the zero-count note, and the result
// line fragments.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請輸入整數",
  "超出允許範圍",
  "估算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Enter a whole number.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "已載入範例，請按「估算閱讀時間」執行。",
  "Example loaded. Run “Estimate reading time” to compute it.",
  "計數為 0：本文只有空白或符號，或只有日文假名、韓文等本工具 v1 不計數的字元。",
  "Counts are zero: the text has only spaces or symbols, or only characters v1 does not count, such as Japanese kana or Korean syllables.",
  "計數規則：漢字逐字計；英文以空白分詞，token 含 ASCII 字母或數字才算 1 詞；總秒數只捨入一次。",
  "Counting rules: CJK characters are counted one by one; English tokens are split on whitespace and count as one word when they contain an ASCII letter or digit; total seconds are rounded only once.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, no production canonical or hreflang,
// no absolute URLs, same-language home links, local assets, the pinned
// FAQ answers.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "閱讀時間估算｜Gloss Tools",
    description:
      "貼上中文、英文或混寫的稿子，依釘版計數規則與可調速度，估算靜讀與朗讀各需要多久。",
    h1: "閱讀時間估算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    draftNote: "切換語言或離開頁面會失去草稿。",
    faq: [
      "中文為什麼數字數不分詞？",
      "中文沒有空格分詞，本工具以字數乘上可調的字/分速度估算；要逐詞頻率請用字詞頻率工具。",
      "朗讀時間可以保證錄音長度嗎？",
      "不行，這是依平均速度的估算，停頓與語氣都會改變實際長度，本工具也不會真的發出聲音。",
      "英文的連字號詞怎麼算？",
      "只以空白分詞，well-known 算 1 詞；全形字母數字不算英文詞。",
      "速度預設值是哪來的？",
      "是常見公開範圍內選定的可調慣例值，不是自然常數，請改成你自己的速度。",
      "日文或韓文本文為什麼計數是 0？",
      "v1 的漢字區段只含表意文字，假名與韓文音節不在其中，也不是英文詞，頁面會提示此限制。",
    ],
    assets: ['href="./styles/reading-time.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Reading Time Estimator | Gloss Tools",
    description:
      "Paste Chinese, English or mixed text and estimate silent reading and read-aloud time from pinned counting rules and adjustable speeds.",
    h1: "Reading Time Estimator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    draftNote: "Switching language or leaving this page discards your draft.",
    faq: [
      "Why count characters instead of words for Chinese?",
      "Chinese text has no spaces between words, so this tool multiplies the character count by an adjustable characters-per-minute rate. For per-word frequencies, use the frequency counter.",
      "Can the speaking time guarantee my recording length?",
      "No. It is an estimate from average rates; pauses and delivery change the real duration, and this tool never plays audio.",
      "How are hyphenated English words counted?",
      "Tokens are split on whitespace only, so well-known counts as 1 word; full-width letters and digits do not count as English words.",
      "Where do the default speeds come from?",
      "They are adjustable conventions chosen inside commonly published ranges, not constants of nature; set them to your own pace.",
      "Why does Japanese or Korean text count as zero?",
      "In v1 the character ranges cover ideographs only; kana and Hangul syllables are neither CJK ideographs here nor English words, and the page discloses this limit.",
    ],
    assets: ['href="../styles/reading-time.css"', 'src="../js/app.js"'],
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
  if (html.includes('rel="canonical"')) fail(`${page.path}: no production canonical in preview`);
  if (html.includes("hreflang")) fail(`${page.path}: no hreflang in preview`);
  // No absolute URLs in the preview pages: language and home links
  // are relative paths only.
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected 0 https URLs in preview, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
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
  for (const id of ["status", "results", "counts", "silent-time", "speak-time", "rates-echo", "rules-echo", "zero-note", "run-btn", "example-btn", "cancel-btn", "reset-btn", "download-btn", "example-note"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/reading-time.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "reading-time-estimator-worker-"));
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
// or the controller. The app also never touches persistent storage:
// the draft lives only in the current page.
for (const purePath of [
  "public/js/core/reading-time.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/app.js",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (purePath === "public/js/app.js" && (token === "document" || token === "window")) continue;
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: must not reference ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/rate ranges/example/status, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
