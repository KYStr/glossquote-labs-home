// Static checks for the Parking Fee Calculator candidate: zero runtime
// dependencies, allowlisted files only, no dangerous sinks or network /
// storage APIs in product code, no external asset references, and the
// pinned static page requirements (lang, title, noindex, hreflang, CSP).

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

async function listFiles(dir, rel = "") {
  const out = [];
  const items = await readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const r = rel === "" ? item.name : rel + "/" + item.name;
    if (item.isDirectory()) out.push(...(await listFiles(path.join(dir, item.name), r)));
    else out.push(r);
  }
  return out;
}

// package.json: ESM, Node >= 24, zero dependencies, pinned scripts.
const pkg = JSON.parse(await readFile(path.join(TOOL_DIR, "package.json"), "utf8"));
if (pkg.type !== "module") fail("package.json type must be module");
if (!pkg.engines || pkg.engines.node !== ">=24") fail("package.json engines.node must be >=24");
for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) fail("package.json must have zero " + key);
}
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts || typeof pkg.scripts[script] !== "string") fail("missing script " + script);
}

// Allowlist of shipped source files.
const ALLOWED = new Set([
  "package.json",
  "HANDOFF.md",
  "VERIFICATION.md",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/messages.mjs",
  "public/js/core/parking.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "test/build.test.mjs",
  "test/controller.test.mjs",
  "test/core.test.mjs",
  "test/fixtures.json",
  "test/html.test.mjs",
  "test/report.test.mjs",
  "test/serve.test.mjs"
]);
const present = new Set([
  ...(await listFiles(path.join(TOOL_DIR, "public"), "public")),
  ...(await listFiles(path.join(TOOL_DIR, "scripts"), "scripts")),
  ...(await listFiles(path.join(TOOL_DIR, "test"), "test")),
  "package.json",
  "HANDOFF.md",
  "VERIFICATION.md"
]);
for (const file of present) {
  if (!ALLOWED.has(file)) fail("file outside allowlist: " + file);
}
for (const file of ALLOWED) {
  if (!present.has(file)) fail("missing allowlisted file: " + file);
}

// Dangerous sinks / forbidden capabilities in product code.
const FORBIDDEN = [
  "innerHTML",
  "outerHTML",
  "document.write",
  "eval(",
  "new Function",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "sendBeacon",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "serviceWorker",
  "import("
];
const productFiles = [
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/messages.mjs",
  "public/js/core/parking.mjs"
];
for (const file of productFiles) {
  const text = await readFile(path.join(TOOL_DIR, file), "utf8");
  for (const token of FORBIDDEN) {
    if (text.includes(token)) fail(file + " contains forbidden token: " + token);
  }
}

// HTML requirements.
async function checkHtml(file, lang, title) {
  const html = await readFile(path.join(TOOL_DIR, file), "utf8");
  if (!html.includes('<html lang="' + lang + '">')) fail(file + " lang mismatch");
  if (!html.includes("<title>" + title + "</title>")) fail(file + " title mismatch");
  if (!html.includes('content="noindex,nofollow"')) fail(file + " missing noindex robots meta");
  if (!html.includes("Content-Security-Policy")) fail(file + " missing CSP meta");
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) fail(file + " missing hreflang pair");
  if (/src="https?:|href="https?:/.test(html)) fail(file + " references an external asset");
  if (html.includes("innerHTML")) fail(file + " mentions innerHTML");
  return html;
}
await checkHtml("public/index.html", "zh-Hant", "停車費計算機｜Gloss Tools");
await checkHtml("public/en/index.html", "en", "Parking Fee Calculator | Gloss Tools");

// CSS: no external URLs.
const css = await readFile(path.join(TOOL_DIR, "public/styles/app.css"), "utf8");
if (/url\(\s*["']?https?:/.test(css)) fail("app.css references an external URL");
if (css.includes("@import")) fail("app.css must not use @import");

if (failures.length > 0) {
  for (const f of failures) console.error("check FAIL: " + f);
  process.exit(1);
}
console.log("check PASS — static contract, allowlist, sinks, and page requirements OK");
