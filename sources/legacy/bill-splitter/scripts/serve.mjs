import http from 'node:http';
import { readFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeDirectory } from './validate.mjs';

export const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
export const mime = Object.freeze({ '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' });
export const securityHeaders = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow'
});

export async function startServer({ root = publicRoot, port = 4194 } = {}) {
  const absoluteRoot = path.resolve(root);
  await safeDirectory(absoluteRoot);
  if ((await lstat(absoluteRoot)).isSymbolicLink() || await realpath(absoluteRoot) !== absoluteRoot) throw new Error('UNSAFE_PUBLIC_ROOT');
  const server = http.createServer(async (req, res) => {
    const reply = (status, body, type = mime['.txt'], headers = {}) => {
      res.writeHead(status, { ...securityHeaders, 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), ...headers });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(req.method)) return reply(405, 'Method not allowed\n', mime['.txt'], { Allow: 'GET, HEAD' });
    try {
      const raw = req.url.split('?')[0];
      if (!raw.startsWith('/') || raw.includes('#') || /%(?:2e|2f|5c|00|25)/i.test(raw)) return reply(404, 'Not found\n');
      const decoded = decodeURIComponent(raw);
      if (/[\\\x00-\x1f\x7f]/u.test(decoded)) return reply(404, 'Not found\n');
      let parts = decoded.split('/').filter(Boolean);
      if (parts.some(p => p.startsWith('.') || p.includes(':'))) return reply(404, 'Not found\n');
      if (decoded === '/' || decoded === '/en/') parts = [...parts, 'index.html'];
      const target = path.resolve(absoluteRoot, ...parts);
      if (!target.startsWith(absoluteRoot + path.sep) || !mime[path.extname(target)]) return reply(404, 'Not found\n');
      let cursor = absoluteRoot;
      for (const part of parts) {
        cursor = path.join(cursor, part);
        if ((await lstat(cursor)).isSymbolicLink()) return reply(404, 'Not found\n');
      }
      if (!(await lstat(target)).isFile() || !((await realpath(target)).startsWith(absoluteRoot + path.sep))) return reply(404, 'Not found\n');
      reply(200, await readFile(target), mime[path.extname(target)]);
    } catch { reply(404, 'Not found\n'); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let server;
  try { server = await startServer(); } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    server = await startServer({ port: 0 });
  }
  console.log(`Preview: http://127.0.0.1:${server.address().port}/index.html`);
}
