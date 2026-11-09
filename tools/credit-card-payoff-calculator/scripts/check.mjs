import { lstat, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildPreview } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const REQUIRED_PATHS = Object.freeze([
  "package.json",
  "scripts/serve.mjs",
  "scripts/check.mjs",
  "scripts/build.mjs",
  "public/index.html",
  "public/en/index.html",
  "public/styles/tokens.css",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/i18n.mjs",
  "public/js/controller.mjs",
  "public/js/core/payoff.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "test/pages.test.mjs",
  "test/worker.test.mjs",
  "test/fixtures.json",
  "README.md",
  "HANDOFF.md",
  "VERIFICATION.md",
]);

const EXPECTED_SCRIPTS = Object.freeze({
  test: "node --test",
  check: "node scripts/check.mjs",
  "build:preview": "node scripts/build.mjs --mode preview",
  "check:generated:preview": "node scripts/check.mjs --generated-preview",
  serve: "node scripts/serve.mjs",
});

// Forbidden runtime capabilities, assembled from fragments so this
// file does not match its own scan.
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
  ["new", "Function"],
  ["fe", "tch("],
  ["XML", "Http", "Request"],
  ["Web", "Socket"],
  ["Event", "Source"],
  ["send", "Beacon"],
  ["clipboard.", "read"],
  ["clipboard.", "writeText"],
  ["history.", "pushState"],
  ["history.", "replaceState"],
].map((parts) => parts.join(""));

const SCANNED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const EXPECTED_PAGES = Object.freeze({
  "index.html": Object.freeze({
    lang: "zh-Hant",
    title: "信用卡還款試算｜Gloss Tools",
    h1: "信用卡還款試算",
    description: "輸入信用卡欠款餘額與年利率，試算每月固定還款要多久還清、總利息多少，或在目標月數內還清每月要繳多少；含永遠還不完的偵測。",
    home: "../../index.html",
    languageLink: "en/index.html",
    alternates: Object.freeze(["./index.html", "./en/index.html", "./index.html"]),
    disclosure: "這是依上述模型的試算，實際帳單金額以發卡銀行結算為準；未含年費、違約金、預借現金與最低應繳規則。",
    faq: Object.freeze([
      "為什麼顯示永遠還不完？",
      "每月還款不超過第一個月利息時，餘額永遠不會減少。",
      "目標月數的每月金額怎麼算？",
      "以年金公式精確計算、無條件進位到分，再以同一月結模擬驗證。",
    ]),
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    title: "Credit Card Payoff Calculator | Gloss Tools",
    h1: "Credit Card Payoff Calculator",
    description: "Enter a card balance and APR to see how long a fixed monthly payment takes to clear it, the total interest, or the payment needed to finish within a target number of months — including never-payoff detection.",
    home: "../../en/index.html",
    languageLink: "../index.html",
    alternates: Object.freeze(["../index.html", "./index.html", "../index.html"]),
    disclosure: "This is an estimate under the stated model. Your issuer's statement governs; fees, penalties, cash advances and minimum-payment rules are not modeled.",
    faq: Object.freeze([
      "Why does it say the balance never pays off?",
      "When the payment is no more than the first month's interest, the balance never shrinks.",
      "How is the target-months payment derived?",
      "From the exact annuity formula, rounded up to the cent, then verified by the same monthly simulation.",
    ]),
  }),
});

const CSP_DIRECTIVES = Object.freeze([
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "worker-src blob:",
  "img-src 'self'",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
]);

const ALL_ERROR_CODES = Object.freeze([
  "SCHEMA", "INPUT_LIMIT", "UNICODE", "EMPTY", "MONEY_FORMAT",
  "PERCENT_FORMAT", "INTEGER_FORMAT", "ENUM", "RANGE", "NEVER_PAYOFF",
  "PAYOFF_TOO_LONG", "OUTPUT_LIMIT", "INTERNAL", "WORKER_ERROR",
]);

function stripComments(source, isHtml) {
  if (isHtml) return source.replace(/<!--[\s\S]*?-->/g, "");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[ \t])\/\/[^\r\n]*/gm, "$1");
}

async function collectFiles(root, directories) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      const info = await lstat(path);
      if (info.isSymbolicLink()) {
        throw new Error(`Symbolic link in managed tree: ${relative(root, path)}`);
      }
      if (info.isDirectory()) await visit(path);
      else if (info.isFile()) files.push(path);
    }
  }
  for (const directory of directories) await visit(resolve(root, directory));
  return files;
}

function pageIds(html) {
  return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
}

function checkPage(page, html, failures) {
  const expected = EXPECTED_PAGES[page];
  const active = stripComments(html, true);
  if (!active.includes(`<html lang="${expected.lang}">`)) {
    failures.push(`${page}: html lang must be ${expected.lang}`);
  }
  const title = active.match(/<title>([^<]+)<\/title>/);
  if (!title || title[1] !== expected.title) {
    failures.push(`${page}: title must be exactly the pinned SPEC title`);
  }
  const description = active.match(/<meta name="description" content="([^"]+)"/);
  if (!description || description[1] !== expected.description) {
    failures.push(`${page}: meta description must be exactly the pinned SPEC description`);
  }
  const h1 = active.match(/<h1>([^<]+)<\/h1>/);
  if (!h1 || h1[1] !== expected.h1) {
    failures.push(`${page}: h1 must be exactly the pinned SPEC heading`);
  }
  const robots = '<meta name="robots" content="noindex, nofollow">';
  if (active.split(robots).length !== 2) {
    failures.push(`${page}: exactly one preview robots meta is required`);
  }
  const csp = active.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  if (!csp) {
    failures.push(`${page}: CSP meta is missing`);
  } else {
    for (const directive of CSP_DIRECTIVES) {
      if (!csp[1].includes(directive)) {
        failures.push(`${page}: CSP meta is missing directive ${directive}`);
      }
    }
  }
  const alternates = [...active.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)">/g)]
    .map((match) => match[1]);
  if (JSON.stringify(alternates) !== JSON.stringify(expected.alternates)) {
    failures.push(`${page}: hreflang alternates must be the pinned relative paths`);
  }
  const anchors = [...active.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
  if (!anchors.includes(expected.home)) {
    failures.push(`${page}: same-language home link ${expected.home} is missing`);
  }
  if (!anchors.includes(expected.languageLink)) {
    failures.push(`${page}: language link ${expected.languageLink} is missing`);
  }
  if (!active.includes(expected.disclosure)) {
    failures.push(`${page}: the pinned model disclosure is missing`);
  }
  for (const line of expected.faq) {
    if (!active.includes(line)) failures.push(`${page}: pinned FAQ text is missing`);
  }
}

export async function runProjectCheck(projectPath = PROJECT_ROOT) {
  const failures = [];
  const root = await realpath(resolve(projectPath));

  for (const required of REQUIRED_PATHS) {
    const path = resolve(root, required);
    try {
      const info = await lstat(path);
      if (!info.isFile() || info.isSymbolicLink()) failures.push(`${required}: must be a regular file`);
    } catch {
      failures.push(`${required}: required path is missing`);
    }
  }
  if (failures.length > 0) throw new Error(`Project check failed:\n- ${failures.join("\n- ")}`);

  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (packageJson.name !== "glossquote-labs-credit-card-payoff-calculator") {
    failures.push("package.json: unexpected package name");
  }
  if (packageJson.type !== "module" || packageJson.engines?.node !== ">=24") {
    failures.push("package.json: must be an ES module package requiring Node >= 24");
  }
  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    failures.push("package.json: runtime dependencies are not allowed");
  }
  for (const [name, command] of Object.entries(EXPECTED_SCRIPTS)) {
    if (packageJson.scripts?.[name] !== command) {
      failures.push(`package.json: script ${name} must be "${command}"`);
    }
  }

  const managed = await collectFiles(root, ["public", "scripts", "test"]);
  for (const path of managed) {
    if (!SCANNED_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const relativePath = relative(root, path).split(sep).join("/");
    if (relativePath === "scripts/check.mjs") continue;
    const source = await readFile(path, "utf8");
    const stripped = stripComments(source, extname(path).toLowerCase() === ".html");
    for (const token of forbiddenTokens) {
      if (stripped.includes(token)) failures.push(`${relativePath}: forbidden token ${token}`);
    }
    if (relativePath.startsWith("public/")) {
      const urls = [...stripped.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((match) => match[0]);
      for (const url of urls) {
        failures.push(`${relativePath}: unexpected external URL ${url}`);
      }
    }
  }

  const pages = {};
  for (const page of Object.keys(EXPECTED_PAGES)) {
    pages[page] = await readFile(resolve(root, "public", page), "utf8");
    checkPage(page, pages[page], failures);
  }
  const zhIds = pageIds(pages["index.html"]);
  const enIds = pageIds(pages["en/index.html"]);
  if ([...zhIds].some((id) => !enIds.has(id)) || [...enIds].some((id) => !zhIds.has(id))) {
    failures.push("pages: element id sets differ between the two language pages");
  }

  const appSource = await readFile(resolve(root, "public/js/app.js"), "utf8");
  const referencedIds = new Set(
    [...appSource.matchAll(/\$\("([a-z0-9-]+)"\)/g)].map((match) => match[1]),
  );
  for (const id of referencedIds) {
    if (!zhIds.has(id)) failures.push(`app.js: element #${id} is missing from the pages`);
  }

  for (const pure of ["public/js/core/payoff.mjs", "public/js/controller.mjs", "public/js/i18n.mjs"]) {
    const source = await readFile(resolve(root, pure), "utf8");
    if (/\bdocument\b|\bwindow\b/.test(source)) {
      failures.push(`${pure}: pure modules must not reference the DOM`);
    }
  }

  const i18n = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const zhErrors = Object.keys(i18n.DICTIONARIES["zh-Hant"].errors).sort();
  const enErrors = Object.keys(i18n.DICTIONARIES.en.errors).sort();
  if (JSON.stringify(zhErrors) !== JSON.stringify(enErrors)) {
    failures.push("i18n.mjs: error code sets differ between languages");
  }
  for (const code of ALL_ERROR_CODES) {
    if (!zhErrors.includes(code) || !enErrors.includes(code)) {
      failures.push(`i18n.mjs: error code ${code} must have a message in both languages`);
    }
  }
  const zhUi = Object.keys(i18n.DICTIONARIES["zh-Hant"].ui).sort();
  const enUi = Object.keys(i18n.DICTIONARIES.en.ui).sort();
  if (JSON.stringify(zhUi) !== JSON.stringify(enUi)) {
    failures.push("i18n.mjs: ui key sets differ between languages");
  }

  // Pinned SPEC spot checks against the vendored fixture expectations.
  const core = await import(pathToFileURL(resolve(root, "public/js/core/payoff.mjs")).href);
  const basic = core.run({
    balance: "1200.00", aprPercent: "12", mode: "payment",
    monthlyPayment: "110.00", targetMonths: null,
  });
  if (!basic.ok || basic.result.months !== 12 || basic.result.totalInterestCents !== 7711 ||
      basic.result.totalPaidCents !== 127711 || basic.result.finalPaymentCents !== 6711) {
    failures.push("core/payoff.mjs: fixed-payment-basic fixture totals must hold");
  }
  const annuity = core.run({
    balance: "10000.00", aprPercent: "24", mode: "months",
    monthlyPayment: null, targetMonths: "12",
  });
  if (!annuity.ok || annuity.result.requiredPaymentCents !== 94560 || annuity.result.months !== 12) {
    failures.push("core/payoff.mjs: target-months-annuity fixture values must hold");
  }
  const never = core.run({
    balance: "5000.00", aprPercent: "24", mode: "payment",
    monthlyPayment: "100.00", targetMonths: null,
  });
  if (never.ok || never.error.code !== "NEVER_PAYOFF" || never.error.field !== "monthlyPayment") {
    failures.push("core/payoff.mjs: never-payoff-equal fixture must hold");
  }

  if (failures.length > 0) throw new Error(`Project check failed:\n- ${failures.join("\n- ")}`);
  return true;
}

async function listTree(root) {
  const entries = [];
  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    items.sort((left, right) => left.name.localeCompare(right.name));
    for (const item of items) {
      const path = join(directory, item.name);
      if (item.isDirectory()) await visit(path);
      else if (item.isFile()) entries.push(relative(root, path).split(sep).join("/"));
    }
  }
  await visit(root);
  return entries.sort();
}

export async function checkGeneratedPreview(projectPath = PROJECT_ROOT) {
  const root = await realpath(resolve(projectPath));
  const distPath = resolve(root, "dist-preview");
  const distInfo = await lstat(distPath).catch(() => null);
  if (!distInfo || !distInfo.isDirectory()) {
    throw new Error("dist-preview is missing; run npm run build:preview first.");
  }
  const tempRoot = await mkdtemp(join(tmpdir(), "ccp-preview-"));
  try {
    await buildPreview({ projectPath: root, outputDir: tempRoot, check: null });
    const expected = await listTree(tempRoot);
    const actual = await listTree(distPath);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error("dist-preview file set differs from a fresh preview build.");
    }
    for (const relativePath of expected) {
      const [fresh, current] = await Promise.all([
        readFile(join(tempRoot, relativePath)),
        readFile(join(distPath, relativePath)),
      ]);
      if (!fresh.equals(current)) {
        throw new Error(`dist-preview file differs from a fresh preview build: ${relativePath}`);
      }
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).includes("--generated-preview")) {
      await checkGeneratedPreview();
      process.stdout.write("Generated preview check passed.\n");
    } else {
      await runProjectCheck();
      process.stdout.write("Project check passed.\n");
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Project check failed."}\n`);
    process.exitCode = 1;
  }
}
