import { createServer } from 'node:http';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectSite, PROJECT_ROOT, PUBLIC_FILES, CSP } from './check.mjs';

export const DEV_HOST = '127.0.0.1';
export const DEV_PORT = 4238;
const routes = new Map(PUBLIC_FILES.map(file => [`/${file}`, file]));
routes.set('/', 'index.html');
routes.set('/en/', 'en/index.html');
const mime = file => file.endsWith('.html') ? 'text/html;charset=utf-8' : file.endsWith('.css') ? 'text/css;charset=utf-8' : 'text/javascript;charset=utf-8';
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': `${CSP}; frame-ancestors 'none'`, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()'
});

export function resolveRequest({ method, host, url }) {
  if (host !== `${DEV_HOST}:${DEV_PORT}`) return { status: 403 };
  if (method !== 'GET' && method !== 'HEAD') return { status: 405 };
  if (typeof url !== 'string' || url.length > 2048 || !url.startsWith('/') || /[%\\\u0000-\u0020\u007f]/u.test(url)
    || url.startsWith('//') || url.includes('/../') || url.includes('/./') || url.endsWith('/..') || url.endsWith('/.')) return { status: 400 };
  const file = routes.get(url);
  return file ? { status: 200, file } : { status: 404 };
}

// This handler can be exercised offline without listening on a port.
export async function createRequestHandler(root = join(PROJECT_ROOT, 'public')) {
  const contents = await inspectSite(root);
  return (request, response) => {
    const route = resolveRequest({ method: request.method, host: request.headers.host, url: request.url });
    const body = route.file ? contents.get(route.file) : Buffer.from(`${route.status}\n`);
    const headers = { ...SECURITY_HEADERS, 'Content-Type': route.file ? mime(route.file) : 'text/plain;charset=utf-8', 'Content-Length': String(body.length) };
    if (route.status === 405) headers.Allow = 'GET, HEAD';
    response.writeHead(route.status, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const handler = await createRequestHandler();
    const server = createServer(handler);
    server.on('error', () => { process.stderr.write('Preview listener unavailable; no existing process was stopped.\n'); process.exitCode = 1; });
    server.listen(DEV_PORT, DEV_HOST, () => process.stdout.write(`Preview only: http://${DEV_HOST}:${DEV_PORT}\n`));
  } catch { process.stderr.write('Preview validation failed; listener not started.\n'); process.exitCode = 1; }
}
