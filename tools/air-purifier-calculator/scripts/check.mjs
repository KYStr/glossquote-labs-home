// Static project checks for the Air Purifier Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (field order, defaults, ranges, decimal-place limits,
// pinned constants, report filename and limit, example equals the
// vendored fixtures.json case 1, the vendored fixtures hash,
// bilingual metadata, the pinned FAQ answers, and the candidate
// noindex / no-canonical rules), core purity (no DOM/network/
// storage/clock), syntax of every shipped script, the fixed
// worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list. The vendored
// test/fixtures.json is a byte-identical copy of the fixed spec's
// fixtures (spec-air-purifier-calculator-20261121, spec candidate
// commit 4e73cb25b91e9f016310f1898de4b610c2c60ff7, draft spec PR
// #383); the spec PR is not merged into this branch's base, so the
// check reads the vendored copy rather than a repo-level docs path.

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
  "public/js/core/air-purifier.mjs",
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
const FIXTURES_SHA256 = "fa705954fe1c368073402a6e1904f57b4e0dabf134698b5268ef124f83476fd1";
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec fixtures");
}

// Core contract: field order, defaults, raw capacity, decimal-place
// limits, pinned constants, ranges, report filename/limit, and the
// example must match the SPEC and the vendored fixtures.json case 1
// exactly.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/air-purifier.mjs")).href
);
if (
  !deepEqual(core.FIELDS, [
    "areaValue",
    "areaUnit",
    "ceilingHeightM",
    "targetAch",
    "purifierCadrCfm",
  ])
) {
  fail("core: FIELDS order mismatch");
}
if (
  !deepEqual(core.DEFAULTS, {
    areaValue: "",
    areaUnit: "m2",
    ceilingHeightM: "2.8",
    targetAch: "5.0",
    purifierCadrCfm: "",
  })
) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 12) fail("core: MAX_RAW_UNITS must be 12");
if (core.AREA_DECIMAL_MAX_PLACES !== 4) fail("core: AREA_DECIMAL_MAX_PLACES must be 4");
if (core.ACH_DECIMAL_MAX_PLACES !== 1) fail("core: ACH_DECIMAL_MAX_PLACES must be 1");
if (core.SQFT_PER_M2 !== "10.7639") fail("core: SQFT_PER_M2 mismatch");
if (core.M2_PER_PING !== "3.3058") fail("core: M2_PER_PING mismatch");
if (core.FT_PER_M !== "3.2808") fail("core: FT_PER_M mismatch");
if (core.M3H_PER_CFM !== "1.6990") fail("core: M3H_PER_CFM mismatch");
if (core.SQFT_PER_CFM !== "1.55") fail("core: SQFT_PER_CFM mismatch");
if (core.DEFAULT_CEILING_M !== "2.8") fail("core: DEFAULT_CEILING_M mismatch");
if (core.DEFAULT_ACH !== "5.0") fail("core: DEFAULT_ACH mismatch");
if (core.AREA_M2_MIN !== 1) fail("core: AREA_M2_MIN mismatch");
if (core.AREA_M2_MAX !== 200) fail("core: AREA_M2_MAX mismatch");
if (core.CEILING_M_MIN !== 2.0) fail("core: CEILING_M_MIN mismatch");
if (core.CEILING_M_MAX !== 4.0) fail("core: CEILING_M_MAX mismatch");
if (core.ACH_MIN !== 1.0) fail("core: ACH_MIN mismatch");
if (core.ACH_MAX !== 10.0) fail("core: ACH_MAX mismatch");
if (core.CADR_CFM_MIN !== 10) fail("core: CADR_CFM_MIN mismatch");
if (core.CADR_CFM_MAX !== 2000) fail("core: CADR_CFM_MAX mismatch");
if (core.REPORT_FILENAME !== "air-purifier-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.REPORT_LIMIT_BYTES !== 2097152) fail("core: REPORT_LIMIT_BYTES mismatch");
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
if (fixtures.specId !== "spec-air-purifier-calculator-20261121") {
  fail("test/fixtures.json: specId mismatch (vendored copy is not the fixed spec fixtures)");
}
if (!deepEqual(core.EXAMPLE, fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 15) {
  fail("test/fixtures.json: expected 15 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 2) {
  fail("test/fixtures.json: expected 2 controller cases");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, the bilingual
// sizing-only disclaimer, the pinned FAQ answers, the draft-loss
// note, and the form control ids.
const DISCLAIMER_ZH =
  "本工具只做選型試算，不量測空氣品質、不提供醫療建議。全部計算都在這個頁面本機進行，不上傳、不儲存、不記錄你的輸入。";
const DISCLAIMER_EN =
  "This tool only estimates purifier sizing. It does not measure air quality and gives no medical advice. All calculation happens locally on this page; nothing is uploaded, stored, or logged.";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "空氣清淨機選型試算｜Gloss Tools",
    description:
      "填房間面積與天花板高度，依 AHAM 規則算出需要的煙霧 CADR 與建議適用面積，確認手邊那台清淨機夠不夠用。",
    h1: "空氣清淨機選型試算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "為什麼用煙霧 CADR 而不是粉塵或花粉 CADR？",
      "煙霧是三種粒徑中最小的、最嚴格的；AHAM 的適用面積規則就是以煙霧 CADR 寫的。",
      "1.55 和 2/3 是同一條規則嗎？",
      "是同一條關係的兩個方向：所需 CADR = 面積 × 2/3，建議面積 = CADR × 1.55；前者是 5.0 ACH，後者是 4.8 ACH，相差約 3%，本工具以較嚴格的 5.0 為預設。",
      "盒子上寫的適用坪數比 AHAM 建議的大，可以信嗎？",
      "廠商標示的適用面積常以每小時換氣 1–2 次計，AHAM 以 4.8–5.0 次計；比煙霧 CADR，不要只比適用坪數。",
      "天花板比 8 呎高怎麼辦？",
      "所需 CADR 按天花板高度等比提高（天花板呎數 ÷ 8）；挑高房間要買更大台。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Air Purifier Calculator | Gloss Tools",
    description:
      "Enter room area and ceiling height to find the smoke CADR your room needs under the AHAM rule, with the suggested room size, and check whether your purifier is big enough.",
    h1: "Air Purifier Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Why smoke CADR, not dust or pollen CADR?",
      "Smoke is the smallest of the three particle sizes and the strictest; the AHAM room-size rule is written against smoke CADR.",
      "Are 1.55 and 2/3 the same rule?",
      "They are two directions of one relationship: required CADR = area × 2/3, suggested room = CADR × 1.55; the first is 5.0 ACH, the second 4.8 ACH, about 3% apart, and this tool defaults to the stricter 5.0.",
      "The box claims a bigger coverage than AHAM suggests — can I trust it?",
      "Marketing coverage is often quoted at 1–2 air changes per hour, while AHAM uses 4.8–5.0; compare smoke CADR, not coverage claims.",
      "What if my ceiling is higher than 8 ft?",
      "Required CADR scales with ceiling height (ceiling feet ÷ 8); a taller room needs a bigger purifier.",
    ],
    draftNote: "Switching language or leaving this page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
const FIELD_IDS = [
  "field-areaValue",
  "field-areaUnit",
  "field-ceilingHeightM",
  "field-targetAch",
  "field-purifierCadrCfm",
];
const ERROR_IDS = [
  "error-areaValue",
  "error-areaUnit",
  "error-ceilingHeightM",
  "error-targetAch",
  "error-purifierCadrCfm",
];
const REGION_IDS = ["summary-rows", "owned-rows", "owned-heading"];
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
    resolve(PROJECT_ROOT, "public/js/core/air-purifier.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "air-purifier-calculator-worker-"));
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
// controller. The core must be purely a function of its five input
// strings, so a bare clock-API reference in the core is a defect.
for (const purePath of [
  "public/js/core/air-purifier.mjs",
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
  const coreText = await readFile(resolve(PROJECT_ROOT, "public/js/core/air-purifier.mjs"), "utf8");
  if (/\bDate\b/.test(coreText)) {
    fail("public/js/core/air-purifier.mjs: core must not reference the clock constructor (no clock participation)");
  }
  if (/\bIntl\b/.test(coreText)) {
    fail("public/js/core/air-purifier.mjs: core must not reference Intl");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, fixtures hash, core fields/defaults/ranges/constants/example, pages, syntax, worker concatenation, capability scan, core purity",
);
