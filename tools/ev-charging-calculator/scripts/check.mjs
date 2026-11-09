// Static checks for the EV Charging Calculator candidate.
// Verifies the file contract, JS syntax, the no-network/no-storage
// baseline, and the pinned bilingual page metadata.

import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const REQUIRED_FILES = [
  "package.json",
  "public/index.html",
  "public/en/index.html",
  "public/js/app.js",
  "public/js/core/ev-charging.mjs",
  "public/js/core/controller.mjs",
  "public/styles/app.css",
  "scripts/build.mjs",
  "scripts/check.mjs",
  "scripts/serve.mjs",
];

const FORBIDDEN_PATTERNS = [
  { pattern: /\bfetch\s*\(/, label: "fetch" },
  { pattern: /XMLHttpRequest/, label: "XMLHttpRequest" },
  { pattern: /WebSocket/, label: "WebSocket" },
  { pattern: /sendBeacon/, label: "sendBeacon" },
  { pattern: /localStorage|sessionStorage|indexedDB/, label: "persistent storage" },
  { pattern: /serviceWorker/, label: "service worker" },
  { pattern: /\.innerHTML|\.outerHTML|document\.write/, label: "HTML sink" },
  { pattern: /\beval\s*\(|new\s+Function/, label: "dynamic execution" },
  { pattern: /https?:\/\//, label: "absolute URL" },
];

async function listFiles(root, extensions) {
  const found = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) found.push(path);
    }
  }
  await visit(root);
  return found;
}

export async function runProjectCheck(projectRoot = PROJECT_ROOT) {
  const problems = [];

  for (const required of REQUIRED_FILES) {
    try {
      const info = await stat(join(projectRoot, required));
      if (!info.isFile()) problems.push(`Required path is not a file: ${required}`);
    } catch {
      problems.push(`Missing required file: ${required}`);
    }
  }

  const packageJson = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8"));
  if (packageJson.type !== "module") problems.push("package.json must be ESM.");
  if (packageJson.engines?.node !== ">=24") problems.push("package.json must require Node >=24.");
  for (const script of ["test", "check", "build:preview", "check:generated:preview"]) {
    if (typeof packageJson.scripts?.[script] !== "string") {
      problems.push(`package.json is missing script: ${script}`);
    }
  }
  const dependencies = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  if (Object.keys(dependencies).length > 0) problems.push("Runtime/build dependencies must stay zero.");

  const jsFiles = [
    ...(await listFiles(join(projectRoot, "public"), new Set([".js", ".mjs"]))),
    ...(await listFiles(join(projectRoot, "scripts"), new Set([".mjs"]))),
    ...(await listFiles(join(projectRoot, "test"), new Set([".mjs"]))),
  ];
  for (const file of jsFiles) {
    try {
      execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    } catch {
      problems.push(`Syntax check failed: ${relative(projectRoot, file)}`);
    }
    const source = await readFile(file, "utf8");
    if (relative(projectRoot, file).startsWith("public/")) {
      for (const { pattern, label } of FORBIDDEN_PATTERNS) {
        if (pattern.test(source)) {
          problems.push(`Forbidden ${label} in ${relative(projectRoot, file)}`);
        }
      }
    }
  }

  const pages = [
    {
      path: "public/index.html",
      lang: "zh-Hant",
      title: "電動車充電試算｜Gloss Tools",
      description: "輸入電池容量、目前與目標電量、充電功率與效率，估算需補電量、充電時間與電費。時間採固定功率模型，僅為估算。",
      h1: "電動車充電試算",
      stylesheet: "./styles/app.css",
    },
    {
      path: "public/en/index.html",
      lang: "en",
      title: "EV Charging Calculator | Gloss Tools",
      description: "Estimate the energy, charging time and cost to charge an EV battery from one charge level to another, using a constant-power model.",
      h1: "EV Charging Calculator",
      stylesheet: "../styles/app.css",
    },
  ];
  for (const page of pages) {
    const html = await readFile(join(projectRoot, page.path), "utf8");
    if (!html.includes(`<html lang="${page.lang}">`)) problems.push(`${page.path}: wrong lang.`);
    if (!html.includes(`<title>${page.title}</title>`)) problems.push(`${page.path}: wrong title.`);
    if (!html.includes(`content="${page.description}"`)) problems.push(`${page.path}: wrong description.`);
    if (!html.includes(`>${page.h1}</h1>`)) problems.push(`${page.path}: wrong h1.`);
    if (!html.includes('<meta name="robots" content="noindex, nofollow">')) {
      problems.push(`${page.path}: missing noindex robots meta.`);
    }
    if (/rel="canonical"|<link[^>]+hreflang/i.test(html)) {
      problems.push(`${page.path}: candidate must not carry canonical/hreflang links.`);
    }
    if (!html.includes(`href="${page.stylesheet}"`)) problems.push(`${page.path}: wrong stylesheet path.`);
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (pattern.test(html)) problems.push(`Forbidden ${label} in ${page.path}`);
    }
  }

  const fixtures = JSON.parse(await readFile(join(projectRoot, "test/fixtures.json"), "utf8"));
  if (fixtures.slug !== "ev-charging-calculator") problems.push("Vendored fixtures slug mismatch.");
  if (fixtures.specId !== "spec-ev-charging-calculator-20261109") {
    problems.push("Vendored fixtures specId mismatch.");
  }

  if (problems.length > 0) {
    throw new Error(`Project check failed:\n- ${problems.join("\n- ")}`);
  }
  return { fileCount: jsFiles.length };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const result = await runProjectCheck();
    process.stdout.write(`Project check passed (${result.fileCount} JS files).\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : "Check failed."}\n`);
    process.exitCode = 1;
  }
}
