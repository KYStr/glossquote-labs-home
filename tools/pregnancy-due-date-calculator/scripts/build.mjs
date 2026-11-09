// Deterministic preview build: mirror public/ into dist/ byte for
// byte. No transformation, no timestamps, no environment-dependent
// ordering, so two runs always produce identical output.
// Usage: node scripts/build.mjs --mode=preview [--out=<dir>]

import { copyFile, lstat, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWED_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);

function parseArgs(argv) {
  let mode = "preview";
  let out = null;
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) mode = arg.slice("--mode=".length);
    else if (arg.startsWith("--out=")) out = arg.slice("--out=".length);
    else throw new Error(`Unknown build argument: ${arg}`);
  }
  if (mode !== "preview") throw new Error("Only --mode=preview is supported.");
  return { mode, out };
}

async function collectFiles(root) {
  const files = [];
  async function visit(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const entry of entries) {
      const full = resolve(dir, entry.name);
      const info = await lstat(full);
      if (info.isSymbolicLink()) throw new Error(`Symbolic link not allowed: ${full}`);
      if (entry.name.startsWith(".")) throw new Error(`Dotfile not allowed: ${full}`);
      if (info.isDirectory()) {
        await visit(full);
      } else if (info.isFile()) {
        if (!ALLOWED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          throw new Error(`Unsupported file type in public/: ${full}`);
        }
        files.push(full);
      } else {
        throw new Error(`Unsupported path in public/: ${full}`);
      }
    }
  }
  await visit(root);
  return files;
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const publicRoot = resolve(PROJECT_ROOT, "public");
  const outRoot = out ? resolve(out) : resolve(PROJECT_ROOT, "dist");
  const files = await collectFiles(publicRoot);
  await rm(outRoot, { recursive: true, force: true });
  for (const source of files) {
    const relative = source.slice(publicRoot.length + 1);
    const target = resolve(outRoot, relative);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
  process.stdout.write(`Preview build wrote ${files.length} files to ${outRoot}\n`);
}

main().catch((error) => {
  process.stderr.write(`Build failed: ${error.message}\n`);
  process.exitCode = 1;
});
