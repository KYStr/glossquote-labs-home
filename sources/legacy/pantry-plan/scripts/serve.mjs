import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PUBLIC_FILES, validatePublic } from './files.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export async function createHandler(root = join(ROOT, 'dist')) {
  await validatePublic(root);
  const bodies = new Map();
  for (const name of PUBLIC_FILES.filter(n => n !== '_headers')) bodies.set(`/${name}`, await readFile(join(root, name)));
  return function handler(req, res) {
    const headers = {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
    let status = 200;
    let path = req.url === '/' ? '/index.html' : req.url === '/en/' ? '/en/index.html' : req.url;
    if (req.headers.host !== '127.0.0.1:4234') status = 421;
    else if (!['GET', 'HEAD'].includes(req.method)) { status = 405; headers.Allow = 'GET, HEAD'; }
    else if (!bodies.has(path)) status = 404;
    if (status !== 200) path = '/404.html';
    const body = bodies.get(path);
    headers['Content-Type'] = MIME[extname(path)] ?? 'text/plain; charset=utf-8';
    headers['Content-Length'] = body.length;
    res.writeHead(status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const handler = await createHandler();
  const server = createServer(handler);
  server.on('error', () => { console.error('LOOPBACK_UNAVAILABLE'); process.exitCode = 1; });
  server.listen(4234, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4234 — no browser opened'));
}
