import { lstat, readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const REQUIRED_PATHS = Object.freeze([
  "package.json",
  "HANDOFF.md",
  "VERIFICATION.md",
  "public/index.html",
  "public/en/index.html",
  "public/styles/app.css",
  "public/js/app.js",
  "public/js/i18n.mjs",
  "public/js/core/curtain-repeat-cut.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
  "test/flow.test.mjs",
]);

const EXPECTED_SCRIPTS = Object.freeze({
  test: "node --test",
  check: "node scripts/check.mjs",
  "build:preview": "node scripts/build.mjs",
  "check:generated:preview": "node scripts/check-generated.mjs",
});

// Forbidden runtime capabilities, assembled from fragments so this
// file does not match its own scan (house approach).
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
  ["new", " Function"],
  ["fe", "tch"],
  ["XML", "Http", "Request"],
  ["Web", "Socket"],
  ["Event", "Source"],
  ["send", "Beacon"],
  ["history.", "pushState"],
  ["history.", "replaceState"],
].map((parts) => parts.join(""));

const SCANNED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const EXPECTED_HEAD = Object.freeze({
  "index.html": Object.freeze({
    lang: "zh-Hant",
    title: "窗簾同花位落剪｜Gloss Tools",
    homeLink: '<a href="../../">',
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="./index.html">',
      '<link rel="alternate" hreflang="en" href="./en/index.html">',
      '<link rel="alternate" hreflang="x-default" href="./index.html">',
    ]),
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    title: "Curtain Pattern Cuts | Gloss Tools",
    homeLink: '<a href="../../en/">',
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
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
      if (info.isSymbolicLink()) throw new Error(`Symbolic link in managed tree: ${relative(root, path)}`);
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
  const expected = EXPECTED_HEAD[page];
  const active = stripComments(html, true);
  if (!active.includes(`<html lang="${expected.lang}">`)) {
    failures.push(`${page}: html lang must be ${expected.lang}`);
  }
  const robots = '<meta name="robots" content="noindex, nofollow">';
  if (active.split(robots).length !== 2) {
    failures.push(`${page}: exactly one preview robots meta is required`);
  }
  if (active.split('<link rel="canonical" href="./index.html">').length !== 2) {
    failures.push(`${page}: relative canonical link is missing or duplicated`);
  }
  for (const alternate of expected.alternates) {
    if (active.split(alternate).length !== 2) {
      failures.push(`${page}: missing or duplicated alternate link ${alternate}`);
    }
  }
  const csp = active.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  if (!csp || !csp[1].includes("default-src 'none'") || !csp[1].includes("script-src 'self'") || !csp[1].includes("connect-src 'none'")) {
    failures.push(`${page}: CSP meta missing or weaker than the SPEC policy`);
  }
  const title = active.match(/<title>([^<]+)<\/title>/);
  if (!title || title[1] !== expected.title) {
    failures.push(`${page}: title must be "${expected.title}"`);
  }
  const description = active.match(/<meta name="description" content="([^"]+)"/);
  if (!description || description[1].trim() === "") {
    failures.push(`${page}: meta description is missing or empty`);
  }
  if (!active.includes(expected.homeLink)) {
    failures.push(`${page}: same-language home link is missing`);
  }
  if (/<h1>[^<]+<\/h1>/.test(active) === false) {
    failures.push(`${page}: h1 is missing or empty`);
  }
}

export async function runProjectCheck(projectPath = PROJECT_ROOT) {
  const failures = [];
  const root = resolve(projectPath);

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
  if (packageJson.name !== "glossquote-labs-curtain-repeat-cut") {
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
        failures.push(`${relativePath}: external URL is not allowed in preview pages: ${url}`);
      }
    }
  }

  const pages = {};
  for (const page of Object.keys(EXPECTED_HEAD)) {
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

  const coreSource = await readFile(resolve(root, "public/js/core/curtain-repeat-cut.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/curtain-repeat-cut.mjs: the pure core must not reference the DOM");
  }

  const i18nModule = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const dictionaries = i18nModule.STRINGS;
  const sortKeys = (obj) => Object.keys(obj).sort();
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"])) !== JSON.stringify(sortKeys(dictionaries.en))) {
    failures.push("i18n.mjs: key sets differ between languages");
  }
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"].errors)) !== JSON.stringify(sortKeys(dictionaries.en.errors))) {
    failures.push("i18n.mjs: error key sets differ between languages");
  }

  // SPEC fixtures and flow cases, re-asserted through the shipped core
  // so a drift in the auditable constants fails the check.
  const core = await import(pathToFileURL(resolve(root, "public/js/core/curtain-repeat-cut.mjs")).href);
  if (core.PANELS_MAX !== 16 || core.INPUT_BYTES_MAX !== 65536) {
    failures.push("core: panel cap or input byte cap differs from the SPEC");
  }
  const matched = core.solve({
    stockMm: 4000, repeatMm: 320, headPhaseMm: 80, motifPhaseMm: 0,
    panels: [
      { name: "A", finishedMm: 1500, topMm: 50, bottomMm: 70 },
      { name: "B", finishedMm: 1500, topMm: 50, bottomMm: 70 },
    ],
  });
  if (matched.status !== "ok" || matched.result.neededMm !== 3730 || matched.result.wasteMm !== 490) {
    failures.push("core: fixture curtain-repeat-cut.matched is not reproduced exactly");
  }
  const phase = core.solve({
    stockMm: 1000, repeatMm: 300, headPhaseMm: 0, motifPhaseMm: 300,
    panels: [{ name: "A", finishedMm: 100, topMm: 0, bottomMm: 0 }],
  });
  if (phase.status !== "error" || phase.error.code !== "PHASE" || phase.error.path !== "/motifPhaseMm") {
    failures.push("core: fixture curtain-repeat-cut.phase-edge is not reproduced exactly");
  }
  const flow = core.createFlow();
  flow.edit({
    stockMm: 4000, repeatMm: 320, headPhaseMm: 80, motifPhaseMm: 0,
    panels: [
      { name: "A", finishedMm: 1500, topMm: 50, bottomMm: 70 },
      { name: "B", finishedMm: 1500, topMm: 50, bottomMm: 70 },
    ],
  });
  flow.run(1);
  flow.cancel();
  flow.edit({
    stockMm: 1800, repeatMm: 0, headPhaseMm: 0, motifPhaseMm: 0,
    panels: [
      { name: "A", finishedMm: 800, topMm: 50, bottomMm: 50 },
      { name: "B", finishedMm: 700, topMm: 20, bottomMm: 30 },
    ],
  });
  flow.run(2);
  flow.settle(2);
  flow.settle(1);
  if (flow.phase !== "ready" || flow.result.neededMm !== 1650) {
    failures.push("core: flow fixture curtain-repeat-cut.cancel-then-late is not reproduced exactly");
  }

  if (failures.length > 0) throw new Error(`Project check failed:\n- ${failures.join("\n- ")}`);
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
