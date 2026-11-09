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
  "public/js/controller.mjs",
  "public/js/core/tts.mjs",
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
// does not match its own scan. The Text-to-Speech Reader has no
// clipboard capability at all: reading the clipboard and writing to it
// are both forbidden (SPEC sections 2 and 5).
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
  if (packageJson.name !== "glossquote-labs-text-to-speech-reader") {
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
  if (wrangler.name !== "glossquote-labs-text-to-speech-reader" || wrangler.assets?.directory !== "./dist") {
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

  const coreSource = await readFile(resolve(root, "public/js/core/tts.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/tts.mjs: the pure core must not reference the DOM");
  }
  const controllerSource = await readFile(resolve(root, "public/js/controller.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(controllerSource)) {
    failures.push("controller.mjs: the speech controller must not reference the DOM");
  }

  const core = await import(pathToFileURL(resolve(root, "public/js/core/tts.mjs")).href);
  // SPEC section 4 normative segmentation fixtures, verbatim.
  if (JSON.stringify(core.segmentText("你好嗎？我很好。今天天氣不錯。")) !==
      JSON.stringify(["你好嗎？", "我很好。", "今天天氣不錯。"])) {
    failures.push("tts.mjs: SPEC section 4 zh segmentation fixture must hold exactly");
  }
  if (JSON.stringify(core.segmentText("Dr. Lee paid 3.14 dollars. Then he left.")) !==
      JSON.stringify(["Dr. Lee paid 3.14 dollars.", "Then he left."])) {
    failures.push("tts.mjs: SPEC section 4 en segmentation fixture must hold exactly");
  }
  if (JSON.stringify(core.ABBREVIATIONS) !==
      JSON.stringify(["Mr.", "Mrs.", "Dr.", "e.g.", "i.e.", "etc.", "vs."])) {
    failures.push("tts.mjs: the closed abbreviation list must ship as data (SPEC section 4)");
  }
  // SPEC section 4 chunking fixture: 450 characters, clause commas at
  // known positions, 3 chunks whose concatenation reproduces the input.
  const fixture450 = ("字".repeat(149) + "，").repeat(2) + "字".repeat(150);
  const chunks450 = core.chunkSentence(fixture450, 0, 0);
  if (chunks450.length !== 3 ||
      chunks450.map((c) => c.text).join("") !== fixture450 ||
      chunks450.some((c) => [...c.text].length > core.CHUNK_LIMIT)) {
    failures.push("tts.mjs: SPEC section 4 450-character chunking fixture must hold exactly");
  }
  let emptyCode = null;
  try {
    core.buildChunks("   ");
  } catch (error) {
    emptyCode = error.code;
  }
  if (emptyCode !== "EMPTY_TEXT") {
    failures.push("tts.mjs: whitespace-only input must raise EMPTY_TEXT (SPEC section 4)");
  }
  let limitCode = null;
  try {
    core.buildChunks("字".repeat(core.TEXT_LIMIT + 1));
  } catch (error) {
    limitCode = error.code;
  }
  if (limitCode !== "TEXT_TOO_LONG") {
    failures.push("tts.mjs: 20,001 characters must raise TEXT_TOO_LONG (SPEC section 4)");
  }
  const progChunks = [
    { text: "a".repeat(10), sentenceIndex: 0, ordinal: 0 },
    { text: "b".repeat(20), sentenceIndex: 0, ordinal: 1 },
    { text: "c".repeat(30), sentenceIndex: 1, ordinal: 2 },
  ];
  if (core.progressPercent(progChunks, 1) !== 16 || core.progressPercent(progChunks, 3) !== 100) {
    failures.push("tts.mjs: progress arithmetic must round down from the chunk list (SPEC section 4)");
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
