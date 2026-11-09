// Loopback-only static server for local preview. No auto-open, no network
// beyond 127.0.0.1. Serves dist/ when built, otherwise public/.
// Sends the SPEC's CSP header and X-Content-Type-Options: nosniff.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || 8321);

let base = join(root, 'dist');
try {
  await stat(base);
} catch {
  base = join(root, 'public');
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
  + "worker-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; "
  + "frame-ancestors 'none'; object-src 'none'";

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(base, path));
    if (file !== base && !file.startsWith(base + sep)) throw new Error('forbidden');
    const body = await readFile(file);
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${base} at http://127.0.0.1:${port}/`);
});
