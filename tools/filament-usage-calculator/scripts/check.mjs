// Static checks for the Filament Usage Calculator source tree.
// Verifies: file inventory, both pages' metadata and required content,
// local relative references, script export references, CSS token use,
// and that no executable content appears in dist-preview beyond the
// pinned script/style MIME types. Exits non-zero on any failure.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
    } else {
      files.push(`${prefix}${entry.name}`);
    }
  }
  return files;
}

const EXPECTED_FILES = [
  "public/en/index.html",
  "public/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/filament.mjs",
  "public/js/worker-handler.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/controller.test.mjs",
  "test/core.test.mjs",
  "test/fixtures.json",
];

const actualFiles = (await listFiles(toolRoot)).filter(
  (name) =>
    !name.startsWith("dist-preview/") &&
    name !== "BUILD-MANIFEST.json" &&
    name !== "HANDOFF.md" &&
    name !== "VERIFICATION.md",
);
for (const expected of EXPECTED_FILES) {
  if (!actualFiles.includes(expected)) fail(`missing expected file: ${expected}`);
}
const UNEXPECTED_FILES = ["src/", "public/favicon", ".ico", ".png", "fonts/"];
for (const actual of actualFiles) {
  if (UNEXPECTED_FILES.some((mark) => actual.includes(mark))) {
    fail(`unexpected deployment-shaped file present: ${actual}`);
  }
}

const packageJson = JSON.parse(await readFile(path.join(toolRoot, "package.json"), "utf8"));
if (packageJson.type !== "module") fail("package.json type must be module");
if (packageJson.engines?.node !== ">=24") fail("package.json engines.node must be >=24");
if (Object.keys(packageJson.dependencies ?? {}).length !== 0) {
  fail("package.json dependencies must be empty");
}
if (packageJson.devDependencies !== undefined) fail("package.json must not have devDependencies");
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!packageJson.scripts?.[script]) fail(`package.json missing script: ${script}`);
}

const fixturesText = await readFile(path.join(toolRoot, "test/fixtures.json"), "utf8");
const fixtures = JSON.parse(fixturesText);
if (fixtures.slug !== "filament-usage-calculator") {
  fail("fixtures slug must be filament-usage-calculator");
}
if (fixtures.specId !== "spec-filament-usage-calculator-20261109") {
  fail("fixtures specId must be spec-filament-usage-calculator-20261109");
}
if (!Array.isArray(fixtures.cases) || fixtures.cases.length < 6) {
  fail("fixtures must contain at least 6 cases");
}

const pages = [
  {
    rel: "public/index.html",
    lang: "zh-Hant",
    title: "3D 列印線材用量換算｜Gloss Tools",
    heading: "3D 列印線材用量換算",
    description:
      "依線徑與材料密度，把 3D 列印線材的長度換算成重量、重量換算回長度，並估算線軸剩餘量與單次列印的線材成本。",
    required: [
      "密度為各材料的常見標稱值，實際線材會因品牌與配方不同而略有差異；結果供備料與估算參考。",
      "每公尺重量 = 截面積（π × 半徑²）× 材料密度",
      "為什麼切片軟體的重量和這裡不同？",
      "空軸重怎麼量？",
      "切換語言或離開頁面會失去目前草稿。",
      'href="./en/index.html"',
      'href="../../"',
      ">回首頁<",
      '"100"',
      '"850"',
    ],
  },
  {
    rel: "public/en/index.html",
    lang: "en",
    title: "Filament Usage Calculator | Gloss Tools",
    heading: "Filament Usage Calculator",
    description:
      "Convert 3D-printing filament length to weight and back by diameter and material density, estimate what is left on a spool, and price a print's filament.",
    required: [
      "Densities are common nominal values; actual filament varies by brand and blend. Treat results as planning estimates.",
      "Weight per metre = cross-section (π × radius²) × material density",
      "Why does my slicer's weight differ?",
      "How do I get the empty spool weight?",
      "Switching language or leaving this page discards the current draft.",
      'href="../index.html"',
      'href="../../en/"',
      ">Home<",
      '"100"',
      '"850"',
    ],
  },
];

for (const page of pages) {
  const html = await readFile(path.join(toolRoot, page.rel), "utf8");
  if (!html.startsWith("<!doctype html>")) fail(`${page.rel}: missing doctype`);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.rel}: wrong html lang`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.rel}: wrong title`);
  if (!html.includes(`<h1>${page.heading}</h1>`)) fail(`${page.rel}: wrong h1`);
  if (!html.includes(`content="${page.description}"`)) fail(`${page.rel}: wrong description meta`);
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
    fail(`${page.rel}: missing noindex robots meta`);
  }
  if (html.includes("canonical") || html.includes("hreflang") || html.includes("og:")) {
    fail(`${page.rel}: preview must not carry canonical/hreflang/Open Graph metadata`);
  }
  if (!html.includes('id="filament-form"')) fail(`${page.rel}: missing pinned form id filament-form`);
  for (const fragment of [
    'name="mode"',
    'value="length"',
    'value="weight"',
    'value="spool"',
    'value="cost"',
    'id="field-diameter-175"',
    'value="2.85"',
    'id="field-material"',
    'value="pla"',
    'value="petg"',
    'value="abs"',
    'value="tpu"',
    'value="asa"',
    'value="pc"',
    'id="field-lengthM"',
    'id="field-weightG"',
    'id="field-grossWeightG"',
    'id="field-emptySpoolPreset"',
    'value="140"',
    'value="250"',
    'value="custom"',
    'id="field-emptySpoolCustomG"',
    'id="field-spoolPrice"',
    'id="field-spoolNetWeightG"',
    'id="field-usageG"',
    'id="field-currency"',
    'value="TWD"',
    'value="JPY"',
    'id="status"',
    'id="results"',
    'id="detail-rows"',
    'id="run-btn"',
    'id="example-btn"',
    'id="reset-btn"',
    'id="cancel-btn"',
    'id="download-btn"',
    'role="status"',
    'aria-live="polite"',
    'aria-busy="false"',
    'role="region"',
    'tabindex="0"',
  ]) {
    if (!html.includes(fragment)) fail(`${page.rel}: missing required fragment ${fragment}`);
  }
  for (const text of page.required) {
    if (!html.includes(text)) fail(`${page.rel}: missing required text: ${text.slice(0, 60)}`);
  }
  const scriptTags = html.match(/<script\b[^>]*>/g) ?? [];
  for (const tag of scriptTags) {
    if (!tag.includes('type="module"')) fail(`${page.rel}: script without type=module: ${tag}`);
  }
  const references = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(https?:)?\/\//.test(reference) || reference.startsWith("/")) {
      fail(`${page.rel}: non-relative reference: ${reference}`);
    }
  }
}

const appJs = await readFile(path.join(toolRoot, "public/js/app.js"), "utf8");
for (const token of ["createController", "buildReport", "WORKER_SOURCE", "textContent", "pagehide"]) {
  if (!appJs.includes(token)) fail(`app.js missing token: ${token}`);
}
// The pinned flow status strings live in the app's bilingual string
// table (only the initial empty status is static HTML).
for (const token of [
  "輸入已變更，請重新執行",
  "已取消，可重新執行",
  "處理中",
  "Input changed. Run again.",
  "Cancelled. You can run again.",
  "Working",
]) {
  if (!appJs.includes(token)) fail(`app.js missing pinned status string: ${token}`);
}
// The SPEC's pinned bilingual error messages must appear verbatim.
for (const token of [
  "資料格式不正確。",
  "總重小於空軸重，請確認秤重與空軸設定。",
  "The data format is invalid.",
  "Gross weight is less than the empty spool weight. Check the scale reading and spool setting.",
]) {
  if (!appJs.includes(token)) fail(`app.js missing pinned SPEC error string: ${token}`);
}
if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/.test(appJs)) {
  fail("app.js contains a forbidden API or sink");
}
const coreJs = await readFile(path.join(toolRoot, "public/js/core/filament.mjs"), "utf8");
if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|window\./.test(coreJs)) {
  fail("core module must stay free of DOM/network/storage APIs");
}
for (const token of ["export function run", "export function buildReport", "NEGATIVE_REMAINING", "petg"]) {
  if (!coreJs.includes(token)) fail(`core module missing token: ${token}`);
}
const css = await readFile(path.join(toolRoot, "public/styles/app.css"), "utf8");
for (const token of ["--gq-color-paper", "--gq-color-ink", "--gq-color-acid", "min-height: 2.75rem", "@media (prefers-reduced-motion: reduce)"]) {
  if (!css.includes(token)) fail(`app.css missing design token: ${token}`);
}
if (/@import|url\(/.test(css)) fail("app.css must not import or reference external resources");

try {
  const distFiles = await listFiles(path.join(toolRoot, "dist-preview"));
  const allowedExtensions = [".html", ".css", ".js", ".mjs", ".json"];
  for (const name of distFiles) {
    const extension = path.extname(name);
    if (!allowedExtensions.includes(extension)) {
      fail(`dist-preview contains a disallowed file type: ${name}`);
    }
    if (name === "js/worker-source.js") {
      const generated = await readFile(path.join(toolRoot, "dist-preview", name), "utf8");
      const match = generated.match(/export const WORKER_SOURCE = ("(?:[^"\\]|\\.)*");/);
      if (!match) fail("worker-source.js does not export WORKER_SOURCE as a JSON string");
      else {
        const embedded = JSON.parse(match[1]);
        for (const snippet of ["function run", "self.onmessage", "NEGATIVE_REMAINING"]) {
          if (!embedded.includes(snippet)) {
            fail(`embedded worker source missing snippet: ${snippet}`);
          }
        }
      }
    }
  }
} catch {
  fail("dist-preview does not exist; run npm run build:preview first");
}

const manifestPath = path.join(toolRoot, "BUILD-MANIFEST.json");
try {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    fail("BUILD-MANIFEST.json must list built files");
  }
} catch {
  fail("BUILD-MANIFEST.json missing or invalid; run npm run build:preview first");
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`check: ${failure}`);
  process.exit(1);
}
console.log("check: all static checks passed");
