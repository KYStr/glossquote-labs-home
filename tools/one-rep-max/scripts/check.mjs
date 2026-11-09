// Static project checks for the One-Rep Max Calculator: required files,
// package contract, the SPEC-pinned core constants, percentage table and
// bilingual error messages, the vendored fixtures identity (spec id,
// case counts, and the first core case reproduced exactly), bilingual
// page metadata and the candidate noindex/no-canonical rules, the pinned
// CSP in the preview server, syntax of every shipped script, a
// forbidden-capability scan, and core/controller purity. Exits non-zero
// on the first failure list.

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
  "public/js/core/one-rep-max.mjs",
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

// Core contract: pinned constants, the percentage table, and the
// bilingual error messages from the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/one-rep-max.mjs")).href);
if (core.MAX_INPUT_UNITS !== 16) fail("core: MAX_INPUT_UNITS must be 16");
if (core.MAX_WEIGHT_HUNDREDTHS !== 150000n) fail("core: MAX_WEIGHT_HUNDREDTHS must be 150000n");
if (core.MIN_REPS !== 1) fail("core: MIN_REPS must be 1");
if (core.MAX_REPS !== 30) fail("core: MAX_REPS must be 30");
if (core.HIGH_REPS_THRESHOLD !== 10) fail("core: HIGH_REPS_THRESHOLD must be 10");
const expectedTable = [
  [95, 2], [90, 4], [85, 6], [80, 8], [75, 10],
  [70, 12], [65, 16], [60, 20], [55, 24], [50, 30],
];
if (
  JSON.stringify(core.PERCENT_TABLE.map((row) => [row.percent, row.typicalReps])) !==
  JSON.stringify(expectedTable)
) {
  fail("core: PERCENT_TABLE differs from the SPEC-pinned table");
}
const expectedMessages = {
  SCHEMA: ["輸入格式不正確", "The input is malformed."],
  INPUT_LIMIT: ["輸入太長", "Input is too long."],
  UNICODE: ["輸入含無效字元", "Input contains an invalid character."],
  DECIMAL_FORMAT: ["重量必須是數字，最多兩位小數", "Weight must be a number with at most two decimal places."],
  INTEGER_FORMAT: ["次數必須是整數", "Reps must be a whole number."],
  ENUM: ["單位只能是公斤或磅", "Unit must be kilograms or pounds."],
  INTERNAL: ["發生錯誤，請再試一次", "Something went wrong. Try again."],
};
for (const [code, [zh, en]] of Object.entries(expectedMessages)) {
  const entry = core.ERROR_MESSAGES[code];
  if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
    fail(`core: ERROR_MESSAGES.${code} mismatch`);
  }
}
const expectedFieldMessages = {
  EMPTY: {
    weight: ["請輸入重量", "Enter the weight."],
    reps: ["請輸入次數", "Enter the reps."],
  },
  RANGE: {
    weight: ["重量必須大於 0 且不超過 1500", "Weight must be greater than 0 and at most 1500."],
    reps: ["次數必須介於 1 到 30", "Reps must be between 1 and 30."],
  },
};
for (const [code, byField] of Object.entries(expectedFieldMessages)) {
  for (const [field, [zh, en]] of Object.entries(byField)) {
    const entry = core.ERROR_MESSAGES[code]?.[field];
    if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
      fail(`core: ERROR_MESSAGES.${code}.${field} mismatch`);
    }
    if (core.messageFor({ code, field, row: null }, "zh-Hant") !== zh) {
      fail(`core: messageFor ${code}/${field} zh mismatch`);
    }
    if (core.messageFor({ code, field, row: null }, "en") !== en) {
      fail(`core: messageFor ${code}/${field} en mismatch`);
    }
  }
}

// The SPEC forbids any download or export for this tool: no report
// serializer may exist in the core.
if ("serializeReport" in core || "REPORT_FILENAME" in core) {
  fail("core: this tool must not offer a report/download (SPEC: no export)");
}

// Vendored fixtures identity: the fixed spec candidate's literal cases.
// The core must reproduce the first core case exactly, and the fixture
// set must hold 11 core and 3 controller cases.
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-one-rep-max-20261109") fail("fixtures: specId mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 11) fail(`fixtures: expected 11 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 3) {
  fail(`fixtures: expected 3 controller cases, got ${controllerCases.length}`);
}
if (JSON.stringify(core.run(coreCases[0].input)) !== JSON.stringify(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case single-rep exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned disclaimer / high-reps note / FAQ answers, and the draft-loss
// note.
const PAGE_IDS = [
  "calc-form",
  "weight",
  "unit-group",
  "unit-kg",
  "unit-lb",
  "reps",
  "error-weight",
  "error-unit",
  "error-reps",
  "error-general",
  "calculate-btn",
  "cancel-btn",
  "example-btn",
  "reset-btn",
  "example-note",
  "status",
  "result-empty",
  "result",
  "result-1rm",
  "result-epley",
  "result-brzycki",
  "result-note",
  "pct-rows",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "最大肌力 1RM 計算機｜Gloss Tools",
    description:
      "輸入你能完成的重量與次數，用 Epley 與 Brzycki 兩個公式估算最大肌力（1RM），並列出各百分比對應的訓練重量。",
    h1: "最大肌力 1RM 計算機",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    texts: [
      "1RM 是以公式估算，不是實際測試結果；嘗試最大重量時請使用護槓並請人補手。",
      "注意：次數超過 10 次時，公式估算的誤差會明顯變大，這個結果僅供參考。",
      "兩個公式為什麼不同？",
      "兩者用不同的次數—重量關係模型，本工具兩個都列出，並以平均值作為主要結果。",
      "次數填越多越準嗎？",
      "不是。超過約 10 次後估算誤差明顯變大。",
      "為什麼重量以 0.5 公斤為單位？",
      "健身房槓片通常以 0.5 公斤為最小調整單位，結果直接對應可裝的重量。",
      "計算 1RM",
      "載入範例",
      "百分比對照表",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: PAGE_IDS,
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "One-Rep Max Calculator | Gloss Tools",
    description:
      "Estimate your one-rep max from a weight and rep count with the Epley and Brzycki formulas, and see training loads for each percentage of your 1RM.",
    h1: "One-Rep Max Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    texts: [
      "A 1RM here is a formula estimate, not a tested result; use safeties and a spotter for maximal attempts.",
      "Note: beyond 10 reps, formula estimates lose accuracy — treat this result as a rough guide only.",
      "Why do the two formulas differ?",
      "They model the reps-to-weight relationship differently; this tool shows both and uses their average as the headline result.",
      "Are more reps more accurate?",
      "No. Past about 10 reps the estimates lose accuracy noticeably.",
      "Why are loads in 0.5 kg steps?",
      "Gym plates adjust in 0.5 kg steps, so results match loads you can actually set.",
      "Calculate 1RM",
      "Load example",
      "Percentage table",
    ],
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
  for (const text of page.texts) {
    if (!html.includes(text)) fail(`${page.path}: missing pinned text: ${text}`);
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

// Core purity: no DOM access in the pure core or the controller.
for (const purePath of ["public/js/core/one-rep-max.mjs", "public/js/controller.mjs"]) {
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
  "Check passed: files, package contract, core constants/table/messages, fixtures identity, pages, CSP, syntax, capability scan, core purity",
);
