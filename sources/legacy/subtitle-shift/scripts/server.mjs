import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ASSETS, HEADERS, mime } from './manifest.mjs';
import { inspectTree } from './files.mjs';

export function makeHandler(assets) {
  return (request, response) => {
    let status = 200;
    let path = request.url === '/' ? 'index.html' : request.url === '/en/' ? 'en/index.html' : request.url?.slice(1);
    if (request.headers.host !== '127.0.0.1:4216') status = 421;
    else if (!['GET', 'HEAD'].includes(request.method)) status = 405;
    else if (!ASSETS.includes(path) || path === '_headers') status = 404;
    if (status !== 200) path = '404.html';
    const bytes = assets.get(path);
    const headers = { ...HEADERS, 'Content-Type': mime(path), 'Content-Length': String(bytes.length) };
    if (status === 405) headers.Allow = 'GET, HEAD';
    response.writeHead(status, headers);
    response.end(request.method === 'HEAD' ? undefined : bytes);
  };
}
export async function createPreviewServer(root) {
  await inspectTree(root);
  const assets = new Map(await Promise.all(ASSETS.map(async file => [file, await readFile(join(root, file))])));
  const server = createServer(makeHandler(assets));
  server.requestTimeout = 10000; server.headersTimeout = 10000;
  server.keepAliveTimeout = 1000; server.maxHeadersCount = 32;
  server.on('clientError', (_error, socket) => socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n'));
  return server;
}
