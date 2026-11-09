// Static project checks for the Lottery Number Picker: required files,
// package contract, the SPEC-pinned game table, limits, bilingual
// messages and help texts, the vendored fixtures identity (spec id,
// case counts, and the first core case reproduced exactly), bilingual
// page metadata and the candidate noindex/no-canonical rules, the
// pinned CSP in the preview server, the SPEC-pinned download shape in
// the app (fixed name, no copy/download resurrection paths), syntax of
// every shipped script, a forbidden-capability scan, core/controller
// purity, and a guarantee that the core never seeds itself and never
// uses nondeterministic randomness. Exits non-zero on failures.

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
  "public/js/core/lottery.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/pages.test.mjs",
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

// Core contract: pinned game table, limits, default draft, example,
// honest note, help texts and bilingual error/status messages.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/lottery.mjs")).href);
if (core.UINT32_MAX !== 4294967295) fail("core: UINT32_MAX must be 4294967295");
if (core.SEED_MAX_UNITS !== 10) fail("core: SEED_MAX_UNITS must be 10");
if (core.SET_COUNT_MAX_UNITS !== 2) fail("core: SET_COUNT_MAX_UNITS must be 2");
if (core.EXCLUDE_MAX_UNITS !== 256) fail("core: EXCLUDE_MAX_UNITS must be 256");
if (core.MAX_SETS !== 10) fail("core: MAX_SETS must be 10");
const expectedGames = [
  ["lotto649", "大樂透", "Lotto 6/49", 49, 6, 0, 0],
  ["power638", "威力彩", "Super Lotto 638", 38, 6, 8, 1],
  ["daily539", "今彩539", "Daily Cash 539", 39, 5, 0, 0],
];
if (core.GAMES.length !== expectedGames.length) fail("core: GAMES length mismatch");
for (const [index, [id, zh, en, z1Max, z1Pick, z2Max, z2Pick]] of expectedGames.entries()) {
  const game = core.GAMES[index];
  if (
    !game ||
    game.id !== id ||
    game.name["zh-Hant"] !== zh ||
    game.name.en !== en ||
    game.zone1Max !== z1Max ||
    game.zone1Pick !== z1Pick ||
    game.zone2Max !== z2Max ||
    game.zone2Pick !== z2Pick
  ) {
    fail(`core: GAMES[${index}] must be ${id} ${z1Pick}/${z1Max} + ${z2Pick}/${z2Max}`);
  }
}
if (
  JSON.stringify(core.DEFAULT_DRAFT) !==
  JSON.stringify({ game: "lotto649", seed: "", setCount: "3", exclude: "" })
) {
  fail("core: DEFAULT_DRAFT differs from the SPEC reset value");
}
if (
  JSON.stringify(core.EXAMPLE_INPUT) !==
  JSON.stringify({ game: "lotto649", seed: "42", setCount: "3", exclude: "" })
) {
  fail("core: EXAMPLE_INPUT differs from fixture case lotto649-basic");
}
if (
  core.HONEST_NOTE["zh-Hant"] !==
    "每種號碼組合出現的機率完全相等；本工具不能預測開獎結果，任何號碼組合的中獎機率都相同。" ||
  core.HONEST_NOTE.en !==
    "Every combination is equally likely. This tool cannot predict draw results; no combination has a better chance of winning than any other."
) {
  fail("core: HONEST_NOTE differs from the SPEC text");
}
if (
  core.SEED_HELP["zh-Hant"] !== "留空時會自動產生一個種子並顯示出來，之後可用同一種子重現。" ||
  core.SEED_HELP.en !==
    "Leave blank to have a seed generated and shown; reuse it to reproduce the same numbers."
) {
  fail("core: SEED_HELP differs from the SPEC text");
}
if (
  core.EXCLUDE_HELP["zh-Hant"] !== "只套用到第一區；威力彩第二區不排除。" ||
  core.EXCLUDE_HELP.en !== "Applies to Zone 1 only; the Super Lotto Zone 2 is never excluded."
) {
  fail("core: EXCLUDE_HELP differs from the SPEC text");
}
for (const code of ["SCHEMA", "INPUT_LIMIT", "INTEGER_FORMAT", "ENUM", "DUPLICATE", "POOL_TOO_SMALL", "INTERNAL"]) {
  const entry = core.ERROR_MESSAGES[code];
  if (!entry || typeof entry["zh-Hant"] !== "string" || typeof entry.en !== "string") {
    fail(`core: ERROR_MESSAGES.${code} missing or incomplete`);
  }
}
for (const [code, fields] of [["EMPTY", ["seed", "setCount"]], ["RANGE", ["seed", "setCount", "exclude"]]]) {
  for (const field of fields) {
    const entry = core.ERROR_MESSAGES[code]?.[field];
    if (!entry || typeof entry["zh-Hant"] !== "string" || typeof entry.en !== "string") {
      fail(`core: ERROR_MESSAGES.${code}.${field} missing or incomplete`);
    }
  }
}
for (const [key, zh, en] of [
  ["dirty", "輸入已變更，請重新執行", "Input changed. Run again."],
  ["busy", "處理中", "Working"],
  ["cancelled", "已取消，可重新執行", "Cancelled. You can run again."],
]) {
  const entry = core.STATUS_MESSAGES[key];
  if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
    fail(`core: STATUS_MESSAGES.${key} mismatch`);
  }
}
// The core must be deterministic and never seed itself.
if (core.run(core.DEFAULT_DRAFT).error?.code !== "EMPTY") {
  fail("core: a blank seed must be an EMPTY error at core level");
}
const probe = { game: "power638", seed: "7", setCount: "2", exclude: "1,2" };
if (JSON.stringify(core.run(probe)) !== JSON.stringify(core.run(probe))) {
  fail("core: run must be deterministic for identical input");
}
if (core.formatPicksText(core.run(core.EXAMPLE_INPUT).result) !== "12 23 29 30 34 43\n14 16 25 31 43 44\n12 16 27 32 35 37") {
  fail("core: formatPicksText must reproduce the lotto649-basic copy text");
}

// Vendored fixtures identity: the fixed spec candidate's literal cases.
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-lottery-number-picker-20261109") fail("fixtures: specId mismatch");
if (fixtures.slug !== "lottery-number-picker") fail("fixtures: slug mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 12) fail(`fixtures: expected 12 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 3) {
  fail(`fixtures: expected 3 controller cases, got ${controllerCases.length}`);
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
if (canonical(core.run(coreCases[0].input)) !== canonical(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case lotto649-basic exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned help texts, FAQ answers, the honest note, and the draft-loss
// note.
const PAGE_IDS = [
  "picks-form",
  "game",
  "seed",
  "set-count",
  "exclude",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "example-note",
  "status",
  "results",
  "result-summary",
  "result-sets",
  "copy-btn",
  "download-btn",
  "copy-note",
  "error-game",
  "error-seed",
  "error-setCount",
  "error-exclude",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "樂透選號器｜Gloss Tools",
    description:
      "用固定種子重現的亂數，幫大樂透、威力彩、今彩539 產生選號；同一個種子永遠產生同一組號碼，每種組合出現的機會都相等。",
    h1: "樂透選號器",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "同一個種子為什麼每次號碼都一樣？",
      "產生器由種子完全決定，同種子必然同結果，方便重現與核對。",
      "產生的號碼比較容易中獎嗎？",
      "不會。每種組合機率完全相等，本工具不能預測開獎結果。",
      "排除號碼會改變其他號碼的中獎率嗎？",
      "不會，只是不讓被排除的號碼出現在結果中；其餘每種組合仍完全相等。",
    ],
    note: "每種號碼組合出現的機率完全相等；本工具不能預測開獎結果，任何號碼組合的中獎機率都相同。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: PAGE_IDS,
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Lottery Number Picker | Gloss Tools",
    description:
      "Generate picks for Taiwan's Lotto 6/49, Super Lotto 638 and Daily Cash 539 with a seeded, reproducible generator — the same seed always yields the same numbers, and every combination is equally likely.",
    h1: "Lottery Number Picker",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why does the same seed always give the same numbers?",
      "The generator is fully determined by the seed, so results are reproducible and can be checked again later.",
      "Are generated numbers more likely to win?",
      "No. Every combination is equally likely, and this tool cannot predict draw results.",
      "Does excluding numbers change the odds of the rest?",
      "No — excluded numbers simply never appear; every remaining combination stays equally likely.",
    ],
    note: "Every combination is equally likely. This tool cannot predict draw results; no combination has a better chance of winning than any other.",
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
    ids: PAGE_IDS,
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
  if (!html.includes(page.note)) fail(`${page.path}: missing honest note`);
  for (const faqText of page.faq) {
    if (!html.includes(faqText)) fail(`${page.path}: missing FAQ text: ${faqText}`);
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

// The download is SPEC-pinned: the fixed file name and Blob flow must
// be present in the app, and the core must not seed itself.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
if (!appSource.includes('"lottery-picks.txt"')) fail("app.js: missing fixed download name");
if (!appSource.includes("getRandomValues")) fail("app.js: missing SPEC blank-seed fill");
const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/lottery.mjs"), "utf8");
for (const token of ["Math.random", "getRandomValues", "globalThis.crypto"]) {
  if (coreSource.includes(token)) fail(`core: must not reference ${token}`);
}

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

// Core purity: no DOM access in the pure core or the controller.
for (const purePath of ["public/js/core/lottery.mjs", "public/js/controller.mjs"]) {
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
  "Check passed: files, package contract, game table/messages, fixtures identity, pages, CSP, download shape, syntax, capability scan, core purity",
);
