// Verify dist/preview/ is exactly the current public/ tree: same file set,
// same bytes, nothing extra, nothing stale. Run build:preview first.
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listFiles } from "./build.mjs";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SOURCE = join(PROJECT_ROOT, "public");
const TARGET = join(PROJECT_ROOT, "dist", "preview");

const problems = [];
let generated;
try {
  generated = await listFiles(TARGET);
} catch {
  console.error("check:generated:preview: dist/preview/ is missing; run npm run build:preview first.");
  process.exit(1);
}
const source = await listFiles(SOURCE);

for (const file of source) {
  if (!generated.includes(file)) problems.push(`missing in dist/preview: ${file}`);
}
for (const file of generated) {
  if (!source.includes(file)) problems.push(`extra in dist/preview: ${file}`);
}
for (const file of source) {
  if (!generated.includes(file)) continue;
  const [a, b] = await Promise.all([
    readFile(join(SOURCE, file)),
    readFile(join(TARGET, file)),
  ]);
  if (!a.equals(b)) problems.push(`bytes differ: ${file}`);
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`check:generated:preview: ${problem}`);
  process.exit(1);
}
console.log(`check:generated:preview: dist/preview matches public/ (${source.length} files).`);
