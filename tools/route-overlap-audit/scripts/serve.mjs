// Loopback-only static server for the generated preview.
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
// Serves only files inside --dir with correct MIME types; rejects path
// traversal and symlink escapes with 404, never lists directories, and
// never logs request content. --port 0 picks an idle port and prints it.

import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'X-Robots-Tag': 'noindex, nofollow',
};

function parseArgs(argv) {
  const args = { host: '127.0.0.1', port: 4173, dir: 'dist-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host' && argv[i + 1]) args.host = argv[i + 1];
    if (argv[i] === '--port' && argv[i + 1]) args.port = Number(argv[i + 1]);
    if (argv[i] === '--dir' && argv[i + 1]) args.dir = argv[i + 1];
  }
  return args;
}

const { host, port, dir } = parseArgs(process.argv.slice(2));
if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
  console.error('serve refuses non-loopback hosts');
  process.exit(2);
}
const baseDir = path.resolve(root, dir);
const baseReal = await realpath(baseDir);

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('method not allowed');
      return;
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const target = path.resolve(baseReal, `.${pathname}`);
    const real = await realpath(target).catch(() => null);
    if (real === null || (real !== baseReal && !real.startsWith(`${baseReal}${path.sep}`))) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const info = await stat(real);
    if (!info.isFile()) {
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('not found');
      return;
    }
    const ext = path.extname(real).toLowerCase();
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
    };
    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }
    const bytes = await readFile(real);
    res.writeHead(200, headers);
    res.end(bytes);
  } catch {
    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`port ${port} is already in use; pick an idle port`);
    process.exit(3);
  }
  throw error;
});

server.listen(port, host, () => {
  const address = server.address();
  console.log(`listening http://${address.address}:${address.port}`);
});
