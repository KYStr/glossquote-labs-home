// CSP 封鎖連線與外部內容；檔案輸入不需任何上傳端點。
export const csp = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const headers = { 'Content-Security-Policy': csp, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
// 正式輸出必須指定來源；預覽禁止接受來源，避免誤植 canonical。
export function options(args) {
  if (args.some(arg => arg !== '--production' && !arg.startsWith('--site=')) || args.filter(arg => arg === '--production').length > 1 || args.filter(arg => arg.startsWith('--site=')).length > 1) throw Error('ARGUMENT');
  const production = args.includes('--production'), raw = args.find(arg => arg.startsWith('--site='))?.slice(7);
  if (!production && raw !== undefined || production && !raw) throw Error('SITE_REQUIRED');
  if (!production) return { production: false, site: null };
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash || url.hostname === 'localhost' || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(url.hostname) || raw !== url.origin) throw Error('SITE_INVALID');
  return { production: true, site: url.origin };
}
// 正式頁只由明確提供的 origin 衍生，不內建候選網址。
export function outputPage(html, path, { production, site }) {
  if (!production) return html;
  const pages = [['zh-Hant', 'index.html'], ['en', 'en/index.html'], ['x-default', 'index.html']];
  const links = `<link rel="canonical" href="${site}/${path}">\n${pages.map(([lang, page]) => `<link rel="alternate" hreflang="${lang}" href="${site}/${page}">`).join('\n')}`;
  return html.replace('content="noindex,nofollow"', 'content="index,follow"').replace('</head>', `${links}\n</head>`);
}
// 產出主機規則但不會呼叫發布服務。
export function extras({ production, site }) {
  const security = `/*\n${Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n${production ? '' : '  X-Robots-Tag: noindex, nofollow\n'}\n/404.html\n  X-Robots-Tag: noindex, nofollow\n\n/js/*\n  Content-Type: text/javascript; charset=utf-8\n`;
  const result = { '_headers': security, '_redirects': '/ /index.html 301\n/en /en/index.html 301\n/en/ /en/index.html 301\n', 'robots.txt': production ? `User-agent: *\nAllow: /\nSitemap: ${site}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n' };
  if (production) result['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['index.html', 'en/index.html'].map(path => `<url><loc>${site}/${path}</loc></url>`).join('')}</urlset>\n`;
  return result;
}
