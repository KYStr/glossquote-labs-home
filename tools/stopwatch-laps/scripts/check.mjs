// Static checks for the stopwatch tool: file contract, package rules,
// core purity (no DOM/network/storage/clock reads), app-layer safety
// (textContent only, no eval), and page metadata (lang, noindex,
// canonical, hreflang, no external resources).

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
const fail = (msg) => failures.push(msg);

async function read(rel) {
  try {
    return await readFile(resolve(PROJECT_ROOT, rel), "utf8");
  } catch {
    fail(`missing file: ${rel}`);
    return "";
  }
}

async function mustExist(rel) {
  try {
    const info = await stat(resolve(PROJECT_ROOT, rel));
    if (!info.isFile()) fail(`not a file: ${rel}`);
  } catch {
    fail(`missing file: ${rel}`);
  }
}

for (const rel of [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/core/stopwatch.mjs",
  "public/js/core/format.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
]) {
  await mustExist(rel);
}

// package.json rules
const pkg = JSON.parse((await read("package.json")) || "{}");
if (pkg.type !== "module") fail("package.json: type must be module");
if (!pkg.engines || pkg.engines.node !== ">=24") fail("package.json: engines.node must be >=24");
for (const field of ["dependencies", "devDependencies"]) {
  if (pkg[field] && Object.keys(pkg[field]).length > 0) {
    fail(`package.json: ${field} must be empty (zero dependencies)`);
  }
}
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json: missing script ${script}`);
}

// core purity: the core must be a pure state machine over injected
// timestamps — no DOM, network, storage, or clock of its own.
const FORBIDDEN_CORE = [
  "document",
  "window",
  "fetch(",
  "XMLHttpRequest",
  "localStorage",
  "sessionStorage",
  "Date.now",
  "new Date",
  "performance",
  "eval(",
  "Function(",
  "import(",
];
for (const rel of ["public/js/core/stopwatch.mjs", "public/js/core/format.mjs"]) {
  const src = await read(rel);
  for (const token of FORBIDDEN_CORE) {
    if (src.includes(token)) fail(`${rel}: forbidden token in core: ${token}`);
  }
}
const core = await read("public/js/core/stopwatch.mjs");
if (!/MAX_LAPS\s*=\s*500/.test(core)) fail("core: MAX_LAPS must be the single constant 500");

// app layer: textContent only, no HTML injection, no eval.
const app = await read("public/js/app.js");
for (const token of ["innerHTML", "outerHTML", "eval(", "Function(", "document.write"]) {
  if (app.includes(token)) fail(`app.js: forbidden token: ${token}`);
}
if (!app.includes("performance.now")) fail("app.js: clock reads must live in the app layer");

// pages: metadata and locality
const pages = [
  { rel: "public/index.html", lang: "zh-Hant", other: "en/index.html" },
  { rel: "public/en/index.html", lang: "en", other: "../index.html" },
];
for (const page of pages) {
  const html = await read(page.rel);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.rel}: wrong lang`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.rel}: preview must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${page.rel}: missing canonical`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) {
    fail(`${page.rel}: missing hreflang cross-links`);
  }
  if (!html.includes('hreflang="x-default"')) fail(`${page.rel}: missing hreflang x-default`);
  if (!html.includes("<title>") || !html.includes('name="description"')) {
    fail(`${page.rel}: missing title/description`);
  }
  if (!html.includes("<h1>")) fail(`${page.rel}: missing h1`);
  if (!html.includes('href="../../')) fail(`${page.rel}: missing home link at ../../`);
  const external = /(?:src|href)\s*=\s*"https?:\/\//.test(html);
  if (external) fail(`${page.rel}: external resource reference found`);
  if (/<script(?![^>]*src=)/.test(html)) fail(`${page.rel}: inline script found`);
}

if (failures.length > 0) {
  console.error("check FAIL");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log("check PASS");
