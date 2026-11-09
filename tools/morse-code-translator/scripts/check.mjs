// Static checks for the Morse Code Translator tool (no network, no browser).
// Verifies the file contract, bilingual page metadata, core purity (no DOM /
// network / storage), DOM safety (no innerHTML, no eval), and that every
// script parses. Exits non-zero on the first failing category.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
const fail = (msg) => failures.push(msg);

function read(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

// --- file contract ---
const required = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/core/table.mjs",
  "public/js/core/encode.mjs",
  "public/js/core/decode.mjs",
  "public/js/core/timing.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
];
for (const rel of required) {
  if (!existsSync(join(ROOT, rel))) fail(`missing required file: ${rel}`);
}

// --- package.json ---
const pkg = JSON.parse(read("package.json"));
if (pkg.type !== "module") fail("package.json must be ESM (type: module)");
if (!pkg.engines || !String(pkg.engines.node).includes("24")) fail("package.json engines must require Node >=24");
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json missing script: ${script}`);
}
const depCount =
  Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;
if (depCount !== 0) fail("package.json must have zero dependencies");

// --- bilingual page metadata ---
function checkPage(rel, langAttr, homeHref) {
  const html = read(rel);
  if (!html.includes(`<html lang="${langAttr}">`)) fail(`${rel}: wrong or missing lang="${langAttr}"`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${rel}: preview page must be noindex`);
  if (!/<title>.+<\/title>/.test(html)) fail(`${rel}: missing <title>`);
  if (!/<meta name="description" content=".+">/.test(html)) fail(`${rel}: missing meta description`);
  if (!/<h1>.+<\/h1>/.test(html)) fail(`${rel}: missing <h1>`);
  if (!html.includes('rel="canonical"')) fail(`${rel}: missing canonical`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"') || !html.includes('hreflang="x-default"')) {
    fail(`${rel}: missing hreflang cross-links (zh-Hant / en / x-default)`);
  }
  if (!html.includes(`href="${homeHref}"`)) fail(`${rel}: missing same-language home link ${homeHref}`);
  if (html.includes("http://") || html.includes("https://")) fail(`${rel}: remote URL found (must be fully local)`);
}
checkPage("public/index.html", "zh-Hant", "../../");
checkPage("public/en/index.html", "en", "../../en/");

// --- no remote resources anywhere under public/ ---
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}
for (const file of walk(join(ROOT, "public"))) {
  const text = readFileSync(file, "utf8");
  if (text.includes("http://") || text.includes("https://")) {
    fail(`remote URL in ${file.slice(ROOT.length + 1)}`);
  }
}

// --- core purity: no DOM / network / storage / timers ---
for (const rel of [
  "public/js/core/table.mjs",
  "public/js/core/encode.mjs",
  "public/js/core/decode.mjs",
  "public/js/core/timing.mjs",
]) {
  const src = read(rel);
  for (const banned of ["document", "window", "localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "navigator", "setTimeout", "setInterval"]) {
    if (src.includes(banned)) fail(`${rel}: core module must be pure, found "${banned}"`);
  }
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    if (!m[1].startsWith("./") && !m[1].startsWith("../")) {
      fail(`${rel}: core module has a non-relative import: ${m[1]}`);
    }
  }
}

// --- DOM safety in the app layer ---
const appSrc = read("public/js/app.js");
if (appSrc.includes("innerHTML")) fail("app.js must not use innerHTML");
if (appSrc.includes("eval(") || appSrc.includes("new Function")) fail("app.js must not use eval/Function");
if (!appSrc.includes("AudioContext")) fail("app.js should own the WebAudio playback");

// --- every JS file parses ---
const jsFiles = [
  ...walk(join(ROOT, "public")).filter((f) => f.endsWith(".js") || f.endsWith(".mjs")),
  ...walk(join(ROOT, "scripts")),
  ...walk(join(ROOT, "test")),
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch {
    fail(`syntax check failed: ${file.slice(ROOT.length + 1)}`);
  }
}

if (failures.length > 0) {
  for (const f of failures) console.error(`check FAIL — ${f}`);
  process.exit(1);
}
console.log(`check OK — file contract, bilingual metadata, core purity, DOM safety, syntax (${jsFiles.length} files)`);
