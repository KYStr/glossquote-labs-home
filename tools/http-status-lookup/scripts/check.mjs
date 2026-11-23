// Static project checks for the HTTP Status Lookup: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, raw capacity, report filename
// and limit, the 5-class category table, the unassigned strings and
// ranges, the 64-row status table, the example equals the code-200-ok
// fixture input, the vendored fixtures hash, bilingual
// metadata, the pinned FAQ answers, the bilingual table, and the
// candidate noindex / no-canonical rules), core purity (no
// DOM/network/storage/clock), syntax of every shipped script, the
// fixed worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list. The vendored
// test/fixtures.json is a verbatim copy of the fixed spec's fixtures
// (spec-http-status-lookup-20261121, spec candidate commit
// 32869608c658f3785a1fea6134fe5d03a688b37a, draft spec PR #400,
// registry rev 1847); the spec PR is not merged into this branch's
// base, so the check reads the vendored copy rather than a repo-level
// docs path.

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
  "public/js/core/http-status.mjs",
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
// file does not match its own scan. "WebSocket(" (with the call
// parenthesis) is used instead of the bare word: the SPEC's pinned
// 101 cause text legitimately contains the word "WebSocket" as prose
// ("upgrade, e.g. HTTP to WebSocket"), which is data, not a
// capability; only constructing or calling it is forbidden.
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
  ["WebSocket", "("],
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
const FIXTURES_SHA256 = "efe43e2f90d2d039995247b0544d63c08991ea5cd29d35042a3c4ab475a1c55f";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, report
// filename/limit, the pinned category table, the unassigned strings
// and ranges, the 64-row status table (spot-checked here, fully
// checked in test/core.test.mjs against an independent transcription),
// and the example must match the SPEC and the vendored fixtures.json
// case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/http-status.mjs")).href
);
if (!deepEqual(core.FIELDS, ["code"])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.DEFAULTS, { code: "404" })) fail("core: DEFAULTS mismatch");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.REPORT_FILENAME !== "http-status-lookup-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_CATEGORIES = {
  1: {
    key: "informational",
    labelZh: "資訊",
    labelEn: "Informational",
    range: "100–199",
    summaryZh: "請求已收到，繼續處理。",
    summaryEn: "Request received, continuing process.",
  },
  2: {
    key: "success",
    labelZh: "成功",
    labelEn: "Success",
    range: "200–299",
    summaryZh: "請求已成功接收、理解並接受。",
    summaryEn: "The action was successfully received, understood, and accepted.",
  },
  3: {
    key: "redirection",
    labelZh: "重導向",
    labelEn: "Redirection",
    range: "300–399",
    summaryZh: "需要進一步動作才能完成請求。",
    summaryEn: "Further action must be taken in order to complete the request.",
  },
  4: {
    key: "client-error",
    labelZh: "客戶端錯誤",
    labelEn: "Client Error",
    range: "400–499",
    summaryZh: "請求語法錯誤或無法完成。",
    summaryEn: "The request contains bad syntax or cannot be fulfilled.",
  },
  5: {
    key: "server-error",
    labelZh: "伺服器錯誤",
    labelEn: "Server Error",
    range: "500–599",
    summaryZh: "伺服器無法完成看似有效的請求。",
    summaryEn: "The server failed to fulfill an apparently valid request.",
  },
};
if (!deepEqual(core.CATEGORIES, EXPECTED_CATEGORIES)) fail("core: CATEGORIES table mismatch");
if (
  !deepEqual(core.UNASSIGNED, {
    meaningZh: "此代碼在 IANA HTTP 狀態碼登記中為 Unassigned，尚未指派官方語義。",
    meaningEn:
      "This code is Unassigned in the IANA HTTP Status Code Registry; no official semantics are assigned.",
    causeZh: "尚未有標準或實務用途指派此代碼。",
    causeEn: "No standard or practice has assigned a use to this code.",
    adviceZh: "不要依賴此代碼的語義；收到時請以其分類（第 1 個數字）概略理解。",
    adviceEn:
      "Do not rely on any semantics for this code; interpret it only by its class (first digit).",
  })
) {
  fail("core: UNASSIGNED strings mismatch");
}
if (
  core.UNASSIGNED_RANGES !==
  "105–199、209–225、227–299、309–399、419–420、427、430、432–450、452–499、509、512–599"
) {
  fail("core: UNASSIGNED_RANGES mismatch");
}
if (!Array.isArray(core.STATUS_TABLE) || core.STATUS_TABLE.length !== 64) {
  fail("core: STATUS_TABLE must hold exactly 64 rows");
} else {
  const byCode = new Map(core.STATUS_TABLE.map((row) => [row.code, row]));
  const spot = [
    [100, "Continue", "RFC 9110 §15.2.1", false, false],
    [104, "Upload Resumption Supported", "draft-ietf-httpbis-resumable-upload-05", true, false],
    [200, "OK", "RFC 9110 §15.3.1", false, false],
    [226, "IM Used", "RFC 3229", false, false],
    [306, "(Unused)", "RFC 9110 §15.4.7", false, false],
    [404, "Not Found", "RFC 9110 §15.5.5", false, false],
    [413, "Content Too Large", "RFC 9110 §15.5.14", false, false],
    [418, "(Unused)", "RFC 9110 §15.5.19", false, false],
    [422, "Unprocessable Content", "RFC 9110 §15.5.21", false, false],
    [451, "Unavailable For Legal Reasons", "RFC 7725", false, false],
    [510, "Not Extended", "RFC 2774 (OBSOLETED)", false, true],
    [511, "Network Authentication Required", "RFC 6585", false, false],
  ];
  for (const [code, reason, reference, temporary, obsolete] of spot) {
    const row = byCode.get(code);
    if (row === undefined) {
      fail(`core: STATUS_TABLE missing code ${code}`);
      continue;
    }
    if (row.reason !== reason) fail(`core: STATUS_TABLE ${code} reason mismatch`);
    if (row.reference !== reference) fail(`core: STATUS_TABLE ${code} reference mismatch`);
    if (row.temporary !== temporary) fail(`core: STATUS_TABLE ${code} temporary mismatch`);
    if (row.obsolete !== obsolete) fail(`core: STATUS_TABLE ${code} obsolete mismatch`);
  }
  if (byCode.size !== 64) fail("core: STATUS_TABLE codes must be unique");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-http-status-lookup-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, { code: "200" })) {
  fail("core: EXAMPLE must be the SPEC-pinned example (200)");
}
{
  // The SPEC pins the example as fixtures.json's first core case
  // "(200)", but the vendored fixtures actually list
  // code-100-continue first; the explicit value 200 governs (see
  // HANDOFF.md errata candidate 4). The example must still equal the
  // code-200-ok fixture's input.
  const exampleFixture = fixtures.cases.find((entry) => entry.id === "code-200-ok");
  if (!exampleFixture || !deepEqual(core.EXAMPLE, exampleFixture.input)) {
    fail("core: EXAMPLE must equal the code-200-ok fixture input");
  }
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 17) {
  fail("test/fixtures.json: expected 17 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, the pinned FAQ
// answers, the draft-loss note, the form control ids, and the full
// 64-row table with its filter.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "HTTP 狀態碼查詢｜Gloss Tools",
    description:
      "輸入一個 HTTP 狀態碼，立即知道它的分類、官方名稱、中文說明、常見成因與處理建議。",
    h1: "HTTP 狀態碼查詢",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "查不到的代碼怎麼辦？",
      "在 100–599 內但尚未指派的代碼會顯示未指派說明，只以分類概略理解。",
      "會真的去請求某個網址嗎？",
      "不會。本工具只查內建的狀態碼表，不發出任何網路請求。",
      '418 是 "I\'m a teapot" 嗎？',
      "不是。現行 IANA 登記與 RFC 9110 將 418 列為 (Unused)；\"I'm a teapot\" 出自 RFC 2324 愚人節玩笑。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "HTTP Status Lookup | Gloss Tools",
    description:
      "Enter an HTTP status code and see its class, official name, meaning in Chinese, common causes, and what to do about it.",
    h1: "HTTP Status Lookup",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What if a code is not assigned?",
      "A code inside 100–599 with no assignment shows the unassigned note; interpret it only by its class.",
      "Does it request a URL?",
      "No. This tool only looks up the built-in status code table and makes no network requests.",
      'Is 418 "I\'m a teapot"?',
      "No. The current IANA registry and RFC 9110 list 418 as (Unused); \"I'm a teapot\" came from the RFC 2324 April Fools' joke.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-code"];
const ERROR_IDS = ["error-code"];
const REGION_IDS = ["summary-rows", "advice-rows", "flags-note"];
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
  for (const id of FIELD_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing input ${id}`);
  }
  for (const id of ERROR_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing error slot ${id}`);
  }
  for (const id of REGION_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing results region ${id}`);
  }
  if (!html.includes('id="table-filter"')) fail(`${page.path}: missing table filter`);
  if (!html.includes('id="status-table"')) fail(`${page.path}: missing status table`);
  const rows = html.match(/<tr data-class="[1-5]">/g) ?? [];
  if (rows.length !== 64) fail(`${page.path}: status table must hold 64 rows, found ${rows.length}`);
  if (!html.includes("105–199")) fail(`${page.path}: missing unassigned-range note`);
  if (html.includes('data-code="209"') || html.includes('data-code="599"')) {
    fail(`${page.path}: unassigned codes must not be listed row by row`);
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
    resolve(PROJECT_ROOT, "public/js/core/http-status.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "http-status-lookup-worker-"));
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
// controller. The core must be purely a function of its one input
// string, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/http-status.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/http-status.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/http-status.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/http-status.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/capacity/example, categories, unassigned strings/ranges, 64-row table spot checks, pages, syntax, worker concatenation, capability scan, core purity",
);
