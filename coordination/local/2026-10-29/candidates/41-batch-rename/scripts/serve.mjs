import { createServer } from 'node:http';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, CSP } from './check.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };
export const HOST = '127.0.0.1';
export const PORT = 4221;
export function createStaticServer() {
  const root = join(ROOT, 'public');
  return createServer(async (request, response) => {
    const headers = { 'Content-Security-Policy': `${CSP}; frame-ancestors 'none'`, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()', 'Content-Type': 'text/plain; charset=utf-8' };
    function end(status, body) { response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : body); }
    if (request.headers.host !== `${HOST}:${PORT}`) return end(403, 'Forbidden');
    if (request.method !== 'GET' && request.method !== 'HEAD') { headers.Allow = 'GET, HEAD'; return end(405, 'Method not allowed'); }
    let route;
    try { route = decodeURIComponent(request.url); } catch { return end(400, 'Bad request'); }
    if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\') || route.includes('\0') || route.split('/').some(s => s.startsWith('.')) || route.includes('%')) return end(403, 'Forbidden');
    const file = route === '/' ? 'index.html' : route === '/en/' ? 'en/index.html' : route.slice(1);
    if (!PUBLIC_FILES.includes(file)) return end(404, 'Not found');
    try {
      const target = join(root, file);
      for (let cursor = target; cursor !== ROOT; cursor = dirname(cursor)) {
        if ((await lstat(cursor)).isSymbolicLink() || resolve(await realpath(cursor)).toLowerCase() !== resolve(cursor).toLowerCase()) return end(403, 'Forbidden');
      }
      if (!(await lstat(target)).isFile()) return end(404, 'Not found');
      const bytes = await readFile(target);
      headers['Content-Type'] = types[extname(file)];
      headers['Content-Length'] = bytes.length;
      return end(200, bytes);
    } catch { return end(404, 'Not found'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = createStaticServer();
  server.on('error', () => { console.error('SERVER_START_FAILED: preserve existing processes; check port 4221.'); process.exitCode = 1; });
  server.listen(PORT, HOST, () => console.log(`Preview: http://${HOST}:${PORT} (local noindex candidate)`));
}
