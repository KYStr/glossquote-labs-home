// Static project checks for the Caffeine Half-Life Calculator: required
// files, package contract, the SPEC-pinned preset table and bilingual
// messages, the vendored fixtures identity (spec id, case counts, and
// the first core case reproduced exactly), bilingual page metadata and
// the candidate noindex/no-canonical rules, the pinned CSP in the
// preview server, syntax of every shipped script, a
// forbidden-capability scan, and core/controller purity. Exits
// non-zero on the first failure list.

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
  "public/js/core/caffeine.mjs",
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

// Core contract: pinned preset table, limits, error/status messages and
// the SPEC default draft from the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/caffeine.mjs")).href);
if (core.MAX_ENTRIES !== 8) fail("core: MAX_ENTRIES must be 8");
if (core.MAX_STRING_UNITS !== 8) fail("core: MAX_STRING_UNITS must be 8");
if (core.MAX_MG !== 1000) fail("core: MAX_MG must be 1000");
const expectedPresets = [
  ["espresso", 63],
  ["brewed-coffee", 95],
  ["black-tea", 47],
  ["green-tea", 28],
  ["cola", 34],
  ["energy-drink", 80],
];
if (core.PRESETS.length !== expectedPresets.length) fail("core: PRESETS length mismatch");
for (const [index, [id, mg]] of expectedPresets.entries()) {
  const preset = core.PRESETS[index];
  if (!preset || preset.id !== id || preset.mg !== mg) {
    fail(`core: PRESETS[${index}] must be ${id}/${mg}`);
  }
}
const expectedErrorCodes = [
  "SCHEMA",
  "INPUT_LIMIT",
  "UNICODE",
  "EMPTY",
  "ROW_LIMIT",
  "TIME_FORMAT",
  "PRESET_UNKNOWN",
  "CONFLICT",
  "INTEGER_FORMAT",
  "DECIMAL_FORMAT",
  "RANGE",
  "INTERNAL",
];
for (const code of expectedErrorCodes) {
  const entry = core.ERROR_MESSAGES[code];
  if (!entry || typeof entry["zh-Hant"] !== "string" || typeof entry.en !== "string") {
    fail(`core: ERROR_MESSAGES.${code} missing or incomplete`);
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
if (
  JSON.stringify(core.DEFAULT_DRAFT) !==
  JSON.stringify({ entries: [{ time: "", preset: null, mg: "" }], halfLifeHours: "5", queryTime: "", bedtime: "" })
) {
  fail("core: DEFAULT_DRAFT differs from the SPEC reset value");
}

// Vendored fixtures identity: the fixed spec candidate's literal cases.
// The core must reproduce the first core case exactly, and the fixture
// set must hold 9 core and 3 controller cases.
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-caffeine-half-life-20261109") fail("fixtures: specId mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 9) fail(`fixtures: expected 9 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 3) {
  fail(`fixtures: expected 3 controller cases, got ${controllerCases.length}`);
}
// The fixture file serializes keys in sorted order, so compare with a
// canonical (recursively key-sorted) stringify rather than raw order.
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
if (canonical(core.run(coreCases[0].input)) !== canonical(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case exact-half-life exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned FAQ answers, the pinned result disclaimer, and the draft-loss
// note.
const PAGE_IDS = [
  "calc-form",
  "entry-rows",
  "add-entry-btn",
  "half-life",
  "query-time",
  "bedtime",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "example-note",
  "status",
  "results",
  "result-query-time",
  "result-total",
  "result-notyet-all",
  "result-entries",
  "result-series",
  "result-bedtime-block",
  "result-bedtime",
  "error-entries",
  "error-halfLifeHours",
  "error-queryTime",
  "error-bedtime",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "咖啡因代謝計算機｜Gloss Tools",
    description:
      "輸入今天喝下的咖啡、茶或能量飲料的時間與咖啡因量，用你設定的半衰期估算查詢時間與就寢時體內還剩多少咖啡因。",
    h1: "咖啡因代謝計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "查詢時間比某杯的時間早，怎麼算？",
      "在那杯之前它不計入；之後的小時數列會在它的時間過後開始計入。",
      "這能告訴我今晚睡得好不好嗎？",
      "不能。這只是用單一半衰期做的衰減估算，個人代謝差異很大。",
    ],
    disclaimer: "半衰期因人而異（約 3–8 小時），本工具以你設定的半衰期估算，數值僅供參考，不是醫療建議。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: PAGE_IDS,
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Caffeine Half-Life Calculator | Gloss Tools",
    description:
      "Enter when you had each coffee, tea or energy drink and estimate how much caffeine remains at a query time and at bedtime, using a half-life you choose.",
    h1: "Caffeine Half-Life Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "What if the query time is earlier than a drink?",
      "It contributes nothing before its intake time; the hourly series starts counting it once its time passes.",
      "Can this predict my sleep?",
      "No. It is a decay estimate with a single half-life; individual metabolism varies widely.",
    ],
    disclaimer:
      "Half-life varies by person (roughly 3–8 hours). This tool estimates with the half-life you set; values are for reference only and are not medical advice.",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing result disclaimer`);
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

// The SPEC pins no download or export for this tool: the app must not
// grow a serializer or report module.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
for (const token of ["createElement(\"a\")", "createObjectURL", "download"]) {
  if (appSource.includes(token)) fail(`app.js: unexpected download capability: ${token}`);
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
for (const purePath of ["public/js/core/caffeine.mjs", "public/js/controller.mjs"]) {
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
  "Check passed: files, package contract, preset table/messages, fixtures identity, pages, CSP, syntax, capability scan, core purity",
);
