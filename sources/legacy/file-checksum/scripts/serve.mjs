import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSafePath, containedPath, readSafeFile, requireCondition, ValidationError } from './validation.mjs';

const DEFAULT_PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const TYPES = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.svg': 'image/svg+xml' });
export const PREVIEW_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const HEADERS = Object.freeze({
  'Content-Security-Policy': PREVIEW_CSP,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});
export function resolveRequestPath(publicRoot, requestTarget) {
  requireCondition(typeof requestTarget === 'string' && requestTarget.startsWith('/') && requestTarget.length <= 2048, 'REQUEST_PATH_INVALID');
  const raw = requestTarget.split('?')[0];
  requireCondition(!/%(?:2f|5c)/i.test(raw), 'REQUEST_PATH_INVALID');
  let pathname;
  try { pathname = decodeURIComponent(raw); }
  catch { throw new ValidationError('REQUEST_PATH_INVALID'); }
  requireCondition(!/[\\%:#\x00-\x20\x7f]/.test(pathname) && !pathname.includes('//'), 'REQUEST_PATH_INVALID');
  const segments = pathname.split('/').filter(Boolean);
  requireCondition(segments.every(segment => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(segment) && !segment.endsWith('.')), 'REQUEST_PATH_INVALID');
  if (pathname.endsWith('/')) segments.push('index.html');
  return containedPath(publicRoot, segments.join('/'));
}
function reply(request, response, status, body, extra = {}) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
  response.writeHead(status, { ...HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': bytes.length, ...extra });
  response.end(request.method === 'HEAD' ? undefined : bytes);
}
export async function createStaticServer(publicRoot = DEFAULT_PUBLIC) {
  const root = path.resolve(publicRoot);
  const stat = await assertSafePath(root);
  requireCondition(stat.isDirectory(), 'PUBLIC_DIRECTORY_REQUIRED');
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000 }, async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      reply(request, response, 405, 'Method not allowed\n', { Allow: 'GET, HEAD', Connection: 'close' });
      return;
    }
    try {
      const target = resolveRequestPath(root, request.url);
      const type = TYPES[path.extname(target)];
      requireCondition(type, 'ASSET_TYPE_FORBIDDEN');
      const bytes = await readSafeFile(target);
      reply(request, response, 200, bytes, { 'Content-Type': type });
    } catch (error) {
      const safeRejection = error instanceof ValidationError || ['ENOENT', 'ENOTDIR', 'EACCES', 'EPERM'].includes(error.code);
      reply(request, response, safeRejection ? 404 : 500, safeRejection ? 'Not found\n' : 'Preview unavailable\n');
    }
  });
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));
  return server;
}
function listen(server, port) {
  return new Promise((resolve, reject) => {
    function onError(error) { server.off('listening', onListening); reject(error); }
    function onListening() { server.off('error', onError); resolve(); }
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen({ host: '127.0.0.1', port, exclusive: true });
  });
}
export async function startPreviewServer({ publicRoot = DEFAULT_PUBLIC, port = 4195 } = {}) {
  requireCondition(Number.isInteger(port) && port >= 0 && port <= 65535, 'PORT_INVALID');
  const server = await createStaticServer(publicRoot);
  let fallback = false;
  try { await listen(server, port); }
  catch (error) {
    if (error.code !== 'EADDRINUSE' || port === 0) throw error;
    fallback = true;
    await listen(server, 0);
  }
  return { server, port: server.address().port, fallback };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    requireCondition(args.length === 0 || (args.length === 2 && args[0] === '--port' && /^(0|[1-9][0-9]{0,4})$/.test(args[1])), 'CLI_ARGUMENT_INVALID');
    const result = await startPreviewServer({ port: args.length ? Number(args[1]) : 4195 });
    console.log(`Preview: http://127.0.0.1:${result.port}/ (${result.fallback ? 'requested port occupied; OS-assigned fallback' : 'loopback only'})`);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => result.server.close(() => { process.exitCode = 0; }));
  } catch (error) {
    console.error(`FAIL dev: ${error.code ?? 'SERVER_FAILED'}`);
    process.exitCode = 1;
  }
}
