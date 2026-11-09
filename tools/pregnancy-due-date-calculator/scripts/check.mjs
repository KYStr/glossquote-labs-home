// Static checks for the Pregnancy Due Date Calculator preview:
// file contract, package contract, forbidden runtime capabilities
// in the shipped surface, core purity, and the bilingual head /
// notice requirements of the SPEC.

import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const REQUIRED_PATHS = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/core/civil.mjs",
  "public/js/core/due-date.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/civil.test.mjs",
  "test/due-date.test.mjs",
  "test/pages.test.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
];

const EXPECTED_SCRIPTS = Object.freeze({
  test: "node --test",
  check: "node scripts/check.mjs",
  "build:preview": "node scripts/build.mjs --mode=preview",
  "check:generated:preview": "node scripts/check-generated.mjs --mode=preview",
  dev: "node scripts/serve.mjs",
});

// Forbidden in the shipped surface (public/). Assembled from
// fragments so this checker does not match its own scan.
const FORBIDDEN_TOKENS = [
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
  ["fe", "tch("],
  ["XML", "Http", "Request"],
  ["Web", "Socket"],
  ["Event", "Source"],
  ["send", "Beacon"],
  ["history.", "pushState"],
  ["history.", "replaceState"],
].map((parts) => parts.join(""));

// The core must be timestamp-free and environment-free: no Date
// construction, no DOM, no globals beyond pure JS.
const CORE_FORBIDDEN_TOKENS = [
  ["new ", "Date"],
  ["Date", ".now"],
  ["document", "."],
  ["window", "."],
  ["globalThis", "."],
].map((parts) => parts.join(""));

const problems = [];
function fail(message) {
  problems.push(message);
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch {
    return false;
  }
}

async function collectByExtension(root, extensions) {
  const out = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (extensions.has(extname(entry.name).toLowerCase())) out.push(full);
    }
  }
  await visit(root);
  return out;
}

async function checkPackage() {
  let pkg;
  try {
    pkg = JSON.parse(await readFile(resolve(PROJECT_ROOT, "package.json"), "utf8"));
  } catch {
    fail("package.json is not valid JSON.");
    return;
  }
  if (pkg.type !== "module") fail('package.json must set "type": "module".');
  if (pkg.engines?.node !== ">=24") fail('package.json engines.node must be ">=24".');
  const deps = Object.keys(pkg.dependencies ?? {});
  if (deps.length > 0) fail(`Runtime dependencies are forbidden, found: ${deps.join(", ")}`);
  for (const [name, command] of Object.entries(EXPECTED_SCRIPTS)) {
    if (pkg.scripts?.[name] !== command) {
      fail(`package.json script "${name}" must be "${command}".`);
    }
  }
}

function checkPage(html, { lang, homeHref, otherHref, noticeSnippets, label }) {
  if (!html.includes(`<html lang="${lang}">`)) fail(`${label}: missing <html lang="${lang}">`);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(`${label}: missing <title>.`);
  if (!html.includes('<meta name="description" content="')) fail(`${label}: missing meta description.`);
  if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
    fail(`${label}: preview pages must be noindex, nofollow.`);
  }
  if (!html.includes('<link rel="canonical" href="./index.html">')) fail(`${label}: missing canonical.`);
  if (!html.includes('hreflang="zh-Hant"')) fail(`${label}: missing hreflang zh-Hant alternate.`);
  if (!html.includes('hreflang="en"')) fail(`${label}: missing hreflang en alternate.`);
  if (!html.includes('hreflang="x-default"')) fail(`${label}: missing hreflang x-default.`);
  if (!html.includes(`href="${homeHref}"`)) fail(`${label}: missing same-language home link ${homeHref}.`);
  if (!html.includes(`href="${otherHref}"`)) fail(`${label}: missing language switch link ${otherHref}.`);
  if (!html.includes('id="medical-notice"')) fail(`${label}: medical notice is missing.`);
  for (const snippet of noticeSnippets) {
    if (!html.includes(snippet)) fail(`${label}: notice is missing required wording: ${snippet}`);
  }
  if (/predicted birth date/i.test(html) || /predicted due date/i.test(html)) {
    fail(`${label}: overclaiming wording ("predicted ... date") is forbidden.`);
  }
  if (/https?:\/\//.test(html)) fail(`${label}: external URLs are forbidden in preview pages.`);
}

async function main() {
  for (const required of REQUIRED_PATHS) {
    if (!(await pathExists(resolve(PROJECT_ROOT, required)))) {
      fail(`Missing required path: ${required}`);
    }
  }

  await checkPackage();

  const publicRoot = resolve(PROJECT_ROOT, "public");
  const shipped = await collectByExtension(publicRoot, new Set([".html", ".css", ".js", ".mjs"]));
  for (const file of shipped) {
    const text = await readFile(file, "utf8");
    for (const token of FORBIDDEN_TOKENS) {
      if (text.includes(token)) fail(`Forbidden token "${token}" in ${file}`);
    }
  }

  const coreFiles = await collectByExtension(resolve(publicRoot, "js/core"), new Set([".mjs"]));
  for (const file of coreFiles) {
    const text = await readFile(file, "utf8");
    for (const token of CORE_FORBIDDEN_TOKENS) {
      if (text.includes(token)) fail(`Core purity violation "${token}" in ${file}`);
    }
    for (const match of text.matchAll(/^import[^"']*["']([^"']+)["']/gm)) {
      if (!match[1].startsWith("./")) fail(`Core import must be relative in ${file}: ${match[1]}`);
    }
  }

  const zh = await readFile(resolve(publicRoot, "index.html"), "utf8");
  checkPage(zh, {
    lang: "zh-Hant",
    homeHref: "../../",
    otherHref: "./en/index.html",
    noticeSnippets: ["估計值", "只有少數寶寶會在預產期當天出生", "不如早期超音波量測可靠", "以臨床判斷為準"],
    label: "zh page",
  });
  const en = await readFile(resolve(publicRoot, "en/index.html"), "utf8");
  checkPage(en, {
    lang: "en",
    homeHref: "../../../",
    otherHref: "../index.html",
    noticeSnippets: [
      "statistical",
      "not a prediction and not medical advice",
      "Only a small minority of babies are born on their due date",
      "less reliable than an early ultrasound measurement",
      "the clinical dating prevails",
    ],
    label: "en page",
  });

  if (problems.length > 0) {
    process.stderr.write(`Check failed (${problems.length}):\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write("Static checks passed.\n");
}

main().catch((error) => {
  process.stderr.write(`Check crashed: ${error.message}\n`);
  process.exitCode = 1;
});
