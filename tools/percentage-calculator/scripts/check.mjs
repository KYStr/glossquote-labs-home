// Static checks: JS syntax, zero-dependency manifest, forbidden sinks in
// shipped JS, required page metadata, and fixture coverage. Local files
// only; no network. Exit 1 on the first failing group with a message.

import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failures = 0;
function fail(message) {
  failures += 1;
  console.error(`check: ${message}`);
}

async function listFiles(dir, suffixes) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path, suffixes)));
    else if (suffixes.some((s) => entry.name.endsWith(s))) out.push(path);
  }
  return out;
}

// 1. Manifest: ESM, Node >= 24, zero dependencies.
const pkg = JSON.parse(await readFile(join(toolDir, "package.json"), "utf8"));
if (pkg.type !== "module") fail("package.json type must be module");
if (!pkg.engines || !String(pkg.engines.node).includes("24")) {
  fail("package.json engines.node must require Node 24");
}
for (const key of ["dependencies", "devDependencies", "peerDependencies"]) {
  if (pkg[key] && Object.keys(pkg[key]).length > 0) {
    fail(`package.json must not declare ${key}`);
  }
}
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts || !pkg.scripts[script]) fail(`package.json missing script ${script}`);
}

// 2. Syntax of every shipped/test JS file.
const jsFiles = [
  ...(await listFiles(join(toolDir, "public"), [".js", ".mjs"])),
  ...(await listFiles(join(toolDir, "scripts"), [".mjs"])),
  ...(await listFiles(join(toolDir, "test"), [".mjs"])),
];
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch {
    fail(`syntax error in ${file}`);
  }
}

// 3. Forbidden sinks / capabilities in shipped JS.
const forbidden = [
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
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
  "import(",
];
for (const file of await listFiles(join(toolDir, "public"), [".js", ".mjs"])) {
  const text = await readFile(file, "utf8");
  for (const pattern of forbidden) {
    if (text.includes(pattern)) fail(`${file} contains forbidden ${pattern}`);
  }
}

// 4. Worker source token appears exactly once in the app source.
const appSource = await readFile(join(toolDir, "public/js/app.js"), "utf8");
const tokenCount = appSource.split("__WORKER_SOURCE__").length - 1;
if (tokenCount !== 1) fail(`app.js must contain __WORKER_SOURCE__ exactly once (found ${tokenCount})`);

// 5. Pages: lang, title, description, robots noindex, no external assets.
const pages = [
  { path: join(toolDir, "public/index.html"), lang: "zh-Hant", title: "百分比計算機｜Gloss Tools" },
  { path: join(toolDir, "public/en/index.html"), lang: "en", title: "Percentage Calculator | Gloss Tools" },
];
for (const page of pages) {
  const html = await readFile(page.path, "utf8");
  if (!html.includes(`<html lang="${page.lang}">`)) fail(`${page.path}: wrong lang`);
  if (!html.includes(`<title>${page.title}</title>`)) fail(`${page.path}: wrong title`);
  if (!html.includes('name="robots" content="noindex, nofollow"')) {
    fail(`${page.path}: missing robots noindex`);
  }
  if (html.includes('rel="canonical"') || html.includes("hreflang=\"zh-Hant\"") && html.includes('rel="alternate"')) {
    fail(`${page.path}: candidate must not carry production canonical/hreflang`);
  }
  if (/src="https?:|href="https?:/.test(html)) fail(`${page.path}: external asset reference`);
}

// 6. Fixture coverage: 21 core + 3 controller cases.
const fixtures = JSON.parse(await readFile(join(toolDir, "test/fixtures.json"), "utf8"));
const core = fixtures.cases.filter((c) => c.kind === "core");
const controller = fixtures.cases.filter((c) => c.kind === "controller");
if (core.length !== 21) fail(`fixtures: expected 21 core cases, found ${core.length}`);
if (controller.length !== 3) fail(`fixtures: expected 3 controller cases, found ${controller.length}`);

if (failures > 0) {
  console.error(`check: ${failures} failure(s)`);
  process.exit(1);
}
console.log("check: all static checks passed");
