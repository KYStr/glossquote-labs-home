import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, PUBLIC_FILES, CSP, validateTree } from './check.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
export function resolveRequest(method, host, raw, port = 4219) {
  if (!['127.0.0.1:' + port, 'localhost:' + port].includes(host)) return { status: 403 };
  if (!['GET', 'HEAD'].includes(method)) return { status: 405 };
  if (typeof raw !== 'string' || !raw.startsWith('/') || /[%\\?#\x00-\x20]/.test(raw) || raw.includes('..') || raw.includes('//')) return { status: 404 };
  const route = raw === '/' ? 'index.html' : raw === '/en/' ? 'en/index.html' : raw.slice(1);
  if (!PUBLIC_FILES.includes(route) || route === '_headers') return { status: 404 };
  return { status: 200, file: route };
}
export function createPreviewServer(port = 4219) {
  return createServer(async (request, response) => {
    const selected = resolveRequest(request.method, request.headers.host, request.url, port);
    response.setHeader('Content-Security-Policy', CSP);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    response.setHeader('Cache-Control', 'no-store');
    if (selected.status !== 200) {
      if (selected.status === 405) response.setHeader('Allow', 'GET, HEAD');
      response.writeHead(selected.status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : 'Unavailable');
      return;
    }
    try {
      const body = await readFile(resolve(ROOT, 'public', selected.file));
      const extension = selected.file.slice(selected.file.lastIndexOf('.'));
      response.writeHead(200, { 'Content-Type': mime[extension], 'Content-Length': body.length });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(500); response.end();
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await validateTree(resolve(ROOT, 'public'));
  const server = createPreviewServer();
  server.on('error', error => { process.stderr.write(error.code === 'EADDRINUSE' ? 'PORT_4219_IN_USE; no process stopped.\n' : 'SERVER_UNAVAILABLE\n'); process.exitCode = 1; });
  server.listen(4219, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:4219 (loopback only)\n'));
}
