import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const REQUIRED_FILES = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/controller.mjs",
  "public/js/core/core.mjs",
  "public/js/core/messages.mjs",
  "public/styles/tokens.css",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/check-generated.mjs",
  "scripts/serve.mjs",
];

const FORBIDDEN_PUBLIC_PATTERNS = [
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
  "eval(",
  "new Function",
  "fetch(",
  "XMLHttpRequest",
  "WebSocket",
  "sendBeacon",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "serviceWorker",
  "http://",
  "https://",
];

const PAGE_EXPECTATIONS = [
  {
    path: "public/index.html",
    lang: "zh-Hant",
    title: "工作日計算機｜Gloss Tools",
    h1: "工作日計算機",
  },
  {
    path: "public/en/index.html",
    lang: "en",
    title: "Workdays Calculator | Gloss Tools",
    h1: "Workdays Calculator",
  },
];

async function listFiles(root, base = root) {
  const out = [];
  const entries = await readdir(root, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(path, base)));
    else if (entry.isFile()) out.push(relative(base, path));
  }
  return out;
}

function nodeCheck(file) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, ["--check", file], { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", () => resolvePromise(`could not run node --check on ${file}`));
    child.on("close", (code) => {
      resolvePromise(code === 0 ? null : `syntax error in ${file}: ${stderr.trim().split("\n")[0]}`);
    });
  });
}

export async function runProjectCheck(projectPath = PROJECT_ROOT) {
  const failures = [];
  const root = resolve(projectPath);

  let files = [];
  try {
    files = await listFiles(root);
  } catch {
    return { ok: false, failures: ["project directory is not readable"] };
  }
  const fileSet = new Set(files.map((f) => f.split(/[\\/]/).join("/")));

  for (const required of REQUIRED_FILES) {
    if (!fileSet.has(required)) failures.push(`missing required file: ${required}`);
  }

  // package.json contract: ESM, Node >= 24, zero dependencies, fixed scripts.
  try {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    if (pkg.type !== "module") failures.push("package.json must set type=module");
    if (!pkg.engines || pkg.engines.node !== ">=24") {
      failures.push("package.json engines.node must be >=24");
    }
    for (const section of ["dependencies", "devDependencies"]) {
      if (pkg[section] && Object.keys(pkg[section]).length > 0) {
        failures.push(`package.json must not declare ${section}`);
      }
    }
    for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
      if (!pkg.scripts || typeof pkg.scripts[script] !== "string") {
        failures.push(`package.json is missing the "${script}" script`);
      }
    }
  } catch {
    failures.push("package.json is not readable JSON");
  }

  // Syntax-check every module. Plain .js files are checked through a
  // temporary .mjs copy so the ESM grammar is used without executing them.
  const scriptFiles = files.filter((f) => {
    const normalized = f.split(/[\\/]/).join("/");
    return (
      (normalized.startsWith("public/js/") ||
        normalized.startsWith("scripts/") ||
        normalized.startsWith("test/")) &&
      (normalized.endsWith(".mjs") || normalized.endsWith(".js"))
    );
  });
  const tempDir = await mkdtemp(join(tmpdir(), "workdays-check-"));
  try {
    for (const file of scriptFiles) {
      const absolute = join(root, file);
      if (file.endsWith(".mjs")) {
        const problem = await nodeCheck(absolute);
        if (problem) failures.push(problem);
      } else {
        const tempFile = join(tempDir, "module-under-check.mjs");
        await writeFile(tempFile, await readFile(absolute));
        const problem = await nodeCheck(tempFile);
        if (problem) failures.push(problem.replace(tempFile, file));
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  // Public sources: no network, storage, or HTML-injection sinks; allowlist
  // of file types only.
  const publicFiles = files.filter((f) => f.split(/[\\/]/).join("/").startsWith("public/"));
  for (const file of publicFiles) {
    const normalized = file.split(/[\\/]/).join("/");
    const extension = extname(normalized).toLowerCase();
    if (![".html", ".css", ".js", ".mjs"].includes(extension)) {
      failures.push(`public file has an unsupported type: ${normalized}`);
      continue;
    }
    const text = await readFile(join(root, file), "utf8");
    for (const pattern of FORBIDDEN_PUBLIC_PATTERNS) {
      if (text.includes(pattern)) {
        failures.push(`public file ${normalized} contains forbidden pattern: ${pattern}`);
      }
    }
  }

  // Static page invariants for the preview candidate.
  for (const page of PAGE_EXPECTATIONS) {
    let html;
    try {
      html = await readFile(join(root, page.path), "utf8");
    } catch {
      continue;
    }
    if (!html.includes(`<html lang="${page.lang}">`)) {
      failures.push(`${page.path} must declare lang="${page.lang}"`);
    }
    if (!html.includes(`<title>${page.title}</title>`)) {
      failures.push(`${page.path} must use the pinned title`);
    }
    if (!html.includes(`<h1 id="page-title">${page.h1}</h1>`)) {
      failures.push(`${page.path} must use the pinned H1`);
    }
    if (!html.includes('<meta name="description" content="')) {
      failures.push(`${page.path} is missing its meta description`);
    }
    if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
      failures.push(`${page.path} must carry the preview robots meta`);
    }
    if (html.includes('rel="canonical"') || html.includes('rel="alternate"')) {
      failures.push(`${page.path} must not carry production canonical/hreflang links`);
    }
  }

  return { ok: failures.length === 0, failures };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const report = await runProjectCheck();
    if (report.ok) {
      process.stdout.write("Project check passed.\n");
    } else {
      for (const failure of report.failures) process.stderr.write(`- ${failure}\n`);
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Check failed."}\n`);
    process.exitCode = 1;
  }
}
