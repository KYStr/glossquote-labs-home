// Loopback-only static preview server. Serves dist-preview/ (or --dir)
// on 127.0.0.1 (or ::1). Rejects traversal and symlink escapes, never
// lists directories, sends correct MIME types, and marks HTML
// noindex,nofollow. If the requested port is busy, tries the next ports
// up to +10 and logs the port actually used.

import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
}
const HOST = arg('--host', '127.0.0.1');
const PORT = Number(arg('--port', '4173'));
const DIR = resolve(fileURLToPath(new URL('..', import.meta.url)), arg('--dir', 'dist-preview'));

if (HOST !== '127.0.0.1' && HOST !== '::1' && HOST !== 'localhost') {
  console.error('serve refuses non-loopback hosts');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const target = resolve(DIR, `.${rel}`);
    const root = await realpath(DIR);
    const real = await realpath(target).catch(() => null);
    if (!real || !real.startsWith(root + '/') && real !== root) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const info = await stat(real).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = extname(real).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store',
    };
    if (ext === '.html') headers['X-Robots-Tag'] = 'noindex, nofollow';
    const body = req.method === 'HEAD' ? null : await readFile(real);
    res.writeHead(200, headers);
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

function listen(port, attemptsLeft) {
  server.listen(port, HOST, () => {
    console.log(`serving ${DIR} at http://${HOST}:${port}/`);
  });
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`port ${port} busy, trying ${port + 1}`);
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(`serve failed: ${err.message}`);
      process.exit(1);
    }
  });
}
listen(PORT, 10);
