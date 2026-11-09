import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MIME, headersForAsset, renderProduction, validateProduction } from './production.mjs';

export async function createProductionServer({ generated = false } = {}) {
  const files = generated ? await renderProduction() : await validateProduction();
  return createServer((request, response) => {
    function send(status, file, content, extra = {}) {
      const headers = headersForAsset(files, file);
      response.writeHead(status, { ...headers, 'Content-Type': MIME[path.extname(file)] ?? MIME['.txt'], 'Content-Length': content.length, ...extra });
      response.end(request.method === 'HEAD' ? undefined : content);
    }
    if (!/^(?:127\.0\.0\.1|localhost)(?::[0-9]+)?$/.test(request.headers.host ?? '')) return send(421, 'error.txt', Buffer.from('Misdirected request'));
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'error.txt', Buffer.from('Method not allowed'), { Allow: 'GET, HEAD' });
    let route;
    try {
      const raw = request.url;
      if (!raw.startsWith('/') || raw.includes('?') || raw.includes('#')) throw new Error('ROUTE');
      route = decodeURIComponent(raw);
      if (/[\\%\u0000-\u0020\u007f]/.test(route) || route.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('ROUTE');
    } catch { return send(400, 'error.txt', Buffer.from('Invalid path')); }
    const file = route.slice(1);
    if (file === '_headers' || !files.has(file)) {
      // Missing routes use the 404 body; no SPA fallback. Its meta robots remains noindex.
      return send(404, '404.html', files.get('404.html'));
    }
    return send(200, file, files.get(file));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const server = await createProductionServer();
  server.once('error', () => { process.stderr.write('Production model could not bind 127.0.0.1:5207; existing processes were preserved.\n'); process.exitCode = 1; });
  server.on('listening', () => process.stdout.write('Production model http://127.0.0.1:5207/index.html\nEnglish http://127.0.0.1:5207/en/index.html\n'));
  server.listen(5207, '127.0.0.1');
}
