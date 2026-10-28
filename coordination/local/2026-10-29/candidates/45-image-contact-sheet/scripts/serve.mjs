import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, treeFiles, assertAllowlist } from './files.mjs';

export const PORT = 4225;
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
});
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
const routes = new Map(PUBLIC_FILES.filter((file) => file !== '_headers').map((file) => ['/' + file, file]));
routes.set('/', 'index.html'); routes.set('/en/', 'en/index.html');
export function routeRequest({ method, host, url }) {
  if (host !== `127.0.0.1:${PORT}`) return { status: 403 };
  if (method !== 'GET' && method !== 'HEAD') return { status: 405 };
  if (typeof url !== 'string' || /[%\\?#\u0000-\u0020]/u.test(url) || url.includes('..')) return { status: 404 };
  const file = routes.get(url);
  return file ? { status: 200, file, type: mime[path.extname(file)] } : { status: 404 };
}

export async function createPreviewServer() {
  const directory = path.join(ROOT, 'dist');
  assertAllowlist(await treeFiles(directory), [...PUBLIC_FILES, 'manifest.json']);
  // Read only the closed build inventory before listening. No workspace file serving or per-request path resolution.
  const bytes = new Map();
  for (const file of PUBLIC_FILES.filter((file) => file !== '_headers')) bytes.set(file, await readFile(path.join(directory, file)));
  return createServer((request, response) => {
    const route = routeRequest({ method: request.method, host: request.headers.host, url: request.url });
    const body = route.status === 200 ? bytes.get(route.file) : Buffer.from(String(route.status));
    response.writeHead(route.status, { ...SECURITY_HEADERS, 'Content-Type': route.type ?? 'text/plain; charset=utf-8', 'Content-Length': body.length, ...(route.status === 405 ? { Allow: 'GET, HEAD' } : {}) });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const server = await createPreviewServer();
    server.on('error', (error) => { console.error(error.code === 'EADDRINUSE' ? 'PORT_IN_USE: stop; no process was terminated.' : 'PREVIEW_SERVER_FAILED'); process.exitCode = 1; });
    server.listen(PORT, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${PORT} (no browser opened)`));
  } catch { console.error('PREVIEW_BUILD_REQUIRED'); process.exitCode = 1; }
}
