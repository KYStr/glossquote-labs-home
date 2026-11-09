import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { PUBLIC_FILES, root, requireNode24, closedTree } from './files.mjs';

const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8' };
export function route(method, host, path) {
  if (!['127.0.0.1:4231', 'localhost:4231'].includes(host)) return { status: 403 };
  if (!['GET', 'HEAD'].includes(method)) return { status: 405 };
  const file = path === '/' ? 'index.html' : path.startsWith('/') ? path.slice(1) : '';
  if (!PUBLIC_FILES.includes(file)) return { status: 404 };
  return { status: 200, file, type: MIME[file.split('.').at(-1)] };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  requireNode24();
  await closedTree(new URL('public/', root));
  const server = createServer(async (request, response) => {
    const answer = route(request.method, request.headers.host, request.url);
    const headers = {
      'Content-Type': answer.type ?? 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; media-src blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'Permissions-Policy': 'microphone=(), camera=(), geolocation=()',
      ...(answer.status === 405 ? { Allow: 'GET, HEAD' } : {})
    };
    if (answer.status !== 200) {
      response.writeHead(answer.status, headers);
      response.end(request.method === 'HEAD' ? undefined : 'Request rejected.');
      return;
    }
    try {
      const bytes = await readFile(new URL(answer.file, new URL('public/', root)));
      response.writeHead(200, { ...headers, 'Content-Length': bytes.byteLength });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch {
      response.writeHead(500, headers);
      response.end('Static file unavailable.');
    }
  });
  server.on('error', () => { console.error('Local server unavailable; no process was stopped.'); process.exitCode = 1; });
  server.listen(4231, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4231 (no browser opened).'));
}
