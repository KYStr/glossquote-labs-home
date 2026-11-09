import path from 'node:path';
import { mkdir, writeFile, readFile, lstat, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { check, approvedAssets, builtAssets, listFiles, ORIGIN, sha256 } from './check.mjs';
import { projectRoot, publicRoot } from './serve.mjs';
import { validateAncestors, htmlTags, validateHtml } from './validation.mjs';

export async function build(source = publicRoot, target = path.join(projectRoot, 'dist'), { production = false, origin = ORIGIN } = {}) {
  if (typeof production !== 'boolean' || origin !== ORIGIN) throw new Error('Unknown production origin or build mode');
  await check(source);
  if (path.resolve(target) !== path.join(projectRoot, 'dist')) throw new Error('Build target outside owned dist');
  const data = new Map();
  for (const relative of approvedAssets) {
    let content = await readFile(path.join(source, relative));
    if (production && ['index.html', 'en/index.html'].includes(relative)) content = Buffer.from(productionHtml(content.toString('utf8'), relative));
    if (relative === 'robots.txt' && production) content = Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
    if (relative === '_headers' && !production) content = Buffer.from(content.toString('utf8') + '  X-Robots-Tag: noindex, nofollow\n');
    data.set(relative, content);
  }
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + (production ? `<url><loc>${ORIGIN}/index.html</loc></url><url><loc>${ORIGIN}/en/index.html</loc></url>` : '') + '</urlset>\n';
  data.set('sitemap.xml', Buffer.from(sitemap));
  const manifest = { schemaVersion: 1, mode: production ? 'production' : 'preview', origin: production ? ORIGIN : null, assets: Object.fromEntries([...data].sort(([a], [b]) => a.localeCompare(b, 'en')).map(([file, content]) => [file, sha256(content)])) };
  data.set('asset-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  for (const relative of ['index.html', 'en/index.html', '404.html']) validateHtml(data.get(relative).toString('utf8'), builtAssets, production && relative !== '404.html' ? 'index,follow' : 'noindex,nofollow', production && relative !== '404.html' ? ORIGIN : null);
  await validateAncestors(target, true);
  try {
    const existing = await listFiles(target);
    if (existing.some(file => !builtAssets.includes(file))) throw new Error('Unapproved stale dist asset; build refused');
    for (const relative of existing) {
      const info = await lstat(path.join(target, relative));
      if (info.nlink !== 1) throw new Error('Hardlinked build destination refused');
    }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(target, { recursive: true });
  for (const part of ['', 'en', 'styles', 'js', 'js/core']) {
    const directory = path.join(target, part);
    await validateAncestors(directory, true);
    await mkdir(directory, { recursive: true });
    if ((await lstat(directory)).isSymbolicLink()) throw new Error('Symlink build directory refused');
  }
  for (const [relative, content] of data) {
    const destination = path.join(target, relative);
    try { if ((await lstat(destination)).isSymbolicLink()) throw new Error('Symlink build file refused'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    await validateAncestors(path.dirname(destination));
    const staging = path.join(path.dirname(destination), `build-${randomUUID()}.tmp`);
    await writeFile(staging, content, { flag: 'wx' });
    await rename(staging, destination);
  }
  if (JSON.stringify(await listFiles(target)) !== JSON.stringify([...builtAssets].sort())) throw new Error('Built asset set mismatch');
  return { assets: builtAssets.length, mode: manifest.mode, manifestSha256: sha256(data.get('asset-manifest.json')) };
}
export function productionHtml(html, relative) {
  const tags = htmlTags(html), title = tags.find(tag => tag.name === 'title').rawText;
  const description = tags.find(tag => tag.name === 'meta' && tag.attrs.name === 'description').attrs.content;
  const url = ORIGIN + '/' + relative, locale = relative.startsWith('en/') ? 'en' : 'zh-Hant';
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const data = { '@context': 'https://schema.org', '@type': 'WebApplication', name: title, description, url, inLanguage: locale, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser with JavaScript' };
  const metadata = `  <link rel="canonical" href="${url}">\n  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">\n  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">\n  <meta property="og:title" content="${escape(title)}">\n  <meta property="og:description" content="${escape(description)}">\n  <meta property="og:type" content="website">\n  <meta property="og:url" content="${url}">\n  <script type="application/ld+json" id="structured-data">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>\n`;
  return html.replace('name="robots" content="noindex,nofollow"', 'name="robots" content="index,follow"').replace('</head>', metadata + '</head>');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), originArgs = args.filter(arg => arg.startsWith('--origin='));
  if (originArgs.length > 1 || args.some(arg => arg !== '--production' && !arg.startsWith('--origin='))) throw new Error('Unknown build argument');
  console.log('BUILD PASS', await build(publicRoot, path.join(projectRoot, 'dist'), { production: args.includes('--production'), origin: originArgs.length ? originArgs[0].slice(9) : ORIGIN }));
}
