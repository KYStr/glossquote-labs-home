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
    "寵物年齡換算",
    "寵物年齡換算｜Gloss Tools",
    "把狗狗或貓咪的年齡換算成人類等效年齡：第一年 15 歲、第二年再加 9 歲，之後依物種與體型逐年增加，並標示生命階段。",
  ],
  [
    "en/index.html",
    "en",
    "Pet Age Converter",
    "Pet Age Converter | Gloss Tools",
    "Convert a dog's or cat's age to human-equivalent years with a pinned piecewise model: 15 for the first year, +9 for the second, then a per-year increment by species and size, plus a life-stage label.",
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
