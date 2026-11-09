// Verifies the generated preview output: the files in dist-preview/ must
// match BUILD-MANIFEST.json exactly (same set, same byte counts, same
// SHA-256), both generated pages must carry the SPEC-pinned preview
// metadata (noindex, language, title, description, h1, no
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
    "最大肌力 1RM 計算機",
    "最大肌力 1RM 計算機｜Gloss Tools",
    "輸入你能完成的重量與次數，用 Epley 與 Brzycki 兩個公式估算最大肌力（1RM），並列出各百分比對應的訓練重量。",
  ],
  [
    "en/index.html",
    "en",
    "One-Rep Max Calculator",
    "One-Rep Max Calculator | Gloss Tools",
    "Estimate your one-rep max from a weight and rep count with the Epley and Brzycki formulas, and see training loads for each percentage of your 1RM.",
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
