// Static project checks for the Password Strength Checker: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field, defaults, capacity, frozen common-password /
// dictionary / keyboard tables, band thresholds, report filename and
// limit, example equals the vendored fixtures.json case 1, the
// vendored fixtures hash, bilingual metadata, the pinned FAQ
// answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-password-strength-checker-20261121, draft spec PR #393,
// head 55d35a4c9194c83f8e2cf63d60d8cfec4465d28f, OPEN at build time,
// fixtures SHA-256 verified against that head via git show); the
// spec PR is not merged into this branch's base, so the check reads
// the vendored copy rather than a repo-level docs path.
// Privacy pins: no copy-password affordance anywhere in the shipped
// pages or scripts, and the example password literal never appears
// in page text, notes, or evidence strings (it lives only in the
// core EXAMPLE constant and the vendored fixtures).

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
  "public/js/core/password-strength.mjs",
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
const FIXTURES_SHA256 = "145d047495902db7420f3419347b6426ba07b41c452a436ad64b6ecea3f01951";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field, defaults, capacity, frozen tables, report
// filename/limit, band labels, and the example must match the SPEC
// and the vendored fixtures.json case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/password-strength.mjs")).href
);
if (!deepEqual(core.FIELDS, ["password"])) fail("core: FIELDS order mismatch");
if (!deepEqual(core.DEFAULTS, { password: "" })) fail("core: DEFAULTS mismatch");
if (core.MAX_CODE_POINTS !== 128) fail("core: MAX_CODE_POINTS must be 128");
if (core.MAX_TOTAL_PENALTY_BITS !== 40) fail("core: MAX_TOTAL_PENALTY_BITS must be 40");
if (core.ONLINE_RATE_PER_SECOND !== 10) fail("core: ONLINE_RATE_PER_SECOND must be 10");
if (core.OFFLINE_RATE_PER_SECOND !== 1e10) fail("core: OFFLINE_RATE_PER_SECOND must be 1e10");
if (core.SECONDS_PER_YEAR !== 31557600) fail("core: SECONDS_PER_YEAR must be 31557600");
if (core.REPORT_FILENAME !== "password-strength-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const EXPECTED_COMMON = [
  "123456", "123456789", "12345678", "password", "qwerty123", "qwerty1",
  "111111", "12345", "secret", "123123", "qwerty", "abc123", "dragon",
  "monkey", "123123123", "qwertyuiop",
];
if (!deepEqual(core.COMMON_PASSWORDS, EXPECTED_COMMON)) {
  fail("core: COMMON_PASSWORDS table mismatch (must be the frozen 16)");
}
const EXPECTED_DICTIONARY = [
  "password", "admin", "welcome", "monkey", "dragon", "football",
  "sunshine", "master", "shadow", "superman", "qwerty", "letmein",
  "trustno1", "iloveyou", "princess", "summer", "winter", "hello",
  "secret", "freedom", "cheese", "cookie", "banana", "tiger", "soccer",
  "baseball", "charlie", "jordan", "michael", "correct", "horse",
  "battery", "staple", "autumn", "spring", "pepper", "orange", "apple",
  "hockey", "whatever",
];
if (!deepEqual(core.DICTIONARY_WORDS, EXPECTED_DICTIONARY)) {
  fail("core: DICTIONARY_WORDS table mismatch (must be the frozen 40, in order)");
}
if (core.DICTIONARY_WORDS.length !== 40) fail("core: DICTIONARY_WORDS must hold 40 words");
if (!deepEqual(core.KEYBOARD_ROWS, ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"])) {
  fail("core: KEYBOARD_ROWS mismatch (must be the frozen 4 QWERTY rows)");
}
if (core.SYMBOL_CHARS.length !== 32) fail("core: SYMBOL_CHARS must hold 32 symbols");
const EXPECTED_BANDS = {
  "very weak": { zh: "非常弱", en: "Very weak" },
  weak: { zh: "弱", en: "Weak" },
  fair: { zh: "普通", en: "Fair" },
  strong: { zh: "強", en: "Strong" },
  "very strong": { zh: "非常強", en: "Very strong" },
};
if (!deepEqual(core.BAND_LABELS, EXPECTED_BANDS)) fail("core: BAND_LABELS mismatch");
if (
  core.DISCLAIMER_ZH !==
  "強度數字是模型估算，不是保證；再強的密碼也可能因外洩、釣魚或重複使用而失效。密碼絕不離開本頁、不儲存。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "Strength figures are model estimates, not a guarantee — even a strong password can fail through leaks, phishing, or reuse. Your password never leaves this page and is never stored."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-password-strength-checker-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 14) {
  fail("test/fixtures.json: expected 14 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the bilingual disclaimer in both languages on both pages, the
// pinned FAQ answers, the draft-loss note, and the form control ids.
// Privacy: neither page may print the example password literal, and
// neither page may offer any copy-password affordance.
const DISCLAIMER_ZH =
  "強度數字是模型估算，不是保證；再強的密碼也可能因外洩、釣魚或重複使用而失效。密碼絕不離開本頁、不儲存。";
const DISCLAIMER_EN =
  "Strength figures are model estimates, not a guarantee — even a strong password can fail through leaks, phishing, or reuse. Your password never leaves this page and is never stored.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "密碼強度檢查｜Gloss Tools",
    description:
      "輸入密碼，立即看到熵、強度等級、預估破解時間與改進建議；密碼絕不離開本頁、不儲存。",
    h1: "密碼強度檢查",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "這個等級是保證嗎？",
      "不是保證，是依本文公開模型的估算。",
      "我的密碼會被傳送或儲存嗎？",
      "不會。全部計算都在你的瀏覽器本機完成，不傳送、不儲存、不寫入網址或紀錄。",
      "為什麼 `P@ssw0rd!` 只有「普通」？",
      "本工具不做 leet 還原（`@` 不視為 `a`），該密碼 9 碼、四類字元，基礎熵 59.0 bits，落在 36–59.9 的「普通」區間。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Password Strength Checker | Gloss Tools",
    description:
      "Check a password's entropy, strength band, estimated crack time, and concrete improvements — computed locally, never sent or stored.",
    h1: "Password Strength Checker",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Is this band a guarantee?",
      "No — it is an estimate under this page's published model.",
      "Is my password sent or stored?",
      "No. All computation runs locally in your browser; nothing is sent, stored, or written to the URL or logs.",
      "Why is `P@ssw0rd!` only “fair”?",
      "This tool does no leet substitution (`@` is not read as `a`); at 9 characters across four classes its base entropy is 59.0 bits, inside the 36–59.9 “fair” band.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = ["field-password"];
const ERROR_IDS = ["error-password"];
const REGION_IDS = ["summary-rows", "penalty-rows", "suggestion-rows", "band-fill"];
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
  if (!html.includes('type="password"')) fail(`${page.path}: password field must be type=password`);
  if (!html.includes('autocomplete="off"')) fail(`${page.path}: password field must disable autocomplete`);
  // Privacy: the example password literal must never appear in page
  // text, and no copy-password affordance may exist.
  if (html.includes("Tr0ub4dor&3")) fail(`${page.path}: example password literal must not appear in page text`);
  if (/copy/i.test(html) && html.toLowerCase().includes("password")) {
    fail(`${page.path}: no copy-password affordance allowed`);
  }
  if (html.includes("clipboard")) fail(`${page.path}: no clipboard use allowed`);
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
    resolve(PROJECT_ROOT, "public/js/core/password-strength.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "password-strength-checker-worker-"));
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
  // Privacy: the example password literal must not leak into the
  // app script (it belongs only in the core EXAMPLE constant and
  // the vendored fixtures; the site test legitimately names it only
  // to assert its absence from the pages).
  if (file.endsWith("public/js/app.js") && text.includes("Tr0ub4dor&3")) {
    fail(`${file}: example password literal must not appear here`);
  }
}

// Core purity: no DOM access and no clock in the pure modules or the
// controller. The core must be purely a function of its one input
// string, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/password-strength.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/password-strength.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/password-strength.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/password-strength.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core field/defaults/capacity/frozen tables/example, pages, syntax, worker concatenation, capability scan, core purity",
);
