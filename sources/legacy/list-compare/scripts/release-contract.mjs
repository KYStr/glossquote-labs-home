import { createHash } from 'node:crypto';

export const ORIGIN = 'https://lists.glossquote.com';
export const PAGES = Object.freeze({ 'zh-Hant': '/index.html', en: '/en/index.html' });
export const WRANGLER_VERSION = '4.147.0';
export const WORKER_CONFIG = Object.freeze({
  name: 'glossquote-labs-list-compare', compatibility_date: '2026-10-13',
  workers_dev: false, preview_urls: false,
  assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
  routes: [{ pattern: 'lists.glossquote.com', custom_domain: true }],
  observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } }
});
export function structuredData(language) {
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication',
    name: language === 'en' ? 'Compare and merge lists' : '名單比對與合併',
    url: ORIGIN + PAGES[language], inLanguage: language,
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web'
  });
}
const hashes = Object.keys(PAGES).map(language => `'sha256-${createHash('sha256').update(structuredData(language)).digest('base64')}'`);
export const PRODUCTION_CSP = `default-src 'none'; script-src 'self' ${hashes.join(' ')}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'`;
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': PRODUCTION_CSP,
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000', 'Cache-Control': 'no-store'
});
export function headersText() {
  return '/*\n' + Object.entries(SECURITY_HEADERS).map(([key, value]) => `  ${key}: ${value}`).join('\n')
    + '\n/404.html\n  X-Robots-Tag: noindex, nofollow\n';
}
export function robotsText() { return `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`; }
export function sitemapText() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Object.values(PAGES).map(url => `  <url><loc>${ORIGIN}${url}</loc></url>`).join('\n')}\n</urlset>\n`;
}
export function productionPage(preview, language) {
  const canonical = ORIGIN + PAGES[language];
  if (!Object.hasOwn(PAGES, language)) throw new Error('Unsupported release language');
  const title = /<title>([^<]+)<\/title>/.exec(preview)?.[1];
  const description = /<meta name="description" content="([^"]+)">/.exec(preview)?.[1];
  if (!title || !description || !preview.includes('content="noindex,nofollow"')) throw new Error('Preview metadata missing');
  return preview.replace('content="noindex,nofollow"', 'content="index,follow"')
    .replace(/<meta http-equiv="Content-Security-Policy" content="[^"]+">/, `<meta http-equiv="Content-Security-Policy" content="${PRODUCTION_CSP.replace('; frame-ancestors \'none\'', '')}">`)
    .replace('</head>', `  <link rel="canonical" href="${canonical}">\n  <link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">\n  <link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">\n  <link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">\n  <meta property="og:type" content="website">\n  <meta property="og:title" content="${title}">\n  <meta property="og:description" content="${description}">\n  <meta property="og:url" content="${canonical}">\n  <meta property="og:locale" content="${language === 'en' ? 'en_US' : 'zh_TW'}">\n  <script type="application/ld+json">${structuredData(language)}</script>\n</head>`);
}
export function notFoundPage() {
  return `<!doctype html>\n<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><title>找不到頁面 / Page not found | GlossQuote</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/styles/app.css"></head><body><header class="topbar"><span class="brand">Gloss Tools by GlossQuote</span></header><main><h1>找不到頁面</h1><p>這個網址沒有對應的頁面。請返回名單比對工具。</p><p><a href="/index.html">名單比對與合併</a></p><h2 lang="en">Page not found</h2><p lang="en">There is no page at this address. Return to the list comparison tool.</p><p lang="en"><a href="/en/index.html">Compare and merge lists</a></p></main></body></html>\n`;
}
