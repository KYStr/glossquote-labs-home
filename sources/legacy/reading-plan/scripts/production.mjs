import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { ASSETS, ROOT, checkedTree } from './files.mjs';
import { M1_PUBLIC } from './m1-oracle.mjs';

export const ORIGIN = 'https://reading.glossquote.com';
export const PRODUCTION_FILES = Object.freeze([...ASSETS, '404.html', '_headers', 'sitemap.xml'].sort());
export const CONFIG = Object.freeze({ name: 'glossquote-reading-plan', compatibility_date: '2026-10-16', workers_dev: false, preview_urls: false, send_metrics: false, assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' }, routes: [{ pattern: 'reading.glossquote.com', custom_domain: true }], observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } } });
export const METADATA = Object.freeze({
  'zh-Hant': Object.freeze({ path: '/index.html', name: '閱讀進度規劃', title: '閱讀進度規劃：依可讀日分配頁數｜GlossQuote Tools', description: '輸入總頁數、已讀頁數、日期範圍與可讀星期，將剩餘頁數分配到各閱讀日。可檢查每日頁數上限；工具不追蹤實際閱讀。', ogLocale: 'zh_TW' }),
  en: Object.freeze({ path: '/en/index.html', name: 'Reading plan', title: 'Reading Plan: Set Pages by Reading Day | GlossQuote Tools', description: 'Enter total and completed pages, a date range, and the weekdays you can read. Distribute remaining pages across those dates and check a daily page cap. The tool does not track reading.', ogLocale: 'en_US' })
});
export function jsonLd(locale) {
  const m = METADATA[locale];
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: m.name, url: ORIGIN + m.path, inLanguage: locale, applicationCategory: 'EducationalApplication', description: m.description, browserRequirements: 'Requires JavaScript.', publisher: { '@type': 'Organization', name: 'GlossQuote' } });
}
export const JSON_LD_HASHES = Object.freeze(['zh-Hant', 'en'].map(locale => createHash('sha256').update(jsonLd(locale), 'utf8').digest('base64')));
export const CSP = `default-src 'none'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'none'; script-src 'self' ${JSON_LD_HASHES.map(hash => `'sha256-${hash}'`).join(' ')}; style-src 'self'; img-src 'self'; font-src 'self'; worker-src 'none'`;
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow'
});
export function headerText() {
  // Header detachment avoids combining a global noindex with an index value.
  // The two explicit canonical pages carry index,follow in their HTML meta.
  return ['/*', ...Object.entries(SECURITY_HEADERS).map(([k, v]) => `  ${k}: ${v}`), '/index.html', '  ! X-Robots-Tag', '/en/index.html', '  ! X-Robots-Tag', '/*.html', '  Content-Type: text/html; charset=utf-8', '/js/*', '  Content-Type: text/javascript; charset=utf-8', '/styles/*', '  Content-Type: text/css; charset=utf-8', '/robots.txt', '  Content-Type: text/plain; charset=utf-8', '/sitemap.xml', '  Content-Type: application/xml; charset=utf-8', ''].join('\n');
}
export function headersForPath(path) {
  const headers = { ...SECURITY_HEADERS };
  if (path === '/index.html' || path === '/en/index.html') delete headers['X-Robots-Tag'];
  return headers;
}
export const ROBOTS = `User-agent: *\nAllow: /index.html\nAllow: /en/index.html\nAllow: /js/\nAllow: /styles/\nDisallow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`;
export const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`;
export const NOT_FOUND = `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="description" content="找不到指定頁面。The requested page was not found."><title>找不到頁面 | Page not found — Gloss Tools</title><link rel="stylesheet" href="/styles/app.css"></head>
<body><header class="topbar"><a class="brand" href="https://glossquote.com/index.html">Gloss Tools <span>by GlossQuote</span></a></header><main class="page"><h1>找不到頁面 / Page not found</h1><p class="intro">這個網址沒有頁面，請返回閱讀規劃工具。<span lang="en">There is no page at this address. Return to the reading planner.</span></p><p><a href="/index.html">閱讀進度規劃</a> · <a href="/en/index.html" lang="en">Reading plan</a></p></main></body></html>
`;

export function productionPage(preview, locale) {
  const m = METADATA[locale];
  if (!m || (preview.match(/<\/head>/g) ?? []).length !== 1 || (preview.match(/<meta name="robots" content="noindex,nofollow">/g) ?? []).length !== 1) throw new Error('PREVIEW_TEMPLATE_INVALID');
  const additions = [
    `  <link rel="canonical" href="${ORIGIN + m.path}">`,
    `  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`,
    `  <meta property="og:type" content="website">`,
    `  <meta property="og:site_name" content="Gloss Tools by GlossQuote">`,
    `  <meta property="og:title" content="${m.title}">`,
    `  <meta property="og:description" content="${m.description}">`,
    `  <meta property="og:url" content="${ORIGIN + m.path}">`,
    `  <meta property="og:locale" content="${m.ogLocale}">`,
    `  <script type="application/ld+json">${jsonLd(locale)}</script>`
  ].join('\n');
  return preview.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">').replace('</head>', additions + '\n</head>');
}
export async function assertM1Public(root = ROOT) {
  const actual = await checkedTree(join(root, 'public'));
  if (!isDeepStrictEqual(actual, M1_PUBLIC)) throw new Error('M1_PUBLIC_CHANGED_STOP');
  return actual;
}
export async function assertProductionInputs(root = ROOT) {
  await assertM1Public(root);
  const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'));
  if (!isDeepStrictEqual(config, CONFIG)) throw new Error('WRANGLER_CLOSED_CONFIG');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  for (const [key, value] of Object.entries({ 'build:production': 'node scripts/build-production.mjs', 'check:production': 'node scripts/check-production.mjs', 'preview:production': 'node scripts/preview-production.mjs', 'release:check': 'node scripts/release-check.mjs' })) if (pkg.scripts[key] !== value) throw new Error('PRODUCTION_SCRIPT_CONTRACT');
}
export async function expectedProduction(root = ROOT) {
  const output = new Map();
  for (const file of ASSETS) {
    const bytes = await readFile(join(root, 'public', file));
    output.set(file, file.endsWith('.html') ? Buffer.from(productionPage(bytes.toString('utf8'), file.startsWith('en/') ? 'en' : 'zh-Hant')) : bytes);
  }
  output.set('robots.txt', Buffer.from(ROBOTS)); output.set('sitemap.xml', Buffer.from(SITEMAP)); output.set('404.html', Buffer.from(NOT_FOUND)); output.set('_headers', Buffer.from(headerText()));
  return output;
}
