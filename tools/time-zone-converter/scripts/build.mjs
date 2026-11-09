// Reproducible preview build: copies public/ verbatim into dist/, adds a
// deny-all robots.txt, and writes BUILD-MANIFEST.json (path, bytes, sha256
// per file, sorted). No timestamps or environment data enter the output, so
// running the build twice produces byte-identical results. Production mode
// is refused: no production origin has been approved for this tool.

import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC_ROOT = resolve(PROJECT_ROOT, "public");
const DIST_ROOT = resolve(PROJECT_ROOT, "dist");
const MANIFEST_PATH = resolve(PROJECT_ROOT, "BUILD-MANIFEST.json");
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
const mode = modeArg ? process.argv[process.argv.indexOf(modeArg) + 1] ?? modeArg.split("=")[1] : undefined;
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
    const fullPath = resolve(directory, entry.name);
    const info = await lstat(fullPath);
    if (info.isSymbolicLink()) {
      throw new Error(`Symbolic links are not allowed in build sources: ${fullPath}`);
    }
    if (entry.name.startsWith(".")) {
      throw new Error(`Dotfiles are not allowed in build sources: ${fullPath}`);
    }
    if (info.isDirectory()) {
      files.push(...(await collectFiles(fullPath, base)));
      continue;
    }
    if (!info.isFile() || !ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      throw new Error(`Unsupported file type in build sources: ${fullPath}`);
    }
    files.push(relative(base, fullPath).split(sep).join("/"));
  }
  return files;
}

const files = await collectFiles(PUBLIC_ROOT);

await rm(DIST_ROOT, { recursive: true, force: true });
await mkdir(DIST_ROOT, { recursive: true });
for (const path of files) {
  const destination = resolve(DIST_ROOT, path);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(resolve(PUBLIC_ROOT, path), destination);
}
await writeFile(resolve(DIST_ROOT, "robots.txt"), "User-agent: *\nDisallow: /\n", "utf8");

const manifestFiles = [];
for (const path of [...files, "robots.txt"].sort()) {
  const bytes = await readFile(resolve(DIST_ROOT, path));
  manifestFiles.push({
    path,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
const manifest = { mode, files: manifestFiles };
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Preview build: ${manifestFiles.length} files written to dist/ with BUILD-MANIFEST.json`);
