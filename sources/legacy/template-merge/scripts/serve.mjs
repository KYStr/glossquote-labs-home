import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, requireNode24, assertPublicTree } from './assets.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});

export function createHandler(root = path.join(ROOT, 'public')) {
  return async (request, response) => {
    const send = (status, body = '', headers = {}) => {
      response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', ...headers });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (!['127.0.0.1:4223', 'localhost:4223'].includes(request.headers.host)) return send(403, 'Host rejected.');
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method rejected.', { Allow: 'GET, HEAD' });
    let route;
    try { route = decodeURIComponent(request.url); }
    catch { return send(400, 'Invalid path.'); }
    if (route === '/') route = '/index.html';
    if (route === '/en/') route = '/en/index.html';
    const file = route.slice(1);
    if (!route.startsWith('/') || !PUBLIC_FILES.includes(file) || file === '_headers') return send(404, 'Not found.');
    try {
      await assertPublicTree(root);
      const data = await readFile(path.join(root, file));
      send(200, data, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Content-Length': data.byteLength });
    } catch { send(500, 'Asset unavailable.'); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  requireNode24();
  await assertPublicTree(path.join(ROOT, 'public'));
  const server = createServer(createHandler());
  server.on('error', () => { process.stderr.write('Preview unavailable; port 4223 may be in use. No process was stopped.\n'); process.exitCode = 1; });
  server.listen(4223, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:4223 (no browser opened)\n'));
}
