import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, ASSETS, HEADERS, inside, validateSource, validateBuild } from './validation.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

export async function createPreviewServer({ source = false } = {}) {
  await validateSource();
  if (!source) await validateBuild();
  const assets = new Map(await Promise.all(ASSETS.map(async file => [file, await readFile(inside(path.join(ROOT, source ? 'public' : 'dist'), file))])));
  return createServer((request, response) => {
    const send = (status, type, content, extra = {}) => {
      response.writeHead(status, { ...HEADERS, 'Content-Type': type, 'Content-Length': content.length, ...extra });
      response.end(request.method === 'HEAD' ? undefined : content);
    };
    if (!/^(?:127\.0\.0\.1|localhost)(?::[0-9]+)?$/.test(request.headers.host ?? '')) return send(421, MIME['.txt'], Buffer.from('Misdirected request'));
    if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, MIME['.txt'], Buffer.from('Method not allowed'), { Allow: 'GET, HEAD' });
    let route;
    try {
      const raw = request.url;
      if (!raw.startsWith('/') || raw.includes('?') || raw.includes('#')) throw new Error('ROUTE');
      route = decodeURIComponent(raw);
      if (/[\\%\u0000-\u0020\u007f]/.test(route) || route.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('ROUTE');
      if (route === '/') route = '/index.html';
      if (route === '/en/') route = '/en/index.html';
    } catch { return send(400, MIME['.txt'], Buffer.from('Invalid path')); }
    const file = route.slice(1);
    if (!assets.has(file)) return send(404, MIME['.html'], assets.get('404.html'));
    return send(200, MIME[path.extname(file)], assets.get(file));
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const server = await createPreviewServer();
  server.once('error', error => {
    if (error.code === 'EADDRINUSE') {
      process.stdout.write('Requested preview port is occupied; using an OS-assigned loopback port.\n');
      server.listen(0, '127.0.0.1');
    } else { process.stderr.write('Preview server could not start.\n'); process.exitCode = 1; }
  });
  server.on('listening', () => process.stdout.write(`Preview http://127.0.0.1:${server.address().port}/index.html\nEnglish http://127.0.0.1:${server.address().port}/en/index.html\n`));
  server.listen(4207, '127.0.0.1');
}
