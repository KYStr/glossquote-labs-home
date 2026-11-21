// Reproducible preview build: copies public/ to the output directory and
// embeds the fixed Worker source (pure core + fixed handler, read as fixed
// source bytes) into the built app.js, then writes BUILD-MANIFEST.json
// (sorted path/bytes/sha256 of the output tree). No timestamps, no network,
// no deps.
// Usage: node scripts/build.mjs --mode preview [--out dist-preview]

import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

function argValue(name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

const mode = argValue("--mode");
if (mode !== "preview") {
  console.error("build.mjs: only --mode preview is supported");
  process.exit(1);
}
const outDir = resolve(toolDir, argValue("--out") || "dist-preview");
const publicDir = join(toolDir, "public");

const coreSource = await readFile(join(publicDir, "js/core/core.mjs"), "utf8");
const handlerSource = await readFile(join(publicDir, "js/worker-handler.mjs"), "utf8");
const workerSource = coreSource + "\n" + handlerSource;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await cp(publicDir, outDir, { recursive: true });

const appPath = join(outDir, "js/app.js");
const appSource = await readFile(appPath, "utf8");
const token = "__WORKER_SOURCE__";
if (!appSource.includes(token)) {
  console.error("build.mjs: __WORKER_SOURCE__ token missing from app.js");
  process.exit(1);
}
await writeFile(appPath, appSource.replace(token, JSON.stringify(workerSource)), "utf8");

// Deterministic manifest of the output tree (sorted by path).
const manifestFiles = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else {
      const bytes = await readFile(path);
      manifestFiles.push({
        path: relative(outDir, path).split(sep).join("/"),
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
  }
}
await walk(outDir);
manifestFiles.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const manifest = { mode, files: manifestFiles };
await writeFile(
  join(toolDir, "BUILD-MANIFEST.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);
console.log(`build: preview written to ${outDir} (${manifestFiles.length} files, BUILD-MANIFEST.json updated)`);
