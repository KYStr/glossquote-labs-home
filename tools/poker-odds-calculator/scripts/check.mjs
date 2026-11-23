// Static project checks for the Poker Odds Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, limits, report filename and
// limit, category table, example equals the vendored fixtures.json
// case 1, the vendored fixtures hash, bilingual metadata, the pinned
// FAQ answers, the bilingual disclaimer, and the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage/clock),
// syntax of every shipped script, the fixed worker-source
// concatenation, and a forbidden-capability scan. Exits non-zero on
// the first failure list. The vendored test/fixtures.json is a
// verbatim copy of the fixed spec's fixtures
// (spec-poker-odds-calculator-20261121, spec candidate commit
// unknown to this branch, draft spec PR #395); the spec PR is not
// merged into this branch's base, so the check reads the vendored
// copy rather than a repo-level docs path.

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
  "public/js/core/poker-odds.mjs",
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
const FIXTURES_SHA256 = "94fa04850beb87da0eca296fc121172fd50c3b8ccc819ff0e0c7414142ca1077";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacities, ranges, the
// exact/MC constants, report filename/limit, the category slugs, and
// the example must match the SPEC and the vendored fixtures.json
// case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/poker-odds.mjs")).href
);
if (!deepEqual(core.FIELDS, ["holeCards", "boardCards", "opponents", "pot", "toCall"])) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    holeCards: ["As", "Ks"],
    boardCards: ["Qs", "7s", "2c"],
    opponents: "1",
    pot: "",
    toCall: "",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_HOLE_CARDS !== 15) fail("core: MAX_RAW_HOLE_CARDS must be 15");
if (core.MAX_RAW_BOARD_CARDS !== 29) fail("core: MAX_RAW_BOARD_CARDS must be 29");
if (core.MAX_RAW_INTEGER !== 10) fail("core: MAX_RAW_INTEGER must be 10");
if (core.OPPONENTS_MIN !== 1 || core.OPPONENTS_MAX !== 9) {
  fail("core: opponents range must be 1-9");
}
if (core.AMOUNT_MIN !== 0 || core.AMOUNT_MAX !== 1000000000) {
  fail("core: amount range must be 0-1,000,000,000");
}
if (core.EXACT_SCENARIO_LIMIT !== 2000000) {
  fail("core: EXACT_SCENARIO_LIMIT must be 2000000");
}
if (core.MONTE_CARLO_TRIALS !== 100000) fail("core: MONTE_CARLO_TRIALS must be 100000");
if (core.MONTE_CARLO_SEED !== 20261121) fail("core: MONTE_CARLO_SEED must be 20261121");
if (core.REPORT_FILENAME !== "poker-odds-calculator-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  !deepEqual(core.CATEGORY_SLUGS, [
    "high-card",
    "pair",
    "two-pair",
    "three-of-a-kind",
    "straight",
    "flush",
    "full-house",
    "four-of-a-kind",
    "straight-flush",
  ])
) {
  fail("core: CATEGORY_SLUGS mismatch");
}
if (
  core.DISCLAIMER_ZH !==
  "本工具僅供娛樂與機率教學參考，不構成任何投注建議。所有機率皆假設一副公平洗勻的 52 張牌，且對手手牌未知、均勻隨機；實際結果無法保證。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This tool is for entertainment and probability education only, not betting advice. All probabilities assume a fair, randomly shuffled 52-card deck and that opponents' hole cards are unknown and uniformly random; actual outcomes are not guaranteed."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-poker-odds-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
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
  "本工具僅供娛樂與機率教學參考，不構成任何投注建議。所有機率皆假設一副公平洗勻的 52 張牌，且對手手牌未知、均勻隨機；實際結果無法保證。";
const DISCLAIMER_EN =
  "This tool is for entertainment and probability education only, not betting advice. All probabilities assume a fair, randomly shuffled 52-card deck and that opponents' hole cards are unknown and uniformly random; actual outcomes are not guaranteed.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "德州撲克勝率｜Gloss Tools",
    description:
      "輸入手牌與公共牌，算出 outs、命中率、對戰勝率與底池賠率提示。",
    h1: "德州撲克勝率",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "2/4 法則準嗎？",
      "只是近似值，outs 越大誤差越大，精確命中率請看超幾何公式的數字。",
      "為什麼勝率假設對手是隨機手牌？",
      "因為對手的手牌未知，本工具不依行動推斷手牌範圍。",
      "河牌圈還能算 outs 嗎？",
      "沒有牌可發了，outs 為 0，勝率只由對手兩張牌的組合決定。",
      "跟注提示是保證嗎？",
      "不是。提示只是把權益與底池賠率的損益平衡點比較，屬於期望值參考。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Poker Odds Calculator | Gloss Tools",
    description:
      "Enter hole and board cards to get outs, hit rates, win equity against N opponents, and a pot-odds call/fold hint.",
    h1: "Poker Odds Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Is the rule of 2/4 exact?",
      "No, it is only an approximation; the error grows with more outs. See the exact hypergeometric hit rate.",
      "Why does equity assume random opponent hands?",
      "Opponents' hole cards are unknown, and this tool does not infer hand ranges from actions.",
      "Are there outs on the river?",
      "No cards are left to come, so outs are 0; equity comes only from opponents' hole-card combinations.",
      "Is the call/fold hint a guarantee?",
      "No. It only compares equity with the pot-odds break-even point, as an expected-value reference.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-hole-cards",
  "field-board-cards",
  "field-opponents",
  "field-pot",
  "field-to-call",
];
const ERROR_IDS = [
  "error-hole-cards",
  "error-board-cards",
  "error-opponents",
  "error-pot",
  "error-to-call",
];
const REGION_IDS = [
  "summary-rows",
  "equity-rows",
  "distribution-rows",
  "pot-rows",
  "monte-carlo-note",
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

// The SPEC-pinned Monte Carlo note must appear in the app strings
// (both languages), shown beside Monte Carlo results only.
const appText = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
if (!appText.includes("蒙地卡羅估計，95% 信賴區間半寬至多 ±0.31 個百分點")) {
  fail("public/js/app.js: missing pinned Monte Carlo note (zh)");
}
if (!appText.includes("Monte Carlo estimate, 95% CI half-width at most ±0.31 pp")) {
  fail("public/js/app.js: missing pinned Monte Carlo note (en)");
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
    resolve(PROJECT_ROOT, "public/js/core/poker-odds.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "poker-odds-calculator-worker-"));
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
// controller. The core must be purely a function of its inputs, so a
// bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/poker-odds.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/poker-odds.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/poker-odds.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/poker-odds.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/limits/example, pages, Monte Carlo note, syntax, worker concatenation, capability scan, core purity",
);
