// Verifies dist-preview/ matches public/ byte-for-byte.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const a = join(root, "public"), b = join(root, "dist-preview");
if (!existsSync(b)) { console.error("dist-preview/ missing — run npm run build:preview first"); process.exit(1); }
function list(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name).slice(dir.length + 1)).sort();
}
const la = list(a), lb = list(b);
let fail = 0;
if (JSON.stringify(la) !== JSON.stringify(lb)) { console.error("file lists differ"); fail = 1; }
for (const rel of la) {
  if (!readFileSync(join(a, rel)).equals(readFileSync(join(b, rel)))) { console.error(`bytes differ: ${rel}`); fail = 1; }
}
if (fail) process.exit(1);
console.log(`check:generated:preview OK (${la.length} files identical)`);
