import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { check, root } from './check.mjs';

const files = new Set(await check());
const types = { '.html': 'text/html;charset=utf-8', '.css': 'text/css;charset=utf-8', '.js': 'text/javascript;charset=utf-8' };
const headers = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), clipboard-write=(self)',
  'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'no-store',
};
const server = http.createServer(async (request, response) => {
  const end = (status, text, type = 'text/plain;charset=utf-8') => {
    response.writeHead(status, { ...headers, 'Content-Type': type, ...(status === 405 ? { Allow: 'GET, HEAD' } : {}) });
    response.end(request.method === 'HEAD' ? undefined : text);
  };
  if (!['GET', 'HEAD'].includes(request.method)) return end(405, 'Method not allowed');
  let route;
  try {
    if (request.url.includes('..')) return end(404, 'Not found');
    const url = new URL(request.url, 'http://127.0.0.1:4209');
    route = decodeURIComponent(url.pathname);
    if (url.search || /[\\\u0000]/.test(route) || route.includes('..') || /%2e|%2f|%5c/i.test(request.url)) return end(404, 'Not found');
  } catch { return end(404, 'Not found'); }
  const name = route === '/' ? 'index.html' : route.slice(1);
  if (!files.has(name)) return end(404, 'Not found');
  try { end(200, await readFile(path.join(root, 'public', name)), types[path.extname(name)]); }
  catch { end(404, 'Not found'); }
});
server.on('error', error => { process.stderr.write(error.code === 'EADDRINUSE' ? 'Preview port 4209 is in use; existing process preserved.\n' : 'Preview could not start.\n'); process.exitCode = 1; });
server.listen(4209, '127.0.0.1', () => process.stdout.write('Duty roster preview: http://127.0.0.1:4209/index.html (loopback only)\n'));
