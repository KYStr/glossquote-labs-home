// Verify the committed dist/ preview output is current: rebuild
// the preview into a temporary directory and require byte-for-byte
// equality with dist/ (same file set, same bytes).
// Usage: node scripts/check-generated.mjs --mode=preview

import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseMode(argv) {
  let mode = "preview";
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) mode = arg.slice("--mode=".length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (mode !== "preview") throw new Error("Only --mode=preview is supported.");
  return mode;
}

function runBuild(outDir) {
  return new Promise((resolvePromise) => {
    execFile(
      process.execPath,
      ["scripts/build.mjs", "--mode=preview", `--out=${outDir}`],
      { cwd: PROJECT_ROOT, env: process.env },
      (error, stdout, stderr) => resolvePromise({ error, stdout, stderr }),
    );
  });
}

async function collect(dir, base, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) await collect(full, base, out);
    else out.set(relative(base, full), await readFile(full));
  }
  return out;
}

async function main() {
  parseMode(process.argv.slice(2));
  const distDir = resolve(PROJECT_ROOT, "dist");
  const tmp = await mkdtemp(resolve(os.tmpdir(), "gq-pregnancy-check-"));
  try {
    const { error, stderr } = await runBuild(tmp);
    if (error) throw new Error(`Rebuild failed: ${stderr}`);
    const expected = await collect(distDir, distDir, new Map());
    const actual = await collect(tmp, tmp, new Map());
    const problems = [];
    for (const key of expected.keys()) {
      if (!actual.has(key)) problems.push(`missing in rebuild: ${key}`);
      else if (!expected.get(key).equals(actual.get(key))) problems.push(`bytes differ: ${key}`);
    }
    for (const key of actual.keys()) {
      if (!expected.has(key)) problems.push(`extra in rebuild: ${key}`);
    }
    if (problems.length > 0) {
      process.stderr.write(`Generated preview output is stale:\n${problems.join("\n")}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Generated preview output is current (${expected.size} files, byte-identical).\n`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`check-generated failed: ${error.message}\n`);
  process.exitCode = 1;
});
