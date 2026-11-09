import { createHash } from 'node:crypto';

export const ORIGIN = 'https://rota.glossquote.com';
export const ASSET_FILES = ['index.html', 'en/index.html', 'styles/app.css', 'js/app.js', 'js/core/roster.js', 'js/core/report.js', 'js/core/schema.js', 'js/core/ui-state.js'].sort();
export const PRODUCTION_FILES = [...ASSET_FILES, '404.html', '_headers', 'robots.txt', 'sitemap.xml'].sort();
export const EXPECTED_CONFIG = {
  name: 'glossquote-duty-roster', compatibility_date: '2026-10-17', workers_dev: false, preview_urls: false, send_metrics: false,
  dependencies_instrumentation: { enabled: false }, observability: { enabled: false, logs: { enabled: false }, traces: { enabled: false } },
  routes: [{ pattern: 'rota.glossquote.com', custom_domain: true }], assets: { directory: './dist-production', html_handling: 'none', not_found_handling: '404-page' },
};
export const cspFor = hash => `default-src 'none'; script-src 'self'${hash ? ` '${hash}'` : ''}; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
const attribute = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
export function makeProduction(source) {
  const files = new Map();
  for (const name of ASSET_FILES) {
    if (!Buffer.isBuffer(source.get(name))) throw Error('Missing source asset');
    files.set(name, Buffer.from(source.get(name)));
  }
  const hashes = new Map();
  for (const [filename, lang] of [['index.html', 'zh-Hant'], ['en/index.html', 'en']]) {
    const html = source.get(filename).toString('utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    if (!title || !description || !html.includes('<meta name="robots" content="noindex,nofollow">')) throw Error('Invalid M1 HTML input');
    const url = `${ORIGIN}/${filename}`;
    const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebApplication', name: lang === 'en' ? 'Duty Roster' : '輪值排班表', url, inLanguage: lang, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', description });
    const hash = `sha256-${createHash('sha256').update(json, 'utf8').digest('base64')}`;
    hashes.set(`/${filename}`, hash);
    const head = [
      `<link rel="canonical" href="${url}">`,
      `<link rel="alternate" hreflang="zh-Hant" href="${ORIGIN}/index.html">`,
      `<link rel="alternate" hreflang="en" href="${ORIGIN}/en/index.html">`,
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/index.html">`,
      '<meta property="og:type" content="website">', '<meta property="og:site_name" content="Gloss Tools by GlossQuote">',
      `<meta property="og:title" content="${attribute(title)}">`, `<meta property="og:description" content="${attribute(description)}">`,
      `<meta property="og:url" content="${url}">`, `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'zh_TW'}">`,
      `<script type="application/ld+json">${json}</script>`,
    ].join('\n');
    files.set(filename, Buffer.from(html.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">').replace('</head>', `${head}\n</head>`), 'utf8'));
  }
  files.set('404.html', Buffer.from('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Page not found | GlossQuote</title><link rel="stylesheet" href="/styles/app.css"></head><body><main><h1>Page not found / 找不到頁面</h1><p>This address has no page. / 此網址沒有頁面。</p><p><a href="/en/index.html">Open the duty roster</a></p><p><a href="/index.html" lang="zh-Hant">開啟輪值排班表</a></p></main></body></html>\n'));
  const lines = ['/*', `  Content-Security-Policy: ${cspFor()}`, '  X-Content-Type-Options: nosniff', '  Referrer-Policy: no-referrer', '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), clipboard-write=(self)', '  Cache-Control: no-store', '  X-Robots-Tag: noindex,nofollow'];
  for (const [route, hash] of hashes) lines.push('', route, '  ! X-Robots-Tag', '  X-Robots-Tag: index,follow', '  ! Content-Security-Policy', `  Content-Security-Policy: ${cspFor(hash)}`);
  files.set('_headers', Buffer.from(lines.join('\n') + '\n'));
  files.set('robots.txt', Buffer.from(`User-agent: *\nDisallow: /\nAllow: /index.html\nAllow: /en/index.html\nAllow: /js/\nAllow: /styles/\nAllow: /robots.txt\nAllow: /sitemap.xml\nSitemap: ${ORIGIN}/sitemap.xml\n`));
  files.set('sitemap.xml', Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${ORIGIN}/index.html</loc></url><url><loc>${ORIGIN}/en/index.html</loc></url></urlset>\n`));
  return new Map([...files].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function headerModel(text, pathname) {
  const result = {};
  let matches = false;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ')) { matches = line === '/*' || line === pathname; continue; }
    if (!matches) continue;
    const value = line.trim();
    if (value.startsWith('! ')) { delete result[value.slice(2).toLowerCase()]; continue; }
    const colon = value.indexOf(':'); if (colon < 1) throw Error('Invalid header rule');
    const key = value.slice(0, colon).toLowerCase(); const item = value.slice(colon + 1).trim();
    result[key] = result[key] ? `${result[key]}, ${item}` : item;
  }
  return result;
}

// Fixed local HTTP model: exact file paths with html_handling=none, not a Cloudflare runtime.
export function productionResponse(files, rawUrl, method = 'GET') {
  const baseHeaders = headerModel(files.get('_headers').toString('utf8'), '/404.html');
  const missing = () => ({ status: 404, headers: { ...baseHeaders, 'content-type': 'text/html;charset=utf-8' }, body: files.get('404.html') });
  if (method !== 'GET' && method !== 'HEAD') return { status: 405, headers: { ...baseHeaders, allow: 'GET, HEAD', 'content-type': 'text/plain;charset=utf-8' }, body: Buffer.from('Method not allowed') };
  let pathname;
  try { if (rawUrl.includes('..') || /%2e|%2f|%5c/i.test(rawUrl)) return missing(); pathname = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1:5209').pathname); } catch { return missing(); }
  const name = pathname.slice(1);
  if (!PRODUCTION_FILES.includes(name) || name === '_headers' || /[\\\u0000]/.test(pathname)) return missing();
  const mime = name.endsWith('.html') ? 'text/html;charset=utf-8' : name.endsWith('.js') ? 'text/javascript;charset=utf-8' : name.endsWith('.css') ? 'text/css;charset=utf-8' : name.endsWith('.xml') ? 'application/xml;charset=utf-8' : 'text/plain;charset=utf-8';
  return { status: 200, headers: { ...headerModel(files.get('_headers').toString('utf8'), pathname), 'content-type': mime }, body: files.get(name) };
}

export function robotsAllows(text, pathname) {
  let applies = false;
  let best = null;
  for (const line of text.split('\n')) {
    const colon = line.indexOf(':'); if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase(); const value = line.slice(colon + 1).trim();
    if (key === 'user-agent') { applies = value === '*'; continue; }
    if (!applies || !['allow', 'disallow'].includes(key) || !value || !pathname.startsWith(value)) continue;
    if (!best || value.length > best.length || value.length === best.length && key === 'allow') best = { length: value.length, allow: key === 'allow' };
  }
  return best ? best.allow : true;
}
