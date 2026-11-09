// Verifies the generated preview output against BUILD-MANIFEST.json:
// every listed file exists in dist-preview/ with matching bytes and
// SHA-256, and no extra files are present.

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_ROOT = resolve(PROJECT_ROOT, "dist-preview");

const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
const mode = modeArg ? process.argv[process.argv.indexOf(modeArg) + 1] ?? modeArg.split("=")[1] : undefined;
if (mode !== "preview") {
  throw new Error("Explicit --mode preview is required.");
}

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
}

const manifest = JSON.parse(await readFile(resolve(PROJECT_ROOT, "BUILD-MANIFEST.json"), "utf8"));
check(manifest.mode === "preview", "manifest mode must be preview");
check(Array.isArray(manifest.files) && manifest.files.length > 0, "manifest must list files");

async function collect(directory, base = directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await collect(full, base)));
    else found.push(relative(base, full).split(sep).join("/"));
  }
  return found.sort();
}

const actualFiles = await collect(DIST_ROOT);
const expectedFiles = manifest.files.map((entry) => entry.path).sort();
check(
  JSON.stringify(actualFiles) === JSON.stringify(expectedFiles),
  `dist-preview contents differ from manifest (actual: ${actualFiles.join(", ")})`,
);

for (const entry of manifest.files) {
  const bytes = await readFile(resolve(DIST_ROOT, entry.path)).catch(() => null);
  check(bytes !== null, `missing file in dist-preview: ${entry.path}`);
  if (bytes === null) continue;
  check(bytes.length === entry.bytes, `byte count mismatch: ${entry.path}`);
  check(
    createHash("sha256").update(bytes).digest("hex") === entry.sha256,
    `SHA-256 mismatch: ${entry.path}`,
  );
}

const robots = await readFile(resolve(DIST_ROOT, "robots.txt"), "utf8").catch(() => "");
check(robots === "User-agent: *\nDisallow: /\n", "robots.txt must deny all");

if (failures.length > 0) {
  console.error(`check:generated:preview failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`check:generated:preview ok: ${manifest.files.length} files verified in dist-preview/`);
