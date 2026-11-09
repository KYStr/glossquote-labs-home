// Verifies dist-preview/ is a byte-identical copy of public/.
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function collect(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

async function hashTree(dir) {
  const map = new Map();
  for (const file of await collect(dir)) {
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    map.set(relative(dir, file), hash);
  }
  return map;
}

const source = await hashTree(join(root, "public"));
const generated = await hashTree(join(root, "dist-preview"));
const problems = [];
for (const [path, hash] of source) {
  if (!generated.has(path)) problems.push(`missing in dist-preview: ${path}`);
  else if (generated.get(path) !== hash) problems.push(`hash mismatch: ${path}`);
}
for (const path of generated.keys()) {
  if (!source.has(path)) problems.push(`extra in dist-preview: ${path}`);
}
if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`check:generated:preview ok (${source.size} files identical)`);
