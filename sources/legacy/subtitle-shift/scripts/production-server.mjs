import { createServer } from 'node:http';
import { ALIASES, PRODUCTION_ASSETS, effectiveHeaders, productionMime, checkProduction } from './production-lib.mjs';

export function productionHandler(assets) {
  const headersText = assets.get('_headers').toString('utf8');
  return (request, response) => {
    let status = 200; const url = request.url;
    if (request.headers.host !== '127.0.0.1:5216') status = 421;
    else if (!['GET', 'HEAD'].includes(request.method)) status = 405;
    else if (Object.hasOwn(ALIASES, url)) {
      response.writeHead(302, { Location: ALIASES[url], 'Content-Length': '0', 'Cache-Control': 'no-store' }); response.end(); return;
    }
    const candidate = url?.startsWith('/') ? url.slice(1) : null;
    if (status === 200 && (!PRODUCTION_ASSETS.includes(candidate) || ['_headers', '_redirects'].includes(candidate))) status = 404;
    const file = status === 200 ? candidate : '404.html'; const bytes = assets.get(file);
    const headers = { ...effectiveHeaders(headersText, status === 200 ? url : '/404.html'), 'Content-Type': productionMime(file), 'Content-Length': String(bytes.length) };
    if (status === 405) headers.Allow = 'GET, HEAD';
    response.writeHead(status, headers); response.end(request.method === 'HEAD' ? undefined : bytes);
  };
}
export async function createProductionServer(root) {
  const checked = await checkProduction(root);
  const server = createServer(productionHandler(checked.output));
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.keepAliveTimeout = 1000; server.maxHeadersCount = 32;
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));
  return server;
}
