import { mkdir, readFile, writeFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateProject, validateTree, assertPlainPath, manifest, parseMarkup, PUBLIC_FILES } from './validation.mjs';

export const ORIGIN = 'https://chunks.glossquote.com';
export const APPROVED_PREVIEW_DIGEST = '3608f282455e7f666e967d11121e144463429bd9790a556b976ee77d19aa474c';
export const PRODUCTION_FILES = Object.freeze([...PUBLIC_FILES, '404.html', 'en/404.html', '_headers', '_redirects', 'sitemap.xml', 'styles/not-found.css'].sort());
export const METADATA = Object.freeze({
  'zh-Hant': { path: '/index.html', title: '文字分段與字數限制工具｜GlossQuote Tools', name: '文字分段與字數限制', locale: 'zh_TW', description: '依 Unicode code points 上限把長文字切成可複製片段，並可選擇優先在換行處切。保留原始內容，不套用平台字數規則。' },
  en: { path: '/en/index.html', title: 'Text Chunker with a Unicode Code Point Limit | GlossQuote Tools', name: 'Text Chunker with a Code Point Limit', locale: 'en_US', description: 'Split long text into copyable chunks by a chosen Unicode code point limit, with an optional preference for line breaks. No platform rules are assumed.' }
});
export const WRANGLER_CONFIG = Object.freeze({
  name: 'glossquote-text-chunker', compatibility_date: '2026-10-13', send_metrics: false,
  workers_dev: false, preview_urls: false,
  routes: [{ pattern: 'chunks.glossquote.com', custom_domain: true }],
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page', run_worker_first: false },
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } }
});
export function assertOrigin(origin) {
  if (origin !== ORIGIN) throw new Error('ORIGIN_NOT_ALLOWED');
}
const escapeHtml = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function structuredData(language, origin = ORIGIN) {
  assertOrigin(origin);
  const meta = METADATA[language];
  if (!meta) throw new Error('LANGUAGE_NOT_ALLOWED');
  return { '@context': 'https://schema.org', '@type': 'WebApplication', name: meta.name, url: origin + meta.path, description: meta.description, inLanguage: language, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser' };
}
export function renderHead(language, origin = ORIGIN) {
  assertOrigin(origin);
  const meta = METADATA[language];
  if (!meta) throw new Error('LANGUAGE_NOT_ALLOWED');
  return `<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="robots" content="index,follow">\n  <meta name="description" content="${escapeHtml(meta.description)}">\n  <title>${escapeHtml(meta.title)}</title>\n  <link rel="canonical" href="${origin + meta.path}">\n  <link rel="alternate" hreflang="zh-Hant" href="${origin}/index.html">\n  <link rel="alternate" hreflang="en" href="${origin}/en/index.html">\n  <link rel="alternate" hreflang="x-default" href="${origin}/index.html">\n  <meta property="og:type" content="website">\n  <meta property="og:title" content="${escapeHtml(meta.title)}">\n  <meta property="og:description" content="${escapeHtml(meta.description)}">\n  <meta property="og:url" content="${origin + meta.path}">\n  <meta property="og:site_name" content="GlossQuote Tools">\n  <meta property="og:locale" content="${meta.locale}">\n  <link rel="stylesheet" href="/styles/app.css">\n  <script type="application/ld+json">${JSON.stringify(structuredData(language, origin))}</script>\n  <script type="module" src="/js/app.mjs"></script>\n</head>`;
}
export function renderProductionPage(preview, language, origin = ORIGIN) {
  assertOrigin(origin);
  const heads = preview.match(/<head>[\s\S]*?<\/head>/g);
  if (heads?.length !== 1) throw new Error('HEAD_STRUCTURE');
  return preview.replace(heads[0], renderHead(language, origin));
}
export function render404(language) {
  const en = language === 'en';
  const title = en ? 'Page not found | GlossQuote Tools' : '找不到頁面｜GlossQuote Tools';
  const tool = en ? '/en/index.html' : '/index.html';
  const home = en ? 'https://glossquote.com/en/index.html' : 'https://glossquote.com/index.html';
  return `<!doctype html>\n<html lang="${en ? 'en' : 'zh-Hant'}">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="robots" content="noindex,nofollow">\n  <title>${title}</title>\n  <link rel="stylesheet" href="/styles/app.css">\n  <link rel="stylesheet" href="/styles/not-found.css">\n</head>\n<body>\n  <header class="topbar"><a class="brand" href="${home}">GlossQuote Tools</a></header>\n  <main class="canvas">\n    <h1>${en ? 'Page not found' : '找不到這個頁面'}</h1>\n    <p class="intro">${en ? 'This address has no page. Return to the text tool to start again.' : '這個網址沒有頁面。返回文字工具重新開始。'}</p>\n    <p class="actions"><a class="return-link primary" href="${tool}">${en ? 'Open the text chunker' : '返回文字分段工具'}</a><a class="return-link" href="${home}">${en ? 'Browse GlossQuote Tools' : '查看 GlossQuote 工具'}</a></p>\n  </main>\n</body>\n</html>\n`;
}
export function productionHeaders() {
  const hashes = Object.keys(METADATA).map(language => `'sha256-${createHash('sha256').update(JSON.stringify(structuredData(language))).digest('base64')}'`).join(' ');
  return {
    'Content-Security-Policy': `default-src 'none'; script-src 'self' ${hashes}; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-write=(self)',
    'Cross-Origin-Opener-Policy': 'same-origin', 'Strict-Transport-Security': 'max-age=31536000', 'Cache-Control': 'no-store'
  };
}
export function renderHeaders() {
  return `/*\n${Object.entries(productionHeaders()).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n\n/js/*\n  Content-Type: text/javascript; charset=utf-8\n\n/styles/*\n  Content-Type: text/css; charset=utf-8\n\n/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n`;
}
export const REDIRECTS = '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n';
export function renderSitemap(origin = ORIGIN) {
  assertOrigin(origin);
  const alternate = `<xhtml:link rel="alternate" hreflang="zh-Hant" href="${origin}/index.html"/><xhtml:link rel="alternate" hreflang="en" href="${origin}/en/index.html"/><xhtml:link rel="alternate" hreflang="x-default" href="${origin}/index.html"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n  <url><loc>${origin}/index.html</loc>${alternate}</url>\n  <url><loc>${origin}/en/index.html</loc>${alternate}</url>\n</urlset>\n`;
}
export async function productionContents(projectRoot, origin = ORIGIN) {
  assertOrigin(origin);
  const checked = await validateProject(projectRoot);
  if (checked.runtime.digest !== APPROVED_PREVIEW_DIGEST) throw new Error('APPROVED_PREVIEW_BYTES_CHANGED');
  const contents = new Map();
  for (const file of PUBLIC_FILES) contents.set(file, await readFile(await assertPlainPath(path.join(projectRoot, 'public'), file)));
  for (const [language, file] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) contents.set(file, Buffer.from(renderProductionPage(contents.get(file).toString('utf8'), language, origin)));
  contents.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`));
  contents.set('sitemap.xml', Buffer.from(renderSitemap(origin)));
  contents.set('404.html', Buffer.from(render404('zh-Hant')));
  contents.set('en/404.html', Buffer.from(render404('en')));
  contents.set('_headers', Buffer.from(renderHeaders()));
  contents.set('_redirects', Buffer.from(REDIRECTS));
  contents.set('styles/not-found.css', Buffer.from('.return-link{display:inline-flex;align-items:center;min-height:2.75rem;min-width:2.75rem;padding:var(--gq-space-2) var(--gq-space-4);border:1px solid var(--gq-color-control-border);border-radius:var(--gq-radius-control);background:var(--gq-color-surface);text-decoration:none;font-weight:600}.return-link.primary{background:var(--gq-color-acid);border-color:var(--gq-color-ink)}.return-link:hover{background:var(--gq-color-paper-subtle)}\n'));
  return contents;
}
export async function validateWrangler(projectRoot) {
  const config = JSON.parse(await readFile(await assertPlainPath(projectRoot, 'wrangler.jsonc'), 'utf8'));
  const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
  if (JSON.stringify(stable(config)) !== JSON.stringify(stable(WRANGLER_CONFIG))) throw new Error('WRANGLER_CONTRACT_MISMATCH');
  return config;
}
export function validateProductionPage(html, preview, language) {
  const tags = parseMarkup(html);
  const meta = METADATA[language];
  const findTags = (name, predicate) => tags.filter(tag => tag.name === name && predicate(tag.attrs));
  const unique = (name, predicate) => { const matches = findTags(name, predicate); if (matches.length !== 1) throw new Error('METADATA_CARDINALITY'); return matches[0].attrs; };
  if (unique('link', attrs => attrs.rel === 'canonical').href !== ORIGIN + meta.path) throw new Error('CANONICAL_MISMATCH');
  for (const [lang, route] of [['zh-Hant', '/index.html'], ['en', '/en/index.html'], ['x-default', '/index.html']]) if (unique('link', attrs => attrs.rel === 'alternate' && attrs.hreflang === lang).href !== ORIGIN + route) throw new Error('HREFLANG_MISMATCH');
  if (findTags('link', attrs => attrs.rel === 'alternate').length !== 3) throw new Error('HREFLANG_CARDINALITY');
  if (unique('meta', attrs => attrs.name === 'robots').content !== 'index,follow') throw new Error('PRODUCTION_ROBOTS');
  if (unique('meta', attrs => attrs.property === 'og:url').content !== ORIGIN + meta.path) throw new Error('OG_URL_MISMATCH');
  const json = /<script type="application\/ld\+json">([^<]+)<\/script>/.exec(html);
  if (!json || JSON.stringify(JSON.parse(json[1])) !== JSON.stringify(structuredData(language))) throw new Error('STRUCTURED_DATA_MISMATCH');
  if (findTags('script', attrs => attrs.type === 'application/ld+json').length !== 1) throw new Error('STRUCTURED_DATA_CARDINALITY');
  if (html.slice(html.indexOf('</head>') + 7) !== preview.slice(preview.indexOf('</head>') + 7)) throw new Error('APP_BODY_CHANGED');
  if (html !== renderProductionPage(preview, language)) throw new Error('UNREVIEWED_PRODUCTION_MARKUP');
}
export async function checkProduction(projectRoot, contents) {
  await validateWrangler(projectRoot);
  const expected = await productionContents(projectRoot);
  if (contents) {
    if (JSON.stringify([...contents.keys()].sort()) !== JSON.stringify(PRODUCTION_FILES)) throw new Error('PRODUCTION_FILESET');
    for (const file of PRODUCTION_FILES) if (!contents.get(file).equals(expected.get(file))) throw new Error('PRODUCTION_BYTES_CHANGED');
  } else {
    const target = path.join(projectRoot, 'dist-production');
    await validateTree(target, { files: PRODUCTION_FILES });
    for (const file of PRODUCTION_FILES) if (!(await readFile(path.join(target, file))).equals(expected.get(file))) throw new Error('PRODUCTION_BYTES_CHANGED');
  }
  for (const [language, file] of [['zh-Hant', 'index.html'], ['en', 'en/index.html']]) validateProductionPage(expected.get(file).toString('utf8'), await readFile(path.join(projectRoot, 'public', file), 'utf8'), language);
  return { ok: true, stage: 'production', origin: ORIGIN, previewDigest: APPROVED_PREVIEW_DIGEST, production: contents ? null : await manifest(path.join(projectRoot, 'dist-production'), PRODUCTION_FILES) };
}
export async function buildProduction(projectRoot) {
  await assertPlainPath(projectRoot);
  const contents = await productionContents(projectRoot);
  await checkProduction(projectRoot, contents);
  const target = path.join(projectRoot, 'dist-production');
  try { await lstat(target); await validateTree(target, { complete: false, files: PRODUCTION_FILES }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; await mkdir(target); }
  for (const [file, bytes] of contents) {
    const directory = path.posix.dirname(file);
    await mkdir(path.join(target, directory), { recursive: true });
    await assertPlainPath(target, directory === '.' ? '' : directory);
    await writeFile(path.join(target, file), bytes);
  }
  return checkProduction(projectRoot);
}
