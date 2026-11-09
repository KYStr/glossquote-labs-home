// Verifies the generated preview output: the files in dist-preview/
// must match BUILD-MANIFEST.json exactly (same set, byte counts and
// SHA-256), both generated pages must carry the preview metadata
// (noindex, language, title, h1, no canonical/hreflang), and the
// embedded worker source must equal the fixed core + handler bytes.
// Run after `npm run build:preview`.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(toolRoot, "dist-preview");

async function listFiles(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.isDirectory()) files.push(...(await listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)));
    else files.push(`${prefix}${entry.name}`);
  }
  return files;
}

const manifest = JSON.parse(await readFile(path.join(toolRoot, "BUILD-MANIFEST.json"), "utf8"));
const onDisk = await listFiles(distDir);
assert.deepEqual(
  onDisk,
  manifest.files.map((file) => file.path).sort(),
  "dist-preview/ file set differs from BUILD-MANIFEST.json",
);
for (const file of manifest.files) {
  const bytes = await readFile(path.join(distDir, file.path));
  assert.equal(bytes.byteLength, file.bytes, `${file.path}: byte count`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    file.sha256,
    `${file.path}: sha256`,
  );
}

const expectations = [
  ["index.html", "zh-Hant", "3D 列印線材用量換算｜Gloss Tools", "3D 列印線材用量換算"],
  ["en/index.html", "en", "Filament Usage Calculator | Gloss Tools", "Filament Usage Calculator"],
];
for (const [relative, lang, title, h1] of expectations) {
  const html = await readFile(path.join(distDir, relative), "utf8");
  assert.match(html, /noindex, nofollow/, `${relative}: noindex`);
  assert.ok(html.includes(`<html lang="${lang}">`), `${relative}: lang=${lang}`);
  assert.ok(html.includes(`<title>${title}</title>`), `${relative}: title`);
  assert.ok(html.includes(`<h1>${h1}</h1>`), `${relative}: h1`);
  assert.ok(!html.includes("canonical"), `${relative}: preview must not carry a canonical link`);
  assert.ok(!html.includes("hreflang"), `${relative}: preview must not carry hreflang`);
}

// The embedded worker source must be exactly the fixed core + handler.
const coreSource = await readFile(path.join(toolRoot, "public/js/core/filament.mjs"), "utf8");
const handlerSource = await readFile(path.join(toolRoot, "public/js/worker-handler.mjs"), "utf8");
const expectedWorkerSource = [coreSource, handlerSource].join("\n// ---- worker handler ----\n");
const workerModule = await readFile(path.join(distDir, "js/worker-source.js"), "utf8");
const match = workerModule.match(/export const WORKER_SOURCE = ("(?:[^"\\]|\\.)*");/);
assert.ok(match, "js/worker-source.js does not export WORKER_SOURCE as a JSON string");
assert.equal(
  JSON.parse(match[1]),
  expectedWorkerSource,
  "embedded worker source differs from the fixed core + handler bytes",
);

console.log(
  `Generated preview verified: ${manifest.files.length} files, hashes exact, bilingual metadata present, worker source matches fixed bytes; not production`,
);
