// Loopback-only 靜態伺服：優先服務 dist-preview/，沒有則服務 public/。不自動開瀏覽器。
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { root } from './build.mjs';

const previewDir = path.join(root, 'dist-preview');
const serveDir = await fs.stat(previewDir).then(() => previewDir).catch(() => path.join(root, 'public'));
const port = Number(process.env.PORT || 8734);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const target = path.normalize(path.join(serveDir, pathname));
    if (!target.startsWith(serveDir)) throw new Error('forbidden');
    const bytes = await fs.readFile(target);
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(bytes);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`serving ${path.relative(root, serveDir)} at http://127.0.0.1:${port}/`);
});
