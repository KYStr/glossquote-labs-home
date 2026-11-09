// Loopback-only static server for local preview of public/.
// Binds 127.0.0.1, never opens a browser, no network egress.
// Usage: node scripts/serve.mjs [port]   (default 8371, or $PORT)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.join(toolDir, 'public');
const port = Number(process.argv[2] || process.env.PORT || 8371);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const full = path.resolve(root, rel);
    if (!full.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(full).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
      return;
    }
    const body = await readFile(full);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(full)] || 'application/octet-stream',
      'cache-control': 'no-store',
    }).end(body);
  } catch {
    res.writeHead(500).end('error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serve: http://127.0.0.1:${port}/ (public/, loopback only)`);
});
