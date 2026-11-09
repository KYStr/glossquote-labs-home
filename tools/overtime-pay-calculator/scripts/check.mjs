// Static project checks for the Overtime Pay Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (monthly and daily field names, kinds, row limit, defaults, example equals the vendored
// fixtures.json case 1, report constants), bilingual metadata and the
// candidate noindex/no-canonical rules, the SPEC-pinned FAQ answers and
// disclaimer, core purity (no DOM/network/storage), syntax of every
// shipped script, the fixed worker-source concatenation, and a
// forbidden-capability scan. Exits non-zero on the first failure list.

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
  "public/js/core/overtime.mjs",
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

// Core contract: field order, row limit, kinds, defaults, and report
// constants must match the SPEC; the example must equal fixtures.json
// case 1 (the vendored copy in test/).
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/overtime.mjs")).href);
const expectedFields = ["monthlySalary", "month", "entries"];
assertContract(core.FIELDS, expectedFields, "FIELDS");
assertContract(core.ENTRY_FIELDS, ["date", "kind", "hours"], "ENTRY_FIELDS");
assertContract(core.KINDS, ["weekday", "restDay", "holiday"], "KINDS");
assertContract(core.DEFAULTS, {
  monthlySalary: "",
  month: "",
  entries: [{ date: "", kind: "weekday", hours: "0" }],
}, "DEFAULTS");
if (core.MAX_ENTRIES !== 31) fail("core: MAX_ENTRIES must be 31");

function assertContract(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail("core: " + label + " mismatch");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "overtime-pay-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.specId !== "spec-overtime-pay-calculator-20261109-r3") {
  fail("test/fixtures.json: specId mismatch (vendored copy drifted?)");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases[0].id !== "weekday-basic") fail("test/fixtures.json: case 1 must be weekday-basic");

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the pinned
// FAQ answers, the fixed disclaimer, the draft-loss note, field/error
// slots, and the results heading.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "加班費計算機｜Gloss Tools",
    description: "按日輸入平日延時、休息日與未調移國定假日工時，依台灣月薪制每日級距試算整月加班費。",
    h1: "加班費計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "休息日出勤 1 小時算幾小時？",
      "自民國 107 年 3 月 1 日起已刪除擬制工時，休息日工資與工時都依實際出勤時數計算。",
      "平日每小時工資額怎麼算？",
      "此試算以每日正常工時 8 小時、月薪對應 240 小時為基礎，將月薪除以 240。",
      "國定假日出勤未滿 8 小時怎麼算？",
      "符合條件的未調移國定假日，每個出勤日都另加一日工資，即使當天出勤未滿 8 小時。",
    ],
    disclaimer: "試算結果僅供參考，實際金額以勞雇約定及主管機關認定為準。",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    resultsHeading: "加班費明細",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Overtime Pay Calculator | Gloss Tools",
    description:
      "Enter daily weekday overtime, rest-day or eligible holiday hours to estimate a month of Taiwan overtime pay using daily rate bands.",
    h1: "Overtime Pay Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How are rest-day hours counted?",
      "Since 1 March 2018 the deemed-hours rule was abolished; rest-day pay and hours use actual hours worked.",
      "How is the hourly rate derived?",
      "This estimate divides monthly salary by 240, using an 8-hour normal workday.",
      "What if holiday work is under 8 hours?",
      "Each eligible unshifted national holiday worked earns one extra day's wage, even when you work fewer than 8 hours that day.",
    ],
    disclaimer:
      "This estimate is for reference only; actual pay follows the employment agreement and the competent authority's determination.",
    draftNote: "Switching language or leaving the page discards the current draft.",
    resultsHeading: "Overtime pay breakdown",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing fixed disclaimer`);
  if (!html.includes(page.resultsHeading)) fail(`${page.path}: missing results heading`);
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const marker of ['id="daily-entries"', 'id="error-entries"', 'id="entry-template"', 'id="add-entry"', "data-entry-row", "data-remove-entry"]) {
    if (!html.includes(marker)) fail(page.path + ": missing daily editor marker " + marker);
  }
  for (const field of core.ENTRY_FIELDS) {
    if (!html.includes('data-entry-field="' + field + '"')) fail(page.path + ": missing daily field " + field);
  }
  if (!/<input id="field-month"[^>]+type="text"/.test(html) ||
      !/<input data-entry-field="date"[^>]+type="text"/.test(html)) {
    fail(page.path + ": month and dates must use text input");
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const field of ["monthlySalary", "month"]) {
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/overtime.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "overtime-pay-calculator-worker-"));
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
  "public/js/core/overtime.mjs",
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
  "Check passed: files, package contract, monthly/daily schema and example, pages, syntax, worker concatenation, capability scan, core purity",
);
