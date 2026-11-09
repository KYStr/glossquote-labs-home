import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PROJECT_ROOT, PUBLIC_FILES, verifyRoot, verifyPath, validatePublic, sha256 } from './validation.mjs';

export const PRODUCTION_ORIGIN = 'https://packing.glossquote.com';
export const PRODUCTION_FILES = Object.freeze([...new Set([...PUBLIC_FILES, '404.html', 'en/404.html', '_headers', 'robots.txt', 'sitemap.xml'])].sort());
export const PREVIEW_HASHES = Object.freeze({
  'index.html': '17407b230f07b16023e74d99237c48d0a83680294206e9c2f9ab5c94278e52e9',
  'en/index.html': '741bf643e5400d5e54683db964a729876bdd2ce737dda49be0f715711906d092',
  'styles/app.css': '9fd622f94d2e8fc3a24dd9525dce221a32e156f0413be5db21a4e5f49166e952',
  'js/app.mjs': 'e4a48b00503664d6b8c7df51df06f5a1121fef70d850e1e607b76c4a5ed54efb',
  'js/i18n.mjs': 'a3ad6b52ea52b2513cbb2c145d93b9a8a7796f5fb7cf1c7af11f2b626d7e0361',
  'js/state.mjs': 'd392a53da87dcbccfa6fefcf43536b096d6e30cc6a93452f3ecc68bbf6e7ee24',
  'js/core/packing-list.mjs': '7dea676b4a84a97f93a56f215fa60e1b470b43b33de5b70de22d673c068e3f8e'
});
export const CSP_BASE = "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; connect-src 'none'; worker-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'";
const locales = [
  { path: 'index.html', language: 'zh-Hant', ogLocale: 'zh_TW', home: 'https://glossquote.com/index.html', homeLabel: '所有 Gloss 工具' },
  { path: 'en/index.html', language: 'en', ogLocale: 'en_US', home: 'https://glossquote.com/en/index.html', homeLabel: 'All Gloss tools' }
];
export function assertOrigin(origin) {
  if (origin !== PRODUCTION_ORIGIN) throw new Error('PRODUCTION_ORIGIN_NOT_ALLOWED');
}
export async function assertPinnedPreview(root) {
  for (const file of Object.keys(PREVIEW_HASHES)) {
    await verifyPath(root, join(root, 'public', file));
    if (sha256(await readFile(join(root, 'public', file))) !== PREVIEW_HASHES[file]) throw new Error('M1_PREVIEW_CHANGED');
  }
}
function metadata(html, locale) {
  const description = /<meta name="description" content="([^"]+)">/.exec(html)?.[1];
  const title = /<title>([^<]+)<\/title>/.exec(html)?.[1];
  const name = /<h1>([^<]+)<\/h1>/.exec(html)?.[1];
  if (!description || !title || !name) throw new Error('SOURCE_METADATA_MISSING');
  const schema = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name,
    url: `${PRODUCTION_ORIGIN}/${locale.path}`, inLanguage: locale.language,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', description }).replaceAll('<', '\\u003c');
  const head = [
    `<link rel="canonical" href="${PRODUCTION_ORIGIN}/${locale.path}">`,
    `<link rel="alternate" hreflang="zh-Hant" href="${PRODUCTION_ORIGIN}/index.html">`,
    `<link rel="alternate" hreflang="en" href="${PRODUCTION_ORIGIN}/en/index.html">`,
    `<link rel="alternate" hreflang="x-default" href="${PRODUCTION_ORIGIN}/index.html">`,
    `<meta property="og:type" content="website">`, `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:locale" content="${locale.ogLocale}">`,
    `<meta property="og:url" content="${PRODUCTION_ORIGIN}/${locale.path}">`,
    `<script type="application/ld+json">${schema}</script>`
  ].map(line => `  ${line}`).join('\n');
  let output = html.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">');
  output = output.replace('</head>', `${head}\n</head>`);
  output = output.replace(/<footer>[^<]+<\/footer>/, `<footer>Gloss Tools by GlossQuote · <a href="${locale.home}">${locale.homeLabel}</a></footer>`);
  return { html: output, hash: createHash('sha256').update(schema).digest('base64') };
}
function notFound(language) {
  const en = language === 'en';
  return `<!doctype html>\n<html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${en ? 'Page not found' : '找不到頁面'} | GlossQuote</title><link rel="stylesheet" href="/styles/app.css"></head><body><main><h1>${en ? 'Page not found' : '找不到頁面'}</h1><p>${en ? 'This address does not contain a packing list page.' : '這個網址沒有行李清單頁面。'}</p><p><a href="${en ? '/en/index.html' : '/index.html'}">${en ? 'Open the packing list' : '開啟行李清單'}</a></p><p><a href="${en ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html'}">${en ? 'All Gloss tools' : '所有 Gloss 工具'}</a></p></main></body></html>\n`;
}
export function securityHeaders(hashes) {
  const script = `script-src 'self' ${hashes.map(hash => `'sha256-${hash}'`).join(' ')}`;
  return {
    'Content-Security-Policy': `${CSP_BASE}; ${script}`,
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cache-Control': 'no-store', 'Strict-Transport-Security': 'max-age=31536000'
  };
}
export async function walkProduction(root, folder, { missing = false, complete = true } = {}) {
  await verifyRoot(root); await verifyPath(root, folder, { directory: true, missing });
  const allowedDirectories = new Set(PRODUCTION_FILES.flatMap(file => { const parts = file.split('/'); return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/')); }));
  const files = [];
  async function walk(path) {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); }
    catch (error) { if (missing && error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const target = join(path, entry.name), name = relative(folder, target).replaceAll('\\', '/');
      await verifyPath(root, target, { directory: entry.isDirectory() });
      if (entry.isDirectory()) {
        if (!allowedDirectories.has(name)) throw new Error('UNKNOWN_PRODUCTION_DIRECTORY');
        await walk(target);
      } else {
        if (!PRODUCTION_FILES.includes(name)) throw new Error('UNKNOWN_PRODUCTION_ASSET');
        files.push(name);
      }
    }
  }
  await walk(folder); files.sort();
  if (complete && JSON.stringify(files) !== JSON.stringify(PRODUCTION_FILES)) throw new Error('PRODUCTION_ASSET_MISSING');
  return files;
}
export async function buildProduction(root = PROJECT_ROOT, origin = PRODUCTION_ORIGIN) {
  assertOrigin(origin); root = await verifyRoot(root);
  await validatePublic(root); await assertPinnedPreview(root);
  const target = join(root, 'dist-production');
  await walkProduction(root, target, { missing: true, complete: false });
  const output = new Map();
  for (const file of PUBLIC_FILES) output.set(file, await readFile(join(root, 'public', file)));
  const hashes = [];
  for (const locale of locales) {
    const built = metadata(output.get(locale.path).toString('utf8'), locale);
    output.set(locale.path, Buffer.from(built.html)); hashes.push(built.hash);
  }
  output.set('404.html', Buffer.from(notFound('zh-Hant')));
  output.set('en/404.html', Buffer.from(notFound('en')));
  output.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${PRODUCTION_ORIGIN}/sitemap.xml\n`));
  output.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${PRODUCTION_ORIGIN}/index.html</loc></url><url><loc>${PRODUCTION_ORIGIN}/en/index.html</loc></url></urlset>\n`));
  const headers = securityHeaders(hashes);
  let rules = '/*\n' + Object.entries(headers).map(([name, value]) => `  ${name}: ${value}\n`).join('');
  for (const file of PUBLIC_FILES.filter(file => file.endsWith('.mjs'))) rules += `\n/${file}\n  Content-Type: text/javascript; charset=utf-8\n`;
  for (const path of ['/404.html', '/en/404.html']) rules += `\n${path}\n  X-Robots-Tag: noindex, nofollow\n`;
  output.set('_headers', Buffer.from(rules));
  // Validate every target before the first write; no stale-file cleanup or recursive delete.
  for (const file of PRODUCTION_FILES) await verifyPath(root, join(target, file), { missing: true });
  for (const file of PRODUCTION_FILES) {
    const path = join(target, file); await verifyPath(root, path, { missing: true });
    await mkdir(dirname(path), { recursive: true }); await verifyPath(root, path, { missing: true });
    await writeFile(path, output.get(file));
  }
  await walkProduction(root, target); await assertPinnedPreview(root);
  return { files: PRODUCTION_FILES, headers, origin };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('UNEXPECTED_ARGUMENT');
  console.log(JSON.stringify(await buildProduction()));
}
