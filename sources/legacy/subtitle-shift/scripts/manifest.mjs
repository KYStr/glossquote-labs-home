export const ASSETS = Object.freeze([
  '404.html', '_headers', 'app.mjs', 'controller.mjs', 'core.mjs', 'download-urls.mjs',
  'en/index.html', 'index.html', 'messages.mjs', 'protocol.mjs', 'robots.txt', 'styles.css', 'worker.mjs'
]);
export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export const HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(), clipboard-write=()'
});
export function mime(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  if (path.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (path === 'robots.txt') return 'text/plain; charset=utf-8';
  throw new Error('UNSERVED_ASSET');
}
