// Static project checks for the Steps Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, the 207/500 stride factor and the
// 3/4 calorie factor, example equals fixtures.json case 1, the pinned
// bilingual strings in the app, bilingual metadata and the candidate
// noindex/no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, the fixed worker-source concatenation,
// and a forbidden-capability scan.
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
  "public/js/core/steps.mjs",
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

// Core contract: field order, raw limits, defaults, the pinned 207/500
// stride factor and 3/4 calorie factor, report constants, and the
// example must match the SPEC and fixtures.json case 1 exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/steps.mjs")).href);
const expectedFields = ["steps", "strideSource", "strideCm", "heightCm", "calories", "weightKg"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = {
  steps: 8,
  strideSource: 8,
  strideCm: 8,
  heightCm: 8,
  calories: 8,
  weightKg: 8,
};
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  steps: "10000",
  strideSource: "height",
  strideCm: "70",
  heightCm: "170",
  calories: "off",
  weightKg: "65",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.STRIDE_NUMERATOR !== 207n || core.STRIDE_DENOMINATOR !== 500n) {
  fail("core: stride factor must be 207/500 (0.414)");
}
if (core.CALORIE_NUMERATOR !== 3n || core.CALORIE_DENOMINATOR !== 4n) {
  fail("core: calorie factor must be 3/4 (0.75 kcal/kg/km)");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "steps-converter-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtures = JSON.parse(await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"));
if (fixtures.slug !== "steps-converter" || fixtures.specId !== "spec-steps-converter-20261109") {
  fail("test/fixtures.json: not the steps-converter spec fixtures");
}
if (canonical(core.EXAMPLE) !== canonical(fixtures.cases[0].input)) {
  fail("core: EXAMPLE must equal fixtures.json case 1 input");
}
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 19) {
  fail("test/fixtures.json: expected 19 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}

// The app must carry the pinned bilingual strings verbatim: the estimate
// disclaimer and the flow-state strings are pinned by the SPEC; the error
// messages are this tool's fixed bilingual set.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "步數請用整數，不能有小數點或符號",
  "數字格式不正確，請檢查小數位數",
  "超出允許範圍",
  "報告太大，無法下載",
  "計算失敗，請重試",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Steps must be a whole number, with no decimal point or sign.",
  "Check the number format and decimal places.",
  "Out of range.",
  "The report is too large to download.",
  "Something went wrong. Try again.",
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
  "步幅與熱量皆為估算值。身高推估步幅採 0.414 × 身高；熱量採每公斤每公里 0.75 kcal（總消耗，含休息代謝），實際值因步速、地形與個人差異而不同。",
  "Stride and calories are estimates. The height-based stride uses 0.414 × height; calories use 0.75 kcal per kg per km (gross, including resting metabolism). Actual values vary with pace, terrain and the individual.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// pinned FAQ answers and estimate disclaimer, and the draft-loss note.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "步數換算｜Gloss Tools",
    description: "把計步器的步數換算成距離：用身高推估步幅或輸入自己的步幅，還可加開體重估算步行消耗的熱量（估算值）。",
    h1: "步數換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    help: [
      "整數，0–99,999,999 步，不能有小數點或符號。",
      "20.0–150.0 公分，最多兩位小數。",
      "80.0–250.0 公分，最多一位小數。",
      "20.0–500.0 公斤，最多一位小數。",
    ],
    disclaimer: "步幅與熱量皆為估算值。身高推估步幅採 0.414 × 身高；熱量採每公斤每公里 0.75 kcal（總消耗，含休息代謝），實際值因步速、地形與個人差異而不同。",
    faq: [
      "步幅怎麼來的？",
      "身高模式用步幅 = 身高 × 0.414（ACSM 迴歸平均，個人值約在 0.413–0.415 並隨步速變動）；知道自己的步幅時用實測模式更準。",
      "熱量準嗎？",
      "這是總消耗估算（0.75 kcal/kg/km），由 MET 表推得的一般步速範圍約 0.73–0.77；扣除休息代謝的淨消耗約 0.5。個人誤差可達 ±20%，只作概略參考。",
      "為什麼和手錶的距離不一樣？",
      "手錶用自己的步幅校準或 GPS；本工具只用畫面上顯示的步幅計算，步幅不同結果就不同。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Steps Converter | Gloss Tools",
    description:
      "Convert a step count to distance with a measured stride or a height-based estimate, plus an optional weight-based walking calorie estimate.",
    h1: "Steps Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    help: [
      "A whole number, 0–99,999,999 steps, with no decimal point or sign.",
      "20.0–150.0 cm, at most two decimal places.",
      "80.0–250.0 cm, at most one decimal place.",
      "20.0–500.0 kg, at most one decimal place.",
    ],
    disclaimer:
      "Stride and calories are estimates. The height-based stride uses 0.414 × height; calories use 0.75 kcal per kg per km (gross, including resting metabolism). Actual values vary with pace, terrain and the individual.",
    faq: [
      "Where does the stride estimate come from?",
      "Height mode uses stride = height × 0.414 (an ACSM regression average; individual values run about 0.413–0.415 and vary with pace). If you know your stride, measured mode is more accurate.",
      "How accurate is the calorie figure?",
      "It is a gross estimate (0.75 kcal/kg/km); MET tables put ordinary walking at about 0.73–0.77, and the net cost above resting is about 0.5. Individual error can reach ±20%; treat it as a rough guide.",
      "Why does my watch show a different distance?",
      "Watches use their own stride calibration or GPS. This tool uses exactly the stride shown, so a different stride gives a different distance.",
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
  for (const text of page.help) {
    if (!html.includes(text)) fail(`${page.path}: missing pinned help line: ${text}`);
  }
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned estimate disclaimer`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/steps.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "steps-converter-worker-"));
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
  "public/js/core/steps.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/factors/example, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
