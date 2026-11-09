import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { sourceContents, headers, extraFiles } from './assets.mjs';

export async function createPreview() {
  const files = await sourceContents();
  const types = { html: 'text/html;charset=utf-8', css: 'text/css;charset=utf-8', js: 'text/javascript;charset=utf-8', txt: 'text/plain;charset=utf-8' };
  return createServer((request, response) => {
    let path;
    let status = 200, body;
    if (request.method !== 'GET' && request.method !== 'HEAD') { status = 405; body = 'Method not allowed\n'; response.setHeader('Allow', 'GET, HEAD'); }
    else {
      const raw = request.url ?? '';
      try {
        if (!raw.startsWith('/') || raw.includes('?') || raw.includes('#') || raw.includes('\\') || raw.includes('%') || raw.includes('//') || raw.split('/').some(segment => segment === '.' || segment === '..')) throw new Error('path');
        path = raw === '/' ? 'index.html' : raw === '/en/' ? 'en/index.html' : raw.slice(1);
        if (path === 'robots.txt') body = extraFiles['robots.txt'];
        else if (files.has(path)) body = files.get(path);
        else { status = 404; body = extraFiles['404.html']; }
      } catch { status = 404; body = extraFiles['404.html']; }
    }
    const bytes = Buffer.from(body);
    const contentType = status === 405 ? 'text/plain;charset=utf-8' : status === 404 ? types.html : types[path?.split('.').at(-1)] ?? 'application/octet-stream';
    response.writeHead(status, { ...headers, 'Content-Type': contentType, 'Content-Length': bytes.length });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--port' || !/^[0-9]{1,5}$/u.test(args[1]))) throw new Error('arguments');
    const port = args.length ? Number(args[1]) : 4208;
    if (port > 65535) throw new Error('port');
    const server = await createPreview();
    server.on('error', () => { process.stderr.write('Preview could not start; existing services are unchanged.\n'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => { process.stdout.write(`Preview http://127.0.0.1:${server.address().port}/ (noindex)\n`); });
  } catch { process.stderr.write('Preview configuration failed.\n'); process.exitCode = 1; }
}
