import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ALLOWED_SITE_ANCHOR_URLS, PAGE_PATHS } from "./release.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const REQUIRED_PATHS = Object.freeze([
  "package.json",
  "scripts/serve.mjs",
  "scripts/check.mjs",
  "scripts/build.mjs",
  "scripts/release.mjs",
  "scripts/cloudflare.mjs",
  "public/index.html",
  "public/en/index.html",
  "public/styles/tokens.css",
  "public/styles/app.css",
  "public/js/app.mjs",
  "public/js/i18n.mjs",
  "public/js/explain.mjs",
  "public/js/core/cron.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "wrangler.jsonc",
  "README.md",
  "VERIFICATION.md",
  "CANDIDATE-MANIFEST.json",
  "PRODUCTION-STATUS.md",
]);

const EXPECTED_SCRIPTS = Object.freeze({
  dev: "node scripts/serve.mjs",
  test: "node --test",
  check: "node scripts/check.mjs",
  build: "node scripts/build.mjs",
});

// Forbidden runtime capabilities, assembled from fragments so this file
// does not match its own scan. The Cron Explainer has no copy feature
// in this version (SPEC section 6), so clipboard reading and writing
// are both forbidden; the parser is a fixed grammar, so the dynamic
// code-construction tokens below matter doubly here.
const forbiddenTokens = [
  ["inner", "HTML"],
  ["outer", "HTML"],
  ["insertAdjacent", "HTML"],
  ["local", "Storage"],
  ["session", "Storage"],
  ["indexed", "DB"],
  ["document.", "cookie"],
  ["document.", "write"],
  ["ev", "al"],
  ["new", "Function"],
  ["fe", "tch"],
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
const ALLOWED_ANCHORS = new Set(ALLOWED_SITE_ANCHOR_URLS);

const EXPECTED_HEAD = Object.freeze({
  "index.html": Object.freeze({
    lang: "zh-Hant",
    home: "https://glossquote.com/index.html",
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="./index.html">',
      '<link rel="alternate" hreflang="en" href="./en/index.html">',
      '<link rel="alternate" hreflang="x-default" href="./index.html">',
    ]),
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    home: "https://glossquote.com/en/index.html",
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
  }),
});

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
  return difference === "" || (
    difference !== ".." &&
    !isAbsolute(difference) &&
    difference.split(sep)[0] !== ".."
  );
}

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
      if (info.isSymbolicLink()) throw new Error(`Symbolic link in managed tree: ${relative(root, path)}`);
      if (info.isDirectory()) {
        if (entry.name === ".tmp" && relative(root, directory) === "test") continue;
        await visit(path);
      } else if (info.isFile()) {
        files.push(path);
      }
    }
  }
  for (const directory of directories) await visit(resolve(root, directory));
  return files;
}

function pageIds(html) {
  return new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
}

function checkPage(page, html, failures) {
  const expected = EXPECTED_HEAD[page];
  const active = stripComments(html, true);
  if (!active.includes(`<html lang="${expected.lang}">`)) {
    failures.push(`${page}: html lang must be ${expected.lang}`);
  }
  const robots = '<meta name="robots" content="noindex, nofollow">';
  if (active.split(robots).length !== 2) {
    failures.push(`${page}: exactly one preview robots meta is required`);
  }
  for (const alternate of expected.alternates) {
    if (active.split(alternate).length !== 2) {
      failures.push(`${page}: missing or duplicated alternate link ${alternate}`);
    }
  }
  const csp = active.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  if (!csp || !csp[1].includes("connect-src 'none'") || !csp[1].includes("default-src 'self'")) {
    failures.push(`${page}: CSP meta missing or weaker than the house policy`);
  }
  const title = active.match(/<title>([^<]+)<\/title>/);
  if (!title || title[1].trim() === "") failures.push(`${page}: title is missing or empty`);
  const description = active.match(/<meta name="description" content="([^"]+)"/);
  if (!description || description[1].trim() === "") {
    failures.push(`${page}: meta description is missing or empty`);
  }
  const anchors = [...active.matchAll(/href="(https?:[^"]+)"/g)].map((match) => match[1]);
  for (const anchor of anchors) {
    if (!ALLOWED_ANCHORS.has(anchor)) failures.push(`${page}: unexpected external anchor ${anchor}`);
  }
  if (!anchors.includes(expected.home)) {
    failures.push(`${page}: same-language home link ${expected.home} is missing`);
  }
  const titleText = title?.[1] ?? "";
  if (/\d/.test(titleText) && /(?:19|20)\d{2}/.test(titleText)) {
    failures.push(`${page}: title must not carry a year or input-like numbers`);
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
  if (packageJson.name !== "glossquote-labs-cron-explainer") {
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

  const wrangler = JSON.parse(await readFile(resolve(root, "wrangler.jsonc"), "utf8"));
  if (wrangler.name !== "glossquote-labs-cron-explainer" || wrangler.assets?.directory !== "./dist") {
    failures.push("wrangler.jsonc: name or assets directory differs from this tool");
  }
  if ("route" in wrangler || "routes" in wrangler) {
    failures.push("wrangler.jsonc: no route may be configured before deployment is approved");
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
    const urls = [...stripped.matchAll(/https?:\/\/[^\s"'<>]+/g)].map((match) => match[0]);
    for (const url of urls) {
      if (relativePath.startsWith("public/") && !ALLOWED_ANCHORS.has(url)) {
        failures.push(`${relativePath}: unexpected external URL ${url}`);
      }
    }
  }

  const pages = {};
  for (const page of PAGE_PATHS) {
    pages[page] = await readFile(resolve(root, "public", page), "utf8");
    checkPage(page, pages[page], failures);
  }
  const zhIds = pageIds(pages["index.html"]);
  const enIds = pageIds(pages["en/index.html"]);
  if ([...zhIds].some((id) => !enIds.has(id)) || [...enIds].some((id) => !zhIds.has(id))) {
    failures.push("pages: element id sets differ between the two language pages");
  }

  const appSource = await readFile(resolve(root, "public/js/app.mjs"), "utf8");
  const referencedIds = new Set(
    [...appSource.matchAll(/querySelector\(`#([a-z0-9-]+)`\)/g)].map((match) => match[1]),
  );
  for (const match of appSource.matchAll(/\$\("([a-z0-9-]+)"\)/g)) {
    referencedIds.add(match[1]);
  }
  for (const id of referencedIds) {
    if (!zhIds.has(id)) failures.push(`app.mjs: element #${id} is missing from the pages`);
  }

  const coreSource = await readFile(resolve(root, "public/js/core/cron.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/cron.mjs: the pure core must not reference the DOM");
  }
  const explainSource = await readFile(resolve(root, "public/js/explain.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(explainSource)) {
    failures.push("explain.mjs: the explanation renderer must not reference the DOM");
  }

  const core = await import(pathToFileURL(resolve(root, "public/js/core/cron.mjs")).href);
  const pad2 = (n) => String(n).padStart(2, "0");
  const fmt = (d) =>
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  // SPEC section 4 enumeration fixtures (local-time construction).
  // Note: the SPEC's printed */15 fixture omits Fri 17:15/17:30/17:45,
  // which its own semantics require; the check asserts the first run
  // and the Monday runs, on which fixture and rules agree (see
  // VERIFICATION.md for the documented defect).
  const weekday = core.parseExpression("*/15 9-17 * * 1-5");
  const weekdayRuns = core.nextRuns(weekday, new Date(2026, 9, 30, 16, 59, 0)).runs.map(fmt);
  if (weekdayRuns[0] !== "2026-10-30 17:00" || !weekdayRuns.includes("2026-11-02 09:00") ||
      !weekdayRuns.includes("2026-11-02 09:15") || !weekdayRuns.includes("2026-11-02 09:30")) {
    failures.push("cron.mjs: SPEC section 4 weekday fixture runs must hold");
  }
  const leap = core.nextRuns(core.parseExpression("0 0 29 2 *"), new Date(2027, 2, 1, 0, 0)).runs;
  if (fmt(leap[0]) !== "2028-02-29 00:00") {
    failures.push("cron.mjs: SPEC section 4 leap-day fixture must hold exactly");
  }
  const never = core.nextRuns(core.parseExpression("0 0 31 2 *"), new Date(2026, 0, 15, 12, 0));
  if (never.runs.length !== 0 || !never.exhausted) {
    failures.push("cron.mjs: SPEC section 4 never-fires fixture must exhaust the window with zero runs");
  }
  const byName = core.parseExpression("0 9 * * MON-FRI");
  const byNumber = core.parseExpression("0 9 * * 1-5");
  if (JSON.stringify(byName.fields.map((f) => f.set)) !== JSON.stringify(byNumber.fields.map((f) => f.set))) {
    failures.push("cron.mjs: MON-FRI must parse identically to 1-5 (SPEC section 4)");
  }
  if (core.parseExpression("@weekly").text !== "0 0 * * 0") {
    failures.push("cron.mjs: @weekly must expand to 0 0 * * 0 (SPEC section 4)");
  }
  let macroCode = null;
  try {
    core.parseExpression("@reboot");
  } catch (error) {
    macroCode = error.code;
  }
  if (macroCode !== "MACRO_UNKNOWN") {
    failures.push("cron.mjs: @reboot must be the macro error listing supported macros (SPEC section 4)");
  }
  let dialectCode = null;
  try {
    core.parseExpression("0 0 ? * *");
  } catch (error) {
    dialectCode = error.code;
  }
  if (dialectCode !== "DIALECT_TOKEN") {
    failures.push("cron.mjs: Quartz tokens must be the dialect error (SPEC section 4)");
  }
  if (core.buildExplanation(core.parseExpression("0 12 15 * 5")).bothDayRestricted !== true ||
      core.buildExplanation(core.parseExpression("0 12 * * 5")).bothDayRestricted !== false) {
    failures.push("cron.mjs: the OR-rule flag must follow the starred determination (SPEC section 4)");
  }
  if (core.canonicalFromValues(new Set([1, 2, 3, 5, 7, 8]), core.FIELD_DEFS[0]) !== "1-3,5,7,8") {
    failures.push("cron.mjs: builder canonicalisation must collapse runs of 3+ only (SPEC section 4)");
  }

  const i18nModule = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const dictionaries = i18nModule.DICTIONARIES;
  const zhErrors = Object.keys(dictionaries["zh-Hant"].errors).sort();
  const enErrors = Object.keys(dictionaries.en.errors).sort();
  if (JSON.stringify(zhErrors) !== JSON.stringify(enErrors)) {
    failures.push("i18n.mjs: error code sets differ between languages");
  }
  const coreCodes = new Set([...coreSource.matchAll(/fail\("([A-Z_]+)"/g)].map((match) => match[1]));
  for (const code of coreCodes) {
    if (!zhErrors.includes(code)) failures.push(`i18n.mjs: core error code ${code} has no message`);
  }
  // The core raises most codes through its fieldError helper, so the
  // full code list is asserted explicitly in both languages.
  const ALL_ERROR_CODES = [
    "FIELD_COUNT", "MACRO_UNKNOWN", "UNKNOWN_NAME", "VALUE_RANGE",
    "RANGE_ORDER", "STEP_INVALID", "EMPTY_ITEM", "ITEM_INVALID",
    "DIALECT_TOKEN",
  ];
  for (const code of ALL_ERROR_CODES) {
    if (!zhErrors.includes(code) || !enErrors.includes(code)) {
      failures.push(`i18n.mjs: error code ${code} must have a message in both languages`);
    }
  }
  // Explanation templates are data in both languages (SPEC section 5):
  // every field must carry every phrase kind in both dictionaries.
  for (const lang of ["zh-Hant", "en"]) {
    for (const fieldKey of ["minute", "hour", "dom", "month", "dow"]) {
      const phrases = dictionaries[lang].phrases?.[fieldKey];
      for (const kind of ["every", "single", "range", "stepAll", "stepRange", "stepFrom", "list", "summary"]) {
        if (!phrases || typeof phrases[kind] !== "string") {
          failures.push(`i18n.mjs: ${lang} phrases.${fieldKey}.${kind} is missing`);
        }
      }
    }
  }

  if (failures.length > 0) throw new Error(`Project check failed:\n- ${failures.join("\n- ")}`);
  return true;
}

export async function checkReleaseOutput(distPath, { production = false } = {}) {
  if (production) {
    throw new Error("Production output cannot exist while no site URL is approved.");
  }
  const root = await realpath(resolve(distPath, ".."));
  const publicFiles = await collectFiles(root, ["public"]);
  const expected = publicFiles
    .map((path) => relative(resolve(root, "public"), path).split(sep).join("/"))
    .sort();
  const actual = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) actual.push(relative(distPath, path).split(sep).join("/"));
    }
  }
  await visit(distPath);
  actual.sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Preview dist must mirror the public tree exactly.");
  }
  for (const relativePath of expected) {
    const [source, built] = await Promise.all([
      readFile(resolve(root, "public", relativePath)),
      readFile(resolve(distPath, relativePath)),
    ]);
    if (!source.equals(built)) throw new Error(`Preview dist file differs from public: ${relativePath}`);
  }
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    await runProjectCheck();
    process.stdout.write("Project check passed.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Project check failed."}\n`);
    process.exitCode = 1;
  }
}
