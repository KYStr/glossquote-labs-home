import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PUBLIC_FILES, MIME, closedTree } from './files.mjs';

export function routeRequest(method, target, host) {
  if (host !== '127.0.0.1:4233') return { status: 403 };
  if (!['GET', 'HEAD'].includes(method)) return { status: 405 };
  if (typeof target !== 'string' || !/^\/[a-zA-Z0-9/_.-]*$/.test(target) || target.includes('..') || target.includes('//')) return { status: 404 };
  const path = target === '/' ? 'index.html' : target === '/en/' ? 'en/index.html' : target.slice(1);
  return PUBLIC_FILES.includes(path) && path !== '_headers' ? { status: path === '404.html' ? 404 : 200, path } : { status: 404 };
}
export async function serve() {
  await closedTree(join(ROOT, 'dist'));
  const server = createServer(async (request, response) => {
    const route = routeRequest(request.method, request.url, request.headers.host);
    const headers = { 'Content-Type': MIME[extname(route.path ?? '')] ?? 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Content-Security-Policy': "default-src 'self'; connect-src 'none'; img-src 'self' blob:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
    if (route.status === 405) headers.Allow = 'GET, HEAD';
    try {
      const bytes = await readFile(join(ROOT, 'dist', route.path ?? '404.html'));
      response.writeHead(route.status, { ...headers, 'Content-Length': bytes.byteLength });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(500, headers); response.end(); }
  });
  server.on('error', () => { process.stderr.write('Loopback server unavailable; no process was stopped.\n'); process.exitCode = 1; });
  server.listen(4233, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:4233 (no browser opened)\n'));
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await serve();
