import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES, inspectTree, ProjectError } from './files.mjs';

export const HOST = '127.0.0.1';
export const PORT = 4241;
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'; connect-src 'none'; base-uri 'none'; object-src 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow'
});
const routes = new Map(PUBLIC_FILES.map(file => [`/${file}`, file]));
routes.set('/', 'index.html'); routes.set('/en/', 'en/index.html');
const mime = file => file.endsWith('.html') ? 'text/html;charset=utf-8' : file.endsWith('.css') ? 'text/css;charset=utf-8' : 'text/javascript;charset=utf-8';

export function routeRequest({ method, host, target }, files) {
  const head = method === 'HEAD';
  function response(status, body, headers = {}) {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    return { status, headers: { ...SECURITY_HEADERS, 'Content-Type': 'text/plain;charset=utf-8', 'Content-Length': buffer.length, ...headers }, body: head ? Buffer.alloc(0) : buffer };
  }
  if (host !== `${HOST}:${PORT}`) return response(403, 'Forbidden host\n');
  if (!['GET', 'HEAD'].includes(method)) return response(405, 'Method not allowed\n', { Allow: 'GET, HEAD' });
  if (typeof target !== 'string' || target.length > 200 || !target.startsWith('/') || /[%\\?#\u0000-\u0020\u007f]/.test(target)
    || target.startsWith('//') || target.split('/').some(part => part === '..' || part === '.')) return response(400, 'Invalid path\n');
  const file = routes.get(target);
  if (!file || !files.has(file)) return response(404, 'Not found\n');
  return response(200, files.get(file), { 'Content-Type': mime(file) });
}

export async function startDev(root = PROJECT_ROOT) {
  const files = await inspectTree(path.join(root, 'public'));
  const server = createServer((request, reply) => {
    const response = routeRequest({ method: request.method, host: request.headers.host, target: request.url }, files);
    reply.writeHead(response.status, response.headers); reply.end(response.body);
  });
  server.requestTimeout = 5000; server.headersTimeout = 5000; server.maxHeadersCount = 32;
  server.on('clientError', (_error, socket) => { socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'); });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(PORT, HOST, resolve); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { await startDev(); process.stdout.write(`Preview at http://${HOST}:${PORT}/ (no browser opened).\n`); }
  catch (error) { process.stderr.write(`FAIL dev: ${error.code === 'EADDRINUSE' ? 'PORT_IN_USE_NO_PROCESS_STOPPED' : error instanceof ProjectError ? error.code : 'DEV_FAILED'}\n`); process.exitCode = 1; }
}
