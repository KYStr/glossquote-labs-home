export const productionOrigin = 'https://split.glossquote.com';
export const pageMetadata = Object.freeze({
  'index.html': { lang: 'zh-Hant', ogLocale: 'zh_TW', name: '算出誰付給誰', title: '分帳結算｜填已付金額，算出誰付給誰 — GlossQuote', description: '填入每人的已付金額，沒付填0，自動加總並平均或依份數分攤，算出誰付給誰多少。本機計算，不需帳號。' },
  'en/index.html': { lang: 'en', ogLocale: 'en_US', name: 'See who pays whom', title: 'Quick Bill Settlement & Advanced Split — GlossQuote', description: 'Enter what each person paid, including 0. Total shared payments automatically, split equally or by shares, and see who pays whom. Local calculations without an account.' }
});
export function releaseHtml(source, file) {
  const meta = pageMetadata[file];
  if (!meta) return source;
  const url = `${productionOrigin}/${file}`;
  const escape = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const structured = { '@context': 'https://schema.org', '@type': 'WebApplication', name: meta.name, description: meta.description, url, inLanguage: meta.lang, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript and BigInt' };
  const seo = `<link rel="canonical" href="${url}">\n<link rel="alternate" hreflang="zh-Hant" href="${productionOrigin}/index.html">\n<link rel="alternate" hreflang="en" href="${productionOrigin}/en/index.html">\n<link rel="alternate" hreflang="x-default" href="${productionOrigin}/index.html">\n<meta property="og:type" content="website">\n<meta property="og:title" content="${escape(meta.title)}">\n<meta property="og:description" content="${escape(meta.description)}">\n<meta property="og:url" content="${url}">\n<meta property="og:locale" content="${meta.ogLocale}">\n<script type="application/ld+json">${JSON.stringify(structured)}</script>`;
  return source.replace('<meta name="robots" content="noindex,nofollow">', '<meta name="robots" content="index,follow">').replace(/<p class="preview" data-preview>[^<]*<\/p>/, '').replace('</head>', seo + '\n</head>');
}
export function robots(production) {
  return production ? `User-agent: *\nAllow: /\nSitemap: ${productionOrigin}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}
export function sitemap(production) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${production ? Object.keys(pageMetadata).map(file => `\n  <url><loc>${productionOrigin}/${file}</loc></url>`).join('') + '\n' : ''}</urlset>\n`;
}
export function headers(source, production) { return source + (production ? '' : '  X-Robots-Tag: noindex, nofollow\n'); }
