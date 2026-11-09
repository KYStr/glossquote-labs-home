// Static project checks for the TV Viewing Distance Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (fields, ranges, multipliers, defaults, example equals
// fixtures.json case 1, the vendored fixtures' SHA-256 against the fixed
// spec candidate, bilingual metadata and the candidate
// noindex/no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source concatenation,
// and a forbidden-capability scan. Exits non-zero on the first failure
// list.

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

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
  "public/js/core/tv.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
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

// SHA-256 of the fixtures in the fixed spec candidate
// 1b6147ac5d8652fe43f46614a54dfdb810b4faa8 (spec PR #155); the vendored
// copy at test/fixtures.json must stay byte-identical to it.
const FIXTURES_SHA256 = "cf0270353735878c659c6f1e34fb4145f2fee9d884c06a2fbf71b0d1187792e8";

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

// Core contract: field order, ranges, multipliers, resolutions,
// defaults, and the example must match the SPEC and fixtures.json
// case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/tv.mjs")).href);
const expectedFields = ["diagonalIn", "roomDistanceCm", "resolution"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRanges = { diagonalIn: [10, 120], roomDistanceCm: [30, 1500] };
if (JSON.stringify(core.RANGES) !== JSON.stringify(expectedRanges)) {
  fail("core: RANGES mismatch");
}
const expectedMultipliers = {
  FHD: { minimum: 12, idealLow: 15, idealHigh: 20, maximum: 25 },
  UHD4K: { minimum: 10, idealLow: 15, idealHigh: 20, maximum: 25 },
};
if (JSON.stringify(core.MULTIPLIERS_TENTHS) !== JSON.stringify(expectedMultipliers)) {
  fail("core: MULTIPLIERS_TENTHS mismatch");
}
if (JSON.stringify(core.RESOLUTIONS) !== JSON.stringify(["FHD", "UHD4K"])) {
  fail("core: RESOLUTIONS mismatch");
}
const expectedDefaults = { diagonalIn: "55", roomDistanceCm: "", resolution: "FHD" };
if (JSON.stringify(core.DEFAULTS) !== JSON.stringify(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_RAW_UNITS !== 8) fail("core: MAX_RAW_UNITS must be 8");
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "tv-viewing-distance-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
const fixturesBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
if (createHash("sha256").update(fixturesBytes).digest("hex") !== FIXTURES_SHA256) {
  fail("test/fixtures.json: bytes differ from the fixed spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesBytes.toString("utf8"));
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.specId !== "spec-tv-viewing-distance-20261109") {
  fail("test/fixtures.json: specId mismatch");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// two pinned FAQ answers, the draft-loss note, the quick-pick sizes, and
// the field/error slots.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "電視尺寸與觀賞距離｜Gloss Tools",
    description:
      "輸入電視對角線吋數，依 THX／SMPTE 經驗法則算出 16:9 螢幕寬高與最近、理想、最遠觀賞距離；也能反過來用沙發距離推回建議的電視尺寸。",
    h1: "電視尺寸與觀賞距離",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "這四個距離是精確的視角換算嗎？",
      "不是。它們是以 THX 約 36–40° 與 SMPTE 約 30° 視角建議為依據的固定經驗倍率（最近 1.2、理想 1.5–2.0、最遠 2.5，皆乘對角線），方便選購時快速對照。",
      "4K 為什麼可以坐得比較近？",
      "解析度較高時，同距離下較不容易看到像素，所以本工具把 4K 的最近距離倍率定為 1.0；理想與最遠距離不因解析度改變。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "TV Viewing Distance Calculator | Gloss Tools",
    description:
      "Enter a TV diagonal to get the 16:9 screen width and height plus minimum, ideal and maximum viewing distances from THX and SMPTE rules of thumb — or work backwards from your sofa distance to a size range.",
    h1: "TV Viewing Distance Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "Are these distances exact viewing-angle conversions?",
      "No. They are fixed rules of thumb based on THX (about 36–40°) and SMPTE (about 30°) viewing-angle guidance: minimum 1.2×, ideal 1.5–2.0× and maximum 2.5× the diagonal.",
      "Why can you sit closer with 4K?",
      "At a higher resolution pixels are harder to see at the same distance, so this tool sets the 4K minimum-distance multiplier to 1.0. The ideal and maximum distances do not change with resolution.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
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
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of expectedFields) {
    if (!html.includes(`id="error-${field}"`)) fail(`${page.path}: missing error slot error-${field}`);
  }
  for (const field of ["diagonalIn", "roomDistanceCm"]) {
    if (!html.includes(`id="field-${field}"`)) fail(`${page.path}: missing input field-${field}`);
  }
  for (const size of ["32", "43", "50", "55", "65", "75", "85", "98"]) {
    if (!html.includes(`data-quick-size="${size}"`)) {
      fail(`${page.path}: missing quick-pick size ${size}`);
    }
  }
  if (!html.includes('name="resolution"')) fail(`${page.path}: missing resolution radios`);
  if (!html.includes('value="UHD4K"')) fail(`${page.path}: missing UHD4K radio`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/tv.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "tv-viewing-distance-worker-"));
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

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/tv.mjs",
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

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/ranges/multipliers/defaults/example, fixtures hash, pages, syntax, worker concatenation, capability scan, core purity",
);
