// Static project checks for the Mahjong Score Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (fixed tai table values, the 24 selectable codes, the 8
// overridable codes in pinned order, the 30-line display order,
// DEFAULTS equal to the SPEC reset object, EXAMPLE equal to the
// vendored fixtures.json case 1, bilingual pinned metadata and FAQs,
// every form control present in both pages, the candidate noindex /
// no-canonical rules), core purity (no DOM/network/storage), syntax
// of every shipped script, and a forbidden-capability scan. Exits
// non-zero listing every failure. The vendored test/fixtures.json is
// a verbatim copy of the fixed spec's fixtures (spec candidate
// 1afe86cfee8dc968298e8ec767b56fb4cd15f738); the spec PR is not
// merged into this branch's base, so the check reads the vendored
// copy rather than a repo-level docs path.

import assert from "node:assert/strict";
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
  "public/js/core/mahjong.mjs",
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

// Package contract: Node >=24, ESM, exactly the expected scripts,
// zero dependencies.
const pkg = JSON.parse(await readFile(resolve(PROJECT_ROOT, "package.json"), "utf8"));
if (pkg.type !== "module") fail("package.json: type must be module");
if (pkg.engines?.node !== ">=24") fail("package.json: engines.node must be >=24");
for (const [name, command] of Object.entries(EXPECTED_SCRIPTS)) {
  if (pkg.scripts?.[name] !== command) fail(`package.json: script ${name} mismatch`);
}
if (Object.keys(pkg.scripts ?? {}).length !== Object.keys(EXPECTED_SCRIPTS).length) {
  fail("package.json: unexpected extra scripts");
}
for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) fail(`package.json: ${key} must be empty`);
}

// Forbidden-capability scan over shipped sources (this file exempt).
const publicFiles = await collectFiles(resolve(PROJECT_ROOT, "public"));
const scriptFiles = (await collectFiles(resolve(PROJECT_ROOT, "scripts"))).filter(
  (path) => !path.endsWith("check.mjs"),
);
for (const path of [...publicFiles, ...scriptFiles]) {
  if (!SCANNED_EXTENSIONS.has(extname(path))) continue;
  const text = await readFile(path, "utf8");
  for (const token of forbiddenTokens) {
    if (text.includes(token)) fail(`Forbidden token ${JSON.stringify(token)} in ${path}`);
  }
}

// Syntax of every shipped script.
for (const path of [...publicFiles, ...scriptFiles]) {
  if (![".js", ".mjs"].includes(extname(path))) continue;
  try {
    await execFileAsync(process.execPath, ["--check", path]);
  } catch {
    fail(`Syntax check failed: ${path}`);
  }
}

// Core statics against the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/mahjong.mjs")).href);
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.specId !== "spec-mahjong-score-calculator-20261109") fail("fixtures: specId mismatch");
if (fixtures.slug !== "mahjong-score-calculator") fail("fixtures: slug mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 10) fail(`fixtures: expected 10 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 3) fail(`fixtures: expected 3 controller cases, got ${controllerCases.length}`);
if (!deepEqual(core.EXAMPLE, coreCases[0].input)) fail("core: EXAMPLE differs from fixtures case 1 input");
if (
  !deepEqual(core.DEFAULTS, {
    winMethod: "discard",
    winnerIsDealer: false,
    discarderIsDealer: false,
    dealerStreak: "0",
    base: "100",
    perTai: "50",
    cap: "none",
    selected: {},
    honorFlowers: "0",
    offFlowers: "0",
    kongCount: "0",
    overrides: {},
  })
) {
  fail("core: DEFAULTS differs from the SPEC reset object");
}
if (core.SELECTABLE_CODES.length !== 24) fail("core: SELECTABLE_CODES must hold 24 codes");
if (
  !deepEqual(core.OVERRIDABLE_CODES, [
    "PING_HU",
    "FIVE_SUITED",
    "HEAVENLY_LISTEN",
    "EARTHLY_LISTEN",
    "FLOWER_KONG",
    "HONOR_FLOWER_EACH",
    "THREE_KONGS",
    "FOUR_KONGS",
  ])
) {
  fail("core: OVERRIDABLE_CODES order mismatch");
}
if (core.LINE_ORDER.length !== 30 || core.LINE_ORDER[29] !== "DEALER") {
  fail("core: LINE_ORDER must hold 30 codes ending in DEALER");
}
const expectedTai = {
  ALL_HONORS: 16,
  BIG_DRAGONS: 8,
  SMALL_DRAGONS: 4,
  FULL_FLUSH: 8,
  HALF_FLUSH: 4,
  ALL_PUNGS: 4,
  PING_HU: 2,
  FIVE_SUITED: 1,
  ALL_FROM_ONE: 2,
  MENQING: 1,
  SELF_DRAW: 1,
  MENQING_SELF_DRAW: 3,
  HEAVENLY_LISTEN: 8,
  EARTHLY_LISTEN: 4,
  SEVEN_ROB_ONE: 8,
  ALL_FLOWERS: 8,
  THREE_KONGS: 2,
  FOUR_KONGS: 5,
};
for (const [code, tai] of Object.entries(expectedTai)) {
  if (core.DEFAULT_TAI[code] !== tai) fail(`core: DEFAULT_TAI.${code} must be ${tai}`);
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES must be 2097152");
if (core.REPORT_FILENAME !== "mahjong-score-report.json") fail("core: REPORT_FILENAME mismatch");

// Core and controller purity: no DOM globals in the pure modules.
for (const path of ["public/js/core/mahjong.mjs", "public/js/controller.mjs"]) {
  const text = await readFile(resolve(PROJECT_ROOT, path), "utf8");
  for (const token of ["document.", "window.", "location.", "navigator."]) {
    if (text.includes(token)) fail(`Pure module ${path} references ${token}`);
  }
}

// Bilingual pages: pinned metadata, FAQs, control inventory, links.
const pages = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "麻將台數計算機｜Gloss Tools",
    h1: "麻將台數計算機",
    description:
      "依台灣十六張麻將一般家庭場慣例，勾選胡牌的牌型與情境，自動處理門清自摸合併與不重複計台，算出總台數與自摸、放槍的每人付款金額。",
    faq: "門清自摸為什麼是 3 台，不是 2 台？",
    langLink: "./en/index.html",
    homeLink: "../../",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Mahjong Score Calculator | Gloss Tools",
    h1: "Mahjong Score Calculator",
    description:
      "Score a Taiwan 16-tile mahjong winning hand from a fixed family-game tai table, with combined and non-stacking rules applied, and get the per-player payout for self-draw and discard wins.",
    faq: "Why is a concealed self-draw 3 tai, not 2?",
    langLink: "../index.html",
    homeLink: "../../en/",
  },
];
const controlIds = [
  "score-form",
  "win-self-draw",
  "win-discard",
  "winner-dealer",
  "discarder-dealer",
  "dealer-streak",
  "honor-flowers",
  "off-flowers",
  "kong-count",
  "base",
  "per-tai",
  "cap",
  "status",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "results",
  "download-btn",
  ...core.SELECTABLE_CODES.map((code) => `sel-${code}`),
  ...core.OVERRIDABLE_CODES.map((code) => `ovr-${code}`),
];
for (const page of pages) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang mismatch`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: title mismatch`);
  if (!html.includes(`<h1>${page.h1}</h1>`)) fail(`${page.path}: h1 mismatch`);
  if (!html.includes(`<meta name="description" content="${page.description}">`)) {
    fail(`${page.path}: description mismatch`);
  }
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) fail(`${page.path}: robots meta missing`);
  if (html.includes("canonical")) fail(`${page.path}: candidate must not carry a canonical link`);
  if (html.includes("hreflang")) fail(`${page.path}: candidate must not carry hreflang`);
  if (!html.includes(`href="${page.langLink}"`)) fail(`${page.path}: language link mismatch`);
  if (!html.includes(`href="${page.homeLink}"`)) fail(`${page.path}: home link mismatch`);
  if (!html.includes(page.faq)) fail(`${page.path}: pinned FAQ missing`);
  for (const id of controlIds) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing control id ${id}`);
  }
}

if (failures.length > 0) {
  console.error(`check: ${failures.length} failure(s)`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("check: all static checks passed");
