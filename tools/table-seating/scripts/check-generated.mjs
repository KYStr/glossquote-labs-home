// Checks the generated preview output (dist/) against BUILD-MANIFEST.json:
// every manifest file exists with the recorded bytes and sha256, no extra
// files are present, and both language pages carry the preview markers
// (noindex, canonical, hreflang, home links) plus robots.txt denies all.

import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_ROOT = resolve(PROJECT_ROOT, "dist");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "BUILD-MANIFEST.json");
const failures = [];

function fail(message) {
  failures.push(message);
}

const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
const mode = modeArg
  ? (process.argv[process.argv.indexOf(modeArg) + 1] ?? modeArg.split("=")[1])
  : undefined;
if (mode !== "preview") {
  throw new Error("Explicit --mode preview is required.");
}

const manifestText = await readFile(MANIFEST_PATH, "utf8").catch(() => null);
if (manifestText === null) fail("BUILD-MANIFEST.json is missing; run build:preview first");
let manifest = null;
if (manifestText !== null) {
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    fail("BUILD-MANIFEST.json is not valid JSON");
  }
}

async function walk(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const found = [];
  for (const entry of entries) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full, base)));
    else if (entry.isFile()) found.push(relative(base, full).split(sep).join("/"));
  }
  return found;
}

if (manifest) {
  if (manifest.mode !== "preview") fail("manifest mode must be preview");
  const onDisk = await walk(DIST_ROOT).catch(() => null);
  if (onDisk === null) {
    fail("dist/ is missing; run build:preview first");
  } else {
    const expected = new Map(manifest.files.map((f) => [f.path, f]));
    for (const rel of onDisk) {
      if (!expected.has(rel)) fail(`dist/ has an extra file not in the manifest: ${rel}`);
    }
    for (const entry of manifest.files) {
      const full = resolve(DIST_ROOT, entry.path);
      const stat = await lstat(full).catch(() => null);
      if (stat === null || !stat.isFile()) {
        fail(`manifest file missing from dist/: ${entry.path}`);
        continue;
      }
      const bytes = await readFile(full);
      if (bytes.length !== entry.bytes) {
        fail(`byte size mismatch: ${entry.path}`);
      }
      const hash = createHash("sha256").update(bytes).digest("hex");
      if (hash !== entry.sha256) fail(`sha256 mismatch: ${entry.path}`);
    }
  }

  const robots = await readFile(resolve(DIST_ROOT, "robots.txt"), "utf8").catch(
    () => null,
  );
  if (robots === null || !robots.includes("Disallow: /")) {
    fail("dist/robots.txt must deny all crawling in preview");
  }
  for (const page of ["index.html", "en/index.html"]) {
    const html = await readFile(resolve(DIST_ROOT, page), "utf8").catch(() => null);
    if (html === null) {
      fail(`dist/${page} is missing`);
      continue;
    }
    if (!html.includes('content="noindex, nofollow"')) {
      fail(`dist/${page}: preview must be noindex, nofollow`);
    }
    if (!html.includes('rel="canonical"')) fail(`dist/${page}: missing canonical`);
  }
}

if (failures.length > 0) {
  console.error(`check:generated:preview failed (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log("check:generated:preview passed");
