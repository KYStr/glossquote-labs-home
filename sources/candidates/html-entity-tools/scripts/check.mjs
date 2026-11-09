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
  "public/js/core/convert.mjs",
  "public/js/core/entities.mjs",
  "public/js/core/entities-c1.mjs",
  "scripts/fetch-entities.mjs",
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
// GlossQuote tools). The only clipboard operation is the explicit
// copy of the output pane (SPEC section 3), so the write call is
// permitted while clipboard reads stay forbidden. The scan skips
// this file and scripts/fetch-entities.mjs: both are authoring-time
// tools that never ship (the build mirrors public/ only), and the
// generator legitimately names its download operation.
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
    noteA: "不等於淨化",
    noteB: "不支援",
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    home: "https://glossquote.com/en/index.html",
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
    noteA: "not sanitisation",
    noteB: "not supported",
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
  // SPEC sections 1 and 5: the not-a-sanitizer honesty note and the
  // stated semicolon narrowing are part of the page, in both
  // languages.
  if (!active.includes(expected.noteA) || !active.includes(expected.noteB)) {
    failures.push(`${page}: the not-a-sanitizer / semicolon-narrowing note is missing`);
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
  if (packageJson.name !== "glossquote-labs-html-entity-tools") {
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
  if (wrangler.name !== "glossquote-labs-html-entity-tools" || wrangler.assets?.directory !== "./dist") {
    failures.push("wrangler.jsonc: name or assets directory differs from this tool");
  }
  if ("route" in wrangler || "routes" in wrangler) {
    failures.push("wrangler.jsonc: no route may be configured before deployment is approved");
  }

  const managed = await collectFiles(root, ["public", "scripts", "test"]);
  for (const path of managed) {
    if (!SCANNED_EXTENSIONS.has(extname(path).toLowerCase())) continue;
    const relativePath = relative(root, path).split(sep).join("/");
    if (relativePath === "scripts/check.mjs" || relativePath === "scripts/fetch-entities.mjs") continue;
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

  for (const coreFile of ["convert.mjs", "entities.mjs", "entities-c1.mjs"]) {
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

  // Vendored table provenance (SPEC section 5): the shipped table's
  // entry count and checksum must match PROVENANCE.md exactly.
  const provenance = await readFile(resolve(root, "PROVENANCE.md"), "utf8");
  const recordedEntries = Number(provenance.match(/^- Entries: (\d+)$/m)?.[1]);
  const recordedTableSha = provenance.match(/^- Table-SHA-256: ([0-9a-f]{64})$/m)?.[1];
  const entitiesModule = await import(pathToFileURL(resolve(root, "public/js/core/entities.mjs")).href);
  const shipped = entitiesModule.NAMED_REFERENCES;
  const { tableChecksum } = await import(pathToFileURL(resolve(root, "scripts/fetch-entities.mjs")).href);
  if (Object.keys(shipped).length !== recordedEntries) {
    failures.push("core/entities.mjs: entry count differs from PROVENANCE.md");
  }
  if (tableChecksum(shipped) !== recordedTableSha) {
    failures.push("core/entities.mjs: table checksum differs from PROVENANCE.md");
  }
  const semicolonForms = Object.keys(shipped).filter((key) => key.endsWith(";")).length;
  const recordedSemi = Number(provenance.match(/^- Semicolon-Forms: (\d+)$/m)?.[1]);
  if (semicolonForms !== recordedSemi) {
    failures.push("core/entities.mjs: semicolon-form count differs from PROVENANCE.md");
  }

  // Normative contract (SPEC section 4), re-asserted through the
  // shipped core.
  const core = await import(pathToFileURL(resolve(root, "public/js/core/convert.mjs")).href);
  const encFive = core.encodeText(`Tom & "Jerry" <3 'ok'`, { nonAscii: false, style: "named" });
  if (encFive.output !== "Tom &amp; &quot;Jerry&quot; &lt;3 &apos;ok&apos;") {
    failures.push("core/convert.mjs: mandatory-five encode fixture differs from SPEC section 4");
  }
  const encNamed = core.encodeText("café —", { nonAscii: true, style: "named" });
  if (encNamed.output !== "caf&eacute; &mdash;") {
    failures.push("core/convert.mjs: named non-ASCII encode fixture differs from SPEC section 4");
  }
  const decNotin = core.decodeText("&notin;");
  if (decNotin.output !== "∉" || decNotin.changes.length !== 1) {
    failures.push("core/convert.mjs: &notin; decode fixture differs from SPEC section 4");
  }
  const decC1 = core.decodeText("&#150;");
  if (decC1.output !== "–" || !decC1.changes[0]?.notes.includes("C1_REMAP")) {
    failures.push("core/convert.mjs: C1 remap fixture differs from SPEC section 4");
  }
  const decSurr = core.decodeText("&#xD800;");
  if (decSurr.output !== "�" || !decSurr.changes[0]?.notes.includes("SURROGATE_REPLACEMENT")) {
    failures.push("core/convert.mjs: surrogate fixture differs from SPEC section 4");
  }
  const decDouble = core.decodeText("&amp;lt;");
  if (decDouble.output !== "&lt;" || decDouble.doubleEncoded !== true) {
    failures.push("core/convert.mjs: double-encoded fixture differs from SPEC section 4");
  }
  if (core.canonicalNameFor(0x2014) !== "mdash" || core.canonicalNameFor(0xe9) !== "eacute") {
    failures.push("core/convert.mjs: canonical-name choice differs from SPEC section 4");
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
