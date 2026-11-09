// Loopback-only static server for local preview. Binds 127.0.0.1, serves
// public/ read-only, never opens a browser and never writes anything.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(toolRoot, 'public');
const port = Number.parseInt(process.env.PORT ?? '4173', 10);

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
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.join(publicDir, rel);
    if (!file.startsWith(publicDir)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    const info = await stat(file).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found');
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(body);
  } catch {
    res.writeHead(500).end('error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`serving public/ on http://127.0.0.1:${port}/ (loopback only)`);
});
