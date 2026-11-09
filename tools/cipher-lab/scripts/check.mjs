// Static checks for the cipher-lab tool: required files, zero dependencies,
// no external resources, no unsafe DOM sinks, and a pure core module.
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const fail = (message) => problems.push(message);

async function readRequired(relativePath) {
  try {
    return await readFile(join(root, relativePath), "utf8");
  } catch {
    fail(`missing required file: ${relativePath}`);
    return "";
  }
}

const pkg = JSON.parse(await readRequired("package.json"));
if (pkg.type !== "module") fail("package.json must be ESM (type: module)");
if (!String(pkg.engines?.node ?? "").includes("24")) fail("package.json engines must require Node >=24");
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
if (Object.keys(deps).length > 0) fail("package.json must have zero dependencies");
for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
  if (!pkg.scripts?.[script]) fail(`package.json missing script: ${script}`);
}

const htmlFiles = ["public/index.html", "public/en/index.html"];
for (const file of htmlFiles) {
  const html = await readRequired(file);
  if (!html.includes('content="noindex, nofollow"')) fail(`${file}: missing noindex`);
  if (!html.includes('hreflang="en"') || !html.includes('hreflang="zh-Hant"')) {
    fail(`${file}: missing hreflang cross-links`);
  }
  if (!html.includes('class="banner"')) fail(`${file}: missing educational banner`);
  if (/(?:src|href)="https?:\/\//.test(html)) fail(`${file}: external resource reference found`);
}

const app = await readRequired("public/js/app.js");
if (app.includes("innerHTML")) fail("app.js must not use innerHTML");
if (/\b(fetch|XMLHttpRequest|localStorage|sessionStorage)\b/.test(app)) {
  fail("app.js must not use network or storage APIs");
}

const core = await readRequired("public/js/core/cipher.mjs");
if (/\b(document|window|fetch|localStorage|sessionStorage|navigator)\b/.test(core)) {
  fail("core/cipher.mjs must stay pure (no DOM, network or storage)");
}

await readRequired("public/styles/app.css");
await readRequired("scripts/build.mjs");
await readRequired("scripts/serve.mjs");
await readRequired("HANDOFF.md");

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check ok");
