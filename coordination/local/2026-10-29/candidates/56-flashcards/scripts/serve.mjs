import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, closedTree } from './files.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const SECURITY = { 'Content-Security-Policy': "default-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };

export function staticResponse({ method, host, path }, root = ROOT) {
  const headers = { ...SECURITY, 'Content-Type': 'text/plain; charset=utf-8' };
  if (host !== '127.0.0.1:4236') return { status: 403, headers, body: Buffer.from('Forbidden\n') };
  if (!['GET', 'HEAD'].includes(method)) return { status: 405, headers: { ...headers, Allow: 'GET, HEAD' }, body: Buffer.from('Method not allowed\n') };
  if (typeof path !== 'string' || !path.startsWith('/') || /[%\\?#\u0000-\u0020]/.test(path) || path.split('/').some(p => p === '.' || p === '..')) return { status: 400, headers, body: Buffer.from('Bad request\n') };
  let file = path === '/' ? 'index.html' : path === '/en/' ? 'en/index.html' : path.slice(1);
  const status = PUBLIC_FILES.includes(file) && !file.startsWith('_') ? 200 : 404;
  if (status === 404) file = '404.html';
  closedTree(join(root, 'dist'), PUBLIC_FILES);
  const extension = file.slice(file.lastIndexOf('.'));
  return { status, headers: { ...headers, 'Content-Type': MIME[extension] }, body: readFileSync(join(root, 'dist', file)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  closedTree(join(ROOT, 'dist'), PUBLIC_FILES);
  const server = createServer((request, response) => {
    try {
      const result = staticResponse({ method: request.method, host: request.headers.host, path: request.url });
      response.writeHead(result.status, { ...result.headers, 'Content-Length': result.body.length });
      response.end(request.method === 'HEAD' ? undefined : result.body);
    } catch { response.writeHead(500, SECURITY); response.end('Unavailable\n'); }
  });
  server.on('error', () => { process.stderr.write('SERVER_UNAVAILABLE\n'); process.exitCode = 1; });
  server.listen(4236, '127.0.0.1', () => process.stdout.write('Preview at http://127.0.0.1:4236 (no browser opened)\n'));
}
