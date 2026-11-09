// Reproducible preview build: copies public/ into dist/ in sorted
// order with no timestamps or generated content, so two runs produce
// byte-identical output. With --check, rebuilds into a temporary
// directory and verifies dist/ matches it byte for byte.

import { cp, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PUBLIC = join(ROOT, "public");
const DIST = join(ROOT, "dist");

async function listFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const out = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path, base)));
    else if (entry.isFile()) out.push(relative(base, path));
  }
  return out;
}

async function buildInto(target) {
  await rm(target, { recursive: true, force: true });
  await cp(PUBLIC, target, { recursive: true });
}

async function compareTrees(a, b) {
  const filesA = await listFiles(a);
  const filesB = await listFiles(b);
  if (JSON.stringify(filesA) !== JSON.stringify(filesB)) return false;
  for (const rel of filesA) {
    const [bufA, bufB] = await Promise.all([readFile(join(a, rel)), readFile(join(b, rel))]);
    if (!bufA.equals(bufB)) return false;
  }
  return true;
}

const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  const temp = await mkdtemp(join(tmpdir(), "bakers-preview-"));
  try {
    await buildInto(temp);
    const same = await compareTrees(temp, DIST).catch(() => false);
    if (!same) {
      process.stderr.write("check:generated:preview failed: dist/ does not match a fresh build.\n");
      process.exitCode = 1;
    } else {
      process.stdout.write("Generated preview matches a fresh build byte for byte.\n");
    }
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
} else {
  await buildInto(DIST);
  const files = await listFiles(DIST);
  process.stdout.write(`Built ${files.length} static files into dist.\n`);
}
