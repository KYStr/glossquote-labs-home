import { lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { catalogLimits, validateCatalog } from "./catalog.mjs";
import { generateSiteFiles, OUTPUT_DIRECTORY, STYLESHEET_MAX_BYTES } from "./site.mjs";

function assertProjectRoot(projectRoot) {
  const absolute = resolve(projectRoot);
  let details;
  try {
    details = lstatSync(absolute);
  } catch {
    throw new Error("Project root is unavailable");
  }
  if (!details.isDirectory() || details.isSymbolicLink()) throw new Error("Project root must be a regular directory");
  if (realpathSync(absolute) !== absolute) throw new Error("Project root must not resolve through a link");
  return absolute;
}

function expectedOutputPath(projectRoot, mode) {
  const leaf = OUTPUT_DIRECTORY[mode];
  if (!leaf) throw new Error("Mode must be preview or production");
  const target = resolve(projectRoot, leaf);
  const relativeTarget = relative(projectRoot, target);
  if (relativeTarget !== leaf || isAbsolute(relativeTarget) || relativeTarget.startsWith(`..${sep}`)) {
    throw new Error("Generated output path escaped the project root");
  }
  return target;
}

function readRegularSourceFile(projectRoot, relativeName, maximumBytes) {
  const root = assertProjectRoot(projectRoot);
  if (typeof relativeName !== "string" || relativeName.includes("\\") || relativeName.startsWith("/")) {
    throw new Error("Source file path must stay inside the project");
  }
  const segments = relativeName.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error("Source file path must stay inside the project");
  }
  const target = resolve(root, ...segments);
  const rel = relative(root, target);
  if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error("Source file path escaped the project root");
  }

  let current = root;
  for (let index = 0; index < segments.length; index++) {
    current = join(current, segments[index]);
    let details;
    try {
      details = lstatSync(current);
    } catch {
      throw new Error(`Source path is unavailable: ${relativeName}`);
    }
    if (details.isSymbolicLink()) throw new Error(`Linked source path is not allowed: ${relativeName}`);
    const finalSegment = index === segments.length - 1;
    if (finalSegment ? !details.isFile() : !details.isDirectory()) {
      throw new Error(`Source path is not a regular file or directory: ${relativeName}`);
    }
    if (realpathSync(current) !== current) throw new Error(`Source path resolves through a link: ${relativeName}`);
  }

  const details = lstatSync(target);
  if (details.size > maximumBytes) throw new Error(`Source file exceeds the size limit: ${relativeName}`);
  return readFileSync(target);
}

function validateGeneratedName(name) {
  if (typeof name !== "string" || name.length === 0 || name.startsWith("/") || name.includes("\\")) {
    throw new Error("Generated file path is invalid");
  }
  const parts = name.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    throw new Error("Generated file path is invalid");
  }
}

function validateFileMap(files) {
  if (!(files instanceof Map)) throw new Error("Generated files must be a Map");
  for (const [name, contents] of files) {
    validateGeneratedName(name);
    if (!(typeof contents === "string" || Buffer.isBuffer(contents) || contents instanceof Uint8Array)) {
      throw new Error("Generated file contents are invalid");
    }
  }
}

function inspectTree(directory, prefix = "") {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const details = lstatSync(path);
    if (details.isSymbolicLink()) throw new Error("Generated output contains a symbolic link");
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (details.isDirectory()) files.push(...inspectTree(path, name));
    else if (details.isFile()) files.push(name);
    else throw new Error("Generated output contains an unsupported filesystem entry");
  }
  return files;
}

function existingOutput(projectRoot, mode) {
  const output = expectedOutputPath(projectRoot, mode);
  let details;
  try {
    details = lstatSync(output);
  } catch (error) {
    if (error?.code === "ENOENT") return { output, exists: false };
    throw error;
  }
  if (details.isSymbolicLink() || !details.isDirectory()) throw new Error("Generated output must be a regular directory");
  inspectTree(output);
  return { output, exists: true };
}

export function replaceGeneratedTree(projectRoot, mode, files) {
  const root = assertProjectRoot(projectRoot);
  validateFileMap(files);
  const { output, exists } = existingOutput(root, mode);
  if (exists) rmSync(output, { recursive: true, force: false });
  mkdirSync(output, { recursive: false });
  for (const [name, contents] of files) {
    const destination = resolve(output, ...name.split("/"));
    const rel = relative(output, destination);
    if (isAbsolute(rel) || rel === ".." || rel.startsWith(`..${sep}`)) throw new Error("Generated file escaped its output directory");
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, contents);
  }
  return output;
}

export function verifyGeneratedTree(projectRoot, mode, expectedFiles) {
  const root = assertProjectRoot(projectRoot);
  validateFileMap(expectedFiles);
  const { output, exists } = existingOutput(root, mode);
  if (!exists) throw new Error(`${OUTPUT_DIRECTORY[mode]} is missing`);

  const actualNames = inspectTree(output).sort();
  const expectedNames = [...expectedFiles.keys()].sort();
  if (actualNames.length !== expectedNames.length || actualNames.some((name, index) => name !== expectedNames[index])) {
    const missing = expectedNames.filter((name) => !actualNames.includes(name));
    const unexpected = actualNames.filter((name) => !expectedNames.includes(name));
    throw new Error(`Generated file list differs (missing: ${missing.join(",") || "none"}; unexpected: ${unexpected.join(",") || "none"})`);
  }

  for (const name of expectedNames) {
    const expected = Buffer.from(expectedFiles.get(name));
    const actual = readFileSync(join(output, ...name.split("/")));
    if (!actual.equals(expected)) throw new Error(`Generated file differs: ${name}`);
  }
  return output;
}

export function expectedFilesForProject(projectRoot, mode) {
  const root = assertProjectRoot(projectRoot);
  const catalogText = readRegularSourceFile(root, "catalog.json", catalogLimits.maxBytes).toString("utf8");
  const catalog = validateCatalog(catalogText);
  const cssText = readRegularSourceFile(root, "public/styles/site.css", STYLESHEET_MAX_BYTES).toString("utf8");
  return generateSiteFiles({ catalogInput: catalog, mode, cssText });
}

export function buildProject(projectRoot, mode) {
  const files = expectedFilesForProject(projectRoot, mode);
  replaceGeneratedTree(projectRoot, mode, files);
  return files;
}

export function defaultProjectRoot() {
  return fileURLToPath(new URL("../", import.meta.url));
}

export function parseModeArgs(args) {
  if (args.length !== 2 || args[0] !== "--mode" || !Object.hasOwn(OUTPUT_DIRECTORY, args[1])) {
    throw new Error("Usage: node scripts/<command>.mjs --mode preview|production");
  }
  return args[1];
}
