import { createServer } from 'node:http';
import path from 'node:path';
import { readAssets } from './files.mjs';
import { SECURITY_HEADERS } from './release-contract.mjs';

export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'";
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };

export function routePath(raw) {
  try {
    const pathname = raw.split('?')[0];
    if (!pathname.startsWith('/') || /[\\\u0000-\u001f\u007f]|%2f|%5c/iu.test(pathname)) return null;
    const decoded = decodeURIComponent(pathname);
    if (/[\\\u0000-\u001f\u007f]/u.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..')) return null;
    if (decoded === '/') return 'index.html';
    if (decoded === '/en/') return 'en/index.html';
    return decoded.slice(1);
  } catch { return null; }
}

export async function makeServer(root, { production = false } = {}) {
  const assets = await readAssets(root, { production });
  return createServer((request, response) => {
    response.setHeader('Content-Security-Policy', CSP);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('X-Frame-Options', 'DENY');
    if (production) for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
    else response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
    const file = routePath(request.url ?? '');
    let status = 200;
    let bytes;
    let contentType;
    if (!['GET', 'HEAD'].includes(request.method)) {
      status = 405; bytes = Buffer.from('Method not allowed'); response.setHeader('Allow', 'GET, HEAD');
    } else if (!file || !assets.has(file) || file === '_headers' || (production && file === '404.html')) {
      status = 404; bytes = production ? assets.get('404.html') : Buffer.from('Not found');
      if (production) { contentType = mime['.html']; response.setHeader('X-Robots-Tag', 'noindex, nofollow'); }
    }
    else { bytes = assets.get(file); }
    response.writeHead(status, { 'Content-Type': contentType ?? (status === 200 ? mime[path.extname(file)] : 'text/plain; charset=utf-8'), 'Content-Length': bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = error => { server.off('listening', onListening); reject(error); };
    const onListening = () => { server.off('error', onError); resolve(server.address()); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ host: '127.0.0.1', port });
  });
}

export async function listenPreferred(server, port = 4199) {
  try { return { address: await listen(server, port), fallback: false }; }
  catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    return { address: await listen(server, 0), fallback: true };
  }
}
