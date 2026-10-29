import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPublic, MIME } from './files.mjs';

const SECURITY_HEADERS = Object.freeze({
  'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
});

// Construction and tests perform no listen, network, browser, shell or desktop action.
export function createRequestHandler(files) {
  const routes = new Map();
  for (const [name, bytes] of files) if (name !== '_headers') routes.set(`/${name}`, { bytes, mime: MIME[extname(name)] });
  routes.set('/', routes.get('/index.html')); routes.set('/en/', routes.get('/en/index.html'));
  return (request, response) => {
    const headers = { ...SECURITY_HEADERS, 'Content-Type': 'text/plain;charset=utf-8' };
    const send = (status, body = '', extra = {}) => {
      const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body);
      response.writeHead(status, { ...headers, ...extra, 'Content-Length': String(bytes.length) });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    };
    if (request.headers.host !== '127.0.0.1:4240') return send(400, 'Bad request');
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed', { Allow: 'GET, HEAD' });
    const path = request.url;
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[\\%\u0000-\u0020\u007f]/.test(path) || path.split('/').some((segment) => segment === '.' || segment === '..')) return send(400, 'Bad request');
    const route = routes.get(path);
    if (!route) return send(404, 'Not found');
    return send(200, route.bytes, { 'Content-Type': route.mime });
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await readPublic();
  const server = createServer(createRequestHandler(files));
  server.on('error', (error) => { process.stderr.write(error.code === 'EADDRINUSE' ? 'Port 4240 is busy; no process was stopped.\n' : 'Local preview could not start.\n'); process.exitCode = 1; });
  server.listen(4240, '127.0.0.1', () => process.stdout.write('Local noindex preview: http://127.0.0.1:4240 (browser is not opened)\n'));
}
