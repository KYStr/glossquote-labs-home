// Reproducible preview build: copies public/ to the output directory and
// embeds the fixed Worker source (pure core + fixed handler, read as fixed
// source bytes) into the built app.js. No timestamps, no network, no deps.
// Usage: node scripts/build.mjs --mode preview [--out dist-preview]

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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
console.log(`build: preview written to ${outDir}`);
