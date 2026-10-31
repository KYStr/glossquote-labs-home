// 僅提供已知 preview 資產，路徑不交給檔案系統解析。
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assets, inspectSource, root, securityHeaders } from './files.mjs';
const mime = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', mjs: 'text/javascript; charset=utf-8', txt: 'text/plain; charset=utf-8' };
export async function createPreviewServer() {
  await inspectSource();
  const headers = { ...await securityHeaders(), 'Cache-Control': 'no-store' };
  const bodies = new Map(await Promise.all(assets.filter(path => path !== '_headers').map(async path => ['/' + path, await readFile(join(root, 'public', path))])));
  return createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { ...headers, Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Method not allowed');
      return;
    }
    const path = request.url === '/' ? '/index.html' : request.url === '/en/' ? '/en/index.html' : request.url;
    const body = bodies.get(path);
    if (!body || /[%?#\\]/.test(path)) {
      response.writeHead(404, { ...headers, 'Content-Type': mime.html });
      response.end(request.method === 'HEAD' ? undefined : bodies.get('/404.html'));
      return;
    }
    response.writeHead(path === '/404.html' ? 404 : 200, { ...headers, 'Content-Type': mime[path.split('.').at(-1)], 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // managed preview 會傳入 --host/--port/--strictPort；只接受 loopback。
  const args = process.argv.slice(2);
  let suppliedPort;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--host' && args[index + 1] === '127.0.0.1') { index += 1; continue; }
    if (args[index] === '--port' && /^\d+$/.test(args[index + 1] ?? '')) { suppliedPort = args[++index]; continue; }
    if (args[index] === '--strictPort') continue;
    throw new Error('Unsupported preview argument');
  }
  const port = Number(suppliedPort ?? process.env.PORT ?? 4246);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid port');
  const server = await createPreviewServer();
  server.on('error', error => { console.error(`Preview unavailable (${error.code}); other services untouched.`); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Audio notes preview: http://127.0.0.1:${server.address().port}/index.html`));
}
