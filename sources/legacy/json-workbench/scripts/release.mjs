export const RELEASE_ORIGIN = 'https://json.glossquote.com';
const pages = [{file:'index.html',language:'zh-Hant'},{file:'en/index.html',language:'en'}];
export function releaseOptions(args) {
  if (args.length===0) return {release:false,origin:null};
  if (args.length!==2 || args[0]!=='--release' || args[1]!==`--origin=${RELEASE_ORIGIN}`) throw new Error('Release requires --release --origin=https://json.glossquote.com');
  return {release:true,origin:RELEASE_ORIGIN};
}
function alternates(origin) {
  return pages.map(page=>`  <link rel="alternate" hreflang="${page.language}" href="${origin}/${page.file}">`).join('\n')+`\n  <link rel="alternate" hreflang="x-default" href="${origin}/index.html">`;
}
export function releaseHTML(html,file,origin) {
  if (origin!==RELEASE_ORIGIN || !pages.some(page=>page.file===file)) throw new Error('Invalid release page or origin');
  if (!html.includes('<meta name="robots" content="noindex,nofollow">') || /rel="canonical"/u.test(html)) throw new Error('Unexpected preview metadata');
  return html.replace('<meta name="robots" content="noindex,nofollow">',`<meta name="robots" content="index,follow">\n  <link rel="canonical" href="${origin}/${file}">\n${alternates(origin)}`);
}
export function robots(release) {
  return release ? `User-agent: *\nAllow: /\nDisallow: /404.html\nSitemap: ${RELEASE_ORIGIN}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n';
}
export function sitemap() {
  const links=pages.map(page=>`    <xhtml:link rel="alternate" hreflang="${page.language}" href="${RELEASE_ORIGIN}/${page.file}"/>`).join('\n')+`\n    <xhtml:link rel="alternate" hreflang="x-default" href="${RELEASE_ORIGIN}/index.html"/>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map(page=>`  <url>\n    <loc>${RELEASE_ORIGIN}/${page.file}</loc>\n${links}\n  </url>`).join('\n')}\n</urlset>\n`;
}
export function releaseHeaders(headers) {
  if (!headers.includes('  X-Robots-Tag: noindex, nofollow\n')) throw new Error('Missing preview header');
  return headers.replace('  X-Robots-Tag: noindex, nofollow\n','')+'\n/404.html\n  X-Robots-Tag: noindex, nofollow\n';
}
