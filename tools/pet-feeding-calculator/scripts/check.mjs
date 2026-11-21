// Static project checks for the Pet Feeding Calculator: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (field order, raw limits, defaults, the full multiplier table and
// life-stage labels, status strings, the example equals the
// dog-neutered-default fixture, the pinned bilingual strings in the app,
// bilingual metadata and the candidate noindex / no-canonical / CSP
// rules), core purity (no DOM/network/storage), syntax of every shipped
// script, the fixed worker-source concatenation, and a
// forbidden-capability scan. This tool forbids persistent storage
// entirely (SPEC implementation section), so localStorage and
// sessionStorage are forbidden in every shipped file. Exits non-zero
// on the first failure list.

import { createHash } from "node:crypto";
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
  "public/js/core/pet-feeding.mjs",
  "public/styles/pet-feeding.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/pet-feeding-core.test.mjs",
  "test/pet-feeding-controller.test.mjs",
  "test/pet-feeding-report.test.mjs",
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
// does not match its own scan. Persistent storage is deliberately IN
// this list: the SPEC forbids it, and the draft lives only in the
// current page. URL schemes are likewise not in this list only because
// no page carries one; check.mjs asserts the pages contain zero
// https:// URLs.
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

// Core contract: field order, raw limits, defaults, the multiplier
// table, life-stage labels, status strings, ranges, report constants,
// and the example must match the SPEC and fixtures.json exactly.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/pet-feeding.mjs")).href);
const expectedFields = ["species", "lifeStage", "weightKg", "foodKcalPer100g", "foodKcalPerCup", "mealsPerDay"];
if (JSON.stringify(core.FIELDS) !== JSON.stringify(expectedFields)) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { species: 8, lifeStage: 32, weightKg: 8, foodKcalPer100g: 8, foodKcalPerCup: 8, mealsPerDay: 8 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = {
  species: "dog",
  lifeStage: "adult-neutered",
  weightKg: "10",
  foodKcalPer100g: "360",
  foodKcalPerCup: "",
  mealsPerDay: "2",
};
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (canonical(core.EXAMPLE) !== canonical(expectedDefaults)) {
  fail("core: EXAMPLE must equal DEFAULTS (first fixture case)");
}
if (core.STORAGE_KEY !== undefined) {
  fail("core: must not define a storage key (persistent storage is forbidden)");
}
// The pinned multiplier table (SPEC inputsOutputs). The cat
// weight-loss value is 0.8, not the concept note's 1.0.
const expectedMultipliers = {
  dog: {
    "puppy-under-4-months": 3.0,
    "puppy-4-months-to-adult": 2.0,
    "adult-intact": 1.8,
    "adult-neutered": 1.6,
    "adult-inactive": 1.4,
    "weight-loss": 1.0,
  },
  cat: {
    kitten: 2.5,
    "adult-intact": 1.4,
    "adult-neutered": 1.2,
    "adult-inactive": 1.0,
    "weight-loss": 0.8,
  },
};
if (canonical(core.MULTIPLIERS) !== canonical(expectedMultipliers)) {
  fail("core: MULTIPLIERS table differs from SPEC inputsOutputs");
}
const expectedLabels = {
  dog: {
    "puppy-under-4-months": { zh: "幼犬（4 個月以下）", en: "Puppy (under 4 months)" },
    "puppy-4-months-to-adult": { zh: "幼犬（4 個月至成犬）", en: "Puppy (4 months to adult)" },
    "adult-intact": { zh: "成犬・未絕育", en: "Adult dog, intact" },
    "adult-neutered": { zh: "成犬・已絕育", en: "Adult dog, neutered" },
    "adult-inactive": { zh: "成犬・活動量低或易胖", en: "Adult dog, inactive or obesity-prone" },
    "weight-loss": { zh: "減重（以理想體重計）", en: "Weight loss (at ideal weight)" },
  },
  cat: {
    kitten: { zh: "幼貓", en: "Kitten" },
    "adult-intact": { zh: "成貓・未絕育", en: "Adult cat, intact" },
    "adult-neutered": { zh: "成貓・已絕育", en: "Adult cat, neutered" },
    "adult-inactive": { zh: "成貓・活動量低或易胖", en: "Adult cat, inactive or obesity-prone" },
    "weight-loss": { zh: "減重（以理想體重計）", en: "Weight loss (at ideal weight)" },
  },
};
if (canonical(core.LIFE_STAGE_LABELS) !== canonical(expectedLabels)) {
  fail("core: LIFE_STAGE_LABELS mismatch");
}
if (core.lifeStageLabel("cat", "weight-loss", "en") !== "Weight loss (at ideal weight)") {
  fail("core: lifeStageLabel(cat, weight-loss, en) mismatch");
}
if (core.lifeStageLabel("dog", "puppy-under-4-months", "zh") !== "幼犬（4 個月以下）") {
  fail("core: lifeStageLabel(dog, puppy-under-4-months, zh) mismatch");
}
const expectedStatus = {
  empty: { zh: "尚未計算，請輸入資料或載入範例", en: "Not calculated yet — enter the details or load the example." },
  dirty: { zh: "輸入已變更，請重新執行", en: "Input changed. Run again." },
  busy: { zh: "處理中", en: "Working" },
  success: { zh: "計算完成", en: "Calculation complete" },
  error: { zh: "無法計算，請檢查輸入", en: "Cannot calculate — check your input" },
  cancelled: { zh: "已取消，可重新執行", en: "Cancelled. You can run again." },
  unavailable: { zh: "背景計算不可用", en: "Background calculation unavailable" },
  reset: { zh: "已重設", en: "Reset" },
  example: { zh: "已載入範例", en: "Example loaded" },
};
if (canonical(core.STATUS_TEXT) !== canonical(expectedStatus)) {
  fail("core: STATUS_TEXT mismatch");
}
if (core.WEIGHT_MIN !== 0.5) fail("core: WEIGHT_MIN must be 0.5");
if (canonical(core.WEIGHT_MAX) !== canonical({ dog: 100, cat: 20 })) {
  fail("core: WEIGHT_MAX must be dog 100 / cat 20");
}
if (core.DENSITY_MIN !== 20 || core.DENSITY_MAX !== 900) {
  fail("core: density range must be 20-900");
}
if (core.CUP_MIN !== 50 || core.CUP_MAX !== 1500) {
  fail("core: cup range must be 50-1500");
}
if (core.MEALS_MIN !== 1 || core.MEALS_MAX !== 6) {
  fail("core: meals range must be 1-6");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (core.REPORT_FILENAME !== "pet-feeding-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (core.formatCups(2.84) !== "2.84" || core.formatCups(0.67) !== "0.67") {
  fail("core: formatCups must render two decimals");
}

// The vendored fixtures are a byte-identical copy of the spec
// candidate's fixtures.json (see VERIFICATION.md for the SHA-256).
const fixturesText = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8");
const fixturesHash = createHash("sha256").update(fixturesText).digest("hex");
if (fixturesHash !== "9925a6830399019d9005205fe08933d9d863c8f05fe870d37a19c9aceef17ed8") {
  fail("test/fixtures.json: hash differs from the spec candidate fixtures");
}
const fixtures = JSON.parse(fixturesText);
if (!Array.isArray(fixtures.cases)) fail("test/fixtures.json: expected a cases array");
if (fixtures.cases.filter((entry) => entry.kind === "core").length !== 21) {
  fail("test/fixtures.json: expected 21 core cases");
}
if (fixtures.cases.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
const defaultCase = fixtures.cases.find((entry) => entry.id === "dog-neutered-default");
if (canonical(core.EXAMPLE) !== canonical(defaultCase.input)) {
  fail("core: EXAMPLE must equal the dog-neutered-default fixture input");
}

// The app must carry the pinned bilingual strings verbatim: the error
// messages, the estimate disclaimer, the weight-loss note, the cups
// note and the example note.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "輸入格式不正確",
  "輸入太長",
  "輸入含有不完整的字元",
  "必填",
  "請選擇有效的選項",
  "體重請輸入數字（公斤），最多兩位小數",
  "體重超出該物種的允許範圍",
  "每 100 公克熱量請輸入數字，最多兩位小數",
  "每 100 公克熱量請輸入 20–900 大卡",
  "每杯熱量請輸入數字，最多兩位小數",
  "每杯熱量請輸入 50–1500 大卡",
  "每日餐數請輸入整數",
  "每日餐數請輸入 1–6",
  "超出允許範圍",
  "計算失敗，請重試",
  "報告太大，無法下載",
  "The input is malformed.",
  "Input is too long.",
  "Input contains an incomplete character.",
  "This field is required.",
  "Choose a valid option.",
  "Enter the weight in kg, with at most two decimal places.",
  "Weight is outside the allowed range for this species.",
  "Enter the kcal per 100 g, with at most two decimal places.",
  "Enter 20–900 kcal per 100 g.",
  "Enter the kcal per cup, with at most two decimal places.",
  "Enter 50–1500 kcal per cup.",
  "Enter the meals per day as a whole number.",
  "Enter 1–6 meals per day.",
  "Out of range.",
  "Something went wrong. Try again.",
  "The report is too large to download.",
  "減重列以理想（目標）體重計算；使用減重列時請輸入目標體重。",
  "The weight-loss row is calculated at the ideal (target) weight; enter the target weight when using it.",
  "本工具依公開獸醫營養指引估算每日熱量與餵食量，僅供參考。個別寵物的實際需求與估算值差距可達 50%；請以體態評分（BCS）與獸醫師的建議為準，並依寵物的體重與體態變化調整餵食量。",
  "This tool estimates daily calories and food amounts from published veterinary nutrition guidelines, as a starting point only. An individual pet's actual needs can differ from the estimate by up to 50%. Let body condition score (BCS) and your veterinarian's advice govern actual feeding, and adjust portions as your pet's weight and condition change.",
  "每餐杯數是各自四捨五入到小數 2 位，合計可能與每日杯數相差每餐至多 0.01 杯。",
  "Per-meal cups are each rounded to two decimals, so their sum can differ from the daily cups by up to 0.01 per meal.",
  "已載入範例，請按「計算每日餵食量」執行。",
  "Example loaded. Run “Calculate daily feeding amount” to compute it.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, the pinned CSP meta (with worker-src blob:), no production
// canonical / hreflang / sitemap, same-language home links, local
// assets, the pinned FAQ answers and estimate disclaimer.
const CSP_META =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "寵物餵食量計算｜Gloss Tools",
    description:
      "依獸醫營養指引的 RER／DER 公式，輸入寵物體重、生命階段與飼料熱量，算出每日熱量、克數、杯數與每餐餵食量。",
    h1: "寵物餵食量計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    draftNote: "切換語言或離開頁面會失去草稿。",
    help: "狗 0.5–100 公斤，貓 0.5–20 公斤；最多兩位小數。減重列請輸入目標體重。",
    disclaimer:
      "本工具依公開獸醫營養指引估算每日熱量與餵食量，僅供參考。個別寵物的實際需求與估算值差距可達 50%；請以體態評分（BCS）與獸醫師的建議為準，並依寵物的體重與體態變化調整餵食量。",
    faq: [
      "RER 是什麼？",
      "靜止能量需求 RER = 70 × 體重（公斤）的 0.75 次方，是寵物休息時維持基本生理機能的每日熱量；每日總需求 DER 再乘上生命階段倍率。",
      "為什麼和飼料包裝上的建議量不同？",
      "包裝建議依該產品的平均假設，本工具依你的寵物體重與生命階段估算；兩者都是起點，個別差異可達 50%，請依體態調整。",
      "杯數和克數哪個準？",
      "克數較準。杯量會隨飼料顆粒與裝填方式變動；每杯熱量請以該飼料包裝標示為準。",
      "可以用在懷孕或哺乳中的寵物嗎？",
      "不行。懷孕與哺乳的需求依週數與幼崽數量大幅變動，公開指引只給範圍，請諮詢獸醫師。",
    ],
    assets: ['href="./styles/pet-feeding.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Pet Feeding Calculator | Gloss Tools",
    description:
      "Estimate daily calories, grams, cups and per-meal amounts for your dog or cat from its weight, life stage and food energy density, using the veterinary RER/DER method.",
    h1: "Pet Feeding Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    draftNote: "Switching language or leaving the page discards the draft.",
    help: "Dogs 0.5–100 kg, cats 0.5–20 kg; at most two decimal places. For the weight-loss row, enter the target weight.",
    disclaimer:
      "This tool estimates daily calories and food amounts from published veterinary nutrition guidelines, as a starting point only. An individual pet's actual needs can differ from the estimate by up to 50%. Let body condition score (BCS) and your veterinarian's advice govern actual feeding, and adjust portions as your pet's weight and condition change.",
    faq: [
      "What is RER?",
      "Resting energy requirement: RER = 70 × (weight in kg)^0.75, the daily calories a resting pet needs for basic body functions; the daily requirement (DER) multiplies RER by a life-stage factor.",
      "Why does this differ from the feeding guide on the bag?",
      "Bag guides assume an average pet eating that product; this tool estimates from your pet's weight and life stage. Both are starting points — individual needs vary by up to 50%, so adjust by body condition.",
      "Cups or grams — which is more accurate?",
      "Grams are more accurate. Cup amounts vary with kibble size and how the cup is filled; use the kcal-per-cup figure printed on your food's label.",
      "Can I use this for a pregnant or nursing pet?",
      "No. Needs during gestation and lactation vary widely by stage and litter size, and published guidelines give ranges only — ask your veterinarian.",
    ],
    assets: ['href="../styles/pet-feeding.css"', 'src="../js/app.js"'],
  },
];
for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang must be ${page.lang}`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.path}: missing preview noindex`);
  if (!html.includes(`<meta http-equiv="Content-Security-Policy" content="${CSP_META}">`)) {
    fail(`${page.path}: CSP meta mismatch`);
  }
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: title mismatch`);
  if (!html.includes(`<meta name="description" content="${page.description}">`)) {
    fail(`${page.path}: description mismatch`);
  }
  if (!html.includes(`<h1>${page.h1}</h1>`)) fail(`${page.path}: h1 mismatch`);
  // Candidate: no production canonical, hreflang or sitemap (SPEC
  // tests section); the formal origin is not configured yet.
  if (html.includes("rel=\"canonical\"")) fail(`${page.path}: must not carry a canonical`);
  if (html.includes("hreflang")) fail(`${page.path}: must not carry hreflang`);
  if (html.includes("sitemap")) fail(`${page.path}: must not mention a sitemap`);
  const urlCount = (html.match(/https:\/\//g) ?? []).length;
  if (urlCount !== 0) fail(`${page.path}: expected zero https URLs, found ${urlCount}`);
  if (!html.includes(page.langLink)) fail(`${page.path}: missing relative language link`);
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!html.includes(page.draftNote)) fail(`${page.path}: missing draft-loss note`);
  if (!html.includes(page.help)) fail(`${page.path}: missing pinned help line`);
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
  for (const id of ["status", "results", "disclaimer", "weight-loss-note", "result-der", "result-grams", "result-cups", "result-rer", "result-multiplier", "meals-body", "cups-note", "run-btn", "cancel-btn", "example-btn", "reset-btn", "download-btn", "example-note"]) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id="${id}"`);
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
  const coreSource = await readFile(resolve(PROJECT_ROOT, "public/js/core/pet-feeding.mjs"), "utf8");
  const handlerSource = await readFile(resolve(PROJECT_ROOT, "public/js/worker-handler.mjs"), "utf8");
  const dir = await mkdtemp(join(tmpdir(), "pet-feeding-calculator-worker-"));
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

// Core purity: no DOM, storage, or network access in the pure modules
// or the controller. Only public/js/app.js may touch the DOM; no file
// may touch persistent storage at all.
for (const purePath of [
  "public/js/core/pet-feeding.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const text = await readFile(resolve(PROJECT_ROOT, purePath), "utf8");
  for (const token of ["document", "window", "location", "navigator", "localStorage", "sessionStorage"]) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${purePath}: pure module must not reference ${token}`);
    }
  }
}
{
  const appText = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
  if (appText.includes("localStorage") || appText.includes("sessionStorage")) {
    fail("public/js/app.js: persistent storage is forbidden for this tool");
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log(
  "Check passed: files, package contract, core fields/limits/defaults/multipliers/labels/status/ranges/report/example, fixtures hash and counts, pinned strings, pages, syntax, worker concatenation, capability scan, core purity",
);
