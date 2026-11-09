// Reproducible preview build: copies public/ verbatim into dist/, adds a
// deny-all robots.txt, and writes BUILD-MANIFEST.json (path, bytes, sha256
// per file, sorted). No timestamps or environment data enter the output, so
// running the build twice produces byte-identical results. Production mode
// is refused: no production origin has been approved for this tool.

import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = resolve(PROJECT_ROOT, "public");
const DIST_ROOT = resolve(PROJECT_ROOT, "dist");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "BUILD-MANIFEST.json");
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
const mode = modeArg
  ? (process.argv[process.argv.indexOf(modeArg) + 1] ?? modeArg.split("=")[1])
  : undefined;
if (mode !== "preview") {
  throw new Error(
    mode === "production"
      ? "Production origin not approved; no production build."
      : "Explicit --mode preview is required.",
  );
}

async function collectFiles(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const files = [];
  for (const entry of entries) {
    const full = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full, base)));
    } else if (entry.isFile()) {
      files.push(relative(base, full).split(sep).join("/"));
    }
  }
  return files;
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

const files = await collectFiles(PUBLIC_ROOT);
const manifest = { mode, files: [] };

await rm(DIST_ROOT, { recursive: true, force: true });
for (const rel of files) {
  const ext = rel.slice(rel.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`Disallowed extension in public/: ${rel}`);
  }
  const source = resolve(PUBLIC_ROOT, rel);
  const target = resolve(DIST_ROOT, rel);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
  const bytes = await readFile(target);
  manifest.files.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
}

// Preview robots: block all crawling; no sitemap in preview.
const robots = "User-agent: *\nDisallow: /\n";
await writeFile(resolve(DIST_ROOT, "robots.txt"), robots, "utf8");
manifest.files.push({
  path: "robots.txt",
  bytes: Buffer.byteLength(robots),
  sha256: sha256(Buffer.from(robots, "utf8")),
});

manifest.files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `build:preview wrote ${manifest.files.length} files to dist/ (manifest: BUILD-MANIFEST.json)`,
);
