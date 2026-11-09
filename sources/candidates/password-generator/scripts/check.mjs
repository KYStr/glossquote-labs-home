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
  "public/js/core/password.mjs",
  "public/js/core/wordlist.mjs",
  "test/core.test.mjs",
  "test/wordlist.test.mjs",
  "test/controller.test.mjs",
  "wrangler.jsonc",
  "README.md",
  "VERIFICATION.md",
  "CANDIDATE-MANIFEST.json",
  "PRODUCTION-STATUS.md",
  "WORDLIST-SOURCE.md",
]);

const EXPECTED_SCRIPTS = Object.freeze({
  dev: "node scripts/serve.mjs",
  test: "node --test",
  check: "node scripts/check.mjs",
  build: "node scripts/build.mjs",
});

// Forbidden runtime capabilities, assembled from fragments so this file
// does not match its own scan. The SPEC's one permitted exception is
// clipboard WRITES on a user gesture (the copy buttons), so only
// clipboard reading is forbidden. Math.random is forbidden outright:
// crypto.getRandomValues is the only permitted randomness source.
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
  ["Math.", "random"],
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
  if (packageJson.name !== "glossquote-labs-password-generator") {
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
  if (wrangler.name !== "glossquote-labs-password-generator" || wrangler.assets?.directory !== "./dist") {
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
    // The wordlist module is a pure data artefact (7,776 dictionary
    // words); ordinary English words inside it ("fetch", "medieval",
    // "window") would false-positive the capability scan. It is exempt
    // from the token scan and is instead shape-checked below as data.
    if (relativePath === "public/js/core/wordlist.mjs") continue;
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
  // app.mjs resolves ids through the $() helper with template literals;
  // also collect plain $("#id") call arguments in $("...") form.
  for (const match of appSource.matchAll(/\$\("([a-z0-9-]+)"\)/g)) {
    referencedIds.add(match[1]);
  }
  for (const id of referencedIds) {
    if (!zhIds.has(id)) failures.push(`app.mjs: element #${id} is missing from the pages`);
  }

  const coreFiles = ["password.mjs", "wordlist.mjs"];
  let coreSource = "";
  for (const file of coreFiles) {
    const source = await readFile(resolve(root, "public/js/core", file), "utf8");
    if (file === "wordlist.mjs") {
      // Data-shape guard in place of the code scans: a single frozen
      // array export and no executable constructs.
      if (!source.includes("export const WORDS = Object.freeze([")) {
        failures.push("core/wordlist.mjs: must be a single frozen WORDS array export");
      }
      if (/(=>|\bfunction\b|\bimport\b|\brequire\b)/.test(source.replace(/"[^"]*"/g, ""))) {
        failures.push("core/wordlist.mjs: data module must not contain executable constructs");
      }
      continue;
    }
    if (/\bdocument\b|\bwindow\b/.test(source)) {
      failures.push(`core/${file}: the pure core must not reference the DOM`);
    }
    coreSource = source;
  }
  if (!coreSource.includes("getRandomValues")) {
    failures.push("core/password.mjs: crypto.getRandomValues must be the randomness source");
  }

  const core = await import(pathToFileURL(resolve(root, "public/js/core/password.mjs")).href);
  const wordlist = await import(pathToFileURL(resolve(root, "public/js/core/wordlist.mjs")).href);
  const words = wordlist.WORDS;
  if (!Array.isArray(words) || words.length !== 7776) {
    failures.push("wordlist.mjs: the bundled list must carry exactly 7,776 words (SPEC section 4)");
  } else {
    if (new Set(words).size !== words.length) {
      failures.push("wordlist.mjs: words must be unique");
    }
    if (words.some((word) => typeof word !== "string" || word.length === 0)) {
      failures.push("wordlist.mjs: every entry must be a non-empty string");
    }
  }
  if (core.buildPool({}).poolSize !== 88) {
    failures.push("password.mjs: the full pool must be 88 (SPEC section 4)");
  }
  const noAmbiguous = core.buildPool({ excludeAmbiguous: true });
  if (noAmbiguous.poolSize !== 83) {
    failures.push("password.mjs: ambiguous exclusion must remove exactly 5 characters (pool 83)");
  }
  const fixtureWeak = core.checkStrength("password");
  if (core.formatBits(fixtureWeak.finalBits) !== "17.6" || fixtureWeak.band !== "VERY_WEAK") {
    failures.push("password.mjs: normative fixture 'password' must give 17.6, very weak");
  }
  const fixtureFair = core.checkStrength("Xq7!mZ2#");
  if (core.formatBits(fixtureFair.finalBits) !== "51.7" || fixtureFair.band !== "FAIR") {
    failures.push("password.mjs: normative fixture 'Xq7!mZ2#' must give 51.7, fair");
  }
  const sampler = core.createSampler(() => 0);
  if (sampler.drawIndex(7776) !== 0) {
    failures.push("password.mjs: sampler must handle pools above 256 (word list indices)");
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
