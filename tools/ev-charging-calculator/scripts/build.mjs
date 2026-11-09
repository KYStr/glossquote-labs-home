// Reproducible preview build for the EV Charging Calculator.
// Copies the public/ allowlist into dist-preview/ byte for byte.
// --mode production is refused: no production origin is configured.
// --check verifies dist-preview/ still matches a fresh build exactly.

import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, realpath, rm } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ROOT, runProjectCheck } from "./check.mjs";

const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
  return difference === "" || (
    difference !== ".." &&
    !isAbsolute(difference) &&
    difference.split(sep)[0] !== ".."
  );
}

async function readPathInfo(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error("A build path could not be inspected.");
  }
}

export async function collectPublicFiles(projectRoot) {
  const publicRoot = resolve(projectRoot, "public");
  const rootInfo = await readPathInfo(publicRoot);
  if (!rootInfo || !rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error("The public source must be a regular directory.");
  }
  const canonicalPublic = await realpath(publicRoot);
  if (!isPathInside(projectRoot, canonicalPublic) || canonicalPublic === projectRoot) {
    throw new Error("The public source resolves outside the project.");
  }
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const sourcePath = resolve(directory, entry.name);
      const info = await readPathInfo(sourcePath);
      if (!info) throw new Error("A public source path disappeared during build.");
      if (info.isSymbolicLink()) throw new Error("Symbolic links are not allowed in public build sources.");
      if (entry.name[0] === ".") throw new Error("Dotfiles are not allowed in public build sources.");
      if (info.isDirectory()) {
        await visit(sourcePath);
        continue;
      }
      if (!info.isFile() || !ALLOWED_EXTENSIONS.has(extname(sourcePath).toLowerCase())) {
        throw new Error("A public source file has an unsupported type.");
      }
      const canonicalSource = await realpath(sourcePath);
      if (!isPathInside(canonicalPublic, canonicalSource)) {
        throw new Error("A public source resolves outside public.");
      }
      files.push({ sourcePath: canonicalSource, relativePath: relative(publicRoot, sourcePath) });
    }
  }
  await visit(publicRoot);
  if (!files.some(({ relativePath }) => relativePath === "index.html")) {
    throw new Error("The public build must contain index.html.");
  }
  if (!files.some(({ relativePath }) => relativePath === `en${sep}index.html`)) {
    throw new Error("The public build must contain en/index.html.");
  }
  return files;
}

async function hashFiles(files) {
  const hashes = [];
  for (const { sourcePath, relativePath } of files) {
    const bytes = await readFile(sourcePath);
    hashes.push({
      relativePath: relativePath.split(sep).join("/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  hashes.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  return hashes;
}

export async function buildPreview({ projectRoot = PROJECT_ROOT } = {}) {
  await runProjectCheck(projectRoot);
  const files = await collectPublicFiles(projectRoot);
  const distPath = resolve(projectRoot, "dist-preview");
  const info = await readPathInfo(distPath);
  if (info && (info.isSymbolicLink() || !info.isDirectory())) {
    throw new Error("The dist-preview output cannot be a symbolic link or a non-directory.");
  }
  await rm(distPath, { recursive: true, force: true });
  await mkdir(distPath);
  for (const { sourcePath, relativePath } of files) {
    const targetPath = resolve(distPath, relativePath);
    if (!isPathInside(distPath, targetPath) || targetPath === distPath) {
      throw new Error("A build output path escapes dist-preview.");
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
  return { outputPath: distPath, hashes: await hashFiles(files) };
}

export async function checkGeneratedPreview({ projectRoot = PROJECT_ROOT } = {}) {
  const expected = await hashFiles(await collectPublicFiles(projectRoot));
  const distPath = resolve(projectRoot, "dist-preview");
  const actual = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) {
        const bytes = await readFile(path);
        actual.push({
          relativePath: relative(distPath, path).split(sep).join("/"),
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      }
    }
  }
  try {
    await visit(distPath);
  } catch {
    throw new Error("dist-preview is missing; run build:preview first.");
  }
  actual.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("dist-preview does not match a fresh preview build.");
  }
  return { fileCount: expected.length };
}

export function parseBuildArgs(argv) {
  let mode = "preview";
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--mode") {
      mode = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--check") {
      check = true;
    } else {
      throw new Error(`Unknown build argument: ${argv[i]}`);
    }
  }
  if (mode !== "preview") {
    throw new Error(`Build mode "${mode}" is refused: no production origin is configured for this candidate.`);
  }
  return { check };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const { check } = parseBuildArgs(process.argv.slice(2));
    if (check) {
      const result = await checkGeneratedPreview();
      process.stdout.write(`Generated preview verified (${result.fileCount} files).\n`);
    } else {
      const result = await buildPreview();
      process.stdout.write(`Built ${result.hashes.length} static files into dist-preview.\n`);
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Build failed."}\n`);
    process.exitCode = 1;
  }
}
