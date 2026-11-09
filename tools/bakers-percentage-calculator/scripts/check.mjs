// Static project checks: required files, package contract, page head
// contract for both languages, id parity, string key parity, core
// purity, forbidden runtime capabilities, and a K1 fixture smoke test
// through the shipped core. Exits non-zero on any failure.

import { lstat, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];
const fail = (msg) => failures.push(msg);

const REQUIRED = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/strings.mjs",
  "public/js/core/bakers.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/fixtures.test.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
];

for (const rel of REQUIRED) {
  try {
    const info = await lstat(join(ROOT, rel));
    if (!info.isFile()) fail(`${rel}: not a regular file`);
  } catch {
    fail(`${rel}: missing`);
  }
}

if (failures.length === 0) {
  const pkg = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
  if (pkg.type !== "module") fail("package.json: type must be module");
  if (pkg.engines?.node !== ">=24") fail("package.json: engines.node must be >=24");
  if (pkg.dependencies && Object.keys(pkg.dependencies).length > 0) {
    fail("package.json: runtime dependencies are not allowed");
  }
  const expectedScripts = {
    test: "node --test",
    check: "node scripts/check.mjs",
    "build:preview": "node scripts/build.mjs",
    "check:generated:preview": "node scripts/build.mjs --check",
  };
  for (const [name, cmd] of Object.entries(expectedScripts)) {
    if (pkg.scripts?.[name] !== cmd) fail(`package.json: script ${name} must be "${cmd}"`);
  }

  // Forbidden runtime capabilities, assembled from fragments so this
  // file does not match its own scan.
  const forbidden = [
    ["inner", "HTML"],
    ["outer", "HTML"],
    ["insertAdjacent", "HTML"],
    ["local", "Storage"],
    ["session", "Storage"],
    ["indexed", "DB"],
    ["document.", "cookie"],
    ["ev", "al("],
    ["new", " Function"],
    ["fe", "tch("],
    ["XML", "HttpRequest"],
    ["Web", "Socket"],
    ["send", "Beacon"],
  ].map((parts) => parts.join(""));
  const scanned = [
    "public/js/app.js",
    "public/js/strings.mjs",
    "public/js/core/bakers.mjs",
    "public/index.html",
    "public/en/index.html",
    "scripts/build.mjs",
    "scripts/serve.mjs",
  ];
  for (const rel of scanned) {
    const source = await readFile(join(ROOT, rel), "utf8");
    for (const token of forbidden) {
      if (source.includes(token)) fail(`${rel}: forbidden token ${token}`);
    }
    if (/https?:\/\//.test(source)) fail(`${rel}: external URL found`);
  }

  const core = await readFile(join(ROOT, "public/js/core/bakers.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(core)) fail("core: must not reference the DOM");

  const pages = {
    zh: await readFile(join(ROOT, "public/index.html"), "utf8"),
    en: await readFile(join(ROOT, "public/en/index.html"), "utf8"),
  };
  const checkPage = (key, html, lang, canonical, home) => {
    if (!html.includes(`<html lang="${lang}">`)) fail(`${key}: lang must be ${lang}`);
    if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
      fail(`${key}: preview noindex missing`);
    }
    if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
      fail(`${key}: canonical missing`);
    }
    if (!html.includes('hreflang="zh-Hant"') || !html.includes('hreflang="en"')) {
      fail(`${key}: hreflang cross-links missing`);
    }
    if (!html.includes(`href="${home}"`)) fail(`${key}: same-language home link missing`);
    if (!/<title>[^<]+<\/title>/.test(html)) fail(`${key}: title missing`);
    if (!/<meta name="description" content="[^"]+"/.test(html)) {
      fail(`${key}: description missing`);
    }
    if (!/<h1>[^<]+<\/h1>/.test(html)) fail(`${key}: h1 missing`);
  };
  checkPage("zh", pages.zh, "zh-Hant", "./index.html", "../../");
  checkPage("en", pages.en, "en", "./index.html", "../../../en/");

  const ids = (html) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const zhIds = ids(pages.zh);
  const enIds = ids(pages.en);
  if ([...zhIds].some((id) => !enIds.has(id)) || [...enIds].some((id) => !zhIds.has(id))) {
    fail("pages: element id sets differ between languages");
  }

  const strings = await import(pathToFileURL(join(ROOT, "public/js/strings.mjs")).href);
  const keySet = (obj) => JSON.stringify(Object.keys(obj).sort());
  if (keySet(strings.STRINGS["zh-Hant"]) !== keySet(strings.STRINGS.en)) {
    fail("strings.mjs: key sets differ between languages");
  }

  // K1 smoke through the shipped core (full fixture suite is in test/).
  const coreModule = await import(pathToFileURL(join(ROOT, "public/js/core/bakers.mjs")).href);
  const rows = [
    { name: "flour", percentTenths: 1000n, flour: true, water: false },
    { name: "water", percentTenths: 650n, flour: false, water: true },
    { name: "salt", percentTenths: 20n, flour: false, water: false },
    { name: "yeast", percentTenths: 10n, flour: false, water: false },
  ];
  const k1 = coreModule.computeModeA(rows, 8400n);
  if (JSON.stringify(k1.weightTexts) !== JSON.stringify(["500.0", "325.0", "10.0", "5.0"])) {
    fail(`core smoke: K1 weights differ (${k1.weightTexts.join(", ")})`);
  }
  if (k1.hydrationText !== "65.0") fail("core smoke: K1 hydration differs");
}

if (failures.length > 0) {
  process.stderr.write(`Project check failed:\n- ${failures.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Project check passed.\n");
}
