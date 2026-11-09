// Checks the generated output of build:preview / build:production
// against MANIFEST.txt: every manifest file exists with the recorded
// sha256, no extra files are present.
// preview: dist/ pages carry noindex and robots.txt denies all.
// production: dist-production/ has no noindex, robots.txt allows and
// announces the sitemap, and sitemap.xml lists exactly the two
// canonical pages.
// Usage: node scripts/check-generated.mjs <preview|production>

import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mode = process.argv[2];
if (mode !== "preview" && mode !== "production") {
  console.error("usage: node scripts/check-generated.mjs <preview|production>");
  process.exit(2);
}
const DIST_ROOT = resolve(
  PROJECT_ROOT,
  mode === "preview" ? "dist" : "dist-production",
);
const failures = [];

function fail(message) {
  failures.push(message);
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

const manifestText = await readFile(resolve(DIST_ROOT, "MANIFEST.txt"), "utf8").catch(
  () => null,
);
if (manifestText === null) {
  fail("MANIFEST.txt is missing; run the build first");
} else {
  const expected = new Map();
  for (const line of manifestText.trim().split("\n")) {
    const [hash, rel] = line.split(/  +/);
    expected.set(rel, hash);
  }
  const onDisk = await walk(DIST_ROOT).catch(() => null);
  if (onDisk === null) {
    fail("dist output is missing; run the build first");
  } else {
    for (const rel of onDisk) {
      if (rel === "MANIFEST.txt") continue;
      if (!expected.has(rel)) fail(`output has an extra file not in the manifest: ${rel}`);
    }
    for (const [rel, hash] of expected) {
      const full = resolve(DIST_ROOT, rel);
      const stat = await lstat(full).catch(() => null);
      if (stat === null || !stat.isFile()) {
        fail(`manifest file missing from output: ${rel}`);
        continue;
      }
      const actual = createHash("sha256").update(await readFile(full)).digest("hex");
      if (actual !== hash) fail(`sha256 mismatch: ${rel}`);
    }
  }
}

const robots = await readFile(resolve(DIST_ROOT, "robots.txt"), "utf8").catch(
  () => null,
);
for (const page of ["index.html", "en/index.html"]) {
  const html = await readFile(resolve(DIST_ROOT, page), "utf8").catch(() => null);
  if (html === null) {
    fail(`${page} is missing from the output`);
    continue;
  }
  if (!html.includes('rel="canonical"')) fail(`${page}: missing canonical`);
  if (mode === "preview") {
    if (!html.includes('content="noindex, nofollow"')) {
      fail(`${page}: preview must be noindex, nofollow`);
    }
  } else {
    if (html.includes("noindex")) fail(`${page}: production must not be noindex`);
  }
}
if (mode === "preview") {
  if (robots === null || !robots.includes("Disallow: /")) {
    fail("robots.txt must deny all crawling in preview");
  }
  const sitemap = await lstat(resolve(DIST_ROOT, "sitemap.xml")).catch(() => null);
  if (sitemap !== null) fail("preview must not ship a sitemap");
} else {
  if (robots === null || !robots.includes("Allow: /") || !robots.includes("Sitemap:")) {
    fail("production robots.txt must allow crawling and announce the sitemap");
  }
  const sitemap = await readFile(resolve(DIST_ROOT, "sitemap.xml"), "utf8").catch(
    () => null,
  );
  if (sitemap === null) {
    fail("production sitemap.xml is missing");
  } else {
    const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    if (locs.length !== 2) fail(`production sitemap must list exactly 2 canonicals, found ${locs.length}`);
    if (!locs.every((loc) => loc.startsWith("https://"))) {
      fail("production sitemap canonicals must be HTTPS");
    }
  }
}

if (failures.length > 0) {
  console.error(`check:generated:${mode} failed (${failures.length}):`);
  for (const message of failures) console.error(` - ${message}`);
  process.exit(1);
}
console.log(`check:generated:${mode} passed`);
