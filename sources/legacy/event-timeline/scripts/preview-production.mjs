import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { checkProduction, resolveProductionHeaders, productionAssets } from './production.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
export async function createProductionServer(candidate) {
  const bodies = candidate ?? await checkProduction();
  if (!(bodies instanceof Map) || JSON.stringify([...bodies.keys()].sort()) !== JSON.stringify([...productionAssets].sort()) || [...bodies.values()].some(body => !Buffer.isBuffer(body))) throw new Error('Invalid model assets');
  return createServer((request, response) => {
    const path = request.url;
    const headers = { ...resolveProductionHeaders(path, bodies.get('_headers').toString('utf8')), 'Cache-Control': 'no-store' };
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { ...headers, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Method not allowed'); return; }
    const key = path.startsWith('/') ? path.slice(1) : '';
    const body = key === '_headers' || /[%?#\\]/.test(path) ? undefined : bodies.get(key);
    const status = body && key !== '404.html' ? 200 : 404;
    const payload = status === 404 ? bodies.get('404.html') : body;
    response.writeHead(status, { ...headers, 'Content-Type': status === 404 ? mime['.html'] : mime[key.slice(key.lastIndexOf('.'))], 'Content-Length': payload.length });
    response.end(request.method === 'HEAD' ? undefined : payload);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) throw new Error('Production model has no override arguments');
  const server = await createProductionServer();
  server.on('error', error => { console.error(`Production model could not start (${error.code ?? 'SERVER_ERROR'}); existing services were preserved.`); process.exitCode = 1; });
  server.listen(5205, '127.0.0.1', () => console.log('Event Timeline production model: http://127.0.0.1:5205/index.html'));
}
