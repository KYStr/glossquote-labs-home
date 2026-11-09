import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES, verifyRoot, verifyPath } from './validation.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
export async function startPreview({ root = PROJECT_ROOT, port = 4202 } = {}) {
  root = await verifyRoot(root);
  await verifyPath(root, join(root, 'public'), { directory: true });
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const end = (code, body = '') => { response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end(request.method === 'HEAD' ? '' : body); };
    if (!['GET', 'HEAD'].includes(request.method)) { response.setHeader('Allow', 'GET, HEAD'); end(405); return; }
    const host = request.headers.host;
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(host ?? '')) { end(400); return; }
    let path;
    try { path = decodeURIComponent(request.url.split('?')[0]); }
    catch { end(400); return; }
    if (path === '/') path = '/index.html';
    else if (path === '/en/') path = '/en/index.html';
    if (!path.startsWith('/') || path.includes('\\') || path.includes('\0') ||
        path.split('/').some(part => part.startsWith('.')) || !PUBLIC_FILES.includes(path.slice(1))) { end(404); return; }
    const file = join(root, 'public', path.slice(1));
    try {
      await verifyPath(root, file);
      const bytes = await readFile(file);
      const extension = path.slice(path.lastIndexOf('.'));
      const contentType = MIME[extension];
      if (!contentType) { end(404); return; }
      response.writeHead(200, { 'Content-Type': contentType, 'Content-Length': bytes.byteLength });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { end(404); }
  });
  const listen = requested => new Promise((yes, no) => {
    const onError = error => { server.off('listening', onListening); no(error); };
    const onListening = () => { server.off('error', onError); yes(); };
    server.once('error', onError); server.once('listening', onListening);
    server.listen(requested, '127.0.0.1');
  });
  try { await listen(port); }
  catch (error) { if (error.code !== 'EADDRINUSE' || port === 0) throw error; await listen(0); }
  return { server, requestedPort: port, assignedPort: server.address().port,
    url: `http://127.0.0.1:${server.address().port}/index.html` };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preview = await startPreview();
  console.log(JSON.stringify({ requestedPort: preview.requestedPort, assignedPort: preview.assignedPort,
    bind: '127.0.0.1', url: preview.url, englishUrl: preview.url.replace('/index.html', '/en/index.html'), pid: process.pid }));
}
