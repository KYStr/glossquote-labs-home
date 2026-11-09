// Static checks for the barcode-generator tool: file contract, bilingual
// page requirements, and the privacy/security floor (no network, no
// storage, no HTML injection sinks, pure core modules).
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
const fail = (msg) => failures.push(msg);

async function read(rel) {
  try {
    return await readFile(join(PROJECT_ROOT, rel), "utf8");
  } catch {
    fail(`missing file: ${rel}`);
    return "";
  }
}

async function listFiles(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

// ---- file contract
for (const rel of [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/core/barcode.mjs",
  "public/js/core/code128-patterns.mjs",
  "public/js/core/ean-patterns.mjs",
  "public/styles/main.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
]) {
  await read(rel);
}

const pkg = JSON.parse(await read("package.json"));
if (pkg.type !== "module") fail("package.json must be ESM");
if (Object.keys(pkg.dependencies ?? {}).length > 0) fail("runtime dependencies must be zero");
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts?.[script]) fail(`package.json missing script: ${script}`);
}

// ---- bilingual pages
const pages = [
  { rel: "public/index.html", lang: "zh-Hant", other: 'href="en/"' },
  { rel: "public/en/index.html", lang: "en", other: 'href="../"' },
];
for (const page of pages) {
  const html = await read(page.rel);
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.rel}: wrong lang`);
  if (!html.includes("<title>")) fail(`${page.rel}: missing title`);
  if (!html.includes('name="description"')) fail(`${page.rel}: missing description`);
  if (!html.includes("<h1>")) fail(`${page.rel}: missing h1`);
  if (!html.includes('content="noindex, nofollow"')) fail(`${page.rel}: preview must be noindex`);
  if (!html.includes('rel="canonical"')) fail(`${page.rel}: missing canonical`);
  if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) {
    fail(`${page.rel}: missing hreflang cross-links`);
  }
  if (!html.includes(page.other)) fail(`${page.rel}: missing link to the other language`);
  if (/(?:src|href)="https?:\/\//.test(html)) fail(`${page.rel}: remote resource reference`);
}

// ---- privacy / security floor over all shipped code
const publicFiles = await listFiles(join(PROJECT_ROOT, "public"));
for (const file of publicFiles) {
  const rel = file.slice(PROJECT_ROOT.length + 1);
  const text = await readFile(file, "utf8");
  if (/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(text)) fail(`${rel}: network API used`);
  if (/localStorage|sessionStorage|indexedDB|document\.cookie/.test(text)) fail(`${rel}: storage API used`);
  if (/\.innerHTML\s*=|insertAdjacentHTML|document\.write|eval\s*\(|new Function/.test(text)) {
    fail(`${rel}: HTML injection sink or eval used`);
  }
  if (rel.startsWith("public/js/core/")) {
    if (/\bdocument\b|\bwindow\b/.test(text)) fail(`${rel}: core module touches the DOM`);
  }
}

if (failures.length > 0) {
  console.error(`check FAILED with ${failures.length} problem(s):`);
  for (const f of failures) console.error(` - ${f}`);
  process.exit(1);
}
console.log("check: all static checks passed");
