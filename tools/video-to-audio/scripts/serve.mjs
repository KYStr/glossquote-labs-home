import http from 'node:http';
import { readFile, realpath, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'], ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'], ['.wasm', 'application/wasm'],
  ['.txt', 'text/plain; charset=utf-8'], ['.md', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.ico', 'image/x-icon'],
]);
export const LICENSE_FILES = new Set(['LICENSE.MIT', 'LICENSE.GPL-2.0']);
export const CSP = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self' blob:; worker-src 'self'; media-src blob:; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
export function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export function createStaticServer({ mounts = [{ prefix: '/', root: path.join(PROJECT_ROOT, 'public') }], delay = () => 0 } = {}) {
  return http.createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    const fail = (code) => { res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(`${code}\n`); };
    if (!['GET', 'HEAD'].includes(req.method)) { res.setHeader('Allow', 'GET, HEAD'); return fail(405); }
    let pathname;
    try { pathname = decodeURIComponent((req.url ?? '').split('?')[0]); } catch { return fail(400); }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.includes('%') || pathname.includes('#')) return fail(400);
    if (pathname.split('/').some((part) => part.startsWith('.') || part.includes(':'))) return fail(403);
    const mount = mounts.find(({ prefix, file }) => file ? pathname === prefix : pathname.startsWith(prefix));
    if (!mount) return fail(404);
    const relative = mount.file || pathname.slice(mount.prefix.length) || 'index.html';
    const target = path.resolve(mount.root, relative);
    if (!isWithin(mount.root, target)) return fail(403);
    let mime = MIME.get(path.extname(target));
    if (LICENSE_FILES.has(path.basename(target))) mime = 'text/plain; charset=utf-8';
    if (!mime) return fail(404);
    try {
      const rootReal = await realpath(mount.root);
      const targetReal = await realpath(target);
      if (!isWithin(rootReal, targetReal)) return fail(403);
      const stat = await lstat(target);
      if (stat.isSymbolicLink()) return fail(403);
      if (!stat.isFile()) return fail(404);
      const bytes = await readFile(targetReal);
      const delayMs = delay(pathname);
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (res.destroyed) return;
      if (/^\/vendor\/ffmpeg\/(?:ffmpeg-0\.12\.15|core-0\.12\.10)\//.test(pathname)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.writeHead(200, { 'Content-Type': mime, 'Content-Length': bytes.length });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      return fail(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500);
    }
  });
}

export async function listenLoopback(server, preferredPort) {
  const listen = (port) => new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
  });
  try { await listen(preferredPort); } catch (error) {
    if (error.code !== 'EADDRINUSE') throw error;
    await listen(0);
    console.log('Preferred loopback port occupied; using an assigned free loopback port.');
  }
  return server.address().port;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createStaticServer();
  const port = await listenLoopback(server, 4191);
  console.log(`Preview (public only): http://127.0.0.1:${port}/`);
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}
