import { copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { runProjectCheck } from "./check.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

function isPathInside(rootPath, candidatePath) {
  const difference = relative(rootPath, candidatePath);
  return (
    difference === "" ||
    (difference !== ".." &&
      !isAbsolute(difference) &&
      difference.split(sep)[0] !== "..")
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

async function collectPublicFiles(projectRoot) {
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
      if (info.isSymbolicLink()) {
        throw new Error("Symbolic links are not allowed in public build sources.");
      }
      if (entry.name[0] === ".") {
        throw new Error("Dotfiles are not allowed in public build sources.");
      }
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
  const names = new Set(files.map(({ relativePath }) => relativePath.split(sep).join("/")));
  if (!names.has("index.html") || !names.has("en/index.html")) {
    throw new Error("The public build must contain index.html and en/index.html.");
  }
  return files;
}

export async function buildProject({
  projectPath = PROJECT_ROOT,
  mode = "preview",
  outDir = null,
  check = true,
} = {}) {
  if (mode !== "preview") {
    throw new Error(`Unsupported build mode: ${mode}. Only "preview" is configured.`);
  }
  const projectRoot = await realpath(resolve(projectPath));
  if (check) {
    const report = await runProjectCheck(projectRoot);
    if (!report.ok) {
      throw new Error(`Project check failed: ${report.failures.join("; ")}`);
    }
  }

  const distPath = resolve(projectRoot, outDir ?? "dist-preview");
  const distDifference = relative(projectRoot, distPath);
  if (
    distDifference === "" ||
    distDifference === "public" ||
    distDifference.split(sep)[0] === ".." ||
    isAbsolute(distDifference)
  ) {
    throw new Error("The build output must be a directory inside the project.");
  }
  const existing = await readPathInfo(distPath);
  if (existing && (existing.isSymbolicLink() || !existing.isDirectory())) {
    throw new Error("The build output cannot be a symbolic link or a non-directory.");
  }

  const files = await collectPublicFiles(projectRoot);
  await rm(distPath, { recursive: true, force: true });
  await mkdir(distPath, { recursive: true });
  for (const { sourcePath, relativePath } of files) {
    const targetPath = resolve(distPath, relativePath);
    if (!isPathInside(distPath, targetPath) || targetPath === distPath) {
      throw new Error("A build output path escapes the output directory.");
    }
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
  const core = await readFile(resolve(distPath, "js/core/core.mjs"), "utf8");
  const handler = await readFile(resolve(distPath, "js/worker-handler.mjs"), "utf8");
  const workerSource = `export const WORKER_SOURCE = ${JSON.stringify(`${core}\n${handler}`)};\n`;
  await writeFile(resolve(distPath, "js/worker-source.js"), workerSource, "utf8");
  return { outputPath: distPath, fileCount: files.length + 1 };
}

export function parseBuildArgs(argv) {
  const parsed = { mode: "preview", outDir: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--mode") {
      parsed.mode = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--out") {
      parsed.outDir = argv[i + 1];
      i += 1;
    } else {
      throw new Error(`Unknown build argument: ${argv[i]}`);
    }
  }
  return parsed;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildProject(parseBuildArgs(process.argv.slice(2)));
    process.stdout.write(
      `Built ${result.fileCount} static files into ${relative(process.cwd(), result.outputPath) || result.outputPath}.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Build failed."}\n`);
    process.exitCode = 1;
  }
}
