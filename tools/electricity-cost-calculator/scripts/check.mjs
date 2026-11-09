// Static project checks: file contract, package contract, forbidden
// runtime capabilities, core purity (no DOM access), and per-page SEO /
// i18n scaffolding. Exits non-zero and prints every problem found.
import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const problems = [];
const fail = (message) => problems.push(message);

const REQUIRED_FILES = [
  "package.json",
  "HANDOFF.md",
  "VERIFICATION.md",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/core/data.mjs",
  "public/js/core/calculator.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
];

for (const file of REQUIRED_FILES) {
  const info = await stat(join(PROJECT_ROOT, file)).catch(() => null);
  if (!info?.isFile()) fail(`missing required file: ${file}`);
}

// Package contract.
const pkg = JSON.parse(await readFile(join(PROJECT_ROOT, "package.json"), "utf8"));
if (pkg.type !== "module") fail("package.json: type must be module");
if (pkg.engines?.node !== ">=24") fail("package.json: engines.node must be >=24");
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts?.[script]) fail(`package.json: missing script ${script}`);
}
if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
  fail("package.json: runtime dependencies are not allowed");
}

// Forbidden capabilities in shipped public files, assembled from fragments
// so this checker does not match its own scan list when copied around.
const forbidden = [
  ["inner", "HTML"],
  ["outer", "HTML"],
  ["insertAdjacent", "HTML"],
  ["local", "Storage"],
  ["session", "Storage"],
  ["indexed", "DB"],
  ["document.", "cookie"],
  ["document.", "write"],
  ["ev", "al("],
  ["new ", "Function"],
  ["fet", "ch("],
  ["XML", "HttpRequest"],
  ["Web", "Socket"],
  ["Event", "Source"],
  ["send", "Beacon"],
  ["http", "://"],
  ["https", "://"],
].map((parts) => parts.join(""));

const publicFiles = await listFiles(join(PROJECT_ROOT, "public"));
for (const file of publicFiles) {
  const text = await readFile(join(PROJECT_ROOT, "public", file), "utf8");
  for (const token of forbidden) {
    if (text.includes(token)) fail(`public/${file}: forbidden token ${token}`);
  }
}

// Core purity: the core modules must not reach for DOM or host globals.
for (const coreFile of ["public/js/core/data.mjs", "public/js/core/calculator.mjs"]) {
  const text = await readFile(join(PROJECT_ROOT, coreFile), "utf8");
  for (const token of ["document", "window", "globalThis", "location", "navigator"]) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${coreFile}: core must not reference ${token}`);
    }
  }
}

// Per-page scaffolding.
const pages = [
  { path: "public/index.html", lang: "zh-Hant", home: 'href="../../"', self: 'href="./"', other: 'href="./en/"' },
  { path: "public/en/index.html", lang: "en", home: 'href="../../en/"', self: 'href="./"', other: 'href="../"' },
];
for (const page of pages) {
  const html = await readFile(join(PROJECT_ROOT, page.path), "utf8");
  const expectations = [
    [`<html lang="${page.lang}">`, "lang attribute"],
    ["<title>", "title"],
    ['name="description"', "meta description"],
    ['content="noindex, nofollow"', "preview noindex"],
    ['rel="canonical"', "canonical link"],
    ['hreflang="zh-Hant"', "hreflang zh-Hant"],
    ['hreflang="en"', "hreflang en"],
    ['hreflang="x-default"', "hreflang x-default"],
    [page.home, "same-language homepage link"],
    ['id="page-title"', "h1"],
    ['type="module"', "module script"],
  ];
  for (const [needle, label] of expectations) {
    if (!html.includes(needle)) fail(`${page.path}: missing ${label} (${needle})`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`check: ${problem}`);
  process.exit(1);
}
console.log(`check: all static checks passed (${REQUIRED_FILES.length} required files, ${publicFiles.length} public files).`);
