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
  "public/js/core/sleep-cycle.mjs",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
  "test/core.test.mjs",
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
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="./index.html">',
      '<link rel="alternate" hreflang="en" href="./en/index.html">',
      '<link rel="alternate" hreflang="x-default" href="./index.html">',
    ]),
    honestyPhrases: Object.freeze(["約 90 分鐘", "不同", "不是醫療建議", "7–9 小時"]),
  }),
  "en/index.html": Object.freeze({
    lang: "en",
    alternates: Object.freeze([
      '<link rel="alternate" hreflang="zh-Hant" href="../index.html">',
      '<link rel="alternate" hreflang="en" href="./index.html">',
      '<link rel="alternate" hreflang="x-default" href="../index.html">',
    ]),
    honestyPhrases: Object.freeze(["about 90 minutes", "varies", "not medical advice", "7–9 hours"]),
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
  if (!csp || !csp[1].includes("connect-src 'none'") || !csp[1].includes("default-src 'self'")) {
    failures.push(`${page}: CSP meta missing or weaker than the house policy`);
  }
  const title = active.match(/<title>([^<]+)<\/title>/);
  if (!title || title[1].trim() === "") failures.push(`${page}: title is missing or empty`);
  const description = active.match(/<meta name="description" content="([^"]+)"/);
  if (!description || description[1].trim() === "") {
    failures.push(`${page}: meta description is missing or empty`);
  }
  if (!active.includes('<a href="../../">')) {
    failures.push(`${page}: same-language home link (../../) is missing`);
  }
  if (/<h1>[^<]+<\/h1>/.test(active) === false) {
    failures.push(`${page}: h1 is missing or empty`);
  }
  // SPEC sections 1 and 5: the honesty framing must be on the page —
  // 90 minutes is a varying average, results are not medical advice,
  // and the general 7-9 hour note is present.
  for (const phrase of expected.honestyPhrases) {
    if (!active.includes(phrase)) {
      failures.push(`${page}: honesty phrase missing: ${phrase}`);
    }
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
  if (packageJson.name !== "glossquote-labs-sleep-cycle-calculator") {
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
    [...appSource.matchAll(/querySelector\("#([a-z0-9-]+)"\)/g)].map((match) => match[1]),
  );
  for (const id of referencedIds) {
    if (!zhIds.has(id)) failures.push(`app.js: element #${id} is missing from the pages`);
  }

  const coreSource = await readFile(resolve(root, "public/js/core/sleep-cycle.mjs"), "utf8");
  if (/\bdocument\b|\bwindow\b/.test(coreSource)) {
    failures.push("core/sleep-cycle.mjs: the pure core must not reference the DOM");
  }

  const i18nModule = await import(pathToFileURL(resolve(root, "public/js/i18n.mjs")).href);
  const dictionaries = i18nModule.STRINGS;
  const sortKeys = (obj) => Object.keys(obj).sort();
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"])) !== JSON.stringify(sortKeys(dictionaries.en))) {
    failures.push("i18n.mjs: key sets differ between languages");
  }
  if (JSON.stringify(sortKeys(dictionaries["zh-Hant"].labels)) !== JSON.stringify(sortKeys(dictionaries.en.labels))) {
    failures.push("i18n.mjs: label key sets differ between languages");
  }

  // SPEC section 4 constants and fixtures, re-asserted through the
  // shipped core so a drift in the auditable constants fails the check.
  const core = await import(pathToFileURL(resolve(root, "public/js/core/sleep-cycle.mjs")).href);
  if (core.CYCLE_MINUTES !== 90 || core.DAY_MINUTES !== 1440) {
    failures.push("core: cycle length or day length differs from SPEC section 4");
  }
  if (core.LATENCY_MIN !== 0 || core.LATENCY_MAX !== 60 || core.LATENCY_DEFAULT !== 15) {
    failures.push("core: latency bounds or default differ from SPEC section 4");
  }
  if (JSON.stringify(core.WAKE_DIRECTION_CYCLES) !== "[6,5,4,3]" || JSON.stringify(core.BED_DIRECTION_CYCLES) !== "[3,4,5,6]") {
    failures.push("core: row cycle-count orders differ from SPEC section 4");
  }
  if (JSON.stringify(core.RECOMMENDED_CYCLES) !== "[5,6]") {
    failures.push("core: recommended cycle set differs from SPEC section 4");
  }
  const s1 = core.bedtimeRows(420, 15);
  if (s1[0].time !== "21:45" || s1[0].labelKey !== "previous-evening" || s1[3].time !== "02:15" || s1[3].labelKey !== "same-morning") {
    failures.push("core: fixture S1 is not reproduced exactly");
  }
  const s2 = core.wakeTimeRows(1380, 15);
  if (s2.some((row) => row.labelKey !== "next-morning") || s2[0].time !== "03:45" || s2[3].time !== "08:15") {
    failures.push("core: fixture S2 is not reproduced exactly");
  }
  const s3 = core.bedtimeRows(390, 0);
  if (s3.some((row) => row.sleep !== row.inBed) || s3[0].time !== "21:30" || s3[3].time !== "02:00") {
    failures.push("core: fixture S3 (zero latency identity) is not reproduced exactly");
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
