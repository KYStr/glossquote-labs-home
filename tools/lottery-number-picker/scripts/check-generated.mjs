// Verifies the generated preview output: the files in dist-preview/
// must match BUILD-MANIFEST.json exactly (same set, same byte counts,
// same SHA-256), both generated pages must carry the SPEC-pinned
// preview metadata (noindex, language, title, description, h1, no
// canonical/hreflang), and robots.txt must deny all. Run after
// `npm run build:preview`.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST_ROOT = resolve(PROJECT_ROOT, "dist-preview");

const modeArg = process.argv.find((arg) => arg.startsWith("--mode"));
const mode = modeArg ? process.argv[process.argv.indexOf(modeArg) + 1] ?? modeArg.split("=")[1] : undefined;
if (mode !== "preview") {
  throw new Error("Only --mode preview is supported; production origin is not approved.");
}

async function collectFiles(directory, base = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(fullPath, base)));
    else files.push(relative(base, fullPath).split(sep).join("/"));
  }
  return files.sort();
}

const manifest = JSON.parse(await readFile(resolve(PROJECT_ROOT, "BUILD-MANIFEST.json"), "utf8"));
assert.equal(manifest.mode, "preview");
const onDisk = await collectFiles(DIST_ROOT);
assert.deepEqual(
  onDisk,
  manifest.files.map((file) => file.path).sort(),
  "dist-preview/ file set differs from BUILD-MANIFEST.json",
);
for (const file of manifest.files) {
  const bytes = await readFile(resolve(DIST_ROOT, file.path));
  assert.equal(bytes.length, file.bytes, `${file.path}: byte count`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    file.sha256,
    `${file.path}: sha256`,
  );
}

const expectations = [
  [
    "index.html",
    "zh-Hant",
    "樂透選號器",
    "樂透選號器｜Gloss Tools",
    "用固定種子重現的亂數，幫大樂透、威力彩、今彩539 產生選號；同一個種子永遠產生同一組號碼，每種組合出現的機會都相等。",
  ],
  [
    "en/index.html",
    "en",
    "Lottery Number Picker",
    "Lottery Number Picker | Gloss Tools",
    "Generate picks for Taiwan's Lotto 6/49, Super Lotto 638 and Daily Cash 539 with a seeded, reproducible generator — the same seed always yields the same numbers, and every combination is equally likely.",
  ],
];
for (const [path, lang, h1, title, description] of expectations) {
  const html = await readFile(resolve(DIST_ROOT, path), "utf8");
  assert.match(html, /noindex, nofollow/, `${path}: noindex`);
  assert.ok(html.includes(`<html lang="${lang}">`), `${path}: lang=${lang}`);
  assert.ok(html.includes(`<title>${title}</title>`), `${path}: title`);
  assert.ok(
    html.includes(`<meta name="description" content="${description}">`),
    `${path}: description`,
  );
  assert.ok(html.includes(`<h1>${h1}</h1>`), `${path}: h1`);
  assert.ok(!html.includes("canonical"), `${path}: candidate must not carry a canonical link`);
  assert.ok(!html.includes("hreflang"), `${path}: candidate must not carry hreflang`);
}

const robots = await readFile(resolve(DIST_ROOT, "robots.txt"), "utf8");
assert.equal(robots, "User-agent: *\nDisallow: /\n", "robots.txt must deny all");

console.log(
  `Generated preview verified: ${manifest.files.length} files, hashes exact, bilingual metadata present; not production`,
);
