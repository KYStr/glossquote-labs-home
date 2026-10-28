import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, check, inventory } from './check.mjs';

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), clipboard-read=(), clipboard-write=()',
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow',
});
export async function createPreviewServer() {
  await check();
  const directory = path.join(ROOT, 'dist');
  const files = await inventory(directory);
  if (files.length !== PUBLIC_FILES.length) throw new Error('INCOMPLETE_DIST');
  const bodies = new Map();
  for (const file of files) {
    const bytes = await readFile(path.join(directory, file));
    if (!bytes.equals(await readFile(path.join(ROOT, 'public', file)))) throw new Error('STALE_DIST');
    bodies.set(`/${file}`, bytes);
  }
  bodies.set('/', bodies.get('/index.html'));
  bodies.set('/en/', bodies.get('/en/index.html'));
  return createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (request, response) => {
    let status = 200;
    const rawHost = request.rawHeaders.filter((_, i) => i % 2 === 0).filter(v => v.toLowerCase() === 'host');
    if (rawHost.length !== 1 || request.headers.host !== '127.0.0.1:4220') status = 403;
    else if (request.method !== 'GET' && request.method !== 'HEAD') status = 405;
    else if (!bodies.has(request.url)) status = 404;
    const body = status === 200 ? bodies.get(request.url) : Buffer.from(`${status === 404 ? 'Not found' : status === 405 ? 'Method not allowed' : 'Forbidden'}\n`);
    const mime = request.url.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : request.url.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8';
    response.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': status === 200 ? mime : 'text/plain; charset=utf-8', 'Content-Length': body.length, ...(status === 405 ? { Allow: 'GET, HEAD' } : {}) });
    response.end(request.method === 'HEAD' ? undefined : body);
    request.resume();
  });
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const server = await createPreviewServer();
    server.on('error', error => { process.stderr.write(`${error.code === 'EADDRINUSE' ? 'PORT_4220_IN_USE' : 'SERVER_ERROR'}\n`); process.exitCode = 1; });
    server.listen(4220, '127.0.0.1', () => process.stdout.write('Preview: http://127.0.0.1:4220 (loopback only)\n'));
  } catch (error) { process.stderr.write(`SERVE FAIL: ${error.message}\n`); process.exitCode = 1; }
}
