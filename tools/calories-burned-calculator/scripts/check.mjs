// Static project checks for the Calories Burned Calculator: required
// files, package contract, the SPEC-pinned rules that can be checked
// statically (the §2.4 MET table byte-for-byte in content, field order,
// raw limits, defaults, the §2.5 worked examples, the §2.8 bilingual
// strings in the app and pages, bilingual metadata and the candidate
// noindex/no-canonical rules), core purity (no DOM/network/storage),
// syntax of every shipped script, and a forbidden-capability scan.
// Exits non-zero on the first failure list.

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
  "public/js/core/table.mjs",
  "public/js/core/calculate.mjs",
  "public/js/core/report.mjs",
  "public/styles/calories-burned-calculator.css",
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

// Core contract: field order, raw limits, defaults, activity cap, report
// constants, and the SPEC §2.6 worked examples against the first fixtures.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/calculate.mjs")).href);
const table = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/table.mjs")).href);
const report = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/report.mjs")).href);
if (JSON.stringify(core.FIELDS) !== JSON.stringify(["weight", "durationMinutes", "activities"])) {
  fail("core: FIELDS order mismatch");
}
const expectedRawLimits = { weight: 8, durationMinutes: 8, activityElement: 32 };
if (canonical(core.RAW_LIMITS) !== canonical(expectedRawLimits)) {
  fail("core: RAW_LIMITS mismatch");
}
const expectedDefaults = { weight: "60", durationMinutes: "30", activities: ["walking-moderate"] };
if (canonical(core.DEFAULTS) !== canonical(expectedDefaults)) {
  fail("core: DEFAULTS mismatch");
}
if (core.MAX_ACTIVITIES !== 3) fail("core: MAX_ACTIVITIES must be 3");
if (report.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");
if (report.REPORT_FILENAME !== "calories-burned-report.json") {
  fail("core: REPORT_FILENAME mismatch");
}
if (report.REPORT_TOOL !== "calories-burned-calculator") fail("core: REPORT_TOOL mismatch");
if (report.REPORT_VERSION !== 1) fail("core: REPORT_VERSION must be 1");

// The vendored fixtures are a byte-identical copy of the spec candidate's
// fixtures.json (see VERIFICATION.md for the SHA-256).
const fixtureBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
const fixtureHash = createHash("sha256").update(fixtureBytes).digest("hex");
if (fixtureHash !== "f6fa703680ec9111157d696c1218e1be65120759af90a86f82f0ad0945df27ea") {
  fail("test/fixtures.json: hash differs from the spec candidate's fixtures.json");
}
const fixtures = JSON.parse(fixtureBytes.toString("utf8"));
if (!Array.isArray(fixtures) || fixtures.length !== 23) {
  fail("test/fixtures.json: expected 23 cases");
}
const fixtureIds = fixtures.map((entry) => entry.id);
if (new Set(fixtureIds).size !== fixtureIds.length) fail("test/fixtures.json: duplicate ids");
if (fixtures.filter((entry) => entry.expected !== undefined).length !== 8) {
  fail("test/fixtures.json: expected 8 success cases");
}
if (fixtures.filter((entry) => entry.expectedError !== undefined).length !== 13) {
  fail("test/fixtures.json: expected 13 cases with expectedError (12 error + 1 controller)");
}
if (fixtures.filter((entry) => entry.kind === "controller").length !== 3) {
  fail("test/fixtures.json: expected 3 controller cases");
}
// SPEC §2.6 worked examples, checked against the live core.
const worked = [
  [{ weight: "60", durationMinutes: "30", activities: ["walking-moderate"] }, 114],
  [{ weight: "65", durationMinutes: "30", activities: ["elliptical-moderate"] }, 163],
  [{ weight: "62.5", durationMinutes: "45.5", activities: ["swimming-laps-slow"] }, 275],
  [{ weight: "500", durationMinutes: "1440", activities: ["running-6mph"] }, 111600],
  [{ weight: "20", durationMinutes: "1", activities: ["yoga-hatha"] }, 1],
];
for (const [input, kcal] of worked) {
  const outcome = core.run(input);
  if (!outcome.ok || outcome.result.rows[0].kcal !== kcal || outcome.result.totalKcal !== kcal) {
    fail(`core: worked example ${JSON.stringify(input)} must be ${kcal}`);
  }
}
{
  const outcome = core.run({
    weight: "70",
    durationMinutes: "60",
    activities: ["walking-brisk", "jogging-general", "bicycling-moderate"],
  });
  if (!outcome.ok || outcome.result.totalKcal !== 1421) {
    fail("core: compare worked example total must be 1421");
  }
}

// The §2.4 MET table, checked literally: 14 rows, same order, same ids,
// codes (as strings, leading zeroes intact), MET tenths, and both names.
// A 2011 value anywhere in the table fails this suite.
const EXPECTED_TABLE = [
  { id: "walking-moderate", code: "17190", metTenths: 38, nameZh: "步行（中等速度）", nameEn: "Walking, 2.8 to 3.4 mph, moderate pace" },
  { id: "walking-brisk", code: "17200", metTenths: 48, nameZh: "步行（快走）", nameEn: "Walking, 3.5 to 3.9 mph, brisk pace" },
  { id: "hiking-cross-country", code: "17080", metTenths: 60, nameZh: "健行（越野）", nameEn: "Hiking, cross country" },
  { id: "jogging-general", code: "12020", metTenths: 75, nameZh: "慢跑（一般）", nameEn: "Jogging, general" },
  { id: "running-6mph", code: "12050", metTenths: 93, nameZh: "跑步（6.0–6.3 mph）", nameEn: "Running, 6.0 to 6.3 mph (10 min/mile)" },
  { id: "bicycling-leisure", code: "01010", metTenths: 40, nameZh: "自行車（休閒，<10 mph）", nameEn: "Bicycling, <10 mph, leisure" },
  { id: "bicycling-moderate", code: "01030", metTenths: 80, nameZh: "自行車（中速，12–13.9 mph）", nameEn: "Bicycling, 12 to 13.9 mph, moderate effort" },
  { id: "swimming-laps-slow", code: "18240", metTenths: 58, nameZh: "游泳（自由式，慢速）", nameEn: "Swimming laps, freestyle, slow, recreational" },
  { id: "swimming-laps-fast", code: "18230", metTenths: 98, nameZh: "游泳（自由式，快速）", nameEn: "Swimming laps, freestyle, fast, vigorous effort" },
  { id: "aerobic-general", code: "02000", metTenths: 73, nameZh: "有氧運動（一般）", nameEn: "Aerobic, general" },
  { id: "elliptical-moderate", code: "02048", metTenths: 50, nameZh: "橢圓機（中等強度）", nameEn: "Elliptical trainer, moderate effort" },
  { id: "resistance-training", code: "02054", metTenths: 35, nameZh: "重量訓練（多動作，8–15 下）", nameEn: "Resistance (weight) training, multiple exercises, 8–15 reps" },
  { id: "yoga-hatha", code: "02150", metTenths: 23, nameZh: "瑜伽（哈達）", nameEn: "Yoga, Hatha" },
  { id: "tai-chi", code: "15670", metTenths: 33, nameZh: "太極／氣功", nameEn: "Tai chi, qi gong, general" },
];
if (canonical(table.ACTIVITY_TABLE) !== canonical(EXPECTED_TABLE)) {
  fail("core: ACTIVITY_TABLE differs from SPEC §2.4");
}
// The 2011 values the SPEC warns about must not appear as MET tenths.
for (const [code, metTenths] of [["17200", 43], ["12020", 70], ["12050", 98], ["02150", 25]]) {
  const row = table.ACTIVITY_TABLE.find((entry) => entry.code === code);
  if (row !== undefined && row.metTenths === metTenths) {
    fail(`core: table carries a 2011 MET value for code ${row.code}`);
  }
}

// The app must carry the pinned bilingual strings verbatim: every §2.8
// error string, the status/stale strings, and the estimate disclaimer.
const appSource = await readFile(resolve(PROJECT_ROOT, "public/js/app.js"), "utf8");
const PINNED_APP_STRINGS = [
  "這份輸入的結構不正確，請重新輸入。",
  "體重最多 8 個字元。",
  "運動時間最多 8 個字元。",
  "每個活動代碼最多 32 個字元。",
  "輸入含有不完整的 Unicode 字元。",
  "請輸入體重。",
  "請輸入運動時間。",
  "請至少選擇一個活動。",
  "活動代碼不可空白。",
  "體重需為數字，最多兩位小數（例如 62.5）。",
  "時間需為數字，最多一位小數（例如 30 或 45.5）。",
  "體重需介於 20–500 kg。",
  "時間需介於 1–1440 分鐘。",
  "最多比較 3 個活動。",
  "未知的活動代碼。",
  "同一活動不可重複選取。",
  "報告超過 2 MiB 上限，無法下載。",
  "This input is not shaped correctly. Please re-enter it.",
  "Weight is limited to 8 characters.",
  "Duration is limited to 8 characters.",
  "Each activity code is limited to 32 characters.",
  "The input contains an incomplete Unicode character.",
  "Enter your weight.",
  "Enter the duration.",
  "Choose at least one activity.",
  "An activity code must not be blank.",
  "Weight must be a number with at most two decimal places (for example 62.5).",
  "Duration must be a number with at most one decimal place (for example 30 or 45.5).",
  "Weight must be between 20 and 500 kg.",
  "Duration must be between 1 and 1440 minutes.",
  "At most 3 activities can be compared.",
  "Unknown activity code.",
  "The same activity cannot be selected twice.",
  "The report exceeds the 2 MiB limit and cannot be downloaded.",
  "尚未計算。請輸入體重、運動時間並選擇活動。",
  "No estimate yet. Enter your weight, duration and activities.",
  "輸入已變更，請重新執行。",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行。",
  "Cancelled. You can run again.",
  "本工具的熱量為估算值：依 2024 年成人身體活動彙編（2024 Adult Compendium of Physical Activities）的 MET 值，以「MET × 體重（kg）× 時間（小時）」計算，為包含休息代謝的總消耗。實際消耗因個人代謝、動作效率與強度而異，本結果不作為醫療、減重或飲食處方。",
  "Calorie figures are estimates: they use MET values from the 2024 Adult Compendium of Physical Activities in the formula MET × weight (kg) × duration (hours) and are gross totals that include resting metabolism. Actual expenditure varies with individual metabolism, movement efficiency and intensity. This result is not medical, weight-loss or dietary advice.",
];
for (const text of PINNED_APP_STRINGS) {
  if (!appSource.includes(text)) fail(`public/js/app.js: missing pinned string: ${text}`);
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links are
// relative paths only), same-language home links, local assets, the
// pinned labels, gross note, disclaimer and FAQ, and the required
// element ids.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "運動熱量消耗計算｜Gloss Tools",
    description: "以 2024 年成人身體活動彙編的 MET 值，依體重與運動時間估算單次運動的總熱量消耗，最多同時比較三種活動。",
    h1: "運動熱量消耗計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    labels: ["體重（公斤）", "運動時間（分鐘）", "活動（最多選 3 項比較）", "計算", "重設", "下載報告（JSON）", "估算消耗熱量", "合計", "以上為總消耗（含休息代謝）"],
    disclaimer: "本工具的熱量為估算值：依 2024 年成人身體活動彙編（2024 Adult Compendium of Physical Activities）的 MET 值，以「MET × 體重（kg）× 時間（小時）」計算，為包含休息代謝的總消耗。實際消耗因個人代謝、動作效率與強度而異，本結果不作為醫療、減重或飲食處方。",
    faq: [
      "這個數字是怎麼算出來的？",
      "熱量（kcal）＝ MET × 體重（kg）× 時間（小時）。MET 是活動強度相對於休息的倍數；本工具的 MET 值來自 2024 年成人身體活動彙編，公式中的 1 MET 依該彙編定義為每公斤每小時 1 kcal。",
      "這是總消耗還是淨消耗？",
      "是總消耗，已包含同一段時間休息也會消耗的約 1 MET。若只想看活動本身的淨消耗，可用（MET − 1）× 體重 × 時間自行估算；本工具不提供切換。",
      "為什麼和我的手錶或跑步機數字不一樣？",
      "MET 值是 19–59 歲成人的群體平均，不同裝置用各自的感測與模型估算，個人代謝與動作效率也會造成差異；各方數字不同是預期內的。",
      "MET 值是哪個版本？為什麼和別的網站不同？",
      "本工具採用 2024 年版。2024 年版修訂了許多 2011 年版的數值（例如快走 4.3 → 4.8、哈達瑜伽 2.5 → 2.3），仍引用舊版的網站會算出不同的結果。",
      "比較模式的合計是什麼意思？",
      "每一列都以同一個體重與完整時間計算；合計是各列的相加，表示「每項都做滿該時間」的總和，不是把時間分配給各活動。",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/calories-burned-calculator.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Calories Burned Calculator | Gloss Tools",
    description:
      "Estimate gross calories burned in one exercise session from body weight, duration and MET values from the 2024 Adult Compendium of Physical Activities, comparing up to three activities.",
    h1: "Calories Burned Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    labels: ["Weight (kg)", "Duration (minutes)", "Activities (choose up to 3 to compare)", "Calculate", "Reset", "Download report (JSON)", "Estimated calories burned", "Total", "Gross totals (including resting metabolism)"],
    disclaimer:
      "Calorie figures are estimates: they use MET values from the 2024 Adult Compendium of Physical Activities in the formula MET × weight (kg) × duration (hours) and are gross totals that include resting metabolism. Actual expenditure varies with individual metabolism, movement efficiency and intensity. This result is not medical, weight-loss or dietary advice.",
    faq: [
      "How is the number calculated?",
      "Calories (kcal) = MET × weight (kg) × duration (hours). A MET is the activity's intensity relative to rest; the MET values here come from the 2024 Adult Compendium of Physical Activities, which defines 1 MET as 1 kcal per kilogram per hour.",
      "Is this gross or net?",
      "It is gross: it includes the roughly 1 MET you would have spent resting in the same time. For an activity-only net figure, estimate (MET − 1) × weight × hours yourself; the tool has no toggle.",
      "Why does my watch or treadmill show a different number?",
      "MET values are population averages for adults aged 19 to 59. Devices estimate with their own sensors and models, and individual metabolism and movement efficiency differ, so disagreement between figures is expected.",
      "Which edition are the MET values from, and why do other sites differ?",
      "This tool uses the 2024 edition. The 2024 edition revised many 2011 values (for example brisk walking 4.3 → 4.8 and Hatha yoga 2.5 → 2.3), so sites still citing the older edition produce different results.",
      "What does the total mean in compare mode?",
      "Each row uses the same weight and the full duration; the total is the sum of the rows, meaning \"each activity done for the full time\", not a session split between them.",
    ],
    draftNote: "Switching language or leaving the page discards the current draft.",
    assets: ['href="../styles/calories-burned-calculator.css"', 'src="../js/app.js"'],
  },
];
const REQUIRED_IDS = [
  "calories-form",
  "field-weight",
  "field-durationMinutes",
  "activities-group",
  "activity-list",
  "error-weight",
  "error-durationMinutes",
  "error-activities",
  "status",
  "results",
  "summary",
  "stale-note",
  "result-rows",
  "total-kcal",
  "disclaimer",
  "met-rows",
  "run-btn",
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
  if (!html.includes(page.disclaimer)) fail(`${page.path}: missing pinned estimate disclaimer`);
  for (const text of page.labels) {
    if (!html.includes(text)) fail(`${page.path}: missing label text: ${text}`);
  }
  for (const text of page.faq) {
    if (!html.includes(text)) fail(`${page.path}: missing FAQ text: ${text}`);
  }
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
  for (const id of REQUIRED_IDS) {
    if (!html.includes(`id="${id}"`)) fail(`${page.path}: missing element id=${id}`);
  }
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
  "public/js/core/table.mjs",
  "public/js/core/calculate.mjs",
  "public/js/core/report.mjs",
  "public/js/controller.mjs",
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
  "Check passed: files, package contract, core fields/limits/defaults/cap/report constants, worked examples, MET table vs SPEC §2.4, pinned strings, pages, syntax, capability scan, core purity",
);
