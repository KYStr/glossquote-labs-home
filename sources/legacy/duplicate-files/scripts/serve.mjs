import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, checkPublic } from './check.mjs';

export const HOST = '127.0.0.1';
export const PORT = 4228;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
export const HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
});

export function createRequestHandler(root = ROOT) {
  return async (request, response) => {
    const finish = (status, text) => {
      response.writeHead(status, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : text);
    };
    if (request.headers.host !== `${HOST}:${PORT}`) return finish(403, 'Forbidden host');
    if (!['GET', 'HEAD'].includes(request.method)) return finish(405, 'Method not allowed');
    const pathname = request.url === '/' ? '/index.html' : request.url;
    if (typeof pathname !== 'string' || !pathname.startsWith('/') || !PUBLIC_FILES.includes(pathname.slice(1))) return finish(404, 'Not found');
    const type = Object.entries(mime).find(([extension]) => pathname.endsWith(extension))?.[1];
    if (!type) return finish(404, 'Not found');
    try {
      const bytes = await readFile(resolve(root, 'public', pathname.slice(1)));
      response.writeHead(200, { ...HEADERS, 'Content-Type': type, 'Content-Length': bytes.length });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { finish(404, 'Not found'); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await checkPublic();
  const server = createServer(createRequestHandler());
  server.on('error', () => { console.error('Local candidate server could not start. No existing process was stopped.'); process.exitCode = 1; });
  server.listen(PORT, HOST, () => console.log(`Local candidate: http://${HOST}:${PORT} (no browser opened)`));
}
