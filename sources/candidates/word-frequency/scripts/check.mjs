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
  "public/js/core/frequency.mjs",
  "public/js/core/casefold.mjs",
  "public/js/core/stopwords-en.mjs",
  "public/js/core/stopwords-cjk.mjs",
  "scripts/fetch-casefolding.mjs",
  "PROVENANCE.md",
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

// Forbidden runtime capabilities, assembled from fragments so this
// file does not match its own scan (same approach as the other
// GlossQuote tools). This tool has no clipboard path at all (CSV
// export is a download). The scan skips this file and
// scripts/fetch-casefolding.mjs: both are authoring-time tools that
// never ship (the build mirrors public/ only), and the generator
// legitimately names its download operation.
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
    noteA: "不做中文斷詞",
    noteB: "簡單摺疊",
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    home: "https://glossquote.com/en/index.html",
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
    noteA: "does not segment Chinese",
    noteB: "simple case folding",
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
  // SPEC sections 1, 2 and 5: the no-segmentation honesty note and
  // the simple-case-folding statement are part of the page, in
  // both languages.
  if (!active.includes(expected.noteA) || !active.includes(expected.noteB)) {
    failures.push(`${page}: the counting-rules honesty note is missing`);
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
  if (packageJson.name !== "glossquote-labs-word-frequency") {
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
  if (wrangler.name !== "glossquote-labs-word-frequency" || wrangler.assets?.directory !== "./dist") {
    failures.push("wrangler.jsonc: name or assets directory differs from this tool");
  }
  if ("route" in wrangler || "routes" in wrangler) {
    failures.push("wrangler.jsonc: no route may be configured before deployment is approved");
  }

  const managed = await collectFiles(root, ["public", "scripts", "test"]);
  for (const path of managed) {
    if (!SCANNED_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const relativePath = relative(root, path).split(sep).join("/");
    if (relativePath === "scripts/check.mjs" || relativePath === "scripts/fetch-casefolding.mjs") continue;
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
    [...appSource.matchAll(/querySelector\("#([a-z0-9-]+)"\)/g)].map((match) => match[1]),
  );
  for (const id of referencedIds) {
    if (!zhIds.has(id)) failures.push(`app.mjs: element #${id} is missing from the pages`);
  }

  for (const coreFile of ["frequency.mjs", "casefold.mjs", "stopwords-en.mjs", "stopwords-cjk.mjs"]) {
    const coreSource = await readFile(resolve(root, "public/js/core", coreFile), "utf8");
    if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
      failures.push(`core/${coreFile}: the pure core must not reference the DOM`);
    }
  }

  const i18nModule = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const dictionaries = i18nModule.DICTIONARIES;
  const sortKeys = (obj) => Object.keys(obj).sort();
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"].ui)) !== JSON.stringify(sortKeys(dictionaries.en.ui))) {
    failures.push("i18n.mjs: ui key sets differ between languages");
  }
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"].errors)) !== JSON.stringify(sortKeys(dictionaries.en.errors))) {
    failures.push("i18n.mjs: error key sets differ between languages");
  }

  // Vendored fold-table provenance (SPEC sections 4 and 5): the
  // shipped table's entry count, C/F split and checksum must match
  // PROVENANCE.md exactly.
  const provenance = await readFile(resolve(root, "PROVENANCE.md"), "utf8");
  const recordedEntries = Number(provenance.match(/^- Entries: (\d+)$/m)?.[1]);
  const recordedTableSha = provenance.match(/^- Table-SHA-256: ([0-9a-f]{64})$/m)?.[1];
  const casefoldModule = await import(pathToFileURL(resolve(root, "public/js/core/casefold.mjs")).href);
  const shipped = casefoldModule.CASE_FOLD;
  const { foldChecksum } = await import(pathToFileURL(resolve(root, "scripts/fetch-casefolding.mjs")).href);
  if (Object.keys(shipped).length !== recordedEntries) {
    failures.push("core/casefold.mjs: entry count differs from PROVENANCE.md");
  }
  if (foldChecksum(shipped) !== recordedTableSha) {
    failures.push("core/casefold.mjs: table checksum differs from PROVENANCE.md");
  }

  // Normative contract (SPEC section 4), re-asserted through the
  // shipped core: the fold discriminator and fixtures 1, 2 and 4.
  const core = await import(pathToFileURL(resolve(root, "public/js/core/frequency.mjs")).href);
  if (core.foldText("Σςσ") !== "σσσ" || core.foldText("İ") !== "İ" || core.foldText("I") !== "i") {
    failures.push("core/frequency.mjs: the simple case fold differs from SPEC section 4");
  }
  const fixture1 = core.analyze("The cat sat. The cat ran, and the dog ran.", {});
  const words1 = fixture1.words.rows.map((row) => `${row.item}:${row.count}:${row.percent.toFixed(1)}`);
  if (fixture1.words.total !== 10 || fixture1.words.unique !== 6
    || JSON.stringify(words1) !== JSON.stringify(["The:3:30.0", "cat:2:20.0", "ran:2:20.0", "sat:1:10.0", "and:1:10.0", "dog:1:10.0"])) {
    failures.push("core/frequency.mjs: fixture 1 differs from SPEC section 4");
  }
  const fixture2 = core.analyze("我喜歡台灣，台灣喜歡我。", {});
  if (fixture2.characters.total !== 10 || fixture2.characters.unique !== 5
    || fixture2.bigrams.total !== 8
    || fixture2.bigrams.rows[0].item !== "喜歡" || fixture2.bigrams.rows[1].item !== "台灣") {
    failures.push("core/frequency.mjs: fixture 2 differs from SPEC section 4");
  }
  const fixture4 = core.analyze("Σ ς σ ΣΣ", {});
  const words4 = fixture4.words.rows.map((row) => `${row.key}:${row.count}:${row.percent.toFixed(1)}`);
  if (JSON.stringify(words4) !== JSON.stringify(["σ:3:75.0", "σσ:1:25.0"])) {
    failures.push("core/frequency.mjs: fixture 4 (the fold discriminator) differs from SPEC section 4");
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
