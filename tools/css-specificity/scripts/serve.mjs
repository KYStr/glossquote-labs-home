// Local preview server (SPEC §5): binds 127.0.0.1:4180 by default, serves
// only dist/. An explicit bounded numeric --port may be supplied for managed
// previews; the host never changes. Not a production server.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

export const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'none'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function parsePort(argv) {
  let port = 4180;
  for (const a of argv) {
    if (a.startsWith('--port=')) {
      const n = Number(a.slice('--port='.length));
      if (!Number.isInteger(n) || n < 0 || n > 65535) {
        console.error('serve: --port must be an integer in 0..65535');
        process.exit(1);
      }
      port = n;
    }
  }
  return port;
}

const server = createServer(async (req, res) => {
  const headers = {
    'Content-Security-Policy': CSP,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { ...headers, 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }
  const rel = path.posix.normalize('/' + pathname);
  let filePath = path.join(dist, rel);
  if (filePath !== dist && !filePath.startsWith(dist + path.sep)) {
    res.writeHead(403, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
    const body = await readFile(filePath);
    const type = TYPES[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { ...headers, 'Content-Type': type, 'Content-Length': body.length });
    if (req.method === 'HEAD') res.end();
    else res.end(body);
  } catch {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

const port = parsePort(process.argv.slice(2));
server.listen(port, '127.0.0.1', () => {
  console.log('serve: http://127.0.0.1:' + server.address().port + '/ (dist/)');
});
