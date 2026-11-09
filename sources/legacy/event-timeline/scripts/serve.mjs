import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assets, inspectSource, root, securityHeaders } from './files.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export async function createPreviewServer() {
  await inspectSource();
  const base = join(root, 'public');
  const bodies = new Map(await Promise.all(assets.filter(path => !path.startsWith('_')).map(async path => [`/${path}`, await readFile(join(base, path))])));
  return createServer((request, response) => {
    const headers = { ...securityHeaders, 'Cache-Control': 'no-store' };
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { ...headers, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }
    const raw = request.url;
    const path = raw === '/' ? '/index.html' : raw;
    const body = bodies.get(path);
    if (!body || /[%?#\\]/.test(raw)) {
      const notFound = bodies.get('/404.html');
      response.writeHead(404, { ...headers, 'Content-Type': 'text/html; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : notFound);
      return;
    }
    const extension = path.slice(path.lastIndexOf('.'));
    response.writeHead(path === '/404.html' ? 404 : 200, { ...headers, 'Content-Type': mime[extension] ?? 'application/octet-stream', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.length === 1 && (String(Number(args[0])) !== args[0] || !Number.isInteger(Number(args[0])) || Number(args[0]) < 1 || Number(args[0]) > 65535)) throw new Error('Use a single integer port from 1 to 65535');
  const server = await createPreviewServer();
  server.on('error', error => { console.error(`Preview could not start (${error.code ?? 'SERVER_ERROR'}); existing services were preserved.`); process.exitCode = 1; });
  server.listen(args.length ? Number(args[0]) : 4205, '127.0.0.1', () => console.log(`Event Timeline preview: http://127.0.0.1:${server.address().port}/index.html`));
}
