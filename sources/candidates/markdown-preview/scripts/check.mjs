// Project check for the Markdown Preview and HTML Export candidate.
//
// Two deliberate deviations from the house check template, both driven
// by the SPEC: (1) the page CSP allows http/https/data images because
// SPEC section 2 states the browser loads <img> URLs the user put in a
// draft (the tool itself never fetches); (2) the "innerHTML" token is
// NOT forbidden for the controller, because SPEC section 4 mandates
// building the preview by assigning the core's fully-escaped
// serialised string once — safety is proven here by re-running the
// hostile fixtures against the core and asserting inert output.

import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const REQUIRED_PATHS = Object.freeze([
  "public/index.html",
  "public/en/index.html",
  "public/styles/tokens.css",
  "public/styles/app.css",
  "public/js/app.mjs",
  "public/js/i18n.mjs",
  "public/js/core/markdown.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/cloudflare.mjs",
  "scripts/release.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/controller.test.mjs",
  "README.md",
  "PRODUCTION-STATUS.md",
  "VERIFICATION.md",
  "CANDIDATE-MANIFEST.json",
  ".gitignore",
  "package.json",
  "wrangler.jsonc",
]);

const EXPECTED_SCRIPTS = {
  dev: "node scripts/serve.mjs",
  test: "node --test",
  check: "node scripts/check.mjs",
  build: "node scripts/build.mjs",
};

// Storage/network tokens are assembled so this file does not match its
// own scan. innerHTML is deliberately absent (see the header note).
const forbiddenTokens = [
  "local" + "Storage",
  "session" + "Storage",
  "indexed" + "DB",
  "document." + "cookie",
  "ev" + "al(",
  "fet" + "ch(",
  "XMLHttp" + "Request",
  "Web" + "Socket",
  "send" + "Beacon",
  "history.push" + "State",
  "history.replace" + "State",
  "clipboard." + "read",
  "Math." + "random",
];

function stripComments(source, isHtml = false) {
  if (isHtml) return source.replace(/<!--[\s\S]*?-->/g, "");
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

async function collectFiles(root, directories) {
  const paths = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) paths.push(path);
    }
  }
  for (const directory of directories) {
    const absolute = resolve(root, directory);
    try {
      await lstat(absolute);
    } catch {
      continue;
    }
    await visit(absolute);
  }
  return paths;
}

function countOccurrences(source, needle) {
  let count = 0;
  let index = 0;
  while ((index = source.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

const idsOf = (source) =>
  new Set([...source.matchAll(/ id="([\w-]+)"/g)].map((m) => m[1]));

export async function runProjectCheck(projectPath = PROJECT_ROOT) {
  const root = projectPath;
  const failures = [];

  const checkPage = (source, label, expected) => {
    if (countOccurrences(source, 'http-equiv="Content-Security-Policy"') !== 1) {
      failures.push(`${label}: expected exactly one CSP meta`);
    }
    const cspMatch = source.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/s);
    const expectedCsp =
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https: http:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
    if (!cspMatch || cspMatch[1] !== expectedCsp) failures.push(`${label}: CSP meta mismatch`);
    if (countOccurrences(source, "noindex, nofollow") !== 1) {
      failures.push(`${label}: expected exactly one robots meta`);
    }
    if (!source.includes(`<html lang="${expected.lang}">`)) {
      failures.push(`${label}: html lang must be ${expected.lang}`);
    }
    if (!source.includes('hreflang="zh-Hant"') || !source.includes('hreflang="en"')) {
      failures.push(`${label}: missing hreflang alternates`);
    }
    if (!source.includes('href="https://glossquote.com/"')) {
      failures.push(`${label}: missing GlossQuote home anchor`);
    }
    const hrefs = [...source.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const anchors = ["https://glossquote.com/", "https://units.glossquote.com/"];
    for (const href of hrefs) {
      if (/^https?:\/\//.test(href) && !anchors.includes(href)) {
        failures.push(`${label}: unexpected external href ${href}`);
      }
    }
  };

  for (const required of REQUIRED_PATHS) {
    try {
      await readFile(resolve(root, required));
    } catch {
      failures.push(`missing required path: ${required}`);
    }
  }

  const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (packageJson.name !== "glossquote-labs-markdown-preview") {
    failures.push("package.json name must be glossquote-labs-markdown-preview");
  }
  if (packageJson.type !== "module") failures.push("package.json type must be module");
  if (packageJson.engines?.node !== ">=24") failures.push("package.json engines.node must be >=24");
  for (const [name, command] of Object.entries(EXPECTED_SCRIPTS)) {
    if (packageJson.scripts?.[name] !== command) {
      failures.push(`package.json script ${name} must be exactly: ${command}`);
    }
  }
  if (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    failures.push("package.json must have zero runtime dependencies");
  }
  const wrangler = await readFile(resolve(root, "wrangler.jsonc"), "utf8");
  if (!wrangler.includes('"name": "glossquote-labs-markdown-preview"')) {
    failures.push("wrangler.jsonc name must be glossquote-labs-markdown-preview");
  }
  if (!wrangler.includes('"directory": "./dist"')) {
    failures.push("wrangler.jsonc must publish ./dist as assets");
  }

  const managed = await collectFiles(root, ["public", "scripts", "test"]);
  for (const path of managed) {
    const relativePath = relative(root, path).split(sep).join("/");
    const source = await readFile(path, "utf8");
    const stripped = stripComments(source, extname(path).toLowerCase() === ".html");
    for (const token of forbiddenTokens) {
      if (stripped.includes(token)) failures.push(`${relativePath}: forbidden token ${token}`);
    }
  }

  // innerHTML discipline: exactly one assignment site in the
  // controller, always the core-produced string (or the empty hint).
  const appSource = stripComments(await readFile(resolve(root, "public/js/app.mjs"), "utf8"));
  const innerHtmlUses = appSource.match(/\.innerHTML\s*=/g) ?? [];
  if (innerHtmlUses.length !== 1) {
    failures.push("app.mjs: the preview assignment must be the single innerHTML site");
  }
  if (appSource.includes("insertAdjacentHTML") || appSource.includes("document.write")) {
    failures.push("app.mjs: forbidden DOM injection API");
  }

  const zhPage = await readFile(resolve(root, "public/index.html"), "utf8");
  const enPage = await readFile(resolve(root, "public/en/index.html"), "utf8");
  checkPage(zhPage, "public/index.html", { lang: "zh-Hant" });
  checkPage(enPage, "public/en/index.html", { lang: "en" });
  const zhIds = idsOf(zhPage);
  const enIds = idsOf(enPage);
  for (const id of zhIds) if (!enIds.has(id)) failures.push(`en page missing id: ${id}`);
  for (const id of enIds) if (!zhIds.has(id)) failures.push(`zh page missing id: ${id}`);
  const appIds = new Set(
    [...appSource.matchAll(/\(\s*doc,\s*"([\w-]+)"\)/g)].map((m) => m[1]),
  );
  if (appIds.size === 0) failures.push("could not extract app element ids");
  for (const id of appIds) {
    if (!zhIds.has(id)) failures.push(`app references id absent from pages: ${id}`);
  }

  const markdownModule = await import(
    pathToFileURL(resolve(root, "public/js/core/markdown.mjs")).href
  );
  const coreSource = await readFile(resolve(root, "public/js/core/markdown.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/markdown.mjs: the pure core must not reference the DOM");
  }
  const { renderDocument, buildExportDocument, MAX_SOURCE_CHARS } = markdownModule;
  if (MAX_SOURCE_CHARS !== 200000) failures.push("MAX_SOURCE_CHARS must be 200000");
  const expectHtml = (input, expected, label) => {
    const actual = renderDocument(input).html;
    if (actual !== expected) {
      failures.push(`normative fixture ${label}: expected ${expected}, got ${actual}`);
    }
  };
  expectHtml("# Title", "<h1>Title</h1>", "atx");
  expectHtml("a_b_c", "<p>a_b_c</p>", "intraword-underscore");
  expectHtml("**b** and ~~s~~", "<p><strong>b</strong> and <del>s</del></p>", "strong-del");
  expectHtml("<script>alert(1)</script>", "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>", "hostile-script");
  expectHtml("[x](javascript:alert(1))", "<p>x</p>", "hostile-scheme");
  expectHtml("- [ ] todo", '<ul>\n<li><input type="checkbox" disabled> todo</li>\n</ul>', "task");
  expectHtml(
    "| A | B |\n|:--|--:|",
    '<table>\n<thead>\n<tr><th align="left">A</th><th align="right">B</th></tr>\n</thead>\n<tbody>\n\n</tbody>\n</table>',
    "table-align",
  );
  if (renderDocument("中文 test").renderedWords !== 3) {
    failures.push("counts fixture: CJK-aware word count mismatch");
  }
  const exportOnce = buildExportDocument({ bodyHtml: "<p>x</p>", title: "T", lang: "en" });
  const exportTwice = buildExportDocument({ bodyHtml: "<p>x</p>", title: "T", lang: "en" });
  if (exportOnce !== exportTwice) failures.push("export must be byte-deterministic");

  const i18n = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const langs = Object.keys(i18n.DICTIONARIES).sort();
  if (langs.join(",") !== "en,zh-Hant") failures.push("i18n must define exactly en and zh-Hant");
  const keySet = (obj, prefix = "") =>
    Object.entries(obj).flatMap(([key, value]) =>
      value && typeof value === "object" && !Array.isArray(value)
        ? keySet(value, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    );
  const baseKeys = keySet(i18n.DICTIONARIES["zh-Hant"]).sort().join("\n");
  for (const lang of langs) {
    if (keySet(i18n.DICTIONARIES[lang]).sort().join("\n") !== baseKeys) {
      failures.push(`i18n key parity failed for ${lang}`);
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
