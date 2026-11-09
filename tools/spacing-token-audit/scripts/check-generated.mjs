// Checks over the generated preview (dist-preview).
// Rebuilds into a temp dir and requires byte-identical output, then verifies
// the embedded worker source (extracted from the built app.js, syntax-checked
// as a module, and byte-compared against the core + handler sources), the
// preview HTML (noindex, CSP, exact titles), and the file inventory.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function check(condition, message) {
  if (!condition) failures.push(message);
  else console.log(`ok: ${message}`);
}

function parseArgs(argv) {
  const args = { dir: "dist-preview" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--dir" && argv[i + 1]) args.dir = argv[++i];
    else throw new Error(`unknown argument: ${argv[i]}`);
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

async function sha256Tree(dir) {
  const files = await listFiles(dir);
  const map = new Map();
  for (const file of files) {
    const rel = file.slice(dir.length + 1);
    const hash = createHash("sha256").update(await readFile(file)).digest("hex");
    map.set(rel, hash);
  }
  return map;
}

async function main() {
  const { dir } = parseArgs(process.argv.slice(2));
  const distDir = resolve(root, dir);

  // Rebuild into a temp dir and require identical bytes.
  const tmp = await mkdtemp(join(tmpdir(), "spacing-token-audit-preview-"));
  try {
    await execFileAsync(process.execPath, ["scripts/build.mjs", "--mode", "preview", "--out", tmp], {
      cwd: root,
    });
    const built = await sha256Tree(distDir);
    const rebuilt = await sha256Tree(tmp);
    check(built.size === rebuilt.size, "rebuild produces the same file count");
    let identical = built.size === rebuilt.size;
    for (const [rel, hash] of built) {
      if (rebuilt.get(rel) !== hash) {
        identical = false;
        failures.push(`rebuild differs for ${rel}`);
      }
    }
    check(identical, "rebuild is byte-identical");
    console.log(`checked ${built.size} generated files`);
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  const appBuilt = await readFile(join(distDir, "js", "app.js"), "utf8");
  check(
    !appBuilt.includes("/*__WORKER_SOURCE__*/ null"),
    "built app.js has no unfilled worker placeholder",
  );
  const match = /const WORKER_SOURCE = ("(?:[^"\\]|\\.)*");/.exec(appBuilt);
  check(match !== null, "built app.js embeds a worker source string");
  let workerSource = null;
  if (match !== null) {
    workerSource = JSON.parse(match[1]);
    check(workerSource.length > 0, "embedded worker source is non-empty");
    check(workerSource.includes("self.onmessage"), "embedded worker sets onmessage");
    check(workerSource.includes("function run("), "embedded worker carries the core run()");
    const coreSource = await readFile(join(root, "public", "js", "core", "audit.mjs"), "utf8");
    const handlerSource = await readFile(join(root, "scripts", "worker-handler.mjs"), "utf8");
    const expected = coreSource.replace(/^export /gm, "") + handlerSource;
    check(workerSource === expected, "embedded worker source equals core + handler bytes");
    const probe = await mkdtemp(join(tmpdir(), "spacing-token-audit-worker-"));
    try {
      const probePath = join(probe, "worker-source.mjs");
      await writeFile(probePath, workerSource, "utf8");
      await execFileAsync(process.execPath, ["--check", probePath]);
      check(true, "embedded worker source parses as a module");
    } catch (error) {
      failures.push(`embedded worker source failed node --check: ${error.message}`);
    } finally {
      await rm(probe, { recursive: true, force: true });
    }
  }

  for (const rel of ["index.html", "en/index.html"]) {
    const html = await readFile(join(distDir, rel), "utf8");
    check(
      html.includes('<meta name="robots" content="noindex,nofollow">'),
      `${rel}: robots noindex,nofollow`,
    );
    check(html.includes("worker-src 'blob:'"), `${rel}: CSP allows blob: workers`);
    check(html.includes("default-src 'none'"), `${rel}: CSP default-src none`);
  }
  const zh = await readFile(join(distDir, "index.html"), "utf8");
  check(zh.includes("<h1>設計間距 Token 對照</h1>"), "preview zh: exact h1");
  const en = await readFile(join(distDir, "en", "index.html"), "utf8");
  check(en.includes("<h1>Design Spacing Token Audit</h1>"), "preview en: exact h1");

  const sourceFiles = (await listFiles(join(root, "public"))).map((f) =>
    f.slice(join(root, "public").length + 1),
  );
  const distFiles = (await listFiles(distDir)).map((f) => f.slice(distDir.length + 1));
  check(
    JSON.stringify([...sourceFiles].sort()) === JSON.stringify([...distFiles].sort()),
    "preview file inventory matches public/",
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} generated-preview check(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
  console.log("\nall generated-preview checks passed");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
