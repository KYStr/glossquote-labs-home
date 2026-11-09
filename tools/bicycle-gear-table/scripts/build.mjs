// Reproducible build for bicycle-gear-table.
// preview: copies public/ to dist/ verbatim (no transforms), sorted
// traversal, so two runs produce byte-identical output.
// production: copies to dist-production/, removes the preview noindex,
// and writes robots.txt + sitemap.xml for the confirmed --origin.
// Usage: node scripts/build.mjs preview
//        node scripts/build.mjs production --origin https://glossquote.com
import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'public');
const mode = process.argv[2];
if (mode !== 'preview' && mode !== 'production') {
  console.error('usage: node scripts/build.mjs <preview|production> [--origin <https origin>]');
  process.exit(2);
}
const distDir = join(root, mode === 'preview' ? 'dist' : 'dist-production');

let origin = null;
if (mode === 'production') {
  const i = process.argv.indexOf('--origin');
  origin = process.argv[i + 1];
  if (!origin || !/^https:\/\/[a-z0-9.-]+$/i.test(origin)) {
    console.error('production build requires --origin <confirmed HTTPS origin>');
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

if (mode === 'production') {
  for (const page of ['index.html', join('en', 'index.html')]) {
    const target = join(distDir, page);
    let html = await readFile(target, 'utf8');
    html = html.replace('<meta name="robots" content="noindex,nofollow">\n', '');
    const canonical = page === 'index.html'
      ? `${origin}/tools/bicycle-gear-table/index.html`
      : `${origin}/tools/bicycle-gear-table/en/index.html`;
    html = html.replace(/<link rel="canonical" href="[^"]+">/, `<link rel="canonical" href="${canonical}">`);
    html = html.replaceAll('https://glossquote.com/tools/bicycle-gear-table/', `${origin}/tools/bicycle-gear-table/`);
    html = html.replaceAll('https://glossquote.com/index.html', `${origin}/index.html`);
    html = html.replaceAll('https://glossquote.com/en/index.html', `${origin}/en/index.html`);
    await writeFile(target, html);
  }
  await writeFile(
    join(distDir, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${origin}/tools/bicycle-gear-table/sitemap.xml\n`,
  );
  await writeFile(
    join(distDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
      + `  <url><loc>${origin}/tools/bicycle-gear-table/index.html</loc></url>\n`
      + `  <url><loc>${origin}/tools/bicycle-gear-table/en/index.html</loc></url>\n</urlset>\n`,
  );
}

let manifest = '';
for (const file of await listFiles(distDir)) {
  const rel = relative(distDir, file);
  const hash = createHash('sha256').update(await readFile(file)).digest('hex');
  manifest += `${hash}  ${rel}\n`;
}
await writeFile(join(distDir, 'MANIFEST.txt'), manifest);
console.log(`Built ${mode} output (${files.length} source files) in ${distDir}`);
