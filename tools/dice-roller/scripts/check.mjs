// Static project checks for the Dice Roller: required files, package
// contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, PRNG constant, range limits, the
// example equals the example-2d6 fixture, the pinned bilingual error
// and status strings, bilingual metadata and the preview noindex /
// no-canonical / CSP rules), core purity (no DOM/network/storage/
// clock), syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan (this tool must use no
// persistent storage at all, per the SPEC). Exits non-zero on the
// first failure list.

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
  "public/js/core/dice-roller.mjs",
  "public/styles/dice-roller.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/dice-roller-core.test.mjs",
  "test/dice-roller-controller.test.mjs",
  "test/dice-roller-report.test.mjs",
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
// does not match its own scan. localStorage / sessionStorage are in
// this list: the SPEC forbids persistent storage for this tool, and no
// shipped file may touch it.
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

// Core contract: field order, raw limits, defaults, PRNG constant,
// range limits, report constants, and the example must match the SPEC
// and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/dice-roller.mjs")).href);
const expectedFields = ["notation", "seed"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { notation: 32, seed: 10 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { notation: "2d6", seed: "" };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
const expectedExample = { notation: "2d6", seed: "42" };
if (canonical(core.EXAMPLE) !== canonical(expectedExample)) {
  fail("core: EXAMPLE must be { notation: '2d6', seed: '42' }");
}
if (core.PRNG_INCREMENT !== 0x6d2b79f5) fail("core: PRNG_INCREMENT must be 0x6D2B79F5");
if (core.COUNT_MIN !== 1 || core.COUNT_MAX !== 100) fail("core: count range must be 1-100");
if (core.SIDES_MIN !== 2 || core.SIDES_MAX !== 1000) fail("core: sides range must be 2-1000");
if (core.MODIFIER_LIMIT !== 10000) fail("core: MODIFIER_LIMIT must be 10000");
if (core.SEED_MAX !== 4294967295) fail("core: SEED_MAX must be 4294967295");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "dice-roller-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const expectedStatus = {
  empty: { "zh-Hant": "準備就緒", en: "Ready" },
  dirty: { "zh-Hant": "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { "zh-Hant": "處理中", en: "Working" },
  success: { "zh-Hant": "擲骰完成", en: "Roll complete" },
  error: { "zh-Hant": "無法擲骰，請檢查輸入", en: "Cannot roll — check your input" },
  cancelled: { "zh-Hant": "已取消，可重新執行", en: "Cancelled. You can run again." },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
// Spot-check the pinned error messages, including the NOTATION
// position substitution (position is 0-based; the message is 1-based).
if (core.formatErrorMessage({ code: "NOTATION", field: "notation", row: null, position: 2 }, "zh-Hant") !== "骰式格式不正確，請檢查第 3 個字元。") {
  fail("core: NOTATION zh message mismatch");
}
if (core.formatErrorMessage({ code: "NOTATION", field: "notation", row: null, position: 2 }, "en") !== "Dice notation is invalid. Check character 3.") {
  fail("core: NOTATION en message mismatch");
}
if (core.formatErrorMessage({ code: "RANGE", field: "notation", row: null, component: "count" }, "zh-Hant") !== "骰子數量必須介於 1 到 100。") {
  fail("core: RANGE/count zh message mismatch");
}
if (core.formatErrorMessage({ code: "RANGE", field: "seed", row: null }, "en") !== "Seed must be between 0 and 4294967295.") {
  fail("core: RANGE/seed en message mismatch");
}
if (core.formatErrorMessage({ code: "EMPTY", field: "seed", row: null }, "zh-Hant") !== "種子不可空白。") {
  fail("core: EMPTY/seed zh message mismatch");
}
if (core.formatErrorMessage({ code: "INTEGER_FORMAT", field: "seed", row: null }, "en") !== "Enter a decimal integer with no spaces, sign, decimals or exponent.") {
  fail("core: INTEGER_FORMAT en message mismatch");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "189ee1c7a7ed35082a3816695183422f1c03ddc5d7f0fd011dee26141d27b792") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (fixtures.schemaVersion !== 1 || fixtures.specId !== "spec-dice-roller-20261109") {
  fail("test/fixtures.json: schemaVersion/specId mismatch");
}
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 21) {
  fail("test/fixtures.json: expected 21 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const exampleCase = fixtures.cases.find((entry) => entry.id === "example-2d6");
if (canonical(core.EXAMPLE) !== canonical(exampleCase.input)) {
  fail("core: EXAMPLE must equal the example-2d6 fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the seed
// auto-fill note, the example note, and the draft-discarded note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "已載入範例，請按「擲骰」執行。",
  "Example loaded. Run “Roll dice” to roll it.",
  "切換語言或離開頁面會失去草稿。",
  "Switching language or leaving the page discards the draft.",
  "getRandomValues",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}
if (appSource.includes("localStorage") || appSource.includes("sessionStorage")) {
  fail("public/js/app.js: storage must not be used");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta, same-language home links, local
// assets, the pinned FAQ answers. Per the SPEC, the preview candidate
// carries no production canonical, hreflang, sitemap, or Open Graph /
// Twitter tags, and no https URL at all.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "骰子模擬器｜Gloss Tools",
    description:
      "輸入 NdM 骰式與可重現種子，逐顆擲出每顆骰子的結果與總和；同一種子永遠擲出同一組結果。",
    h1: "骰子模擬器",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: "格式 NdM，可加 +K 或 -K，例如 2d6+3",
    faq: [
      "d20 是什麼意思？",
      "只寫 d 和面數時，骰子數量預設為 1，所以 d20 就是擲一顆 20 面骰。",
      "為什麼同一種子擲出同樣結果？",
      "本工具使用 mulberry32 假隨機產生器，結果完全由種子決定，方便重現與核對。",
      "種子留空會怎樣？",
      "執行時會以密碼學隨機產生一個種子並顯示在欄位中，之後可用同一種子重現。",
      "這是真隨機嗎？",
      "不是；這是決定性的假隨機，適合桌遊、教學與程式測試，不應用於賭博或安全用途。",
    ],
    assets: ['href="./styles/dice-roller.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Dice Roller | Gloss Tools",
    description:
      "Roll dice from NdM notation with a reproducible seed: per-die results in order plus the total — the same seed always rolls the same dice.",
    h1: "Dice Roller",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: "Format NdM with optional +K or -K, e.g. 2d6+3",
    faq: [
      'What does "d20" mean?',
      "With no count, the count defaults to 1 — one 20-sided die.",
      "Why does the same seed roll the same dice?",
      "The tool uses the mulberry32 pseudorandom generator; results are fully determined by the seed, so any roll can be reproduced and checked.",
      "What happens if the seed is blank?",
      "At run time a cryptographically random seed is generated and shown in the field; reuse it to reproduce the roll.",
      "Is this true randomness?",
      "No. It is deterministic pseudorandom output, fine for games, teaching and testing — not for gambling or security.",
    ],
    assets: ['href="../styles/dice-roller.css"', 'src="../js/app.js"'],
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
  if (html.includes("rel=\"canonical\"")) fail(`${page.path}: preview must not carry a canonical`);
  if (html.includes("hreflang")) fail(`${page.path}: preview must not carry hreflang`);
  if (html.includes("og:")) fail(`${page.path}: preview must not carry Open Graph tags`);
  if (html.includes("twitter:card")) fail(`${page.path}: preview must not carry a twitter card`);
  if (html.includes("https://")) fail(`${page.path}: preview must not contain an https URL`);
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
  for (const id of ["status", "results", "result-summary", "rolls-list", "result-modifier", "run-btn", "cancel-btn", "example-btn", "reset-btn", "download-btn"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/dice-roller.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "dice-roller-worker-"));
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

// Core purity: no DOM, storage, network, or clock access in the pure
// modules or the controller. The app is the only file allowed to touch
// the DOM, and it must not touch storage either.
for (const purePath of [
  "public/js/core/dice-roller.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage", "Date", "crypto", "Math.random"]) {
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
  "Check passed: files, package contract, core fields/limits/defaults/constants/status/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
