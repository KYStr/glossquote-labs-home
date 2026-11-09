import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_ROOT = resolve(PROJECT_ROOT, "public");

const REQUIRED_PATHS = [
  "package.json",
  "public/en/index.html",
  "public/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/blood.mjs",
  "public/js/worker-handler.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check-generated.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "test/controller.test.mjs",
  "test/core.test.mjs",
  "test/fixtures.json",
  "test/report.test.mjs",
  "test/site.test.mjs",
];

function fail(message) {
  throw new Error(message);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

for (const relativePath of REQUIRED_PATHS) {
  try {
    await access(resolve(PROJECT_ROOT, relativePath));
  } catch {
    fail(`missing required path: ${relativePath}`);
  }
}

const packageJson = JSON.parse(await readFile(resolve(PROJECT_ROOT, "package.json"), "utf8"));
if (
  packageJson.type !== "module"
  || packageJson.engines?.node !== ">=24"
  || Object.keys(packageJson.dependencies ?? {}).length !== 0
  || Object.keys(packageJson.devDependencies ?? {}).length !== 0
) {
  fail("package.json must be ESM, Node >=24, with zero dependencies");
}
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (typeof packageJson.scripts?.[script] !== "string") fail(`missing npm script: ${script}`);
}

const fixtures = JSON.parse(
  await readFile(resolve(PROJECT_ROOT, "test/fixtures.json"), "utf8"),
);
if (fixtures.specId !== "spec-blood-type-compatibility-20261109") {
  fail("fixtures must come from spec-blood-type-compatibility-20261109");
}
const coreCases = fixtures.cases.filter((entry) => entry.kind === "core");
const controllerCases = fixtures.cases.filter((entry) => entry.kind === "controller");
if (coreCases.length !== 10) fail("fixtures must contain exactly 10 core cases");
if (!deepEqual(controllerCases.map((entry) => entry.id), [
  "state-dirty-error",
  "state-cancel-late",
  "state-replace-late",
])) {
  fail("controller fixture ids changed");
}

const core = await import(pathToFileURL(resolve(PUBLIC_ROOT, "js/core/blood.mjs")).href);
if (!deepEqual(core.TYPES, ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"])) {
  fail("TYPES must list the eight codes in canonical order");
}
if (!deepEqual(core.RBC_MATRIX, {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
})) {
  fail("RBC_MATRIX must match the spec's pinned 8x8 matrix");
}
if (!deepEqual(core.PLASMA_MATRIX, {
  O: ["O"],
  A: ["A", "O"],
  B: ["B", "O"],
  AB: ["AB", "A", "B", "O"],
})) {
  fail("PLASMA_MATRIX must match the spec's pinned ABO 4x4 matrix");
}
if (!deepEqual(core.BADGES, [
  "rbc-universal-donor",
  "rbc-universal-recipient",
  "plasma-universal-donor",
  "plasma-universal-recipient",
])) {
  fail("BADGES must list the four badge ids in fixed order");
}
if (!deepEqual(core.DEFAULTS, { mode: "single", bloodType: "" })) fail("core DEFAULTS changed");
if (!deepEqual(core.EXAMPLE, coreCases[0].input)) fail("core EXAMPLE must equal core fixture case 1");
if (core.MAX_RAW_UNITS !== 8) fail("field raw capacity must be 8 UTF-16 units");
if (typeof core.run !== "function" || typeof core.buildReport !== "function") {
  fail("core must export run and buildReport");
}
if (core.REPORT_FILENAME !== "blood-type-compatibility-report.json") fail("report filename changed");

const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "血型相容查詢｜Gloss Tools",
    description:
      "選一個血型，立刻看到紅血球與血漿各自能捐給誰、能接受自誰與萬用徽章；也能直接核對捐贈者與受血者兩人的相容性。",
    h1: "血型相容查詢",
    langLink: "./en/index.html",
    home: "../../",
    stylesheet: "./styles/app.css",
    script: "./js/app.js",
    draftNote: "切換語言或離開頁面會失去目前草稿。",
    plasmaNote: "血漿相容不看 Rh 因子，名單以 ABO 血型判定，同 ABO 的 Rh 陰性與陽性一併列出。",
    disclaimer:
      "本工具僅供教育參考，依標準血型相容表整理；實際輸血以血庫交叉配血與醫療專業判斷為準。",
    faq: [
      ["為什麼 O 型 Rh 陰性是紅血球萬用捐贈者？", "O 型紅血球沒有 A、B 抗原，Rh 陰性也沒有 D 抗原，不會被任何受血者的抗體攻擊，所以能捐給全部八種血型。"],
      ["為什麼血漿的萬用捐贈者正好相反，是 AB 型？", "血漿相容看捐贈者血漿裡的抗體：AB 型血漿沒有抗 A、抗 B 抗體，能捐給所有 ABO 血型；O 型血漿兩種抗體都有，只能捐給 O 型。血漿相容不看 Rh 因子。"],
    ],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Blood Type Compatibility | Gloss Tools",
    description:
      "Pick one blood type to see who you can give red cells and plasma to and receive them from, or check a donor and recipient pair directly.",
    h1: "Blood Type Compatibility",
    langLink: "../index.html",
    home: "../../../",
    stylesheet: "../styles/app.css",
    script: "../js/app.js",
    draftNote: "Switching language or leaving this page discards the current draft.",
    plasmaNote:
      "Plasma compatibility does not depend on the Rh factor; lists are decided by ABO group and include both Rh variants of each ABO group.",
    disclaimer:
      "For education only, based on the standard blood-type compatibility chart. Actual transfusion always follows blood-bank crossmatching and clinical judgement.",
    faq: [
      ["Why is O negative the universal red-cell donor?", "O red cells carry neither A nor B antigens, and Rh negative cells carry no D antigen, so no recipient's antibodies attack them; O negative can give to all eight blood types."],
      ["Why is AB the universal plasma donor instead?", "Plasma compatibility turns on the donor plasma's antibodies: AB plasma has neither anti-A nor anti-B antibodies, so it can be given to every ABO group, while O plasma has both and can go only to O recipients. Plasma compatibility does not depend on the Rh factor."],
    ],
  },
];

const FIELD_IDS = ["field-mode-single", "field-mode-pair", "field-bloodType", "field-donor", "field-recipient"];
const ERROR_IDS = ["error-bloodType", "error-donor", "error-recipient"];

for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  const required = [
    `<html lang="${page.lang}">`,
    `<title>${page.title}</title>`,
    `<meta name="description" content="${page.description}">`,
    '<meta name="robots" content="noindex, nofollow">',
    `<h1>${page.h1}</h1>`,
    `href="${page.langLink}"`,
    `href="${page.home}"`,
    `href="${page.stylesheet}"`,
    `src="${page.script}"`,
    'id="lookup-form"',
    'id="status-line"',
    'id="action-run"',
    'id="action-example"',
    'id="action-reset"',
    'id="action-cancel"',
    'id="action-download"',
    'id="result-content"',
    'id="result-badges"',
    'id="single-results"',
    'id="pair-results"',
    page.draftNote,
    page.plasmaNote,
    page.disclaimer,
    ...page.faq.flat(),
    ...FIELD_IDS.map((id) => `id="${id}"`),
    ...ERROR_IDS.map((id) => `id="${id}"`),
  ];
  for (const needle of required) {
    if (!html.includes(needle)) fail(`${page.path} is missing: ${needle}`);
  }
  if (html.includes("canonical")) {
    fail(`${page.path}: candidate must not carry a canonical link`);
  }
}

const appSource = await readFile(resolve(PUBLIC_ROOT, "js/app.js"), "utf8");
for (const statusText of [
  "輸入已變更，請重新執行",
  "Input changed. Run again.",
  "處理中",
  "Working",
  "已取消，可重新執行",
  "Cancelled. You can run again.",
]) {
  if (!appSource.includes(statusText)) fail(`app.js is missing pinned status text: ${statusText}`);
}

const JS_FILES = [
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/blood.mjs",
  "public/js/worker-handler.mjs",
  "scripts/build.mjs",
  "scripts/check-generated.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "test/controller.test.mjs",
  "test/core.test.mjs",
  "test/report.test.mjs",
  "test/site.test.mjs",
];
for (const relativePath of JS_FILES) {
  await execFileAsync(process.execPath, ["--check", resolve(PROJECT_ROOT, relativePath)]);
}

const coreSource = await readFile(resolve(PUBLIC_ROOT, "js/core/blood.mjs"), "utf8");
const handlerSource = await readFile(resolve(PUBLIC_ROOT, "js/worker-handler.mjs"), "utf8");
{
  const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "blood-type-worker-"));
  try {
    const tempFile = join(dir, "worker.mjs");
    await writeFile(tempFile, `${coreSource}\n${handlerSource}`, "utf8");
    await execFileAsync(process.execPath, ["--check", tempFile]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Forbidden runtime capabilities, assembled from fragments so this file's
// own token list does not read as plain occurrences of them.
const FORBIDDEN_FRAGMENTS = [
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
];
// scripts/check.mjs itself is excluded from this scan: it assembles the
// tokens from fragments, so its own source necessarily contains the pieces.
const SCAN_FILES = JS_FILES.filter((relativePath) => relativePath !== "scripts/check.mjs");
for (const relativePath of SCAN_FILES) {
  const source = await readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
  for (const fragments of FORBIDDEN_FRAGMENTS) {
    const token = fragments.join("");
    if (source.toLowerCase().includes(token.toLowerCase())) {
      fail(`${relativePath} contains a forbidden capability token`);
    }
  }
}

for (const relativePath of [
  "public/js/core/blood.mjs",
  "public/js/controller.mjs",
  "public/js/worker-handler.mjs",
]) {
  const source = await readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
  for (const token of ["document", "window", "location", "navigator"]) {
    if (new RegExp(`\\b${token}\\b`).test(source)) {
      fail(`${relativePath} must stay free of browser globals (${token})`);
    }
  }
}

console.log(JSON.stringify({
  ok: true,
  check: "source",
  files: REQUIRED_PATHS.length,
  fixtures: {
    core: coreCases.length,
    controller: controllerCases.length,
    sha256: sha256(JSON.stringify(fixtures)),
  },
}));
