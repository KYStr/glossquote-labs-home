// Static checks for the Video File Size Calculator source tree.
// Verifies: file inventory, both pages' metadata and required content,
// local relative references, script export references, CSS token use,
// and that no executable content appears in dist-preview beyond the
// pinned script/style MIME types. Exits non-zero on any failure.

import { readdir, readFile, stat } from "node:fs/promises";
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
  "public/js/core/video-size.mjs",
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
if (fixtures.slug !== "video-file-size-calculator") fail("fixtures slug must be video-file-size-calculator");
if (fixtures.specId !== "spec-video-file-size-calculator-20261109") {
  fail("fixtures specId must be spec-video-file-size-calculator-20261109");
}
if (!Array.isArray(fixtures.cases) || fixtures.cases.length < 6) {
  fail("fixtures must contain at least 6 cases");
}

const pages = [
  {
    rel: "public/index.html",
    lang: "zh-Hant",
    title: "影片檔案大小估算｜Gloss Tools",
    heading: "影片檔案大小估算",
    description:
      "依片長、解析度預設位元率或自訂位元率、編碼係數與音訊位元率估算影片檔案大小，GB 與 GiB 並列顯示，也可反推指定容量最長可錄多久。",
    required: [
      "預設位元率與編碼係數是常見經驗值；實際檔案大小會依畫面內容、編碼器設定與容器而不同。",
      "檔案大小 =（視訊位元率 × 編碼係數 + 音訊位元率）× 片長秒數 ÷ 8",
      "估出來為什麼和實際檔案不一樣？",
      "GB 和 GiB 差在哪？",
      "不到 1 秒",
      "切換語言或離開頁面會失去目前草稿。",
      'href="./en/index.html"',
      'href="../../"',
      ">回首頁<",
      '"0:10:00"',
      '"64"',
      "typical H.264 values",
    ],
  },
  {
    rel: "public/en/index.html",
    lang: "en",
    title: "Video File Size Calculator | Gloss Tools",
    heading: "Video File Size Calculator",
    description:
      "Estimate a video file size from duration, a resolution preset or custom bitrate, a codec factor and audio bitrate — GB and GiB side by side — or invert it: the longest recording that fits a target size.",
    required: [
      "Preset bitrates and codec factors are common rules of thumb; actual file size varies with picture content, encoder settings and container.",
      "File size = (video bitrate × codec factor + audio bitrate) × duration in seconds ÷ 8",
      "Why does the estimate differ from my real file?",
      "What is the difference between GB and GiB?",
      "Less than 1 second",
      "Switching language or leaving this page discards the current draft.",
      'href="../index.html"',
      'href="../../en/"',
      ">Home<",
      '"0:10:00"',
      '"64"',
      "typical H.264 values",
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
  if (!html.includes('id="video-form"')) fail(`${page.rel}: missing pinned form id video-form`);
  for (const fragment of [
    'name="mode"',
    'value="size"',
    'value="duration"',
    'id="field-duration"',
    'name="bitrateSource"',
    'value="preset"',
    'value="custom"',
    'id="field-preset"',
    'value="2160p60"',
    'value="2160p30"',
    'value="1080p60"',
    'value="1080p30"',
    'value="720p30"',
    'value="480p30"',
    'id="field-customBitrateMbps"',
    'id="field-codec"',
    'value="h264"',
    'value="h265"',
    'value="av1"',
    'value="prores422"',
    'id="field-audioKbps"',
    'value="320"',
    'id="field-targetSize"',
    'id="field-targetUnit"',
    'value="MiB"',
    'value="GiB"',
    'id="status"',
    'id="results"',
    'id="zero-note"',
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
if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/.test(appJs)) {
  fail("app.js contains a forbidden API or sink");
}
const coreJs = await readFile(path.join(toolRoot, "public/js/core/video-size.mjs"), "utf8");
if (/fetch\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|document\.|window\./.test(coreJs)) {
  fail("core module must stay free of DOM/network/storage APIs");
}
for (const token of ["export function run", "export function buildReport", "2160p60", "prores422"]) {
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
        for (const snippet of ["function run", "self.onmessage", "2160p60"]) {
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
