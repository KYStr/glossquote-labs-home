import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, inspectTree } from './files.mjs';

const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.mjs': 'text/javascript;charset=utf-8' };
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Cross-Origin-Opener-Policy': 'same-origin'
});

// Pure request routing is testable offline without binding a socket.
export async function routeRequest({ method, target, host }, publicRoot = join(ROOT, 'public')) {
  const response = (status, body = '', extra = {}) => ({ status, headers: { ...SECURITY_HEADERS, ...extra }, body: method === 'HEAD' ? Buffer.alloc(0) : Buffer.from(body) });
  if (host !== '127.0.0.1:4239') return response(421, 'Invalid host');
  if (!['GET', 'HEAD'].includes(method)) return response(405, 'Method not allowed', { Allow: 'GET, HEAD' });
  if (typeof target !== 'string' || target.length > 2048 || !target.startsWith('/') || /[\\%?#\u0000-\u0020\u007f]/u.test(target) || target.startsWith('//') || target.split('/').some(p => p === '.' || p === '..')) return response(400, 'Invalid path');
  const aliases = { '/': 'index.html', '/en/': 'en/index.html' };
  const file = aliases[target] ?? target.slice(1);
  if (!PUBLIC_FILES.includes(file)) return response(404, 'Not found');
  try {
    await inspectTree(publicRoot);
    const bytes = await readFile(join(publicRoot, file));
    const suffix = file.slice(file.lastIndexOf('.'));
    return response(200, bytes, { 'Content-Type': MIME[suffix], 'Content-Length': String(bytes.length) });
  } catch { return response(500, 'Source unavailable'); }
}

export function makeServer() {
  return createServer(async (request, response) => {
    const result = await routeRequest({ method: request.method, target: request.url, host: request.headers.host });
    response.writeHead(result.status, result.headers);
    response.end(result.body);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const server = makeServer();
  server.on('error', () => { process.stderr.write('Preview server unavailable. No other process was changed.\n'); process.exitCode = 1; });
  server.listen(4239, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:4239 (noindex)\n'));
}
