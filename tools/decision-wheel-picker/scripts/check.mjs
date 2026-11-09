import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const REQUIRED_PATHS = Object.freeze([
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/i18n.mjs",
  "public/js/core/wheel.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/session.test.mjs",
  "test/distribution.test.mjs",
  "HANDOFF.md",
  "VERIFICATION.md",
]);

const EXPECTED_SCRIPTS = Object.freeze({
  test: "node --test",
  check: "node scripts/check.mjs",
  "build:preview": "node scripts/build.mjs",
  "check:generated:preview": "node scripts/check.mjs --generated",
});

// Forbidden capabilities, assembled from fragments so this file does not
// match its own scan. The SPEC (sections 5-6) forbids storage, network,
// markup injection, dynamic code execution, and any non-crypto random
// source anywhere in the shipped product.
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
  ["Math", ".random"],
].map((parts) => parts.join(""));

const SCANNED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const EXPECTED_PAGES = Object.freeze({
  "index.html": Object.freeze({
    lang: "zh-Hant",
    home: 'href="../../"',
    alternates: Object.freeze([
      '<link rel="canonical" href="./index.html">',
      '<link rel="alternate" hreflang="zh-Hant" href="./index.html">',
      '<link rel="alternate" hreflang="en" href="./en/index.html">',
      '<link rel="alternate" hreflang="x-default" href="./index.html">',
    ]),
    lowStakes: "賭博",
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    home: 'href="../../../en/"',
    alternates: Object.freeze([
      '<link rel="canonical" href="./index.html">',
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
    lowStakes: "gambling",
  }),
});

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
  const robots = '<meta name="robots" content="noindex, nofollow">';
  if (active.split(robots).length !== 2) {
    failures.push(`${page}: exactly one preview robots meta is required`);
  }
  for (const link of expected.alternates) {
    if (active.split(link).length !== 2) {
      failures.push(`${page}: missing or duplicated link ${link}`);
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
  if (!active.includes(expected.home)) {
    failures.push(`${page}: same-language home link is missing`);
  }
  // SPEC sections 1, 5 and 6: the explainer must name the crypto source
  // and the low-stakes note must be permanently visible.
  if (!active.includes("crypto.getRandomValues")) {
    failures.push(`${page}: the fairness explainer must name crypto.getRandomValues`);
  }
  if (!active.includes(expected.lowStakes)) {
    failures.push(`${page}: the low-stakes note is missing`);
  }
  const external = [...active.matchAll(/(?:href|src)="https?:[^"]+"/g)];
  if (external.length > 0) failures.push(`${page}: external resources are not allowed`);
}

function scriptedSource(values) {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error("scripted source exhausted");
    const v = values[i];
    i += 1;
    return v;
  };
}

async function checkCoreContract(root, failures) {
  const core = await import(
    pathToFileURL(resolve(root, "public/js/core/wheel.mjs")).href
  );
  // SPEC section 4 fixtures W1-W3, re-derived here independently of the
  // test suites so a broken core cannot pass check by editing tests.
  const w1 = core.parseEntries(" 壽司 \n\n拉麵\n  \n火鍋 \n壽司");
  if (JSON.stringify(w1.entries) !== JSON.stringify(["壽司", "拉麵", "火鍋", "壽司"])) {
    failures.push("core: fixture W1 parsing differs from SPEC section 4");
  }
  if (core.drawLimit(3) !== 4294967295 || core.drawLimit(6) !== 4294967292) {
    failures.push("core: draw limits for n=3 / n=6 differ from SPEC section 4");
  }
  const w2 = core.drawIndex(3, scriptedSource([4294967295, 4294967294]));
  if (w2.index !== 2 || w2.rejected !== 1) {
    failures.push("core: fixture W2 rejection mapping differs from SPEC section 4");
  }
  const w3 = core.drawIndex(6, scriptedSource([4294967292, 4294967295, 4294967291]));
  if (w3.index !== 5 || w3.rejected !== 2) {
    failures.push("core: fixture W3 rejection mapping differs from SPEC section 4");
  }
  const i18n = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const zhKeys = Object.keys(i18n.STRINGS["zh-Hant"]).sort();
  const enKeys = Object.keys(i18n.STRINGS.en).sort();
  if (JSON.stringify(zhKeys) !== JSON.stringify(enKeys)) {
    failures.push("i18n.mjs: string key sets differ between languages");
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
  if (packageJson.name !== "glossquote-labs-decision-wheel-picker") {
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

  const coreSource = await readFile(resolve(root, "public/js/core/wheel.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/wheel.mjs: the pure core must not reference the DOM");
  }

  await checkCoreContract(root, failures);

  if (failures.length > 0) throw new Error(`Project check failed:\n- ${failures.join("\n- ")}`);
  return true;
}

// The generated preview must mirror the public tree exactly, byte for
// byte; that is what makes the preview build reproducible.
export async function checkGeneratedPreview(projectPath = PROJECT_ROOT) {
  const root = await realpath(resolve(projectPath));
  const distPath = resolve(root, "dist-preview");
  let distInfo;
  try {
    distInfo = await lstat(distPath);
  } catch {
    throw new Error("dist-preview is missing; run npm run build:preview first.");
  }
  if (!distInfo.isDirectory() || distInfo.isSymbolicLink()) {
    throw new Error("dist-preview must be a regular directory.");
  }
  const publicFiles = await collectFiles(root, ["public"]);
  const expected = publicFiles
    .map((path) => relative(resolve(root, "public"), path).split(sep).join("/"))
    .sort();
  const actualFiles = await collectFiles(root, ["dist-preview"]);
  const actual = actualFiles
    .map((path) => relative(distPath, path).split(sep).join("/"))
    .sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Preview output must mirror the public tree exactly.");
  }
  for (const relativePath of expected) {
    const [source, built] = await Promise.all([
      readFile(resolve(root, "public", relativePath)),
      readFile(resolve(distPath, relativePath)),
    ]);
    if (!source.equals(built)) throw new Error(`Preview output differs from public: ${relativePath}`);
  }
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).includes("--generated")) {
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
