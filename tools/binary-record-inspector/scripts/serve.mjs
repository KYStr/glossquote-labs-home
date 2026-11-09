// Loopback-only static server for the generated preview.
// Serves dist-preview/ on 127.0.0.1; correct MIME, 404, no directory
// listing, no request-content logging, traversal/symlink escape refused.
// If the requested port is busy, the next free port up to +10 is used.
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const host = argValue('--host', '127.0.0.1');
const requestedPort = Number(argValue('--port', '4173'));
const dir = path.resolve(root, argValue('--dir', 'dist-preview'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const CSP =
  "default-src 'none'; script-src 'self'; style-src 'self'; worker-src blob:; " +
  "img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; " +
  "form-action 'none'; frame-ancestors 'none'";

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${host}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    const resolved = path.resolve(dir, '.' + pathname);
    const realDir = await realpath(dir);
    const realFile = await realpath(resolved).catch(() => null);
    if (realFile === null || !realFile.startsWith(realDir + path.sep)) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found\n');
      return;
    }
    const info = await stat(realFile);
    if (!info.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('not found\n');
      return;
    }
    const body = await readFile(realFile);
    const ext = path.extname(realFile);
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'content-length': body.length,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
      'content-security-policy': CSP,
    };
    if (ext === '.html') headers['x-robots-tag'] = 'noindex, nofollow';
    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('internal error\n');
  }
});

function listen(port, attemptsLeft) {
  server.listen(port, host);
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      server.close();
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(error.message);
      process.exit(1);
    }
  });
  server.once('listening', () => {
    console.log(`serving ${dir} at http://${host}:${port}/`);
  });
}

listen(requestedPort, 10);
