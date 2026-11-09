import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, PUBLIC_FILES, validatePublic } from './contract.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export function route(method, host, url) {
  if (host !== '127.0.0.1:4235') return { status: 400 };
  if (!['GET', 'HEAD'].includes(method)) return { status: 405 };
  if (typeof url !== 'string' || !url.startsWith('/') || url.includes('%') || url.includes('\\') || url.includes('?') || url.includes('#') || url.includes('..') || url.includes('//')) return { status: 404, file: '404.html' };
  const file = url === '/' ? 'index.html' : url === '/en/' ? 'en/index.html' : url.slice(1);
  return PUBLIC_FILES.includes(file) && file !== '_headers' ? { status: file === '404.html' ? 404 : 200, file } : { status: 404, file: '404.html' };
}
export async function serve() {
  await validatePublic(path.join(ROOT, 'dist'));
  const server = createServer(async (request, response) => {
    const result = route(request.method, request.headers.host, request.url);
    response.writeHead(result.status, {
      'Content-Type': MIME[path.extname(result.file ?? '')] ?? 'text/plain; charset=utf-8',
      'Content-Security-Policy': "default-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
      ...(result.status === 405 ? { Allow: 'GET, HEAD' } : {})
    });
    if (request.method === 'HEAD') { response.end(); return; }
    try { response.end(result.file ? await readFile(path.join(ROOT, 'dist', result.file)) : 'Request rejected.'); }
    catch { response.end('File unavailable.'); }
  });
  server.on('error', () => { process.stderr.write('SERVER_UNAVAILABLE: port must remain 4235; no process was stopped.\n'); process.exitCode = 1; });
  server.listen(4235, '127.0.0.1', () => process.stdout.write('Local preview: http://127.0.0.1:4235 (browser not opened).\n'));
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'serve.mjs')) serve().catch(() => { process.stderr.write('PREVIEW_UNAVAILABLE\n'); process.exitCode = 1; });
