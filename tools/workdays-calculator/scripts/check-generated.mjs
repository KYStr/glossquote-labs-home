import { createHash } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProject } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SCRATCH_DIR = ".generated-check";

async function hashTree(root) {
  const entries = new Map();
  async function visit(directory) {
    const items = await readdir(directory, { withFileTypes: true });
    items.sort((a, b) => a.name.localeCompare(b.name));
    for (const item of items) {
      const path = join(directory, item.name);
      if (item.isDirectory()) {
        await visit(path);
      } else if (item.isFile()) {
        const bytes = await readFile(path);
        const key = relative(root, path).split(/[\\/]/).join("/");
        entries.set(key, createHash("sha256").update(bytes).digest("hex"));
      }
    }
  }
  await visit(root);
  return entries;
}

export async function checkGeneratedPreview(projectPath = PROJECT_ROOT) {
  const projectRoot = resolve(projectPath);
  const distPath = join(projectRoot, "dist-preview");
  let existing;
  try {
    existing = await hashTree(distPath);
  } catch {
    throw new Error("dist-preview does not exist; run the preview build first.");
  }
  const scratchPath = join(projectRoot, SCRATCH_DIR);
  try {
    await buildProject({
      projectPath: projectRoot,
      mode: "preview",
      outDir: SCRATCH_DIR,
      check: false,
    });
    const rebuilt = await hashTree(scratchPath);
    if (existing.size !== rebuilt.size) return false;
    for (const [key, hash] of existing) {
      if (rebuilt.get(key) !== hash) return false;
    }
    return true;
  } finally {
    await rm(scratchPath, { recursive: true, force: true });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const matches = await checkGeneratedPreview();
    if (matches) {
      process.stdout.write("Generated preview matches a fresh rebuild.\n");
    } else {
      process.stderr.write("Generated preview differs from a fresh rebuild.\n");
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Check failed."}\n`);
    process.exitCode = 1;
  }
}
