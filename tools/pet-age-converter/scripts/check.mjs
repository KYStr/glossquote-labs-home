// Static project checks for the Pet Age Converter: required files,
// package contract, the SPEC-pinned size/rate/threshold tables and
// bilingual messages, the vendored fixtures identity (spec id, case
// counts, and the first core case reproduced exactly), bilingual page
// metadata and the candidate noindex/no-canonical rules, the pinned
// CSP in the preview server, syntax of every shipped script, a
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
  "public/js/core/pet-age.mjs",
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

// Core contract: pinned size table (rate, T1, T2), cat constants,
// limits, error/status messages, field labels and the SPEC default
// draft, all from the SPEC.
const core = await import(pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/pet-age.mjs")).href);
if (core.MAX_STRING_UNITS !== 8) fail("core: MAX_STRING_UNITS must be 8");
if (core.MAX_YEARS !== 38) fail("core: MAX_YEARS must be 38");
if (core.MAX_MONTHS !== 11) fail("core: MAX_MONTHS must be 11");
if (core.MAX_TOTAL_MONTHS.dog !== 360 || core.MAX_TOTAL_MONTHS.cat !== 456) {
  fail("core: MAX_TOTAL_MONTHS must be dog 360 / cat 456");
}
if (core.CAT_RATE !== 4) fail("core: CAT_RATE must be 4");
if (core.CAT_THRESHOLDS.t1 !== 55 || core.CAT_THRESHOLDS.t2 !== 75) {
  fail("core: CAT_THRESHOLDS must be 55/75");
}
const expectedSizes = [
  ["small", 4, 65, 85, "小型", "貴賓犬、吉娃娃"],
  ["medium", 5, 55, 75, "中型", "米格魯、邊境牧羊犬"],
  ["large", 6, 45, 65, "大型", "黃金獵犬、德國牧羊犬"],
  ["giant", 7, 38, 55, "巨型", "大丹犬、聖伯納犬"],
];
if (core.SIZES.length !== expectedSizes.length) fail("core: SIZES length mismatch");
for (const [index, [id, rate, t1, t2, labelZh, breedsZh]] of expectedSizes.entries()) {
  const size = core.SIZES[index];
  if (
    !size ||
    size.id !== id ||
    size.rate !== rate ||
    size.t1 !== t1 ||
    size.t2 !== t2 ||
    size.label["zh-Hant"] !== labelZh ||
    size.breeds["zh-Hant"] !== breedsZh
  ) {
    fail(`core: SIZES[${index}] must be ${id}/${rate}/${t1}/${t2}`);
  }
}
const expectedErrorMessages = {
  EMPTY: ["{field}不可空白。", "{field} must not be empty."],
  INTEGER_FORMAT: ["{field}必須是整數。", "{field} must be a whole number."],
  RANGE: ["{field}超出允許範圍。", "{field} is out of range."],
  ENUM: ["{field}不是可用的選項。", "{field} is not an available option."],
  INPUT_LIMIT: ["輸入太長。", "Input is too long."],
  UNICODE: ["輸入包含無效字元。", "Input contains invalid characters."],
  SCHEMA: ["輸入格式不正確。", "Input is malformed."],
  INTERNAL: ["發生未預期的錯誤，請重試。", "Something went wrong. Please try again."],
};
for (const [code, [zh, en]] of Object.entries(expectedErrorMessages)) {
  const entry = core.ERROR_MESSAGES[code];
  if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
    fail(`core: ERROR_MESSAGES.${code} mismatch`);
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
for (const [field, zh, en] of [
  ["species", "物種", "Species"],
  ["size", "體型", "Size"],
  ["years", "歲", "Years"],
  ["months", "月", "Months"],
]) {
  const entry = core.FIELD_LABELS[field];
  if (!entry || entry["zh-Hant"] !== zh || entry.en !== en) {
    fail(`core: FIELD_LABELS.${field} mismatch`);
  }
}
if (
  JSON.stringify(core.DEFAULT_DRAFT) !==
  JSON.stringify({ species: "dog", size: "medium", years: "", months: "" })
) {
  fail("core: DEFAULT_DRAFT differs from the SPEC reset value");
}
if (
  JSON.stringify(core.EXAMPLE_INPUT) !==
  JSON.stringify({ species: "dog", size: "medium", years: "3", months: "6" })
) {
  fail("core: EXAMPLE_INPUT differs from the first fixture case");
}

// Vendored fixtures identity: the fixed spec candidate's literal cases.
// The core must reproduce the first core case exactly, and the fixture
// set must hold 12 core and 3 controller cases.
const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-pet-age-converter-20261109") fail("fixtures: specId mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 12) fail(`fixtures: expected 12 core cases, got ${coreCases.length}`);
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
if (canonical(core.convert(coreCases[0].input)) !== canonical(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case dog-medium-mid-segment exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets,
// the pinned FAQ answers, the pinned rule-of-thumb note, the pinned
// cat-size note, and the draft-loss note.
const PAGE_IDS = [
  "calc-form",
  "species",
  "size",
  "size-cat-note",
  "years",
  "months",
  "run-btn",
  "example-btn",
  "cancel-btn",
  "reset-btn",
  "example-note",
  "status",
  "results",
  "result-human-years",
  "result-stage",
  "result-total-months",
  "result-segments",
  "error-species",
  "error-size",
  "error-years",
  "error-months",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "寵物年齡換算｜Gloss Tools",
    description:
      "把狗狗或貓咪的年齡換算成人類等效年齡：第一年 15 歲、第二年再加 9 歲，之後依物種與體型逐年增加，並標示生命階段。",
    h1: "寵物年齡換算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    faq: [
      "月份怎麼算？",
      "未滿一年的部分，在目前所在的段內按比例線性折算，例如中型犬 3 歲 6 個月，第三段只算半年。",
      "為什麼三段加起來可能差 0.1？",
      "三段各自獨立四捨五入到小數一位，合計可能與總年齡的顯示值差 0.1；階段判定用未捨入的精確值，不受影響。",
      "這是醫療建議嗎？",
      "不是。這是經驗模型的參考換算；健康、飲食與運動請諮詢獸醫。",
    ],
    ruleNote:
      "經驗法則提醒：坊間「乘以 7」的算法不符合本分段模型——光是第一年就相當於人類 15 歲。請以分段計算結果為準，本結果僅供日常參考，不是獸醫建議。",
    catNote: "貓不需要選體型",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: PAGE_IDS,
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Pet Age Converter | Gloss Tools",
    description:
      "Convert a dog's or cat's age to human-equivalent years with a pinned piecewise model: 15 for the first year, +9 for the second, then a per-year increment by species and size, plus a life-stage label.",
    h1: "Pet Age Converter",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    faq: [
      "How are months counted?",
      "A partial year is prorated linearly inside its current segment — a 3-year-6-month medium dog accrues only half of the third segment's year.",
      "Why can the three segments differ from the total by 0.1?",
      "Each segment is rounded to one decimal independently, so their sum can differ from the displayed total by 0.1; the life stage uses the exact unrounded value.",
      "Is this medical advice?",
      "No. It is a reference conversion from a rule-of-thumb model; ask a veterinarian about health, diet and exercise.",
    ],
    ruleNote:
      "Rule-of-thumb note: the popular 'multiply by 7' shortcut does not match this piecewise model — the first year alone equals 15 human years. Treat the result as an everyday reference, not veterinary advice.",
    catNote: "Cats do not need a size",
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
  if (!html.includes(page.ruleNote)) fail(`${page.path}: missing rule-of-thumb note`);
  if (!html.includes(page.catNote)) fail(`${page.path}: missing cat-size note`);
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
for (const purePath of ["public/js/core/pet-age.mjs", "public/js/controller.mjs"]) {
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
  "Check passed: files, package contract, size/stage tables/messages, fixtures identity, pages, CSP, syntax, capability scan, core purity",
);
