// Static project checks for the Red Envelope Guide: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limit, defaults, example equals fixtures.json case 1,
// the applicability matrix, the pinned bilingual strings in the app and
// pages, bilingual metadata and the candidate noindex/no-canonical rules),
// core purity (no DOM/network/storage), syntax of every shipped script,
// the fixed worker-source concatenation, and a forbidden-capability scan.
// Exits non-zero on the first failure list.

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
  "public/js/core/red-envelope.mjs",
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

// Core contract: field order, raw limit, defaults, report constants, the
// tier increments, and the example must match the SPEC and fixtures.json
// case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/red-envelope.mjs")).href);
const expectedFields = ["occasion", "relationship", "tier", "giverStage", "ageBand", "attending", "attendeeCount"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
if (core.RAW_LIMIT !== 32) fail("core: RAW_LIMIT must be 32");
const expectedDefaults = {
  occasion: "wedding",
  relationship: "colleague",
  tier: "restaurant",
  giverStage: null,
  ageBand: null,
  attending: true,
  attendeeCount: "1",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.TIER_INCREMENT) !== canonical({ restaurant: 1000, hotel: 1200, "five-star": 1600 })) {
  fail("core: TIER_INCREMENT mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "red-envelope-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "red-envelope-guide" || fixtures.specId !== "spec-red-envelope-guide-20261109") {
  fail("test/fixtures.json: not the red-envelope-guide spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 13) {
  fail("test/fixtures.json: expected 13 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the SPEC-pinned error messages and note texts
// verbatim, both languages, plus the pinned flow-state strings.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "欄位型別不正確",
  "輸入過長",
  "含有無效字元",
  "請選擇清單中的項目",
  "請輸入整數",
  "超出允許範圍",
  "此場合需要這個欄位",
  "此場合不適用此欄位",
  "發生未預期錯誤",
  "The input is malformed.",
  "Wrong field type.",
  "Input is too long.",
  "Contains invalid characters.",
  "Choose one of the listed options.",
  "Enter a whole number.",
  "Outside the allowed range.",
  "This field is required for the chosen occasion.",
  "This field does not apply to the chosen occasion.",
  "Something unexpected happened.",
  "各地與各家習俗不同，金額僅供參考，請以自身經濟狀況與雙方交情為準。",
  "未出席以行情約六成計算。",
  "紅包以每份（出席單位）計，多人同行已加計每人份。",
  "喬遷也可改送等值禮品。",
  "Customs vary by family and region; amounts are references only — adjust to your means and your relationship.",
  "Not attending: about 60% of the usual range.",
  "Amounts are per envelope (attending unit); extra attendees are already added.",
  "For a housewarming, a gift of equivalent value is also appropriate.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the pinned
// FAQ answers, the primary action label, and the draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "紅包金額指南｜Gloss Tools",
    description: "依場合、關係與婚禮場地等級，查台灣紅包行情並自動避開 4 與不合規百位，給出可直接照包的建議金額區間與推薦金額。",
    h1: "紅包金額指南",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    runLabel: "查詢建議金額",
    faq: [
      "為什麼金額避開 4？",
      "4 諧音不吉利，台灣紅包習俗上避開；百位也偏好雙數與 2、6、8。",
      "未出席為什麼打六折？",
      "未出席不佔席位與餐費，行情約為出席的六成，本工具以六成計算後再對齊有效金額。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Red Envelope Guide | Gloss Tools",
    description:
      "Look up Taiwan red-envelope amount ranges by occasion, relationship and wedding venue tier, with etiquette-valid amounts that avoid the digit 4.",
    h1: "Red Envelope Guide",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    runLabel: "Look up suggested amount",
    faq: [
      "Why avoid the digit 4?",
      "The digit 4 is considered unlucky, and even hundreds — especially 2, 6 and 8 — are preferred.",
      "Why 60% when not attending?",
      "A guest who does not attend takes no seat or meal, so the customary amount is about 60%, then snapped to a valid amount.",
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
  if (!html.includes(page.runLabel)) fail(`${page.path}: missing pinned primary action label`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/red-envelope.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "red-envelope-guide-worker-"));
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

// Core purity: no DOM access in the pure modules or the controller.
for (const purePath of [
  "public/js/core/red-envelope.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
