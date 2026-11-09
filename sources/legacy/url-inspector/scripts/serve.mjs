import http from 'node:http';
import path from 'node:path';
import { lstat, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { validateAncestors } from './validation.mjs';

export const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
export const publicRoot = path.join(projectRoot, 'public');
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; worker-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-store'
};
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };
const fallback = '<!doctype html><html lang="en"><title>404 · GlossQuote</title><h1>404</h1><p>Page not found.</p></html>';
export function createStaticServer(root = publicRoot) {
  const absoluteRoot = path.resolve(root);
  return http.createServer(async (req, res) => {
    const send = (status, content, type = 'text/html; charset=utf-8', extra = {}) => {
      res.writeHead(status, { ...securityHeaders, 'Content-Type': type, 'Content-Length': Buffer.byteLength(content), ...extra });
      res.end(req.method === 'HEAD' ? undefined : content);
    };
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Method not allowed.', 'text/plain; charset=utf-8', { Allow: 'GET, HEAD' });
    let notFound = fallback;
    try {
      await validateAncestors(absoluteRoot);
      try { const info = await lstat(path.join(absoluteRoot, '404.html')); if (info.isFile() && !info.isSymbolicLink() && info.nlink === 1) notFound = await readFile(path.join(absoluteRoot, '404.html')); } catch {}
      const rawPath = req.url.split('?')[0];
      if (!rawPath.startsWith('/') || rawPath.includes('\\')) return send(404, fallback);
      const decoded = decodeURIComponent(rawPath);
      if (/[\u0000-\u0020\u007f\\]/u.test(decoded)) return send(404, fallback);
      let parts = decoded.split('/').slice(1);
      if (parts.some(p => p.startsWith('.') || p.includes(':') || p.includes('%'))) return send(404, fallback);
      if (parts.at(-1) === '') parts[parts.length - 1] = 'index.html';
      if (parts.some(p => p === '')) return send(404, fallback);
      const target = path.resolve(absoluteRoot, ...parts);
      if (!target.startsWith(absoluteRoot + path.sep)) return send(404, notFound);
      let current = absoluteRoot;
      if (!(await lstat(current)).isDirectory() || (await lstat(current)).isSymbolicLink()) return send(404, fallback);
      for (const p of parts) {
        current = path.join(current, p);
        if ((await lstat(current)).isSymbolicLink()) return send(404, fallback);
      }
      if (!(await lstat(target)).isFile() || !mime[path.extname(target)]) return send(404, notFound);
      send(200, await readFile(target), mime[path.extname(target)]);
    } catch { send(404, notFound); }
  });
}
export async function listen(server, port = 0) {
  const bind = p => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(p, '127.0.0.1', () => { server.off('error', reject); resolve(server.address()); });
  });
  try { return await bind(port); } catch (error) { if (error.code !== 'EADDRINUSE' || port === 0) throw error; return bind(0); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createStaticServer(process.argv.includes('--dist') ? path.join(projectRoot, 'dist') : publicRoot);
  const portArg = process.argv.find(a => a.startsWith('--port='));
  const address = await listen(server, portArg ? Number(portArg.slice(7)) : 4193);
  console.log(`URL inspector preview http://127.0.0.1:${address.port} (PID ${process.pid})`);
}
