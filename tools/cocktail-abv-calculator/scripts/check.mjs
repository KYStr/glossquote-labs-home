// Static project checks for the Cocktail ABV Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (row limits, defaults, ranges, report filename and
// limit, density and standard-drink constants, example equals the
// vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, the bilingual
// disclaimer, guidance and contraction lines, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/
// storage/clock), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list. The vendored
// test/fixtures.json is a verbatim copy of the fixed spec's fixtures
// (spec-cocktail-abv-calculator-20261121, draft spec PR #386); the
// spec PR is not merged into this branch's base, so the check reads
// the vendored copy rather than a repo-level docs path.

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
  "public/js/core/cocktail-abv.mjs",
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
const FIXTURES_SHA256 = "8d12f9c130377314ec3153f42f35da30d8b0c4a402f4386246d1219adb1fe0b8";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: row limits, defaults, raw capacity, name capacity,
// ranges, density, report filename/limit, the pinned fixed texts,
// and the example must match the SPEC and the vendored fixtures.json
// case 1 exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/cocktail-abv.mjs")).href
);
if (core.MIN_ROWS !== 2) fail("core: MIN_ROWS must be 2");
if (core.MAX_ROWS !== 6) fail("core: MAX_ROWS must be 6");
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.NAME_MAX_SCALARS !== 40) fail("core: NAME_MAX_SCALARS must be 40");
if (core.VOLUME_MIN_TENTHS !== 1) fail("core: VOLUME_MIN_TENTHS must be 1 (0.1 ml)");
if (core.VOLUME_MAX_TENTHS !== 20000) fail("core: VOLUME_MAX_TENTHS must be 20000 (2000.0 ml)");
if (core.ABV_MIN_TENTHS !== 0) fail("core: ABV_MIN_TENTHS must be 0");
if (core.ABV_MAX_TENTHS !== 1000) fail("core: ABV_MAX_TENTHS must be 1000 (100%)");
if (core.DENSITY_NUM !== 789n) fail("core: DENSITY_NUM must be 789n (0.789 g/ml)");
if (core.DENSITY_DEN !== 1000n) fail("core: DENSITY_DEN must be 1000n");
if (core.STANDARD_DRINK_GRAMS !== 10) fail("core: STANDARD_DRINK_GRAMS must be 10");
if (core.REPORT_FILENAME !== "cocktail-abv-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
if (
  !deepEqual(core.DEFAULTS, {
    ingredients: [
      { volumeMl: "45", abvPct: "40" },
      { volumeMl: "30", abvPct: "0" },
    ],
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (
  core.GUIDANCE_ZH !==
  "衛福部建議：男性每日不超過 2 單位、女性不超過 1 單位（1 單位＝10 g 純酒精）；不喝最健康。"
) {
  fail("core: GUIDANCE_ZH mismatch");
}
if (
  core.GUIDANCE_EN !==
  "MOHW guidance: no more than 2 units per day for men and 1 for women (1 unit = 10 g pure alcohol); not drinking is healthiest."
) {
  fail("core: GUIDANCE_EN mismatch");
}
if (core.CONTRACTION_ZH !== "體積以加法合計，未扣除混合體積收縮。") {
  fail("core: CONTRACTION_ZH mismatch");
}
if (
  core.CONTRACTION_EN !==
  "Volumes are summed additively; mixing contraction is not deducted."
) {
  fail("core: CONTRACTION_EN mismatch");
}
if (
  core.DISCLAIMER_ZH !==
  "本結果為估算值，僅供參考，不構成醫療或法律建議；不估算血液酒精濃度。"
) {
  fail("core: DISCLAIMER_ZH mismatch");
}
if (
  core.DISCLAIMER_EN !==
  "This result is an estimate for reference only and is not medical or legal advice; it does not estimate blood alcohol concentration."
) {
  fail("core: DISCLAIMER_EN mismatch");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-cocktail-abv-calculator-20261121") {
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
// the bilingual disclaimer, guidance and contraction lines in both
// languages on both pages, the pinned FAQ answers, the draft-loss
// note, and the form control ids.
const DISCLAIMER_ZH =
  "本結果為估算值，僅供參考，不構成醫療或法律建議；不估算血液酒精濃度。";
const DISCLAIMER_EN =
  "This result is an estimate for reference only and is not medical or legal advice; it does not estimate blood alcohol concentration.";
const GUIDANCE_ZH =
  "衛福部建議：男性每日不超過 2 單位、女性不超過 1 單位（1 單位＝10 g 純酒精）；不喝最健康。";
const GUIDANCE_EN =
  "MOHW guidance: no more than 2 units per day for men and 1 for women (1 unit = 10 g pure alcohol); not drinking is healthiest.";
const CONTRACTION_ZH = "體積以加法合計，未扣除混合體積收縮。";
const CONTRACTION_EN =
  "Volumes are summed additively; mixing contraction is not deducted.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "調酒酒精度｜Gloss Tools",
    description:
      "把配方裡 2–6 種材料的體積與酒精度加總，知道這一杯有多烈、相當於幾標準杯。",
    h1: "調酒酒精度",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "總酒精度怎麼算？",
      "各材料純酒精體積加總除以總體積。",
      "標準杯是多少？",
      "台灣 1 標準杯＝10 g 純酒精。",
      "會估算血液酒精濃度嗎？",
      "不會，本工具只算調酒本身的酒精度。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Cocktail ABV Calculator | Gloss Tools",
    description:
      "Add up 2–6 ingredients by volume and ABV to see how strong a mixed drink is and how many standard drinks it holds.",
    h1: "Cocktail ABV Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How is total ABV calculated?",
      "Total pure-alcohol volume divided by total volume.",
      "What is one standard drink?",
      "In Taiwan, one standard drink is 10 g of pure alcohol.",
      "Does it estimate blood alcohol concentration?",
      "No. It only calculates the mixed drink's own ABV.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const PAGE_IDS = [
  "entry-form",
  "ingredient-rows",
  "status",
  "example-note",
  "summary-rows",
  "detail-rows",
  "run-btn",
  "example-btn",
  "add-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
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
  if (!html.includes(GUIDANCE_ZH)) fail(`${page.path}: missing guidance (zh)`);
  if (!html.includes(GUIDANCE_EN)) fail(`${page.path}: missing guidance (en)`);
  if (!html.includes(CONTRACTION_ZH)) fail(`${page.path}: missing contraction note (zh)`);
  if (!html.includes(CONTRACTION_EN)) fail(`${page.path}: missing contraction note (en)`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of PAGE_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element ${id}`);
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
    resolve(PROJECT_ROOT, "public/js/core/cocktail-abv.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "cocktail-abv-calculator-worker-"));
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
// controller. The core must be purely a function of its input, so a
// bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/cocktail-abv.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/cocktail-abv.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/cocktail-abv.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/cocktail-abv.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core limits/defaults/ranges/example, pages, syntax, worker concatenation, capability scan, core purity",
);
