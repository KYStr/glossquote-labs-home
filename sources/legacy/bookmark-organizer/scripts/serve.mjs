import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { sourceMap } from './files.mjs';
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
export function makeHandler(files) {
  return (request, response) => {
    const headers = { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" };
    const send = (status, body) => { response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : body); };
    if (!['127.0.0.1:4229', 'localhost:4229'].includes(request.headers.host)) return send(400, 'Invalid host');
    if (!['GET', 'HEAD'].includes(request.method)) return send(405, 'Method not allowed');
    const raw = request.url;
    if (typeof raw !== 'string' || /[%\\?#\u0000-\u0020]/.test(raw) || raw.split('/').includes('..') || raw.includes('//')) return send(400, 'Invalid path');
    const route = raw === '/' ? 'index.html' : raw === '/en/' ? 'en/index.html' : raw.slice(1);
    if (!raw.startsWith('/') || !files.has(route)) return send(404, 'Not found');
    const extension = route.slice(route.lastIndexOf('.'));
    if (!MIME[extension]) return send(404, 'Not found');
    headers['Content-Type'] = MIME[extension];
    return send(200, files.get(route));
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer(makeHandler(await sourceMap()));
  server.on('error', () => { process.stderr.write('Server unavailable; no process was stopped.\n'); process.exitCode = 1; });
  server.listen(4229, '127.0.0.1', () => process.stdout.write('Local preview: http://127.0.0.1:4229 (browser is not opened)\n'));
}
