// Loopback-only static server for local preview. Binds 127.0.0.1 only,
// never opens a browser. Usage: node scripts/serve.mjs [--port N]

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { TOOL_ROOT } from './build.mjs';

const ROOT = path.join(TOOL_ROOT, 'public');
const portArg = process.argv.indexOf('--port');
const PORT = portArg !== -1 ? Number(process.argv[portArg + 1]) : Number(process.env.PORT || 0);

const MIME = {
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
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const filePath = path.normalize(path.join(ROOT, pathname));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('forbidden');
      return;
    }
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('error');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`serve: http://127.0.0.1:${server.address().port}/ (loopback only)`);
});
