// Static checks for the Rent Budget Planner candidate: required files,
// package shape, JS syntax, forbidden sinks in shipped code, and the pinned
// bilingual page contract (lang, title, description, robots, FAQ).

import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/core/rent-budget.mjs",
  "public/js/core/controller.mjs",
  "public/js/core/messages.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/fixtures.json",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/report.test.mjs",
  "test/pages.test.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
];

async function readText(rel) {
  return readFile(join(PROJECT_ROOT, rel), "utf8");
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// Package shape.
let pkg;
try {
  pkg = JSON.parse(await readText("package.json"));
} catch {
  fail("package.json does not parse.");
}
if (pkg) {
  if (pkg.type !== "module") fail("package.json must set type=module.");
  if (pkg.engines?.node !== ">=24") fail("package.json engines.node must be >=24.");
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    fail("Runtime dependencies are not allowed.");
  }
  for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
    if (!pkg.scripts?.[script]) fail("package.json is missing script: " + script);
  }
}

// Required files.
for (const rel of REQUIRED_PATHS) {
  try {
    await readText(rel);
  } catch {
    fail("Missing required file: " + rel);
  }
}

// Syntax + forbidden sinks in shipped JS/CSS/HTML.
const FORBIDDEN = [
  "innerHTML",
  "outerHTML",
  "eval(",
  "new Function",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "localStorage",
  "sessionStorage",
  "document.write",
  "insertAdjacentHTML",
];
const publicFiles = await walk(join(PROJECT_ROOT, "public"));
for (const file of publicFiles) {
  const ext = extname(file);
  if (![".js", ".mjs", ".html", ".css"].includes(ext)) {
    fail("Unexpected file type under public/: " + file);
    continue;
  }
  const text = await readFile(file, "utf8");
  for (const token of FORBIDDEN) {
    if (text.includes(token)) fail("Forbidden token " + token + " in " + file);
  }
  if (ext === ".js" || ext === ".mjs") {
    const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (result.status !== 0) fail("Syntax check failed for " + file + ": " + result.stderr.trim());
  }
}
for (const rel of ["scripts/build.mjs", "scripts/check.mjs", "scripts/check-generated.mjs", "scripts/serve.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", join(PROJECT_ROOT, rel)], { encoding: "utf8" });
  if (result.status !== 0) fail("Syntax check failed for " + rel);
}

// Pinned page contract.
const PAGES = [
  {
    rel: "public/index.html",
    lang: "zh-Hant",
    title: "租屋預算規劃｜Gloss Tools",
    description:
      "用月收入與租金比例算出可負擔的租金上限，再把簽約搬入要準備的第一個月租金、押金與仲介費一次算清。",
    faq: ["直接用收入的三分之一，無條件捨去到整數元，不會超過比例。"],
  },
  {
    rel: "public/en/index.html",
    lang: "en",
    title: "Rent Budget Planner | Gloss Tools",
    description:
      "Work out the most rent you can afford from your monthly income and rent ratio, plus the full move-in cash: first month, deposit and agency fee.",
    faq: ["It takes exactly one third of income, rounded down to whole dollars so it never exceeds the ratio."],
  },
];
for (const page of PAGES) {
  let html = "";
  try {
    html = await readText(page.rel);
  } catch {
    continue;
  }
  if (!html.includes('<html lang="' + page.lang + '">')) fail(page.rel + ": wrong lang.");
  if (!html.includes("<title>" + page.title + "</title>")) fail(page.rel + ": wrong title.");
  if (!html.includes('content="' + page.description + '"')) fail(page.rel + ": wrong description.");
  if (!html.includes('content="noindex, nofollow"')) fail(page.rel + ": missing noindex robots meta.");
  if (html.includes('rel="canonical"')) fail(page.rel + ": preview must not carry a canonical link.");
  if (html.includes('http://') || html.includes('https://')) {
    fail(page.rel + ": preview must not reference absolute external URLs.");
  }
  for (const snippet of page.faq) {
    if (!html.includes(snippet)) fail(page.rel + ": missing pinned FAQ text.");
  }
}

if (failures.length > 0) {
  for (const message of failures) console.error("CHECK FAIL: " + message);
  process.exit(1);
}
console.log("check: all static checks passed.");
