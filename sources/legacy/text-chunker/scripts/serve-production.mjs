import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPlainPath, MIME } from './validation.mjs';
import { checkProduction, PRODUCTION_FILES, productionHeaders } from './release.mjs';

export function productionRoute(rawUrl) {
  let pathname;
  try { pathname = decodeURIComponent(rawUrl.split('?')[0]); } catch { pathname = ''; }
  if (!pathname.startsWith('/') || /[\\\u0000-%:#]/.test(pathname) || pathname.split('/').slice(1).some(part => part.startsWith('.'))) return { status: 404, file: '404.html' };
  const redirect = { '/': '/index.html', '/en': '/en/index.html', '/en/': '/en/index.html' }[pathname];
  if (redirect) return { status: 301, location: redirect };
  const file = pathname.slice(1);
  if (PRODUCTION_FILES.includes(file) && !['_headers', '_redirects'].includes(file)) return { status: 200, file };
  return { status: 404, file: pathname.startsWith('/en/') ? 'en/404.html' : '404.html' };
}
export async function startProductionPreview(projectRoot) {
  await checkProduction(projectRoot);
  const assets = path.join(projectRoot, 'dist-production');
  const server = createServer(async (request, response) => {
    const headers = productionHeaders();
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { ...headers, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }
    const route = productionRoute(request.url ?? '');
    if (route.location) { response.writeHead(301, { ...headers, Location: route.location }); response.end(); return; }
    try {
      const data = await readFile(await assertPlainPath(assets, route.file));
      response.writeHead(route.status, { ...headers, 'Content-Type': path.extname(route.file) === '.xml' ? 'application/xml; charset=utf-8' : MIME[path.extname(route.file)], 'Content-Length': data.length, ...(route.status === 404 ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { response.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' }); response.end(request.method === 'HEAD' ? undefined : 'Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}`, port: server.address().port };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) throw new Error('UNKNOWN_SERVER_ARGUMENT');
  const preview = await startProductionPreview(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
  console.log(JSON.stringify({ stage: 'production-local-only', url: preview.url, pid: process.pid }));
}
