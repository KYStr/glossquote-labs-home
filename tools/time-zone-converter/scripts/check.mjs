// Static project checks for the Time Zone Converter: required files,
// package contract, the SPEC-pinned rules that can be checked statically
// (zone list as data, provenance statement in both locales, preview
// metadata and links), core purity (no DOM/network/storage), and a
// forbidden-capability scan. Exits non-zero on the first failure list.

import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  "public/js/core/zones.mjs",
  "public/js/core/convert.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
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

// Zone list: exactly 40 pinned names and Intl-accepted (SPEC section 4).
const { ZONES } = await import(
  pathToFileURL(resolve(PROJECT_ROOT, "public/js/core/zones.mjs")).href
);
if (!Array.isArray(ZONES) || ZONES.length !== 40) {
  fail(`zones.mjs: expected exactly 40 zones, found ${ZONES?.length}`);
} else {
  if (new Set(ZONES).size !== 40) fail("zones.mjs: duplicate zone names");
  for (const zone of ZONES) {
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    } catch {
      fail(`zones.mjs: Intl rejects zone ${zone}`);
    }
  }
}

// Page checks: language, preview metadata, canonical/hreflang, home link,
// local asset references, and the SPEC section 5 provenance statement.
const PAGES = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    home: 'href="../../"',
    provenance: "時區資料庫",
    assets: ['href="./styles/app.css"', 'src="./js/app.js"'],
  },
  {
    path: "public/en/index.html",
    lang: "en",
    home: 'href="../../../en/"',
    provenance: "time-zone database built into your browser/device",
    assets: ['href="../styles/app.css"', 'src="../js/app.js"'],
  },
];
for (const page of PAGES) {
  const html = await readFile(resolve(PROJECT_ROOT, page.path), "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: lang must be ${page.lang}`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.path}: missing preview noindex`);
  if (!html.includes('<link rel="canonical"')) fail(`${page.path}: missing canonical`);
  for (const hreflang of ["zh-Hant", "en", "x-default"]) {
    if (!html.includes(`hreflang="${hreflang}"`)) fail(`${page.path}: missing hreflang ${hreflang}`);
  }
  if (!html.includes(page.home)) fail(`${page.path}: missing same-language home link`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${page.path}: missing title`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) fail(`${page.path}: missing description`);
  if (!/<h1>[^<]+<\/h1>/.test(html)) fail(`${page.path}: missing h1`);
  if (!html.includes(page.provenance)) fail(`${page.path}: missing provenance statement`);
  for (const asset of page.assets) {
    if (!html.includes(asset)) fail(`${page.path}: missing asset reference ${asset}`);
  }
}

// Forbidden-capability scan over the shipped sources and tests.
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

// Core purity: no DOM access in the pure modules.
for (const corePath of ["public/js/core/zones.mjs", "public/js/core/convert.mjs"]) {
  const text = await readFile(resolve(PROJECT_ROOT, corePath), "utf8");
  for (const token of ["document", "window", "location", "navigator"]) {
    if (new RegExp(`\\b${token}\\b`).test(text)) {
      fail(`${corePath}: core module must not reference ${token}`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Check failed with ${failures.length} problem(s):`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}
console.log("Check passed: files, package contract, zone list, pages, provenance, capability scan, core purity");
