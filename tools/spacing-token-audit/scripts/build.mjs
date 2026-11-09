// Build the preview bundle for the Spacing Token Audit tool.
// Copies public/ into dist-preview/ and embeds the fixed worker source
// (pure core bytes + the fixed message handler) into the built app.js,
// so the page can create its module Worker from a Blob URL without any
// fetch. The build is deterministic: same input bytes -> same output bytes.
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLACEHOLDER = "/*__WORKER_SOURCE__*/ null";

function parseArgs(argv) {
  const args = { mode: "preview", out: "dist-preview" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--mode" && argv[i + 1]) args.mode = argv[++i];
    else if (argv[i] === "--out" && argv[i + 1]) args.out = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (args.mode !== "preview") {
    throw new Error(`unsupported mode: ${args.mode} (only preview)`);
  }
  return args;
}

async function listFiles(dir) {
  const out = [];
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  const outDir = resolve(root, out);
  const publicDir = join(root, "public");

  const coreSource = await readFile(
    join(root, "public", "js", "core", "audit.mjs"),
    "utf8",
  );
  const handlerSource = await readFile(
    join(root, "scripts", "worker-handler.mjs"),
    "utf8",
  );
  // The core is embedded verbatim apart from leading `export ` markers,
  // so the embedded bytes are traceable to the tested source file.
  const coreBare = coreSource.replace(/^export /gm, "");
  const workerSource = coreBare + handlerSource;
  if (!workerSource.includes("self.onmessage")) {
    throw new Error("worker handler fragment is missing self.onmessage");
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(publicDir, outDir, { recursive: true });

  const appPath = join(outDir, "js", "app.js");
  const appSource = await readFile(appPath, "utf8");
  if (!appSource.includes(PLACEHOLDER)) {
    throw new Error("app.js is missing the worker-source placeholder");
  }
  const builtApp = appSource.replace(PLACEHOLDER, JSON.stringify(workerSource));
  await writeFile(appPath, builtApp, "utf8");

  const files = await listFiles(outDir);
  const rel = files.map((f) => f.slice(outDir.length + 1)).sort();
  console.log(`built ${rel.length} files into ${out}`);
  for (const f of rel) {
    const size = (await stat(join(outDir, f))).size;
    console.log(`  ${f} (${size} bytes)`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
