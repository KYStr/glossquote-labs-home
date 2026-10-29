// 開發伺服器只綁定 loopback；所有回應都有 noindex，不接受 POST。
import { createServer } from 'node:http';
import { lstat, readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, within } from './files.mjs';
import { headers } from './site.mjs';
export function createPreviewServer(directory = 'dist-preview') {
  if (!['dist-preview', 'test-product'].includes(directory)) throw Error('DIRECTORY_REJECTED');
  const base = resolve(root, directory);
  return createServer(async (request, response) => {
    for (const [key, value] of Object.entries({ ...headers, 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' })) response.setHeader(key, value);
    const finish = (status, message) => { response.statusCode = status; response.setHeader('Content-Type', 'text/plain; charset=utf-8'); response.end(request.method === 'HEAD' ? '' : message); };
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); return finish(405, 'Method not allowed'); }
    try {
      // 先檢查原始路徑，不讓 URL 正規化隱藏 traversal。
      const pathname = decodeURIComponent(request.url.split('?')[0]);
      if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part === '.' || part === '..')) return finish(400, 'Invalid path');
      const route = pathname.endsWith('/') ? `${pathname}index.html` : pathname === '/en' ? '/en/index.html' : pathname;
      const target = resolve(base, `.${route}`), type = { '.html': 'text/html', '.mjs': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.xml': 'application/xml' }[extname(target)];
      if (!within(base, target) || !type) return finish(404, 'Not found');
      let part = base;
      if ((await lstat(part)).isSymbolicLink()) return finish(404, 'Not found');
      for (const segment of route.split('/').filter(Boolean)) { part = resolve(part, segment); if ((await lstat(part)).isSymbolicLink()) return finish(404, 'Not found'); }
      if (!(await lstat(target)).isFile()) return finish(404, 'Not found');
      const body = await readFile(target); response.setHeader('Content-Type', `${type}; charset=utf-8`); response.statusCode = 200;
      response.end(request.method === 'HEAD' ? '' : body);
    } catch (error) { finish(error instanceof URIError ? 400 : 404, 'Not found'); }
  });
}
export async function serve(port = 4196, directory = 'dist-preview') {
  const server = createPreviewServer(directory);
  await new Promise((resolveStart, reject) => {
    server.once('error', error => { if (error.code === 'EADDRINUSE') server.listen(0, '127.0.0.1', resolveStart); else reject(error); });
    server.listen(port, '127.0.0.1', resolveStart);
  });
  console.log(`Preview only: http://127.0.0.1:${server.address().port}/index.html`); return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await serve();
