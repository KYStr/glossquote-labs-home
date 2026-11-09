#!/usr/bin/env node
// Loopback-only static server for the preview build.
// Usage: node scripts/serve.mjs --host 127.0.0.1 --port 4173 --dir dist-preview
// Serves only files inside --dir, rejects traversal and symlink escapes,
// serves no directory listings, and sends the preview security headers.
// Request paths are not logged beyond the startup line.

import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";

function parseArgs(argv) {
  const args = { host: '127.0.0.1', port: 4173, dir: 'dist-preview' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--host' && argv[i + 1] !== undefined) args.host = argv[i + 1];
    if (argv[i] === '--port' && argv[i + 1] !== undefined) args.port = Number(argv[i + 1]);
    if (argv[i] === '--dir' && argv[i + 1] !== undefined) args.dir = argv[i + 1];
  }
  return args;
}

function setSecurityHeaders(res, contentType) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Robots-Tag', 'noindex,nofollow');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!['127.0.0.1', '::1'].includes(args.host)) {
    console.error('error: only loopback hosts (127.0.0.1, ::1) are allowed');
    process.exit(1);
  }
  if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) {
    console.error('error: --port must be an integer 1-65535');
    process.exit(1);
  }
  const serveDir = path.resolve(root, args.dir);
  const serveReal = await realpath(serveDir).catch(() => null);
  if (serveReal === null) {
    console.error(`error: directory not found: ${serveDir} (run "npm run build:preview" first)`);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        setSecurityHeaders(res, 'text/plain; charset=utf-8');
        res.writeHead(405);
        res.end('Method Not Allowed');
        return;
      }
      const url = new URL(req.url, 'http://127.0.0.1');
      let requestPath = decodeURIComponent(url.pathname);
      if (requestPath.endsWith('/')) requestPath += 'index.html';
      const resolved = path.resolve(serveReal, `.${requestPath}`);
      if (!resolved.startsWith(`${serveReal}${path.sep}`) && resolved !== serveReal) {
        setSecurityHeaders(res, 'text/plain; charset=utf-8');
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const real = await realpath(resolved).catch(() => null);
      if (real === null || !real.startsWith(serveReal)) {
        setSecurityHeaders(res, 'text/plain; charset=utf-8');
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const info = await stat(real).catch(() => null);
      if (info === null || !info.isFile()) {
        setSecurityHeaders(res, 'text/plain; charset=utf-8');
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(real).toLowerCase();
      const contentType = MIME[ext] ?? 'application/octet-stream';
      setSecurityHeaders(res, contentType);
      res.setHeader('Content-Length', info.size);
      if (req.method === 'HEAD') {
        res.writeHead(200);
        res.end();
        return;
      }
      res.writeHead(200);
      createReadStream(real).pipe(res);
    } catch {
      if (!res.headersSent) {
        setSecurityHeaders(res, 'text/plain; charset=utf-8');
        res.writeHead(500);
      }
      res.end('Internal Server Error');
    }
  });

  server.listen(args.port, args.host, () => {
    console.log(`serving ${serveReal} at http://${args.host}:${args.port}/`);
  });
}

main().catch((error) => {
  console.error(`serve failed: ${error.message}`);
  process.exit(1);
});
