import http from 'node:http';
import { createReadStream } from 'node:fs';
import { lstat, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const publicRoot = path.join(projectRoot, 'public');
export const mimeTypes = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
  '.bin': 'application/octet-stream', '.wav': 'audio/wav', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
});
export const securityHeaders = Object.freeze({
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; worker-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY', 'X-Robots-Tag': 'noindex, nofollow',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cache-Control': 'no-store',
});

export function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export function routePath(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length > 2048 || !rawUrl.startsWith('/') || rawUrl.startsWith('//')) throw new Error('BAD_PATH');
  const pathname = decodeURIComponent(rawUrl.split('?')[0]);
  if (/[\\\0#%]/u.test(pathname) || pathname.split('/').some(segment => segment.startsWith('.') || segment.includes(':'))) throw new Error('BAD_PATH');
  return pathname;
}

export function createStaticServer({ route = pathname => ({ root: publicRoot, relative: pathname === '/' ? 'index.html' : pathname.slice(1) }), headers = securityHeaders } = {}) {
  return http.createServer(async (request, response) => {
    const reply = (status, message) => {
      response.writeHead(status, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', ...(status === 405 ? { Allow: 'GET, HEAD' } : {}) });
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    if (!['GET', 'HEAD'].includes(request.method)) return reply(405, 'Method not allowed');
    let pathname;
    try { pathname = routePath(request.url); } catch { return reply(400, 'Invalid path'); }
    const mapping = route(pathname);
    if (!mapping) return reply(404, 'Not found');
    const target = path.resolve(mapping.root, mapping.relative);
    if (!inside(mapping.root, target)) return reply(403, 'Forbidden');
    try {
      if ((await lstat(mapping.root)).isSymbolicLink()) return reply(403, 'Forbidden');
      const root = await realpath(mapping.root);
      const actual = await realpath(target);
      if (!inside(root, actual)) return reply(403, 'Forbidden');
      const info = await stat(actual);
      const mime = mimeTypes[path.extname(actual).toLowerCase()];
      if (!info.isFile() || !mime) return reply(404, 'Not found');
      response.writeHead(200, { ...headers, 'Content-Type': mime, 'Content-Length': info.size });
      if (request.method === 'HEAD') return response.end();
      const stream = createReadStream(actual);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    } catch { reply(404, 'Not found'); }
  });
}

export async function startServer(server, preferredPort = 4192) {
  async function listen(port) {
    return new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(server.address()); });
    });
  }
  let address;
  try { address = await listen(preferredPort); }
  catch (error) { if (error.code !== 'EADDRINUSE') throw error; address = await listen(0); }
  console.log(`Preview: http://127.0.0.1:${address.port}/ (loopback; noindex)`);
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => process.exit(0)));
  return address;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await startServer(createStaticServer());
