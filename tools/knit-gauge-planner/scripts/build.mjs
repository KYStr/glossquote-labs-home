// Reproducible build for Knit Gauge Pattern Planner.
// preview: copies public/ to dist/ verbatim (no transforms), writes a
// deny-all robots.txt and MANIFEST.txt (sha256 + path per file,
// sorted), so two runs produce byte-identical output.
// production: copies to dist-production/, removes the preview
// noindex, rewrites canonical/hreflang/home links to the confirmed
// --origin, and writes robots.txt + sitemap.xml listing exactly the
// two canonical pages.
// Usage: node scripts/build.mjs preview
//        node scripts/build.mjs production --origin https://glossquote.com

import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "public");
const mode = process.argv[2];
if (mode !== "preview" && mode !== "production") {
  console.error(
    "usage: node scripts/build.mjs <preview|production> [--origin <https origin>]",
  );
  process.exit(2);
}
const distDir = join(root, mode === "preview" ? "dist" : "dist-production");
const toolPath = "tools/knit-gauge-planner";

let origin = null;
if (mode === "production") {
  const i = process.argv.indexOf("--origin");
  origin = process.argv[i + 1];
  if (!origin || !/^https:\/\/[a-z0-9.-]+$/i.test(origin)) {
    console.error("production build requires --origin <confirmed HTTPS origin>");
    process.exit(2);
  }
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const files = await listFiles(srcDir);
for (const file of files) {
  const target = join(distDir, relative(srcDir, file));
  await mkdir(dirname(target), { recursive: true });
  await cp(file, target);
}

if (mode === "preview") {
  await writeFile(join(distDir, "robots.txt"), "User-agent: *\nDisallow: /\n");
} else {
  const zhCanonical = `${origin}/${toolPath}/index.html`;
  const enCanonical = `${origin}/${toolPath}/en/index.html`;
  for (const page of ["index.html", join("en", "index.html")]) {
    const target = join(distDir, page);
    let html = await readFile(target, "utf8");
    html = html.replace('<meta name="robots" content="noindex, nofollow">\n', "");
    const canonical = page === "index.html" ? zhCanonical : enCanonical;
    html = html.replace(
      /<link rel="canonical" href="[^"]+">/,
      `<link rel="canonical" href="${canonical}">`,
    );
    if (page === "index.html") {
      html = html.replaceAll('href="./index.html"', `href="${zhCanonical}"`);
      html = html.replaceAll('href="./en/index.html"', `href="${enCanonical}"`);
      html = html.replaceAll('href="../../"', `href="${origin}/index.html"`);
    } else {
      html = html.replaceAll('href="../index.html"', `href="${zhCanonical}"`);
      html = html.replaceAll('href="./index.html"', `href="${enCanonical}"`);
      html = html.replaceAll('href="../../en/"', `href="${origin}/en/index.html"`);
    }
    await writeFile(target, html);
  }
  await writeFile(
    join(distDir, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${origin}/${toolPath}/sitemap.xml\n`,
  );
  await writeFile(
    join(distDir, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${zhCanonical}</loc></url>\n` +
      `  <url><loc>${enCanonical}</loc></url>\n</urlset>\n`,
  );
}

let manifest = "";
for (const file of await listFiles(distDir)) {
  const rel = relative(distDir, file).split("/").join("/");
  const hash = createHash("sha256").update(await readFile(file)).digest("hex");
  manifest += `${hash}  ${rel}\n`;
}
await writeFile(join(distDir, "MANIFEST.txt"), manifest);
console.log(`Built ${mode} output (${files.length} source files) in ${distDir}`);
