// Loopback-only static server for the built preview (dist/).
// Binds 127.0.0.1, never opens a browser, no logging of query strings.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const port = Number(process.env.PORT || 4178);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

try {
  await stat(distDir);
} catch {
  console.error('serve: dist/ does not exist; run npm run build:preview first');
  process.exit(1);
}

const server = createServer(async (req, res) => {
  const headers = {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  };
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    const target = path.join(distDir, rel);
    if (!target.startsWith(distDir + path.sep)) throw new Error('forbidden');
    const body = await readFile(target);
    res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log('serve: http://127.0.0.1:' + port + '/ (loopback only)');
});
