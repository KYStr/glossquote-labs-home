import { deepStrictEqual } from 'node:assert';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, ASSETS, HEADERS, inside, inspectTree, validateSource } from './validation.mjs';

export const ORIGIN = 'https://subscriptions.glossquote.com';
export const PRODUCTION_ASSETS = Object.freeze([...ASSETS, '_headers', 'sitemap.xml'].sort());
export const EXPECTED_CONFIG = Object.freeze({
  name: 'glossquote-subscription-budget', compatibility_date: '2026-10-16',
  workers_dev: false, preview_urls: false, send_metrics: false,
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'subscriptions.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } }
});
export const MIME = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
});
export function assertReleaseConfig(config) {
  try { deepStrictEqual(config, EXPECTED_CONFIG); }
  catch { throw new Error('RELEASE_CONFIG_MISMATCH'); }
}
export async function validateReleaseConfig() {
  const config = JSON.parse(await readFile(path.join(ROOT, 'wrangler.jsonc'), 'utf8'));
  assertReleaseConfig(config);
  return config;
}
const sha = text => createHash('sha256').update(text, 'utf8').digest('base64');
const attribute = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const unescapeAttribute = text => text.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');

function renderPage(source, lang, file) {
  const url = `${ORIGIN}/${file}`;
  const title = source.match(/<title>([^<]+)<\/title>/)?.[1];
  const descriptionRaw = source.match(/<meta name="description" content="([^"]+)">/)?.[1];
  const name = source.match(/<h1>([^<]+)<\/h1>/)?.[1];
  if (!title || !descriptionRaw || !name || source.split('content="noindex,nofollow"').length !== 2) throw new Error('PAGE_TEMPLATE_MISMATCH');
  const description = unescapeAttribute(descriptionRaw);
  const data = {
    '@context': 'https://schema.org', '@type': 'WebApplication', name, description, url,
    inLanguage: lang, applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any modern web browser', browserRequirements: 'Requires JavaScript.',
    isAccessibleForFree: true, publisher: { '@type': 'Organization', name: 'GlossQuote' }
  };
  const json = JSON.stringify(data).replaceAll('<', '\\u003c');
  const metadata = [
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Gloss Tools by GlossQuote">',
    `<meta property="og:title" content="${attribute(unescapeAttribute(title))}">`,
    `<meta property="og:description" content="${attribute(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<script type="application/ld+json">${json}</script>`
  ].map(line => `  ${line}`).join('\n');
  return {
    html: source.replace('content="noindex,nofollow"', 'content="index,follow"').replace('</head>', `${metadata}\n</head>`),
    hash: `'sha256-${sha(json)}'`
  };
}

export function productionHeaders(hashes) {
  const headers = { ...HEADERS, 'X-Frame-Options': 'DENY' };
  delete headers['X-Robots-Tag'];
  headers['Content-Security-Policy'] = HEADERS['Content-Security-Policy'].replace("script-src 'self'", `script-src 'self' ${hashes.join(' ')}`);
  return headers;
}
function headerFile(headers) {
  const blocks = [
    ['/*', headers],
    ['/*.html', { 'Content-Type': MIME['.html'] }],
    ['/styles.css', { 'Content-Type': MIME['.css'] }],
    ['/js/*', { 'Content-Type': MIME['.mjs'] }],
    ['/robots.txt', { 'Content-Type': MIME['.txt'] }],
    ['/sitemap.xml', { 'Content-Type': MIME['.xml'] }],
    ['/index.html', { 'X-Robots-Tag': 'index, follow' }],
    ['/en/index.html', { 'X-Robots-Tag': 'index, follow' }],
    ['/404.html', { 'X-Robots-Tag': 'noindex, nofollow' }]
  ];
  const text = blocks.map(([route, values]) => [route, ...Object.entries(values).map(([name, value]) => `  ${name}: ${value}`)].join('\n')).join('\n\n') + '\n';
  if (text.split('\n').some(line => line.length > 2000)) throw new Error('HEADER_LINE_LIMIT');
  return text;
}

export async function renderProduction() {
  await validateSource();
  await validateReleaseConfig();
  const files = new Map(await Promise.all(ASSETS.map(async file => [file, await readFile(inside(path.join(ROOT, 'public'), file))])));
  const hashes = [];
  for (const [file, lang] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    const rendered = renderPage(files.get(file).toString('utf8'), lang, file);
    files.set(file, Buffer.from(rendered.html, 'utf8'));
    hashes.push(rendered.hash);
  }
  files.set('robots.txt', Buffer.from(`User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  files.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/index.html</loc></url>\n  <url><loc>${ORIGIN}/en/index.html</loc></url>\n</urlset>\n`));
  files.set('_headers', Buffer.from(headerFile(productionHeaders(hashes)), 'utf8'));
  return files;
}

export async function validateProduction() {
  const expected = await renderProduction();
  const output = path.join(ROOT, 'dist-production');
  const found = await inspectTree(output, { allowed: PRODUCTION_ASSETS });
  if (JSON.stringify(found) !== JSON.stringify(PRODUCTION_ASSETS)) throw new Error('PRODUCTION_ASSET_SET');
  const files = new Map();
  for (const file of PRODUCTION_ASSETS) {
    const bytes = await readFile(inside(output, file));
    if (!bytes.equals(expected.get(file))) throw new Error('STALE_PRODUCTION_BUILD');
    files.set(file, bytes);
  }
  return files;
}

// The local model consumes the actual generated _headers, never a relaxed CSP.
export function headersForAsset(files, file) {
  const rules = files.get('_headers').toString('utf8');
  const headers = {};
  let current = '';
  for (const line of rules.split('\n')) {
    if (!line) continue;
    if (!line.startsWith(' ')) { current = line; continue; }
    const match = line.match(/^  ([A-Za-z-]+): (.+)$/);
    if (!match) throw new Error('HEADER_RULE_MISMATCH');
    const applies = current === '/*' || current === `/${file}` ||
      (current === '/*.html' && file.endsWith('.html')) ||
      (current === '/js/*' && file.startsWith('js/'));
    if (applies) {
      if (Object.hasOwn(headers, match[1])) throw new Error('DUPLICATE_HEADER_RULE');
      headers[match[1]] = match[2];
    }
  }
  return headers;
}
