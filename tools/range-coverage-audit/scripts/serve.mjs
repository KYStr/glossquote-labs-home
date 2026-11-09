// Loopback-only static preview server for Numeric Range Coverage Audit.
// Serves dist-preview (or --dir <dir>) with correct MIME types, security
// headers, 404s, and traversal/symlink-escape rejection. No directory
// listing, no request logging of content. Never opens a browser.
//
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
// If the requested port is busy, the next free port is used and reported.

import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { host: '127.0.0.1', port: 4173, dir: path.join(root, 'dist-preview') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host') out.host = argv[i + 1];
    if (argv[i] === '--port') out.port = Number(argv[i + 1]);
    if (argv[i] === '--dir') out.dir = path.resolve(argv[i + 1]);
  }
  if (out.host !== '127.0.0.1' && out.host !== 'localhost') {
    throw new Error('serve is loopback-only');
  }
  return out;
}

const { host, port: requestedPort, dir } = parseArgs(process.argv.slice(2));
const baseReal = await realpath(dir).catch(() => {
  console.error(`preview directory not found: ${dir} (run npm run build:preview first)`);
  process.exit(1);
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

const server = createServer(async (req, res) => {
  const setHeaders = (status, type) => {
    res.writeHead(status, {
      'Content-Type': type,
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Robots-Tag': 'noindex,nofollow',
    });
  };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      setHeaders(405, 'text/plain; charset=utf-8');
      res.end('Method Not Allowed');
      return;
    }
    const url = new URL(req.url, `http://${host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const resolved = path.resolve(baseReal, '.' + pathname);
    if (!resolved.startsWith(baseReal + path.sep) && resolved !== baseReal) {
      setHeaders(404, 'text/plain; charset=utf-8');
      res.end('Not Found');
      return;
    }
    let real = await realpath(resolved).catch(() => null);
    if (real === null || (!real.startsWith(baseReal + path.sep) && real !== baseReal)) {
      setHeaders(404, 'text/plain; charset=utf-8');
      res.end('Not Found');
      return;
    }
    let info = await stat(real);
    if (info.isDirectory()) {
      // Serve the directory's index.html (e.g. /en/ -> /en/index.html).
      const indexReal = await realpath(path.join(real, 'index.html')).catch(() => null);
      if (indexReal === null || !indexReal.startsWith(baseReal + path.sep)) {
        setHeaders(404, 'text/plain; charset=utf-8');
        res.end('Not Found');
        return;
      }
      real = indexReal;
      info = await stat(real);
    }
    if (!info.isFile()) {
      setHeaders(404, 'text/plain; charset=utf-8');
      res.end('Not Found');
      return;
    }
    const type = MIME[path.extname(real)] || 'application/octet-stream';
    const body = await readFile(real);
    setHeaders(200, type);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    setHeaders(404, 'text/plain; charset=utf-8');
    res.end('Not Found');
  }
});

function listen(port) {
  server.listen(port, host, () => {
    console.log(`preview server: http://${host}:${port}/ (serving ${dir})`);
  });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.log(`port ${port} busy, trying ${port + 1}`);
      listen(port + 1);
    } else {
      throw error;
    }
  });
}

listen(requestedPort);
