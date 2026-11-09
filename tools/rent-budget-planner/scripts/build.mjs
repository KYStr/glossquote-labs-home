// Reproducible preview build: copies the public/ allowlist into dist-preview/
// (or --out <dir>) in sorted order, byte for byte. No network, no transforms,
// so two runs always produce identical bytes.

import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

function parseArgs(argv) {
  const args = { mode: "preview", out: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--mode") args.mode = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else throw new Error("Unknown argument: " + argv[i]);
  }
  if (args.mode !== "preview") throw new Error("Only --mode preview is supported.");
  return args;
}

async function collectFiles(dir, base) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const full = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Symlinks are not allowed in public/: " + full);
    if (entry.isDirectory()) files.push(...(await collectFiles(full, base)));
    else if (entry.isFile()) {
      if (!ALLOWED_EXTENSIONS.has(extname(entry.name))) {
        throw new Error("File type is not in the build allowlist: " + full);
      }
      files.push(relative(base, full));
    }
  }
  return files;
}

export async function buildPreview(outDir) {
  const publicRoot = resolve(PROJECT_ROOT, "public");
  const info = await lstat(publicRoot);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("public/ must be a regular directory.");
  }
  const files = await collectFiles(publicRoot, publicRoot);
  await rm(outDir, { recursive: true, force: true });
  for (const rel of files) {
    const dest = join(outDir, rel);
    await mkdir(resolve(dest, ".."), { recursive: true });
    await copyFile(join(publicRoot, rel), dest);
  }
  return files;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = parseArgs(process.argv.slice(2));
  const outDir = args.out ? resolve(args.out) : resolve(PROJECT_ROOT, "dist-preview");
  const files = await buildPreview(outDir);
  console.log("Built " + files.length + " files into " + outDir.split(sep).join("/"));
  for (const file of files) console.log("  " + file.split(sep).join("/"));
}
