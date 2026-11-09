import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { ROOT, MIME, CSP, inventory } from './lib/files.mjs';
import { validatePublic } from './lib/validate.mjs';

export async function createPreviewServer(root = ROOT) {
  const directory = path.join(root, 'dist');
  await validatePublic(directory);
  const files = await inventory(directory);
  const assets = new Map();
  for (const file of files) assets.set(`/${file.path}`, { bytes: await readFile(path.join(directory, file.path)), type: MIME[path.extname(file.path)] });
  const respond = (request, response) => {
    const hosts = request.rawHeaders.filter((_, i) => i % 2 === 0).filter(key => key.toLowerCase() === 'host');
    let status = 200;
    let body;
    let type = 'text/plain; charset=utf-8';
    if (hosts.length !== 1 || !['127.0.0.1:4217', 'localhost:4217'].includes(request.headers.host?.toLowerCase())) {
      status = 421; body = Buffer.from('Misdirected request\n');
    } else if (!['GET', 'HEAD'].includes(request.method)) {
      status = 405; body = Buffer.from('Method not allowed\n');
    } else if (!assets.has(request.url)) {
      status = 404; body = Buffer.from('Not found\n');
    } else {
      ({ bytes: body, type } = assets.get(request.url));
    }
    const headers = { 'Content-Type': type, 'Content-Length': body.length, 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' };
    if (status === 405) headers.Allow = 'GET, HEAD';
    response.sendDate = false;
    response.writeHead(status, headers);
    response.end(request.method === 'HEAD' ? undefined : body);
  };
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000, requireHostHeader: false }, respond);
  // CONNECT and Upgrade use separate Node events; they still use the same gate.
  const socketResponse = (request, socket) => {
    const response = new http.ServerResponse(request);
    response.assignSocket(socket);
    response.shouldKeepAlive = false;
    response.once('finish', () => socket.end());
    respond(request, response);
  };
  server.on('connect', socketResponse);
  server.on('upgrade', socketResponse);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await createPreviewServer();
  server.on('error', () => { process.stderr.write('Preview could not start; existing processes were preserved.\n'); process.exitCode = 1; });
  server.listen(4217, '127.0.0.1', () => process.stdout.write('Restock preview listening at 127.0.0.1:4217 (no browser opened)\n'));
}
