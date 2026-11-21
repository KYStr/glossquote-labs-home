// Static project checks for the Ideal Weight Calculator: required
// files, package contract, the SPEC-pinned core constants (WHO bounds,
// BMI-22 reference, the four formulas' constants, Hamwi in pounds),
// bilingual error messages, the vendored fixtures identity (spec id,
// case counts, SHA-256 against the spec source, and the first core case
// reproduced exactly), bilingual page metadata and the candidate
// noindex/no-canonical rules, the pinned CSP in the preview server,
// syntax of every shipped script, a forbidden-capability scan, and
// core/controller purity. Exits non-zero on the first failure list.

import { createHash } from "node:crypto";
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
  "public/js/worker-handler.mjs",
  "public/js/core/ideal-weight.mjs",
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

// Core contract: pinned limits, WHO bounds, BMI-22 reference, the four
// formulas' constants, defaults/example, and the report contract.
const core = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/ideal-weight.mjs")).href
);
if (core.MAX_INPUT_UNITS !== 8) fail("core: MAX_INPUT_UNITS must be 8");
if (core.MIN_HEIGHT_TENTHS !== 1300n) fail("core: MIN_HEIGHT_TENTHS must be 1300n");
if (core.MAX_HEIGHT_TENTHS !== 2300n) fail("core: MAX_HEIGHT_TENTHS must be 2300n");
if (core.WHO_BMI_LOW !== "18.5") fail("core: WHO_BMI_LOW must be 18.5");
if (core.WHO_BMI_HIGH !== "24.9") fail("core: WHO_BMI_HIGH must be 24.9");
if (core.BMI22_REFERENCE !== "22") fail("core: BMI22_REFERENCE must be 22");
const expectedConstants = {
  devine: { baseKg: ["50", "45.5"], perInchKg: ["2.3", "2.3"] },
  robinson: { baseKg: ["52", "49"], perInchKg: ["1.9", "1.7"] },
  miller: { baseKg: ["56.2", "53.1"], perInchKg: ["1.41", "1.36"] },
  hamwi: { baseLb: ["106", "100"], perInchLb: ["6", "5"] },
};
if (JSON.stringify(core.FORMULA_CONSTANTS) !== JSON.stringify(expectedConstants)) {
  fail("core: FORMULA_CONSTANTS differ from the SPEC-pinned constants");
}
if (JSON.stringify(core.FORMULA_ORDER) !== JSON.stringify(["devine", "robinson", "miller", "hamwi"])) {
  fail("core: FORMULA_ORDER must be devine, robinson, miller, hamwi");
}
if (JSON.stringify(core.DEFAULTS) !== JSON.stringify({ heightCm: "", sex: "female" })) {
  fail("core: DEFAULTS must be {heightCm: '', sex: 'female'}");
}
if (JSON.stringify(core.EXAMPLE) !== JSON.stringify({ heightCm: "170", sex: "male" })) {
  fail("core: EXAMPLE must be the first fixture case");
}
if (core.REPORT_FILENAME !== "ideal-weight-report.json") {
  fail("core: REPORT_FILENAME must be ideal-weight-report.json");
}
if (core.REPORT_BYTE_LIMIT !== 2097152) fail("core: REPORT_BYTE_LIMIT must be 2097152");

const expectedMessages = {
  SCHEMA: ["輸入格式不正確", "The input is malformed."],
  INPUT_LIMIT: ["輸入太長", "Input is too long."],
  UNICODE: ["輸入含有無效字元", "Input contains an invalid character."],
  DECIMAL_FORMAT: [
    "身高必須是數字，最多一位小數",
    "Height must be a number with at most one decimal place.",
  ],
  ENUM: ["性別只能是男性或女性", "Sex must be male or female."],
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
    heightCm: ["請輸入身高", "Enter the height."],
    sex: ["請選擇性別", "Choose the sex."],
  },
  RANGE: {
    heightCm: [
      "身高必須介於 130.0 到 230.0 公分",
      "Height must be between 130.0 and 230.0 cm.",
    ],
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

// Vendored fixtures identity: the fixed spec candidate's literal cases,
// byte-identical to the spec source (SHA-256 pinned here). The core must
// reproduce the first core case exactly, and the fixture set must hold 16
// core and 3 controller cases.
const fixtureBytes = await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"));
const fixtureHash = createHash("sha256").update(fixtureBytes).digest("hex");
if (fixtureHash !== "daaef39bbe70217758eac5e35c876b997b6528b6d134a6a69a7d18d3ea889f17") {
  fail("fixtures: test/fixtures.json differs from the spec source bytes");
}
const fixtures = JSON.parse(fixtureBytes.toString("utf8"));
if (fixtures.specId !== "spec-ideal-weight-calculator-20261109") fail("fixtures: specId mismatch");
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 16) fail(`fixtures: expected 16 core cases, got ${coreCases.length}`);
if (controllerCases.length !== 3) {
  fail(`fixtures: expected 3 controller cases, got ${controllerCases.length}`);
}
if (JSON.stringify(core.run(coreCases[0].input)) !== JSON.stringify(coreCases[0].expected)) {
  fail("fixtures: core must reproduce case male-170-standard exactly");
}

// Page checks: language, SPEC-pinned title/description/h1, preview
// noindex, candidate rules (no canonical, no hreflang, language links
// are relative paths only), same-language home links, local assets, the
// pinned health disclaimer / FAQ answers / formula names and sources,
// and the draft-loss note.
const PAGE_IDS = [
  "ideal-weight-form",
  "field-heightCm",
  "field-sex-male",
  "field-sex-female",
  "error-heightCm",
  "error-sex",
  "error-general",
  "status",
  "example-note",
  "run-btn",
  "example-btn",
  "reset-btn",
  "cancel-btn",
  "download-btn",
  "health-disclaimer",
  "results",
  "results-heading",
  "summary",
  "result-rows",
];
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "理想體重計算｜Gloss Tools",
    description:
      "輸入身高與性別，查 WHO 健康體重範圍、BMI 22 參考體重，以及 Devine、Robinson、Miller、Hamwi 四個已發表公式的理想體重估算，常數全數標明出處。",
    h1: "理想體重計算",
    langLink: 'href="./en/index.html"',
    home: 'href="../../"',
    texts: [
      "這些數字是依身高與性別推算的族群統計參考值，不是個人醫療建議，也不是診斷或減重目標。公式未考慮年齡、肌肉量、體脂、骨架與懷孕等個人差異；如有健康疑問，請諮詢醫師或營養師。",
      "為什麼四個公式的數字都不同？",
      "它們來自不同年代與樣本，最初多為藥物劑量設計，沒有哪一個是唯一正解；並列正是為了讓差距可見。",
      "這裡的健康範圍和台灣國健署的標準一樣嗎？",
      "下限相同（BMI 18.5)，上限不同：本頁顯示 WHO 的 24.9，國健署成人健康體位是 18.5 ≤ BMI &lt; 24，上限體重會比本頁低。",
      "身高不到 5 英尺時公式怎麼算？",
      "四式沿同一直線延伸（每英吋的增減不變）。公式原本以 5 英尺前後的成人為對象，矮個子的結果請當粗略參考。",
      "為什麼沒有骨架大小的調整？",
      "只有 Hamwi 原文附帶 ±10% 的骨架建議，其餘三式沒有；沒有單一可引標準可套用到四式，本工具不調整，數字請連同聲明一起看。",
      "可以把這些數字當減重目標嗎？",
      "不行。它們是族群統計參考，不是個人醫療建議；個人目標請諮詢醫師或營養師。",
      "計算理想體重",
      "載入範例",
      "BMI 22 參考體重",
      "Devine（1974）",
      "Robinson（1983）",
      "Miller（1983）",
      "Hamwi（1964）",
      "ideal-weight-report.json",
    ],
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
    ids: PAGE_IDS,
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Ideal Weight Calculator | Gloss Tools",
    description:
      "From height and sex, see the WHO healthy weight range, the BMI-22 reference weight, and ideal weight estimates from the four published Devine, Robinson, Miller and Hamwi formulas, with every constant cited.",
    h1: "Ideal Weight Calculator",
    langLink: 'href="../index.html"',
    home: 'href="../../en/"',
    texts: [
      "These figures are population-level statistical references estimated from height and sex only. They are not personal medical advice, a diagnosis, or a weight-loss target. The formulas do not account for age, muscle mass, body fat, frame size, pregnancy, or other individual differences. Consult a physician or registered dietitian with any health concerns.",
      "Why do the four formulas give different numbers?",
      "They come from different decades and samples and were mostly designed for drug dosing; none is the single right answer, and showing them side by side makes the spread visible.",
      "Is this range the same as Taiwan's HPA standard?",
      "The lower bound matches (BMI 18.5), the upper differs: this page shows the WHO bound 24.9, while Taiwan's HPA healthy band is 18.5 ≤ BMI &lt; 24, giving a lower upper weight.",
      "What if I am shorter than 5 feet?",
      "The formulas extend along the same straight line (the per-inch step is unchanged). They were published for adults around 5 feet and taller, so treat results at shorter heights as rough references.",
      "Why is there no frame-size adjustment?",
      "Only Hamwi's original note suggests ±10% for frame size; the other formulas have none, and no single citable rule applies it across all four, so this tool does not adjust.",
      "Can I use these numbers as a weight-loss target?",
      "No. They are population-level statistical references, not personal medical advice; talk to a physician or registered dietitian about personal goals.",
      "Calculate ideal weight",
      "Load example",
      "BMI-22 reference weight",
      "Devine (1974)",
      "Robinson (1983)",
      "Miller (1983)",
      "Hamwi (1964)",
      "ideal-weight-report.json",
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
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
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

// Core purity: no DOM access in the pure core, the controller, or the
// worker handler.
for (const purePath of [
  "public/js/core/ideal-weight.mjs",
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
  "Check passed: files, package contract, core constants/formulas/messages, fixtures identity, pages, CSP, syntax, capability scan, core purity",
);
