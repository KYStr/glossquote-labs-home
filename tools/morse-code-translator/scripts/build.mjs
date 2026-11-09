// Reproducible preview build: copies public/ into preview/ and writes a
// content-addressed manifest (paths + sizes + SHA-256, sorted, no
// timestamps), so running it twice produces byte-identical output.
// `--check` mode recomputes the expected output and compares it against
// the preview/ directory on disk without modifying anything.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = resolve(ROOT, "public");
const OUT = resolve(ROOT, "preview");

async function collect(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(full, base)));
    else if (entry.isFile()) files.push(relative(base, full).split(sep).join("/"));
  }
  return files;
}

async function manifestFor(rootDir, files) {
  const entries = [];
  for (const rel of files) {
    const buf = await readFile(join(rootDir, rel));
    entries.push({ path: rel, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") });
  }
  return JSON.stringify({ files: entries }, null, 2) + "\n";
}

const checkOnly = process.argv.includes("--check");
const files = await collect(SRC);
const expectedManifest = await manifestFor(SRC, files);

if (checkOnly) {
  let ok = true;
  try {
    const onDisk = await readFile(join(OUT, "manifest.json"), "utf8");
    if (onDisk !== expectedManifest) {
      console.error("check:generated:preview FAIL — preview/manifest.json differs from a fresh build");
      ok = false;
    }
    const diskFiles = (await collect(OUT)).filter((f) => f !== "manifest.json");
    if (JSON.stringify(diskFiles) !== JSON.stringify(files)) {
      console.error("check:generated:preview FAIL — preview/ file set differs from public/");
      ok = false;
    } else {
      for (const rel of files) {
        const a = await readFile(join(SRC, rel));
        const b = await readFile(join(OUT, rel));
        if (!a.equals(b)) {
          console.error(`check:generated:preview FAIL — preview/${rel} content differs`);
          ok = false;
        }
      }
    }
  } catch (error) {
    console.error(`check:generated:preview FAIL — ${error.message}`);
    ok = false;
  }
  if (ok) console.log("check:generated:preview OK — preview/ matches a fresh build byte for byte");
  process.exit(ok ? 0 : 1);
} else {
  await rm(OUT, { recursive: true, force: true });
  for (const rel of files) {
    const dest = join(OUT, rel);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(join(SRC, rel), dest);
  }
  await mkdir(OUT, { recursive: true });
  const { writeFile } = await import("node:fs/promises");
  await writeFile(join(OUT, "manifest.json"), expectedManifest);
  const st = await stat(join(OUT, "manifest.json"));
  console.log(`build:preview OK — ${files.length} files copied, manifest ${st.size} bytes`);
}
