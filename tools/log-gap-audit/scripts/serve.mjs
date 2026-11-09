// Loopback-only static server for the generated preview.
// Serves dist-preview on 127.0.0.1 (default port 4173). Correct MIME,
// 404 for unknown paths, rejects traversal and symlink escape, never lists
// directories, never logs request contents. Sends the full security headers.

import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const host = flag('--host', '127.0.0.1');
const port = Number(flag('--port', '4173'));
const dir = path.resolve(root, flag('--dir', 'dist-preview'));

if (host !== '127.0.0.1' && host !== '::1') {
  console.error('serve.mjs: only loopback hosts are allowed');
  process.exit(1);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function headers() {
  return {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Robots-Tag': 'noindex, nofollow',
  };
}

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, headers());
      res.end();
      return;
    }
    const url = new URL(req.url, `http://${host}:${port}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const requested = path.resolve(dir, `.${pathname}`);
    const realDir = await realpath(dir);
    const realFile = await realpath(requested).catch(() => null);
    if (!realFile || !realFile.startsWith(realDir + path.sep)) {
      res.writeHead(404, headers());
      res.end('Not found');
      return;
    }
    const info = await stat(realFile);
    if (!info.isFile()) {
      res.writeHead(404, headers());
      res.end('Not found');
      return;
    }
    const ext = path.extname(realFile).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { ...headers(), 'Content-Type': mime, 'Content-Length': info.size });
    if (req.method === 'GET') {
      res.end(await readFile(realFile));
    } else {
      res.end();
    }
  } catch {
    res.writeHead(404, headers());
    res.end('Not found');
  }
});

server.listen(port, host, () => {
  console.log(`log-gap-audit preview: http://${host}:${port}/ (dir ${dir})`);
});
