import { lstat, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function collectRelative(root) {
  const out = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) out.push(relative(root, path).split(sep).join("/"));
    }
  }
  await visit(root);
  return out.sort();
}

// Verifies the generated preview in dist/ mirrors public/ exactly:
// same file set, byte-identical contents, both language pages present.
export async function checkGeneratedPreview(projectPath = PROJECT_ROOT) {
  const root = resolve(projectPath);
  const distPath = resolve(root, "dist");
  const info = await lstat(distPath).catch(() => null);
  if (!info || !info.isDirectory()) {
    throw new Error("dist/ does not exist; run npm run build:preview first.");
  }
  const expected = await collectRelative(resolve(root, "public"));
  const actual = await collectRelative(distPath);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Generated preview file set differs from public/.");
  }
  for (const required of ["index.html", "en/index.html"]) {
    if (!actual.includes(required)) {
      throw new Error(`Generated preview is missing ${required}.`);
    }
  }
  for (const relativePath of expected) {
    const [source, built] = await Promise.all([
      readFile(resolve(root, "public", relativePath)),
      readFile(resolve(distPath, relativePath)),
    ]);
    if (!source.equals(built)) {
      throw new Error(`Generated preview file differs from public: ${relativePath}`);
    }
  }
  return true;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    await checkGeneratedPreview();
    process.stdout.write("Generated preview check passed.\n");
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Generated preview check failed."}\n`);
    process.exitCode = 1;
  }
}
