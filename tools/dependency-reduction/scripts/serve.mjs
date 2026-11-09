// Loopback-only static preview server.
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
// Serves GET/HEAD with correct MIME, 404s unknown paths, rejects traversal
// and symlink escape, never lists directories or logs request content.
// Adds preview headers: X-Robots-Tag noindex, nofollow; nosniff; no-referrer;
// permissions-policy denying camera/microphone/geolocation.
import { createReadStream } from 'node:fs';
import { readFile, realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function argValue(name, fallback) {
  const at = args.indexOf(name);
  return at !== -1 && args[at + 1] ? args[at + 1] : fallback;
}
const host = argValue('--host', '127.0.0.1');
const port = Number(argValue('--port', '4173'));
const dirArg = argValue('--dir', 'dist-preview');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', dirArg);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = http.createServer(async (req, res) => {
  const setHeaders = (type) => {
    res.setHeader('Content-Type', type);
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
  };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      setHeaders('text/plain; charset=utf-8');
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const resolved = path.resolve(root, `.${pathname}`);
    if (!resolved.startsWith(root + path.sep) && resolved !== root) {
      setHeaders('text/plain; charset=utf-8');
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const real = await realpath(resolved).catch(() => null);
    const realRoot = await realpath(root);
    if (!real || (!real.startsWith(realRoot + path.sep) && real !== realRoot)) {
      setHeaders('text/plain; charset=utf-8');
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const info = await stat(real).catch(() => null);
    if (!info || !info.isFile()) {
      setHeaders('text/plain; charset=utf-8');
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const type = MIME[path.extname(real).toLowerCase()] || 'application/octet-stream';
    setHeaders(type);
    res.writeHead(200);
    if (req.method === 'GET') createReadStream(real).pipe(res);
    else res.end();
  } catch {
    setHeaders('text/plain; charset=utf-8');
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

server.listen(port, host, () => {
  console.log(`serving ${root} at http://${host}:${port}/`);
});
